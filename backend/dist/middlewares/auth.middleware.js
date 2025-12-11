"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireStudent = requireStudent;
exports.requireInstructor = requireInstructor;
const jwt_1 = require("../config/jwt");
// Generic auth check
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        console.error("JWT verify error:", err);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
// Student-only
function requireStudent(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== "student") {
            return res.status(403).json({ message: "Student access required" });
        }
        next();
    });
}
// Instructor-only
function requireInstructor(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== "instructor") {
            return res.status(403).json({ message: "Instructor access required" });
        }
        next();
    });
}
