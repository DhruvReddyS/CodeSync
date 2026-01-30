"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCpScoresFromStats = computeCpScoresFromStats;
exports.recomputeAndSaveCpScoresForStudent = recomputeAndSaveCpScoresForStudent;
const firebase_1 = require("../config/firebase");
/* ------------------------------------------------------------------
 * FIRESTORE
 * ------------------------------------------------------------------ */
const STUDENTS_COLLECTION = "students";
const studentsCol = firebase_1.firestore.collection(STUDENTS_COLLECTION);
/* ------------------------------------------------------------------
 * UTILS
 * ------------------------------------------------------------------ */
function n(val) {
    if (typeof val === "number" && !Number.isNaN(val))
        return val;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? 0 : parsed;
}
function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}
/* ------------------------------------------------------------------
 * SCORING FUNCTIONS
 * ------------------------------------------------------------------ */
function scoreLeetCode(stats) {
    if (!stats)
        return { score: 0, solved: 0, rating: 0, contests: 0 };
    const solved = n(stats.totalSolved) || n(stats.problemsSolvedTotal) || 0;
    const rating = n(stats.contestRating ?? stats.rating);
    const contests = n(stats.attendedContests) || n(stats.contestsParticipated);
    return {
        score: solved * 10 + rating * 1.0 + contests * 25,
        solved,
        rating,
        contests,
    };
}
function scoreCodeforces(stats) {
    if (!stats)
        return { score: 0, solved: 0, rating: 0, contests: 0 };
    const solved = n(stats.problemsSolvedTotal) || n(stats.problemsSolved);
    const rating = n(stats.rating);
    const contests = n(stats.contestsAttended) || n(stats.contestsParticipated);
    return {
        score: solved * 12 + rating * 1.2 + contests * 40,
        solved,
        rating,
        contests,
    };
}
function scoreCodeChef(stats) {
    if (!stats)
        return { score: 0, solved: 0, rating: 0, contests: 0 };
    const fully = typeof stats.fullySolved === "number"
        ? n(stats.fullySolved)
        : n(stats.fullySolved?.total);
    const partial = typeof stats.partiallySolved === "number"
        ? n(stats.partiallySolved)
        : n(stats.partiallySolved?.total);
    const solved = fully + partial;
    const rating = n(stats.currentRating ?? stats.rating);
    const contestsEst = clamp(Math.round(rating / 40), 0, 200);
    return {
        score: fully * 12 + partial * 4 + rating * 1.0 + contestsEst * 30,
        solved,
        rating,
        contests: contestsEst,
    };
}
function scoreHackerRank(stats) {
    if (!stats)
        return { score: 0, solved: 0, rating: 0, contests: 0 };
    const solved = n(stats.problemsSolved) || n(stats.problemsSolvedTotal);
    const contests = n(stats.contestsParticipated);
    const badges = n(stats.badgesCount) || (Array.isArray(stats.badges) ? stats.badges.length : 0);
    const certs = n(stats.certificatesCount) ||
        (Array.isArray(stats.certificates) ? stats.certificates.length : 0);
    return {
        score: solved * 8 + contests * 20 + badges * 40 + certs * 60,
        solved,
        rating: 0,
        contests,
    };
}
function scoreGitHub(stats) {
    if (!stats)
        return { score: 0, solved: 0, rating: 0, contests: 0 };
    const stars = n(stats.totalStars ?? stats.starsReceived);
    return {
        score: n(stats.contributionsLastYear) * 2 +
            stars * 30 +
            n(stats.publicRepos) * 10 +
            n(stats.followers) * 20,
        solved: 0,
        rating: 0,
        contests: 0,
    };
}
function scoreAtCoder(stats) {
    if (!stats)
        return { score: 0, solved: 0, rating: 0, contests: 0 };
    const solved = n(stats.problemsSolvedTotal);
    const rating = n(stats.rating);
    const contests = n(stats.totalContests) || n(stats.ratedMatches);
    return {
        score: solved * 8 + rating * 1.2 + contests * 35,
        solved,
        rating,
        contests,
    };
}
/* ------------------------------------------------------------------
 * MAIN COMPUTE
 * ------------------------------------------------------------------ */
function computeCpScoresFromStats(platformStats) {
    const breakdown = {};
    const platformSkills = {};
    const lc = scoreLeetCode(platformStats.leetcode);
    const cf = scoreCodeforces(platformStats.codeforces);
    const cc = scoreCodeChef(platformStats.codechef);
    const hr = scoreHackerRank(platformStats.hackerrank);
    const gh = scoreGitHub(platformStats.github);
    const ac = scoreAtCoder(platformStats.atcoder);
    platformSkills.leetcode = lc.score;
    platformSkills.codeforces = cf.score;
    platformSkills.codechef = cc.score;
    platformSkills.hackerrank = hr.score;
    platformSkills.github = gh.score;
    platformSkills.atcoder = ac.score;
    // ✅ FIX: breakdown requires { problemsSolved, rating, contests }
    breakdown.leetcode = { problemsSolved: lc.solved, rating: lc.rating, contests: lc.contests };
    breakdown.codeforces = { problemsSolved: cf.solved, rating: cf.rating, contests: cf.contests };
    breakdown.codechef = { problemsSolved: cc.solved, rating: cc.rating, contests: cc.contests };
    breakdown.hackerrank = { problemsSolved: hr.solved, rating: hr.rating, contests: hr.contests };
    breakdown.github = { problemsSolved: gh.solved, rating: gh.rating, contests: gh.contests };
    breakdown.atcoder = { problemsSolved: ac.solved, rating: ac.rating, contests: ac.contests };
    const codeSyncScore = lc.score + cf.score + cc.score + hr.score + gh.score + ac.score;
    const totalProblemsSolved = lc.solved + cf.solved + cc.solved + hr.solved + ac.solved;
    return {
        codeSyncScore,
        displayScore: Math.round(codeSyncScore),
        platformSkills,
        totalProblemsSolved,
        breakdown,
        lastComputedAt: firebase_1.FieldValue.serverTimestamp(),
    };
}
/* ------------------------------------------------------------------
 * SAVE TO FIRESTORE
 * ------------------------------------------------------------------ */
async function recomputeAndSaveCpScoresForStudent(studentId, platformStats) {
    const cpScores = computeCpScoresFromStats(platformStats);
    await studentsCol.doc(studentId).set({
        cpScores,
        updatedAt: firebase_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return cpScores;
}
