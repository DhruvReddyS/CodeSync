// src/services/cpProfileService.ts
import admin from "firebase-admin";
import {
  PlatformStats,
  PlatformId,
} from "../lib/scoringEngine";

const db = admin.firestore();

export type CPProfileDoc = PlatformStats & {
  lastUpdated?: FirebaseFirestore.Timestamp;
};

const USERS_COLLECTION = "users";
const CP_SUBCOLLECTION = "cpProfiles";

export async function savePlatformStats(
  userId: string,
  stats: PlatformStats
): Promise<void> {
  const ref = db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(CP_SUBCOLLECTION)
    .doc(stats.platform);

  const doc: CPProfileDoc = {
    ...stats,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
  };

  await ref.set(doc, { merge: true });
}

export async function getUserPlatformStats(
  userId: string
): Promise<PlatformStats[]> {
  const snap = await db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(CP_SUBCOLLECTION)
    .get();

  const statsList: PlatformStats[] = [];

  snap.forEach((doc) => {
    const data = doc.data() as CPProfileDoc;

    const stats: PlatformStats = {
      platform: data.platform as PlatformId,
      handle: data.handle,
      displayName: data.displayName,
      profileUrl: data.profileUrl,

      problemsSolvedTotal: data.problemsSolvedTotal,
      problemsSolvedByDifficulty: data.problemsSolvedByDifficulty,

      rating: data.rating,
      maxRating: data.maxRating,
      score: data.score,

      contestsParticipated: data.contestsParticipated,

      badges: data.badges,
      certificates: data.certificates,
      stars: data.stars,

      fullySolved: data.fullySolved,
      partiallySolved: data.partiallySolved,

      domainScores: data.domainScores,

      contributionsLastYear: data.contributionsLastYear,
      publicRepos: data.publicRepos,
      starsReceived: data.starsReceived,
    };

    statsList.push(stats);
  });

  return statsList;
}
