// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth"; 

// Environment variables are accessed via process.env in React
const firebaseConfig = {
    // ... (Your firebaseConfig object remains the same) ...
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 1. Define Google Provider
export const provider = new GoogleAuthProvider(); 

// 2. Define Microsoft Provider
export const microsoftProvider = new OAuthProvider('microsoft.com');

// NOTE: We are now explicitly exporting 'microsoftProvider', 'yahooProvider' and 'provider' (Google).