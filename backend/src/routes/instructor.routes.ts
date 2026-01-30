import express, { Response } from "express";
import { collections } from "../models/collections";

import authMiddleware, { AuthedRequest } from "../middleware/auth.middleware";
import { requireInstructor } from "../middleware/role.middleware";

const router = express.Router();

type AuthedReq = AuthedRequest & {
  body: any;
  query: any;
  params: any;
};

type PlatformId =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "github"
  | "hackerrank"
  | "atcoder";

const PLATFORMS: PlatformId[] = [
  "leetcode",
  "codeforces",
  "codechef",
  "github",
  "hackerrank",
  "atcoder",
];

// Use centralized collection references
const { students: studentsCol, studentScores: studentScoresCol } = collections;

/* ----------------- utils ----------------- */

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}
function isNum(x: any) {
  return typeof x === "number" && Number.isFinite(x);
}
function toNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function safeStr(x: any) {
  return (x ?? "").toString();
}

/** ✅ Firestore Timestamp / ISO / millis -> ISO string */
function toISO(x: any): string | null {
  if (!x) return null;

  // Firestore Timestamp (admin)
  if (typeof x?.toDate === "function") {
    const d = x.toDate();
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // millis
  if (typeof x === "number") {
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // ISO string
  if (typeof x === "string") {
    const d = new Date(x);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Timestamp-like { seconds, nanoseconds }
  if (typeof x?.seconds === "number") {
    const d = new Date(x.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  return null;
}

function withinLastDays(isoOrMillisOrTs: any, days: number) {
  const iso = toISO(isoOrMillisOrTs);
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

/* ----------------- platform mapping ----------------- */

/** map raw platform doc -> 0..100 signal (bar) */
function computeSignal(platform: PlatformId, st: any | null): number {
  if (!st) return 0;

  switch (platform) {
    case "leetcode": {
      const solved = toNum(st.totalSolved ?? st.solved ?? st.problemsSolved, 0);
      return clamp(Math.log10(1 + solved) * 35);
    }
    case "codeforces": {
      const rating = toNum(st.rating ?? st.currentRating, 0);
      return clamp(((rating - 800) / 1400) * 100);
    }
    case "codechef": {
      const rating = toNum(st.rating ?? st.currentRating, 0);
      return clamp(((rating - 800) / 1200) * 100);
    }
    case "github": {
      const contrib = toNum(st.contributions ?? st.totalContributions, 0);
      return clamp(Math.log10(1 + contrib) * 40);
    }
    case "hackerrank": {
      const badges = toNum(st.badges ?? st.badgeCount, 0);
      const stars = toNum(st.stars, 0);
      return clamp(badges * 12 + stars * 10);
    }
    case "atcoder": {
      const rating = toNum(st.rating, 0);
      return clamp(((rating - 200) / 1800) * 100);
    }
    default:
      return 0;
  }
}

/** platform numbers to show (solved/rating/contrib etc) */
function computePlatformNumbers(platform: PlatformId, st: any | null) {
  if (!st) return null;

  if (platform === "leetcode") {
    return {
      solved: toNum(st.totalSolved ?? st.solved ?? st.problemsSolved, 0),
      easy: toNum(st.easySolved ?? st.easy, 0),
      medium: toNum(st.mediumSolved ?? st.medium, 0),
      hard: toNum(st.hardSolved ?? st.hard, 0),
      contestRating: toNum(st.contestRating ?? st.rating, 0),
    };
  }

  if (platform === "codeforces") {
    return {
      rating: toNum(st.rating ?? st.currentRating, 0),
      maxRating: toNum(st.maxRating, 0),
      rank: st.rank ?? null,
      contests: toNum(st.contests ?? st.contestsCount, 0),
    };
  }

  if (platform === "codechef") {
    return {
      rating: toNum(st.rating ?? st.currentRating, 0),
      stars: toNum(st.stars, 0),
      contests: toNum(st.contests ?? st.contestsCount, 0),
    };
  }

  if (platform === "github") {
    return {
      contributions: toNum(st.contributions ?? st.totalContributions, 0),
      publicRepos: toNum(st.publicRepos ?? st.repos, 0),
      followers: toNum(st.followers, 0),
    };
  }

  if (platform === "hackerrank") {
    return {
      badges: toNum(st.badges ?? st.badgeCount, 0),
      stars: toNum(st.stars, 0),
    };
  }

  if (platform === "atcoder") {
    return {
      rating: toNum(st.rating, 0),
      maxRating: toNum(st.maxRating, 0),
    };
  }

  return st;
}

/** Detailed breakdown (0..100) */
function computePlatformScoreBreakdown(platform: PlatformId, st: any | null) {
  if (!st) return { total: 0, parts: {} as Record<string, number> };

  switch (platform) {
    case "leetcode": {
      const solved = toNum(st.totalSolved ?? st.solved ?? st.problemsSolved, 0);
      const easy = toNum(st.easySolved ?? st.easy, 0);
      const medium = toNum(st.mediumSolved ?? st.medium, 0);
      const hard = toNum(st.hardSolved ?? st.hard, 0);
      const contestRating = toNum(st.contestRating ?? st.rating, 0);

      const solvedScore = clamp(Math.log10(1 + solved) * 25);
      const difficultyScore = clamp(easy * 0.2 + medium * 0.6 + hard * 1.2);
      const contestScore = clamp(((contestRating - 1200) / 1400) * 40);

      const total = clamp(solvedScore + difficultyScore + contestScore, 0, 100);
      return { total, parts: { solvedScore, difficultyScore, contestScore } };
    }

    case "codeforces": {
      const rating = toNum(st.rating ?? st.currentRating, 0);
      const maxRating = toNum(st.maxRating, 0);
      const contests = toNum(st.contests ?? st.contestsCount, 0);

      const ratingScore = clamp(((rating - 800) / 1400) * 70);
      const peakScore = clamp(((maxRating - 800) / 1400) * 20);
      const activityScore = clamp(Math.log10(1 + contests) * 15);

      const total = clamp(ratingScore + peakScore + activityScore, 0, 100);
      return { total, parts: { ratingScore, peakScore, activityScore } };
    }

    case "codechef": {
      const rating = toNum(st.rating ?? st.currentRating, 0);
      const stars = toNum(st.stars, 0);
      const contests = toNum(st.contests ?? st.contestsCount, 0);

      const ratingScore = clamp(((rating - 800) / 1200) * 75);
      const starsScore = clamp(stars * 12);
      const activityScore = clamp(Math.log10(1 + contests) * 12);

      const total = clamp(ratingScore + starsScore + activityScore, 0, 100);
      return { total, parts: { ratingScore, starsScore, activityScore } };
    }

    case "github": {
      const contrib = toNum(st.contributions ?? st.totalContributions, 0);
      const repos = toNum(st.publicRepos ?? st.repos, 0);
      const followers = toNum(st.followers, 0);

      const contribScore = clamp(Math.log10(1 + contrib) * 55);
      const reposScore = clamp(Math.log10(1 + repos) * 25);
      const followersScore = clamp(Math.log10(1 + followers) * 20);

      const total = clamp(contribScore + reposScore + followersScore, 0, 100);
      return { total, parts: { contribScore, reposScore, followersScore } };
    }

    case "hackerrank": {
      const badges = toNum(st.badges ?? st.badgeCount, 0);
      const stars = toNum(st.stars, 0);

      const badgesScore = clamp(badges * 14);
      const starsScore = clamp(stars * 18);

      const total = clamp(badgesScore + starsScore, 0, 100);
      return { total, parts: { badgesScore, starsScore } };
    }

    case "atcoder": {
      const rating = toNum(st.rating, 0);
      const maxRating = toNum(st.maxRating, 0);

      const ratingScore = clamp(((rating - 200) / 1800) * 80);
      const peakScore = clamp(((maxRating - 200) / 1800) * 20);

      const total = clamp(ratingScore + peakScore, 0, 100);
      return { total, parts: { ratingScore, peakScore } };
    }

    default:
      return { total: 0, parts: {} };
  }
}

/* --------------------------------------------------
 * Helper: load FULL cpProfiles
 * IMPORTANT: cpProfiles docs store { platform: "leetcode", ... }
 * -------------------------------------------------- */
async function loadPlatformStatsMap(
  studentId: string
): Promise<Record<PlatformId, any | null>> {
  const snap = await studentsCol.doc(studentId).collection("cpProfiles").get();

  const map: Record<PlatformId, any | null> = {
    leetcode: null,
    codechef: null,
    codeforces: null,
    atcoder: null,
    hackerrank: null,
    github: null,
  };

  snap.forEach((doc) => {
    const data = doc.data() as any;
    const platform = data.platform as PlatformId;
    if (platform && platform in map) {
      map[platform] = { ...data };
    }
  });

  return map;
}

/* ==================================================
 * ✅ GET /api/instructor/students
 * (InstructorStudentsPage grid) ✅ Instructor-only
 * ================================================== */
router.get(
  "/students",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const branch = (req.query.branch as string | undefined)?.trim();
      const section = (req.query.section as string | undefined)?.trim();
      const year = (req.query.year as string | undefined)?.trim();
      const q = (req.query.q as string | undefined)?.trim().toLowerCase();

      const rawLimit = (req.query.limit as string | undefined) ?? "500";
      const limit = Math.max(1, Math.min(1000, Number(rawLimit) || 500));

      let queryRef: FirebaseFirestore.Query = studentsCol;

      if (branch) queryRef = queryRef.where("branch", "==", branch);
      if (section) queryRef = queryRef.where("section", "==", section);
      if (year) queryRef = queryRef.where("yearOfStudy", "==", year);

      const snap = await queryRef.limit(limit).get();

      // ✅ Fetch scores from studentScores collection
      const students = await Promise.all(
        snap.docs.map(async (doc) => {
          const d = doc.data() || {};
          
          // Get scores from dedicated studentScores collection
          const scoresDoc = await studentScoresCol.doc(doc.id).get();
          const cpScores: any = scoresDoc.exists ? scoresDoc.data() : {};
          const score = isNum(cpScores?.displayScore)
            ? clamp(cpScores.displayScore)
            : 0;

          const lastActiveRaw =
            d.lastActiveAt ?? d.updatedAt ?? null;

          return {
            id: doc.id,
            name: d.fullName || d.fullname || d.name || "Unnamed",

            branch: d.branch ?? null,
            section: d.section ?? null,
            year: d.yearOfStudy ?? null, // ✅ Removed d.year fallback
            rollNumber: d.rollNumber ?? null,

            codesyncScore: score,
            activeThisWeek: withinLastDays(lastActiveRaw, 7),
            lastActiveAt: toISO(lastActiveRaw),

            email: d.collegeEmail ?? d.personalEmail ?? d.email ?? null,
            phone: d.phone ?? null,
          };
        })
      )
        .then((students) =>
          students
            .filter((s) => {
              if (!q) return true;
              const hay =
                `${s.name} ${s.id} ${s.rollNumber ?? ""} ${s.branch ?? ""} ${s.section ?? ""} ${s.year ?? ""}`.toLowerCase();
              return hay.includes(q);
            })
            .sort((a, b) => (b.codesyncScore ?? 0) - (a.codesyncScore ?? 0))
        );

      return res.json({
        students,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[INSTRUCTOR /students] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load students" });
    }
  }
);

/* ==================================================
 * ✅ GET /api/instructor/students-directory
 * (Student-side StudentsPage list) ✅ Student + Instructor
 * ================================================== */
router.get(
  "/students-directory",
  authMiddleware,
  async (req: AuthedReq, res: Response) => {
    try {
      // ✅ allow both student + instructor
      const role = (req as any)?.user?.role || (req as any)?.auth?.role;
      if (role !== "student" && role !== "instructor") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const branch = (req.query.branch as string | undefined)?.trim();
      const section = (req.query.section as string | undefined)?.trim();
      const year = (req.query.year as string | undefined)?.trim();
      const q = (req.query.q as string | undefined)?.trim().toLowerCase();

      const rawLimit = (req.query.limit as string | undefined) ?? "500";
      const limit = Math.max(1, Math.min(1000, Number(rawLimit) || 500));

      let queryRef: FirebaseFirestore.Query = studentsCol;

      if (branch) queryRef = queryRef.where("branch", "==", branch);
      if (section) queryRef = queryRef.where("section", "==", section);
      if (year) queryRef = queryRef.where("yearOfStudy", "==", year);

      const snap = await queryRef.limit(limit).get();

      const students = snap.docs
        .map((doc) => {
          const d = doc.data() || {};
          const cpScores = d.cpScores || {};
          const cpHandles = d.cpHandles || {};

          const score = isNum(cpScores.displayScore)
            ? clamp(cpScores.displayScore)
            : 0;

          const lastActiveRaw =
            d.lastActiveAt ?? d.updatedAt ?? cpScores.updatedAt ?? null;

          const platformSignals =
            d.platformSignals ??
            d.platforms ?? {
              leetcode: 0,
              codeforces: 0,
              codechef: 0,
              github: 0,
              hackerrank: 0,
              atcoder: 0,
            };

          return {
            id: doc.id,
            name: d.fullName || d.fullname || d.name || "Unnamed",

            branch: d.branch ?? null,
            section: d.section ?? null,
            year: d.yearOfStudy ?? d.year ?? null,
            rollNumber: d.rollNumber ?? null,

            codesyncScore: score,
            activeThisWeek: withinLastDays(lastActiveRaw, 7),
            lastActiveAt: toISO(lastActiveRaw),

            cpHandles: {
              leetcode: cpHandles.leetcode ?? null,
              codeforces: cpHandles.codeforces ?? null,
              codechef: cpHandles.codechef ?? null,
              github: cpHandles.github ?? null,
              hackerrank: cpHandles.hackerrank ?? null,
              atcoder: cpHandles.atcoder ?? null,
            },

            platformSignals,

            email: d.collegeEmail ?? d.personalEmail ?? d.email ?? null,
            phone: d.phone ?? null,
          };
        })
        .filter((s) => {
          if (!q) return true;
          const hay =
            `${s.name} ${s.id} ${s.rollNumber ?? ""} ${s.branch ?? ""} ${s.section ?? ""} ${s.year ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
        .sort((a, b) => (b.codesyncScore ?? 0) - (a.codesyncScore ?? 0));

      return res.json({
        students,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[STUDENTS DIRECTORY] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load students" });
    }
  }
);

/* ==================================================
 * ✅ GET /api/instructor/dashboard
 * ✅ Instructor-only
 * ================================================== */
router.get(
  "/dashboard",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const branch = (req.query.branch as string | undefined)?.trim();
      const section = (req.query.section as string | undefined)?.trim();
      const year = (req.query.year as string | undefined)?.trim();
      const q = (req.query.q as string | undefined)?.trim().toLowerCase();

      let queryRef: FirebaseFirestore.Query = studentsCol;

      if (branch) queryRef = queryRef.where("branch", "==", branch);
      if (section) queryRef = queryRef.where("section", "==", section);
      if (year) queryRef = queryRef.where("yearOfStudy", "==", year);

      const snap = await queryRef.limit(800).get();

      const students = snap.docs
        .map((doc) => {
          const d = doc.data() || {};
          const cpScores = d.cpScores || {};
          const score = isNum(cpScores.displayScore)
            ? clamp(cpScores.displayScore)
            : 0;

          const lastActiveRaw =
            d.lastActiveAt ?? d.updatedAt ?? cpScores.updatedAt ?? null;

          return {
            id: doc.id,
            name: d.fullName || d.fullname || d.name || "Unnamed",

            branch: d.branch ?? null,
            section: d.section ?? null,
            year: d.yearOfStudy ?? d.year ?? null,
            rollNumber: d.rollNumber ?? null,

            email: d.collegeEmail ?? d.personalEmail ?? d.email ?? null,
            phone: d.phone ?? null,

            codesyncScore: score,
            prevScore: isNum(cpScores.prevDisplayScore)
              ? clamp(cpScores.prevDisplayScore)
              : null,

            lastActiveAt: toISO(lastActiveRaw),
            activeThisWeek: withinLastDays(lastActiveRaw, 7),

            platforms: d.platformSignals ?? {
              leetcode: 0,
              codeforces: 0,
              codechef: 0,
              github: 0,
              hackerrank: 0,
              atcoder: 0,
            },
          };
        })
        .filter((s) => {
          if (!q) return true;
          const hay =
            `${s.name} ${s.id} ${s.branch ?? ""} ${s.section ?? ""} ${s.year ?? ""} ${s.rollNumber ?? ""}`.toLowerCase();
          return hay.includes(q);
        });

      return res.json({
        students,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[INSTRUCTOR /dashboard] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load dashboard" });
    }
  }
);

/* ==================================================
 * ✅ GET /api/instructor/student/:id/stats
 * ✅ Instructor-only
 * ================================================== */
router.get(
  "/student/:id/stats",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const id = safeStr(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "missing student id" });

      const ref = studentsCol.doc(id);
      const snap = await ref.get();
      if (!snap.exists)
        return res.status(404).json({ message: "student not found" });

      const data = snap.data() || {};
      const cpHandles = data.cpHandles || {};
      const cpScores = data.cpScores || {};

      const platformStats = await loadPlatformStatsMap(id);

      const platformSignals: Record<PlatformId, number> = {
        leetcode: 0,
        codeforces: 0,
        codechef: 0,
        github: 0,
        hackerrank: 0,
        atcoder: 0,
      };

      const platformNumbers: Record<PlatformId, any | null> = {
        leetcode: null,
        codeforces: null,
        codechef: null,
        github: null,
        hackerrank: null,
        atcoder: null,
      };

      const platformBreakdown: Record<
        PlatformId,
        { total: number; parts: Record<string, number> }
      > = {
        leetcode: { total: 0, parts: {} },
        codeforces: { total: 0, parts: {} },
        codechef: { total: 0, parts: {} },
        github: { total: 0, parts: {} },
        hackerrank: { total: 0, parts: {} },
        atcoder: { total: 0, parts: {} },
      };

      PLATFORMS.forEach((p) => {
        const st = platformStats[p];
        platformSignals[p] = clamp(computeSignal(p, st));
        platformNumbers[p] = computePlatformNumbers(p, st);
        platformBreakdown[p] = computePlatformScoreBreakdown(p, st);
      });

      const platformSum = PLATFORMS.reduce((a, p) => a + platformSignals[p], 0);

      const totals = {
        leetcodeSolved: toNum(platformNumbers.leetcode?.solved, 0),
        githubContrib: toNum(platformNumbers.github?.contributions, 0),
      };

      return res.json({
        profile: {
          id,
          name: data.fullName || data.fullname || data.name || null,
          branch: data.branch || null,
          section: data.section || null,
          year: data.yearOfStudy || data.year || null,
          rollNumber: data.rollNumber || null,
          graduationYear: data.graduationYear || null,
          email: data.collegeEmail ?? data.personalEmail ?? data.email ?? null,
          phone: data.phone ?? null,
          updatedAt: toISO(data.updatedAt),
        },
        cpHandles: {
          leetcode: cpHandles.leetcode ?? null,
          codeforces: cpHandles.codeforces ?? null,
          codechef: cpHandles.codechef ?? null,
          github: cpHandles.github ?? null,
          hackerrank: cpHandles.hackerrank ?? null,
          atcoder: cpHandles.atcoder ?? null,
        },
        cpScores: {
          displayScore: isNum(cpScores.displayScore)
            ? cpScores.displayScore
            : null,
          prevDisplayScore: isNum(cpScores.prevDisplayScore)
            ? cpScores.prevDisplayScore
            : null,
          updatedAt: toISO(cpScores.updatedAt),
          breakdown: cpScores.breakdown ?? null,
        },

        platformStats,
        platformNumbers,
        platformSignals,
        platformBreakdown,
        platformSum,
        totals,
      });
    } catch (err: any) {
      console.error("[INSTRUCTOR /student/:id/stats] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load student stats" });
    }
  }
);

/* ==================================================
 * ✅ POST /api/instructor/refresh-cohort (STUB)
 * ✅ Instructor-only
 * ================================================== */
router.post(
  "/refresh-cohort",
  authMiddleware,
  requireInstructor,
  async (_req: AuthedReq, res: Response) => {
    return res.json({ ok: true, message: "refresh queued (stub)" });
  }
);

export default router;
