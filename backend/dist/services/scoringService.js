"use strict";
// src/services/scoringService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recomputeUserCPScore = recomputeUserCPScore;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const db = firebase_admin_1.default.firestore();
const usersCol = db.collection("users");
/* --------------------------------------------------
 * SMALL HELPERS
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
 * Load all cpProfiles for a user (instructors/admins)
 *  -> users/{userId}/cpProfiles/*
 * -------------------------------------------------- */
async function getUserPlatformStats(userId) {
    const snap = await usersCol.doc(userId).collection("cpProfiles").get();
    if (snap.empty)
        return [];
    const result = [];
    snap.forEach((doc) => {
        const data = (doc.data() || {});
        if (!data.platform) {
            // fallback: use doc id as platform if not stored
            data.platform = doc.id;
        }
        result.push(data);
    });
    return result;
}
/* --------------------------------------------------
 * Estimate "total problems solved" for analytics
 * -------------------------------------------------- */
function estimateProblemsSolved(stats) {
    if (typeof stats.problemsSolvedTotal === "number") {
        return stats.problemsSolvedTotal;
    }
    if (typeof stats.totalSolved === "number") {
        return stats.totalSolved;
    }
    if (typeof stats.problemsSolved === "number") {
        return stats.problemsSolved;
    }
    // CodeChef fallback
    if (stats.platform === "codechef") {
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
 * NEW: Per-platform "skill" (score) for USERS
 * -------------------------------------------------- */
function computePlatformSkillFromStats(stats) {
    const platform = stats.platform || "leetcode";
    switch (platform) {
        case "leetcode": {
            const solved = n(stats.totalSolved) ||
                n(stats.problemsSolvedTotal);
            const rating = n(stats.contestRating ?? stats.rating);
            const contests = n(stats.attendedContests) ||
                n(stats.contestsParticipated);
            // 10 pts per solved, rating linear, small contest bonus
            return solved * 10 + rating * 1.0 + contests * 25;
        }
        case "codeforces": {
            const solved = n(stats.problemsSolvedTotal) ||
                n(stats.problemsSolved);
            const rating = n(stats.rating);
            const contests = n(stats.contestsAttended) ||
                n(stats.contestsParticipated);
            // CF is contest-heavy; slightly higher weights
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
            // Dev experience / project bonus
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
            // Close to rating + modest solved + contest bonus
            return solved * 8 + rating * 1.2 + contests * 35;
        }
        default:
            return 0;
    }
}
/* --------------------------------------------------
 * MAIN: recompute CP score for a "user" (instructors/admins)
 * -------------------------------------------------- */
async function recomputeUserCPScore(userId) {
    // 1) Load cpProfiles from users/{userId}/cpProfiles
    const stats = await getUserPlatformStats(userId);
    // 2) Build platformSkills map
    const platformSkills = {
        leetcode: 0,
        codechef: 0,
        codeforces: 0,
        atcoder: 0,
        hackerrank: 0,
        github: 0,
    };
    stats.forEach((s) => {
        const platform = s.platform || "leetcode";
        if (!platformSkills.hasOwnProperty(platform))
            return;
        const skill = computePlatformSkillFromStats(s);
        platformSkills[platform] = skill;
    });
    // 3) Total CodeSync score = sum of platform skills
    const codeSyncScore = Object.values(platformSkills).reduce((sum, v) => sum + (v || 0), 0);
    const displayScore = Math.round(codeSyncScore);
    // 4) Aggregate total problems solved across platforms
    const totalProblemsSolved = stats.reduce((sum, s) => sum + estimateProblemsSolved(s), 0);
    // 5) Persist on user document
    const now = firebase_admin_1.default.firestore.Timestamp.now();
    const userRef = usersCol.doc(userId);
    await userRef.set({
        cpScores: {
            platformSkills,
            codeSyncScore,
            displayScore,
            totalProblemsSolved,
            lastUpdated: now,
        },
    }, { merge: true });
    // 6) Optional snapshot history (for graphs later)
    const snapshotId = now.toMillis().toString();
    await userRef.collection("cpSnapshots").doc(snapshotId).set({
        timestamp: now,
        platformSkills,
        codeSyncScore,
        displayScore,
        totalProblemsSolved,
    });
    console.log(`📊 recomputeUserCPScore: user=${userId}, displayScore=${displayScore}, totalProblemsSolved=${totalProblemsSolved}, platforms=${stats.length}`);
    return {
        platformSkills,
        codeSyncScore,
        displayScore,
        totalProblemsSolved,
        lastUpdated: now,
    };
}
