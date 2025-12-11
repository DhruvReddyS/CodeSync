import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";

import {
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiArrowUpRight,
  FiUsers,
  FiActivity,
} from "react-icons/fi";
import { FaCrown, FaMedal, FaTrophy } from "react-icons/fa";

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
  cpScores: CpScores | null;
  cpHandles: Partial<Record<PlatformKey, string>>;
};

type ApiResponse = {
  leaderboard: LeaderboardEntry[];
};

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

  // ---------- FETCH ----------
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
          // ensure rank is consistent when backend changes limit
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

  // ---------- DERIVED FILTERS ----------
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

  // apply filters + search + sort
  useEffect(() => {
    let list = [...entries];

    if (branchFilter !== "ALL") {
      list = list.filter((e) => e.branch === branchFilter);
    }
    if (yearFilter !== "ALL") {
      list = list.filter((e) => String(e.year) === yearFilter);
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
        return name.includes(q) || handleStr.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortMode === "rank") {
        return a.rank - b.rank;
      }
      const sa = a.cpScores?.displayScore ?? 0;
      const sb = b.cpScores?.displayScore ?? 0;
      return sb - sa;
    });

    setFiltered(list);
  }, [entries, branchFilter, yearFilter, sectionFilter, search, sortMode]);

  // ---------- SUMMARY ----------
  const totalUsers = entries.length;
  const totalScore = entries.reduce(
    (acc, e) => acc + (e.cpScores?.displayScore ?? 0),
    0
  );

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const handleProfileClick = (id: string) => {
    // Future: create route /profile/:studentId
    navigate(`/profile/${id}`);
  };

  // small helper for score
  const formatScore = (score: number | null | undefined) =>
    score == null ? "—" : score.toLocaleString("en-IN");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050509] text-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Loading leaderboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.2),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-80px] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.22),_transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-500">
              Multi-platform leaderboard
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">
              College{" "}
              <span className="bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                CodeSync Leaderboard
              </span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl">
              Live ranking across LeetCode, CodeChef, HackerRank, Codeforces,
              AtCoder and GitHub — merged into one score. Tap a card or row to
              view a student&apos;s full profile.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-slate-800 bg-black/40 px-4 py-3 text-xs shadow-lg shadow-black/40 min-w-[180px]">
              <p className="flex items-center gap-2 text-slate-300">
                <FiUsers className="text-sky-400" /> Total coders
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {totalUsers.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[0.65rem] text-slate-500">
                Active on at least one platform.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/40 px-4 py-3 text-xs shadow-lg shadow-black/40 min-w-[220px]">
              <p className="flex items-center gap-2 text-slate-300">
                <FiActivity className="text-emerald-400" /> Total score pool
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {totalScore.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-[0.65rem] text-slate-500">
                Sum of CodeSync scores for displayed students.
              </p>
            </div>
          </div>
        </header>

        {/* Search + Filters */}
        <section className="rounded-2xl border border-slate-800 bg-black/40 px-4 sm:px-5 py-3 sm:py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between backdrop-blur-md">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative w-full max-w-md">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
              <input
                className="w-full rounded-full bg-slate-950/70 border border-slate-700 pl-9 pr-3 py-2 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                placeholder="Search by name or handle…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="hidden md:flex items-center gap-1 text-[0.7rem] text-slate-500">
              <FiFilter />
              Smart filters on branch, year and section.
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.7rem]">
            <FilterChip
              label="Branch"
              value={branchFilter}
              onChange={setBranchFilter}
              options={["ALL", ...uniqueBranches]}
            />
            <FilterChip
              label="Year"
              value={yearFilter}
              onChange={setYearFilter}
              options={["ALL", ...uniqueYears]}
            />
            <FilterChip
              label="Section"
              value={sectionFilter}
              onChange={setSectionFilter}
              options={["ALL", ...uniqueSections]}
            />

            <div className="ml-1 flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/70 px-2 py-1">
              <span className="text-slate-500 mr-1">Sort:</span>
              <button
                type="button"
                onClick={() => setSortMode("score")}
                className={`px-2 py-[2px] rounded-full ${
                  sortMode === "score"
                    ? "bg-sky-500/90 text-slate-900 font-semibold"
                    : "text-slate-400"
                }`}
              >
                By score
              </button>
              <button
                type="button"
                onClick={() => setSortMode("rank")}
                className={`px-2 py-[2px] rounded-full ${
                  sortMode === "rank"
                    ? "bg-sky-500/90 text-slate-900 font-semibold"
                    : "text-slate-400"
                }`}
              >
                By rank
              </button>
            </div>
          </div>
        </section>

        {/* Podium Top 3 */}
        <section className="space-y-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Live podium
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-100">
              Top <span className="text-amber-300">3</span> competitive
              programmers
            </p>
          </div>

          <div className="relative flex flex-col items-center gap-5 lg:flex-row lg:items-end lg:justify-center">
            {/* Rank 2, 1, 3 layout */}
            {top3.length === 0 && (
              <p className="text-center text-sm text-slate-400">
                No leaderboard data yet.
              </p>
            )}
            {top3[1] && (
              <PodiumCard
                entry={top3[1]}
                color="emerald"
                size="md"
                onClick={handleProfileClick}
                glowClass="animate-[pulse_2.6s_ease-in-out_infinite]"
              />
            )}
            {top3[0] && (
              <PodiumCard
                entry={top3[0]}
                color="amber"
                size="lg"
                highlight
                onClick={handleProfileClick}
                glowClass="animate-[pulse_2s_ease-in-out_infinite]"
              />
            )}
            {top3[2] && (
              <PodiumCard
                entry={top3[2]}
                color="sky"
                size="md"
                onClick={handleProfileClick}
                glowClass="animate-[pulse_3s_ease-in-out_infinite]"
              />
            )}

            {/* subtle glow strip under podium */}
            {top3.length > 0 && (
              <div className="pointer-events-none absolute -bottom-6 left-1/2 h-10 w-[420px] -translate-x-1/2 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.4),_transparent_70%)] opacity-60 blur-xl" />
            )}
          </div>
        </section>

        {/* Table */}
        <section className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="text-sky-300 font-semibold">
                {filtered.length}
              </span>{" "}
              students after filters.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black/60 backdrop-blur-md">
            <div className="hidden md:grid grid-cols-[70px,2.2fr,1fr,1fr,1.3fr,1fr] text-[0.7rem] uppercase tracking-wide text-slate-400 bg-slate-900/70 border-b border-slate-800 px-4 py-2">
              <span>Rank</span>
              <span>Name</span>
              <span>Branch</span>
              <span>Year</span>
              <span>Total score</span>
              <span>Peek</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {rest.map((entry) => {
                const score = entry.cpScores?.displayScore ?? 0;
                const normalized =
                  entry.cpScores?.codeSyncScore != null
                    ? Math.min(100, Math.max(0, entry.cpScores.codeSyncScore))
                    : null;

                return (
                  <button
                    key={entry.studentId}
                    type="button"
                    onClick={() => handleProfileClick(entry.studentId)}
                    className="w-full text-left bg-black/40 hover:bg-slate-900/70 transition-colors group"
                  >
                    {/* desktop layout */}
                    <div className="hidden md:grid grid-cols-[70px,2.2fr,1fr,1fr,1.3fr,1fr] items-center px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[0.75rem] font-semibold text-slate-200">
                          {entry.rank}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-100 group-hover:text-sky-200">
                          {entry.name || "Unknown"}
                        </span>
                        <span className="text-[0.7rem] text-slate-500">
                          {entry.section
                            ? `${entry.branch || "Dept"} · ${entry.section} `
                            : entry.branch || "—"}
                        </span>
                      </div>

                      <span className="text-[0.75rem] text-slate-200">
                        {entry.branch || "—"}
                      </span>

                      <span className="text-[0.75rem] text-slate-200">
                        {entry.year ?? "—"}
                      </span>

                      <div className="flex flex-col gap-1">
                        <span className="text-[0.8rem] font-semibold text-emerald-300">
                          {formatScore(entry.cpScores?.displayScore)}
                        </span>
                        {normalized != null && (
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
                              style={{ width: `${normalized}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end pr-1">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-[3px] text-[0.7rem] text-slate-300 group-hover:border-sky-400 group-hover:text-sky-200">
                          view profile
                          <FiArrowUpRight className="text-[0.65rem]" />
                        </span>
                      </div>
                    </div>

                    {/* mobile layout */}
                    <div className="md:hidden px-3 py-3 text-xs flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-[0.75rem] font-semibold text-slate-200">
                          {entry.rank}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-100 group-hover:text-sky-200">
                          {entry.name || "Unknown"}
                        </p>
                        <p className="text-[0.7rem] text-slate-500">
                          {entry.branch || "—"} ·{" "}
                          {entry.section ? `Sec ${entry.section}` : "Section —"} ·{" "}
                          {entry.year || "Year —"}
                        </p>
                        <p className="mt-1 text-[0.7rem] text-emerald-300">
                          Score: {formatScore(entry.cpScores?.displayScore)}
                        </p>
                      </div>
                      <FiArrowUpRight className="text-slate-500 group-hover:text-sky-300" />
                    </div>
                  </button>
                );
              })}

              {rest.length === 0 && top3.length > 0 && (
                <p className="px-4 py-6 text-center text-xs text-slate-500">
                  Only top 3 students match the current filters.
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

/* ---------- SMALL COMPONENTS ---------- */

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
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-[0.7rem] text-slate-200 hover:border-sky-400 hover:bg-slate-900 transition"
      >
        <FiFilter className="text-[0.7rem] text-slate-500" />
        <span className="text-slate-400 mr-1">{label}:</span>
        <span className="font-medium">
          {value === "ALL" ? "All" : value}
        </span>
        <FiChevronDown className="text-[0.7rem] text-slate-500" />
      </button>

      {/* Simple dropdown */}
      <div className="group relative">
        <select
          className="absolute top-0 left-0 h-full w-full opacity-0 cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "ALL" ? "All" : opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

type PodiumCardProps = {
  entry: LeaderboardEntry;
  size: "md" | "lg";
  color: "amber" | "emerald" | "sky";
  highlight?: boolean;
  onClick: (id: string) => void;
  glowClass?: string;
};

const PodiumCard: React.FC<PodiumCardProps> = ({
  entry,
  size,
  color,
  highlight,
  onClick,
  glowClass,
}) => {
  const score = entry.cpScores?.displayScore ?? 0;
  const normalized =
    entry.cpScores?.codeSyncScore != null
      ? Math.min(100, Math.max(0, entry.cpScores.codeSyncScore))
      : null;

  const baseHeight = size === "lg" ? "h-[260px]" : "h-[220px]";

  const colorRing =
    color === "amber"
      ? "from-amber-400 via-amber-300 to-yellow-400"
      : color === "emerald"
      ? "from-emerald-400 via-emerald-300 to-lime-300"
      : "from-sky-400 via-cyan-300 to-blue-400";

  const rankBadgeBg =
    color === "amber"
      ? "bg-amber-400 text-black"
      : color === "emerald"
      ? "bg-emerald-400 text-black"
      : "bg-sky-400 text-black";

  const RankIcon = highlight ? FaCrown : FaMedal;

  return (
    <button
      type="button"
      onClick={() => onClick(entry.studentId)}
      className={`
        relative flex flex-col items-center justify-between
        rounded-3xl border border-slate-800 bg-[#05040d]/95
        px-4 pt-4 pb-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]
        ${baseHeight}
        transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(0,0,0,0.95)]
        group
      `}
    >
      {/* animated glow behind card */}
      <div
        className={`pointer-events-none absolute inset-x-4 bottom-3 top-10 rounded-[28px] bg-gradient-to-br ${colorRing} opacity-10 blur-xl ${glowClass}`}
      />

      <div className="relative flex w-full items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[0.7rem] font-semibold ${rankBadgeBg}`}
          >
            <RankIcon className="text-[0.7rem]" />
            Rank {entry.rank}
          </span>
        </div>
        {highlight && (
          <span className="rounded-full border border-amber-400/70 bg-amber-500/15 px-2 py-[2px] text-[0.6rem] font-semibold text-amber-200">
            MVP of the board
          </span>
        )}
      </div>

      {/* avatar circle */}
      <div className="relative mt-1 mb-4">
        <div
          className={`
            h-20 w-20 rounded-full bg-gradient-to-br ${colorRing} p-[2px]
            shadow-[0_0_30px_rgba(56,189,248,0.45)]
            group-hover:rotate-3 transition-transform duration-300
          `}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950 text-xl font-bold text-slate-200">
            {/* letter avatar */}
            {(entry.name || "U")[0]?.toUpperCase()}
          </div>
        </div>
        {highlight && (
          <FaTrophy className="absolute -top-3 -right-3 text-amber-300 animate-bounce" />
        )}
      </div>

      <div className="relative text-center space-y-1">
        <p className="text-sm font-semibold text-slate-50 line-clamp-2">
          {entry.name || "Unknown"}
        </p>
        <p className="text-[0.65rem] text-slate-400">
          {entry.branch || "Dept —"}{" "}
          {entry.section ? `· Sec ${entry.section}` : ""}{" "}
          {entry.year ? `· ${entry.year}` : ""}
        </p>
      </div>

      <div className="relative mt-4 flex w-full flex-col items-center gap-2">
        <p className="text-[0.65rem] text-slate-400 uppercase tracking-[0.22em]">
          Total CodeSync score
        </p>
        <p className="text-2xl font-bold text-emerald-300">
          {score.toLocaleString("en-IN")}
        </p>
        {normalized != null && (
          <div className="mt-1 w-full max-w-[220px] h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300"
              style={{ width: `${normalized}%` }}
            />
          </div>
        )}
        <p className="text-[0.65rem] text-slate-500">
          Tap to open full stats &amp; platform breakdown.
        </p>
      </div>
    </button>
  );
};
