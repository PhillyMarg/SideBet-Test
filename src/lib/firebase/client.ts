// src/lib/firebase/client.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// ✅ Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuHor8NaEzyqwOw5D-Hbo5i7c1njGwwho",
  authDomain: "sidebet-mvp.firebaseapp.com",
  projectId: "sidebet-mvp",
  storageBucket: "sidebet-mvp.appspot.com", // ✅ FIXED HERE
  messagingSenderId: "563164526633",
  appId: "1:563164526633:web:f4cfb85cb4ffbe387d8438",
  measurementId: "G-P3LH2H1LGC",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export default app;
