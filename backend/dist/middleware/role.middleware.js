"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudent = requireStudent;
exports.requireInstructor = requireInstructor;
function requireStudent(req, res, next) {
    if (!req.user || req.user.role !== "student") {
        return res.status(403).json({ message: "Student access required" });
    }
    next();
}
function requireInstructor(req, res, next) {
    if (!req.user || req.user.role !== "instructor") {
        return res.status(403).json({ message: "Instructor access required" });
    }
    next();
}
