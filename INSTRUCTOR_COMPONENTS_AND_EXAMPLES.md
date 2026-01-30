# Instructor Dashboard - Implementation Guide & Component Examples

---

## 📁 FILE STRUCTURE TO CREATE

```
frontend/src/
├── pages/
│   └── instructor/
│       ├── InstructorDashboard.tsx          # Main dashboard
│       ├── InstructorStudents.tsx           # Student list & filters
│       ├── InstructorAnalytics.tsx          # Advanced analytics
│       └── InstructorSettings.tsx           # (Already exists)
│
├── components/
│   └── instructor/
│       ├── CohortStatsCard.tsx              # Summary stats
│       ├── ScoreDistributionChart.tsx       # Histogram
│       ├── PlatformEngagementHeatmap.tsx    # Platform usage
│       ├── TopPerformersCard.tsx            # Top 5 students
│       ├── AtRiskStudentsCard.tsx           # Alert list
│       ├── StudentFilterBar.tsx             # Filter controls
│       ├── StudentTable.tsx                 # Data table
│       └── SkillProgressionChart.tsx        # Trend lines
│
└── lib/
    ├── instructorApi.ts                     # API client methods
    └── instructorUtils.ts                   # Helper functions
```

---

## 🔌 API INTEGRATION FILE

### frontend/src/lib/instructorApi.ts

```typescript
import apiClient from "./apiClient";

export interface CohortStatsResponse {
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
    quartiles: { q1: number; q2: number; q3: number };
  };
  distribution: Record<string, number>;
  topPerformers: Array<{
    studentId: string;
    name: string;
    score: number;
    platform: string;
  }>;
  atRiskStudents: Array<{
    studentId: string;
    name: string;
    score: number;
    lastActive: string;
    reason: "low_score" | "inactive" | "not_onboarded";
  }>;
  lastUpdated: string;
}

export interface StudentListResponse {
  students: Array<{
    studentId: string;
    fullName: string;
    branch: string;
    section: string;
    yearOfStudy: string;
    rollNumber: string;
    cpScores: {
      displayScore: number;
      platformSkills: Record<string, number>;
      lastComputedAt: string;
    };
    cpHandles: Record<string, string>;
    lastActiveAt?: string;
    onboardingCompleted: boolean;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AnalyticsResponse {
  platformEngagement: Record<string, { engaged: number; percentage: number }>;
  skillProgression: {
    overall: { weeklyGrowth: number; monthlyGrowth: number; trend: "up" | "down" | "flat" };
    byPlatform: Record<string, any>;
  };
  activityMetrics: {
    activeNow: number;
    activeLastWeek: number;
    activeLastMonth: number;
    inactiveDays: number;
  };
  cohortComparison: {
    thisSection: { avgScore: number; stdDev: number };
    thisYear: { avgScore: number; stdDev: number };
    thisBranch: { avgScore: number; stdDev: number };
    collegewide: { avgScore: number; stdDev: number };
  };
}

/**
 * Get cohort statistics
 */
export async function getCohortStats(filters?: {
  branch?: string;
  section?: string;
  year?: string;
  refreshScores?: boolean;
}): Promise<CohortStatsResponse> {
  const params = new URLSearchParams();
  if (filters?.branch) params.append("branch", filters.branch);
  if (filters?.section) params.append("section", filters.section);
  if (filters?.year) params.append("year", filters.year);
  if (filters?.refreshScores) params.append("refreshScores", "true");

  const response = await apiClient.get(`/instructor/cohort-stats?${params}`);
  return response.data;
}

/**
 * Get student list with filters and pagination
 */
export async function getStudentsList(options?: {
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
}): Promise<StudentListResponse> {
  const params = new URLSearchParams();
  if (options?.branch) params.append("branch", options.branch);
  if (options?.section) params.append("section", options.section);
  if (options?.year) params.append("year", options.year);
  if (options?.searchQuery) params.append("searchQuery", options.searchQuery);
  if (options?.scoreMin !== undefined) params.append("scoreMin", String(options.scoreMin));
  if (options?.scoreMax !== undefined) params.append("scoreMax", String(options.scoreMax));
  if (options?.activityFilter) params.append("activityFilter", options.activityFilter);
  if (options?.sortBy) params.append("sortBy", options.sortBy);
  if (options?.sortOrder) params.append("sortOrder", options.sortOrder);
  if (options?.page) params.append("page", String(options.page));
  if (options?.limit) params.append("limit", String(options.limit));

  const response = await apiClient.get(`/instructor/students?${params}`);
  return response.data;
}

/**
 * Get detailed student view
 */
export async function getStudentDetails(studentId: string) {
  const response = await apiClient.get(`/instructor/student/${studentId}`);
  return response.data;
}

/**
 * Get advanced analytics
 */
export async function getAnalytics(filters?: {
  branch?: string;
  section?: string;
  year?: string;
  timeRange?: "7days" | "30days" | "90days" | "all";
}): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  if (filters?.branch) params.append("branch", filters.branch);
  if (filters?.section) params.append("section", filters.section);
  if (filters?.year) params.append("year", filters.year);
  if (filters?.timeRange) params.append("timeRange", filters.timeRange);

  const response = await apiClient.get(`/instructor/analytics?${params}`);
  return response.data;
}

/**
 * Get available filter options
 */
export async function getCohortFilters() {
  const response = await apiClient.get("/instructor/cohort-filters");
  return response.data;
}

/**
 * Manually refresh scores for a cohort
 */
export async function refreshCohortScores(filters?: {
  branch?: string;
  section?: string;
  year?: string;
}): Promise<{ message: string; jobId: string; estimatedTime: string }> {
  const response = await apiClient.post("/instructor/refresh-cohort", filters);
  return response.data;
}
```

---

## 🎨 COMPONENT EXAMPLES

### 1. CohortStatsCard.tsx

```typescript
import React from "react";
import { FiUsers, FiActivity, FiTrendingUp, FiCheckCircle } from "react-icons/fi";

type CohortStats = {
  totalStudents: number;
  activeLastWeek: number;
  activePercentage: number;
  onboardedCount: number;
  onboardingPercentage: number;
};

interface CohortStatsCardProps {
  stats: CohortStats;
  loading?: boolean;
}

export const CohortStatsCard: React.FC<CohortStatsCardProps> = ({
  stats,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-slate-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Students */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm hover:bg-slate-900/70 transition">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Students
          </span>
          <FiUsers className="text-blue-400" size={20} />
        </div>
        <div className="text-3xl font-bold text-blue-300">
          {stats.totalStudents}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {stats.onboardedCount} onboarded
        </div>
      </div>

      {/* Active Last Week */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm hover:bg-slate-900/70 transition">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active (7d)
          </span>
          <FiActivity className="text-green-400" size={20} />
        </div>
        <div className="text-3xl font-bold text-green-300">
          {stats.activeLastWeek}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {stats.activePercentage.toFixed(1)}% of cohort
        </div>
      </div>

      {/* Onboarded */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm hover:bg-slate-900/70 transition">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Onboarded
          </span>
          <FiCheckCircle className="text-emerald-400" size={20} />
        </div>
        <div className="text-3xl font-bold text-emerald-300">
          {stats.onboardedCount}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {stats.onboardingPercentage.toFixed(1)}% complete
        </div>
      </div>

      {/* Trend */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm hover:bg-slate-900/70 transition">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Trend
          </span>
          <FiTrendingUp className="text-amber-400" size={20} />
        </div>
        <div className="text-3xl font-bold text-amber-300">↗</div>
        <div className="text-xs text-slate-500 mt-2">
          +{(stats.activePercentage * 0.5).toFixed(1)}% from last week
        </div>
      </div>
    </div>
  );
};

export default CohortStatsCard;
```

### 2. ScoreDistributionChart.tsx

```typescript
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ScoreDistributionChartProps {
  distribution: Record<string, number>;
  mean?: number;
  median?: number;
  stdDev?: number;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  distribution,
  mean,
  median,
  stdDev,
}) => {
  const data = [
    { range: "90-100", count: distribution["90-100"] || 0 },
    { range: "80-90", count: distribution["80-90"] || 0 },
    { range: "70-80", count: distribution["70-80"] || 0 },
    { range: "60-70", count: distribution["60-70"] || 0 },
    { range: "50-60", count: distribution["50-60"] || 0 },
    { range: "40-50", count: distribution["40-50"] || 0 },
    { range: "0-40", count: distribution["0-40"] || 0 },
  ];

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          Score Distribution
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {mean !== undefined && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-400/30 p-3">
              <div className="text-xs text-blue-300 uppercase tracking-wider">
                Mean
              </div>
              <div className="text-2xl font-bold text-blue-300 mt-1">
                {mean.toFixed(1)}
              </div>
            </div>
          )}

          {median !== undefined && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 p-3">
              <div className="text-xs text-emerald-300 uppercase tracking-wider">
                Median
              </div>
              <div className="text-2xl font-bold text-emerald-300 mt-1">
                {median.toFixed(1)}
              </div>
            </div>
          )}

          {stdDev !== undefined && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 p-3">
              <div className="text-xs text-amber-300 uppercase tracking-wider">
                Std Dev
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-1">
                {stdDev.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(100, 116, 139, 0.1)"
          />
          <XAxis
            dataKey="range"
            stroke="rgba(148, 163, 184, 0.6)"
            style={{ fontSize: 12 }}
          />
          <YAxis stroke="rgba(148, 163, 184, 0.6)" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(51, 65, 85, 0.5)",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "rgba(226, 232, 240, 1)" }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreDistributionChart;
```

### 3. StudentFilterBar.tsx

```typescript
import React from "react";
import { FiSearch, FiFilter, FiX } from "react-icons/fi";

interface FilterOptions {
  branches: Array<{ label: string; value: string; studentCount?: number }>;
  sections: Array<{ label: string; value: string; studentCount?: number }>;
  years: Array<{ label: string; value: string; studentCount?: number }>;
}

interface StudentFilterBarProps {
  filters: FilterOptions;
  selectedBranch?: string;
  selectedSection?: string;
  selectedYear?: string;
  searchQuery?: string;
  onBranchChange: (branch: string) => void;
  onSectionChange: (section: string) => void;
  onYearChange: (year: string) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

export const StudentFilterBar: React.FC<StudentFilterBarProps> = ({
  filters,
  selectedBranch,
  selectedSection,
  selectedYear,
  searchQuery = "",
  onBranchChange,
  onSectionChange,
  onYearChange,
  onSearchChange,
  onClearFilters,
}) => {
  const hasActiveFilters =
    selectedBranch || selectedSection || selectedYear || searchQuery;

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <FiSearch className="absolute left-3 top-3.5 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by name, roll number, or handle..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Branch Filter */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Branch
          </label>
          <select
            value={selectedBranch || ""}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none transition"
          >
            <option value="">All Branches</option>
            {filters.branches.map((branch) => (
              <option key={branch.value} value={branch.value}>
                {branch.label} ({branch.studentCount || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Section
          </label>
          <select
            value={selectedSection || ""}
            onChange={(e) => onSectionChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none transition"
          >
            <option value="">All Sections</option>
            {filters.sections.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label} ({section.studentCount || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Year
          </label>
          <select
            value={selectedYear || ""}
            onChange={(e) => onYearChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none transition"
          >
            <option value="">All Years</option>
            {filters.years.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label} ({year.studentCount || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 text-sm font-medium transition"
          >
            <FiX size={16} />
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentFilterBar;
```

### 4. TopPerformersCard.tsx

```typescript
import React from "react";
import { FaCrown, FaMedal } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface TopPerformer {
  studentId: string;
  name: string;
  score: number;
  branch: string;
  section: string;
}

interface TopPerformersCardProps {
  performers: TopPerformer[];
  loading?: boolean;
}

export const TopPerformersCard: React.FC<TopPerformersCardProps> = ({
  performers,
  loading = false,
}) => {
  const navigate = useNavigate();

  const medals = [
    { icon: FaCrown, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { icon: FaMedal, color: "text-slate-300", bg: "bg-slate-400/10" },
    { icon: FaMedal, color: "text-amber-600", bg: "bg-amber-600/10" },
  ];

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          Top Performers
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-slate-100 mb-4">
        Top Performers
      </h3>

      <div className="space-y-3">
        {performers.slice(0, 5).map((performer, idx) => {
          const medal = medals[idx] || medals[2];
          const Icon = medal.icon;

          return (
            <div
              key={performer.studentId}
              onClick={() =>
                navigate(`/instructor/student/${performer.studentId}`)
              }
              className={`flex items-center gap-4 rounded-lg ${medal.bg} border border-slate-700/30 p-4 cursor-pointer hover:bg-opacity-50 transition`}
            >
              <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 ${medal.color}`}>
                <Icon size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 truncate">
                  {performer.name}
                </div>
                <div className="text-xs text-slate-400">
                  {performer.branch} - {performer.section}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-blue-300">
                  {performer.score.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">out of 100</div>
              </div>
            </div>
          );
        })}
      </div>

      <button className="w-full mt-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800/30 transition">
        View All Top Performers
      </button>
    </div>
  );
};

export default TopPerformersCard;
```

### 5. AtRiskStudentsCard.tsx

```typescript
import React from "react";
import { FiAlertTriangle, FiClock, FiTrendingDown } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface AtRiskStudent {
  studentId: string;
  name: string;
  score: number;
  lastActive: string;
  reason: "low_score" | "inactive" | "not_onboarded";
}

interface AtRiskStudentsCardProps {
  students: AtRiskStudent[];
  loading?: boolean;
}

const reasonConfig = {
  low_score: {
    label: "Low Score",
    icon: FiTrendingDown,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  inactive: {
    label: "Inactive",
    icon: FiClock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  not_onboarded: {
    label: "Not Onboarded",
    icon: FiAlertTriangle,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
};

export const AtRiskStudentsCard: React.FC<AtRiskStudentsCardProps> = ({
  students,
  loading = false,
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          At-Risk Students
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-slate-100 mb-4">
          At-Risk Students
        </h3>
        <div className="text-center py-8">
          <div className="text-slate-400">
            ✅ Great news! No at-risk students detected.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rose-700/30 bg-rose-950/20 p-6 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-rose-300 mb-4">
        ⚠️ At-Risk Students ({students.length})
      </h3>

      <div className="space-y-3">
        {students.map((student) => {
          const config = reasonConfig[student.reason];
          const Icon = config.icon;

          return (
            <div
              key={student.studentId}
              onClick={() =>
                navigate(`/instructor/student/${student.studentId}`)
              }
              className={`flex items-center gap-4 rounded-lg ${config.bg} border border-rose-700/30 p-4 cursor-pointer hover:bg-opacity-50 transition`}
            >
              <div className={`flex-shrink-0 ${config.color}`}>
                <Icon size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-100 truncate">
                  {student.name}
                </div>
                <div className="text-xs text-slate-400">
                  {config.label} • Last active:{" "}
                  {new Date(student.lastActive).toLocaleDateString()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-rose-300">
                  Score: {student.score.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AtRiskStudentsCard;
```

---

## 📊 DESIGN PRINCIPLES

### Color Coding by Status:

```
GREEN/EMERALD  → Active, Good, Success
BLUE           → Info, Primary Action
AMBER/YELLOW   → Warning, Needs Attention
RED/ROSE       → Critical, At-Risk, Error
SLATE/GRAY     → Neutral, Disabled, Secondary

Backgrounds use opacity:
  /10 (very light)   → Chip/Badge backgrounds
  /20 (light)        → Alert boxes
  /30 (medium-light) → Borders
  /50 (medium)       → Card backgrounds
  /70 (medium-dark)  → Hover states
  /90 (dark)         → Primary backgrounds
```

### Typography Hierarchy:

```
Page Titles     → text-3xl font-bold
Section Headers → text-lg font-bold
Card Titles     → text-base font-semibold
Body Text       → text-sm
Captions        → text-xs text-slate-500
Labels          → text-xs uppercase tracking-wider
```

### Spacing:

```
Section Gap     → gap-6
Card Padding    → p-6
Item Spacing    → gap-4
Internal Margin → mb-4 / mb-2
```

---

## 🚀 QUICK START

1. **Copy the API file** to `frontend/src/lib/instructorApi.ts`
2. **Create component directory** at `frontend/src/components/instructor/`
3. **Copy component files** from examples above
4. **Create page components** using these components as building blocks
5. **Wire up API calls** using the instructor API client
6. **Test filters and pagination** thoroughly
7. **Deploy** when ready!

---

**Version**: 1.0  
**Last Updated**: Jan 31, 2026
