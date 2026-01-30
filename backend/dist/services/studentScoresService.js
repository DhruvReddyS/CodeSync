"use strict";
/**
 * Student Scores Service
 * Manages computation and caching of student scores
 *
 * Key responsibility: Keep studentScores collection in sync with cpProfiles data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAndSaveScores = computeAndSaveScores;
exports.getStudentScores = getStudentScores;
exports.recomputeStudentScores = recomputeStudentScores;
exports.batchRecomputeScores = batchRecomputeScores;
exports.isScoresStale = isScoresStale;
exports.deleteStudentScores = deleteStudentScores;
const collections_1 = require("../models/collections");
const firebase_1 = require("../config/firebase");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const SCORE_CACHE_TTL_DAYS = 7; // Recompute scores every 7 days
const SCORE_VERSION = 1; // Increment to invalidate all scores
/**
 * Compute student scores from platform profiles
 * Used by: userCpRefreshService, scoring logic
 */
async function computeAndSaveScores(studentId, platformStats) {
    // Import here to avoid circular dependency
    const { computeCpScores } = require("../lib/scoringEngine");
    // Compute from platform stats
    const cpScores = computeCpScores(platformStats);
    // Structure for studentScores collection
    const studentScores = {
        displayScore: cpScores.displayScore || 0,
        codeSyncScore: cpScores.codeSyncScore || 0,
        platformSkills: cpScores.platformSkills || {},
        totalProblemsSolved: cpScores.totalProblemsSolved || 0,
        breakdown: cpScores.breakdown || {},
        computedAt: firebase_1.FieldValue.serverTimestamp(),
        expiresAt: firebase_admin_1.default.firestore.Timestamp.fromDate(new Date(Date.now() + SCORE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)),
        version: SCORE_VERSION,
        updatedAt: firebase_1.FieldValue.serverTimestamp(),
    };
    // Write to studentScores collection
    await collections_1.collections.studentScores.doc(studentId).set(studentScores, { merge: true });
    return studentScores;
}
/**
 * Get student scores (with fallback to recompute if expired)
 */
async function getStudentScores(studentId, recomputeIfExpired = true) {
    const doc = await collections_1.collections.studentScores.doc(studentId).get();
    if (!doc.exists) {
        if (recomputeIfExpired) {
            return await recomputeStudentScores(studentId);
        }
        return null;
    }
    const scores = doc.data();
    // Check if expired
    if (recomputeIfExpired && scores.expiresAt) {
        const expiresTime = scores.expiresAt instanceof Date
            ? scores.expiresAt.getTime()
            : scores.expiresAt.toDate?.().getTime() || 0;
        if (Date.now() > expiresTime) {
            return await recomputeStudentScores(studentId);
        }
    }
    return scores;
}
/**
 * Force recompute scores from cpProfiles
 */
async function recomputeStudentScores(studentId) {
    const profileSnap = await collections_1.collections.students
        .doc(studentId)
        .collection("cpProfiles")
        .get();
    if (profileSnap.empty) {
        // No profiles, return zero scores
        return await computeAndSaveScores(studentId, {
            leetcode: null,
            codeforces: null,
            codechef: null,
            github: null,
            hackerrank: null,
            atcoder: null,
        });
    }
    // Load all platform stats
    const platformStats = {
        leetcode: null,
        codeforces: null,
        codechef: null,
        github: null,
        hackerrank: null,
        atcoder: null,
    };
    profileSnap.forEach((doc) => {
        const data = doc.data();
        if (data.platform in platformStats) {
            platformStats[data.platform] = data;
        }
    });
    // Compute and save
    return await computeAndSaveScores(studentId, platformStats);
}
/**
 * Batch update scores for multiple students
 * Used for batch scoring/admin operations
 */
async function batchRecomputeScores(studentIds) {
    const results = new Map();
    // Process in chunks of 10 to avoid overwhelming the system
    const chunkSize = 10;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const promises = chunk.map(async (id) => {
            const scores = await recomputeStudentScores(id);
            results.set(id, scores);
        });
        await Promise.all(promises);
    }
    return results;
}
/**
 * Check if student scores are stale
 */
async function isScoresStale(studentId) {
    const scores = await getStudentScores(studentId, false);
    if (!scores || !scores.expiresAt)
        return true;
    const expiresTime = scores.expiresAt instanceof Date
        ? scores.expiresAt.getTime()
        : scores.expiresAt.toDate?.().getTime() || 0;
    return Date.now() > expiresTime;
}
/**
 * Delete student scores
 */
async function deleteStudentScores(studentId) {
    await collections_1.collections.studentScores.doc(studentId).delete();
}
