# CodeSync - Instructor Dashboard: Complete Analysis & Implementation Plan

---

## 📋 TABLE OF CONTENTS

1. [Data Storage Architecture](#1-data-storage-architecture)
2. [Student Segregation Strategy](#2-student-segregation-strategy)
3. [Frontend Design System](#3-frontend-design-system)
4. [Instructor Dashboard Design](#4-instructor-dashboard-design)
5. [Backend API Requirements](#5-backend-api-requirements)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. DATA STORAGE ARCHITECTURE

### 1.1 Database Structure (Firestore)

```
Firestore Database
├── users/                              # Instructors & Admins only
│   └── {userId}
│       ├── email: string
│       ├── name: string
│       ├── role: "instructor" | "admin"
│       ├── firebaseUid: null          # NOT used for instructors (only Google OAuth)
│       ├── photoURL?: string
│       ├── status: "active" | "inactive"
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
├── instructors/                        # Instructor login credentials
│   └── {userId}                        # Links to users/{userId}
│       ├── userId: string              # Foreign key to users
│       ├── passwordHash: string        # bcryptjs hashed
│       ├── createdAt: Timestamp
│       └── updatedAt: Timestamp
│
└── students/                           # All student profiles
    └── {studentId}                     # Firebase UID or generated ID
        ├── fullName: string
        ├── branch: string              # CSE, ECE, MECH, etc.
        ├── section: string             # A, B, C, D, etc.
        ├── yearOfStudy: string         # 1, 2, 3, 4
        ├── rollNumber: string          # Unique per student
        ├── graduationYear?: string     # 2024, 2025, 2026, etc.
        ├── collegeEmail?: string
        ├── personalEmail?: string
        ├── phone?: string
        ├── profile?: { bio, skills, ... }
        ├── cpHandles: {                # Platform usernames
        │   ├── leetcode: string | null
        │   ├── codeforces: string | null
        │   ├── codechef: string | null
        │   ├── github: string | null
        │   ├── hackerrank: string | null
        │   └── atcoder: string | null
        ├── cpScores: {                 # Aggregated scores
        │   ├── codeSyncScore: number   # Raw sum
        │   ├── displayScore: number    # 0-100 scale
        │   ├── totalProblemsSolved: number
        │   ├── platformSkills: {       # Per-platform normalized scores
        │   │   ├── leetcode: number
        │   │   ├── codeforces: number
        │   │   ├── codechef: number
        │   │   ├── github: number
        │   │   ├── hackerrank: number
        │   │   └── atcoder: number
        │   ├── lastComputedAt: Timestamp
        │   └── updatedAt: Timestamp
        ├── onboardingCompleted: boolean
        ├── lastActiveAt?: Timestamp | null
        ├── status: "active" | "inactive"
        ├── createdAt: Timestamp
        ├── updatedAt: Timestamp
        └── cpProfiles/                 # Sub-collection: Platform stats
            ├── leetcode/
            │   ├── platform: "leetcode"
            │   ├── handle: string
            │   ├── totalSolved: number
            │   ├── solvedEasy/Medium/Hard: number
            │   ├── rating: number | null
            │   ├── contestRating: number
            │   ├── attendedContests: number
            │   ├── languages: { python, cpp, ... }
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── codeforces/
            │   ├── platform: "codeforces"
            │   ├── handle: string
            │   ├── problemsSolvedTotal: number
            │   ├── rating: number | null
            │   ├── maxRating: number | null
            │   ├── rank: string
            │   ├── contestsAttended: number
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── codechef/
            │   ├── platform: "codechef"
            │   ├── handle: string
            │   ├── fullySolved: number
            │   ├── partiallySolved: number
            │   ├── currentRating: number | null
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── hackerrank/
            │   ├── platform: "hackerrank"
            │   ├── handle: string
            │   ├── problemsSolved: number
            │   ├── badges: object[]
            │   ├── certificates: object[]
            │   ├── lastScrapedAt: Timestamp
            │   └── updatedAt: Timestamp
            │
            ├── github/
            │   ├── platform: "github"
            │   ├── handle: string
            │   ├── contributionsLastYear: number
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
                ├── lastScrapedAt: Timestamp
                └── updatedAt: Timestamp
```

### 1.2 Key Data Relationships

| Concept | Storage | Query Pattern |
|---------|---------|---------------|
| **Student Identity** | `students/{studentId}` | Direct doc read or query by roll number |
| **Scores** | `students/{studentId}/cpScores` | Aggregated at top level for performance |
| **Platform Details** | `students/{studentId}/cpProfiles/{platform}` | Sub-collection for granular stats |
| **Leaderboard** | Query `students` collection, sort by `cpScores.displayScore` | Filter by branch/section/year |
| **Instructor Access** | Query/aggregate `students` collection | No direct link to instructor |

---

## 2. STUDENT SEGREGATION STRATEGY

### 2.1 Segregation Dimensions

Students can be segregated across **4 dimensions**:

#### A. **BRANCH**
- CSE (Computer Science & Engineering)
- ECE (Electronics & Communication)
- MECH (Mechanical Engineering)
- CIVIL (Civil Engineering)
- EEE (Electrical Engineering)
- BIO (Biomedical Engineering)
- *etc.*

**Storage**: `student.branch` (e.g., "CSE")

**Query**: 
```typescript
db.collection("students").where("branch", "==", "CSE")
```

#### B. **SECTION**
- A, B, C, D (typically 60-70 students per section)
- Hierarchy: Branch → Sections within branch
- Not independent (e.g., "CSE-A", "CSE-B", etc.)

**Storage**: `student.section` (e.g., "A")

**Query**:
```typescript
db.collection("students")
  .where("branch", "==", "CSE")
  .where("section", "==", "A")
```

#### C. **YEAR OF STUDY**
- 1, 2, 3, 4 (or "First Year", "Second Year", etc.)
- All branches have all years

**Storage**: `student.yearOfStudy` (e.g., "2")

**Query**:
```typescript
db.collection("students").where("yearOfStudy", "==", "2")
```

#### D. **GRADUATION YEAR**
- 2024, 2025, 2026, 2027
- Computed from: yearOfStudy + current year
- Used for cohort tracking

**Storage**: `student.graduationYear` (e.g., "2025")

**Query**:
```typescript
db.collection("students").where("graduationYear", "==", "2025")
```

### 2.2 Segregation Rules & Permissions

```
Instructor Visibility Model:

┌─────────────────────────────────────────────────┐
│  COLLEGE ADMIN                                  │
│  └─ Can see ALL students across ALL branches    │
│                                                 │
│  BRANCH INSTRUCTOR (e.g., CSE)                 │
│  └─ Can see ONLY CSE students                   │
│     └─ Can filter by section (A, B, C, D)      │
│     └─ Can filter by year (1, 2, 3, 4)         │
│                                                 │
│  SECTION INSTRUCTOR (e.g., CSE-A)              │
│  └─ Can see ONLY CSE-A students                │
│     └─ Can see all years in that section       │
│                                                 │
│  SUBJECT INSTRUCTOR                            │
│  └─ Can see students from ASSIGNED sections    │
│     └─ All years in assigned sections          │
└─────────────────────────────────────────────────┘
```

### 2.3 Database Query Patterns for Segregation

```typescript
// Get all students in CSE branch
db.collection("students").where("branch", "==", "CSE");

// Get all students in CSE-A section
db.collection("students")
  .where("branch", "==", "CSE")
  .where("section", "==", "A");

// Get all 2nd year students (across all branches)
db.collection("students").where("yearOfStudy", "==", "2");

// Get all students graduating in 2025
db.collection("students").where("graduationYear", "==", "2025");

// Get high performers in CSE (score > 70)
db.collection("students")
  .where("branch", "==", "CSE")
  .where("cpScores.displayScore", ">=", 70);
```

---

## 3. FRONTEND DESIGN SYSTEM

### 3.1 Current Design Theme

The student dashboard uses a **dark theme** with careful color segregation:

```
Color Palette:
├── Base: slate-950 (dark background)
├── Text: slate-100 (light foreground)
│
├── Platform Colors (for visual hierarchy):
│   ├── LeetCode:   amber   (from-amber-400/80 to-amber-200/40)
│   ├── CodeChef:   amber   (from-stone-200/70 to-amber-200/40)
│   ├── HackerRank: emerald (from-emerald-400/80 to-teal-300/50)
│   ├── Codeforces: sky     (from-sky-400/80 to-indigo-400/60)
│   ├── GitHub:     slate   (from-slate-200/70 to-slate-500/40)
│   └── AtCoder:    cyan    (from-cyan-400/80 to-sky-200/50)
│
└── Utility Colors:
    ├── Success: green/emerald
    ├── Warning: amber/yellow
    ├── Error: red/rose
    ├── Info: blue/sky
    └── Neutral: slate/gray
```

### 3.2 Component Patterns

**Card Style**:
```tsx
className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm"
```

**Button Style**:
```tsx
className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium transition"
```

**Badge/Chip Style**:
```tsx
className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-200 border border-amber-400/40"
```

**Stat Display**:
```tsx
className="text-2xl font-bold text-amber-300"  // Large number
className="text-xs text-slate-400 uppercase tracking-wider"  // Label
```

### 3.3 Layout Patterns

**Grid Layout** (Dashboard):
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```

**Flex Layout** (Lists):
```tsx
className="flex flex-col gap-4"
```

**Header Pattern**:
```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-bold">Title</h1>
  <button>Action</button>
</div>
```

---

## 4. INSTRUCTOR DASHBOARD DESIGN

### 4.1 Dashboard Structure & Pages

```
Instructor Dashboard
├── /instructor/dashboard          # Main overview + cohort stats
├── /instructor/students           # Detailed student list + filter/search
├── /instructor/analytics          # Advanced insights & trends
├── /instructor/settings           # Instructor preferences & access control
└── /instructor/reports            # (Future) Export & reporting
```

### 4.2 Core Metrics & Analytics

#### **A. COHORT OVERVIEW**
```
┌─────────────────────────────────────┐
│  Cohort Summary Cards               │
├─────────────────────────────────────┤
│ Total Students    │ Branch Avg      │
│ ────────────────  │ ───────────────│
│ 120 CSE-A         │ 65.3 (CSE)     │
│                   │ 72.1 (ECE)     │
│ Active Last 7d    │ 110 / 120      │
│                   │ (91.7%)        │
│                   │                │
│ Onboarded         │ Top Performer  │
│ ──────────────    │ ─────────────│
│ 118 / 120         │ Rudra0        │
│ (98.3%)           │ Score: 89.2   │
└─────────────────────────────────────┘
```

#### **B. SCORE DISTRIBUTION**
```
Score Distribution (Histogram)
├── 90-100: █████ (5 students)
├── 80-90:  ████████████ (12 students)
├── 70-80:  ██████████████████ (18 students)
├── 60-70:  ████████████████ (17 students)
├── 50-60:  ██████ (6 students)
├── 40-50:  ███ (3 students)
└── 0-40:   █ (1 student)

Mean: 68.4
Median: 71.2
Std Dev: 12.8
```

#### **C. PLATFORM ENGAGEMENT**
```
Platform Heatmap
         LeetCode  CodeChef  HackerRank  Codeforces  GitHub  AtCoder
CSE-A      95%       78%        82%         65%       72%      40%
CSE-B      92%       81%        79%         68%       75%      38%
ECE-A      88%       72%        85%         62%       80%      35%

Legend:
█ 90-100%  █ 70-90%  █ 50-70%  █ 30-50%  █ 0-30%
```

#### **D. ACTIVITY HEATMAP**
```
Last Active Analysis
├── Last 7 days:    115 students (95.8%)
├── Last 14 days:   118 students (98.3%)
├── Last 30 days:   119 students (99.2%)
└── Inactive:       1 student   (0.8%)

Trend Line: ↗ (+12% from last week)
```

#### **E. SKILL PROGRESSION**
```
Week-over-Week Growth
Platform        Avg Score Change
────────────────────────────────
LeetCode        +2.3 points
CodeChef        +1.8 points
HackerRank      +3.1 points
Codeforces      +0.9 points
GitHub          +1.5 points
AtCoder         +0.4 points

Overall Cohort: +1.67 avg points/week
```

#### **F. TOP PERFORMERS**
```
┌──────┬───────────────┬──────────┬────────────┐
│ Rank │ Name          │ Branch   │ Score      │
├──────┼───────────────┼──────────┼────────────┤
│ 1    │ Rudra0        │ CSE-A    │ 89.2       │
│ 2    │ mdecoder24    │ CSE-B    │ 86.5       │
│ 3    │ Junaid12      │ ECE-A    │ 84.3       │
│ 4    │ Krishna23     │ CSE-A    │ 82.9       │
│ 5    │ Amandeep99    │ CSE-B    │ 81.7       │
└──────┴───────────────┴──────────┴────────────┘
```

#### **G. AT-RISK STUDENTS**
```
Low Activity / Low Score
┌──────┬────────────┬────────────┬────────────┐
│ Name │ Last Active│ Score      │ Status     │
├──────┼────────────┼────────────┼────────────┤
│ John │ 12d ago    │ 28.3       │ Inactive   │
│ Priya│ 5d ago     │ 34.5       │ Low Score  │
│ Amit │ 3d ago     │ 41.2       │ Low Score  │
└──────┴────────────┴────────────┴────────────┘
```

### 4.3 Filter & Search Capabilities

```
Filters Available:
├── Branch      [CSE ▼] [ECE ▼] [MECH ▼] ...
├── Section     [All ▼]
├── Year        [1 ▼] [2 ▼] [3 ▼] [4 ▼]
├── Score Range [Min: 0] [Max: 100]
├── Activity    [Active] [Inactive] [Last 7d]
├── Platform    [LeetCode] [CodeChef] [GitHub] ...
└── Custom      [Search by name, roll number, handle...]
```

### 4.4 Detailed Student View

When clicking on a student:

```
┌─────────────────────────────────────────┐
│ Student: Rudra0                         │
│ Branch: CSE | Section: A | Year: 3     │
│ Roll: 211001 | Grad: 2025              │
├─────────────────────────────────────────┤
│                                         │
│ Overall Score: 89.2 / 100              │
│ ═══════════════════════  89%            │
│                                         │
│ Platform Breakdown:                    │
│ LeetCode:    88  ████████████████      │
│ CodeChef:    86  ██████████████        │
│ HackerRank:  91  ██████████████████    │
│ Codeforces:  87  ███████████████       │
│ GitHub:      84  ██████████████        │
│ AtCoder:     76  ████████████          │
│                                         │
│ Recent Activity:                       │
│ - Updated LeetCode 2 hours ago         │
│ - Solved 5 problems this week          │
│ - +2.5 score improvement since last mo │
│                                         │
│ Coding Handles:                        │
│ LeetCode: Rudra0                       │
│ CodeChef: rudra02                      │
│ GitHub: mdecoder24                     │
│ ...                                    │
└─────────────────────────────────────────┘
```

---

## 5. BACKEND API REQUIREMENTS

### 5.1 Authentication & Authorization

**Endpoint**: `POST /api/auth/instructor/login`
```typescript
Request: {
  email: string;
  password: string;
}

Response: {
  token: string;              // JWT
  userId: string;
  name: string;
  role: "instructor";
  accessLevel: "college" | "branch" | "section";  // NEW
  assignedBranch?: string;    // e.g., "CSE"
  assignedSections?: string[]; // e.g., ["A", "B"]
}
```

**JWT Payload** (instructor):
```typescript
{
  sub: string;                // userId
  role: "instructor";
  email: string;
  name: string;
  accessLevel: "college" | "branch" | "section";
  assignedBranch?: string;
  assignedSections?: string[];
  iat: number;
  exp: number;
}
```

### 5.2 Instructor Dashboard APIs

#### **GET /api/instructor/cohort-stats**
Returns aggregated statistics for the cohort the instructor can access.

```typescript
Query Params:
  ?branch=CSE                    // Optional filter
  &section=A                      // Optional filter
  &year=2                         // Optional filter
  &refreshScores=false            // Optional: trigger score recompute

Response: {
  cohort: {
    totalStudents: number;
    activeLastWeek: number;
    activePercentage: number;
    onboardedCount: number;
    onboardingPercentage: number;
  };
  
  scores: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    quartiles: {
      q1: number;
      q2: number;
      q3: number;
    };
  };
  
  distribution: {
    "90-100": number;
    "80-90": number;
    "70-80": number;
    "60-70": number;
    "50-60": number;
    "40-50": number;
    "0-40": number;
  };
  
  topPerformers: {
    studentId: string;
    name: string;
    score: number;
    platform: string;
  }[];
  
  atRiskStudents: {
    studentId: string;
    name: string;
    score: number;
    lastActive: string;  // ISO timestamp
    reason: "low_score" | "inactive" | "not_onboarded";
  }[];
  
  lastUpdated: string;  // ISO timestamp
}
```

#### **GET /api/instructor/students**
Returns paginated list of students with filters.

```typescript
Query Params:
  ?branch=CSE
  &section=A
  &year=2
  &searchQuery=Rudra
  &scoreMin=70
  &scoreMax=100
  &activityFilter=last7days     // "last7days" | "last30days" | "inactive"
  &sortBy=score                 // "score" | "name" | "branch" | "lastActive"
  &sortOrder=desc               // "asc" | "desc"
  &page=1
  &limit=50

Response: {
  students: {
    studentId: string;
    fullName: string;
    branch: string;
    section: string;
    yearOfStudy: string;
    rollNumber: string;
    cpScores: {
      displayScore: number;
      platformSkills: {
        leetcode: number;
        codeforces: number;
        codechef: number;
        github: number;
        hackerrank: number;
        atcoder: number;
      };
      lastComputedAt: string;
    };
    cpHandles: {
      leetcode?: string;
      codeforces?: string;
      codechef?: string;
      github?: string;
      hackerrank?: string;
      atcoder?: string;
    };
    lastActiveAt?: string;
    onboardingCompleted: boolean;
  }[];
  
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### **GET /api/instructor/student/:studentId**
Returns detailed view of a single student.

```typescript
Response: {
  student: {
    studentId: string;
    fullName: string;
    branch: string;
    section: string;
    yearOfStudy: string;
    rollNumber: string;
    graduationYear: string;
    collegeEmail?: string;
    personalEmail?: string;
    phone?: string;
    cpScores: {
      codeSyncScore: number;
      displayScore: number;
      totalProblemsSolved: number;
      platformSkills: {
        leetcode: number;
        codeforces: number;
        codechef: number;
        github: number;
        hackerrank: number;
        atcoder: number;
      };
      breakdown: {
        leetcode: { problemsSolved, rating, contests };
        codeforces: { problemsSolved, rating, contests };
        codechef: { problemsSolved, rating };
        github: { repos, followers, stars };
        hackerrank: { problemsSolved, badges };
        atcoder: { rating, contests };
      };
      lastComputedAt: string;
    };
    cpHandles: {
      leetcode?: string;
      codeforces?: string;
      codechef?: string;
      github?: string;
      hackerrank?: string;
      atcoder?: string;
    };
    activityTimeline: {
      date: string;
      platform: string;
      action: string;  // "updated_profile", "solved_problem", etc.
    }[];
    trends: {
      weekOverWeekGrowth: number;
      monthOverMonthGrowth: number;
      platformGrowth: {
        leetcode: number;
        codeforces: number;
        codechef: number;
        github: number;
        hackerrank: number;
        atcoder: number;
      };
    };
    lastActiveAt?: string;
    onboardingCompleted: boolean;
  };
}
```

#### **GET /api/instructor/analytics**
Advanced analytics endpoint.

```typescript
Query Params:
  ?branch=CSE
  &section=A
  &year=2
  &timeRange=30days            // "7days" | "30days" | "90days" | "all"

Response: {
  platformEngagement: {
    leetcode: { engaged: number; percentage: number };
    codeforces: { engaged: number; percentage: number };
    codechef: { engaged: number; percentage: number };
    github: { engaged: number; percentage: number };
    hackerrank: { engaged: number; percentage: number };
    atcoder: { engaged: number; percentage: number };
  };
  
  skillProgression: {
    overall: {
      weeklyGrowth: number;
      monthlyGrowth: number;
      trend: "up" | "down" | "flat";
    };
    byPlatform: {
      leetcode: { weeklyGrowth, monthlyGrowth, trend };
      codeforces: { weeklyGrowth, monthlyGrowth, trend };
      // ... other platforms
    };
  };
  
  activityMetrics: {
    activeNow: number;
    activeLastWeek: number;
    activeLastMonth: number;
    inactiveDays: number;
  };
  
  cohortComparison: {
    thisSection: {
      avgScore: number;
      stdDev: number;
    };
    thisYear: {
      avgScore: number;
      stdDev: number;
    };
    thisBranch: {
      avgScore: number;
      stdDev: number;
    };
    collegewide: {
      avgScore: number;
      stdDev: number;
    };
  };
  
  predictedPerformance: {
    // ML-powered predictions (future)
    likelyTopPerformers: string[];  // studentIds
    atRiskStudents: string[];       // studentIds
    probabilities: {
      [studentId]: {
        successProbability: number;
        riskLevel: "low" | "medium" | "high";
      };
    };
  };
}
```

#### **POST /api/instructor/refresh-cohort**
Manually trigger score recomputation for a cohort.

```typescript
Body: {
  branch?: string;
  section?: string;
  year?: string;
}

Response: {
  message: string;
  jobId: string;
  estimatedTime: "30 seconds" | "1 minute" | "5 minutes";
}
```

#### **GET /api/instructor/cohort-filters**
Returns available filter options.

```typescript
Response: {
  branches: [
    { label: "CSE", value: "CSE", studentCount: 120 },
    { label: "ECE", value: "ECE", studentCount: 95 },
    // ...
  ];
  
  sections: [
    { label: "A", value: "A", studentCount: 60 },
    { label: "B", value: "B", studentCount: 60 },
    // ...
  ];
  
  years: [
    { label: "1st Year", value: "1", studentCount: 102 },
    { label: "2nd Year", value: "2", studentCount: 98 },
    // ...
  ];
  
  platforms: [
    { label: "LeetCode", value: "leetcode", engagementRate: 0.89 },
    // ...
  ];
}
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Backend APIs (Week 1-2)

- [ ] Implement `/api/instructor/cohort-stats`
- [ ] Implement `/api/instructor/students` (with filters)
- [ ] Implement `/api/instructor/student/:studentId`
- [ ] Implement `/api/instructor/analytics`
- [ ] Implement `/api/instructor/cohort-filters`
- [ ] Implement `/api/instructor/refresh-cohort`
- [ ] Add instructor authorization middleware
- [ ] Add comprehensive error handling

### Phase 2: Frontend - Dashboard Pages (Week 2-3)

- [ ] Create `/pages/instructor/InstructorDashboard.tsx`
  - Cohort overview cards
  - Score distribution chart
  - Top performers section
  - At-risk students alert
  - Quick stat cards

- [ ] Create `/pages/instructor/InstructorStudents.tsx`
  - Student list table
  - Advanced filters (branch, section, year, score range)
  - Search functionality
  - Sorting options
  - Pagination
  - Click to view detail

- [ ] Create `/pages/instructor/InstructorAnalytics.tsx`
  - Platform engagement heatmap
  - Skill progression trends
  - Activity timeline
  - Cohort comparison
  - Export functionality

### Phase 3: Frontend - UI Components (Week 3-4)

- [ ] Create reusable chart components
  - Bar chart (score distribution)
  - Line chart (trends)
  - Heatmap (platform engagement)
  - Gauge (score)

- [ ] Create reusable table components
  - Sortable headers
  - Pagination controls
  - Row actions
  - Status badges

- [ ] Create filter/search components
  - Multi-select dropdowns
  - Range sliders
  - Search input
  - Filter chips

### Phase 4: Polish & Testing (Week 4)

- [ ] Add loading states & error boundaries
- [ ] Implement responsive design
- [ ] Add animations & transitions
- [ ] Write unit tests for APIs
- [ ] Perform end-to-end testing
- [ ] Optimize performance

---

## 7. COLOR PALETTE FOR INSTRUCTOR DASHBOARD

Use the same dark theme as students, with hierarchical color coding:

```
Primary Actions:     blue-600 / blue-500
Secondary Actions:   slate-600
Success/Active:      green-500 / emerald-500
Warning/At-Risk:     amber-500 / yellow-500
Error/Inactive:      red-500 / rose-500
Info/Stats:          sky-500 / cyan-500
Neutral/Backgrounds: slate-900 / slate-800 / slate-700

Card Background:     rgba(15, 23, 42, 0.5)  // slate-900/50
Border Color:        rgba(51, 65, 85, 0.5)  // slate-700/50
```

---

## 8. QUICK REFERENCE: STUDENT VS INSTRUCTOR VIEWS

| Feature | Student | Instructor |
|---------|---------|-----------|
| Can see own profile | ✅ | Only if admin |
| Can see leaderboard | ✅ (filtered) | ✅ (full access) |
| Can edit own scores | ❌ | ✅ (admin only) |
| Can view analytics | ❌ | ✅ |
| Can manage students | ❌ | ✅ |
| Can filter by branch | ❌ | ✅ |
| Can export data | ❌ | ✅ (future) |
| Can trigger refreshes | ❌ | ✅ |

---

## 9. NEXT STEPS

1. **Review this document** with your team
2. **Design mockups** for the instructor dashboard (Figma)
3. **Start backend implementation** (APIs first)
4. **Build frontend components** in parallel
5. **Integrate and test** end-to-end
6. **Deploy** in phases

---

**Document Version**: 1.0
**Created**: Jan 31, 2026
**Last Updated**: Jan 31, 2026
