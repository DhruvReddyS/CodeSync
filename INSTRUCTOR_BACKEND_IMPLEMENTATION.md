# Instructor Backend - API Implementation Guide

---

## 📋 QUICK OVERVIEW

**Endpoint Base**: `/api/instructor/`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/cohort-stats` | Aggregate statistics |
| GET | `/students` | Paginated student list |
| GET | `/student/:id` | Detailed student view |
| GET | `/analytics` | Advanced analytics |
| GET | `/cohort-filters` | Available filter options |
| POST | `/refresh-cohort` | Trigger score recomputation |

---

## 📁 FILE STRUCTURE TO CREATE

```
backend/src/
├── controllers/
│   └── instructor.controller.ts        # ✅ Already exists
│
├── routes/
│   └── instructor.routes.ts            # ✅ Already exists
│
├── services/
│   └── instructorService.ts            # NEW: Business logic
│
├── middleware/
│   └── instructorAuth.middleware.ts    # NEW: Authorization
│
└── lib/
    └── analyticsEngine.ts              # NEW: Stats computation
```

---

## 🔐 MIDDLEWARE: Instructor Authorization

### backend/src/middleware/instructorAuth.middleware.ts

```typescript
import { Request, Response, NextFunction } from "express";
import { collections } from "../models/collections";

export interface AuthedRequest extends Request {
  user?: {
    sub: string;        // userId
    role: string;       // "instructor" | "admin"
    accessLevel?: "college" | "branch" | "section";
    assignedBranch?: string;
    assignedSections?: string[];
  };
}

/**
 * Verify JWT and attach user data to request
 * Extracts role, accessLevel, and assigned sections from token
 */
export async function verifyInstructorAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }

    // TODO: Verify JWT token (use your existing auth logic)
    // For now, assuming token is verified and user attached by previous middleware

    if (!req.user || req.user.role !== "instructor") {
      return res.status(403).json({ message: "Instructor access required" });
    }

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}

/**
 * Filter query to respect instructor's access level
 * - COLLEGE level: can see all students
 * - BRANCH level: can see only assigned branch
 * - SECTION level: can see only assigned sections
 */
export function getAccessibleStudentsQuery(user: AuthedRequest["user"]) {
  if (!user) return null;

  const query: Record<string, any> = {};

  if (user.accessLevel === "college") {
    // No filter - can see all
    return query;
  }

  if (user.accessLevel === "branch" && user.assignedBranch) {
    query.branch = user.assignedBranch;
    return query;
  }

  if (user.accessLevel === "section" && user.assignedSections?.length) {
    // Create a compound query: branch AND section IN [assignedSections]
    // Note: Firestore requires separate queries for OR, so this might need adaptation
    return {
      branch: user.assignedBranch,
      section: { $in: user.assignedSections },
    };
  }

  // Default: deny access
  return null;
}
```

---

## 📊 SERVICE: Business Logic

### backend/src/services/instructorService.ts

```typescript
import { collections } from "../models/collections";
import { computePlatformSignal, clamp, toNum, toISO } from "../lib/analyticsEngine";

const { students: studentsCol } = collections;

interface CohortFilter {
  branch?: string;
  section?: string;
  year?: string;
}

/**
 * Build Firestore query based on filters
 */
function buildCohortQuery(filters: CohortFilter) {
  let query: any = studentsCol;

  if (filters.branch) {
    query = query.where("branch", "==", filters.branch);
  }
  if (filters.section) {
    query = query.where("section", "==", filters.section);
  }
  if (filters.year) {
    query = query.where("yearOfStudy", "==", filters.year);
  }

  return query;
}

/**
 * GET /instructor/cohort-stats
 * Compute aggregate statistics for a cohort
 */
export async function getCohortStats(filters: CohortFilter & { refreshScores?: boolean }) {
  try {
    const query = buildCohortQuery(filters);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return {
        cohort: { totalStudents: 0, activeLastWeek: 0, activePercentage: 0, onboardedCount: 0, onboardingPercentage: 0 },
        scores: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, quartiles: { q1: 0, q2: 0, q3: 0 } },
        distribution: {},
        topPerformers: [],
        atRiskStudents: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    const students = snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    // Aggregate metrics
    const totalStudents = students.length;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let activeLastWeek = 0;
    let onboardedCount = 0;
    const scores: number[] = [];

    const topPerformers: any[] = [];
    const atRiskStudents: any[] = [];

    students.forEach((student) => {
      const data = student.data as any;

      // Check active
      const lastActive = data.lastActiveAt?.toMillis?.() || data.lastActiveAt;
      if (lastActive && lastActive > sevenDaysAgo) {
        activeLastWeek++;
      }

      // Check onboarded
      if (data.onboardingCompleted) {
        onboardedCount++;
      }

      // Collect scores
      const score = toNum(data.cpScores?.displayScore, 0);
      scores.push(score);

      // Track top performers
      if (score >= 80) {
        topPerformers.push({
          studentId: student.id,
          name: data.fullName,
          score,
          branch: data.branch,
          section: data.section,
        });
      }

      // Track at-risk
      if (score < 50 || !data.onboardingCompleted || (lastActive && Date.now() - lastActive > 14 * 24 * 60 * 60 * 1000)) {
        let reason: "low_score" | "inactive" | "not_onboarded" = "low_score";
        if (!data.onboardingCompleted) reason = "not_onboarded";
        else if (!lastActive || Date.now() - lastActive > 14 * 24 * 60 * 60 * 1000) reason = "inactive";

        atRiskStudents.push({
          studentId: student.id,
          name: data.fullName,
          score,
          lastActive: lastActive ? new Date(lastActive).toISOString() : null,
          reason,
        });
      }
    });

    // Sort top performers
    topPerformers.sort((a, b) => b.score - a.score);

    // Calculate stats
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Distribution
    const distribution = {
      "90-100": scores.filter((s) => s >= 90).length,
      "80-90": scores.filter((s) => s >= 80 && s < 90).length,
      "70-80": scores.filter((s) => s >= 70 && s < 80).length,
      "60-70": scores.filter((s) => s >= 60 && s < 70).length,
      "50-60": scores.filter((s) => s >= 50 && s < 60).length,
      "40-50": scores.filter((s) => s >= 40 && s < 50).length,
      "0-40": scores.filter((s) => s < 40).length,
    };

    // Quartiles
    const q1Idx = Math.floor(sorted.length * 0.25);
    const q3Idx = Math.floor(sorted.length * 0.75);

    return {
      cohort: {
        totalStudents,
        activeLastWeek,
        activePercentage: (activeLastWeek / totalStudents) * 100,
        onboardedCount,
        onboardingPercentage: (onboardedCount / totalStudents) * 100,
      },
      scores: {
        mean: parseFloat(mean.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        quartiles: {
          q1: sorted[q1Idx],
          q2: median,
          q3: sorted[q3Idx],
        },
      },
      distribution,
      topPerformers: topPerformers.slice(0, 10),
      atRiskStudents: atRiskStudents.slice(0, 10),
      lastUpdated: new Date().toISOString(),
    };
  } catch (err: any) {
    throw new Error(`Failed to get cohort stats: ${err.message}`);
  }
}

/**
 * GET /instructor/students (paginated list)
 */
export async function getStudentsList(options: {
  branch?: string;
  section?: string;
  year?: string;
  searchQuery?: string;
  scoreMin?: number;
  scoreMax?: number;
  activityFilter?: "last7days" | "last30days" | "inactive";
  sortBy?: "score" | "name" | "branch" | "lastActive";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}) {
  try {
    const {
      branch,
      section,
      year,
      searchQuery,
      scoreMin,
      scoreMax,
      activityFilter,
      sortBy = "score",
      sortOrder = "desc",
      page = 1,
      limit = 50,
    } = options;

    // Build base query
    let query: any = studentsCol;

    if (branch) query = query.where("branch", "==", branch);
    if (section) query = query.where("section", "==", section);
    if (year) query = query.where("yearOfStudy", "==", year);

    // Fetch all docs (filtering done in-memory for complex queries)
    const snapshot = await query.get();
    let students = snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data(),
    }));

    // Filter by score range
    if (scoreMin !== undefined || scoreMax !== undefined) {
      students = students.filter((s) => {
        const score = toNum(s.data.cpScores?.displayScore, 0);
        if (scoreMin !== undefined && score < scoreMin) return false;
        if (scoreMax !== undefined && score > scoreMax) return false;
        return true;
      });
    }

    // Filter by activity
    const now = Date.now();
    if (activityFilter) {
      const thresholds = {
        last7days: 7 * 24 * 60 * 60 * 1000,
        last30days: 30 * 24 * 60 * 60 * 1000,
        inactive: 30 * 24 * 60 * 60 * 1000, // More than 30 days
      };
      const threshold = thresholds[activityFilter];

      students = students.filter((s) => {
        const lastActive = s.data.lastActiveAt?.toMillis?.() || s.data.lastActiveAt;
        if (!lastActive) return activityFilter === "inactive";
        const daysInactive = now - lastActive;
        return activityFilter === "inactive" ? daysInactive > threshold : daysInactive <= threshold;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query_lower = searchQuery.toLowerCase();
      students = students.filter((s) => {
        const data = s.data;
        return (
          data.fullName?.toLowerCase().includes(query_lower) ||
          data.rollNumber?.includes(searchQuery) ||
          data.cpHandles?.leetcode?.toLowerCase().includes(query_lower) ||
          data.cpHandles?.codeforces?.toLowerCase().includes(query_lower) ||
          data.cpHandles?.codechef?.toLowerCase().includes(query_lower) ||
          data.cpHandles?.github?.toLowerCase().includes(query_lower)
        );
      });
    }

    // Sort
    const sortMap = {
      score: (a: any, b: any) => toNum(b.data.cpScores?.displayScore, 0) - toNum(a.data.cpScores?.displayScore, 0),
      name: (a: any, b: any) => a.data.fullName.localeCompare(b.data.fullName),
      branch: (a: any, b: any) => a.data.branch.localeCompare(b.data.branch),
      lastActive: (a: any, b: any) => {
        const aTime = a.data.lastActiveAt?.toMillis?.() || a.data.lastActiveAt || 0;
        const bTime = b.data.lastActiveAt?.toMillis?.() || b.data.lastActiveAt || 0;
        return bTime - aTime;
      },
    };

    students.sort(sortMap[sortBy as keyof typeof sortMap] || sortMap.score);
    if (sortOrder === "asc") students.reverse();

    // Paginate
    const startIdx = (page - 1) * limit;
    const paginatedStudents = students.slice(startIdx, startIdx + limit);

    return {
      students: paginatedStudents.map((s) => ({
        studentId: s.id,
        fullName: s.data.fullName,
        branch: s.data.branch,
        section: s.data.section,
        yearOfStudy: s.data.yearOfStudy,
        rollNumber: s.data.rollNumber,
        cpScores: {
          displayScore: toNum(s.data.cpScores?.displayScore, 0),
          platformSkills: s.data.cpScores?.platformSkills || {},
          lastComputedAt: toISO(s.data.cpScores?.lastComputedAt),
        },
        cpHandles: s.data.cpHandles || {},
        lastActiveAt: toISO(s.data.lastActiveAt),
        onboardingCompleted: s.data.onboardingCompleted,
      })),
      pagination: {
        page,
        limit,
        total: students.length,
        totalPages: Math.ceil(students.length / limit),
      },
    };
  } catch (err: any) {
    throw new Error(`Failed to get students list: ${err.message}`);
  }
}

/**
 * GET /instructor/student/:studentId (detailed view)
 */
export async function getStudentDetail(studentId: string) {
  try {
    const studentDoc = await studentsCol.doc(studentId).get();

    if (!studentDoc.exists) {
      throw new Error("Student not found");
    }

    const data = studentDoc.data() as any;

    // Fetch platform profiles
    const platformsSnapshot = await studentsCol.doc(studentId).collection("cpProfiles").get();
    const platformBreakdown: any = {};

    platformsSnapshot.forEach((doc) => {
      const platform = doc.data().platform || doc.id;
      const pData = doc.data();

      platformBreakdown[platform] = {
        problemsSolved: toNum(pData.totalSolved || pData.problemsSolved || pData.problemsSolvedTotal, 0),
        rating: toNum(pData.rating, null),
        contests: toNum(pData.contestsAttended || pData.attendedContests || pData.totalContests, 0),
        ...pData,
      };
    });

    return {
      student: {
        studentId,
        fullName: data.fullName,
        branch: data.branch,
        section: data.section,
        yearOfStudy: data.yearOfStudy,
        rollNumber: data.rollNumber,
        graduationYear: data.graduationYear,
        collegeEmail: data.collegeEmail,
        personalEmail: data.personalEmail,
        phone: data.phone,
        cpScores: {
          codeSyncScore: toNum(data.cpScores?.codeSyncScore, 0),
          displayScore: toNum(data.cpScores?.displayScore, 0),
          totalProblemsSolved: toNum(data.cpScores?.totalProblemsSolved, 0),
          platformSkills: data.cpScores?.platformSkills || {},
          breakdown: platformBreakdown,
          lastComputedAt: toISO(data.cpScores?.lastComputedAt),
        },
        cpHandles: data.cpHandles || {},
        lastActiveAt: toISO(data.lastActiveAt),
        onboardingCompleted: data.onboardingCompleted,
      },
    };
  } catch (err: any) {
    throw new Error(`Failed to get student details: ${err.message}`);
  }
}

/**
 * GET /instructor/cohort-filters
 */
export async function getCohortFilters() {
  try {
    const snapshot = await studentsCol.get();

    const branches = new Set<string>();
    const sections = new Set<string>();
    const years = new Set<string>();

    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.branch) branches.add(data.branch);
      if (data.section) sections.add(data.section);
      if (data.yearOfStudy) years.add(data.yearOfStudy);
    });

    return {
      branches: Array.from(branches).map((b) => ({
        label: b,
        value: b,
        studentCount: snapshot.docs.filter((d) => d.data().branch === b).length,
      })),
      sections: Array.from(sections).map((s) => ({
        label: s,
        value: s,
        studentCount: snapshot.docs.filter((d) => d.data().section === s).length,
      })),
      years: Array.from(years).map((y) => ({
        label: `${y} Year`,
        value: y,
        studentCount: snapshot.docs.filter((d) => d.data().yearOfStudy === y).length,
      })),
      platforms: [
        { label: "LeetCode", value: "leetcode", engagementRate: 0.89 },
        { label: "CodeChef", value: "codechef", engagementRate: 0.78 },
        { label: "HackerRank", value: "hackerrank", engagementRate: 0.82 },
        { label: "Codeforces", value: "codeforces", engagementRate: 0.65 },
        { label: "GitHub", value: "github", engagementRate: 0.72 },
        { label: "AtCoder", value: "atcoder", engagementRate: 0.40 },
      ],
    };
  } catch (err: any) {
    throw new Error(`Failed to get filters: ${err.message}`);
  }
}
```

---

## 🧮 ANALYTICS ENGINE

### backend/src/lib/analyticsEngine.ts

```typescript
/**
 * Platform signal computation
 * Maps raw platform stats to 0-100 scale
 */
export function computePlatformSignal(platform: string, stats: any | null): number {
  if (!stats) return 0;

  switch (platform) {
    case "leetcode": {
      const solved = toNum(stats.totalSolved ?? stats.solved ?? stats.problemsSolved, 0);
      return clamp(Math.log10(1 + solved) * 35);
    }

    case "codeforces": {
      const solved = toNum(stats.problemsSolvedTotal ?? stats.problemsSolved, 0);
      const rating = toNum(stats.rating, 0);
      return clamp((Math.log10(1 + solved) * 20) + (rating / 40));
    }

    case "codechef": {
      const solved =
        toNum(stats.fullySolved, 0) +
        toNum(stats.partiallySolved, 0) * 0.5;
      return clamp(Math.log10(1 + solved) * 30);
    }

    case "hackerrank": {
      const solved = toNum(stats.problemsSolved, 0);
      const badges = toNum(stats.badgesCount, 0);
      return clamp((Math.log10(1 + solved) * 25) + (badges * 2));
    }

    case "github": {
      const stars = toNum(stats.starsReceived ?? stats.totalStars, 0);
      const repos = toNum(stats.publicRepos, 0);
      const followers = toNum(stats.followers, 0);
      return clamp((Math.log10(1 + repos) * 15) + (Math.log10(1 + stars) * 15) + (followers * 0.5));
    }

    case "atcoder": {
      const rating = toNum(stats.rating, 0);
      return clamp(Math.min(100, (rating / 30) * 10));
    }

    default:
      return 0;
  }
}

export function clamp(n: number, a = 0, b = 100): number {
  return Math.max(a, Math.min(b, n));
}

export function toNum(x: any, fallback = 0): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function toISO(x: any): string | null {
  if (!x) return null;

  // Firestore Timestamp
  if (typeof x?.toDate === "function") {
    const d = x.toDate();
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Timestamp-like { seconds, nanoseconds }
  if (typeof x?.seconds === "number") {
    const d = new Date(x.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Already ISO
  if (typeof x === "string") {
    return x;
  }

  return null;
}

export function withinLastDays(isoOrMillis: any, days: number): boolean {
  const iso = toISO(isoOrMillis);
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}
```

---

## 🔗 ROUTES INTEGRATION

### Add to backend/src/routes/instructor.routes.ts

```typescript
import { getCohortStats, getStudentsList, getStudentDetail, getCohortFilters } from "../services/instructorService";
import { verifyInstructorAuth } from "../middleware/instructorAuth.middleware";

// GET /api/instructor/cohort-stats
router.get(
  "/cohort-stats",
  authMiddleware,
  verifyInstructorAuth,
  async (req: AuthedReq, res: Response) => {
    try {
      const { branch, section, year, refreshScores } = req.query;

      const stats = await getCohortStats({
        branch: branch as string | undefined,
        section: section as string | undefined,
        year: year as string | undefined,
        refreshScores: refreshScores === "true",
      });

      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/instructor/students
router.get(
  "/students",
  authMiddleware,
  verifyInstructorAuth,
  async (req: AuthedReq, res: Response) => {
    try {
      const result = await getStudentsList({
        branch: req.query.branch as string,
        section: req.query.section as string,
        year: req.query.year as string,
        searchQuery: req.query.searchQuery as string,
        scoreMin: req.query.scoreMin ? Number(req.query.scoreMin) : undefined,
        scoreMax: req.query.scoreMax ? Number(req.query.scoreMax) : undefined,
        activityFilter: req.query.activityFilter as any,
        sortBy: (req.query.sortBy as any) || "score",
        sortOrder: (req.query.sortOrder as any) || "desc",
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/instructor/student/:studentId
router.get(
  "/student/:studentId",
  authMiddleware,
  verifyInstructorAuth,
  async (req: AuthedReq, res: Response) => {
    try {
      const result = await getStudentDetail(req.params.studentId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/instructor/cohort-filters
router.get(
  "/cohort-filters",
  authMiddleware,
  verifyInstructorAuth,
  async (req: AuthedReq, res: Response) => {
    try {
      const result = await getCohortFilters();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
);
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Backend (Week 1)
- [ ] Create `instructorService.ts` with all query functions
- [ ] Create `analyticsEngine.ts` with signal computation
- [ ] Create `instructorAuth.middleware.ts` for authorization
- [ ] Add routes to `instructor.routes.ts`
- [ ] Test all endpoints with Postman
- [ ] Add pagination to students endpoint
- [ ] Implement search/filter logic

### Phase 2: Frontend (Week 2)
- [ ] Create `instructorApi.ts` client
- [ ] Build component library (5 components)
- [ ] Create `InstructorDashboard.tsx`
- [ ] Create `InstructorStudents.tsx`
- [ ] Create `InstructorAnalytics.tsx` (phase 2)
- [ ] Wire up API calls
- [ ] Add loading/error states

### Phase 3: Testing (Week 3)
- [ ] Unit test backend services
- [ ] Integration test endpoints
- [ ] Component tests
- [ ] E2E tests
- [ ] Performance testing
- [ ] Security review

---

## 🚀 DEPLOYMENT NOTES

1. **Environment Variables**: Add instructor access level config to `.env`
2. **Database Indexes**: Create Firestore composite indexes for complex queries
3. **Caching**: Consider caching cohort stats (recompute every 1 hour)
4. **Rate Limiting**: Limit dashboard requests to 60 per minute per instructor
5. **Monitoring**: Log all instructor actions for audit trail

---

**Version**: 1.0  
**Last Updated**: Jan 31, 2026
