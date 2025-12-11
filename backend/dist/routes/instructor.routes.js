"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/instructor.routes.ts
const express_1 = require("express");
const firebase_1 = require("../config/firebase");
const router = (0, express_1.Router)();
const usersCol = firebase_1.firestore.collection("users");
const instructorsCol = firebase_1.firestore.collection("instructors");
// GET /api/instructor/me
router.get("/me", async (req, res) => {
    const userId = req.user.sub;
    try {
        const userDoc = await usersCol.doc(userId).get();
        if (!userDoc.exists)
            return res.status(404).json({ message: "User not found" });
        const instrDoc = await instructorsCol.doc(userId).get();
        return res.json({
            user: { id: userDoc.id, ...userDoc.data() },
            instructor: instrDoc.exists ? instrDoc.data() : null,
        });
    }
    catch (err) {
        console.error("GET /instructor/me error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
