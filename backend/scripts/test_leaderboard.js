const admin = require('firebase-admin');
const path = require('path');

async function main(){
  try{
    const saPath = path.resolve(__dirname, '../firebase-service-account.json');
    const serviceAccount = require(saPath);

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    const db = admin.firestore();

    const limit = 10;
    const scoresSnap = await db.collection('studentScores').where('displayScore', '>', 0).orderBy('displayScore', 'desc').limit(limit).get();

    const results = [];
    for(const doc of scoresSnap.docs){
      const studentId = doc.id;
      const scores = doc.data();
      const studentSnap = await db.collection('students').doc(studentId).get();
      const student = studentSnap.exists ? studentSnap.data() : {};

      results.push({
        studentId,
        name: student.fullName || student.fullname || student.name || null,
        branch: student.branch || null,
        section: student.section || null,
        year: student.yearOfStudy || student.year || null,
        rollNumber: student.rollNumber || null,
        avatarUrl: student.profile?.avatarUrl || student.avatarUrl || null,
        cpHandles: student.cpHandles || {},
        cpScores: scores,
      });
    }

    console.log(JSON.stringify({ leaderboard: results }, null, 2));
    process.exit(0);
  }catch(err){
    console.error('ERROR', err);
    process.exit(2);
  }
}

main();
