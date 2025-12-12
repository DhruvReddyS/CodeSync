// src/routes/student.routes.ts

import express, { Response } from "express";
import { firestore, FieldValue } from "../config/firebase";

import authMiddleware, { AuthedRequest } from "../middleware/auth.middleware";
import { requireStudent } from "../middleware/role.middleware";

import { PlatformId } from "../lib/scoringEngine";
import {
  refreshStudentCPData,
  refreshStudentPlatform,
} from "../services/userCpRefreshService";

const router = express.Router();

type AuthedReq = AuthedRequest & {
  body: any;
  query: any;
};

const STUDENTS_COLLECTION = "students";
const studentsCol = firestore.collection(STUDENTS_COLLECTION);

/* --------------------------------------------------
 * Helper: Load a map of PlatformId → FULL scraped stats
 *   - Returns ALL fields stored in cpProfiles/<platform>
 *   - Shape is Record<PlatformId, any | null> for flexibility
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

  snap.forEach((doc: any) => {
    const data = doc.data() as any;
    const platform = data.platform as PlatformId;

    // We don't restrict keys here: ALL scraped fields are preserved.
    if (platform in map) {
      map[platform] = {
        ...data,
      };
    }
  });

  return map;
}

/* ==================================================
 * 🟠 ONBOARDING → POST /api/student/onboarding
 * ================================================== */
router.post(
  "/onboarding",
  authMiddleware,
  requireStudent,
  async (req: AuthedReq, res: Response) => {
    try {
      const studentId = req.user!.sub;

      const {
        fullName,
        collegeEmail,
        personalEmail,
        phone,
        branch,
        yearOfStudy,
        section,
        rollNumber,
        graduationYear,
        codingHandles,
        profile,
      } = req.body as {
        fullName?: string;
        collegeEmail?: string;
        personalEmail?: string;
        phone?: string;
        branch?: string;
        yearOfStudy?: string;
        section?: string;
        rollNumber?: string;
        graduationYear?: string;
        codingHandles?: {
          leetcode?: string;
          codeforces?: string;
          codechef?: string;
          github?: string;
          hackerrank?: string;
          atcoder?: string;
        };
        profile?: any;
      };

      if (!fullName) {
        return res.status(400).json({ message: "fullName is required" });
      }

      if (!branch || !yearOfStudy || !section || !rollNumber || !graduationYear) {
        return res.status(400).json({
          message:
            "branch, yearOfStudy, section, rollNumber, graduationYear are required",
        });
      }

      const studentRef = studentsCol.doc(studentId);
      const existingSnap = await studentRef.get();
      const isNew = !existingSnap.exists;

      const dataToSet: Record<string, any> = {
        userId: studentId,

        // Basic + academic info
        fullName,
        collegeEmail: collegeEmail || null,
        personalEmail: personalEmail || null,
        phone: phone || null,
        branch,
        yearOfStudy,
        year: yearOfStudy, // backward compatibility
        section,
        rollNumber,
        graduationYear,

        // Coding handles used by scrapers/scoring
        cpHandles: {
          leetcode: codingHandles?.leetcode || null,
          codeforces: codingHandles?.codeforces || null,
          codechef: codingHandles?.codechef || null,
          atcoder: codingHandles?.atcoder || null,
          hackerrank: codingHandles?.hackerrank || null,
          github: codingHandles?.github || null,
        },

        // Portfolio snapshot
        profile: profile || {},

        onboardingCompleted: true, // 🔥 explicitly mark as completed
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (isNew) {
        dataToSet.createdAt = FieldValue.serverTimestamp();
      }

      await studentRef.set(dataToSet, { merge: true });

      // 🔥 AUTO-TRIGGER INITIAL CP REFRESH AFTER ONBOARDING
      const hasAnyHandle =
        !!codingHandles &&
        !!(
          codingHandles.leetcode ||
          codingHandles.codeforces ||
          codingHandles.codechef ||
          codingHandles.atcoder ||
          codingHandles.hackerrank ||
          codingHandles.github
        );

      if (hasAnyHandle) {
        try {
          console.log(
            `[STUDENT /onboarding] triggering initial CP refresh for student=${studentId}`
          );
          await refreshStudentCPData(studentId);
        } catch (cpErr) {
          console.error("[STUDENT /onboarding] CP refresh failed:", cpErr);
          // Onboarding shouldn't fail just because scrapers failed
        }
      }

      return res.json({ message: "Onboarding completed" });
    } catch (err: any) {
      console.error("[STUDENT /onboarding] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to complete onboarding" });
    }
  }
);

/* ==================================================
 * PATCH CP Handles → PATCH /api/student/cp-handles
 * ================================================== */
router.patch(
  "/cp-handles",
  authMiddleware,
  requireStudent,
  async (req: AuthedReq, res: Response) => {
    try {
      const studentId = req.user!.sub;
      const { cpHandles } = req.body as {
        cpHandles?: Partial<Record<PlatformId, string>>;
      };

      if (!cpHandles) {
        return res.status(400).json({ message: "cpHandles is required" });
      }

      await studentsCol.doc(studentId).set(
        {
          cpHandles: {
            leetcode: cpHandles.leetcode || null,
            codechef: cpHandles.codechef || null,
            codeforces: cpHandles.codeforces || null,
            atcoder: cpHandles.atcoder || null,
            hackerrank: cpHandles.hackerrank || null,
            github: cpHandles.github || null,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({ message: "CP handles updated." });
    } catch (err: any) {
      console.error("[STUDENT /cp-handles] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to update cp handles" });
    }
  }
);

/* ==================================================
 * 📊 Dashboard Stats → GET /api/student/stats/me
 *  - All scraped platform stats (FULL docs from cpProfiles)
 *  - All computed scores (cpScores)
 * ================================================== */
router.get(
  "/stats/me",
  authMiddleware,
  requireStudent,
  async (req: AuthedReq, res: Response) => {
    try {
      const studentId = req.user!.sub;

      const snap = await studentsCol.doc(studentId).get();
      if (!snap.exists) {
        return res.status(404).json({ message: "Student not found" });
      }

      const data = snap.data() || {};
      const cpHandles = data.cpHandles || {};
      const cpScores = data.cpScores || null; // codeSyncScore, displayScore, platformSkills, totals, etc.
      const platformStats = await loadPlatformStatsMap(studentId); // 🔥 FULL per-platform scraped data

      // This object is what DashboardPage should consume
      return res.json({
        cpHandles,
        cpScores,
        platformStats,
      });
    } catch (err: any) {
      console.error("[STUDENT /stats/me] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load stats" });
    }
  }
);

/* ==================================================
 * Refresh Single Platform → POST /api/student/stats/refresh-platform
 * ================================================== */
router.post(
  "/stats/refresh-platform",
  authMiddleware,
  requireStudent,
  async (req: AuthedReq, res: Response) => {
    try {
      const studentId = req.user!.sub;
      const platform = (req.body as { platform?: PlatformId }).platform;

      if (!platform) {
        return res.status(400).json({ message: "platform is required" });
      }

      await refreshStudentPlatform(studentId, platform);

      const snap = await studentsCol.doc(studentId).get();
      const data = snap.data() || {};
      const cpScores = data.cpScores || null;
      const platformStats = await loadPlatformStatsMap(studentId);

      return res.json({ cpScores, platformStats });
    } catch (err: any) {
      console.error("[STUDENT /stats/refresh-platform] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to refresh platform" });
    }
  }
);

/* ==================================================
 * Refresh All Platforms → POST /api/student/stats/refresh-all
 * ================================================== */
router.post(
  "/stats/refresh-all",
  authMiddleware,
  requireStudent,
  async (req: AuthedReq, res: Response) => {
    try {
      const studentId = req.user!.sub;

      await refreshStudentCPData(studentId);

      const snap = await studentsCol.doc(studentId).get();
      const data = snap.data() || {};
      const cpScores = data.cpScores || null;
      const platformStats = await loadPlatformStatsMap(studentId);

      return res.json({ cpScores, platformStats });
    } catch (err: any) {
      console.error("[STUDENT /stats/refresh-all] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to refresh all platforms" });
    }
  }
);
/* ==================================================
 * 🏆 Leaderboard → GET /api/student/stats/leaderboard?limit=50
 *  - Scores + basic details for leaderboard page
 *  - cpScores is EXACTLY the same object used by Dashboard (/stats/me)
 * ================================================== */
router.get(
  "/stats/leaderboard",
  authMiddleware,
  async (req: AuthedReq, res: Response) => {
    try {
      const rawLimit = (req.query?.limit as string) || "50";
      const limit = Number(rawLimit) || 50;

      // 🔹 We assume scoringEngine always writes cpScores.displayScore.
      // This is the SAME field Dashboard reads & shows.
      const snap = await studentsCol
        .where("cpScores.displayScore", ">", 0)
        .orderBy("cpScores.displayScore", "desc")
        .limit(limit)
        .get();

      const leaderboard = snap.docs.map((doc: any, index: number) => {
        const d = doc.data() || {};

        // 🚨 IMPORTANT:
        // Do NOT reshape or recompute cpScores here.
        // Whatever scoringEngine stored in cpScores
        // (codeSyncScore, displayScore, platformSkills, etc.)
        // is passed straight through, identical to /stats/me.
        const cpScores = d.cpScores || null;

        return {
          studentId: doc.id,
          rank: index + 1,

          // Basic identity
          name: d.fullName || d.fullname || d.name || null,
          branch: d.branch || null,
          section: d.section || null,
          year: d.yearOfStudy || d.year || null,

          // ✅ SAME cpScores object Dashboard gets
          cpScores,

          // CP handles per platform
          cpHandles: d.cpHandles || {},
        };
      });

      return res.json({ leaderboard });
    } catch (err: any) {
      console.error("[STUDENT /stats/leaderboard] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load leaderboard" });
    }
  }
);

/* ==================================================
 * FULL PROFILE → GET /api/student/profile
 * ================================================== */
router.get(
  "/profile",
  authMiddleware,
  requireStudent,
  async (req: AuthedReq, res: Response) => {
    try {
      const studentId = req.user!.sub;

      const ref = studentsCol.doc(studentId);
      const snap = await ref.get();

      if (!snap.exists) {
        // No student doc at all → only case we truly say "onboarding required"
        return res.status(404).json({
          message: "Student profile not found",
          onboardingRequired: true,
        });
      }

      const data = snap.data() || {};

      // ✅ If the doc exists but onboardingCompleted is false/undefined,
      //    we *auto-upgrade* them to completed instead of 403-ing.
      let onboardingCompleted = data.onboardingCompleted === true;

      if (!onboardingCompleted) {
        onboardingCompleted = true;
        await ref.set(
          {
            onboardingCompleted: true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return res.json({
        id: studentId,
        fullname: data.fullName || data.fullname || null,

        collegeEmail: data.collegeEmail || null,
        personalEmail: data.personalEmail || null,
        phone: data.phone || null,

        branch: data.branch || null,
        section: data.section || null,
        year: data.yearOfStudy || data.year || null,
        rollNumber: data.rollNumber || null,
        graduationYear: data.graduationYear || null,

        cpHandles: data.cpHandles || {},
        profile: data.profile || {},

        onboardingCompleted: true,
      });
    } catch (err: any) {
      console.error("[STUDENT /profile] error:", err);
      return res
        .status(500)
        .json({ message: err.message || "Failed to load profile" });
    }
  }
);

export default router;
