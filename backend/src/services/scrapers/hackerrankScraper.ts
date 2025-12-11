// src/services/scrapers/hackerrank.ts

import axios, { AxiosInstance } from "axios";

export type HackerRankBadge = {
  name: string;
  level: number | string | null;
};

export interface HackerRankScrapeResult {
  username: string;
  fullName: string | null;
  country: string | null;
  problemsSolved: number;
  contestsParticipated: number;
  badgesCount: number;
  certificatesCount: number;
  badges: HackerRankBadge[];
  domains: Record<string, number>; // you said you don't need scores now – you can ignore this
  profileUrl: string;
}

/**
 * Shared axios client for HackerRank REST endpoints.
 * These endpoints are public for most profiles.
 */
const hackerRankClient: AxiosInstance = axios.create({
  baseURL: "https://www.hackerrank.com/rest/hackers",
  timeout: 12000,
  headers: {
    // Basic UA to avoid some dumb bot blocks
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
  },
});

/**
 * Default empty result – used when profile is private / not found / API fails.
 */
function getEmptyResult(username: string): HackerRankScrapeResult {
  return {
    username,
    fullName: null,
    country: null,
    problemsSolved: 0,
    contestsParticipated: 0,
    badgesCount: 0,
    certificatesCount: 0,
    badges: [],
    domains: {},
    profileUrl: `https://www.hackerrank.com/profile/${username}`,
  };
}

/**
 * Main scraper function – use this in your aggregator.
 *
 * Example:
 *   const data = await scrapeHackerRank("MANISH_BEESA");
 */
export async function scrapeHackerRank(
  username: string
): Promise<HackerRankScrapeResult> {
  const base = `/${encodeURIComponent(username)}`;

  // Start with empty structure so even on partial failures we return something
  const result: HackerRankScrapeResult = getEmptyResult(username);

  try {
    // Hit all useful endpoints in parallel
    const [profileRes, badgesRes, certRes, scoresRes] = await Promise.allSettled(
      [
        hackerRankClient.get(`${base}/profile`),
        hackerRankClient.get(`${base}/badges`),
        hackerRankClient.get(`${base}/certificates`),
        hackerRankClient.get(`${base}/scores`),
      ]
    );

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
      result.badges = rawBadges.map((b: any) => ({
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

    // DOMAIN SCORES (optional for you – you said you don't need them now)
    if (scoresRes.status === "fulfilled") {
      const rawScores = scoresRes.value.data?.models || [];
      const domains: Record<string, number> = {};

      for (const s of rawScores) {
        const domainName = s.domain || s.name;
        const scoreVal = Number(s.score || 0);
        if (domainName) {
          domains[domainName] = scoreVal;
        }
      }
      result.domains = domains;
    }

    return result;
  } catch (err: any) {
    console.error(
      `[HackerRank] Failed for ${username}:`,
      err?.message || err?.toString()
    );
    // Even on full failure, return a consistent shape
    return result;
  }
}

/**
 * Alias to match any existing imports you might already have.
 * (Some files may already be importing scrapeHackerrank.)
 */
export const scrapeHackerrank = scrapeHackerRank;
export default scrapeHackerRank;
