// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "studio-3184988233-cb95b",
  appId: "1:1091939501253:web:0dbd683f4b56077c87dcac",
  storageBucket: "studio-3184988233-cb95b.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "studio-3184988233-cb95b.firebaseapp.com",
  messagingSenderId: "1091939501253",
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
