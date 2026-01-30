"use strict";
// src/middleware/auth.middleware.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authMiddleware;
const jwt_1 = require("../config/jwt");
const firebase_1 = require("../config/firebase");
async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing Authorization header" });
    }
    const token = header.split(" ")[1];
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        // 🔍 Only students require onboarding checks
        if (payload.role === "student") {
            // We must allow hitting the onboarding endpoint even if
            // the student doc doesn't exist or onboarding is incomplete.
            const baseUrl = req.baseUrl || "";
            const path = req.path || "";
            const isStudentOnboardingRoute = baseUrl.startsWith("/api/student") && path === "/onboarding";
            if (!isStudentOnboardingRoute) {
                const studentDoc = await firebase_1.firestore
                    .collection("students")
                    .doc(payload.sub)
                    .get();
                if (!studentDoc.exists) {
                    return res.status(403).json({
                        onboardingRequired: true,
                        message: "Onboarding required",
                    });
                }
                const data = studentDoc.data();
                req.student = data;
                if (!data?.onboardingCompleted) {
                    return res.status(403).json({
                        onboardingRequired: true,
                        message: "Onboarding incomplete",
                    });
                }
            }
        }
        return next();
    }
    catch (err) {
        console.error("❌ auth error:", err);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
