// src/services/scrapers/codeforcesScraper.ts
import axios from "axios";

const CF_API_BASE = "https://codeforces.com/api";

export interface CodeforcesStats {
  username: string;

  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  contribution: number | null;
  friendOfCount: number | null;

  contestsAttended: number;
  problemsSolved: number;

  languages: Record<string, number>;

  profileUrl: string;
}

async function cfGet<T = any>(path: string, params: Record<string, any>): Promise<T> {
  const res = await axios.get(`${CF_API_BASE}/${path}`, { params });

  if (res.data?.status !== "OK") {
    const comment = res.data?.comment || "Unknown Codeforces API error";
    throw new Error(`Codeforces API error [${path}]: ${comment}`);
  }

  return res.data.result as T;
}

export async function scrapeCodeforces(username: string): Promise<CodeforcesStats> {
  if (!username) {
    throw new Error("scrapeCodeforces: username is required");
  }

  username = username.trim();

  // 1) Basic user info
  const [user] = await cfGet<any[]>("user.info", { handles: username });

  // 2) Contest rating history
  const ratingChanges = await cfGet<any[]>("user.rating", { handle: username });

  // 3) Submissions (we take up to 10k recent submissions)
  const submissions = await cfGet<any[]>("user.status", {
    handle: username,
    from: 1,
    count: 10000,
  });

  const contestsAttended = ratingChanges.length;

  // --- Problems solved + language stats from submissions ---
  const solvedProblems = new Set<string>();
  const languages: Record<string, number> = {};

  for (const sub of submissions) {
    if (sub.verdict !== "OK") continue;

    const problem = sub.problem || {};
    let key: string;

    if (problem.contestId && problem.index) {
      key = `${problem.contestId}-${problem.index}`;
    } else if (problem.name) {
      key = `name-${problem.name}`;
    } else {
      continue;
    }

    solvedProblems.add(key);

    const lang = sub.programmingLanguage || "Unknown";
    languages[lang] = (languages[lang] || 0) + 1;
  }

  const problemsSolved = solvedProblems.size;

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

    languages,

    profileUrl: `https://codeforces.com/profile/${encodeURIComponent(username)}`,
  };
}
