# Firebase Firestore Database Schema

## Collections Overview

The backend uses **Firestore** (NoSQL document database) with the following structure:

```
Firestore Database
├── users/                          (Instructors & Admins)
│   └── {userId}
│       ├── email: string
│       ├── name: string
│       ├── role: "instructor" | "admin"
│       ├── firebaseUid: string | null
│       ├── createdAt: Timestamp
│       ├── updatedAt: Timestamp
│       └── cpProfiles/             (Sub-collection - Platform profiles)
│           ├── leetcode/
│           ├── codeforces/
│           ├── codechef/
│           ├── github/
│           ├── hackerrank/
│           └── atcoder/
│
├── instructors/                    (Instructor login credentials)
│   └── {userId}                    (Same ID as users/{userId})
│       ├── userId: string
│       ├── passwordHash: string    (bcryptjs hashed)
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
└── students/                       (Students with coding profiles)
    └── {studentId}
        ├── fullName: string
        ├── branch: string
        ├── section: string
        ├── yearOfStudy: string
        ├── rollNumber: string
        ├── graduationYear: string
        ├── collegeEmail: string
        ├── personalEmail: string
        ├── phone: string
        ├── profile: object          (Custom profile metadata)
        │   ├── bio: string
        │   ├── skills: string[]
        │   └── ...other fields
        ├── cpHandles: object        (Platform usernames/handles)
        │   ├── leetcode: string | null
        │   ├── codeforces: string | null
        │   ├── codechef: string | null
        │   ├── github: string | null
        │   ├── hackerrank: string | null
        │   └── atcoder: string | null
        ├── cpScores: object         (Computed scores)
        │   ├── codeSyncScore: number
        │   ├── displayScore: number (0-100 scale)
        │   ├── totalProblemsSolved: number
        │   ├── platformSkills: object
        │   │   ├── leetcode: number
        │   │   ├── codeforces: number
        │   │   ├── codechef: number
        │   │   ├── github: number
        │   │   ├── hackerrank: number
        │   │   └── atcoder: number
        │   ├── lastComputedAt: Timestamp
        │   └── updatedAt: Timestamp
        ├── lastActiveAt: Timestamp | null
        ├── createdAt: Timestamp
        ├── updatedAt: Timestamp
        └── cpProfiles/              (Sub-collection - Platform stats)
            ├── leetcode/
            │   ├── platform: "leetcode"
            │   ├── handle: string
            │   ├── totalSolved: number
            │   ├── rating: number | null
            │   ├── contestRating: number | null
            │   ├── attendedContests: number
            │   ├── contestsParticipated: number
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── codeforces/
            │   ├── platform: "codeforces"
            │   ├── handle: string
            │   ├── problemsSolvedTotal: number
            │   ├── rating: number | null
            │   ├── contestsAttended: number
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── codechef/
            │   ├── platform: "codechef"
            │   ├── handle: string
            │   ├── fullySolved: number | object
            │   ├── partiallySolved: number | object
            │   ├── currentRating: number | null
            │   ├── rating: number | null
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── hackerrank/
            │   ├── platform: "hackerrank"
            │   ├── handle: string
            │   ├── problemsSolved: number
            │   ├── contestsParticipated: number
            │   ├── badgesCount: number
            │   ├── badges: object[]
            │   ├── certificatesCount: number
            │   ├── certificates: object[]
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── github/
            │   ├── platform: "github"
            │   ├── handle: string
            │   ├── contributionsLastYear: number
            │   ├── totalStars: number
            │   ├── starsReceived: number
            │   ├── publicRepos: number
            │   ├── followers: number
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            └── atcoder/
                ├── platform: "atcoder"
                ├── handle: string
                ├── rating: number | null
                ├── totalContests: number
                ├── ratedMatches: number
                ├── problemsSolvedTotal: number
                ├── lastScrapedAt: Timestamp
                └── updatedAt: Timestamp
```

---

## Key Concepts

### 1. **Collection Levels**

**Top-Level Collections:**
- `users` - Instructor/Admin accounts
- `instructors` - Login credentials for instructors
- `students` - Student profiles with coding platform data

**Sub-Collections (Nested inside documents):**
- `students/{studentId}/cpProfiles/` - Individual platform scraping results
- `users/{userId}/cpProfiles/` - (For instructor/admin platform profiles, if used)

### 2. **Document IDs**

- **students/{studentId}** - Auto-generated Firebase UID from authentication
- **users/{userId}** - Auto-generated Firebase UID for instructors
- **instructors/{userId}** - Same ID as corresponding `users` document
- **cpProfiles/{platform}** - Document ID = platform name (e.g., "leetcode", "github", "codeforces")

### 3. **Data Types**

- **Timestamp** - Firebase server timestamp (`FieldValue.serverTimestamp()`)
- **Number** - Integers and floats (scores, ratings, counts)
- **String** - Text fields
- **Object** - Nested JSON objects for complex data
- **Array** - Lists (e.g., badges, certificates)
- **null** - Represents empty/unset values

### 4. **Scoring System**

The `cpScores` field stores:
- **platformSkills** - Individual skill score per platform (computed from platform stats)
- **codeSyncScore** - Sum of all platform skills (raw value)
- **displayScore** - Rounded codeSyncScore (0-100 range for UI)
- **totalProblemsSolved** - Aggregate count across all platforms

**Platform Scoring Formula:**
```
LeetCode:  solved*10 + rating*1.0 + contests*25
CodeForces: solved*12 + rating*1.2 + contests*40
CodeChef:  fullySolved*12 + partiallySolved*4 + rating*1.0 + estContests*30
HackerRank: problems*8 + contests*20 + badges*40 + certs*60
GitHub:    contributions*2 + stars*30 + repos*10 + followers*20
AtCoder:   solved*8 + rating*1.2 + contests*35
```

### 5. **Data Synchronization**

- **cpHandles** - User-entered usernames for each platform (stored on student doc)
- **cpProfiles** - Scraped data from coding platforms (stored in sub-collection)
- **cpScores** - Computed metrics based on cpProfiles data (stored on student doc)

The system refreshes `cpProfiles` via scrapers (web scraping), then recomputes `cpScores`.

### 6. **Timestamps**

All timestamps use Firebase's `Timestamp` type:
- `createdAt` - When document was first created
- `updatedAt` - Last modification time
- `lastActiveAt` - When student last interacted with the system
- `lastScrapedAt` - When platform profile was last scraped
- `lastComputedAt` - When scores were last recalculated

---

## Usage Examples

### Reading a Student Profile
```typescript
const studentDoc = await studentsCol.doc(studentId).get();
const studentData = studentDoc.data();
// Returns: { fullName, cpHandles, cpScores, ... }
```

### Reading Platform Stats
```typescript
const platformDocs = await studentsCol
  .doc(studentId)
  .collection("cpProfiles")
  .get();

platformDocs.forEach(doc => {
  const platform = doc.id; // "leetcode", "github", etc.
  const stats = doc.data(); // { handle, rating, solved, ... }
});
```

### Updating Student Profile
```typescript
await studentsCol.doc(studentId).set({
  cpHandles: { leetcode: "myhandle", ... },
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
```

### Saving Scraped Data
```typescript
await studentsCol
  .doc(studentId)
  .collection("cpProfiles")
  .doc("leetcode")
  .set({
    platform: "leetcode",
    handle: "myhandle",
    totalSolved: 150,
    rating: 1500,
    lastScrapedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
```

---

## Design Notes

1. **Sub-collections over arrays** - cpProfiles stored in sub-collection rather than array on parent document allows:
   - Easier querying of specific platforms
   - Independent Firestore listener subscriptions
   - Better scalability

2. **Denormalization** - cpScores stored on student doc for fast dashboard queries (no need to recalculate)

3. **Flexible schema** - Each platform's stats can have different fields without breaking other platforms

4. **Timestamp tracking** - Multiple timestamps (`lastScrapedAt`, `lastComputedAt`, `updatedAt`) allow audit trails and caching logic

5. **Null values** - Handles stored as `null` when not provided (instead of empty strings) for cleaner conditional logic
