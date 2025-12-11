// src/services/scrapers/index.ts
import {
  PlatformStats,
  PlatformId,
  Badge,
  BadgeLevel,
} from "../../lib/scoringEngine";

import { scrapeLeetCode, LeetCodeStats } from "./leetcodeScraper";
import { scrapeCodeChef, CodeChefStats } from "./codechefScraper";
import { scrapeCodeforces, CodeforcesStats } from "./codeforcesScraper";
import { scrapeAtcoder, AtcoderStats } from "./atcoderScraper";
import {
  scrapeHackerRank,
  HackerRankScrapeResult,
  HackerRankBadge,
} from "./hackerrankScraper";
import { scrapeGitHub, GitHubStats } from "./githubScraper";

export interface CpHandles {
  leetcode?: string;
  codechef?: string;
  codeforces?: string;
  atcoder?: string;
  hackerrank?: string;
  github?: string;
}

// ------------------------------
// Mapping helpers
// ------------------------------

function mapLeetCode(stats: LeetCodeStats): PlatformStats {
  const badges: Badge[] =
    stats.badges && stats.badges > 0
      ? Array.from({ length: stats.badges }).map((_, i) => ({
          name: `LC badge #${i + 1}`,
          level: "unknown" as BadgeLevel,
        }))
      : [];

  return {
    platform: "leetcode",
    handle: stats.username,
    profileUrl: stats.profileUrl,
    problemsSolvedTotal: stats.totalSolved ?? 0,
    problemsSolvedByDifficulty: {
      easy: stats.solvedEasy ?? 0,
      medium: stats.solvedMedium ?? 0,
      hard: stats.solvedHard ?? 0,
    },
    rating: stats.contestRating ?? undefined,
    contestsParticipated: stats.attendedContests ?? 0,
    badges,
  };
}

function mapCodeforces(stats: CodeforcesStats): PlatformStats {
  return {
    platform: "codeforces",
    handle: stats.username,
    profileUrl: stats.profileUrl,
    rating: stats.rating ?? undefined,
    maxRating: stats.maxRating ?? undefined,
    contestsParticipated: stats.contestsAttended ?? 0,
    problemsSolvedTotal: stats.problemsSolved ?? 0,
  };
}

function mapCodeChef(stats: CodeChefStats): PlatformStats {
  return {
    platform: "codechef",
    handle: stats.username,
    profileUrl: stats.profileUrl,
    rating: stats.currentRating ?? undefined,
    maxRating: stats.highestRating ?? undefined,
    stars: stats.stars ?? undefined,
    // We don't yet parse contest count from CodeChef summary page
    contestsParticipated: 0,
    fullySolved: stats.fullySolved?.total ?? 0,
    partiallySolved: stats.partiallySolved?.total ?? 0,
  };
}

function mapAtcoder(stats: AtcoderStats): PlatformStats {
  return {
    platform: "atcoder",
    handle: stats.username,
    profileUrl: stats.profileUrl,
    rating: stats.rating ?? undefined,
    maxRating: stats.highestRating ?? undefined,
    contestsParticipated: stats.ratedMatches ?? 0,
  };
}

function mapHackerRankBadgeLevel(level: number | string | null): BadgeLevel {
  if (typeof level === "string") {
    const lower = level.toLowerCase();
    if (lower.includes("gold")) return "gold";
    if (lower.includes("silver")) return "silver";
    if (lower.includes("bronze")) return "bronze";
    if (lower.includes("legend")) return "legendary";
    return "unknown";
  }

  if (typeof level === "number") {
    if (level >= 3) return "gold";
    if (level === 2) return "silver";
    if (level === 1) return "bronze";
    return "unknown";
  }

  return "unknown";
}

function mapHackerRank(stats: HackerRankScrapeResult): PlatformStats {
  const badges: Badge[] =
    stats.badges?.map((b: HackerRankBadge) => ({
      name: b.name,
      level: mapHackerRankBadgeLevel(b.level),
    })) ?? [];

  return {
    platform: "hackerrank",
    handle: stats.username,
    displayName: stats.fullName ?? undefined,
    profileUrl: stats.profileUrl,
    problemsSolvedTotal: stats.problemsSolved ?? 0,
    contestsParticipated: stats.contestsParticipated ?? 0,
    badges,
    domainScores: stats.domains ?? {},
  };
}

function mapGitHub(stats: GitHubStats): PlatformStats {
  return {
    platform: "github",
    handle: stats.username,
    profileUrl: stats.profileUrl,
    contributionsLastYear: stats.contributionsLastYear ?? 0,
    publicRepos: stats.publicRepos ?? 0,
    starsReceived: stats.totalStars ?? 0,
  };
}

// ------------------------------
// Public scraping helpers
// ------------------------------

export async function scrapePlatformForUser(
  platform: PlatformId,
  handle: string
): Promise<PlatformStats | null> {
  if (!handle) return null;

  try {
    switch (platform) {
      case "leetcode": {
        const raw = await scrapeLeetCode(handle);
        return raw ? mapLeetCode(raw) : null;
      }
      case "codeforces": {
        const raw = await scrapeCodeforces(handle);
        return raw ? mapCodeforces(raw) : null;
      }
      case "codechef": {
        const raw = await scrapeCodeChef(handle);
        return raw ? mapCodeChef(raw) : null;
      }
      case "atcoder": {
        const raw = await scrapeAtcoder(handle);
        return raw ? mapAtcoder(raw) : null;
      }
      case "hackerrank": {
        const raw = await scrapeHackerRank(handle);
        return raw ? mapHackerRank(raw) : null;
      }
      case "github": {
        const raw = await scrapeGitHub(handle);
        return raw ? mapGitHub(raw) : null;
      }
      default:
        return null;
    }
  } catch (err) {
    console.error(
      `[SCRAPER] Failed platform=${platform}, handle=${handle}:`,
      (err as any)?.message || err
    );
    return null;
  }
}

export async function scrapeAllPlatformsForUser(
  handles: CpHandles
): Promise<PlatformStats[]> {
  const jobs: Promise<PlatformStats | null>[] = [];

  if (handles.leetcode) {
    jobs.push(scrapePlatformForUser("leetcode", handles.leetcode));
  }
  if (handles.codechef) {
    jobs.push(scrapePlatformForUser("codechef", handles.codechef));
  }
  if (handles.codeforces) {
    jobs.push(scrapePlatformForUser("codeforces", handles.codeforces));
  }
  if (handles.atcoder) {
    jobs.push(scrapePlatformForUser("atcoder", handles.atcoder));
  }
  if (handles.hackerrank) {
    jobs.push(scrapePlatformForUser("hackerrank", handles.hackerrank));
  }
  if (handles.github) {
    jobs.push(scrapePlatformForUser("github", handles.github));
  }

  if (jobs.length === 0) {
    console.log("ℹ️ No CP handles provided, nothing to scrape.");
    return [];
  }

  const scraped = await Promise.all(jobs);
  return scraped.filter((s): s is PlatformStats => !!s);
}
