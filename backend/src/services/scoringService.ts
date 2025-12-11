// src/services/scoringService.ts
import admin from "firebase-admin";
import {
  computePlatformSkill,
  computeCodeSyncScore,
  computeCodeSyncDisplayScore,
  PlatformSkill,
  PlatformId,
} from "../lib/scoringEngine";
import { getUserPlatformStats } from "./cpProfileService";

const db = admin.firestore();

export interface UserCPScores {
  platformSkills: Record<PlatformId, number>;
  codeSyncScore: number;  // 0..100
  displayScore: number;   // 0..1000
  lastUpdated: FirebaseFirestore.Timestamp;
}

export async function recomputeUserCPScore(
  userId: string
): Promise<UserCPScores> {
  const stats = await getUserPlatformStats(userId);

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
  const now = admin.firestore.Timestamp.now();

  const userRef = db.collection("users").doc(userId);

  await userRef.set(
    {
      cpScores: {
        platformSkills,
        codeSyncScore,
        displayScore,
        lastUpdated: now,
      },
    },
    { merge: true }
  );

  // Snapshot history
  const snapshotId = now.toMillis().toString();
  await userRef.collection("cpSnapshots").doc(snapshotId).set({
    timestamp: now,
    platformSkills,
    codeSyncScore,
    displayScore,
  });

  console.log(
    `📊 recomputeUserCPScore: user=${userId}, displayScore=${displayScore}, platforms=${stats.length}`
  );

  return {
    platformSkills,
    codeSyncScore,
    displayScore,
    lastUpdated: now,
  };
}
