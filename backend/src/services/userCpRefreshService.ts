// src/services/userCpRefreshService.ts

import { firestore, FieldValue } from "../config/firebase";
import {
  PlatformId,
  PlatformStats,
  computePlatformSkill,
  computeCodeSyncScore,
  computeCodeSyncDisplayScore,
  PlatformSkill,
} from "../lib/scoringEngine";
import { CpHandles, scrapeAllPlatformsForUser, scrapePlatformForUser } from "./scrapers";

const STUDENTS_COLLECTION = "students";

function normalizeCpHandles(raw: any): CpHandles {
  const src = raw || {};
  const handles: CpHandles = {};

  const norm = (v: any): string | undefined => {
    if (!v) return undefined;
    const s = String(v).trim();
    return s.length ? s : undefined;
  };

  handles.leetcode = norm(src.leetcode);
  handles.codechef = norm(src.codechef);
  handles.codeforces = norm(src.codeforces);
  handles.atcoder = norm(src.atcoder);
  handles.hackerrank = norm(src.hackerrank);
  handles.github = norm(src.github);

  return handles;
}

function hasAnyHandle(h: CpHandles): boolean {
  return !!(h.leetcode || h.codechef || h.codeforces || h.atcoder || h.hackerrank || h.github);
}

async function savePlatformStats(
  studentId: string,
  stats: PlatformStats
): Promise<void> {
  const ref = firestore
    .collection(STUDENTS_COLLECTION)
    .doc(studentId)
    .collection("cpProfiles")
    .doc(stats.platform);

  await ref.set(
    {
      ...stats,
      lastUpdated: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function getStudentPlatformStats(studentId: string): Promise<PlatformStats[]> {
  const snap = await firestore
    .collection(STUDENTS_COLLECTION)
    .doc(studentId)
    .collection("cpProfiles")
    .get();

  const list: PlatformStats[] = [];
  snap.forEach((doc) => {
    const data = doc.data() as PlatformStats;
    list.push(data);
  });
  return list;
}

async function recomputeStudentScore(studentId: string): Promise<void> {
  const stats = await getStudentPlatformStats(studentId);

  const skills: PlatformSkill[] = stats.map((s) => computePlatformSkill(s));

  const platformSkills: Record<PlatformId, number> = {
    leetcode: 0,
    codechef: 0,
    codeforces: 0,
    atcoder: 0,
    hackerrank: 0,
    github: 0,
  };

  skills.forEach((s) => {
    platformSkills[s.platform] = s.skill;
  });

  const codeSyncScore = computeCodeSyncScore(skills);
  const displayScore = computeCodeSyncDisplayScore(skills);

  await firestore.collection(STUDENTS_COLLECTION).doc(studentId).set(
    {
      cpScores: {
        platformSkills,
        codeSyncScore,
        displayScore,
        lastUpdated: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
}

/**
 * Refresh ALL 6 platforms for a single student,
 * recompute cpScores, and store everything.
 */
export async function refreshStudentCPData(studentId: string): Promise<void> {
  const doc = await firestore.collection(STUDENTS_COLLECTION).doc(studentId).get();
  if (!doc.exists) {
    console.log(`[CP-REFRESH] student not found: ${studentId}`);
    return;
  }

  const data = doc.data() || {};
  const cpHandles = normalizeCpHandles(data.cpHandles || {});
  if (!hasAnyHandle(cpHandles)) {
    console.log(`[CP-REFRESH] student=${studentId} has no CP handles`);
    return;
  }

  console.log(`🚀 [CP-REFRESH] Refreshing ALL platforms for student=${studentId}`);

  const statsList = await scrapeAllPlatformsForUser(cpHandles);

  for (const stats of statsList) {
    await savePlatformStats(studentId, stats);
  }

  await recomputeStudentScore(studentId);
}

/**
 * Refresh a SINGLE platform for a student.
 * Used by "Update" button on dashboard cards.
 */
export async function refreshStudentPlatform(
  studentId: string,
  platform: PlatformId
): Promise<void> {
  const doc = await firestore.collection(STUDENTS_COLLECTION).doc(studentId).get();
  if (!doc.exists) {
    console.log(`[CP-REFRESH-ONE] student not found: ${studentId}`);
    return;
  }

  const data = doc.data() || {};
  const cpHandles = normalizeCpHandles(data.cpHandles || {});
  const handle = (cpHandles as any)[platform] as string | undefined;

  if (!handle) {
    console.log(
      `[CP-REFRESH-ONE] student=${studentId} has no handle for platform=${platform}`
    );
    return;
  }

  console.log(
    `🚀 [CP-REFRESH-ONE] student=${studentId}, platform=${platform}, handle=${handle}`
  );

  const stats = await scrapePlatformForUser(platform, handle);
  if (!stats) {
    console.log(
      `[CP-REFRESH-ONE] no stats scraped for student=${studentId}, platform=${platform}`
    );
    return;
  }

  await savePlatformStats(studentId, stats);
  await recomputeStudentScore(studentId);
}

/**
 * Refresh CP stats for ALL students.
 * Use this in a cron job 2x/day.
 */
export async function refreshAllStudentsCPData(): Promise<void> {
  const snap = await firestore.collection(STUDENTS_COLLECTION).get();

  let processed = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const id = doc.id;
    const data = doc.data() || {};
    const cpHandles = normalizeCpHandles(data.cpHandles || {});

    if (!hasAnyHandle(cpHandles)) {
      skipped++;
      continue;
    }

    try {
      await refreshStudentCPData(id);
      processed++;
    } catch (err) {
      console.error(`[CP-REFRESH-ALL] error for student=${id}:`, err);
    }
  }

  console.log(
    `🌍 [CP-REFRESH-ALL] done. processed=${processed}, skipped=${skipped}, total=${snap.size}`
  );
}
