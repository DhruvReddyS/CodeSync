// src/pages/LeaderboardPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";

import {
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiUsers,
  FiActivity,
} from "react-icons/fi";
import { FaCrown, FaMedal, FaTrophy } from "react-icons/fa";

/* ------------------------------------------------------------------
 * TYPES
 * ------------------------------------------------------------------ */

type PlatformKey =
  | "leetcode"
  | "codechef"
  | "hackerrank"
  | "codeforces"
  | "github"
  | "atcoder";

type CpScores = {
  codeSyncScore?: number | null;
  displayScore?: number | null;
  platformSkills?: Partial<Record<PlatformKey, number>>;
};

type LeaderboardEntry = {
  studentId: string;
  rank: number;
  name: string | null;
  branch: string | null;
  section: string | null;
  year: string | number | null;
  rollNumber?: string | null;
  avatarUrl?: string | null;
  cpScores: CpScores | null;
  cpHandles: Partial<Record<PlatformKey, string>>;
};

type ApiResponse = {
  leaderboard: LeaderboardEntry[];
};

/* ------------------------------------------------------------------
 * PLATFORM META
 * ------------------------------------------------------------------ */

const PLATFORM_LABEL: Record<PlatformKey, string> = {
  leetcode: "LeetCode",
  codechef: "CodeChef",
  hackerrank: "HackerRank",
  codeforces: "Codeforces",
  github: "GitHub",
  atcoder: "AtCoder",
};

const PLATFORM_ORDER: PlatformKey[] = [
  "leetcode",
  "codechef",
  "hackerrank",
  "codeforces",
  "github",
  "atcoder",
];

const getPlatformScore = (entry: LeaderboardEntry, key: PlatformKey) =>
  entry.cpScores?.platformSkills?.[key] ?? 0;

const formatScore = (score: number | null | undefined) =>
  score == null ? "—" : score.toLocaleString("en-IN");

/* ------------------------------------------------------------------
 * MAIN PAGE
 * ------------------------------------------------------------------ */

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filtered, setFiltered] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [sortMode, setSortMode] = useState<"score" | "rank">("score");

  // 🔥 for highlighting current user
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    // read currently logged-in student id from localStorage (change key if needed)
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("codesync_student_id");
      if (id) setCurrentStudentId(id);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiClient.get<ApiResponse>(
          "/student/stats/leaderboard",
          {
            params: { limit: 250 },
          }
        );

        const list = (res.data?.leaderboard || []).map((e) => ({
          ...e,
          rank: e.rank ?? 0,
        }));

        setEntries(list);
      } catch (err: any) {
        console.error("[Leaderboard] fetch error:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load leaderboard."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------- FILTER OPTIONS ---------------- */

  const uniqueBranches = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.branch && set.add(e.branch));
    return Array.from(set).sort();
  }, [entries]);

  const uniqueYears = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.year != null) set.add(String(e.year));
    });
    return Array.from(set).sort();
  }, [entries]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.section && set.add(e.section));
    return Array.from(set).sort();
  }, [entries]);

  /* ---------------- FILTER + SORT ---------------- */

  useEffect(() => {
    let list = [...entries];

    if (yearFilter !== "ALL") {
      list = list.filter((e) => String(e.year) === yearFilter);
    }
    if (branchFilter !== "ALL") {
      list = list.filter((e) => e.branch === branchFilter);
    }
    if (sectionFilter !== "ALL") {
      list = list.filter((e) => e.section === sectionFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => {
        const name = (e.name || "").toLowerCase();
        const handleStr = Object.values(e.cpHandles || {})
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const rollStr = (e.rollNumber || "").toLowerCase();
        return (
          name.includes(q) || handleStr.includes(q) || rollStr.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      if (sortMode === "rank") return a.rank - b.rank;
      const sa = a.cpScores?.displayScore ?? 0;
      const sb = b.cpScores?.displayScore ?? 0;
      return sb - sa;
    });

    setFiltered(list);
  }, [entries, branchFilter, yearFilter, sectionFilter, search, sortMode]);

  /* ---------------- SUMMARY STATS ---------------- */

  const totalUsers = entries.length;
  const totalScore = entries.reduce(
    (acc, e) => acc + (e.cpScores?.displayScore ?? 0),
    0
  );

  const activePlatformsCount = useMemo(() => {
    const active = new Set<PlatformKey>();
    entries.forEach((e) => {
      PLATFORM_ORDER.forEach((p) => {
        const score = getPlatformScore(e, p);
        const handle = e.cpHandles?.[p];
        if ((score && score > 0) || handle) active.add(p);
      });
    });
    return active.size;
  }, [entries]);

  const top3 = filtered.slice(0, 3);
  const tableEntries = filtered;

  const handleProfileClick = (id: string) => {
    navigate(`/profile/${id}`);
  };

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02030a] text-slate-100 flex items-center justify-center relative overflow-hidden">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.28),_transparent_60%)] blur-2xl" />
          <div className="absolute -bottom-40 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.26),_transparent_60%)] blur-2xl" />
          <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:80px_80px]" />
        </div>

        <div className="relative flex flex-col items-center gap-6 px-4">
          {/* Logo orb */}
          <div className="relative">
            <div className="h-20 w-20 rounded-3xl bg-slate-950/90 border border-slate-800 flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.8)]">
              <div className="relative flex items-center justify-center">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 via-fuchsia-400 to-rose-400 opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-950">
                    CS
                  </span>
                </div>
              </div>
            </div>

            {/* Spinning ring */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 rounded-full border border-slate-800 border-t-sky-400/80 border-r-fuchsia-400/70 animate-spin [animation-duration:1.4s]" />
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-1">
            <p className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">
              Syncing your coding universe
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold">
              Building your{" "}
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                CodeSync leaderboard
              </span>
            </h1>
            <p className="text-[0.75rem] sm:text-xs text-slate-400 max-w-md mx-auto">
              Pulling live stats from LeetCode, CodeChef, Codeforces,
              HackerRank, AtCoder and GitHub. This is your all-in-one campus
              ladder.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- PAGE ---------------- */

  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 relative overflow-hidden">
      {/* Background glows + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[-40px] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.26),_transparent_60%)] blur-3xl" />
        <div className="absolute top-[40%] right-[-120px] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.24),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-120px] left-[15%] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,_rgba(74,222,128,0.22),_transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.16] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* Keyframes */}
      <style>
        {`
        @keyframes floaty {
          0%, 100% { transform: translateY(0px);}
          50% { transform: translateY(-6px);}
        }
        @keyframes shimmer {
          0% { background-position: -150% 0; }
          100% { background-position: 150% 0; }
        }
        .animate-floaty { animation: floaty 4.5s ease-in-out infinite; }
        .animate-shimmer {
          background-image: linear-gradient(110deg, transparent, rgba(255,255,255,0.12), transparent);
          background-size: 200% 100%;
          animation: shimmer 3.5s linear infinite;
        }
        `}
      </style>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* ------------------------------------------------------------
         * HEADER – orb + title + stats
         * ------------------------------------------------------------ */}
        <section className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: CodeSync orb + text + search */}
          <div className="flex items-center gap-4">
            {/* Mini orb */}
            <div className="relative">
              <div className="h-16 w-16 rounded-3xl bg-slate-950/90 border border-slate-800 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.7)]">
                <div className="relative flex items-center justify-center">
                  <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-sky-400 via-fuchsia-400 to-rose-400 opacity-90" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[0.6rem] font-semibold tracking-[0.22em] uppercase text-slate-950">
                      CS
                    </span>
                  </div>
                </div>
              </div>
              {/* Thin spinning ring */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border border-slate-800 border-t-sky-400/80 border-r-fuchsia-400/70 animate-spin [animation-duration:1.8s]" />
              </div>
            </div>

            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">
                Multi-platform leaderboard
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                College{" "}
                <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                  CodeSync leaderboard
                </span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
                One scoreboard for your entire coding grind – problems,
                contests, ratings and commits folded into a single CodeSync
                score.
              </p>

              {/* Search bar */}
              <div className="mt-4 max-w-md">
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                  <input
                    className="w-full rounded-full bg-[#050712] border border-slate-700 pl-9 pr-3 py-2 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    placeholder="Search by student name, coding handle or roll number…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: 3 compact stat cards */}
          <div className="w-full max-w-sm lg:max-w-md grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Students"
              value={totalUsers.toLocaleString("en-IN")}
              description="Linked to CodeSync."
              icon={<FiUsers className="text-base text-sky-400" />}
            />
            <SummaryCard
              label="Platforms"
              value={activePlatformsCount.toString()}
              description="LC / CF / CC / GH / HR / AC."
              icon={<FiActivity className="text-base text-emerald-400" />}
            />
            <SummaryCard
              label="Total score"
              value={totalScore.toLocaleString("en-IN")}
              description="Sum of all CodeSync scores."
              icon={<FaTrophy className="text-base text-amber-300" />}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------
         * FILTER STRIP
         * ------------------------------------------------------------ */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/85 px-4 sm:px-5 py-3 sm:py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between backdrop-blur-xl">
          <div className="flex flex-wrap gap-2 text-[0.7rem]">
            <FilterChip
              label="Year"
              value={yearFilter}
              onChange={setYearFilter}
              options={["ALL", ...uniqueYears]}
            />
            <FilterChip
              label="Branch"
              value={branchFilter}
              onChange={setBranchFilter}
              options={["ALL", ...uniqueBranches]}
            />
            <FilterChip
              label="Section"
              value={sectionFilter}
              onChange={setSectionFilter}
              options={["ALL", ...uniqueSections]}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[0.7rem] sm:text-xs">
            <p className="text-slate-500">
              Showing{" "}
              <span className="text-sky-300 font-semibold">
                {filtered.length}
              </span>{" "}
              students
              {yearFilter !== "ALL" && (
                <>
                  {" "}
                  · Y <span className="font-semibold">{yearFilter}</span>
                </>
              )}
              {branchFilter !== "ALL" && <> · {branchFilter}</>}
              {sectionFilter !== "ALL" && <> · Sec {sectionFilter}</>}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortMode("score")}
                className={`px-3 py-1 rounded-full border text-[0.7rem] flex items-center gap-1 transition ${
                  sortMode === "score"
                    ? "border-sky-500 bg-sky-500/20 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.4)]"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400"
                }`}
              >
                ⬇ Score
              </button>
              <button
                type="button"
                onClick={() => setSortMode("rank")}
                className={`px-3 py-1 rounded-full border text-[0.7rem] flex items-center gap-1 transition ${
                  sortMode === "rank"
                    ? "border-sky-500 bg-sky-500/20 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.4)]"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400"
                }`}
              >
                # Rank
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------
         * PODIUM TOP 3
         * ------------------------------------------------------------ */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Podium
            </p>
            {error && (
              <p className="text-[0.7rem] text-rose-400 max-w-xs text-right">
                {error}
              </p>
            )}
          </div>

          <div className="relative mt-3 flex flex-col items-center gap-6 lg:flex-row lg:items-end lg:justify-center">
            {/* Neon bar under podium */}
            {top3.length > 0 && (
              <div className="pointer-events-none absolute -bottom-8 left-1/2 h-12 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.5),_transparent_70%)] blur-2xl" />
            )}

            {top3.length === 0 && (
              <p className="text-center text-sm text-slate-400">
                No leaderboard data yet.
              </p>
            )}

            {top3[1] && (
              <PodiumCard
                entry={top3[1]}
                size="md"
                variant="silver"
                onClick={handleProfileClick}
              />
            )}

            {top3[0] && (
              <PodiumCard
                entry={top3[0]}
                size="lg"
                variant="gold"
                onClick={handleProfileClick}
              />
            )}

            {top3[2] && (
              <PodiumCard
                entry={top3[2]}
                size="md"
                variant="bronze"
                onClick={handleProfileClick}
              />
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------
         * TABLE
         * ------------------------------------------------------------ */}
        <section className="mt-2 space-y-3 pb-10">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#050712]/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
            {/* DESKTOP HEADER */}
            <div className="hidden md:grid grid-cols-[70px,2.6fr,1.4fr,1fr,0.9fr,0.9fr,1.1fr,0.9fr,0.9fr,0.9fr,0.9fr,0.9fr,0.9fr] text-[0.7rem] uppercase tracking-wide text-slate-300 bg-[#020617] border-b border-slate-800 px-4 py-2">
              <span>Rank</span>
              <span>Student</span>
              <span>Roll No</span>
              <span>Branch</span>
              <span>Sec</span>
              <span>Year</span>
              <span className="text-emerald-300">Total score ↓</span>
              <span className="text-amber-300">LC</span>
              <span className="text-orange-300">CC</span>
              <span className="text-emerald-300">HR</span>
              <span className="text-sky-300">CF</span>
              <span className="text-lime-300">GH</span>
              <span className="text-indigo-300">AC</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {tableEntries.map((entry, idx) => {
                const score = entry.cpScores?.displayScore ?? 0;
                const isTop10 = entry.rank <= 10;
                const isCurrentUser =
                  currentStudentId && entry.studentId === currentStudentId;

                const rankChipBase =
                  entry.rank === 1
                    ? "bg-gradient-to-br from-amber-300 via-yellow-300 to-orange-400 text-slate-950 border-amber-400"
                    : entry.rank === 2
                    ? "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-900 border-slate-300"
                    : entry.rank === 3
                    ? "bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 text-slate-950 border-amber-500"
                    : "bg-slate-950 text-slate-200 border-slate-700";

                const rowBg = isCurrentUser
                  ? "bg-gradient-to-r from-sky-950/95 via-fuchsia-950/40 to-slate-950/95"
                  : isTop10
                  ? "bg-[#020617]"
                  : "bg-[#050712]";

                const rowHover = isCurrentUser
                  ? "hover:from-sky-900 hover:via-fuchsia-900 hover:to-slate-900"
                  : "hover:bg-slate-900/90";

                const rowBorderLeft = isCurrentUser
                  ? "border-l-2 border-l-sky-400"
                  : "border-l border-l-transparent";

                return (
                  <button
                    key={entry.studentId ?? `${entry.rank}-${idx}`}
                    type="button"
                    onClick={() => handleProfileClick(entry.studentId)}
                    className={`w-full text-left group active:scale-[0.995] transition-transform`}
                  >
                    {/* DESKTOP ROW */}
                    <div
                      className={`hidden md:grid grid-cols-[70px,2.6fr,1.4fr,1fr,0.9fr,0.9fr,1.1fr,0.9fr,0.9fr,0.9fr,0.9fr,0.9fr,0.9fr] items-center px-4 py-3 text-xs ${rowBg} ${rowHover} ${rowBorderLeft}`}
                    >
                      {/* Rank chip */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[0.75rem] font-semibold border shadow-sm shadow-black/40 ${rankChipBase} ${
                            isCurrentUser
                              ? "ring-2 ring-sky-400/70 ring-offset-[2px] ring-offset-slate-950"
                              : ""
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </div>

                      {/* Name + avatar */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div
                            className={`h-8 w-8 rounded-full border overflow-hidden flex items-center justify-center text-[0.75rem] font-semibold bg-slate-900 ${
                              entry.rank === 1
                                ? "border-amber-400/90"
                                : entry.rank === 2
                                ? "border-slate-300/90"
                                : entry.rank === 3
                                ? "border-amber-600/90"
                                : "border-slate-700"
                            }`}
                          >
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.name || "avatar"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (entry.name || "U")[0]?.toUpperCase()
                            )}
                          </div>
                          {isTop10 && !isCurrentUser && (
                            <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-sky-500/40" />
                          )}
                          {isCurrentUser && (
                            <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-sky-400/70" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-100 group-hover:text-sky-200">
                              {entry.name || "Unknown"}
                            </span>
                            {isCurrentUser && (
                              <span className="rounded-full bg-sky-500/20 border border-sky-500/60 px-2 py-[1px] text-[0.6rem] font-semibold text-sky-200">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[0.7rem] text-slate-500">
                            {entry.branch || "Branch —"}{" "}
                            {entry.year ? `· ${entry.year}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Roll */}
                      <span className="text-[0.75rem] text-slate-200">
                        {entry.rollNumber || "—"}
                      </span>

                      {/* Branch */}
                      <span className="text-[0.75rem] text-slate-200">
                        {entry.branch || "—"}
                      </span>

                      {/* Section */}
                      <span className="text-[0.75rem] text-slate-200">
                        {entry.section || "—"}
                      </span>

                      {/* Year */}
                      <span className="text-[0.75rem] text-slate-200">
                        {entry.year ?? "—"}
                      </span>

                      {/* Total score */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[0.8rem] font-semibold text-emerald-300">
                          {formatScore(score)}
                        </span>
                      </div>

                      {/* Platform scores with tooltips */}
                      {PLATFORM_ORDER.map((p) => (
                        <PlatformCell
                          key={p}
                          label={p.toUpperCase()}
                          colorClass={
                            p === "leetcode"
                              ? "text-amber-300"
                              : p === "codechef"
                              ? "text-orange-300"
                              : p === "hackerrank"
                              ? "text-emerald-300"
                              : p === "codeforces"
                              ? "text-sky-300"
                              : p === "github"
                              ? "text-lime-300"
                              : "text-indigo-300"
                          }
                          value={getPlatformScore(entry, p)}
                          fullLabel={PLATFORM_LABEL[p]}
                        />
                      ))}
                    </div>

                    {/* MOBILE ROW */}
                    <div
                      className={`md:hidden px-3 py-3 text-xs flex flex-col gap-2 ${rowBg} ${rowHover} ${rowBorderLeft}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[0.75rem] font-semibold border shadow-sm shadow-black/40 ${rankChipBase} ${
                            isCurrentUser
                              ? "ring-2 ring-sky-400/70 ring-offset-[2px] ring-offset-slate-950"
                              : ""
                          }`}
                        >
                          {entry.rank}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-full border overflow-hidden flex items-center justify-center text-[0.7rem] font-semibold bg-slate-900 ${
                              entry.rank === 1
                                ? "border-amber-400/90"
                                : entry.rank === 2
                                ? "border-slate-300/90"
                                : entry.rank === 3
                                ? "border-amber-600/90"
                                : "border-slate-700"
                            }`}
                          >
                            {entry.avatarUrl ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.name || "avatar"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (entry.name || "U")[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-100 group-hover:text-sky-200">
                                {entry.name || "Unknown"}
                              </p>
                              {isCurrentUser && (
                                <span className="rounded-full bg-sky-500/20 border border-sky-500/60 px-2 py-[1px] text-[0.6rem] font-semibold text-sky-200">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[0.7rem] text-slate-500">
                              {entry.branch || "—"} ·{" "}
                              {entry.section
                                ? `Sec ${entry.section}`
                                : "Section —"}{" "}
                              · {entry.year || "Year —"}
                            </p>
                            <p className="mt-1 text-[0.7rem] text-emerald-300">
                              Score: {formatScore(score)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 ml-10 grid grid-cols-3 gap-1 text-[0.65rem]">
                        {PLATFORM_ORDER.map((p) => (
                          <span
                            key={p}
                            className={
                              p === "leetcode"
                                ? "text-amber-300"
                                : p === "codechef"
                                ? "text-orange-300"
                                : p === "hackerrank"
                                ? "text-emerald-300"
                                : p === "codeforces"
                                ? "text-sky-300"
                                : p === "github"
                                ? "text-lime-300"
                                : "text-indigo-300"
                            }
                          >
                            {p === "leetcode"
                              ? "LC"
                              : p === "codechef"
                              ? "CC"
                              : p === "hackerrank"
                              ? "HR"
                              : p === "codeforces"
                              ? "CF"
                              : p === "github"
                              ? "GH"
                              : "AC"}
                            : {formatScore(getPlatformScore(entry, p))}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}

              {tableEntries.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-slate-500">
                  No students match the current filters.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LeaderboardPage;

/* ------------------------------------------------------------------
 * SMALL COMPONENTS
 * ------------------------------------------------------------------ */

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  description,
  icon,
}) => {
  return (
    <div className="relative rounded-xl border border-slate-800 bg-[#050712]/95 px-3 py-2.5 text-[0.75rem] shadow-md shadow-black/40 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 animate-shimmer opacity-20" />
      <div className="relative flex items-start gap-2">
        <div className="mt-[2px] flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-slate-700">
          {icon}
        </div>
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-50 leading-none">
            {value}
          </p>
          <p className="mt-1 text-[0.65rem] text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
};

type FilterChipProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
};

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  value,
  options,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const currentLabel = value === "ALL" ? "All" : value;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-[#050712] px-3 py-1 text-[0.7rem] text-slate-200 hover:border-sky-400 hover:bg-slate-900 transition"
      >
        <FiFilter className="text-[0.7rem] text-slate-500" />
        <span className="text-slate-400 mr-1">{label}:</span>
        <span className="font-medium">{currentLabel}</span>
        <FiChevronDown className="text-[0.7rem] text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 min-w-[170px] rounded-xl border border-slate-700 bg-[#050712] shadow-xl z-30">
          {options.map((opt) => {
            const isActive = value === opt;
            const labelText = opt === "ALL" ? "All" : opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[0.75rem] ${
                  isActive
                    ? "bg-sky-600/25 text-sky-200"
                    : "bg-transparent text-slate-200 hover:bg-slate-900/80"
                }`}
              >
                {labelText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

type PodiumVariant = "gold" | "silver" | "bronze";

type PodiumCardProps = {
  entry: LeaderboardEntry;
  size: "md" | "lg";
  variant: PodiumVariant;
  onClick: (id: string) => void;
};

/**
 * Podium card with glass + glows + animated float
 */
const PodiumCard: React.FC<PodiumCardProps> = ({
  entry,
  size,
  variant,
  onClick,
}) => {
  const score = entry.cpScores?.displayScore ?? 0;

  const baseHeight = size === "lg" ? "min-h-[360px]" : "min-h-[330px]";
  const baseWidth = size === "lg" ? "w-[320px]" : "w-[280px]";

  const variantConfig: Record<
    PodiumVariant,
    {
      chipBg: string;
      ringFrom: string;
      ringTo: string;
      label: string;
      badgeIcon: React.ReactNode;
      pedestalClass: string;
      borderGlow: string;
    }
  > = {
    gold: {
      chipBg:
        "bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 text-slate-950",
      ringFrom: "from-amber-300",
      ringTo: "to-orange-500",
      label: "Gold · Rank 1",
      badgeIcon: <FaCrown className="text-[0.7rem]" />,
      pedestalClass: "h-3",
      borderGlow: "border-amber-300/70 shadow-[0_0_40px_rgba(251,191,36,0.35)]",
    },
    silver: {
      chipBg:
        "bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400 text-slate-900",
      ringFrom: "from-slate-200",
      ringTo: "to-slate-400",
      label: "Silver · Rank 2",
      badgeIcon: <FaMedal className="text-[0.7rem]" />,
      pedestalClass: "h-2.5",
      borderGlow: "border-slate-300/70 shadow-[0_0_36px_rgba(148,163,184,0.35)]",
    },
    bronze: {
      chipBg:
        "bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 text-slate-950",
      ringFrom: "from-orange-500",
      ringTo: "to-amber-400",
      label: "Bronze · Rank 3",
      badgeIcon: <FaMedal className="text-[0.7rem]" />,
      pedestalClass: "h-2",
      borderGlow:
        "border-amber-500/70 shadow-[0_0_32px_rgba(245,158,11,0.35)]",
    },
  };

  const cfg = variantConfig[variant];

  const allPlatformScores: { key: PlatformKey; label: string; value: number }[] =
    PLATFORM_ORDER.map((k) => ({
      key: k,
      label: PLATFORM_LABEL[k],
      value: getPlatformScore(entry, k),
    }));

  return (
    <button
      type="button"
      onClick={() => onClick(entry.studentId)}
      className={`relative flex flex-col items-center ${baseHeight} ${baseWidth}
        rounded-3xl border bg-[#050712]/80
        px-4 pt-4 pb-3 backdrop-blur-2xl
        animate-floaty
        transition-transform duration-300 hover:-translate-y-3 active:scale-[0.98]
        ${cfg.borderGlow}
      `}
    >
      {/* soft gradient inside */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/40 opacity-60" />

      {/* CONTENT */}
      <div className="relative flex-1 flex flex-col items-center w-full gap-3">
        {/* header chip row */}
        <div className="flex w-full items-center justify-between text-[0.7rem]">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] font-semibold ${cfg.chipBg}`}
          >
            {cfg.badgeIcon}
            {cfg.label}
          </span>
          {variant === "gold" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-500/15 px-2 py-[2px] text-[0.6rem] font-semibold text-amber-100">
              <FaTrophy className="text-[0.65rem]" />
              Campus topper
            </span>
          )}
        </div>

        {/* avatar with ring */}
        <div className="mt-1">
          <div
            className={`h-20 w-20 rounded-full bg-gradient-to-br ${cfg.ringFrom} ${cfg.ringTo} p-[3px]`}
          >
            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 overflow-hidden text-xl font-bold text-slate-100">
              {entry.avatarUrl ? (
                <img
                  src={entry.avatarUrl}
                  alt={entry.name || "avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                (entry.name || "U")[0]?.toUpperCase()
              )}
            </div>
          </div>
        </div>

        {/* name + meta */}
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-50 line-clamp-2">
            {entry.name || "Unknown"}
          </p>
          <p className="text-[0.65rem] text-slate-400">
            {entry.branch || "Branch —"}{" "}
            {entry.section ? `· Sec ${entry.section}` : ""}{" "}
            {entry.year ? `· ${entry.year}` : ""}
          </p>
        </div>

        {/* total score */}
        <div className="flex flex-col items-center gap-1 mt-1">
          <p className="text-[0.65rem] text-slate-400 uppercase tracking-[0.22em]">
            Total CodeSync score
          </p>
          <p className="text-2xl font-bold text-emerald-300">
            {score.toLocaleString("en-IN")}
          </p>
        </div>

        {/* platform breakdown */}
        <div className="mt-3 w-full rounded-2xl bg-[#020617]/90 border border-slate-800 px-3 py-2">
          <p className="text-[0.65rem] text-slate-400 mb-1">
            Platform breakdown
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.65rem]">
            {allPlatformScores.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between group"
                title={`${p.label}: ${formatScore(p.value)}`}
              >
                <span className="text-slate-400 truncate">{p.label}</span>
                <span className="font-semibold text-slate-100 group-hover:text-sky-200">
                  {formatScore(p.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* pedestal neon bar */}
      <div className="relative w-full flex justify-center mt-2">
        <div
          className={`rounded-full bg-gradient-to-r ${cfg.ringFrom} ${cfg.ringTo} ${cfg.pedestalClass} w-32 blur-[1px]`}
        />
      </div>
    </button>
  );
};

type PlatformCellProps = {
  label: string;
  fullLabel: string;
  colorClass: string;
  value: number;
};

const PlatformCell: React.FC<PlatformCellProps> = ({
  fullLabel,
  colorClass,
  value,
}) => {
  const formatted = formatScore(value);

  return (
    <div
      className={`relative text-[0.75rem] ${colorClass} group`}
      title={`${fullLabel}: ${formatted}`}
    >
      {formatted}
      <span className="pointer-events-none absolute left-0 -bottom-[2px] h-[1px] w-0 bg-current transition-all duration-300 group-hover:w-full opacity-70" />
    </div>
  );
};
