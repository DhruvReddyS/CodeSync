"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/student.routes.ts
const express_1 = require("express");
const firebase_1 = require("../config/firebase");
const router = (0, express_1.Router)();
const usersCol = firebase_1.firestore.collection("users");
const studentsCol = firebase_1.firestore.collection("students");
// GET /api/student/me
router.get("/me", async (req, res) => {
    const userId = req.user.sub;
    try {
        const userDoc = await usersCol.doc(userId).get();
        if (!userDoc.exists)
            return res.status(404).json({ message: "User not found" });
        const studentDoc = await studentsCol.doc(userId).get();
        return res.json({
            user: { id: userDoc.id, ...userDoc.data() },
            student: studentDoc.exists ? studentDoc.data() : null,
        });
    }
    catch (err) {
        console.error("GET /student/me error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
