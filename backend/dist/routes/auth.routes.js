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
const collections_1 = require("../models/collections");
const router = (0, express_1.Router)();
// Use centralized collection references
const { users: usersCol, students: studentsCol, instructors: instructorsCol } = collections_1.collections;
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
   POST /api/auth/student/google
---------------------------------------------------------- */
router.post("/student/google", async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).json({ message: "idToken is required" });
    }
    try {
        // 1) Verify Firebase ID token
        const decoded = await firebase_1.firebaseAuth.verifyIdToken(idToken);
        const firebaseUid = decoded.uid;
        const email = decoded.email;
        const displayName = decoded.name || "";
        const photoURL = decoded.picture || "";
        if (!email) {
            return res.status(400).json({ message: "Email missing in Firebase token" });
        }
        // 2) Find or create user in "users" collection
        let isNewUser = false;
        let userId;
        const existing = await findUserByEmail(email);
        if (!existing) {
            isNewUser = true;
            const userRef = usersCol.doc(firebaseUid);
            userId = userRef.id;
            await userRef.set({
                firebaseUid,
                email,
                name: displayName,
                photoURL,
                role: "student",
                status: "active", // ✅ NEW: explicit status
                createdAt: firebase_1.FieldValue.serverTimestamp(),
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            userId = existing.id;
            await usersCol.doc(userId).set({
                firebaseUid,
                email,
                name: existing.name || displayName,
                photoURL: existing.photoURL || photoURL,
                role: existing.role || "student",
                status: existing.status || "active", // ✅ Preserve status
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        // 3) Upsert student document
        const studentRef = studentsCol.doc(userId);
        const studentSnap = await studentRef.get();
        if (!studentSnap.exists) {
            await studentRef.set({
                // No userId field - use doc ID instead ✅
                onboardingCompleted: false,
                status: "active", // ✅ NEW: explicit status
                createdAt: firebase_1.FieldValue.serverTimestamp(),
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            await studentRef.set({
                status: "active", // ✅ Ensure active
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        // 4) Sign backend JWT
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
        console.error("❌ /auth/student/google error:", err);
        return res.status(401).json({ message: "Invalid Firebase ID token" });
    }
});
/* ----------------------------------------------------------
   INSTRUCTOR REGISTER (admin/dev use)
   POST /api/auth/instructor/register
---------------------------------------------------------- */
router.post("/instructor/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }
    try {
        // Check if instructor exists
        const snap = await usersCol
            .where("email", "==", email)
            .where("role", "==", "instructor")
            .limit(1)
            .get();
        if (!snap.empty) {
            return res.status(400).json({ message: "Instructor already exists" });
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        // Create user doc
        const userRef = usersCol.doc();
        const userId = userRef.id;
        await userRef.set({
            email,
            name: name || "Instructor",
            role: "instructor",
            firebaseUid: null, // ✅ Instructors don't use Firebase Auth
            status: "active", // ✅ NEW: explicit status
            createdAt: firebase_1.FieldValue.serverTimestamp(),
            updatedAt: firebase_1.FieldValue.serverTimestamp(),
        });
        // Create instructor doc (stores password hash only)
        await instructorsCol.doc(userId).set({
            userId,
            passwordHash,
            // createdAt and updatedAt removed - use users doc as source of truth
        });
        return res.json({ message: "Instructor created successfully", id: userId });
    }
    catch (err) {
        console.error("❌ /auth/instructor/register error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
/* ----------------------------------------------------------
   INSTRUCTOR LOGIN
   POST /api/auth/instructor/login
---------------------------------------------------------- */
router.post("/instructor/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
    }
    try {
        // Find instructor user entry
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
        // Fetch instructor creds
        const instructorDoc = await instructorsCol.doc(userId).get();
        if (!instructorDoc.exists) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        const { passwordHash } = instructorDoc.data();
        // Validate password
        const ok = await bcryptjs_1.default.compare(password, passwordHash);
        if (!ok) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        // Sign JWT
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
        console.error("❌ /auth/instructor/login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
/* ----------------------------------------------------------
   INSTRUCTOR FORGOT PASSWORD (stub)
   POST /api/auth/instructor/forgot-password
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
        // Always respond success to avoid email enumeration
        if (snap.empty) {
            return res.json({
                message: "If that email exists, a reset link was sent.",
            });
        }
        const userDoc = snap.docs[0];
        const userId = userDoc.id;
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const resetLink = `https://codesync.app/reset?token=${resetToken}&uid=${userId}`;
        console.log("🔐 Password reset link (stub):", resetLink);
        return res.json({ message: "Password reset link sent (stub)." });
    }
    catch (err) {
        console.error("❌ /auth/instructor/forgot-password error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
