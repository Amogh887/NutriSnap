# 🍎 NutriSnap

AI-powered food analysis app. Snap a photo of your ingredients and get personalized recipe suggestions with nutritional breakdowns — powered by Google Gemini 2.0 Flash.

---

## Features

- **AI Ingredient Detection** — Upload a food photo and Gemini identifies all visible ingredients
- **Personalized Recipes** — Recipes tailored to your diet type, allergies, health goals, and calorie targets
- **Nutrition Analysis** — Calories, protein, carbs, and fat per recipe
- **Health Scoring** — Each recipe rated 1–10 relative to your specific fitness goal
- **User Accounts** — Sign up/sign in via Firebase Authentication
- **Save Recipes** — Save your favourite recipes to Firestore, accessible across sessions
- **Food History** — Every analysis is automatically saved for logged-in users
- **Mobile Friendly** — Responsive design with camera capture support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | FastAPI (Python) |
| AI Model | Vertex AI — Gemini 2.0 Flash |
| Authentication | Firebase Auth (via GCP Identity Platform) |
| Database | Cloud Firestore |
| Auth SDK (frontend) | Firebase JS SDK v12 |
| Auth SDK (backend) | firebase-admin |

---

## Project Structure

```
nutrisnap/
├── backend/
│   ├── main.py              # FastAPI app — all routes and AI logic
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # GCP_PROJECT_ID (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main component — upload, auth, results
│   │   ├── App.css          # All styles
│   │   ├── AuthModal.jsx    # Sign in / sign up modal
│   │   ├── firebase.js      # Firebase app initialisation
│   │   └── main.jsx         # React entry point
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Python](https://python.org/) 3.11+
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- A GCP project with the following enabled:
  - Vertex AI API
  - Cloud Firestore (Native mode)
  - Identity Platform (Email/Password provider)
- A Firebase project linked to your GCP project with a Web App registered

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/Amogh887/nutrisnap.git
cd nutrisnap
```

### 2. Authenticate with Google Cloud

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### 3. Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:
```
GCP_PROJECT_ID=your-gcp-project-id
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

Update `frontend/src/firebase.js` with your Firebase Web App config (found in Firebase Console → Project Settings → Your Apps).

---

## Running the App

**Terminal 1 — Backend**
```bash
cd backend
python main.py
```
Backend runs at `http://localhost:8000`

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:5173`

---

## Mobile Access

To test on your phone (same WiFi network):

1. Find your PC's local IP address:
   - Windows: `ipconfig` → look for IPv4 Address
   - Mac/Linux: `ifconfig` or `ip addr`
2. Open `http://YOUR_PC_IP:5173` on your phone

The frontend automatically uses `window.location.hostname` to route API requests, so no extra config is needed.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/test` | None | Health check |
| POST | `/api/analyze-food` | Optional | Analyze food image, returns recipes |
| GET | `/api/profile` | Required | Get user profile |
| PUT | `/api/profile` | Required | Update user profile |
| GET | `/api/preferences` | Required | Get dietary preferences |
| PUT | `/api/preferences` | Required | Update dietary preferences |
| GET | `/api/saved-recipes` | Required | List saved recipes |
| POST | `/api/saved-recipes` | Required | Save a recipe |
| DELETE | `/api/saved-recipes/{id}` | Required | Delete a saved recipe |
| GET | `/api/food-history` | Required | Last 50 food analyses |

---

## Firestore Schema

```
users/
  {userId}/
    preferences/    → diet_type, allergies, health_goal, cooking_time,
                      cuisine_preferences, calorie_target, fitness_goal
    saved_recipes/
      {recipeId}/   → full recipe object + saved_at timestamp
    food_history/
      {entryId}/    → detected_ingredients, recipes_generated,
                      analyzed_at, preferences_used
```

---

## Firestore Security Rules

In Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GCP_PROJECT_ID` | `backend/.env` | Your Google Cloud project ID |

Firebase config values live directly in `frontend/src/firebase.js` (not secret — Firebase API keys are designed to be public, protected by security rules).

---

## Git Workflow

```bash
git add .
git commit -m "your message"
git push origin main
```

The `.gitignore` excludes `.env`, `venv/`, `__pycache__/`, `node_modules/`, and `dist/`.

---

## License

MIT
