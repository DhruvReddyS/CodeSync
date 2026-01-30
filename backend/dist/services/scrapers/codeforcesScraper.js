"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeCodeforces = scrapeCodeforces;
// src/services/scrapers/codeforcesScraper.ts
const axios_1 = __importDefault(require("axios"));
const CF_API_BASE = "https://codeforces.com/api";
async function cfGet(path, params) {
    const res = await axios_1.default.get(`${CF_API_BASE}/${path}`, { params });
    if (res.data?.status !== "OK") {
        const comment = res.data?.comment || "Unknown Codeforces API error";
        throw new Error(`Codeforces API error [${path}]: ${comment}`);
    }
    return res.data.result;
}
async function scrapeCodeforces(username) {
    if (!username) {
        throw new Error("scrapeCodeforces: username is required");
    }
    username = username.trim();
    // 1) Basic user info
    const [user] = await cfGet("user.info", { handles: username });
    // 2) Contest rating history
    const ratingChanges = await cfGet("user.rating", { handle: username });
    // 3) Submissions (we take up to 10k recent submissions)
    const submissions = await cfGet("user.status", {
        handle: username,
        from: 1,
        count: 10000,
    });
    const contestsAttended = ratingChanges.length;
    // --- Contest history with rating changes ---
    const contestHistory = ratingChanges.map((rc) => ({
        contestId: rc.contestId,
        contestName: rc.contestName,
        rank: rc.rank,
        oldRating: rc.oldRating,
        newRating: rc.newRating,
        ratingChange: rc.newRating - rc.oldRating,
        date: new Date(rc.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0],
    }));
    // --- Problems solved + language stats + verdict stats + difficulty stats + tag stats ---
    const solvedProblems = new Set();
    const languages = {};
    const verdictStats = {};
    const difficultyWiseSolved = {};
    const tagWiseSolved = {};
    const solvedProblemDetails = [];
    for (const sub of submissions) {
        const verdict = sub.verdict || "UNKNOWN";
        verdictStats[verdict] = (verdictStats[verdict] || 0) + 1;
        const lang = sub.programmingLanguage || "Unknown";
        languages[lang] = (languages[lang] || 0) + 1;
        if (sub.verdict !== "OK")
            continue;
        const problem = sub.problem || {};
        let key;
        if (problem.contestId && problem.index) {
            key = `${problem.contestId}-${problem.index}`;
        }
        else if (problem.name) {
            key = `name-${problem.name}`;
        }
        else {
            continue;
        }
        if (!solvedProblems.has(key)) {
            solvedProblems.add(key);
            solvedProblemDetails.push({
                key,
                rating: problem.rating ?? null,
                tags: problem.tags ?? [],
            });
        }
    }
    // Calculate difficulty-wise and tag-wise stats from unique solved problems
    for (const prob of solvedProblemDetails) {
        // Difficulty
        if (prob.rating) {
            const difficultyBucket = String(prob.rating);
            difficultyWiseSolved[difficultyBucket] = (difficultyWiseSolved[difficultyBucket] || 0) + 1;
        }
        else {
            difficultyWiseSolved["unrated"] = (difficultyWiseSolved["unrated"] || 0) + 1;
        }
        // Tags
        for (const tag of prob.tags) {
            tagWiseSolved[tag] = (tagWiseSolved[tag] || 0) + 1;
        }
    }
    const problemsSolved = solvedProblems.size;
    // --- Recent submissions (last 20) ---
    const recentSubmissions = submissions
        .slice(0, 20)
        .map((sub) => ({
        id: sub.id,
        problemName: sub.problem?.name ?? "Unknown",
        problemIndex: sub.problem?.index ?? "",
        contestId: sub.problem?.contestId ?? null,
        verdict: sub.verdict ?? "UNKNOWN",
        language: sub.programmingLanguage ?? "Unknown",
        timestamp: sub.creationTimeSeconds ?? 0,
        rating: sub.problem?.rating ?? null,
    }));
    return {
        username,
        rating: user.rating ?? null,
        maxRating: user.maxRating ?? null,
        rank: user.rank ?? null,
        maxRank: user.maxRank ?? null,
        contribution: user.contribution ?? null,
        friendOfCount: user.friendOfCount ?? null,
        contestsAttended,
        problemsSolved,
        contestHistory,
        difficultyWiseSolved,
        tagWiseSolved,
        verdictStats,
        recentSubmissions,
        languages,
        profileUrl: `https://codeforces.com/profile/${encodeURIComponent(username)}`,
    };
}
