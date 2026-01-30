"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldValue = exports.firebaseAuth = exports.firestore = void 0;
// src/config/firebase.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
// ---- Helper: load service account from env (Render) or local file (dev) ----
function loadServiceAccount() {
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
            return parsed;
        }
        catch (e) {
            throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON (not valid JSON). ${e?.message || e}`);
        }
    }
    // ✅ Local dev fallback: allow a local json file (NOT for Render)
    // If the file doesn't exist, this will throw, which is fine.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require("../../firebase-service-account.json");
    return local;
}
const serviceAccount = loadServiceAccount();
// Initialize Firebase Admin SDK (only once)
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId ?? serviceAccount.project_id,
    });
}
// -----------------------------
// ✅ Firestore instance
// -----------------------------
exports.firestore = (0, firestore_1.getFirestore)();
// 🔥 IMPORTANT: Fixes all undefined errors when saving scraped stats
exports.firestore.settings({
    ignoreUndefinedProperties: true,
});
// -----------------------------
// Auth + FieldValue utilities
// -----------------------------
exports.firebaseAuth = firebase_admin_1.default.auth();
exports.FieldValue = firestore_1.FieldValue;
