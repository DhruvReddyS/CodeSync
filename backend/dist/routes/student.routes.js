"use strict";
// src/routes/student.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const firebase_1 = require("../config/firebase");
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const role_middleware_1 = require("../middleware/role.middleware");
const userCpRefreshService_1 = require("../services/userCpRefreshService");
const collections_1 = require("../models/collections");
const studentScoresService_1 = require("../services/studentScoresService");
const router = express_1.default.Router();
// Use centralized collection reference
const studentsCol = collections_1.collections.students;
/* --------------------------------------------------
 * Helper: Load a map of PlatformId → FULL scraped stats
 * -------------------------------------------------- */
async function loadPlatformStatsMap(studentId) {
    const snap = await studentsCol.doc(studentId).collection("cpProfiles").get();
    const map = {
        leetcode: null,
        codechef: null,
        codeforces: null,
        atcoder: null,
        hackerrank: null,
        github: null,
    };
    snap.forEach((doc) => {
        const data = doc.data();
        const platform = data.platform;
        if (platform in map) {
            map[platform] = { ...data };
        }
    });
    return map;
}
/* ==================================================
 * 🟠 ONBOARDING → POST /api/student/onboarding
 * ================================================== */
router.post("/onboarding", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        const { fullName, collegeEmail, personalEmail, phone, branch, yearOfStudy, section, rollNumber, graduationYear, codingHandles, profile, } = req.body;
        if (!fullName) {
            return res.status(400).json({ message: "fullName is required" });
        }
        if (!branch || !yearOfStudy || !section || !rollNumber || !graduationYear) {
            return res.status(400).json({
                message: "branch, yearOfStudy, section, rollNumber, graduationYear are required",
            });
        }
        const studentRef = studentsCol.doc(studentId);
        const existingSnap = await studentRef.get();
        const isNew = !existingSnap.exists;
        const dataToSet = {
            fullName,
            collegeEmail: collegeEmail || null,
            personalEmail: personalEmail || null,
            phone: phone || null,
            branch,
            yearOfStudy,
            section,
            rollNumber,
            graduationYear: graduationYear || null,
            cpHandles: {
                leetcode: codingHandles?.leetcode || null,
                codeforces: codingHandles?.codeforces || null,
                codechef: codingHandles?.codechef || null,
                atcoder: codingHandles?.atcoder || null,
                hackerrank: codingHandles?.hackerrank || null,
                github: codingHandles?.github || null,
            },
            profile: profile || {},
            onboardingCompleted: true,
            status: "active",
            updatedAt: firebase_1.FieldValue.serverTimestamp(),
        };
        if (isNew) {
            dataToSet.createdAt = firebase_1.FieldValue.serverTimestamp();
        }
        // Step 1: Save student profile
        await studentRef.set(dataToSet, { merge: true });
        console.log(`[STUDENT /onboarding] Saved profile for student=${studentId}`);
        // Step 2: Initialize scores document
        try {
            const { computeAndSaveScores } = require("../services/studentScoresService");
            const emptyStats = {
                leetcode: null,
                codeforces: null,
                codechef: null,
                atcoder: null,
                hackerrank: null,
                github: null,
            };
            await computeAndSaveScores(studentId, emptyStats);
            console.log(`[STUDENT /onboarding] Initialized scores for student=${studentId}`);
        }
        catch (scoresErr) {
            console.error("[STUDENT /onboarding] Failed to initialize scores:", scoresErr);
            // Don't fail onboarding if scores init fails
        }
        // Step 3: Trigger scraping if handles provided (async, don't wait)
        const hasAnyHandle = !!codingHandles &&
            !!(codingHandles.leetcode ||
                codingHandles.codeforces ||
                codingHandles.codechef ||
                codingHandles.atcoder ||
                codingHandles.hackerrank ||
                codingHandles.github);
        if (hasAnyHandle) {
            // Start scraping in background (don't wait for it)
            (0, userCpRefreshService_1.refreshStudentCPData)(studentId)
                .then(() => {
                console.log(`[STUDENT /onboarding] ✅ CP refresh completed for student=${studentId}`);
            })
                .catch((err) => {
                console.error(`[STUDENT /onboarding] ⚠️  CP refresh failed for student=${studentId}:`, err);
            });
        }
        return res.json({
            message: "Onboarding completed successfully",
            studentId,
            hasHandles: hasAnyHandle,
        });
    }
    catch (err) {
        console.error("[STUDENT /onboarding] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to complete onboarding" });
    }
});
/* ==================================================
 * PATCH CP Handles → PATCH /api/student/cp-handles
 * ================================================== */
router.patch("/cp-handles", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        const { cpHandles } = req.body;
        if (!cpHandles) {
            return res.status(400).json({ message: "cpHandles is required" });
        }
        await studentsCol.doc(studentId).set({
            cpHandles: {
                leetcode: cpHandles.leetcode || null,
                codechef: cpHandles.codechef || null,
                codeforces: cpHandles.codeforces || null,
                atcoder: cpHandles.atcoder || null,
                hackerrank: cpHandles.hackerrank || null,
                github: cpHandles.github || null,
            },
            updatedAt: firebase_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.json({ message: "CP handles updated." });
    }
    catch (err) {
        console.error("[STUDENT /cp-handles] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to update cp handles" });
    }
});
/* ==================================================
 * 📊 Dashboard Stats → GET /api/student/stats/me
 * ================================================== */
router.get("/stats/me", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        const snap = await studentsCol.doc(studentId).get();
        if (!snap.exists) {
            return res.status(404).json({ message: "Student not found" });
        }
        const data = snap.data() || {};
        const cpHandles = data.cpHandles || {};
        // ✅ Read scores from studentScores collection (not from student doc)
        const cpScores = await (0, studentScoresService_1.getStudentScores)(studentId, true);
        const platformStats = await loadPlatformStatsMap(studentId);
        return res.json({
            cpHandles,
            cpScores,
            platformStats,
        });
    }
    catch (err) {
        console.error("[STUDENT /stats/me] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to load stats" });
    }
});
/* ==================================================
 * Refresh Single Platform → POST /api/student/stats/refresh-platform
 * ================================================== */
router.post("/stats/refresh-platform", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        const platform = req.body.platform;
        if (!platform) {
            return res.status(400).json({ message: "platform is required" });
        }
        await (0, userCpRefreshService_1.refreshStudentPlatform)(studentId, platform);
        // Read scores from dedicated studentScores collection
        const cpScores = await (0, studentScoresService_1.getStudentScores)(studentId, true);
        const platformStats = await loadPlatformStatsMap(studentId);
        return res.json({ cpScores, platformStats });
    }
    catch (err) {
        console.error("[STUDENT /stats/refresh-platform] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to refresh platform" });
    }
});
/* ==================================================
 * Refresh All Platforms → POST /api/student/stats/refresh-all
 * ================================================== */
router.post("/stats/refresh-all", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        await (0, userCpRefreshService_1.refreshStudentCPData)(studentId);
        // Return updated scores from studentScores collection
        const cpScores = await (0, studentScoresService_1.getStudentScores)(studentId, true);
        const platformStats = await loadPlatformStatsMap(studentId);
        return res.json({ cpScores, platformStats });
    }
    catch (err) {
        console.error("[STUDENT /stats/refresh-all] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to refresh all platforms" });
    }
});
/* ==================================================
 * 🏆 Leaderboard → GET /api/student/stats/leaderboard?limit=50
 * ================================================== */
router.get("/stats/leaderboard", auth_middleware_1.default, async (req, res) => {
    try {
        const rawLimit = req.query?.limit || "50";
        const limit = Number(rawLimit) || 50;
        // Query studentScores collection for leaderboard (fast)
        const scoresSnap = await collections_1.collections.studentScores
            .where("displayScore", ">", 0)
            .orderBy("displayScore", "desc")
            .limit(limit)
            .get();
        const leaderboard = [];
        // Fetch student basic info in parallel
        const promises = scoresSnap.docs.map(async (doc, index) => {
            const studentId = doc.id;
            const scores = doc.data() || {};
            const studentSnap = await studentsCol.doc(studentId).get();
            const sd = studentSnap.exists ? (studentSnap.data() || {}) : {};
            return {
                studentId,
                rank: index + 1,
                name: sd.fullName || sd.fullname || sd.name || null,
                branch: sd.branch || null,
                section: sd.section || null,
                year: sd.yearOfStudy || sd.year || null,
                rollNumber: sd.rollNumber || null,
                avatarUrl: sd.profile?.avatarUrl || sd.avatarUrl || null,
                cpScores: scores,
                cpHandles: sd.cpHandles || {},
            };
        });
        const resolved = await Promise.all(promises);
        resolved.forEach((r) => leaderboard.push(r));
        return res.json({ leaderboard });
    }
    catch (err) {
        console.error("[STUDENT /stats/leaderboard] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to load leaderboard" });
    }
});
/* ==================================================
 * 👁️ VIEW ANY STUDENT PROFILE (by id)
 * GET /api/student/profile/:id
 * ================================================== */
router.get("/profile/:id", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const targetId = String(req.params?.id || "").trim();
        if (!targetId) {
            return res.status(400).json({ message: "Student id is required" });
        }
        const snap = await studentsCol.doc(targetId).get();
        if (!snap.exists) {
            return res.status(404).json({ message: "Student not found" });
        }
        const data = snap.data() || {};
        const cpScores = await (0, studentScoresService_1.getStudentScores)(targetId, true);
        const platformStats = await loadPlatformStatsMap(targetId);
        return res.json({
            student: {
                id: targetId,
                fullName: data.fullName || data.fullname || data.name || null,
                branch: data.branch || null,
                section: data.section || null,
                year: data.yearOfStudy || data.year || null,
                rollNumber: data.rollNumber || null,
                graduationYear: data.graduationYear || null,
                // ✅ added for UI display
                collegeEmail: data.collegeEmail || null,
                personalEmail: data.personalEmail || null,
                phone: data.phone || null,
                profile: data.profile || {},
                cpHandles: data.cpHandles || {},
            },
            cpScores,
            platformStats,
        });
    }
    catch (err) {
        console.error("[STUDENT /profile/:id] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to load student profile" });
    }
});
/* ==================================================
 * FULL PROFILE (ME) → GET /api/student/profile
 * ================================================== */
router.get("/profile", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        const ref = studentsCol.doc(studentId);
        const snap = await ref.get();
        if (!snap.exists) {
            return res.status(404).json({
                message: "Student profile not found",
                onboardingRequired: true,
            });
        }
        const data = snap.data() || {};
        // Return actual onboarding status from database (don't auto-set it)
        const onboardingCompleted = data.onboardingCompleted === true;
        // If student hasn't completed onboarding, return 403
        if (!onboardingCompleted) {
            return res.status(403).json({
                message: "Please complete onboarding first",
                onboardingRequired: true,
            });
        }
        return res.json({
            id: studentId,
            fullname: data.fullName || data.fullname || null,
            collegeEmail: data.collegeEmail || null,
            personalEmail: data.personalEmail || null,
            phone: data.phone || null,
            branch: data.branch || null,
            section: data.section || null,
            year: data.yearOfStudy || data.year || null,
            rollNumber: data.rollNumber || null,
            graduationYear: data.graduationYear || null,
            cpHandles: data.cpHandles || {},
            profile: data.profile || {},
            onboardingCompleted: true,
        });
    }
    catch (err) {
        console.error("[STUDENT /profile] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to load profile" });
    }
});
/* ==================================================
 * UPDATE PROFILE (ME) → PUT /api/student/profile
 * ================================================== */
router.put("/profile", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const studentId = req.user.sub;
        const { fullname, collegeEmail, personalEmail, phone, branch, section, year, rollNumber, graduationYear, cpHandles, profile, } = req.body;
        if (phone && String(phone).replace(/\D/g, "").length < 8) {
            return res.status(400).json({ message: "Phone number looks too short." });
        }
        const ref = studentsCol.doc(studentId);
        const snap = await ref.get();
        if (!snap.exists) {
            return res.status(404).json({
                message: "Student profile not found",
                onboardingRequired: true,
            });
        }
        const updateDoc = {
            updatedAt: firebase_1.FieldValue.serverTimestamp(),
            onboardingCompleted: true,
        };
        if (fullname !== undefined)
            updateDoc.fullName = fullname || null;
        if (collegeEmail !== undefined)
            updateDoc.collegeEmail = collegeEmail || null;
        if (personalEmail !== undefined)
            updateDoc.personalEmail = personalEmail || null;
        if (phone !== undefined)
            updateDoc.phone = phone || null;
        if (branch !== undefined)
            updateDoc.branch = branch || null;
        if (section !== undefined)
            updateDoc.section = section || null;
        if (year !== undefined) {
            updateDoc.yearOfStudy = year || null;
            updateDoc.year = year || null;
        }
        if (rollNumber !== undefined)
            updateDoc.rollNumber = rollNumber || null;
        if (graduationYear !== undefined)
            updateDoc.graduationYear = graduationYear || null;
        if (cpHandles !== undefined) {
            updateDoc.cpHandles = {
                leetcode: cpHandles?.leetcode || null,
                codeforces: cpHandles?.codeforces || null,
                codechef: cpHandles?.codechef || null,
                atcoder: cpHandles?.atcoder || null,
                hackerrank: cpHandles?.hackerrank || null,
                github: cpHandles?.github || null,
            };
        }
        if (profile !== undefined) {
            updateDoc.profile = profile || {};
        }
        await ref.set(updateDoc, { merge: true });
        const after = (await ref.get()).data() || {};
        return res.json({
            id: studentId,
            fullname: after.fullName || after.fullname || null,
            collegeEmail: after.collegeEmail || null,
            personalEmail: after.personalEmail || null,
            phone: after.phone || null,
            branch: after.branch || null,
            section: after.section || null,
            year: after.yearOfStudy || after.year || null,
            rollNumber: after.rollNumber || null,
            graduationYear: after.graduationYear || null,
            cpHandles: after.cpHandles || {},
            profile: after.profile || {},
            onboardingCompleted: true,
        });
    }
    catch (err) {
        console.error("[STUDENT PUT /profile] error:", err);
        return res
            .status(500)
            .json({ message: err.message || "Failed to update profile" });
    }
});
exports.default = router;
