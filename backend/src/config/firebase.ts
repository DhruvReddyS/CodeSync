// src/config/firebase.ts
import admin, { ServiceAccount } from "firebase-admin";
import {
  getFirestore,
  FieldValue as AdminFieldValue,
} from "firebase-admin/firestore";

import serviceAccountJson from "../../firebase-service-account.json";

// Allow fallback for different service-account JSON formats
const serviceAccount = serviceAccountJson as ServiceAccount & {
  project_id?: string;
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId ?? serviceAccount.project_id,
  });
}

// -----------------------------
// ✅ Firestore instance
// -----------------------------
export const firestore = getFirestore();

// 🔥 IMPORTANT: Fixes all undefined errors when saving scraped stats
firestore.settings({
  ignoreUndefinedProperties: true,
});

// -----------------------------
// Auth + FieldValue utilities
// -----------------------------
export const firebaseAuth = admin.auth();
export const FieldValue = AdminFieldValue;
