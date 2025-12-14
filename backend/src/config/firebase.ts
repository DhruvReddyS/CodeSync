// src/config/firebase.ts
import admin, { ServiceAccount } from "firebase-admin";
import {
  getFirestore,
  FieldValue as AdminFieldValue,
} from "firebase-admin/firestore";

// ---- Helper: load service account from env (Render) or local file (dev) ----
function loadServiceAccount(): ServiceAccount & { project_id?: string } {
  // ✅ Render / Production: store FULL JSON in env var
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);

      // Firebase private_key sometimes loses line breaks if pasted incorrectly.
      // This makes it safe for most cases.
      if (typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }

      return parsed as ServiceAccount & { project_id?: string };
    } catch (e: any) {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_JSON (not valid JSON). ${e?.message || e}`
      );
    }
  }

  // ✅ Local dev fallback: allow a local json file (NOT for Render)
  // If the file doesn't exist, this will throw, which is fine.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const local = require("../../firebase-service-account.json");
  return local as ServiceAccount & { project_id?: string };
}

const serviceAccount = loadServiceAccount();

// Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: (serviceAccount as any).projectId ?? serviceAccount.project_id,
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
