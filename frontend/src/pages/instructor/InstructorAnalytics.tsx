import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import apiClient from "../../lib/apiClient";
import { RiRefreshLine, RiInformationLine, RiBarChartHorizontalLine, RiGroupLine, RiCheckDoubleLine, RiFireLine } from "react-icons/ri";

type Student = {
  id?: string;
  fullName?: string;
  codesyncScore?: number;
  displayScore?: number;
  totalProblemsSolved?: number;
  cpScores?: { platformSkills?: Record<string, number> };
  onboardingCompleted?: boolean;
};

export default function InstructorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const response = await apiClient.get("/instructor/students");
      const data = (response.data?.students || response.data || []).map((s: any) => ({
        id: s.id || s._id || s.uid,
        fullName: s.fullName || s.fullname || s.name,
        codesyncScore: Number(s.codesyncScore || s.displayScore || 0),
        displayScore: Number(s.displayScore || s.codesyncScore || 0),
        totalProblemsSolved: Number(s.totalProblemsSolved || s.totalSolved || 0),
        cpScores: s.cpScores || {},
        onboardingCompleted: !!s.onboardingCompleted,
      }));
      setStudents(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const ranges = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };
    students.forEach((s) => {
      const score = s.codesyncScore || 0;
      if (score <= 20) ranges["0-20"]++;
      else if (score <= 40) ranges["21-40"]++;
      else if (score <= 60) ranges["41-60"]++;
      else if (score <= 80) ranges["61-80"]++;
      else ranges["81-100"]++;
    });
    return Object.entries(ranges).map(([range, count]) => ({ range, count }));
  }, [students]);

  // Top performers
  const topPerformers = useMemo(() => {
    return students
      .slice()
      .sort((a, b) => (b.codesyncScore || 0) - (a.codesyncScore || 0))
      .slice(0, 5);
  }, [students]);

  // Overall stats
  const stats = useMemo(() => {
    const avgScore = students.length ? students.reduce((acc, s) => acc + (s.codesyncScore || 0), 0) / students.length : 0;
    const totalSolved = students.reduce((acc, s) => acc + (s.totalProblemsSolved || 0), 0);
    const onboarded = students.filter((s) => s.onboardingCompleted).length;
    const active = students.length;

    return {
      avgScore: avgScore.toFixed(1),
      totalSolved,
      onboarded,
      active,
      pending: students.length - onboarded,
    };
  }, [students]);

  const COLORS = ["#fbbf24", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899"];

  return (
    <div className="w-full px-4 py-8 md:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
              <RiBarChartHorizontalLine className="text-slate-300" />
              Class Analytics
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Real-time performance metrics and insights</p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/70 active:scale-95 transition"
          >
            <RiRefreshLine />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        {!loading && !err && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Active Students */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-sky-800/40 bg-gradient-to-br from-sky-900/30 to-sky-950/10 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sky-300">Active Students</p>
                  <p className="mt-2 text-2xl font-bold text-sky-100">{stats.active}</p>
                </div>
                <div className="text-3xl text-sky-400 opacity-30">
                  <RiGroupLine />
                </div>
              </div>
            </motion.div>

            {/* Onboarded */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-emerald-900/30 to-emerald-950/10 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-300">Onboarded</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-100">{stats.onboarded}</p>
                  <p className="text-xs text-emerald-400/70 mt-1">
                    {stats.active ? ((stats.onboarded / stats.active) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="text-3xl text-emerald-400 opacity-30">
                  <RiCheckDoubleLine />
                </div>
              </div>
            </motion.div>

            {/* Average Score */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-amber-800/40 bg-gradient-to-br from-amber-900/30 to-amber-950/10 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-300">Average Score</p>
                  <p className="mt-2 text-2xl font-bold text-amber-100">{stats.avgScore}</p>
                </div>
                <div className="text-3xl text-amber-400 opacity-30">
                  <RiBarChartHorizontalLine />
                </div>
              </div>
            </motion.div>

            {/* Total Solved */}
            <motion.div
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-purple-800/40 bg-gradient-to-br from-purple-900/30 to-purple-950/10 p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Problems Solved</p>
                  <p className="mt-2 text-2xl font-bold text-purple-100">{stats.totalSolved}</p>
                </div>
                <div className="text-3xl text-purple-400 opacity-30">
                  <RiFireLine />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Score Distribution */}
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 p-6"
          >
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
              Score Distribution
            </h2>
            {loading ? (
              <div className="mt-6 h-64 flex items-center justify-center text-slate-400">
                <RiRefreshLine className="animate-spin text-2xl" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreDistribution} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                  <XAxis dataKey="range" stroke="rgba(100,116,139,0.6)" style={{ fontSize: "12px" }} />
                  <YAxis stroke="rgba(100,116,139,0.6)" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: "12px",
                    }}
                    cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                  />
                  <Bar dataKey="count" fill="url(#colorGradient)" radius={[12, 12, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1e40af" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Onboarding Status */}
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 p-6"
          >
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
              Onboarding Status
            </h2>
            {loading ? (
              <div className="mt-6 h-64 flex items-center justify-center text-slate-400">
                <RiRefreshLine className="animate-spin text-2xl" />
              </div>
            ) : (
              <div className="mt-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Onboarded", value: stats.onboarded },
                        { name: "Pending", value: stats.pending },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">Onboarded: {stats.onboarded}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-slate-300">Pending: {stats.pending}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Top Performers */}
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 p-6 lg:col-span-2"
          >
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
              Top Performers
            </h2>

            {loading ? (
              <div className="mt-6 h-48 flex items-center justify-center text-slate-400">
                <RiRefreshLine className="animate-spin text-2xl" />
              </div>
            ) : topPerformers.length === 0 ? (
              <div className="mt-6 text-center text-slate-400">No students yet</div>
            ) : (
              <div className="mt-6 space-y-3">
                {topPerformers.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-4 rounded-2xl border border-slate-800/40 bg-slate-900/20 p-4"
                  >
                    <div className="text-2xl font-bold text-slate-400 w-8">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-100">{s.fullName || "Unknown"}</div>
                      <div className="text-sm text-slate-500">
                        {s.totalProblemsSolved || 0} problems solved
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-amber-800/40 bg-amber-900/20 px-3 py-2">
                      <span className="font-semibold text-amber-100">{(s.codesyncScore || 0).toFixed(0)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Error State */}
        <AnimatePresence>
          {err && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
                <RiInformationLine className="mt-0.5" />
                <div>
                  <div className="font-medium">Couldn't load analytics</div>
                  <div className="text-sm opacity-90 mt-1">{err}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
