"use strict";
// src/routes/auth.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const firebase_1 = require("../config/firebase");
const jwt_1 = require("../config/jwt");
const router = (0, express_1.Router)();
// Firestore collections
const usersCol = firebase_1.firestore.collection("users");
const studentsCol = firebase_1.firestore.collection("students");
const instructorsCol = firebase_1.firestore.collection("instructors");
/* ----------------------------------------------------------
   Helper: Find user by email
---------------------------------------------------------- */
async function findUserByEmail(email) {
    const snap = await usersCol.where("email", "==", email).limit(1).get();
    if (snap.empty)
        return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}
/* ----------------------------------------------------------
   STUDENT GOOGLE LOGIN
   Route: POST /api/auth/student/google
   Body: { idToken }
---------------------------------------------------------- */
router.post("/student/google", async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).json({ message: "idToken is required" });
    }
    try {
        // 1) Verify Firebase token (from frontend Google login)
        const decoded = await firebase_1.firebaseAuth.verifyIdToken(idToken);
        const firebaseUid = decoded.uid;
        const email = decoded.email;
        const displayName = decoded.name || "";
        const photoURL = decoded.picture || "";
        if (!email) {
            return res.status(400).json({ message: "Email missing in Firebase token" });
        }
        // 2) Find or create user
        let existingUser = await findUserByEmail(email);
        let isNewUser = false;
        let userId;
        if (!existingUser) {
            isNewUser = true;
            // use firebaseUid as doc id so it matches auth uid
            const userRef = usersCol.doc(firebaseUid);
            userId = userRef.id;
            await userRef.set({
                firebaseUid,
                email,
                name: displayName,
                photoURL,
                role: "student",
                createdAt: firebase_1.FieldValue.serverTimestamp(),
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            userId = existingUser.id;
            await usersCol.doc(userId).set({
                firebaseUid,
                email,
                name: existingUser.name || displayName,
                photoURL: existingUser.photoURL || photoURL,
                role: existingUser.role || "student",
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        // 3) Upsert student doc
        const studentRef = studentsCol.doc(userId);
        const studentSnap = await studentRef.get();
        if (!studentSnap.exists) {
            await studentRef.set({
                userId,
                createdAt: firebase_1.FieldValue.serverTimestamp(),
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            await studentRef.set({ updatedAt: firebase_1.FieldValue.serverTimestamp() }, { merge: true });
        }
        // 4) Generate our own JWT
        const token = (0, jwt_1.signToken)({
            sub: userId,
            role: "student",
        });
        return res.json({
            token,
            isNewUser,
            user: {
                id: userId,
                email,
                displayName,
                photoURL,
                role: "student",
            },
        });
    }
    catch (err) {
        console.error("❌ student/google error:", err);
        return res.status(401).json({ message: "Invalid Firebase ID token" });
    }
});
/* ----------------------------------------------------------
   INSTRUCTOR LOGIN (email + password)
   Route: POST /api/auth/instructor/login
   Body: { email, password }
---------------------------------------------------------- */
router.post("/instructor/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }
    try {
        // 1) Find instructor user
        const snap = await usersCol
            .where("email", "==", email)
            .where("role", "==", "instructor")
            .limit(1)
            .get();
        if (snap.empty) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const userDoc = snap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();
        // 2) Find instructor passwordHash doc
        const instructorDoc = await instructorsCol.doc(userId).get();
        if (!instructorDoc.exists) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const instructorData = instructorDoc.data();
        // 3) Compare password
        const ok = await bcryptjs_1.default.compare(password, instructorData.passwordHash);
        if (!ok) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        // 4) Create JWT
        const token = (0, jwt_1.signToken)({
            sub: userId,
            role: "instructor",
        });
        return res.json({
            token,
            instructor: {
                id: userId,
                email: userData.email,
                name: userData.name,
            },
        });
    }
    catch (err) {
        console.error("❌ instructor/login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
/* ----------------------------------------------------------
   INSTRUCTOR FORGOT PASSWORD (stub)
   Route: POST /api/auth/instructor/forgot-password
   Body: { email }
---------------------------------------------------------- */
router.post("/instructor/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email required" });
    }
    try {
        const snap = await usersCol
            .where("email", "==", email)
            .where("role", "==", "instructor")
            .limit(1)
            .get();
        // Always return success to avoid leaking valid emails
        if (snap.empty) {
            return res.json({ message: "If that email exists, a reset link was sent." });
        }
        const userDoc = snap.docs[0];
        const userId = userDoc.id;
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const resetLink = `https://codesync-reset-url.com/reset?token=${resetToken}&uid=${userId}`;
        console.log("🔐 Password reset link:", resetLink);
        return res.json({ message: "Password reset link sent (stub)." });
    }
    catch (err) {
        console.error("❌ forgot-password error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
/* ---------------------------------------------------------- */
exports.default = router;
