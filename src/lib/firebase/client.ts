// src/lib/firebase/client.ts
"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// ✅ Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuHor8NaEzyqwOw5D-Hbo5i7c1njGwwho",
  authDomain: "sidebet-mvp.firebaseapp.com",
  projectId: "sidebet-mvp",
  storageBucket: "sidebet-mvp.appspot.com", // ✅ Corrected bucket
  messagingSenderId: "563164526633",
  appId: "1:563164526633:web:f4cfb85cb4ffbe387d8438",
  measurementId: "G-P3LH2H1LGC",
};

// ✅ Initialize Firebase safely (prevents duplicate initialization in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Initialize Analytics only on the client side
let analytics: any = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("✅ Firebase Analytics initialized");
      } else {
        console.log("⚠️ Analytics not supported in this environment");
      }
    })
    .catch((err) => console.warn("Analytics init failed:", err));
}

// ✅ Exports
export { app, auth, db, analytics };
export default app;
