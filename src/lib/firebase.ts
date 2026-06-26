import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAr1HiniYSTpvd2PaSge-haef2tje-L7V0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dropdowniq.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dropdowniq",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dropdowniq.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "617452546445",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:617452546445:web:f4ab9f3a4eb2b0a77cb5c4",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-SRXSDTVK8W"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
