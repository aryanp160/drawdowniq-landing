import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAr1HiniYSTpvd2PaSge-haef2tje-L7V0",
  authDomain: "dropdowniq.firebaseapp.com",
  projectId: "dropdowniq",
  storageBucket: "dropdowniq.firebasestorage.app",
  messagingSenderId: "617452546445",
  appId: "1:617452546445:web:f4ab9f3a4eb2b0a77cb5c4",
  measurementId: "G-SRXSDTVK8W"
};

const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
