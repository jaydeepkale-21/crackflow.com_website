import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDi69ZdYkql8lL42VFi8vIzh40PaO3Zt9k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crackflow.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crackflow",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "crackflow.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "758352985146",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:758352985146:web:372b4448939c7b627f8903",
};

// Check if Firebase configuration is valid
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "placeholder-api-key"
);

if (!isFirebaseConfigured) {
  console.warn("[CrackFlow Auth] Firebase credentials are not fully configured.");
}

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
