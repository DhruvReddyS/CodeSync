"use strict";
// src/services/cpProfileService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformStatsMap = getPlatformStatsMap;
exports.getPlatformProfile = getPlatformProfile;
exports.savePlatformProfile = savePlatformProfile;
const firebase_1 = require("../config/firebase");
const STUDENTS_COLLECTION = "students";
const studentsCol = firebase_1.firestore.collection(STUDENTS_COLLECTION);
const ALL_PLATFORMS = [
    "leetcode",
    "codechef",
    "hackerrank",
    "codeforces",
    "github",
    "atcoder",
];
/* ------------------------------------------------------------------
 * Get full map: platform → stats (FULL docs from cpProfiles)
 * ------------------------------------------------------------------ */
async function getPlatformStatsMap(studentId) {
    const snap = await studentsCol.doc(studentId).collection("cpProfiles").get();
    const emptyMap = {
        leetcode: null,
        codechef: null,
        hackerrank: null,
        codeforces: null,
        github: null,
        atcoder: null,
    };
    if (snap.empty)
        return emptyMap;
    const map = { ...emptyMap };
    snap.forEach((doc) => {
        const data = doc.data() || {};
        const platform = (data.platform || doc.id);
        if (ALL_PLATFORMS.includes(platform)) {
            map[platform] = data;
        }
    });
    return map;
}
/* ------------------------------------------------------------------
 * Get a single platform profile
 * ------------------------------------------------------------------ */
async function getPlatformProfile(studentId, platform) {
    // Prefer doc id = platform
    const ref = studentsCol
        .doc(studentId)
        .collection("cpProfiles")
        .doc(platform);
    const snap = await ref.get();
    if (snap.exists) {
        return snap.data() || null;
    }
    // Fallback: search by field "platform" if old data used random doc IDs
    const querySnap = await studentsCol
        .doc(studentId)
        .collection("cpProfiles")
        .where("platform", "==", platform)
        .limit(1)
        .get();
    if (!querySnap.empty) {
        return querySnap.docs[0].data() || null;
    }
    return null;
}
/* ------------------------------------------------------------------
 * Save/update platform profile
 *  - profileData === null → delete profile (no handle)
 *  - otherwise upsert
 * ------------------------------------------------------------------ */
async function savePlatformProfile(studentId, platform, profileData) {
    const colRef = studentsCol.doc(studentId).collection("cpProfiles");
    const docRef = colRef.doc(platform);
    if (profileData == null) {
        // No handle / clear profile
        try {
            await docRef.delete();
        }
        catch (err) {
            console.error("[cpProfileService] deletePlatformProfile error:", err);
        }
        return;
    }
    const payload = {
        ...profileData,
        platform,
        lastScrapedAt: firebase_1.FieldValue.serverTimestamp(),
        updatedAt: firebase_1.FieldValue.serverTimestamp(),
    };
    await docRef.set(payload, { merge: true });
}
