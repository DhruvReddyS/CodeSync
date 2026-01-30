"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshStudentCPData = refreshStudentCPData;
exports.refreshStudentPlatform = refreshStudentPlatform;
const firebase_1 = require("../config/firebase");
const collections_1 = require("../models/collections");
const studentScoresService_1 = require("./studentScoresService");
// SCRAPERS (already in your project)
const githubScraper_1 = require("./scrapers/githubScraper");
const leetcodeScraper_1 = require("./scrapers/leetcodeScraper");
const codeforcesScraper_1 = require("./scrapers/codeforcesScraper");
const codechefScraper_1 = require("./scrapers/codechefScraper");
const hackerrankScraper_1 = require("./scrapers/hackerrankScraper");
const atcoderScraper_1 = require("./scrapers/atcoderScraper");
// Use centralized collection reference
const studentsCol = collections_1.collections.students;
const ALL_PLATFORMS = [
    "leetcode",
    "codechef",
    "codeforces",
    "atcoder",
    "hackerrank",
    "github",
];
/* --------------------------------------------------
 * Small helpers
 * -------------------------------------------------- */
function n(val) {
    if (typeof val === "number" && !Number.isNaN(val))
        return val;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? 0 : parsed;
}
function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}
/* --------------------------------------------------
 * Load cpHandles for a student
 * -------------------------------------------------- */
async function loadStudentCpHandles(studentId) {
    const snap = await studentsCol.doc(studentId).get();
    if (!snap.exists) {
        throw new Error(`Student ${studentId} not found`);
    }
    const data = snap.data() || {};
    return (data.cpHandles || {});
}
/* --------------------------------------------------
 * Load FULL cpProfiles map for a student
 *  → EXACTLY what /stats/me sends as platformStats
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
        const data = doc.data() || {};
        const platform = (data.platform || doc.id);
        if (ALL_PLATFORMS.includes(platform)) {
            map[platform] = { ...data };
        }
    });
    return map;
}
/* --------------------------------------------------
 * Save/update ONE cpProfile doc for a platform
 *  - profileData === null → delete cpProfiles/{platform}
 *  - otherwise upsert with lastScrapedAt
 * -------------------------------------------------- */
async function savePlatformProfile(studentId, platform, profileData) {
    const colRef = studentsCol.doc(studentId).collection("cpProfiles");
    const docRef = colRef.doc(platform);
    if (profileData == null) {
        try {
            await docRef.delete();
        }
        catch (err) {
            console.error("[userCpRefreshService] delete cpProfile failed:", err);
        }
        return;
    }
    const payload = {
        ...profileData,
        platform,
        scrapedAt: firebase_1.FieldValue.serverTimestamp(), // ✅ Renamed from lastScrapedAt
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // ✅ NEW: expires in 24 hours
        updatedAt: firebase_1.FieldValue.serverTimestamp(),
    };
    await docRef.set(payload, { merge: true });
}
/* --------------------------------------------------
 * Call correct scraper for each platform
 * -------------------------------------------------- */
async function scrapeForPlatform(platform, handle) {
    switch (platform) {
        case "leetcode":
            return await (0, leetcodeScraper_1.scrapeLeetCode)(handle);
        case "codeforces":
            return await (0, codeforcesScraper_1.scrapeCodeforces)(handle);
        case "codechef":
            return await (0, codechefScraper_1.scrapeCodeChef)(handle);
        case "hackerrank":
            return await (0, hackerrankScraper_1.scrapeHackerRank)(handle);
        case "github":
            return await (0, githubScraper_1.scrapeGitHub)(handle);
        case "atcoder":
            return await (0, atcoderScraper_1.scrapeAtcoder)(handle);
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
/* --------------------------------------------------
 * Estimate "problems solved" across platforms
 *  (for cpScores.totalProblemsSolved)
 * -------------------------------------------------- */
function estimateProblemsSolved(stats, platform) {
    if (!stats)
        return 0;
    if (typeof stats.problemsSolvedTotal === "number") {
        return stats.problemsSolvedTotal;
    }
    if (typeof stats.totalSolved === "number") {
        return stats.totalSolved;
    }
    if (typeof stats.problemsSolved === "number") {
        return stats.problemsSolved;
    }
    if (platform === "codechef") {
        let fully = 0;
        if (typeof stats.fullySolved === "number") {
            fully = n(stats.fullySolved);
        }
        else if (stats.fullySolved && typeof stats.fullySolved === "object") {
            fully = n(stats.fullySolved.total);
        }
        let partial = 0;
        if (typeof stats.partiallySolved === "number") {
            partial = n(stats.partiallySolved);
        }
        else if (stats.partiallySolved && typeof stats.partiallySolved === "object") {
            partial = n(stats.partiallySolved.total);
        }
        return fully + partial;
    }
    return 0;
}
/* --------------------------------------------------
 * NEW Fair Scoring:
 *  Per-platform "skill" from raw stats
 *  (same philosophy as we discussed)
 * -------------------------------------------------- */
function computePlatformSkill(platform, stats) {
    if (!stats)
        return 0;
    switch (platform) {
        case "leetcode": {
            const solved = n(stats.totalSolved) ||
                n(stats.problemsSolvedTotal);
            const rating = n(stats.contestRating ?? stats.rating);
            const contests = n(stats.attendedContests) ||
                n(stats.contestsParticipated);
            return solved * 10 + rating * 1.0 + contests * 25;
        }
        case "codeforces": {
            const solved = n(stats.problemsSolvedTotal) ||
                n(stats.problemsSolved);
            const rating = n(stats.rating);
            const contests = n(stats.contestsAttended) ||
                n(stats.contestsParticipated);
            return solved * 12 + rating * 1.2 + contests * 40;
        }
        case "codechef": {
            let fully = 0;
            if (typeof stats.fullySolved === "number") {
                fully = n(stats.fullySolved);
            }
            else if (stats.fullySolved && typeof stats.fullySolved === "object") {
                fully = n(stats.fullySolved.total);
            }
            let partial = 0;
            if (typeof stats.partiallySolved === "number") {
                partial = n(stats.partiallySolved);
            }
            else if (stats.partiallySolved && typeof stats.partiallySolved === "object") {
                partial = n(stats.partiallySolved.total);
            }
            const rating = n(stats.currentRating ?? stats.rating);
            const contestsEst = clamp(Math.round(rating / 40), 0, 200);
            return fully * 12 + partial * 4 + rating * 1.0 + contestsEst * 30;
        }
        case "hackerrank": {
            const problems = n(stats.problemsSolved) ||
                n(stats.problemsSolvedTotal);
            const contests = n(stats.contestsParticipated);
            const badgesCount = n(stats.badgesCount) ||
                (Array.isArray(stats.badges) ? stats.badges.length : 0);
            const certificatesCount = n(stats.certificatesCount) ||
                (Array.isArray(stats.certificates) ? stats.certificates.length : 0);
            return (problems * 8 +
                contests * 20 +
                badgesCount * 40 +
                certificatesCount * 60);
        }
        case "github": {
            const contributions = n(stats.contributionsLastYear);
            const stars = n(stats.totalStars ?? stats.starsReceived);
            const repos = n(stats.publicRepos);
            const followers = n(stats.followers);
            return (contributions * 2 +
                stars * 30 +
                repos * 10 +
                followers * 20);
        }
        case "atcoder": {
            const rating = n(stats.rating);
            const contests = n(stats.totalContests) ||
                n(stats.ratedMatches);
            const solved = n(stats.problemsSolvedTotal);
            return solved * 8 + rating * 1.2 + contests * 35;
        }
        default:
            return 0;
    }
}
/* --------------------------------------------------
 * Compute cpScores from FULL platformStats map
 *  → Save to studentScores collection ✅
 * -------------------------------------------------- */
function computeCpScoresFromStats(platformStats) {
    const platformSkills = {};
    let totalProblemsSolved = 0;
    ALL_PLATFORMS.forEach((p) => {
        const stats = platformStats[p];
        platformSkills[p] = computePlatformSkill(p, stats);
        totalProblemsSolved += estimateProblemsSolved(stats, p);
    });
    const codeSyncScore = Object.values(platformSkills).reduce((sum, v) => sum + (v || 0), 0);
    const displayScore = Math.round(codeSyncScore);
    return {
        codeSyncScore,
        displayScore,
        platformSkills,
        totalProblemsSolved,
        computedAt: firebase_1.FieldValue.serverTimestamp(), // ✅ Renamed from lastComputedAt
    };
}
/* --------------------------------------------------
 * Refresh ALL platforms for a student
 *  → Used by /stats/refresh-all and onboarding
 * -------------------------------------------------- */
async function refreshStudentCPData(studentId) {
    const cpHandles = await loadStudentCpHandles(studentId);
    // 1) Scrape & save cpProfiles
    await Promise.all(ALL_PLATFORMS.map(async (platform) => {
        const handle = cpHandles[platform];
        if (!handle || !handle.trim()) {
            // No handle → clear this profile
            await savePlatformProfile(studentId, platform, null);
            return;
        }
        try {
            const scraped = await scrapeForPlatform(platform, handle.trim());
            await savePlatformProfile(studentId, platform, {
                ...scraped,
                platform,
                handle: handle.trim(),
            });
        }
        catch (err) {
            console.error(`[userCpRefreshService] Failed to scrape ${platform} for student=${studentId}, handle=${handle}:`, err);
            // Keep old profile if scraping fails
        }
    }));
    // 2) Load full cpProfiles → compute cpScores → save to studentScores collection ✅
    const platformStats = await loadPlatformStatsMap(studentId);
    const cpScores = computeCpScoresFromStats(platformStats);
    // ✅ Write scores to dedicated studentScores collection (not to student doc)
    await (0, studentScoresService_1.computeAndSaveScores)(studentId, platformStats);
    // Update student doc timestamp
    await studentsCol.doc(studentId).set({
        updatedAt: firebase_1.FieldValue.serverTimestamp(),
    }, { merge: true });
}
/* --------------------------------------------------
 * Refresh ONE platform for a student
 *  → Used by /stats/refresh-platform
 * -------------------------------------------------- */
async function refreshStudentPlatform(studentId, platform) {
    const cpHandles = await loadStudentCpHandles(studentId);
    const handle = cpHandles[platform];
    if (!handle || !handle.trim()) {
        // No handle → clear profile + recompute cpScores
        await savePlatformProfile(studentId, platform, null);
        const platformStats = await loadPlatformStatsMap(studentId);
        // ✅ Write scores to dedicated studentScores collection
        await (0, studentScoresService_1.computeAndSaveScores)(studentId, platformStats);
        await studentsCol.doc(studentId).set({
            updatedAt: firebase_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return;
    }
    try {
        const scraped = await scrapeForPlatform(platform, handle.trim());
        await savePlatformProfile(studentId, platform, {
            ...scraped,
            platform,
            handle: handle.trim(),
        });
        // ✅ Recompute scores after platform refresh
        const platformStats = await loadPlatformStatsMap(studentId);
        await (0, studentScoresService_1.computeAndSaveScores)(studentId, platformStats);
    }
    catch (err) {
        console.error(`[userCpRefreshService] Failed to scrape ${platform} for student=${studentId}, handle=${handle}:`, err);
        // keep previous profile data
    }
    // Scores are saved to `studentScores` collection by `computeAndSaveScores`
    // No longer persist `cpScores` inside student document here.
}
