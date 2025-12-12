// src/services/cpProfileService.ts

import { firestore, FieldValue } from "../config/firebase";
import {
  PlatformId,
  RawPlatformStatsMap,
} from "../lib/scoringEngine";

const STUDENTS_COLLECTION = "students";
const studentsCol = firestore.collection(STUDENTS_COLLECTION);

const ALL_PLATFORMS: PlatformId[] = [
  "leetcode",
  "codechef",
  "hackerrank",
  "codeforces",
  "github",
  "atcoder",
];

/* ------------------------------------------------------------------
 * Get full map: platform → stats (FULL docs from cpProfiles)
 * ------------------------------------------------------------------ */
export async function getPlatformStatsMap(
  studentId: string
): Promise<RawPlatformStatsMap> {
  const snap = await studentsCol.doc(studentId).collection("cpProfiles").get();

  const emptyMap: RawPlatformStatsMap = {
    leetcode: null,
    codechef: null,
    hackerrank: null,
    codeforces: null,
    github: null,
    atcoder: null,
  };

  if (snap.empty) return emptyMap;

  const map: RawPlatformStatsMap = { ...emptyMap };

  snap.forEach((doc: any) => {
    const data = doc.data() || {};
    const platform =
      (data.platform || doc.id) as PlatformId;

    if (ALL_PLATFORMS.includes(platform)) {
      map[platform] = data;
    }
  });

  return map;
}

/* ------------------------------------------------------------------
 * Get a single platform profile
 * ------------------------------------------------------------------ */
export async function getPlatformProfile(
  studentId: string,
  platform: PlatformId
): Promise<any | null> {
  // Prefer doc id = platform
  const ref = studentsCol
    .doc(studentId)
    .collection("cpProfiles")
    .doc(platform);

  const snap = await ref.get();
  if (snap.exists) {
    return snap.data() || null;
  }

  // Fallback: search by field "platform" if old data used random doc IDs
  const querySnap = await studentsCol
    .doc(studentId)
    .collection("cpProfiles")
    .where("platform", "==", platform)
    .limit(1)
    .get();

  if (!querySnap.empty) {
    return querySnap.docs[0].data() || null;
  }

  return null;
}

/* ------------------------------------------------------------------
 * Save/update platform profile
 *  - profileData === null → delete profile (no handle)
 *  - otherwise upsert
 * ------------------------------------------------------------------ */
export async function savePlatformProfile(
  studentId: string,
  platform: PlatformId,
  profileData: any | null
): Promise<void> {
  const colRef = studentsCol.doc(studentId).collection("cpProfiles");
  const docRef = colRef.doc(platform);

  if (profileData == null) {
    // No handle / clear profile
    try {
      await docRef.delete();
    } catch (err) {
      console.error(
        "[cpProfileService] deletePlatformProfile error:",
        err
      );
    }
    return;
  }

  const payload = {
    ...profileData,
    platform,
    lastScrapedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(payload, { merge: true });
}
