# NutriSnap — Backend

FastAPI backend powering the NutriSnap food analysis app.

---

## Overview

The backend receives food images from the frontend, calls Google Gemini 2.0 Flash via Vertex AI for ingredient detection and recipe generation, and persists user data in Cloud Firestore. Firebase Admin SDK is used to verify user identity tokens sent from the frontend.

---

## Stack

| Tool | Purpose |
|---|---|
| FastAPI | Web framework |
| Uvicorn | ASGI server |
| google-genai | Vertex AI / Gemini 2.5 Flash |
| firebase-admin | Token verification + Firestore access |
| python-dotenv | Load `.env` variables |
| python-multipart | Image file upload parsing |

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Create `.env` file

```
GCP_PROJECT_ID=your-gcp-project-id
```

### 3. Authenticate

```bash
gcloud auth application-default login
```

This allows the backend to use your personal Google credentials for both Vertex AI and Firestore without needing a service account key file.

### 4. Run

```bash
python main.py
```

Server starts at `http://0.0.0.0:8000` (accessible from your local network for mobile testing).

---

## How It Works

### Authentication

Every request that requires a user uses `HTTPBearer` to extract the `Authorization: Bearer <token>` header. The token is a Firebase ID token issued by the frontend after login.

- `get_current_user()` — verifies the token, returns `uid` or `None` (used for optional auth)
- `require_user()` — same but raises `401` if no valid token (used for protected routes)

### AI Analysis Flow (`POST /api/analyze-food`)

1. Accept image upload (multipart form)
2. Extract `uid` from auth token if present
3. Fetch user preferences from Firestore (falls back to defaults for guests)
4. Build a personalized Gemini prompt using those preferences
5. Send image + prompt to `gemini-2.5-flash` via Vertex AI
6. Parse JSON response
7. If user is logged in, auto-save the analysis to their `food_history` collection
8. Return recipe data to frontend

### Default Preferences (for guests)

```python
{
    "health_goal": "balanced",
    "diet_type": "non-vegetarian",
    "allergies": "none",
    "cooking_time": "moderate",
    "cuisine_preferences": "any",
    "calorie_target": "not specified",
    "fitness_goal": "general health"
}
```

---

## API Reference

### `GET /api/test`
Health check. Returns `{"message": "Hello from the FastAPI backend!"}`.

---

### `POST /api/analyze-food`
Analyze a food image. Auth is optional — logged-in users get personalized results.

**Request:** `multipart/form-data`
- `image` — image file (JPEG, PNG, etc.)

**Headers (optional):**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
```json
{
  "detected_ingredients": ["tomato", "chicken", "spinach"],
  "recipes": [
    {
      "name": "Grilled Chicken Salad",
      "description": "...",
      "ingredients_used": ["chicken", "spinach", "tomato"],
      "additional_ingredients": ["olive oil", "lemon"],
      "instructions": ["Step 1...", "Step 2..."],
      "nutrition": {
        "calories_kcal": "320",
        "protein_g": "38",
        "carbs_g": "12",
        "fat_g": "14"
      },
      "health_score": "9",
      "health_explanation": "High protein, low carb...",
      "diet_tags": ["high-protein", "low-carb"],
      "estimated_time_minutes": "20 mins"
    }
  ],
  "ranking": ["Grilled Chicken Salad", "..."]
}
```

**Errors:**
- `400` — fewer than 2 ingredients detected (image unclear or insufficient food items)
- `500` — Gemini API error or internal failure

---

### `GET /api/preferences`
Get the current user's dietary preferences.

**Headers:** `Authorization: Bearer <token>` (required)

**Response:** preference object (merged with defaults for any missing fields)

---

### `PUT /api/preferences`
Update dietary preferences.

**Headers:** `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "diet_type": "vegetarian",
  "allergies": "nuts, dairy",
  "health_goal": "weight loss",
  "cooking_time": "quick",
  "cuisine_preferences": "Mediterranean",
  "calorie_target": "1500",
  "fitness_goal": "fat loss"
}
```

---

### `GET /api/saved-recipes`
List all saved recipes, ordered by most recently saved.

**Headers:** `Authorization: Bearer <token>` (required)

---

### `POST /api/saved-recipes`
Save a recipe.

**Headers:** `Authorization: Bearer <token>` (required)

**Body:** full recipe object (same structure as returned by `/api/analyze-food`)

**Response:** `{"id": "<firestore-doc-id>", "message": "Recipe saved"}`

---

### `DELETE /api/saved-recipes/{recipe_id}`
Delete a saved recipe by its Firestore document ID.

**Headers:** `Authorization: Bearer <token>` (required)

---

### `GET /api/food-history`
Get the last 50 food analyses for the user, ordered newest first.

**Headers:** `Authorization: Bearer <token>` (required)

---

### `GET /api/profile`
Get the user's full profile document.

**Headers:** `Authorization: Bearer <token>` (required)

---

### `PUT /api/profile`
Update the user's profile (merged with existing data).

**Headers:** `Authorization: Bearer <token>` (required)

**Body:** any profile fields as a JSON object

---

## Firestore Collections

The backend writes to the following paths under `users/{userId}/`:

| Collection | Contents |
|---|---|
| `preferences` (document field) | User dietary settings |
| `saved_recipes/` | Individual saved recipe documents |
| `food_history/` | Auto-saved analysis records |

---

## CORS

All origins are currently allowed (`allow_origins=["*"]`). For production, restrict this to your frontend's domain.

---

## Notes

- The backend runs on `0.0.0.0:8000` so it accepts connections from other devices on your local network (needed for mobile testing via your PC's IP address).
- `reload=True` is enabled in development so the server restarts automatically when you save `main.py`.
- Firebase Admin SDK uses Application Default Credentials — no service account key file needed as long as you've run `gcloud auth application-default login`.
