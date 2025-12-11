// src/lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBXB_LTQUhPjV_SqTv6QIFEOmvPIuvcxzE",
  authDomain: "codesync-bf41e.firebaseapp.com",
  projectId: "codesync-bf41e",
  storageBucket: "codesync-bf41e.firebasestorage.app",
  messagingSenderId: "709966735436",
  appId: "1:709966735436:web:467ff94553a4ba7e3eace9",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
