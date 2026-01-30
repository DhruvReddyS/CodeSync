/**
 * Student Scores Service
 * Manages computation and caching of student scores
 * 
 * Key responsibility: Keep studentScores collection in sync with cpProfiles data
 */

import { collections, StudentScores, PlatformProfile } from "../models/collections";
import { firestore, FieldValue } from "../config/firebase";
import admin from "firebase-admin";
import { PlatformId, CpScores, computeCpScoresFromStats } from "../lib/scoringEngine";

const SCORE_CACHE_TTL_DAYS = 7; // Recompute scores every 7 days
const SCORE_VERSION = 1; // Increment to invalidate all scores

/**
 * Compute student scores from platform profiles
 * Used by: userCpRefreshService, scoring logic
 */
export async function computeAndSaveScores(
  studentId: string,
  platformStats: Record<PlatformId, any | null>
): Promise<StudentScores> {
  // Compute from platform stats
  const cpScores = computeCpScoresFromStats(platformStats);

  // Structure for studentScores collection
  const studentScores: StudentScores = {
    displayScore: cpScores.displayScore || 0,
    codeSyncScore: cpScores.codeSyncScore || 0,
    platformSkills: cpScores.platformSkills || {},
    totalProblemsSolved: cpScores.totalProblemsSolved || 0,
    breakdown: (cpScores.breakdown as any) || {},
    computedAt: FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + SCORE_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)
    ),
    version: SCORE_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Write to studentScores collection
  await collections.studentScores.doc(studentId).set(studentScores, { merge: true });

  return studentScores;
}

/**
 * Get student scores (with fallback to recompute if expired)
 */
export async function getStudentScores(
  studentId: string,
  recomputeIfExpired: boolean = true
): Promise<StudentScores | null> {
  const doc = await collections.studentScores.doc(studentId).get();

  if (!doc.exists) {
    if (recomputeIfExpired) {
      return await recomputeStudentScores(studentId);
    }
    return null;
  }

  const scores = doc.data() as StudentScores;

  // Check if expired
  if (recomputeIfExpired && scores.expiresAt) {
    const expiresTime = scores.expiresAt instanceof Date
      ? scores.expiresAt.getTime()
      : scores.expiresAt.toDate?.().getTime() || 0;

    if (Date.now() > expiresTime) {
      return await recomputeStudentScores(studentId);
    }
  }

  return scores;
}

/**
 * Force recompute scores from cpProfiles
 */
export async function recomputeStudentScores(
  studentId: string
): Promise<StudentScores | null> {
  const profileSnap = await collections.students
    .doc(studentId)
    .collection("cpProfiles")
    .get();

  if (profileSnap.empty) {
    // No profiles, return zero scores
    return await computeAndSaveScores(studentId, {
      leetcode: null,
      codeforces: null,
      codechef: null,
      github: null,
      hackerrank: null,
      atcoder: null,
    });
  }

  // Load all platform stats
  const platformStats: Record<string, any> = {
    leetcode: null,
    codeforces: null,
    codechef: null,
    github: null,
    hackerrank: null,
    atcoder: null,
  };

  profileSnap.forEach((doc) => {
    const data = doc.data() as PlatformProfile;
    if (data.platform in platformStats) {
      platformStats[data.platform] = data;
    }
  });

  // Compute and save
  return await computeAndSaveScores(studentId, platformStats);
}

/**
 * Batch update scores for multiple students
 * Used for batch scoring/admin operations
 */
export async function batchRecomputeScores(
  studentIds: string[]
): Promise<Map<string, StudentScores | null>> {
  const results = new Map<string, StudentScores | null>();

  // Process in chunks of 10 to avoid overwhelming the system
  const chunkSize = 10;
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const promises = chunk.map(async (id) => {
      const scores = await recomputeStudentScores(id);
      results.set(id, scores);
    });

    await Promise.all(promises);
  }

  return results;
}

/**
 * Check if student scores are stale
 */
export async function isScoresStale(studentId: string): Promise<boolean> {
  const scores = await getStudentScores(studentId, false);
  if (!scores || !scores.expiresAt) return true;

  const expiresTime = scores.expiresAt instanceof Date
    ? scores.expiresAt.getTime()
    : scores.expiresAt.toDate?.().getTime() || 0;

  return Date.now() > expiresTime;
}

/**
 * Delete student scores
 */
export async function deleteStudentScores(studentId: string): Promise<void> {
  await collections.studentScores.doc(studentId).delete();
}
