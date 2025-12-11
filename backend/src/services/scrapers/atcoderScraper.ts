import axios from "axios";

export interface AtcoderContest {
  contestName: string;
  date: string;
  rank: number | null;
  oldRating: number | null;
  newRating: number | null;
  performance: number | null;
}

export interface AtcoderStats {
  username: string;

  rating: number | null;
  highestRating: number | null;
  rank: number | null;
  ratedMatches: number | null;
  lastContest: string | null;
  title: string | null;

  contests: AtcoderContest[];
  totalContests: number;
  bestPerformance: number | null;
  peakRating: number | null;

  profileUrl: string;
}

function emptyStats(username: string): AtcoderStats {
  return {
    username,
    rating: null,
    highestRating: null,
    rank: null,
    ratedMatches: null,
    lastContest: null,
    title: null,

    contests: [],
    totalContests: 0,
    bestPerformance: null,
    peakRating: null,

    profileUrl: `https://atcoder.jp/users/${username}`,
  };
}

function parseNum(v: string | undefined | null) {
  if (!v) return null;
  const n = parseInt(v.replace(/,/g, ""), 10);
  return isNaN(n) ? null : n;
}

export async function scrapeAtcoder(username: string): Promise<AtcoderStats> {
  const stats = emptyStats(username);
  const url = `https://atcoder.jp/users/${username}`;

  try {
    // -----------------------
    // 1) SCRAPE MAIN PROFILE
    // -----------------------
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const html = String(res.data);

    // TITLE - handle Grandmaster formats and Dan/Kyu
    const titleMatch =
      html.match(/user-(?:[^"]+)">([\w\s]+?master)<\/span>/i) || // GM, LGM, Master
      html.match(/([0-9]+\s+(Dan|Kyu))/i);

    if (titleMatch) stats.title = titleMatch[1].trim();

    // RATING (inside colored span)
    const ratingMatch = html.match(/Rating[\s\S]*?<span[^>]*>([0-9,]+)/i);
    stats.rating = parseNum(ratingMatch?.[1]);

    // HIGHEST RATING
    const highMatch = html.match(/Highest Rating[\s\S]*?<span[^>]*>([0-9,]+)/i);
    stats.highestRating = parseNum(highMatch?.[1]);

    // RANK
    const rankMatch = html.match(/Rank[\s\S]*?<td[^>]*>([0-9,]+)/i);
    stats.rank = parseNum(rankMatch?.[1]);

    // RATED MATCHES
    const rmMatch = html.match(/Rated Matches[\s\S]*?<td[^>]*>([0-9,]+)/i);
    stats.ratedMatches = parseNum(rmMatch?.[1]);

    // LAST CONTEST
    const lastMatch = html.match(/Last Competed[\s\S]*?<td[^>]*>([0-9/]+)/i);
    stats.lastContest = lastMatch?.[1] ?? null;

    // ------------------------------------
    // 2) SCRAPE CONTEST HISTORY (CSV DATA)
    // ------------------------------------
    const csvUrl = `https://atcoder.jp/users/${username}/history/csv`;

    const historyRes = await axios.get(csvUrl, { responseType: "text" });

    const rows = historyRes.data.trim().split("\n");
    rows.shift(); // remove header

    const contests: AtcoderContest[] = [];

    for (const row of rows) {
      const cols = row.split(",");

      const contestName = cols[1]?.trim();
      const date = cols[2]?.trim();
      const rank = parseNum(cols[3]);
      const performance = parseNum(cols[4]);
      const oldRating = parseNum(cols[5]);
      const newRating = parseNum(cols[6]);

      contests.push({
        contestName,
        date,
        rank,
        performance,
        oldRating,
        newRating,
      });
    }

    stats.contests = contests;
    stats.totalContests = contests.length;

    // BEST PERFORMANCE
    stats.bestPerformance = Math.max(
      ...contests.map((c) => c.performance || 0)
    );

    // PEAK RATING (from history / main)
    const maxRating = Math.max(
      stats.highestRating || 0,
      ...contests.map((c) => c.newRating || 0)
    );

    stats.peakRating = maxRating;

    return stats;
  } catch (err: any) {
    console.error("[ATCODER ERROR]", err.message);
    return stats;
  }
}
