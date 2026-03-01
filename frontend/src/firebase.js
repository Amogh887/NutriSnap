import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBV7V78tNmw4XtqPFp9oOou1rlsYj0fW3Q",
  authDomain: "nutrisnap-488820.firebaseapp.com",
  projectId: "nutrisnap-488820",
  storageBucket: "nutrisnap-488820.firebasestorage.app",
  messagingSenderId: "35949888118",
  appId: "1:35949888118:web:24f530ef712773fb77d557"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;