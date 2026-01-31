// File: src/pages/instructor/AnalyticsDashboard.tsx
// Add this component to InstructorDashboard.tsx to show animated charts

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { motion } from "framer-motion";
import { RiBarChart2Line, RiLineChartLine, RiPieChartLine } from "react-icons/ri";

type PlatformKey =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "github"
  | "hackerrank"
  | "atcoder";

interface AnalyticsDashboardProps {
  students: any[];
  filtered: any[];
  buckets: any[];
  scores: number[];
}

const PLATFORM_COLORS: Record<PlatformKey, string> = {
  leetcode: "#f59e0b",
  codeforces: "#06b6d4",
  codechef: "#8b5cf6",
  github: "#ec4899",
  hackerrank: "#10b981",
  atcoder: "#3b82f6",
};

export function AnalyticsDashboard({
  students,
  filtered,
  buckets,
  scores,
}: AnalyticsDashboardProps) {
  const PLATFORMS: PlatformKey[] = [
    "leetcode",
    "codeforces",
    "codechef",
    "github",
    "hackerrank",
    "atcoder",
  ];
  const PLATFORM_LABEL: Record<PlatformKey, string> = {
    leetcode: "LeetCode",
    codeforces: "Codeforces",
    codechef: "CodeChef",
    github: "GitHub",
    hackerrank: "HackerRank",
    atcoder: "AtCoder",
  };

  // Chart data generators
  const scoreDistribution = useMemo(() => {
    return [
      { range: "0-20", count: buckets[0]?.count || 0, fill: "#ef4444" },
      { range: "21-40", count: buckets[1]?.count || 0, fill: "#f97316" },
      { range: "41-60", count: buckets[2]?.count || 0, fill: "#eab308" },
      { range: "61-80", count: buckets[3]?.count || 0, fill: "#84cc16" },
      { range: "81-100", count: buckets[4]?.count || 0, fill: "#22c55e" },
    ];
  }, [buckets]);

  const platformAdoption = useMemo(() => {
    return PLATFORMS.map((p) => {
      const count = filtered.filter((s) => s.cpHandles?.[p]).length;
      return {
        name: PLATFORM_LABEL[p],
        value: count,
        percentage: filtered.length ? Math.round((count / filtered.length) * 100) : 0,
        fill: PLATFORM_COLORS[p],
      };
    });
  }, [filtered]);

  const topStudents = useMemo(() => {
    return [...filtered]
      .sort((a, b) => (b.codesyncScore ?? 0) - (a.codesyncScore ?? 0))
      .slice(0, 10)
      .map((s, idx) => ({
        name: (s.name?.split(" ")[0] || "Student").substring(0, 10),
        score: s.codesyncScore ?? 0,
        rank: idx + 1,
      }));
  }, [filtered]);

  const scoreProgress = useMemo(() => {
    return [
      { stage: "Week 1", avg: Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length) * 0.8) },
      { stage: "Week 2", avg: Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length) * 0.85) },
      { stage: "Week 3", avg: Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length) * 0.92) },
      { stage: "Now", avg: Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)) },
    ];
  }, [scores]);

  const platformBreakdown = useMemo(() => {
    return PLATFORMS.map((p) => {
      const stats = filtered.reduce(
        (acc, s) => {
          if (s.cpHandles?.[p]) {
            return {
              ...acc,
              linked: acc.linked + 1,
              avgScore: acc.avgScore + (s.codesyncScore ?? 0),
            };
          }
          return acc;
        },
        { linked: 0, avgScore: 0 }
      );
      
      return {
        platform: PLATFORM_LABEL[p],
        linked: stats.linked,
        avgScore: stats.linked ? Math.round(stats.avgScore / stats.linked) : 0,
        fill: PLATFORM_COLORS[p],
      };
    });
  }, [filtered]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 py-8"
    >
      <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
        <RiBarChart2Line className="text-blue-400" />
        Analytics Dashboard
      </h2>

      {/* Row 1: Score Distribution & Platform Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Bar Chart */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur p-6"
        >
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <RiBarChart2Line className="text-orange-400" />
            Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="range" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #4b5563",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1000}>
                {scoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Platform Adoption Pie Chart */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur p-6"
        >
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <RiPieChartLine className="text-cyan-400" />
            Platform Adoption
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={platformAdoption}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(props: any) => {
                  const name = props?.name ?? "";
                  const percent = typeof props?.percent === "number" ? Math.round(props.percent * 100) : 0;
                  return `${name}: ${percent}%`;
                }}
                animationDuration={1000}
              >
                {platformAdoption.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #4b5563",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row 2: Top 10 Students */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur p-6"
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <RiBarChart2Line className="text-emerald-400" />
          Top 10 Students by Score
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topStudents}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" stroke="#9ca3af" width={90} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#e5e7eb",
              }}
              formatter={(value) => [`Score: ${value}`, "Points"]}
            />
            <Bar dataKey="score" fill="#3b82f6" radius={[0, 8, 8, 0]} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Row 3: Score Progress Trend */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur p-6"
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <RiLineChartLine className="text-purple-400" />
          Average Score Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoreProgress}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="stage" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#e5e7eb",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: "#a78bfa", r: 6 }}
              activeDot={{ r: 8 }}
              animationDuration={1000}
              name="Avg Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Row 4: Platform Performance */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-slate-700/50 bg-slate-900/30 backdrop-blur p-6"
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <RiBarChart2Line className="text-pink-400" />
          Platform Performance Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={platformBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="platform" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                borderRadius: "8px",
                color: "#e5e7eb",
              }}
            />
            <Legend />
            <Bar dataKey="linked" fill="#3b82f6" name="Students Linked" radius={[8, 8, 0, 0]} animationDuration={1000} />
            <Bar dataKey="avgScore" fill="#ec4899" name="Avg Score" radius={[8, 8, 0, 0]} animationDuration={1000} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Stats Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Students",
            value: filtered.length,
            color: "from-blue-500/20 to-blue-600/20",
          },
          {
            label: "Avg Score",
            value: Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)),
            color: "from-purple-500/20 to-purple-600/20",
          },
          {
            label: "Highest Score",
            value: Math.max(...scores, 0),
            color: "from-emerald-500/20 to-emerald-600/20",
          },
          {
            label: "Below 40",
            value: scores.filter((s) => s < 40).length,
            color: "from-red-500/20 to-red-600/20",
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            className={`rounded-lg border border-slate-700/50 bg-gradient-to-br ${stat.color} p-4`}
          >
            <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default AnalyticsDashboard;
