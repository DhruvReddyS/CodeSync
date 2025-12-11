// src/services/scrapers/githubScraper.ts
import axios from "axios";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_WEB_BASE = "https://github.com";

export interface GitHubStats {
  username: string;

  totalStars: number;
  publicRepos: number;
  followers: number;

  topLanguages: Record<string, number>; // language -> repo count
  contributionsLastYear: number;
  currentStreak: number;
  longestStreak: number;

  profileUrl: string;
}

/**
 * Axios client with optional token for better rate limits.
 * If you set GITHUB_TOKEN in env, it will be used, else unauthenticated.
 */
function createGitHubClient() {
  const headers: Record<string, string> = {
    "User-Agent": "CodeSync-SDR/1.0",
    Accept: "application/vnd.github+json",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return axios.create({
    baseURL: GITHUB_API_BASE,
    headers,
  });
}

async function fetchUserProfile(username: string) {
  const client = createGitHubClient();
  const res = await client.get(`/users/${encodeURIComponent(username)}`);
  return res.data;
}

async function fetchUserRepos(username: string, perPage = 100) {
  const client = createGitHubClient();
  const res = await client.get(`/users/${encodeURIComponent(username)}/repos`, {
    params: {
      per_page: perPage,
      sort: "updated",
      direction: "desc",
    },
  });
  return res.data as any[];
}

/**
 * Fetch the contribution graph HTML & compute:
 * - contributionsLastYear
 * - currentStreak
 * - longestStreak
 */
async function fetchContributionStreaks(username: string): Promise<{
  contributionsLastYear: number;
  currentStreak: number;
  longestStreak: number;
}> {
  const url = `${GITHUB_WEB_BASE}/users/${encodeURIComponent(username)}/contributions`;

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: `${GITHUB_WEB_BASE}/${encodeURIComponent(username)}`,
      },
    });

    const html = res.data as string;

    // <rect ... data-date="2025-01-01" data-count="3" ...>
    const rectRegex =
      /<rect[^>]*data-date="([^"]+)"[^>]*data-count="([^"]+)"[^>]*>/g;

    const days: { date: string; count: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = rectRegex.exec(html)) !== null) {
      const date = m[1];
      const count = parseInt(m[2], 10) || 0;
      days.push({ date, count });
    }

    if (!days.length) {
      return {
        contributionsLastYear: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    // Sort by date just in case
    days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    let contributionsLastYear = 0;
    let longestStreak = 0;
    let currentStreak = 0;

    let prevDate: Date | null = null;
    let runningStreak = 0;

    for (const day of days) {
      contributionsLastYear += day.count;

      if (day.count > 0) {
        const currDate = new Date(day.date);
        if (!prevDate) {
          runningStreak = 1;
        } else {
          const diffDays =
            (currDate.getTime() - prevDate.getTime()) /
            (1000 * 60 * 60 * 24);

          if (diffDays === 1) {
            runningStreak += 1;
          } else {
            runningStreak = 1;
          }
        }
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
        prevDate = new Date(day.date);
      } else {
        // streak break
        runningStreak = 0;
        prevDate = new Date(day.date);
      }
    }

    currentStreak = runningStreak;

    return {
      contributionsLastYear,
      currentStreak,
      longestStreak,
    };
  } catch (err: any) {
    console.error("[GitHub] Failed to fetch contributions:", err?.message || err);
    return {
      contributionsLastYear: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
}

export async function scrapeGitHub(username: string): Promise<GitHubStats> {
  if (!username) {
    throw new Error("scrapeGitHub: username is required");
  }

  username = username.trim();

  const [profile, repos, streaks] = await Promise.all([
    fetchUserProfile(username),
    fetchUserRepos(username),
    fetchContributionStreaks(username),
  ]);

  // total stars & languages from repos
  let totalStars = 0;
  const topLanguages: Record<string, number> = {};

  for (const r of repos || []) {
    const stars = r.stargazers_count ?? 0;
    totalStars += stars;

    if (r.language) {
      topLanguages[r.language] = (topLanguages[r.language] || 0) + 1;
    }
  }

  return {
    username,

    totalStars,
    publicRepos: profile.public_repos ?? 0,
    followers: profile.followers ?? 0,

    topLanguages,
    contributionsLastYear: streaks.contributionsLastYear,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,

    profileUrl: `${GITHUB_WEB_BASE}/${encodeURIComponent(username)}`,
  };
}
