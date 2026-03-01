# NutriSnap — Frontend

React + Vite frontend for the NutriSnap food analysis app.

---

## Overview

The frontend lets users upload food photos, view AI-generated recipes, sign in/up, and save recipes. It communicates with the FastAPI backend and Firebase Authentication directly from the browser.

---

## Stack

| Tool | Purpose |
|---|---|
| React 19 | UI framework |
| Vite 7 | Build tool and dev server |
| Firebase JS SDK v12 | Authentication (sign in/up, token management) |
| Fetch API | Backend communication |

---

## Setup

```bash
npm install
```

Then configure `src/firebase.js` with your Firebase project's Web App config (see below).

---

## Running

```bash
npm run dev
```

Starts at `http://localhost:5173`. Add `--host` (already in `package.json`) so the app is accessible from your local network for mobile testing.

Other commands:

```bash
npm run build    # Production build to dist/
npm run preview  # Preview the production build locally
npm run lint     # ESLint check
```

---

## Configuration

### `src/firebase.js`

This file initialises Firebase and exports the `auth` object used throughout the app.

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

Get these values from **Firebase Console → Project Settings → Your Apps → Web App**.

> **Note:** Firebase API keys are safe to commit to public repos. They identify your project but do not grant access — access is controlled by Firestore Security Rules and Authentication settings.

---

## File Structure

```
src/
├── App.jsx          # Root component
├── App.css          # All styles (dark theme, responsive)
├── AuthModal.jsx    # Sign in / sign up modal
├── firebase.js      # Firebase initialisation
├── index.css        # Base body/reset styles
└── main.jsx         # React entry point (renders <App />)
```

---

## Key Components

### `App.jsx`

The entire app lives in one component for simplicity. Responsibilities:

- **Auth state** — `onAuthStateChanged` listener keeps `user` state in sync
- **Image upload** — dual inputs (camera + gallery) for mobile compatibility
- **API call** — `POST /api/analyze-food` with optional `Authorization` header
- **Results rendering** — ingredients, recipe cards, nutrition grid
- **Save/unsave** — `POST`/`DELETE` to `/api/saved-recipes`

### `AuthModal.jsx`

Modal overlay for sign in and sign up. Uses Firebase's `signInWithEmailAndPassword` and `createUserWithEmailAndPassword`. Toggling between modes clears any error state.

### `firebase.js`

Thin wrapper — initialises the Firebase app and exports `auth`. No analytics (not needed and can cause issues in some environments).

---

## Auth Flow

1. User clicks **Sign In / Sign Up** in the auth bar
2. `AuthModal` opens, user enters email + password
3. On success, Firebase returns a user object
4. `onAuthStateChanged` in `App.jsx` updates `user` state
5. Subsequent `analyze-food` requests include `Authorization: Bearer <id-token>`
6. Backend verifies the token and returns personalized recipes

If the user is not signed in, analysis still works — recipes just use default preferences and nothing is saved.

---

## Mobile Camera Support

Two separate file inputs are used to avoid issues with Android/iOS:

```jsx
{/* Opens device camera directly */}
<input id="camera-upload" type="file" accept="image/*" capture="environment" />

{/* Opens gallery/file picker */}
<input id="file-upload" type="file" accept="image/*" />
```

Using a single input with `capture` caused silent failures on many devices.

---

## Dynamic Backend URL

All frontend API calls go through `src/apiClient.js`.

Runtime resolution order:

1. `VITE_API_BASE_URL` (if set)
2. Development fallback: `http://<current-host>:8000`
3. Production fallback: same-origin (`window.location.origin`)

For each request path, the client tries these URL shapes in order:

- `/api/<path>`
- `/api/index.py/<path>`
- `/<path>`

This fallback strategy is used to support both local FastAPI and Vercel serverless routing.

---

## Vercel Deployment Checklist

Set these environment variables in **Vercel → Project → Settings → Environment Variables**:

Required:

- `GCP_PROJECT_ID`
- `GCP_LOCATION` (example: `us-central1`)
- `GEMINI_MODEL` (example: `gemini-2.5-flash`)
- `GOOGLE_APPLICATION_CREDENTIALS` **or** `GCP_SERVICE_ACCOUNT_JSON`
- Firebase Web config vars used by the frontend (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`)

Optional:

- `VITE_API_BASE_URL` (leave unset for same-domain API deployment)
- `FRONTEND_ORIGINS` (comma-separated CORS allowlist)

Quick verification after deploy:

1. Open `https://<your-domain>/api/test` and confirm JSON response.
2. Sign in and save preferences (tests auth + Firestore).
3. Upload an image and confirm `POST /api/analyze-food` returns recipes.

---

## Styling

All styles are in `App.css` using CSS custom properties:

```css
:root {
  --primary-color: #4CAF50;
  --background-dark: #121212;
  --card-bg: #1e1e1e;
  --text-light: #f5f5f5;
  --text-muted: #aaaaaa;
  --border-radius: 12px;
}
```

Responsive breakpoint at `520px` — below this, the recipe grid switches to single column and some flex layouts stack vertically.

---

## Dependencies

```json
"dependencies": {
  "firebase": "^12.10.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

No UI library or state management library — kept intentionally minimal.


