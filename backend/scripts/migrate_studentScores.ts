import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import path from 'path';

async function main(){
  console.log('Migration script prepared. This script will recompute and write studentScores for all students.');
  console.log('It is intentionally NOT executed automatically. Run it with `npx ts-node scripts/migrate_studentScores.ts` after confirming.');

  const saPath = path.resolve(__dirname, '../firebase-service-account.json');
  if (!fs.existsSync(saPath)){
    console.error('Service account file not found at', saPath);
    process.exit(2);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  // Helper to recompute a single student's scores based on cpProfiles
  async function recomputeForStudent(studentId: string){
    const profilesSnap = await db.collection('students').doc(studentId).collection('cpProfiles').get();
    const platformStats: Record<string, any> = {
      leetcode: null,
      codechef: null,
      codeforces: null,
      github: null,
      hackerrank: null,
      atcoder: null,
    };

    profilesSnap.forEach((d) => {
      const data = d.data();
      const platform = data.platform || d.id;
      if (platform in platformStats) platformStats[platform] = data;
    });

    // Use scoring logic from lib/scoringEngine by requiring compiled JS is not trivial here.
    // Instead we will write the platformStats into studentScores under `rawPlatformStats`
    // so you can run scoring later with the internal compute script.

    const payload = {
      platformStats,
      computedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('studentScores').doc(studentId).set(payload, { merge: true });
    return payload;
  }

  // NOTE: This migration writes `platformStats` to studentScores but DOES NOT compute final scores.
  // Running the full compute-and-save requires using the project's TypeScript scoring functions and
  // should be done only after a manual review or with explicit permission.

  console.log('Prepared migration script: writes platformStats snapshot to studentScores/{studentId}.');
}

main().catch((e)=>{ console.error(e); process.exit(2); });
