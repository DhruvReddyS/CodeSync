"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldValue = exports.firebaseAuth = exports.firestore = void 0;
// src/config/firebase.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_service_account_json_1 = __importDefault(require("../../firebase-service-account.json"));
const serviceAccount = firebase_service_account_json_1.default;
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId ?? serviceAccount.project_id,
});
exports.firestore = (0, firestore_1.getFirestore)();
exports.firebaseAuth = firebase_admin_1.default.auth();
exports.FieldValue = firestore_1.FieldValue;
