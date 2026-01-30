"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeCodeChef = scrapeCodeChef;
// src/services/scrapers/codechefScraper.ts
const axios_1 = __importDefault(require("axios"));
const CODECHEF_BASE = "https://www.codechef.com";
function extractNumber(text) {
    if (!text)
        return null;
    const cleaned = text.replace(/,/g, "");
    const m = cleaned.match(/-?\d+/);
    return m ? parseInt(m[0], 10) : null;
}
function matchGroup(html, regex) {
    const m = regex.exec(html);
    return m && m[1] ? m[1].trim() : null;
}
async function scrapeCodeChef(username) {
    if (!username)
        throw new Error("scrapeCodeChef: username is required");
    username = username.trim();
    const profileUrl = `${CODECHEF_BASE}/users/${encodeURIComponent(username)}`;
    const res = await axios_1.default.get(profileUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            Referer: CODECHEF_BASE,
        },
    });
    const html = res.data;
    // --- Rating & ranks ---
    const currentRatingText = matchGroup(html, /class="rating-number"[^>]*>([^<]+)</i);
    const currentRating = extractNumber(currentRatingText);
    const highestRatingText = matchGroup(html, /Highest\s*Rating[^0-9]*([0-9,]+)/i);
    const highestRating = extractNumber(highestRatingText);
    const globalRankText = matchGroup(html, /Global\s*Rank[^0-9]*([0-9,]+)/i);
    const globalRank = extractNumber(globalRankText);
    const countryRankText = matchGroup(html, /Country\s*Rank[^0-9]*([0-9,]+)/i);
    const countryRank = extractNumber(countryRankText);
    // --- Stars ---
    // Pattern like: "Username:3★rudra0200"
    let stars = null;
    const starsFromUsername = matchGroup(html, /Username:\s*([0-9]+)\s*★/i);
    if (starsFromUsername) {
        stars = extractNumber(starsFromUsername);
    }
    else {
        // Fallback: count consecutive "★" somewhere (e.g. "★★★")
        const starsBlock = html.match(/★+/);
        if (starsBlock && starsBlock[0]) {
            stars = starsBlock[0].replace(/[^★]/g, "").length || null;
        }
    }
    // --- Division ---
    // New UI: "(Div 2)"
    // Old UI: "Division 3"
    let division = null;
    const divisionFull = matchGroup(html, /(Division\s*[1-4])/i);
    const divisionShortDigit = matchGroup(html, /\(Div\s*([1-4])\)/i);
    if (divisionFull) {
        division = divisionFull;
    }
    else if (divisionShortDigit) {
        division = `Div ${divisionShortDigit}`;
    }
    else {
        division = null;
    }
    // --- Problems solved ---
    // New UI text: "Total Problems Solved: 27"
    const totalSolvedText = matchGroup(html, /Total\s*Problems\s*Solved:\s*([0-9]+)/i);
    const totalSolved = extractNumber(totalSolvedText) ?? 0;
    // Old UI: "Fully Solved (126)" – keep as fallback in case it exists
    const fullyTotalText = matchGroup(html, /Fully\s*Solved\s*\((\d+)\)/i);
    const fullyTotalFromOld = extractNumber(fullyTotalText);
    // Prefer new total problems solved; if 0 and old exists, use old
    const fullyTotal = totalSolved > 0 ? totalSolved : fullyTotalFromOld ?? 0;
    // Partially Solved (if present)
    const partialTotalText = matchGroup(html, /Partially\s*Solved\s*\((\d+)\)/i);
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
    const difficultyRegex = /(School|Easy|Medium|Hard|Challenge|Peer)\s*\((\d+)\)/gi;
    let md;
    while ((md = difficultyRegex.exec(html)) !== null) {
        const cat = md[1];
        const count = parseInt(md[2], 10) || 0;
        // @ts-ignore – mapping by name
        difficultySolved[cat] = count;
    }
    // --- Contest History & Rating Graph ---
    const contestHistory = [];
    const ratingGraph = [];
    // Try to extract rating data from embedded JavaScript
    // CodeChef embeds rating data in a JavaScript variable like: var all_rating = [{...}, {...}];
    const ratingDataMatch = html.match(/var\s+all_rating\s*=\s*(\[[\s\S]*?\]);/);
    if (ratingDataMatch) {
        try {
            const ratingData = JSON.parse(ratingDataMatch[1]);
            let prevRating = 0;
            for (const entry of ratingData) {
                const rating = parseInt(entry.rating, 10) || 0;
                const rank = parseInt(entry.rank, 10) || 0;
                const ratingChange = prevRating > 0 ? rating - prevRating : 0;
                contestHistory.push({
                    contestCode: entry.code || entry.name || "",
                    contestName: entry.name || entry.code || "",
                    rank: rank,
                    rating: rating,
                    ratingChange: ratingChange,
                    date: entry.end_date || null,
                });
                ratingGraph.push({
                    contestCode: entry.code || entry.name || "",
                    rating: rating,
                    rank: rank,
                    date: entry.end_date || "",
                });
                prevRating = rating;
            }
        }
        catch (e) {
            console.error("[CodeChef] Failed to parse rating data:", e);
        }
    }
    // --- Recent Submissions ---
    const recentSubmissions = [];
    // Try to fetch recent submissions from user's submissions page
    try {
        const submissionsUrl = `${CODECHEF_BASE}/users/${encodeURIComponent(username)}?tab=submissions`;
        const subRes = await axios_1.default.get(submissionsUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        });
        const subHtml = subRes.data;
        // Extract submissions from table rows
        const submissionRowRegex = /<tr[^>]*class="[^"]*kol[^"]*"[^>]*>[\s\S]*?<\/tr>/gi;
        const rows = subHtml.match(submissionRowRegex) || [];
        for (const row of rows.slice(0, 20)) {
            const problemMatch = row.match(/href="\/problems\/([^"]+)"[^>]*>([^<]+)</i);
            const resultMatch = row.match(/(accepted|wrong|partially|time limit|runtime|compilation)/i);
            const langMatch = row.match(/<span[^>]*class="[^"]*language[^"]*"[^>]*>([^<]+)</i) ||
                row.match(/C\+\+|Python|Java|JavaScript|C#|Ruby|Go|Rust|Kotlin/i);
            const dateMatch = row.match(/(\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2})/);
            if (problemMatch) {
                recentSubmissions.push({
                    problemCode: problemMatch[1],
                    problemName: problemMatch[2].trim(),
                    result: resultMatch ? resultMatch[1] : "Unknown",
                    language: langMatch ? (Array.isArray(langMatch) ? langMatch[1] || langMatch[0] : langMatch[0]) : "Unknown",
                    date: dateMatch ? dateMatch[1] : null,
                });
            }
        }
    }
    catch (e) {
        console.error("[CodeChef] Failed to fetch submissions:", e);
    }
    // --- Language Statistics ---
    const languageStats = {};
    // Try to extract language stats from the profile page
    const langStatsMatch = html.match(/var\s+language_stats\s*=\s*(\{[\s\S]*?\});/) ||
        html.match(/language-stats[\s\S]*?(\{[\s\S]*?\})/);
    if (langStatsMatch) {
        try {
            const langData = JSON.parse(langStatsMatch[1]);
            for (const [lang, count] of Object.entries(langData)) {
                languageStats[lang] = typeof count === "number" ? count : parseInt(String(count), 10) || 0;
            }
        }
        catch (e) {
            // Fallback: extract from HTML directly
            const langRegex = /<span[^>]*>([A-Za-z+#]+)<\/span>\s*:\s*(\d+)/gi;
            let lm;
            while ((lm = langRegex.exec(html)) !== null) {
                languageStats[lm[1]] = parseInt(lm[2], 10) || 0;
            }
        }
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
        contestHistory,
        ratingGraph,
        recentSubmissions,
        languageStats,
        profileUrl,
    };
}
