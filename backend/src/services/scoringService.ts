// src/services/scoringService.ts

import admin from "firebase-admin";
import { PlatformId } from "../lib/scoringEngine";

const db = admin.firestore();
const usersCol = db.collection("users");

export interface UserCPScores {
  platformSkills: Record<PlatformId, number>;
  codeSyncScore: number;        // final scaled score
  displayScore: number;         // same as codeSyncScore (rounded)
  totalProblemsSolved: number;  // across all platforms
  lastUpdated: FirebaseFirestore.Timestamp;
}

// Generic shape for a platform stats document.
// We keep this super loose to avoid type errors.
type PlatformStats = {
  platform?: PlatformId | string;
  problemsSolvedTotal?: number;

  // CodeChef specific
  fullySolved?: { total?: number } | number;
  partiallySolved?: { total?: number } | number;

  // Common rating / contest fields
  rating?: number;
  contestRating?: number;
  contestsParticipated?: number;
  contestsAttended?: number;
  totalSolved?: number;
  problemsSolved?: number;

  // HackerRank
  badgesCount?: number;
  badges?: any[];
  certificatesCount?: number;
  certificates?: any[];

  // GitHub
  contributionsLastYear?: number;
  totalStars?: number;
  starsReceived?: number;
  publicRepos?: number;
  followers?: number;

  // AtCoder
  totalContests?: number;
  ratedMatches?: number;

  // Allow any other field
  [key: string]: any;
};

/* --------------------------------------------------
 * SMALL HELPERS
 * -------------------------------------------------- */

function n(val: any): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const parsed = Number(val);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/* --------------------------------------------------
 * Load all cpProfiles for a user (instructors/admins)
 *  -> users/{userId}/cpProfiles/*
 * -------------------------------------------------- */
async function getUserPlatformStats(userId: string): Promise<PlatformStats[]> {
  const snap = await usersCol.doc(userId).collection("cpProfiles").get();
  if (snap.empty) return [];

  const result: PlatformStats[] = [];
  snap.forEach((doc) => {
    const data = (doc.data() || {}) as PlatformStats;
    if (!data.platform) {
      // fallback: use doc id as platform if not stored
      data.platform = doc.id as PlatformId;
    }
    result.push(data);
  });

  return result;
}

/* --------------------------------------------------
 * Estimate "total problems solved" for analytics
 * -------------------------------------------------- */
function estimateProblemsSolved(stats: PlatformStats): number {
  if (typeof stats.problemsSolvedTotal === "number") {
    return stats.problemsSolvedTotal;
  }
  if (typeof stats.totalSolved === "number") {
    return stats.totalSolved;
  }
  if (typeof stats.problemsSolved === "number") {
    return stats.problemsSolved;
  }

  // CodeChef fallback
  if (stats.platform === "codechef") {
    let fully = 0;
    if (typeof stats.fullySolved === "number") {
      fully = n(stats.fullySolved);
    } else if (stats.fullySolved && typeof stats.fullySolved === "object") {
      fully = n(stats.fullySolved.total);
    }

    let partial = 0;
    if (typeof stats.partiallySolved === "number") {
      partial = n(stats.partiallySolved);
    } else if (stats.partiallySolved && typeof stats.partiallySolved === "object") {
      partial = n(stats.partiallySolved.total);
    }

    return fully + partial;
  }

  return 0;
}

/* --------------------------------------------------
 * NEW: Per-platform "skill" (score) for USERS
 * -------------------------------------------------- */
function computePlatformSkillFromStats(stats: PlatformStats): number {
  const platform = (stats.platform as PlatformId) || "leetcode";

  switch (platform) {
    case "leetcode": {
      const solved =
        n(stats.totalSolved) ||
        n(stats.problemsSolvedTotal);
      const rating = n(stats.contestRating ?? stats.rating);
      const contests =
        n(stats.attendedContests) ||
        n(stats.contestsParticipated);

      // 10 pts per solved, rating linear, small contest bonus
      return solved * 10 + rating * 1.0 + contests * 25;
    }

    case "codeforces": {
      const solved =
        n(stats.problemsSolvedTotal) ||
        n(stats.problemsSolved);
      const rating = n(stats.rating);
      const contests =
        n(stats.contestsAttended) ||
        n(stats.contestsParticipated);

      // CF is contest-heavy; slightly higher weights
      return solved * 12 + rating * 1.2 + contests * 40;
    }

    case "codechef": {
      let fully = 0;
      if (typeof stats.fullySolved === "number") {
        fully = n(stats.fullySolved);
      } else if (stats.fullySolved && typeof stats.fullySolved === "object") {
        fully = n(stats.fullySolved.total);
      }

      let partial = 0;
      if (typeof stats.partiallySolved === "number") {
        partial = n(stats.partiallySolved);
      } else if (stats.partiallySolved && typeof stats.partiallySolved === "object") {
        partial = n(stats.partiallySolved.total);
      }

      const rating = n(stats.currentRating ?? stats.rating);
      const contestsEst = clamp(Math.round(rating / 40), 0, 200);

      return fully * 12 + partial * 4 + rating * 1.0 + contestsEst * 30;
    }

    case "hackerrank": {
      const problems =
        n(stats.problemsSolved) ||
        n(stats.problemsSolvedTotal);
      const contests = n(stats.contestsParticipated);

      const badgesCount =
        n(stats.badgesCount) ||
        (Array.isArray(stats.badges) ? stats.badges.length : 0);

      const certificatesCount =
        n(stats.certificatesCount) ||
        (Array.isArray(stats.certificates) ? stats.certificates.length : 0);

      return (
        problems * 8 +
        contests * 20 +
        badgesCount * 40 +
        certificatesCount * 60
      );
    }

    case "github": {
      const contributions = n(stats.contributionsLastYear);
      const stars = n(stats.totalStars ?? stats.starsReceived);
      const repos = n(stats.publicRepos);
      const followers = n(stats.followers);

      // Dev experience / project bonus
      return (
        contributions * 2 +
        stars * 30 +
        repos * 10 +
        followers * 20
      );
    }

    case "atcoder": {
      const rating = n(stats.rating);
      const contests =
        n(stats.totalContests) ||
        n(stats.ratedMatches);
      const solved = n(stats.problemsSolvedTotal);

      // Close to rating + modest solved + contest bonus
      return solved * 8 + rating * 1.2 + contests * 35;
    }

    default:
      return 0;
  }
}

/* --------------------------------------------------
 * MAIN: recompute CP score for a "user" (instructors/admins)
 * -------------------------------------------------- */

export async function recomputeUserCPScore(
  userId: string
): Promise<UserCPScores> {
  // 1) Load cpProfiles from users/{userId}/cpProfiles
  const stats: PlatformStats[] = await getUserPlatformStats(userId);

  // 2) Build platformSkills map
  const platformSkills: Record<PlatformId, number> = {
    leetcode: 0,
    codechef: 0,
    codeforces: 0,
    atcoder: 0,
    hackerrank: 0,
    github: 0,
  };

  stats.forEach((s) => {
    const platform = (s.platform as PlatformId) || "leetcode";
    if (!platformSkills.hasOwnProperty(platform)) return;

    const skill = computePlatformSkillFromStats(s);
    platformSkills[platform] = skill;
  });

  // 3) Total CodeSync score = sum of platform skills
  const codeSyncScore = (Object.values(platformSkills) as number[]).reduce(
    (sum, v) => sum + (v || 0),
    0
  );

  const displayScore = Math.round(codeSyncScore);

  // 4) Aggregate total problems solved across platforms
  const totalProblemsSolved = stats.reduce(
    (sum, s) => sum + estimateProblemsSolved(s),
    0
  );

  // 5) Persist on user document
  const now = admin.firestore.Timestamp.now();
  const userRef = usersCol.doc(userId);

  await userRef.set(
    {
      cpScores: {
        platformSkills,
        codeSyncScore,
        displayScore,
        totalProblemsSolved,
        lastUpdated: now,
      },
    },
    { merge: true }
  );

  // 6) Optional snapshot history (for graphs later)
  const snapshotId = now.toMillis().toString();
  await userRef.collection("cpSnapshots").doc(snapshotId).set({
    timestamp: now,
    platformSkills,
    codeSyncScore,
    displayScore,
    totalProblemsSolved,
  });

  console.log(
    `📊 recomputeUserCPScore: user=${userId}, displayScore=${displayScore}, totalProblemsSolved=${totalProblemsSolved}, platforms=${stats.length}`
  );

  return {
    platformSkills,
    codeSyncScore,
    displayScore,
    totalProblemsSolved,
    lastUpdated: now,
  };
}
