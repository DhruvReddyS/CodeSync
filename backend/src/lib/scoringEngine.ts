// src/lib/scoringEngine.ts

// ------------------------------
// Platforms + shared types
// ------------------------------

export type PlatformId =
  | "leetcode"
  | "codechef"
  | "codeforces"
  | "atcoder"
  | "hackerrank"
  | "github";

export type BadgeLevel = "bronze" | "silver" | "gold" | "legendary" | "unknown";

export interface Badge {
  name: string;
  level?: BadgeLevel;
}

export interface Certificate {
  name: string;
}

// Normalized stats per platform (what scrapers + Firestore store)
export interface PlatformStats {
  platform: PlatformId;

  // Identity (optional – not used in scoring directly)
  handle?: string;
  displayName?: string;
  profileUrl?: string;

  // Problems
  problemsSolvedTotal?: number;
  problemsSolvedByDifficulty?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };

  // Ratings / numeric scores
  rating?: number; // Contest-style rating (CF, CC, AC, LC)
  maxRating?: number;
  score?: number; // Generic score, if any platform exposes one

  // Contests
  contestsParticipated?: number;

  // Achievements
  badges?: Badge[];
  certificates?: Certificate[];
  stars?: number; // CodeChef stars

  // Platform-specific extras
  fullySolved?: number; // CodeChef
  partiallySolved?: number;

  domainScores?: Record<string, number>; // HackerRank domain scores

  // GitHub specific
  contributionsLastYear?: number;
  publicRepos?: number;
  starsReceived?: number;
}

// Internal signals (0..1)
interface Signals {
  P: number; // Problem solving signal
  R: number; // Rating / score signal
  C: number; // Contest participation signal
  A: number; // Achievement signal (badges, certs, stars…)
  D: number; // Dev contribution signal (mainly GitHub)
}

// Result for a single platform
export interface PlatformSkill {
  platform: PlatformId;
  skill: number; // 0..100
}

// For progress comparisons (optional snapshots over time)
export interface Snapshot {
  timestamp: string; // ISO string
  platformSkills: PlatformSkill[];
  codeSyncScore: number; // 0..100
}

// ------------------------------
// Helper functions
// ------------------------------

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Log-based normalization for large ranges (problems solved, contributions, etc.)
function logScale(x: number, base: number = 10): number {
  if (!x || x <= 0) return 0;
  return Math.log(x + 1) / Math.log(base + 1); // ~0..1 for "reasonable" x
}

// Normalize rating/score to 0..1 given expected range
function normalizeRating(
  rating: number | undefined,
  min: number,
  max: number
): number {
  if (rating == null) return 0;
  return clamp01((rating - min) / (max - min));
}

// Normalize a count so:
// 0 → 0, good → ~0.7, excellent → 1
function normalizeCount(
  count: number | undefined,
  good: number,
  excellent: number
): number {
  if (!count || count <= 0) return 0;
  if (count >= excellent) return 1;

  if (count >= good) {
    return 0.7 + 0.3 * ((count - good) / (excellent - good));
  }

  // below "good"
  return 0.7 * (count / good);
}

// Badge weighting
function badgePoints(badge: Badge): number {
  switch (badge.level) {
    case "bronze":
      return 1;
    case "silver":
      return 2;
    case "gold":
      return 3;
    case "legendary":
      return 4;
    default:
      return 1; // unknown → treat as bronze
  }
}

// ------------------------------
// Signal computations (P, R, C, A, D)
// ------------------------------

// Problem signal P
function computeProblemSignal(stats: PlatformStats): number {
  const { platform } = stats;
  const difficulty = stats.problemsSolvedByDifficulty;

  const hasDifficulty =
    difficulty &&
    (difficulty.easy != null ||
      difficulty.medium != null ||
      difficulty.hard != null);

  const easy = difficulty?.easy ?? 0;
  const medium = difficulty?.medium ?? 0;
  const hard = difficulty?.hard ?? 0;

  const solvedFromDifficulty = easy + medium + hard;
  const totalSolved =
    stats.problemsSolvedTotal ??
    (solvedFromDifficulty > 0 ? solvedFromDifficulty : 0);

  // Platforms where difficulty is trusted / available (LeetCode)
  if (platform === "leetcode") {
    const pRaw = 1 * easy + 2 * medium + 3 * hard;
    return clamp01(logScale(pRaw, 200)); // 0..1
  }

  // If difficulty exists but we don't fully trust it → slightly lower weight
  if (hasDifficulty) {
    const pRaw = 1 * easy + 2 * medium + 3 * hard;
    return 0.7 * clamp01(logScale(pRaw, 200));
  }

  // No difficulty info → rely on total solved, but downweighted
  const solved = totalSolved ?? 0;
  return 0.7 * clamp01(logScale(solved, 300));
}

// Rating / score signal R
function computeRatingSignal(stats: PlatformStats): number {
  const { platform, rating, score, domainScores } = stats;

  switch (platform) {
    case "codeforces":
    case "codechef":
    case "atcoder":
    case "leetcode": {
      // Elo-like rating: expect ~800–2600 range
      return normalizeRating(rating, 800, 2600);
    }

    case "hackerrank": {
      // No single rating; use sum of domain scores as proxy
      const sumDomain =
        domainScores &&
        Object.values(domainScores).reduce((sum, v) => sum + (v ?? 0), 0);

      return normalizeRating(sumDomain ?? 0, 0, 3000);
    }

    case "github": {
      // No competitive rating
      return 0;
    }

    default:
      // fallback if some platform exposes raw score
      return normalizeRating(score ?? 0, 0, 1000);
  }
}

// Contest signal C
function computeContestSignal(stats: PlatformStats): number {
  const { contestsParticipated } = stats;
  if (!contestsParticipated || contestsParticipated <= 0) return 0;

  // Good = 15 contests, excellent = 50
  return normalizeCount(contestsParticipated, 15, 50);
}

// Achievement signal A (badges, certs, stars…)
function computeAchievementSignal(stats: PlatformStats): number {
  const { badges, certificates, stars, platform } = stats;

  let raw = 0;

  // Badges
  if (badges && badges.length > 0) {
    raw += badges.reduce((sum, badge) => sum + badgePoints(badge), 0);
  }

  // Certificates
  if (certificates && certificates.length > 0) {
    raw += certificates.length * 3; // each cert = 3 pts baseline
  }

  // CodeChef stars as achievement
  if (platform === "codechef" && stars && stars > 0) {
    raw += stars * 2; // e.g., 4★ = +8 pts
  }

  // 10 pts → "good" (0.7), 30 pts → "excellent" (1)
  return normalizeCount(raw, 10, 30);
}

// Dev contribution signal D (GitHub)
function computeDevSignal(stats: PlatformStats): number {
  const { platform, contributionsLastYear, publicRepos, starsReceived } = stats;

  if (platform !== "github") return 0;

  const contribScore = logScale(contributionsLastYear ?? 0, 400); // 0..1-ish
  const repoScore = normalizeCount(publicRepos ?? 0, 10, 40);
  const starScore = normalizeCount(starsReceived ?? 0, 20, 100);

  const dRaw = 0.5 * contribScore + 0.3 * repoScore + 0.2 * starScore;
  return clamp01(dRaw);
}

// Bundle all signals
function computeSignals(stats: PlatformStats): Signals {
  return {
    P: computeProblemSignal(stats),
    R: computeRatingSignal(stats),
    C: computeContestSignal(stats),
    A: computeAchievementSignal(stats),
    D: computeDevSignal(stats),
  };
}

// ------------------------------
// Combine signals → Skill (0..100)
// ------------------------------

function combineSignalsToSkill(platform: PlatformId, s: Signals): number {
  const { P, R, C, A, D } = s;

  let skillRaw = 0;

  switch (platform) {
    case "leetcode":
      // Good difficulty + rating + contests + badges
      skillRaw = 0.35 * P + 0.35 * R + 0.20 * C + 0.10 * A;
      break;

    case "codeforces":
    case "codechef":
    case "atcoder":
      // Strong rating platforms; P downweighted (no official difficulty)
      skillRaw = 0.20 * P + 0.50 * R + 0.25 * C + 0.05 * A;
      break;

    case "hackerrank":
      // Badge + domain-score heavy, less on problems
      skillRaw = 0.15 * P + 0.35 * R + 0.50 * A;
      break;

    case "github":
      // Dev profile: contributions dominate
      skillRaw = 0.70 * D + 0.10 * A + 0.10 * P + 0.10 * R;
      break;

    default:
      skillRaw = 0;
  }

  return clamp01(skillRaw) * 100; // 0..100
}

// Public: compute skill for one platform
export function computePlatformSkill(stats: PlatformStats): PlatformSkill {
  const signals = computeSignals(stats);
  const skill = combineSignalsToSkill(stats.platform, signals);
  return { platform: stats.platform, skill };
}

// ------------------------------
// Aggregate across platforms → CodeSync score
// ------------------------------

function defaultPlatformSkillMap(): Record<PlatformId, number> {
  return {
    leetcode: 0,
    codechef: 0,
    codeforces: 0,
    atcoder: 0,
    hackerrank: 0,
    github: 0,
  };
}

export function computeCodeSyncScore(skills: PlatformSkill[]): number {
  if (skills.length === 0) return 0;

  const values = skills.map((s) => s.skill).sort((a, b) => b - a);
  const maxSkill = values[0];

  if (values.length === 1) {
    return clamp01(maxSkill / 100) * 100;
  }

  const others = values.slice(1);
  const avgOthers = others.reduce((sum, v) => sum + v, 0) / others.length;

  // core formula: strong main platform + some multi-platform bonus
  const score = maxSkill + 0.3 * avgOthers;
  return clamp01(score / 100) * 100; // keep in 0..100
}

// For UI: nice 0..1000 score
export function computeCodeSyncDisplayScore(skills: PlatformSkill[]): number {
  const s = computeCodeSyncScore(skills); // 0..100
  return Math.round(s * 10); // 0..1000
}

// ------------------------------
// Progress / delta over time
// ------------------------------

function toSkillMap(skills: PlatformSkill[]): Record<PlatformId, number> {
  const map = defaultPlatformSkillMap();
  for (const s of skills) {
    map[s.platform] = s.skill;
  }
  return map;
}

export interface SkillDeltaResult {
  perPlatformDelta: Record<PlatformId, number>;
  totalDelta: number;
}

export function computeSkillDelta(
  prevSkills: PlatformSkill[],
  currentSkills: PlatformSkill[]
): SkillDeltaResult {
  const prevMap = toSkillMap(prevSkills);
  const currMap = toSkillMap(currentSkills);

  const deltas = defaultPlatformSkillMap();
  let totalDelta = 0;

  (Object.keys(currMap) as PlatformId[]).forEach((platform) => {
    const diff = currMap[platform] - (prevMap[platform] ?? 0);
    const positive = diff > 0 ? diff : 0;
    deltas[platform] = positive;
    totalDelta += positive;
  });

  return { perPlatformDelta: deltas, totalDelta };
}
