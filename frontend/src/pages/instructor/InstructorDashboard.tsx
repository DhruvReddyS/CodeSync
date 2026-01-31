import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../../lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTeamLine,
  RiTrophyLine,
  RiFireLine,
  RiSearchLine,
  RiRefreshLine,
  RiBarChartLine,
  RiMailLine,
  RiPhoneLine,
  RiCloseCircleLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiDownloadLine,
  RiCloseLine,
  RiLinksLine,
  RiFlashlightLine,
  RiShieldLine,
  RiSparkling2Line,
  RiCheckDoubleLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiAlarmWarningLine,
  RiPulseLine,
  RiArrowRightUpLine,
  RiInformationLine,
  RiTimeLine,
  RiUserAddLine,
  RiTargetLine,
  RiSparklesLine,
  RiLineChartLine,
  RiBookOpenLine,
  RiCodeLine,
  RiMedalLine,
} from "react-icons/ri";
import {
  SiLeetcode,
  SiCodechef,
  SiHackerrank,
  SiCodeforces,
  SiGithub,
} from "react-icons/si";

/* ============================================================================
 * TYPES
 * ============================================================================ */

type PlatformId =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "github"
  | "hackerrank"
  | "atcoder";

type CpScores = {
  codeSyncScore?: number;
  displayScore?: number;
  platformSkills?: Record<PlatformId, number>;
  lastComputedAt?: string;
};

type Student = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  branch?: string;
  section?: string;
  year?: string;
  cpScores: CpScores | null;
  cpHandles?: Partial<Record<PlatformId, string>>;
  lastActiveAt?: string;
  activeThisWeek?: boolean;
  displayScore?: number;
  codesyncScore?: number;
  codeSyncScore?: number;
  platforms?: Partial<Record<PlatformId, number>>;
};

type DashboardResponse = {
  students: Student[];
  stats?: {
    totalStudents: number;
    lastSyncAt?: string;
  };
};

type StudentStatsResponse = {
  profile?: {
    id?: string;
    name?: string;
    branch?: string | null;
    section?: string | null;
    year?: string | null;
    email?: string | null;
    phone?: string | null;
    updatedAt?: string | null;
  } | null;
  cpHandles?: Partial<Record<PlatformId, string | null>> | null;
  cpScores?: {
    displayScore?: number;
    codeSyncScore?: number;
    platformSkills?: Record<PlatformId, number>;
    lastComputedAt?: string;
  } | null;
  platformNumbers?: Partial<Record<PlatformId, any | null>> | null;
  platformSignals?: Partial<Record<PlatformId, number>> | null;
  platformWiseScores?: Partial<Record<PlatformId, { total: number; parts: Record<string, number> }>> | null;
  platformSum?: number;
  overallFromPlatforms?: number;
};

const PLATFORM_LABEL: Record<PlatformId, string> = {
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  codechef: "CodeChef",
  github: "GitHub",
  hackerrank: "HackerRank",
  atcoder: "AtCoder",
};

const PLATFORM_URL: Record<PlatformId, (h: string) => string> = {
  leetcode: (h) => `https://leetcode.com/u/${h}/`,
  codeforces: (h) => `https://codeforces.com/profile/${h}`,
  codechef: (h) => `https://www.codechef.com/users/${h}`,
  github: (h) => `https://github.com/${h}`,
  hackerrank: (h) => `https://www.hackerrank.com/profile/${h}`,
  atcoder: (h) => `https://atcoder.jp/users/${h}`,
};

const PLATFORMS: PlatformId[] = [
  "leetcode",
  "codeforces",
  "codechef",
  "github",
  "hackerrank",
  "atcoder",
];

const PLATFORMS_MAP: Record<
  PlatformId,
  { name: string; color: string; icon: React.ReactNode }
> = {
  leetcode: { name: "LeetCode", color: "bg-amber-500/70", icon: <SiLeetcode /> },
  codechef: { name: "CodeChef", color: "bg-stone-500/70", icon: <SiCodechef /> },
  hackerrank: { name: "HackerRank", color: "bg-emerald-500/70", icon: <SiHackerrank /> },
  codeforces: { name: "Codeforces", color: "bg-sky-500/70", icon: <SiCodeforces /> },
  github: { name: "GitHub", color: "bg-slate-500/70", icon: <SiGithub /> },
  atcoder: { name: "AtCoder", color: "bg-cyan-500/70", icon: <SiCodeforces /> },
};

/* ============================================================================
 * COMPONENT
 * ============================================================================ */

const InstructorDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "name" | "recent">("score");
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStats, setSelectedStats] = useState<StudentStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ========== FETCH STUDENTS ========== */
  const fetchDashboard = async () => {
    try {
      setError(null);
      const res = await apiClient.get<DashboardResponse>("/instructor/dashboard");
      setStudents(res.data.students || []);
    } catch (err: any) {
      console.error("[InstructorDashboard] fetch error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  /* ========== FETCH STUDENT STATS ========== */
  const fetchStudentStats = async (studentId: string) => {
    setStatsLoading(true);
    try {
      const res = await apiClient.get<StudentStatsResponse>(
        `/instructor/student/${studentId}/stats`
      );
      setSelectedStats(res.data || null);
    } catch (err: any) {
      console.error("[InstructorDashboard] stats fetch error:", err);
      setSelectedStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  /* ========== SEARCH & FILTER ========== */
  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          Object.values(s.cpHandles || {})
            .filter(Boolean)
            .some((h) => h?.toLowerCase().includes(q))
      );
    }

    if (filterBranch) {
      result = result.filter((s) => s.branch === filterBranch);
    }

    // Sort
    if (sortBy === "score") {
      result.sort((a, b) => getDisplayScore(b) - getDisplayScore(a));
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "recent") {
      result.sort((a, b) => {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    return result;
  }, [students, searchQuery, sortBy, filterBranch]);

  /* ========== HELPERS ========== */
  const getDisplayScore = (student: Student) => {
    const score = student.cpScores?.displayScore ?? student.displayScore ?? student.codesyncScore ?? 0;
    return Math.min(Math.max(score, 0), 100);
  };

  const getTotalScore = (student: Student) => {
    return student.cpScores?.codeSyncScore ?? student.codeSyncScore ?? 0;
  };

  /* ========== ENHANCED STATS ========== */
  const stats = useMemo(() => {
    if (students.length === 0) {
      return {
        total: 0,
        avgScore: 0,
        topScore: 0,
        bottomScore: 0,
        activeThisWeek: 0,
        allPlatformsLinked: 0,
        scoreDistribution: { excellent: 0, good: 0, average: 0, poor: 0 },
        platformAdoption: {} as Record<PlatformId, number>,
        uniqueBranches: 0,
        engagementRate: 0,
      };
    }

    const scores = students.map((s) => getDisplayScore(s));
    const platformAdoption: Record<PlatformId, number> = {
      leetcode: 0,
      codeforces: 0,
      codechef: 0,
      github: 0,
      hackerrank: 0,
      atcoder: 0,
    };

    let activeCount = 0;
    let allLinkedCount = 0;

    students.forEach((s) => {
      if (s.activeThisWeek) activeCount++;
      const linkedPlatforms = Object.keys(s.cpHandles || {}).filter(
        (p) => s.cpHandles?.[p as PlatformId]
      );
      if (linkedPlatforms.length === 6) allLinkedCount++;

      linkedPlatforms.forEach((p) => {
        platformAdoption[p as PlatformId]++;
      });
    });

    const scoreDistribution = {
      excellent: scores.filter((s) => s >= 80).length,
      good: scores.filter((s) => s >= 60 && s < 80).length,
      average: scores.filter((s) => s >= 40 && s < 60).length,
      poor: scores.filter((s) => s < 40).length,
    };

    const uniqueBranches = new Set(students.map((s) => s.branch).filter(Boolean)).size;

    return {
      total: students.length,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      topScore: Math.max(...scores),
      bottomScore: Math.min(...scores),
      activeThisWeek: activeCount,
      allPlatformsLinked: allLinkedCount,
      scoreDistribution,
      platformAdoption,
      uniqueBranches,
      engagementRate: Math.round((activeCount / students.length) * 100),
    };
  }, [students]);

  /* ========== OPEN STUDENT ========== */
  const openStudent = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentStats(student.id);
  };

  /* ========== REFRESH ========== */
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  /* ========== RENDER ========== */

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0e27] to-slate-950 text-slate-100 flex items-center justify-center relative overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.3),_transparent_70%)] blur-3xl"
          />
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 4, delay: 1, repeat: Infinity }}
            className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.3),_transparent_70%)] blur-3xl"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity },
            }}
            className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-80 blur-lg shadow-[0_0_40px_rgba(59,130,246,0.6)]"
          />
          <div className="text-center space-y-2">
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-sm uppercase tracking-widest text-slate-400"
            >
              Loading Dashboard
            </motion.p>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CodeSync Instructor
            </h2>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0e27] to-slate-950 text-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <RiCloseCircleLine className="mx-auto text-5xl text-red-400 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg"
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a0e27] to-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ x: [0, 50, -30, 0], y: [0, 30, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.3),_transparent_70%)] blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -50, 40, 0], y: [0, -40, 50, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.3),_transparent_70%)] blur-3xl"
        />
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/3 left-1/3 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.2),_transparent_70%)] blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* ========== HEADER ========== */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="relative">
                  <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                    <RiTeamLine className="text-2xl text-white" />
                  </div>
                </motion.div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Team Analytics
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">Real-time cohort intelligence & performance tracking</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 font-semibold shadow-lg transition-all"
            >
              <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 1, repeat: refreshing ? Infinity : 0 }}>
                <RiRefreshLine />
              </motion.div>
              {refreshing ? "Syncing..." : "Sync Now"}
            </motion.button>
          </div>
        </motion.div>

        {/* ========== KPI GRID ========== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.08 }}
          className="mb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {[
            { label: "Students", value: stats.total, icon: RiTeamLine, color: "from-blue-600/20 to-blue-700/10", accent: "text-blue-400" },
            { label: "Avg Score", value: `${stats.avgScore}`, icon: RiBarChartLine, color: "from-purple-600/20 to-purple-700/10", accent: "text-purple-400" },
            { label: "Engagement", value: `${stats.engagementRate}%`, icon: RiFireLine, color: "from-orange-600/20 to-orange-700/10", accent: "text-orange-400" },
            { label: "All Linked", value: stats.allPlatformsLinked, icon: RiLinksLine, color: "from-pink-600/20 to-pink-700/10", accent: "text-pink-400" },
            { label: "Branches", value: stats.uniqueBranches, icon: RiMedalLine, color: "from-emerald-600/20 to-emerald-700/10", accent: "text-emerald-400" },
          ].map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ y: -4 }}
              className={`rounded-2xl border border-slate-700/50 bg-gradient-to-br ${kpi.color} backdrop-blur-xl p-5 group overflow-hidden`}
            >
              <div className="relative flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400 font-medium">{kpi.label}</p>
                  <div className={`text-2xl ${kpi.accent} opacity-40 group-hover:opacity-100 transition-opacity`}>
                    <kpi.icon />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-100">{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ========== CHARTS SECTION ========== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Score Distribution */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
              <RiLineChartLine className="text-blue-400" />
              Score Distribution
            </h3>
            <div className="space-y-4">
              {[
                { label: "Excellent (80+)", count: stats.scoreDistribution.excellent, color: "bg-emerald-500/80", textColor: "text-emerald-300" },
                { label: "Good (60-79)", count: stats.scoreDistribution.good, color: "bg-blue-500/80", textColor: "text-blue-300" },
                { label: "Average (40-59)", count: stats.scoreDistribution.average, color: "bg-amber-500/80", textColor: "text-amber-300" },
                { label: "Below Avg (<40)", count: stats.scoreDistribution.poor, color: "bg-red-500/80", textColor: "text-red-300" },
              ].map((item, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + idx * 0.05 }} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className={`font-bold ${item.textColor}`}>{item.count}</span>
                  </div>
                  <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div
                      className={`${item.color} h-full rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Platform Adoption */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
              <RiCodeLine className="text-purple-400" />
              Platform Adoption
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map((platform, idx) => {
                const count = stats.platformAdoption[platform];
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <motion.div
                    key={platform}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + idx * 0.08 }}
                    className="rounded-lg p-4 border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">{PLATFORMS_MAP[platform].icon}</div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400">{PLATFORMS_MAP[platform].name}</p>
                        <p className="text-lg font-bold text-slate-100">{count}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${PLATFORMS_MAP[platform].color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.6 + idx * 0.08 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ========== SEARCH & FILTER BAR ========== */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, email, or handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700/50 focus:border-blue-500/50 outline-none transition-all text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {[
                { label: "Top Scores", value: "score" },
                { label: "A-Z", value: "name" },
                { label: "Recent", value: "recent" },
              ].map((btn) => (
                <motion.button
                  key={btn.value}
                  onClick={() => setSortBy(btn.value as any)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                    sortBy === btn.value
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {btn.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ========== STUDENTS GRID ========== */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
          <div className="mb-4 text-sm text-slate-400">
            Showing <span className="text-blue-400 font-semibold">{filteredStudents.length}</span> of <span className="text-blue-400 font-semibold">{students.length}</span> students
          </div>
          <AnimatePresence mode="popLayout">
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student, idx) => (
                  <StudentCard key={student.id} student={student} index={idx} isSelected={selectedStudent?.id === student.id} onSelect={() => { setSelectedStudent(student); fetchStudentStats(student.id); }} />
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <RiSearchLine className="mx-auto text-5xl text-slate-600 mb-4" />
                <p className="text-slate-400 text-lg">No students found</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ========== STUDENT DETAIL MODAL ========== */}
      <AnimatePresence>
        {selectedStudent && <StudentDetailModal student={selectedStudent} stats={selectedStats} statsLoading={statsLoading} onClose={() => { setSelectedStudent(null); setSelectedStats(null); }} />}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
 * STUDENT CARD COMPONENT
 * ============================================================================ */

interface StudentCardProps {
  student: Student;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  index,
  isSelected,
  onSelect,
}) => {
  const displayScore = Math.min(Math.max(student.cpScores?.displayScore ?? student.displayScore ?? 0, 0), 100);
  const linkedPlatforms = Object.entries(student.cpHandles || {})
    .filter(([, handle]) => handle)
    .map(([platform]) => platform as PlatformId);

  const platformSkills = student.cpScores?.platformSkills || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      onClick={onSelect}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer group ${
        isSelected
          ? "border-blue-500/70 bg-gradient-to-br from-blue-600/20 to-purple-600/20 shadow-[0_0_40px_rgba(59,130,246,0.4)]"
          : "border-slate-700/50 bg-slate-900/30 hover:bg-slate-800/50 hover:border-slate-600/70 shadow-lg"
      }`}
    >
      {/* Animated gradient background */}
      {isSelected && (
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
        />
      )}

      <div className="relative p-6 backdrop-blur-sm space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-base flex-shrink-0"
              >
                {student.name?.charAt(0).toUpperCase()}
              </motion.div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg truncate">{student.name}</h3>
                <p className="text-xs text-slate-400 truncate">
                  {student.branch}
                  {student.section && ` • Sec ${student.section}`}
                  {student.year && ` • Year ${student.year}`}
                </p>
              </div>
            </div>
          </div>

          {/* Main Score */}
          <motion.div
            whileHover={{ scale: 1.15 }}
            className="text-right flex-shrink-0"
          >
            <p className="text-xs text-slate-400 mb-1">Score</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              {Math.round(displayScore)}
            </p>
          </motion.div>
        </div>

        {/* Platform Skills Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PLATFORMS.map((platform) => {
            const skill = platformSkills[platform] ?? 0;
            const hasHandle = student.cpHandles?.[platform];
            return (
              <motion.div
                key={platform}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`rounded-lg p-2 text-center transition-all border text-xs ${
                  hasHandle
                    ? "border-slate-600/50 bg-slate-900/40"
                    : "border-slate-800/30 bg-slate-950/30"
                }`}
              >
                <p className="font-semibold text-slate-200 text-sm">
                  {skill > 0 ? Math.round(skill) : "—"}
                </p>
                <p className="text-[0.6rem] text-slate-500 capitalize">{platform.slice(0, 4)}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/30">
          <span>{linkedPlatforms.length} platforms linked</span>
          <motion.span
            whileHover={{ x: 2 }}
            className="flex items-center gap-1 text-slate-500 group-hover:text-slate-300 transition-colors"
          >
            Click to expand <RiArrowRightUpLine className="text-sm" />
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

/* ============================================================================
 * STUDENT DETAIL MODAL
 * ============================================================================ */

interface StudentDetailModalProps {
  student: Student;
  stats: StudentStatsResponse | null;
  statsLoading: boolean;
  onClose: () => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  stats,
  statsLoading,
  onClose,
}) => {
  const displayScore = Math.min(Math.max(student.cpScores?.displayScore ?? student.displayScore ?? 0, 0), 100);
  const platformSkills = stats?.cpScores?.platformSkills || student.cpScores?.platformSkills || {};

  const maxSkill = Math.max(1, ...Object.values(platformSkills).map(v => v ?? 0));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-[0_0_60px_rgba(59,130,246,0.4)] overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Animated background */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
        />

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <RiCloseLine className="text-lg" />
        </motion.button>

        {/* Content */}
        <div className="relative p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-slate-700/30">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-2xl flex-shrink-0"
            >
              {student.name?.charAt(0).toUpperCase()}
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-sm text-slate-400">
                {student.branch}
                {student.section && ` • Section ${student.section}`}
                {student.year && ` • Year ${student.year}`}
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="text-right flex-shrink-0"
            >
              <p className="text-xs text-slate-400">Score</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {Math.round(displayScore)}
              </p>
            </motion.div>
          </div>

          {/* Contact Info */}
          {(student.email || student.phone) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Contact Information</h3>
              <div className="space-y-2">
                {student.email && (
                  <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <RiMailLine className="text-blue-400 text-lg flex-shrink-0" />
                    <span className="flex-1 break-all">{student.email}</span>
                  </div>
                )}
                {student.phone && (
                  <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <RiPhoneLine className="text-purple-400 text-lg flex-shrink-0" />
                    <span className="flex-1">{student.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Platform Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">Platform Performance</h3>
            
            {statsLoading ? (
              <div className="text-sm text-slate-400 p-4 bg-slate-800/30 rounded-lg text-center">
                Loading detailed stats...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.map((platform) => {
                  const skill = platformSkills[platform] ?? 0;
                  const handle = stats?.cpHandles?.[platform] || student.cpHandles?.[platform];
                  
                  return (
                    <motion.div
                      key={platform}
                      whileHover={{ y: -2 }}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold capitalize">
                            {PLATFORM_LABEL[platform]}
                          </span>
                        </div>
                        <span className="text-2xl font-bold text-blue-400">
                          {Math.round(skill)}
                        </span>
                      </div>

                      {handle && (
                        <p className="text-xs text-slate-400 mb-3">
                          Handle: <span className="text-slate-300 font-mono">@{handle}</span>
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Skill Level</span>
                          <span className="text-slate-300 font-semibold">{Math.round(skill)} / 100</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-700/50 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((skill / 100) * 100, 100)}%` }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          />
                        </div>
                      </div>

                      {handle && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => window.open(PLATFORM_URL[platform](handle), "_blank")}
                          className="mt-3 w-full py-2 px-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-xs font-medium text-slate-200 flex items-center justify-center gap-2"
                        >
                          <RiExternalLinkLine /> Open Profile
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Last Updated */}
          {(student.cpScores?.lastComputedAt || student.lastActiveAt) && (
            <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-700/30">
              <RiTimeLine className="inline mr-1 text-slate-400" />
              Last updated:{" "}
              {new Date(student.cpScores?.lastComputedAt || student.lastActiveAt || Date.now()).toLocaleString()}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InstructorDashboard;
