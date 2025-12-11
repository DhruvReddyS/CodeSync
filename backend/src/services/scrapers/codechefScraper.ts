// src/services/scrapers/codechefScraper.ts
import axios from "axios";

const CODECHEF_BASE = "https://www.codechef.com";

export interface CodeChefStats {
  username: string;

  currentRating: number | null;
  highestRating: number | null;
  stars: number | null;
  division: string | null;
  globalRank: number | null;
  countryRank: number | null;

  fullySolved: {
    total: number;
    school: number;
    easy: number;
    medium: number;
    hard: number;
    challenge: number;
    peer: number;
  };

  partiallySolved: {
    total: number;
  };

  profileUrl: string;
}

function extractNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/,/g, "");
  const m = cleaned.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function matchGroup(html: string, regex: RegExp): string | null {
  const m = regex.exec(html);
  return m && m[1] ? m[1].trim() : null;
}

export async function scrapeCodeChef(username: string): Promise<CodeChefStats> {
  if (!username) throw new Error("scrapeCodeChef: username is required");
  username = username.trim();

  const profileUrl = `${CODECHEF_BASE}/users/${encodeURIComponent(username)}`;

  const res = await axios.get(profileUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: CODECHEF_BASE,
    },
  });

  const html = res.data as string;

  // --- Rating & ranks ---

  const currentRatingText = matchGroup(
    html,
    /class="rating-number"[^>]*>([^<]+)</i
  );
  const currentRating = extractNumber(currentRatingText);

  const highestRatingText = matchGroup(
    html,
    /Highest\s*Rating[^0-9]*([0-9,]+)/i
  );
  const highestRating = extractNumber(highestRatingText);

  const globalRankText = matchGroup(
    html,
    /Global\s*Rank[^0-9]*([0-9,]+)/i
  );
  const globalRank = extractNumber(globalRankText);

  const countryRankText = matchGroup(
    html,
    /Country\s*Rank[^0-9]*([0-9,]+)/i
  );
  const countryRank = extractNumber(countryRankText);

  // --- Stars ---

  // Pattern like: "Username:3★rudra0200"
  let stars: number | null = null;

  const starsFromUsername = matchGroup(
    html,
    /Username:\s*([0-9]+)\s*★/i
  );
  if (starsFromUsername) {
    stars = extractNumber(starsFromUsername);
  } else {
    // Fallback: count consecutive "★" somewhere (e.g. "★★★")
    const starsBlock = html.match(/★+/);
    if (starsBlock && starsBlock[0]) {
      stars = starsBlock[0].replace(/[^★]/g, "").length || null;
    }
  }

  // --- Division ---

  // New UI: "(Div 2)"
  // Old UI: "Division 3"
  let division: string | null = null;

  const divisionFull = matchGroup(html, /(Division\s*[1-4])/i);
  const divisionShortDigit = matchGroup(html, /\(Div\s*([1-4])\)/i);

  if (divisionFull) {
    division = divisionFull;
  } else if (divisionShortDigit) {
    division = `Div ${divisionShortDigit}`;
  } else {
    division = null;
  }

  // --- Problems solved ---

  // New UI text: "Total Problems Solved: 27"
  const totalSolvedText = matchGroup(
    html,
    /Total\s*Problems\s*Solved:\s*([0-9]+)/i
  );
  const totalSolved = extractNumber(totalSolvedText) ?? 0;

  // Old UI: "Fully Solved (126)" – keep as fallback in case it exists
  const fullyTotalText = matchGroup(
    html,
    /Fully\s*Solved\s*\((\d+)\)/i
  );
  const fullyTotalFromOld = extractNumber(fullyTotalText);

  // Prefer new total problems solved; if 0 and old exists, use old
  const fullyTotal =
    totalSolved > 0 ? totalSolved : fullyTotalFromOld ?? 0;

  // Partially Solved (if present)
  const partialTotalText = matchGroup(
    html,
    /Partially\s*Solved\s*\((\d+)\)/i
  );
  const partialTotal = extractNumber(partialTotalText) ?? 0;

  // Difficulty-wise inside "Fully Solved" (if old section exists)
  const difficultySolved = {
    School: 0,
    Easy: 0,
    Medium: 0,
    Hard: 0,
    Challenge: 0,
    Peer: 0,
  };

  const difficultyRegex =
    /(School|Easy|Medium|Hard|Challenge|Peer)\s*\((\d+)\)/gi;

  let md: RegExpExecArray | null;
  while ((md = difficultyRegex.exec(html)) !== null) {
    const cat = md[1];
    const count = parseInt(md[2], 10) || 0;
    // @ts-ignore – mapping by name
    difficultySolved[cat] = count;
  }

  return {
    username,
    currentRating,
    highestRating,
    stars,
    division,
    globalRank,
    countryRank,
    fullySolved: {
      total: fullyTotal,
      school: difficultySolved.School,
      easy: difficultySolved.Easy,
      medium: difficultySolved.Medium,
      hard: difficultySolved.Hard,
      challenge: difficultySolved.Challenge,
      peer: difficultySolved.Peer,
    },
    partiallySolved: {
      total: partialTotal,
    },
    profileUrl,
  };
}
