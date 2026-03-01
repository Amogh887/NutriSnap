import os
import json
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
from dotenv import load_dotenv

from google import genai
from google.genai import types

import firebase_admin
from firebase_admin import credentials, auth, firestore

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
if credentials_path:
    credentials_file = Path(credentials_path)
    if not credentials_file.is_absolute():
        credentials_file = BASE_DIR / credentials_file
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(credentials_file.resolve())

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not firebase_admin._apps:
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        'projectId': os.getenv("GCP_PROJECT_ID"),
    })

db = firestore.client()
security = HTTPBearer(auto_error=False)

project_id = os.getenv("GCP_PROJECT_ID")
client = genai.Client(vertexai=True, project=project_id, location="us-central1")


# ─── Default Preferences (for guests) ───────────────────────────────────────

DEFAULT_PREFERENCES = {
    "health_goal": "balanced",
    "diet_type": "non-vegetarian",
    "allergies": "none",
    "cooking_time": "moderate",
    "cuisine_preferences": "any",
    "calorie_target": "not specified",
    "fitness_goal": "general health"
}


# ─── Auth Helpers ────────────────────────────────────────────────────────────

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


# ─── Preference Fetcher ──────────────────────────────────────────────────────

def get_user_preferences(uid: str | None) -> dict:
    """Fetch user preferences from Firestore, fall back to defaults."""
    if not uid:
        return DEFAULT_PREFERENCES
    try:
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            data = doc.to_dict()
            prefs = data.get("preferences", {})
            # Merge with defaults so missing fields are always filled
            return {**DEFAULT_PREFERENCES, **prefs}
    except Exception as e:
        print(f"Could not fetch preferences for {uid}: {e}")
    return DEFAULT_PREFERENCES


# ─── Dynamic Prompt Builder ──────────────────────────────────────────────────

def build_prompt(prefs: dict) -> str:
    return f"""
    You are NutriSnap AI, an advanced multimodal nutrition and cooking assistant built to help users create healthy meals from available ingredients.

    Your task is to analyze an image of food ingredients and generate healthy, personalized recipe suggestions.

    ---
    ### STEP 1: INGREDIENT DETECTION
    Carefully analyze the provided image and identify all visible food ingredients.
    - Only include ingredients you are reasonably confident about.
    - Use generic names (e.g., "tomato", "chicken breast", "spinach", "rice").
    - Ignore non-food items.
    - If uncertain, include with "possible" tag.

    ---
    ### STEP 2: USER PROFILE & PREFERENCES
    Tailor ALL recipes strictly to this user's profile:
    - Health Goal: {prefs['health_goal']}
    - Diet Type: {prefs['diet_type']}
    - Allergies / Restrictions: {prefs['allergies']}
    - Cooking Time Preference: {prefs['cooking_time']}
    - Cuisine Preferences: {prefs['cuisine_preferences']}
    - Calorie Target: {prefs['calorie_target']}
    - Fitness Goal: {prefs['fitness_goal']}

    IMPORTANT: If the user has allergies, NEVER include those ingredients.
    If diet type is vegetarian or vegan, NEVER suggest meat or animal products.
    Adjust portion sizes and macros to match their calorie target and fitness goal.

    ---
    ### STEP 3: RECIPE GENERATION
    Generate 3 to 5 recipe suggestions using the detected ingredients.
    Rules:
    - Prioritize recipes that use MOST of the detected ingredients.
    - Minimize need for extra ingredients.
    - If additional ingredients are required, list them clearly.
    - Focus on HEALTHY cooking methods (grilling, baking, steaming, sautéing with minimal oil).
    - Avoid ultra-processed foods unless necessary.
    - Respect the user's cooking time preference — if they want quick meals, keep it under 30 mins.

    ---
    ### STEP 4: HEALTH OPTIMIZATION
    Each recipe must be optimized for the user's specific health goal:
    - For weight loss: lower calories, high protein, high fiber
    - For muscle gain: high protein, adequate carbs, moderate fat
    - For balanced: even macronutrient distribution
    - For keto: high fat, very low carbs
    - Always prefer whole, unprocessed ingredients

    ---
    ### STEP 5: HEALTH SCORING SYSTEM
    Assign each recipe a Health Score (1-10) based on:
    - Nutrient density
    - Macronutrient balance relative to user's fitness goal
    - Cooking method
    - Use of whole vs processed ingredients
    - Alignment with user's dietary preferences
    Also include a short explanation: Why the score is high or low for THIS user.

    ---
    ### STEP 6: OUTPUT FORMAT
    Return ONLY valid JSON in the following structure:
    {{
      "detected_ingredients": [],
      "recipes": [
        {{
          "name": "",
          "description": "",
          "ingredients_used": [],
          "additional_ingredients": [],
          "instructions": ["step 1", "step 2"],
          "nutrition": {{
            "calories_kcal": "",
            "protein_g": "",
            "carbs_g": "",
            "fat_g": ""
          }},
          "health_score": "",
          "health_explanation": "",
          "diet_tags": ["high-protein", "low-carb", "vegan"],
          "estimated_time_minutes": ""
        }}
      ],
      "ranking": ["recipe_name_1", "recipe_name_2", "recipe_name_3"]
    }}

    ---
    ### STEP 7: RANKING
    Sort recipes from most to least aligned with the user's health goal and preferences.

    ---
    ### STEP 8: EDGE CASE HANDLING
    - If ingredients are insufficient, suggest 2-3 missing ingredients to create viable recipes.
    - If the image is unclear, make best reasonable assumptions.
    - Always provide useful output even with limited ingredients.

    ---
    ### FINAL INSTRUCTION
    Your response MUST be valid JSON only. No extra text, no explanations outside JSON.
    Personalization is critical — recipes must feel tailored to this specific user.
    """


# ─── Test Endpoint ───────────────────────────────────────────────────────────

@app.get("/api/test")
async def test_connection():
    return {"message": "Hello from the FastAPI backend!"}


# ─── Analyze Food (personalized) ─────────────────────────────────────────────

@app.post("/api/analyze-food")
async def analyze_food(
    image: UploadFile = File(...),
    uid: str | None = Depends(get_current_user)
):
    try:
        # Fetch preferences (works for both guests and logged-in users)
        prefs = get_user_preferences(uid)

        file_bytes = await image.read()
        image_part = types.Part.from_bytes(data=file_bytes, mime_type=image.content_type)

        # Build personalized prompt
        prompt = build_prompt(prefs)

        response = client.models.generate_content(
            model='gemini-2.5-flash',
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
                detail="Not enough ingredients detected. Please try a clearer picture with more visible food items."
            )

        # Auto-save to food history if user is logged in
        if uid:
            try:
                from google.cloud.firestore import SERVER_TIMESTAMP
                history_entry = {
                    "detected_ingredients": ingredients,
                    "recipes_generated": [r["name"] for r in recipe_data.get("recipes", [])],
                    "analyzed_at": SERVER_TIMESTAMP,
                    "preferences_used": prefs
                }
                db.collection("users").document(uid).collection("food_history").document().set(history_entry)
            except Exception as e:
                print(f"Could not save food history: {e}")

        return recipe_data

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── User Profile ────────────────────────────────────────────────────────────

@app.get("/api/profile")
async def get_profile(uid: str = Depends(require_user)):
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        return {"uid": uid, "profile": {}, "preferences": DEFAULT_PREFERENCES}
    return doc.to_dict()


@app.put("/api/profile")
async def update_profile(data: dict, uid: str = Depends(require_user)):
    db.collection("users").document(uid).set(data, merge=True)
    return {"message": "Profile updated"}


# ─── Preferences ─────────────────────────────────────────────────────────────

@app.get("/api/preferences")
async def get_preferences(uid: str = Depends(require_user)):
    prefs = get_user_preferences(uid)
    return prefs


@app.put("/api/preferences")
async def update_preferences(prefs: dict, uid: str = Depends(require_user)):
    db.collection("users").document(uid).set({"preferences": prefs}, merge=True)
    return {"message": "Preferences updated", "preferences": prefs}


# ─── Saved Recipes ───────────────────────────────────────────────────────────

@app.get("/api/saved-recipes")
async def get_saved_recipes(uid: str = Depends(require_user)):
    recipes_ref = db.collection("users").document(uid).collection("saved_recipes")
    docs = recipes_ref.order_by("saved_at", direction=firestore.Query.DESCENDING).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


@app.post("/api/saved-recipes")
async def save_recipe(recipe: dict, uid: str = Depends(require_user)):
    from google.cloud.firestore import SERVER_TIMESTAMP
    recipe["saved_at"] = SERVER_TIMESTAMP
    ref = db.collection("users").document(uid).collection("saved_recipes").document()
    ref.set(recipe)
    return {"id": ref.id, "message": "Recipe saved"}


@app.delete("/api/saved-recipes/{recipe_id}")
async def delete_saved_recipe(recipe_id: str, uid: str = Depends(require_user)):
    db.collection("users").document(uid).collection("saved_recipes").document(recipe_id).delete()
    return {"message": "Recipe deleted"}


# ─── Food History ────────────────────────────────────────────────────────────

@app.get("/api/food-history")
async def get_food_history(uid: str = Depends(require_user)):
    history_ref = db.collection("users").document(uid).collection("food_history")
    docs = history_ref.order_by("analyzed_at", direction=firestore.Query.DESCENDING).limit(50).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

