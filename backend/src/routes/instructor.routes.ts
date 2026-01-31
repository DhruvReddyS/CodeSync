import express, { Response } from "express";
import { collections } from "../models/collections";
import { FieldValue } from "../config/firebase";

import authMiddleware, { AuthedRequest } from "../middleware/auth.middleware";
import { requireInstructor } from "../middleware/role.middleware";
import { getStudentScores } from "../services/studentScoresService";

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
const PLATFORM_LABEL: Record<PlatformId, string> = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  codechef: "CodeChef",
  github: "GitHub",
  hackerrank: "HackerRank",
  atcoder: "AtCoder",
};

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
            fullName: d.fullName || d.fullname || d.name || "Unnamed",

            branch: d.branch ?? null,
            section: d.section ?? null,
            year: d.yearOfStudy ?? null, // ✅ Removed d.year fallback
            yearOfStudy: d.yearOfStudy ?? null,
            rollNumber: d.rollNumber ?? null,

            codesyncScore: score,
            displayScore: score,
            totalProblemsSolved: cpScores?.totalProblemsSolved ?? 0,
            cpScores: cpScores || {},
            cpHandles: d.cpHandles || {},
            
            onboardingCompleted: d.onboardingCompleted === true,
            
            activeThisWeek: withinLastDays(lastActiveRaw, 7),
            lastActiveAt: toISO(lastActiveRaw),

            email: d.collegeEmail ?? d.personalEmail ?? d.email ?? null,
            collegeEmail: d.collegeEmail ?? null,
            personalEmail: d.personalEmail ?? null,
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

      const students = await Promise.all(
        snap.docs.map(async (doc) => {
          const d = doc.data() || {};
          const legacyScores = d.cpScores || {};

          const scoresDoc = await studentScoresCol.doc(doc.id).get();
          const scores = scoresDoc.exists ? scoresDoc.data() : {};

          const score = isNum(scores?.displayScore)
            ? clamp(scores.displayScore)
            : isNum(legacyScores.displayScore)
            ? clamp(legacyScores.displayScore)
            : 0;
          const rawTotal = isNum(scores?.codeSyncScore) ? scores.codeSyncScore : null;

          const prevScoreRaw = isNum(scores?.prevDisplayScore)
            ? scores.prevDisplayScore
            : legacyScores.prevDisplayScore;

          const lastActiveRaw =
            d.lastActiveAt ??
            d.updatedAt ??
            scores?.updatedAt ??
            legacyScores.updatedAt ??
            null;

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
            displayScore: score,
            codeSyncScore: rawTotal,
            prevScore: isNum(prevScoreRaw) ? clamp(prevScoreRaw) : null,
            totalProblemsSolved: scores?.totalProblemsSolved ?? 0,
            onboardingCompleted: d.onboardingCompleted === true,
            cpHandles: d.cpHandles || {},

            lastActiveAt: toISO(lastActiveRaw),
            activeThisWeek: withinLastDays(lastActiveRaw, 7),

            platforms:
              d.platformSignals ??
              d.platforms ?? {
                leetcode: 0,
                codeforces: 0,
                codechef: 0,
                github: 0,
                hackerrank: 0,
                atcoder: 0,
              },
          };
        })
      ).then((list) =>
        list.filter((s) => {
          if (!q) return true;
          const hay =
            `${s.name} ${s.id} ${s.branch ?? ""} ${s.section ?? ""} ${s.year ?? ""} ${s.rollNumber ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
      );

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
      const legacyScores = data.cpScores || {};

      const scoresDoc = await studentScoresCol.doc(id).get();
      const scores = scoresDoc.exists ? scoresDoc.data() : {};

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
          displayScore: isNum(scores?.displayScore)
            ? scores.displayScore
            : isNum(legacyScores.displayScore)
            ? legacyScores.displayScore
            : null,
          prevDisplayScore: isNum(scores?.prevDisplayScore)
            ? scores.prevDisplayScore
            : isNum(legacyScores.prevDisplayScore)
            ? legacyScores.prevDisplayScore
            : null,
          codeSyncScore: isNum(scores?.codeSyncScore)
            ? scores.codeSyncScore
            : null,
          totalProblemsSolved: scores?.totalProblemsSolved ?? null,
          platformSkills: scores?.platformSkills ?? legacyScores.platformSkills ?? null,
          updatedAt: toISO(scores?.updatedAt ?? scores?.computedAt ?? legacyScores.updatedAt),
          breakdown: scores?.breakdown ?? legacyScores.breakdown ?? null,
        },

        platformStats,
        platformNumbers,
        platformSignals,
        platformBreakdown,
        platformWiseScores: platformBreakdown,
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
 * ✅ GET /api/instructor/student/:id/profile
 * ✅ Instructor-only public profile view
 * ================================================== */
router.get(
  "/student/:id/profile",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const targetId = safeStr(req.params.id).trim();
      if (!targetId) {
        return res.status(400).json({ message: "Student id is required" });
      }

      const snap = await studentsCol.doc(targetId).get();
      if (!snap.exists) {
        return res.status(404).json({ message: "Student not found" });
      }

      const data = snap.data() || {};
      const cpScores = await getStudentScores(targetId, true);
      const platformStats = await loadPlatformStatsMap(targetId);

      return res.json({
        student: {
          id: targetId,
          fullName: data.fullName || data.fullname || data.name || null,
          branch: data.branch || null,
          section: data.section || null,
          year: data.yearOfStudy || data.year || null,
          rollNumber: data.rollNumber || null,
          graduationYear: data.graduationYear || null,
          collegeEmail: data.collegeEmail || null,
          personalEmail: data.personalEmail || null,
          phone: data.phone || null,
          profile: data.profile || {},
          cpHandles: data.cpHandles || {},
        },
        cpScores,
        platformStats,
      });
    } catch (err: any) {
      console.error("[INSTRUCTOR /student/:id/profile] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load student profile" });
    }
  }
);

/* ==================================================
 * ✅ POST /api/instructor/students
 * ✅ Add a new student
 * ================================================== */
router.post(
  "/students",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const {
        fullName,
        rollNumber,
        branch,
        section,
        yearOfStudy,
        collegeEmail,
        personalEmail,
      } = req.body;

      if (!fullName) {
        return res.status(400).json({ message: "Full name is required" });
      }

      // Hash password if needed - for now just create with basic auth
      const docRef = studentsCol.doc();
      await docRef.set({
        fullName,
        rollNumber: rollNumber || null,
        branch: branch || null,
        section: section || null,
        yearOfStudy: yearOfStudy ? Number(yearOfStudy) : null,
        collegeEmail: collegeEmail || null,
        personalEmail: personalEmail || null,
        cpHandles: {},
        cpScores: {
          displayScore: 0,
          platformSkills: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return res.json({ message: "Student added successfully", id: docRef.id });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to add student" });
    }
  }
);

/* ==================================================
 * ✅ DELETE /api/instructor/students/:studentId
 * ✅ Delete a student
 * ================================================== */
router.delete(
  "/students/:studentId",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const { studentId } = req.params;

      await studentsCol.doc(studentId).delete();
      return res.json({ message: "Student deleted successfully" });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to delete student" });
    }
  }
);

/* ==================================================
 * ✅ GET /api/instructor/analytics
 * ✅ Get analytics data for cohort
 * ================================================== */
router.get(
  "/analytics",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const snapshot = await studentsCol.get();
      const students = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const d = doc.data() || {};
          const scoresDoc = await studentScoresCol.doc(doc.id).get();
          const scores = scoresDoc.exists ? scoresDoc.data() : {};
          return {
            id: doc.id,
            ...d,
            __scores: scores,
          };
        })
      );

      const totalStudents = students.length;
      const scores = students
        .map((s: any) =>
          isNum(s.__scores?.displayScore)
            ? s.__scores.displayScore
            : s.cpScores?.displayScore || 0
        )
        .filter((s) => s > 0);
      const avgScore =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const sortedScores = [...scores].sort((a, b) => a - b);
      const medianScore = sortedScores.length
        ? sortedScores[Math.floor(sortedScores.length / 2)]
        : 0;
      const p90Score = sortedScores.length
        ? sortedScores[Math.floor(sortedScores.length * 0.9) - 1]
        : 0;

      // Score distribution
      const scoreDistribution = [
        { range: "0-20", students: students.filter((s: any) => (isNum(s.__scores?.displayScore) ? s.__scores.displayScore : s.cpScores?.displayScore || 0) < 20).length },
        { range: "20-40", students: students.filter((s: any) => { const sc = isNum(s.__scores?.displayScore) ? s.__scores.displayScore : s.cpScores?.displayScore || 0; return sc >= 20 && sc < 40; }).length },
        { range: "40-60", students: students.filter((s: any) => { const sc = isNum(s.__scores?.displayScore) ? s.__scores.displayScore : s.cpScores?.displayScore || 0; return sc >= 40 && sc < 60; }).length },
        { range: "60-80", students: students.filter((s: any) => { const sc = isNum(s.__scores?.displayScore) ? s.__scores.displayScore : s.cpScores?.displayScore || 0; return sc >= 60 && sc < 80; }).length },
        { range: "80-100", students: students.filter((s: any) => (isNum(s.__scores?.displayScore) ? s.__scores.displayScore : s.cpScores?.displayScore || 0) >= 80).length },
      ];

      // Platform stats
      const platformStats = PLATFORMS.map((platform) => ({
        name: PLATFORM_LABEL[platform],
        engaged: students.filter((s: any) => s.cpHandles?.[platform]).length,
        inactive: students.filter((s: any) => !s.cpHandles?.[platform]).length,
      }));

      // Weekly progress (mock)
      const weeklyProgress = [
        { week: "Week 1", avgScore: avgScore * 0.7 },
        { week: "Week 2", avgScore: avgScore * 0.75 },
        { week: "Week 3", avgScore: avgScore * 0.85 },
        { week: "Week 4", avgScore: avgScore * 0.95 },
        { week: "Week 5", avgScore: avgScore },
      ];

      // Branch comparison
      const branchMap = new Map<string, number[]>();
      students.forEach((s: any) => {
        const branch = s.branch || "Unknown";
        if (!branchMap.has(branch)) branchMap.set(branch, []);
        const sc = isNum(s.__scores?.displayScore)
          ? s.__scores.displayScore
          : s.cpScores?.displayScore || 0;
        branchMap.get(branch)!.push(sc);
      });
      const branchComparison = Array.from(branchMap.entries()).map(
        ([branch, scores]) => ({
          branch,
          avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        })
      );

      // Top performers
      const topPerformers = students
        .sort((a: any, b: any) => {
          const aScore = isNum(a.__scores?.displayScore)
            ? a.__scores.displayScore
            : a.cpScores?.displayScore || 0;
          const bScore = isNum(b.__scores?.displayScore)
            ? b.__scores.displayScore
            : b.cpScores?.displayScore || 0;
          return bScore - aScore;
        })
        .slice(0, 5)
        .map((s: any) => ({
          name: s.fullName || s.fullname || s.name || "Unknown",
          score: isNum(s.__scores?.displayScore)
            ? s.__scores.displayScore
            : s.cpScores?.displayScore || 0,
        }));

      const onboarded = students.filter((s: any) => s.onboardingCompleted).length;
      const activeThisWeek = students.filter((s: any) =>
        withinLastDays(s.lastActiveAt ?? s.updatedAt ?? s.__scores?.updatedAt ?? null, 7)
      ).length;

      return res.json({
        scoreDistribution,
        platformStats,
        weeklyProgress,
        branchComparison,
        totalStudents,
        avgScore: Math.round(avgScore * 10) / 10,
        medianScore: Math.round(medianScore * 10) / 10,
        p90Score: Math.round(p90Score * 10) / 10,
        totalProblemsSolved: students.reduce(
          (acc: number, s: any) => acc + (s.__scores?.totalProblemsSolved || 0),
          0
        ),
        onboarding: {
          onboarded,
          pending: totalStudents - onboarded,
        },
        activity: {
          activeThisWeek,
          inactive: totalStudents - activeThisWeek,
        },
        topPerformers,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to fetch analytics" });
    }
  }
);

/* ==================================================
 * ✅ POST /api/instructor/delete-account
 * ✅ Delete instructor account
 * ================================================== */
router.post(
  "/delete-account",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Delete instructor credentials
      const instructorCol = require("../models/collections").collections.instructors;
      await instructorCol.doc(userId).delete();

      // Delete user document
      const usersCol = require("../models/collections").collections.users;
      await usersCol.doc(userId).delete();

      return res.json({ message: "Account deleted successfully" });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to delete account" });
    }
  }
);

/* ==================================================
 * ✅ POST /api/instructor/notification-settings
 * ✅ Save notification preferences
 * ================================================== */
router.post(
  "/notification-settings",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const userId = req.user?.sub;
      const { emailNotifications, pushNotifications, frequency } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const usersCol = require("../models/collections").collections.users;
      await usersCol.doc(userId).update({
        notificationSettings: {
          emailNotifications: !!emailNotifications,
          pushNotifications: !!pushNotifications,
          frequency: frequency || "daily",
        },
      });

      return res.json({ message: "Notification settings saved" });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to save settings" });
    }
  }
);

/* ==================================================
 * ✅ POST /api/instructor/send-notification
 * ✅ Send notification to students
 * ================================================== */
router.post(
  "/send-notification",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const userId = req.user?.sub;
      const { title, message, recipientIds } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const recipients =
        Array.isArray(recipientIds) && recipientIds.length > 0
          ? recipientIds
          : ["all"];

      // Create notification document
      const notificationsCol = require("../models/collections").collections.notifications || 
        require("../config/firebase").db.collection("notifications");

      const notifRef = notificationsCol.doc();
      await notifRef.set({
        senderId: userId,
        title,
        message,
        recipients,
        audience: "students",
        createdAt: FieldValue.serverTimestamp(),
        read: false,
      });

      return res.json({
        message: "Notification sent successfully",
        notificationId: notifRef.id,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to send notification" });
    }
  }
);

/* ==================================================
 * ✅ GET /api/instructor/notifications
 * ✅ List recent notifications sent by instructor
 * ================================================== */
router.get(
  "/notifications",
  authMiddleware,
  requireInstructor,
  async (req: AuthedReq, res: Response) => {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const notificationsCol = require("../models/collections").collections.notifications || 
        require("../config/firebase").db.collection("notifications");

      const snap = await notificationsCol
        .where("senderId", "==", userId)
        .limit(100)
        .get();

      const items = snap.docs.map((doc: any) => {
        const d = doc.data() || {};
        return {
          id: doc.id,
          title: d.title ?? "",
          message: d.message ?? "",
          audience: d.audience ?? "students",
          recipients: d.recipients ?? [],
          createdAt: toISO(d.createdAt),
        };
      });

      const sorted = items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      return res.json({ notifications: sorted });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Failed to fetch notifications" });
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
