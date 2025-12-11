// src/services/scrapers/testScrapers.ts
//
// Universal scraper tester for selected platforms.
//
// Run from this folder:
//   npx ts-node testScrapers.ts <platform> <username>
//
// Examples:
//   npx ts-node testScrapers.ts hackerrank Rudra02
//   npx ts-node testScrapers.ts github mdecoder24
//   npx ts-node testScrapers.ts all

import { scrapeGitHub } from "./githubScraper";
import { scrapeLeetCode } from "./leetcodeScraper";
import { scrapeCodeforces } from "./codeforcesScraper";
import { scrapeCodeChef } from "./codechefScraper";
import { scrapeHackerRank } from "./hackerrankScraper";
import { scrapeAtcoder } from "./atcoderScraper";

type Platform =
  | "github"
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "hackerrank"
  | "atcoder";

type PlatformArg = Platform | "all";

const SUPPORTED: Platform[] = [
  "github",
  "leetcode",
  "codeforces",
  "codechef",
  "hackerrank",
  "atcoder",
];

// 👇 AUTO USERNAMES FOR "all"
const AUTO_USERNAMES: Record<Platform, string> = {
  github: "mdecoder24",
  leetcode: "Rudra0",
  codeforces: "krkushwant",
  codechef: "rudra0200",
  hackerrank: "Rudra02",
  atcoder: "ksun48",
};

function printUsage() {
  console.log(`
Usage:
  npx ts-node testScrapers.ts <platform> <username>

Platforms:
  github | leetcode | codeforces | codechef | hackerrank | atcoder | all

Examples:
  npx ts-node testScrapers.ts hackerrank Rudra02
  npx ts-node testScrapers.ts github mdecoder24
  npx ts-node testScrapers.ts all
`);
}

type RunStatus = "success" | "error";

interface RunResult {
  platform: Platform;
  username: string;
  status: RunStatus;
  stats?: any;
  error?: unknown;
}

/**
 * Rule B:
 * A result is considered "empty" if:
 *  - All numeric fields are 0
 *  - AND all non-meta (non username/profileUrl) fields are null/empty
 */
function isEmptyStats(stats: any): boolean {
  if (!stats || typeof stats !== "object") return true;

  let hasNonZeroNumber = false;
  let hasNonNullData = false;

  for (const key of Object.keys(stats)) {
    if (key === "username" || key === "profileUrl") continue;

    const value = (stats as any)[key];

    if (typeof value === "number") {
      if (value !== 0) {
        hasNonZeroNumber = true;
      }
    } else if (typeof value === "string") {
      if (value.trim() !== "") {
        hasNonNullData = true;
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        hasNonNullData = true;
      }
    } else if (value && typeof value === "object") {
      if (Object.keys(value).length > 0) {
        hasNonNullData = true;
      }
    }
  }

  // Empty if no non-zero numbers AND no non-null/real data
  return !hasNonZeroNumber && !hasNonNullData;
}

async function runOne(platform: Platform, username: string): Promise<RunResult> {
  const start = Date.now();

  console.log("======================================");
  console.log(`🔍 Testing [${platform}] scraper`);
  console.log(`👤 Username: ${username}`);
  console.log("======================================\n");

  try {
    let stats: unknown;

    switch (platform) {
      case "github":
        console.log(`➡️  Scraping GitHub for ${username} ...`);
        stats = await scrapeGitHub(username);
        break;
      case "leetcode":
        console.log(`➡️  Scraping LeetCode for ${username} ...`);
        stats = await scrapeLeetCode(username);
        break;
      case "codeforces":
        console.log(`➡️  Scraping Codeforces for ${username} ...`);
        stats = await scrapeCodeforces(username);
        break;
      case "codechef":
        console.log(`➡️  Scraping CodeChef for ${username} ...`);
        stats = await scrapeCodeChef(username);
        break;
      case "hackerrank":
        console.log(`➡️  Scraping HackerRank for ${username} ...`);
        stats = await scrapeHackerRank(username);
        break;
      case "atcoder":
        console.log(`➡️  Scraping AtCoder for ${username} ...`);
        stats = await scrapeAtcoder(username);
        break;
    }

    const elapsed = Date.now() - start;
    console.log();
    console.log("✅ SUCCESS");
    console.log(`⏱️  Time: ${elapsed} ms`);
    console.log();
    console.log(JSON.stringify(stats, null, 2));
    console.log();

    const empty = isEmptyStats(stats);
    if (empty) {
      console.log(`⚠️  [${platform}] looks EMPTY (all 0/null).`);
    } else {
      console.log(`💾 [${platform}] has REAL data.`);
    }
    console.log();

    return {
      platform,
      username,
      status: "success",
      stats,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error();
    console.error(`❌ ERROR while scraping [${platform}] for ${username}`);
    console.error(err);
    console.error(`⏱️  Time before failure: ${elapsed} ms`);
    console.error();

    return {
      platform,
      username,
      status: "error",
      error: err,
    };
  }
}

async function main() {
  const [, , platformArgRaw, username] = process.argv;

  if (!platformArgRaw) {
    printUsage();
    process.exit(1);
  }

  const platformArg = platformArgRaw.toLowerCase() as PlatformArg;

  // 🚀 AUTO MODE → run all scrapers with predefined usernames
  if (platformArg === "all") {
    console.log("🚀 Running ALL scrapers with AUTO usernames...\n");

    const results: RunResult[] = [];

    for (const p of SUPPORTED) {
      const user = AUTO_USERNAMES[p];
      // sequential for clean logs
      // eslint-disable-next-line no-await-in-loop
      const res = await runOne(p, user);
      results.push(res);
    }

    // 📊 SUMMARY
    let successfulNonEmpty = 0;
    let successfulEmpty = 0;
    let failed = 0;

    const emptyPlatforms: string[] = [];
    const nonEmptyPlatforms: string[] = [];
    const failedPlatforms: string[] = [];

    for (const r of results) {
      if (r.status === "error") {
        failed++;
        failedPlatforms.push(r.platform);
      } else {
        const empty = isEmptyStats(r.stats);
        if (empty) {
          successfulEmpty++;
          emptyPlatforms.push(r.platform);
        } else {
          successfulNonEmpty++;
          nonEmptyPlatforms.push(r.platform);
        }
      }
    }

    console.log("======================================");
    console.log("📊 SCRAPER SUMMARY (AUTO all)");
    console.log("======================================");
    console.log(`✅ Successful with data : ${successfulNonEmpty}`);
    console.log(`⚠️ Successful but EMPTY: ${successfulEmpty}`);
    console.log(`❌ Failed              : ${failed}`);
    console.log();

    if (nonEmptyPlatforms.length) {
      console.log("✅ Platforms with REAL data:");
      console.log("   - " + nonEmptyPlatforms.join(", "));
      console.log();
    }

    if (emptyPlatforms.length) {
      console.log("⚠️ Platforms that look EMPTY (all 0/null):");
      console.log("   - " + emptyPlatforms.join(", "));
      console.log();
    }

    if (failedPlatforms.length) {
      console.log("❌ Platforms that FAILED:");
      console.log("   - " + failedPlatforms.join(", "));
      console.log();
    }

    console.log("🏁 Done running all scrapers.");
    return;
  }

  // Normal single-platform mode
  if (!username) {
    console.error("❌ Missing username.");
    printUsage();
    process.exit(1);
  }

  if (!SUPPORTED.includes(platformArg as Platform)) {
    console.error(`❌ Unsupported platform: ${platformArgRaw}`);
    printUsage();
    process.exit(1);
  }

  await runOne(platformArg as Platform, username);
}

main().catch((err) => {
  console.error("❌ Unhandled error in testScrapers.ts");
  console.error(err);
  process.exit(1);
});
