import json
import os
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from google import genai
from google.api_core.exceptions import PermissionDenied as GooglePermissionDenied
from google.api_core.exceptions import ServiceUnavailable as GoogleServiceUnavailable
from google.genai import types

import firebase_admin
from firebase_admin import auth, credentials, firestore

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent
load_dotenv(FRONTEND_DIR / ".env")

service_account_json = os.getenv("GCP_SERVICE_ACCOUNT_JSON")
credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

if service_account_json and not credentials_path:
    temp_path = Path("/tmp/gcp-service-account.json")
    temp_path.write_text(service_account_json, encoding="utf-8")
    credentials_path = str(temp_path)

if credentials_path:
    credentials_file = Path(credentials_path)
    if not credentials_file.is_absolute():
        credentials_file = FRONTEND_DIR / credentials_file
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(credentials_file.resolve())

app = FastAPI()

frontend_origins = os.getenv("FRONTEND_ORIGINS")
if frontend_origins:
    allow_origins = [origin.strip() for origin in frontend_origins.split(",") if origin.strip()]
else:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)
db = None
client = None
project_id = os.getenv("GCP_PROJECT_ID")
location = os.getenv("GCP_LOCATION", "us-central1")
model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
INIT_ERROR = None

try:
    if not firebase_admin._apps:
        cert_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cert_path:
            raise RuntimeError("Missing GOOGLE_APPLICATION_CREDENTIALS or GCP_SERVICE_ACCOUNT_JSON")

        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(
            cred,
            {
                "projectId": project_id,
            },
        )

    db = firestore.client()

    if not project_id:
        raise RuntimeError("Missing GCP_PROJECT_ID")

    client = genai.Client(vertexai=True, project=project_id, location=location)
except Exception as exc:
    INIT_ERROR = str(exc)


FIRESTORE_PERMISSION_DETAIL = (
    "Firestore access denied for backend service account. "
    "Grant Firestore/Datastore permissions (for example roles/datastore.user) "
    "to the service account and ensure Firestore is enabled in this project."
)
LOCAL_DATA_DIR = Path("/tmp/nutrisnap_local_data")


DEFAULT_PREFERENCES = {
    "health_goal": "balanced",
    "diet_type": "non-vegetarian",
    "allergies": "none",
    "cooking_time": "moderate",
    "cuisine_preferences": "any",
    "calorie_target": "not specified",
    "fitness_goal": "general health",
}


def _is_firestore_unavailable(exc: Exception) -> bool:
    return isinstance(exc, (GooglePermissionDenied, GoogleServiceUnavailable))


def _ensure_local_store_dir() -> None:
    LOCAL_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _user_store_path(uid: str) -> Path:
    safe_uid = "".join(ch for ch in uid if ch.isalnum() or ch in ("-", "_"))
    return LOCAL_DATA_DIR / f"{safe_uid}.json"


def _default_user_store() -> dict:
    return {
        "profile": {},
        "preferences": DEFAULT_PREFERENCES.copy(),
        "saved_recipes": [],
        "food_history": [],
        "feedback": [],
    }


def _read_user_store(uid: str) -> dict:
    _ensure_local_store_dir()
    path = _user_store_path(uid)
    if not path.exists():
        return _default_user_store()
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return _default_user_store()

    merged = _default_user_store()
    merged.update(data if isinstance(data, dict) else {})
    merged["preferences"] = {**DEFAULT_PREFERENCES, **(merged.get("preferences") or {})}
    if not isinstance(merged.get("saved_recipes"), list):
        merged["saved_recipes"] = []
    if not isinstance(merged.get("food_history"), list):
        merged["food_history"] = []
    if not isinstance(merged.get("feedback"), list):
        merged["feedback"] = []
    if not isinstance(merged.get("profile"), dict):
        merged["profile"] = {}
    return merged


def _write_user_store(uid: str, data: dict) -> None:
    _ensure_local_store_dir()
    path = _user_store_path(uid)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_runtime_ready():
    if INIT_ERROR:
        raise HTTPException(status_code=500, detail=f"Backend configuration error: {INIT_ERROR}")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token["uid"]
    except Exception:
        return None


def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    uid = get_current_user(credentials)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")
    return uid


def get_user_preferences(uid: str | None) -> dict:
    if not uid:
        return DEFAULT_PREFERENCES
    try:
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            data = doc.to_dict()
            prefs = data.get("preferences", {})
            return {**DEFAULT_PREFERENCES, **prefs}
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            return {**DEFAULT_PREFERENCES, **(local.get("preferences") or {})}
        print(f"Could not fetch preferences for {uid}: {e}")
    return DEFAULT_PREFERENCES


def build_prompt(prefs: dict) -> str:
    return f"""
    You are NutriSnap AI, an advanced multimodal nutrition and cooking assistant built to help users create healthy meals from available ingredients.

    Your task is to analyze an image of food ingredients and generate healthy, personalized recipe suggestions.

    ### USER PROFILE & PREFERENCES
    Tailor ALL recipes strictly to this user's profile:
    - Health Goal: {prefs['health_goal']}
    - Diet Type: {prefs['diet_type']}
    - Allergies / Restrictions: {prefs['allergies']}
    - Cooking Time Preference: {prefs['cooking_time']}
    - Cuisine Preferences: {prefs['cuisine_preferences']}
    - Calorie Target: {prefs['calorie_target']}
    - Fitness Goal: {prefs['fitness_goal']}

    Return ONLY valid JSON in this structure:
    {{
      "detected_ingredients": [],
      "recipes": [
        {{
          "name": "",
          "description": "",
          "servings": "",
          "ingredients_used": [],
          "additional_ingredients": [],
          "instructions": [],
          "nutrition": {{
            "calories_kcal": "",
            "protein_g": "",
            "carbs_g": "",
            "fat_g": ""
          }},
          "health_score": "",
          "health_explanation": "",
          "diet_tags": [],
          "estimated_time_minutes": "",
          "youtube_query": ""
        }}
      ],
      "ranking": []
    }}

    Response must be JSON only.
    """


@app.get("/api/test")
async def test_connection():
    if INIT_ERROR:
        return {
            "status": "degraded",
            "message": "Backend booted with configuration errors",
            "detail": INIT_ERROR,
        }
    return {"status": "ok", "message": "Hello from the Vercel FastAPI backend!"}


@app.post("/api/analyze-food")
async def analyze_food(
    image: UploadFile = File(...),
    uid: str | None = Depends(get_current_user),
    _: None = Depends(ensure_runtime_ready),
):
    try:
        prefs = get_user_preferences(uid)

        file_bytes = await image.read()
        image_part = types.Part.from_bytes(data=file_bytes, mime_type=image.content_type)

        prompt = build_prompt(prefs)

        response = client.models.generate_content(
            model=model_name,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        response_text = response.text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        recipe_data = json.loads(response_text)
        ingredients = recipe_data.get("detected_ingredients", [])
        if len(ingredients) < 2:
            raise HTTPException(
                status_code=400,
                detail="Not enough ingredients detected. Please try a clearer picture with more visible food items.",
            )

        if uid:
            try:
                from google.cloud.firestore import SERVER_TIMESTAMP

                history_entry = {
                    "detected_ingredients": ingredients,
                    "recipes_generated": [r["name"] for r in recipe_data.get("recipes", [])],
                    "analyzed_at": SERVER_TIMESTAMP,
                    "preferences_used": prefs,
                }
                db.collection("users").document(uid).collection("food_history").document().set(history_entry)
            except Exception as e:
                if _is_firestore_unavailable(e):
                    local = _read_user_store(uid)
                    history_entry = {
                        "id": str(uuid4()),
                        "detected_ingredients": ingredients,
                        "recipes_generated": [r["name"] for r in recipe_data.get("recipes", [])],
                        "analyzed_at": _now_iso(),
                        "preferences_used": prefs,
                    }
                    local["food_history"] = [history_entry, *(local.get("food_history") or [])][:50]
                    _write_user_store(uid, local)
                else:
                    print(f"Could not save food history: {e}")

        return recipe_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profile")
async def get_profile(uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        doc = db.collection("users").document(uid).get()
        if not doc.exists:
            return {"uid": uid, "profile": {}, "preferences": DEFAULT_PREFERENCES}
        return doc.to_dict()
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            return {"uid": uid, "profile": local.get("profile", {}), "preferences": local.get("preferences", DEFAULT_PREFERENCES)}
        raise


@app.put("/api/profile")
async def update_profile(data: dict, uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        db.collection("users").document(uid).set(data, merge=True)
        return {"message": "Profile updated"}
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            incoming_profile = data.get("profile", {}) if isinstance(data, dict) else {}
            local["profile"] = {**(local.get("profile") or {}), **incoming_profile}
            _write_user_store(uid, local)
            return {"message": "Profile updated"}
        raise


@app.get("/api/preferences")
async def get_preferences(uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    return get_user_preferences(uid)


@app.put("/api/preferences")
async def update_preferences(prefs: dict, uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        db.collection("users").document(uid).set({"preferences": prefs}, merge=True)
        return {"message": "Preferences updated", "preferences": prefs}
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            local["preferences"] = {**DEFAULT_PREFERENCES, **(prefs or {})}
            _write_user_store(uid, local)
            return {"message": "Preferences updated", "preferences": local["preferences"]}
        raise


@app.get("/api/saved-recipes")
async def get_saved_recipes(uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        recipes_ref = db.collection("users").document(uid).collection("saved_recipes")
        docs = recipes_ref.order_by("saved_at", direction=firestore.Query.DESCENDING).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            return local.get("saved_recipes", [])
        raise


@app.post("/api/saved-recipes")
async def save_recipe(recipe: dict, uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        from google.cloud.firestore import SERVER_TIMESTAMP

        recipe["saved_at"] = SERVER_TIMESTAMP
        ref = db.collection("users").document(uid).collection("saved_recipes").document()
        ref.set(recipe)
        return {"id": ref.id, "message": "Recipe saved"}
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            saved_id = str(uuid4())
            saved_recipe = {**recipe, "id": saved_id, "saved_at": _now_iso()}
            local["saved_recipes"] = [saved_recipe, *(local.get("saved_recipes") or [])]
            _write_user_store(uid, local)
            return {"id": saved_id, "message": "Recipe saved"}
        raise


@app.delete("/api/saved-recipes/{recipe_id}")
async def delete_saved_recipe(recipe_id: str, uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        db.collection("users").document(uid).collection("saved_recipes").document(recipe_id).delete()
        return {"message": "Recipe deleted"}
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            local["saved_recipes"] = [
                item for item in (local.get("saved_recipes") or []) if item.get("id") != recipe_id
            ]
            _write_user_store(uid, local)
            return {"message": "Recipe deleted"}
        raise


@app.get("/api/food-history")
async def get_food_history(uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    try:
        history_ref = db.collection("users").document(uid).collection("food_history")
        docs = history_ref.order_by("analyzed_at", direction=firestore.Query.DESCENDING).limit(50).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            return (local.get("food_history") or [])[:50]
        raise


@app.post("/api/feedback")
async def submit_feedback(payload: dict, uid: str = Depends(require_user), _: None = Depends(ensure_runtime_ready)):
    feedback_entry = {
        "recipe_name": payload.get("recipe_name"),
        "feedback_type": payload.get("feedback_type"),
        "created_at": _now_iso(),
    }
    try:
        from google.cloud.firestore import SERVER_TIMESTAMP

        firestore_entry = {
            "recipe_name": payload.get("recipe_name"),
            "feedback_type": payload.get("feedback_type"),
            "created_at": SERVER_TIMESTAMP,
        }
        db.collection("users").document(uid).collection("feedback").document().set(firestore_entry)
        return {"message": "Feedback submitted"}
    except Exception as e:
        if _is_firestore_unavailable(e):
            local = _read_user_store(uid)
            local["feedback"] = [feedback_entry, *(local.get("feedback") or [])][:100]
            _write_user_store(uid, local)
            return {"message": "Feedback submitted"}
        raise
