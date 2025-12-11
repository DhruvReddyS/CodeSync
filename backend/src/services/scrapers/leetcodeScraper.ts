// src/services/scrapers/leetcodeScraper.ts
import axios from "axios";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

export interface LeetCodeStats {
  username: string;

  // Problem solving
  totalSolved: number;
  solvedEasy: number;
  solvedMedium: number;
  solvedHard: number;

  // Contest performance
  contestRating: number | null;
  globalRanking: number | null;
  attendedContests: number | null;

  // Problems solved per language
  languages: Record<string, number>;

  // Number of profile badges
  badges: number;

  // Profile URL
  profileUrl: string;
}

async function lcQuery(operationName: string, variables: any, query: string) {
  const res = await axios.post(
    LEETCODE_GRAPHQL,
    { operationName, variables, query },
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: `https://leetcode.com/u/${variables.username}/`,
      },
    }
  );

  if (res.data?.errors?.length) {
    throw new Error(res.data.errors.map((e: any) => e.message).join("; "));
  }

  return res.data.data;
}

export async function scrapeLeetCode(username: string): Promise<LeetCodeStats> {
  if (!username) throw new Error("scrapeLeetCode: username is required");
  username = username.trim();

  const PROFILE_Q = `
    query profile($username: String!) {
      matchedUser(username: $username) {
        badges { id }
      }
    }
  `;

  const STATS_Q = `
    query stats($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  const LANG_Q = `
    query langs($username: String!) {
      matchedUser(username: $username) {
        languageProblemCount {
          languageName
          problemsSolved
        }
      }
    }
  `;

  const CONTEST_Q = `
    query contest($username: String!) {
      userContestRanking(username: $username) {
        rating
        globalRanking
        attendedContestsCount
      }
    }
  `;

  const [profile, stats, langs, contest] = await Promise.all([
    lcQuery("profile", { username }, PROFILE_Q),
    lcQuery("stats", { username }, STATS_Q),
    lcQuery("langs", { username }, LANG_Q),
    lcQuery("contest", { username }, CONTEST_Q).catch(() => null),
  ]);

  // --- solved problems by difficulty ---
  const arr =
    stats?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];

  const easy = arr.find((d: any) => d.difficulty === "Easy")?.count ?? 0;
  const medium = arr.find((d: any) => d.difficulty === "Medium")?.count ?? 0;
  const hard = arr.find((d: any) => d.difficulty === "Hard")?.count ?? 0;

  const totalSolved = easy + medium + hard;

  // --- languages ---
  const languages: Record<string, number> = {};
  for (const l of langs?.matchedUser?.languageProblemCount ?? []) {
    languages[l.languageName] = l.problemsSolved;
  }

  // --- badges ---
  const badgesCount = profile?.matchedUser?.badges?.length ?? 0;

  // --- contest info ---
  const c = contest?.userContestRanking;
  const contestRating = c?.rating ?? null;
  const globalRanking = c?.globalRanking ?? null;
  const attendedContests = c?.attendedContestsCount ?? null;

  return {
    username,
    totalSolved,
    solvedEasy: easy,
    solvedMedium: medium,
    solvedHard: hard,
    contestRating,
    globalRanking,
    attendedContests,
    languages,
    badges: badgesCount,
    profileUrl: `https://leetcode.com/u/${username}/`,
  };
}
