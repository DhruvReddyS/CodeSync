"use strict";
// src/services/scrapers/hackerrank.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeHackerrank = void 0;
exports.scrapeHackerRank = scrapeHackerRank;
const axios_1 = __importDefault(require("axios"));
/**
 * Shared axios client for HackerRank REST endpoints.
 * These endpoints are public for most profiles.
 */
const hackerRankClient = axios_1.default.create({
    baseURL: "https://www.hackerrank.com/rest/hackers",
    timeout: 12000,
    headers: {
        // Basic UA to avoid some dumb bot blocks
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
    },
});
/**
 * Default empty result – used when profile is private / not found / API fails.
 */
function getEmptyResult(username) {
    return {
        username,
        fullName: null,
        country: null,
        problemsSolved: 0,
        contestsParticipated: 0,
        badgesCount: 0,
        certificatesCount: 0,
        badges: [],
        domainWiseSolved: [],
        domains: {},
        contestHistory: [],
        profileUrl: `https://www.hackerrank.com/profile/${username}`,
    };
}
/**
 * Main scraper function – use this in your aggregator.
 *
 * Example:
 *   const data = await scrapeHackerRank("MANISH_BEESA");
 */
async function scrapeHackerRank(username) {
    const base = `/${encodeURIComponent(username)}`;
    // Start with empty structure so even on partial failures we return something
    const result = getEmptyResult(username);
    try {
        // Hit all useful endpoints in parallel
        const [profileRes, badgesRes, certRes, scoresRes, contestsRes] = await Promise.allSettled([
            hackerRankClient.get(`${base}/profile`),
            hackerRankClient.get(`${base}/badges`),
            hackerRankClient.get(`${base}/certificates`),
            hackerRankClient.get(`${base}/scores`),
            hackerRankClient.get(`${base}/contest_participation`),
        ]);
        // PROFILE
        if (profileRes.status === "fulfilled") {
            const profileData = profileRes.value.data?.model || {};
            result.fullName = profileData.name ?? null;
            result.country = profileData.country ?? null;
            // HackerRank normally exposes solved challenge count & contest info on profile
            result.problemsSolved = Number(profileData.solved_challenges || 0);
            result.contestsParticipated = Number(profileData.contests || 0);
        }
        // BADGES
        if (badgesRes.status === "fulfilled") {
            const rawBadges = badgesRes.value.data?.models || [];
            result.badges = rawBadges.map((b) => ({
                name: b.badge_name || b.name || "Unknown",
                level: b.star_level ?? b.level ?? null,
            }));
            result.badgesCount = result.badges.length;
        }
        // CERTIFICATES
        if (certRes.status === "fulfilled") {
            const rawCerts = certRes.value.data?.models || [];
            result.certificatesCount = rawCerts.length;
            // If in future you want to expose certs, extend HackerRankScrapeResult
        }
        // DOMAIN SCORES - Enhanced with domain-wise solved counts
        if (scoresRes.status === "fulfilled") {
            const rawScores = scoresRes.value.data?.models || [];
            const domains = {};
            const domainWiseSolved = [];
            for (const s of rawScores) {
                const domainName = s.domain || s.name;
                const scoreVal = Number(s.score || 0);
                const solvedCount = Number(s.solved || s.challenges_solved || 0);
                const totalCount = s.total_challenges ? Number(s.total_challenges) : null;
                if (domainName) {
                    domains[domainName] = scoreVal;
                    domainWiseSolved.push({
                        domain: domainName,
                        solved: solvedCount || Math.round(scoreVal / 10), // Estimate if not available
                        total: totalCount,
                        score: scoreVal,
                    });
                }
            }
            result.domains = domains;
            result.domainWiseSolved = domainWiseSolved;
        }
        // CONTEST PARTICIPATION
        if (contestsRes.status === "fulfilled") {
            const rawContests = contestsRes.value.data?.models || [];
            result.contestHistory = rawContests.map((c) => ({
                contestName: c.contest_name || c.name || "Unknown Contest",
                contestSlug: c.contest_slug || c.slug || "",
                rank: c.rank ? Number(c.rank) : null,
                score: c.score ? Number(c.score) : null,
                date: c.ended_at || c.date || null,
            }));
            // Update contests participated count if we got it from this endpoint
            if (result.contestHistory.length > result.contestsParticipated) {
                result.contestsParticipated = result.contestHistory.length;
            }
        }
        return result;
    }
    catch (err) {
        console.error(`[HackerRank] Failed for ${username}:`, err?.message || err?.toString());
        // Even on full failure, return a consistent shape
        return result;
    }
}
/**
 * Alias to match any existing imports you might already have.
 * (Some files may already be importing scrapeHackerrank.)
 */
exports.scrapeHackerrank = scrapeHackerRank;
exports.default = scrapeHackerRank;
