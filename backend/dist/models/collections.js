"use strict";
/**
 * Firestore Collections - Centralized collection references and type definitions
 * Single source of truth for database schema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.collections = void 0;
exports.getStudent = getStudent;
exports.getStudentScores = getStudentScores;
exports.getPlatformProfile = getPlatformProfile;
exports.isUserActive = isUserActive;
exports.isStudentActive = isStudentActive;
const firebase_1 = require("../config/firebase");
// ====================================
// COLLECTION REFERENCES
// ====================================
exports.collections = {
    users: firebase_1.firestore.collection("users"),
    students: firebase_1.firestore.collection("students"),
    studentScores: firebase_1.firestore.collection("studentScores"),
    instructors: firebase_1.firestore.collection("instructors"),
};
// ====================================
// HELPER FUNCTIONS
// ====================================
/**
 * Get student profile with type safety
 */
async function getStudent(studentId) {
    const doc = await exports.collections.students.doc(studentId).get();
    return doc.exists ? doc.data() : null;
}
/**
 * Get student scores with type safety
 */
async function getStudentScores(studentId) {
    const doc = await exports.collections.studentScores.doc(studentId).get();
    return doc.exists ? doc.data() : null;
}
/**
 * Get platform profile with type safety
 */
async function getPlatformProfile(studentId, platform) {
    const doc = await exports.collections.students
        .doc(studentId)
        .collection("cpProfiles")
        .doc(platform)
        .get();
    return doc.exists ? doc.data() : null;
}
/**
 * Check if user is deleted/inactive
 */
function isUserActive(user) {
    return user.status === "active";
}
/**
 * Check if student is deleted/inactive
 */
function isStudentActive(student) {
    return student.status === "active";
}
