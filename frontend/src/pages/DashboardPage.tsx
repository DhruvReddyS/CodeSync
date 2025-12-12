// src/pages/DashboardPage.tsx

import React, { useEffect, useState } from "react";
import apiClient from "../lib/apiClient";
import {
  SiLeetcode,
  SiCodechef,
  SiHackerrank,
  SiCodeforces,
  SiGithub,
} from "react-icons/si";
import { FaUserEdit } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/* ------------------------------------------------------------------
 * TYPES (frontend only)
 * ------------------------------------------------------------------ */

type PlatformKey =
  | "leetcode"
  | "codechef"
  | "hackerrank"
  | "codeforces"
  | "github"
  | "atcoder";

type PlatformConfig = {
  key: PlatformKey;
  name: string;
  accentFrom: string;
  accentTo: string;
  icon?: React.ReactNode;
  tag?: string;
  themeChip?: string;
};

const PLATFORMS: PlatformConfig[] = [
  {
    key: "leetcode",
    name: "LeetCode",
    accentFrom: "from-amber-400/80",
    accentTo: "to-amber-200/40",
    icon: <SiLeetcode className="text-amber-300 text-xl" />,
    tag: "DSA · Interviews",
    themeChip: "bg-amber-500/10 text-amber-200 border-amber-400/40",
  },
  {
    key: "codechef",
    name: "CodeChef",
    accentFrom: "from-stone-200/70",
    accentTo: "to-amber-200/40",
    icon: <SiCodechef className="text-amber-100 text-xl" />,
    tag: "Rated Contests",
    themeChip: "bg-amber-400/10 text-amber-100 border-amber-300/50",
  },
  {
    key: "hackerrank",
    name: "HackerRank",
    accentFrom: "from-emerald-400/80",
    accentTo: "to-teal-300/50",
    icon: <SiHackerrank className="text-emerald-300 text-xl" />,
    tag: "Fundamentals",
    themeChip: "bg-emerald-500/10 text-emerald-100 border-emerald-400/50",
  },
  {
    key: "codeforces",
    name: "Codeforces",
    accentFrom: "from-sky-400/80",
    accentTo: "to-indigo-400/60",
    icon: <SiCodeforces className="text-sky-300 text-xl" />,
    tag: "Serious CP",
    themeChip: "bg-sky-500/10 text-sky-100 border-sky-400/60",
  },
  {
    key: "github",
    name: "GitHub",
    accentFrom: "from-slate-200/70",
    accentTo: "to-slate-500/40",
    icon: <SiGithub className="text-slate-100 text-xl" />,
    tag: "Projects",
    themeChip: "bg-slate-500/15 text-slate-100 border-slate-300/60",
  },
  {
    key: "atcoder",
    name: "AtCoder",
    accentFrom: "from-cyan-400/80",
    accentTo: "to-sky-200/50",
    tag: "Advanced CP",
    themeChip: "bg-cyan-500/10 text-cyan-100 border-cyan-400/60",
  },
];

const PLATFORM_KEYS: PlatformKey[] = [
  "leetcode",
  "codechef",
  "hackerrank",
  "codeforces",
  "github",
  "atcoder",
];

const PLATFORM_KEY_SET = new Set<PlatformKey>(PLATFORM_KEYS);

const isPlatformKey = (key: any): key is PlatformKey =>
  PLATFORM_KEY_SET.has(key as PlatformKey);

type CodingHandles = Partial<Record<PlatformKey, string | null>>;

type Badge = { name: string; level?: string | number };
type Certificate = { name: string };

type PlatformStats = {
  platform?: PlatformKey;
  handle?: string;
  displayName?: string;
  profileUrl?: string;

  // Generic / aggregated helpers
  problemsSolvedTotal?: number;
  problemsSolvedByDifficulty?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };
  rating?: number;
  maxRating?: number;
  contestsParticipated?: number;
  score?: number;

  // -------- LeetCode raw ----------
  totalSolved?: number;
  solvedEasy?: number;
  solvedMedium?: number;
  solvedHard?: number;
  contestRating?: number;
  globalRanking?: number;
  attendedContests?: number;
  languages?: Record<string, number>;
  badgesCount?: number;
  badges?: Badge[];

  // -------- Codeforces raw ----------
  rank?: string | number | null;
  maxRank?: string | null;
  contribution?: number;
  friendOfCount?: number;
  problemsSolved?: number;
  contestsAttended?: number;

  // -------- CodeChef raw ----------
  currentRating?: number;
  highestRating?: number | null;
  stars?: number | null;
  division?: string | null;
  globalRank?: number | null;
  countryRank?: number | null;
  fullySolved?:
    | {
        total?: number;
        school?: number;
        easy?: number;
        medium?: number;
        hard?: number;
        challenge?: number;
        peer?: number;
      }
    | number;
  partiallySolved?:
    | {
        total?: number;
      }
    | number;

  // -------- HackerRank raw ----------
  fullName?: string | null;
  country?: string | null;
  certificates?: Certificate[];
  certificatesCount?: number;
  domains?: Record<string, unknown>;
  domainScores?: Record<string, number>;

  // -------- GitHub raw ----------
  totalStars?: number;
  starsReceived?: number;
  publicRepos?: number;
  followers?: number;
  topLanguages?: Record<string, number>;
  contributionsLastYear?: number;
  currentStreak?: number;
  longestStreak?: number;
  forks?: number;

  // -------- AtCoder raw ----------
  ratedMatches?: number;
  lastContest?: string | null;
  title?: string | null;
  totalContests?: number;

  // Timestamps per platform
  lastScrapedAt?: any;
  lastUpdated?: any;
  lastUpdatedAt?: any;

  // Allow ANY extra scraped fields
  [key: string]: any;
};

type PlatformStatsMap = Record<PlatformKey, PlatformStats | null>;

type BackendCpScores = {
  codeSyncScore?: number;
  displayScore?: number;
  platformSkills?: Record<string, any> | any[];
  lastUpdated?: any;
  lastComputedAt?: any;
  [key: string]: any;
};

type StatsResponse = {
  cpHandles: Partial<Record<PlatformKey, string | null>>;
  cpScores: BackendCpScores | null;
  platformStats: Record<PlatformKey, PlatformStats | null>;
};

type CpScoreState = {
  codeSyncScore: number | null;
  displayScore: number | null;
  platformSkills: Partial<Record<PlatformKey, number>>;
  lastComputedAt: string | null;
  raw: BackendCpScores | null;
};

type FirestoreTimestampLike =
  | {
      seconds: number;
      nanoseconds: number;
    }
  | {
      _seconds: number;
      _nanoseconds: number;
    }
  | null;

/* ------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------ */

const parseTimestampToIso = (
  ts: FirestoreTimestampLike | string | undefined
): string | null => {
  if (!ts) return null;

  if (typeof ts === "string") {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return ts;
  }

  if (typeof ts === "object") {
    const seconds =
      (ts as any).seconds ?? (ts as any)._seconds ?? undefined;
    const nanos =
      (ts as any).nanoseconds ?? (ts as any)._nanoseconds ?? 0;

    if (typeof seconds === "number") {
      return new Date(seconds * 1000 + nanos / 1e6).toISOString();
    }
  }

  return null;
};

const formatLastUpdated = (iso: string | null): string => {
  if (!iso) return "Not computed yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not computed yet";
  return d.toLocaleString();
};

const deriveSkillMap = (
  raw: any
): Partial<Record<PlatformKey, number>> => {
  const skillMap: Partial<Record<PlatformKey, number>> = {};
  if (!raw) return skillMap;

  if (Array.isArray(raw)) {
    raw.forEach((ps) => {
      const platform = ps?.platform;
      const skill = ps?.skill;
      if (isPlatformKey(platform) && typeof skill === "number") {
        skillMap[platform] = skill;
      }
    });
    return skillMap;
  }

  if (typeof raw === "object") {
    Object.entries(raw).forEach(([platform, value]) => {
      if (!isPlatformKey(platform)) return;

      if (typeof value === "number") {
        skillMap[platform as PlatformKey] = value;
      } else if (
        value &&
        typeof value === "object" &&
        "skill" in (value as any) &&
        typeof (value as any).skill === "number"
      ) {
        skillMap[platform as PlatformKey] = (value as any).skill;
      }
    });
  }

  return skillMap;
};

const safeNumber = (val: any): number | undefined => {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  return undefined;
};

const renderTopPills = (
  entries: Array<[string, any]>,
  label: string
) => {
  if (!entries.length) return null;

  const normalized: [string, number][] = entries.map(([name, val]) => [
    name,
    typeof val === "number" ? val : Number(val) || 0,
  ]);

  const top = normalized.sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="space-y-1">
      <p className="text-[0.65rem] text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {top.map(([name, val]) => (
          <span
            key={name}
            className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-[1px] text-[0.65rem] text-slate-200"
          >
            {name}:{" "}
            <span className="font-mono text-sky-300">{val}</span>
          </span>
        ))}
        {normalized.length > 4 && (
          <span className="text-[0.65rem] text-slate-500">
            +{normalized.length - 4} more…
          </span>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * LOADING SCREEN
 * ------------------------------------------------------------------ */

const DashboardLoading: React.FC = () => {
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
              CodeSync dashboard
            </span>
          </h1>
          <p className="text-[0.75rem] sm:text-xs text-slate-400 max-w-md mx-auto">
            Pulling live stats from LeetCode, CodeChef, Codeforces, HackerRank,
            AtCoder and GitHub. This is your all-in-one coding mirror.
          </p>
        </div>

        {/* Skeleton cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800/80 bg-slate-950/70 px-4 py-3 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-20 rounded-full bg-slate-800" />
                  <div className="h-2 w-28 rounded-full bg-slate-900" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-slate-900" />
                <div className="h-2 w-5/6 rounded-full bg-slate-900" />
                <div className="h-2 w-2/3 rounded-full bg-slate-900" />
              </div>
            </div>
          ))}
        </div>

        {/* Tiny loading hint */}
        <p className="text-[0.65rem] text-slate-500 mt-2">
          Talking to multiple platforms • Calculating universal score • Warming
          up the leaderboard
        </p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
 * MAIN COMPONENT
 * ------------------------------------------------------------------ */

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [handles, setHandles] = useState<Record<PlatformKey, string>>({
    leetcode: "",
    codechef: "",
    hackerrank: "",
    codeforces: "",
    github: "",
    atcoder: "",
  });

  const [showStats, setShowStats] = useState<Record<PlatformKey, boolean>>({
    leetcode: false,
    codechef: false,
    hackerrank: false,
    codeforces: false,
    github: false,
    atcoder: false,
  });

  const [cpScore, setCpScore] = useState<CpScoreState>({
    codeSyncScore: null,
    displayScore: null,
    platformSkills: {},
    lastComputedAt: null,
    raw: null,
  });

  const [platformStats, setPlatformStats] = useState<PlatformStatsMap>({
    leetcode: null,
    codechef: null,
    hackerrank: null,
    codeforces: null,
    github: null,
    atcoder: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshingPlatform, setRefreshingPlatform] =
    useState<PlatformKey | null>(null);

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editPlatform, setEditPlatform] = useState<PlatformKey | null>(
    null
  );
  const [editValue, setEditValue] = useState<string>("");

  const linkedPlatformsCount = Object.values(handles).filter(
    (v) => v && v.trim().length > 0
  ).length;

  const mainScore: number | null =
    cpScore.displayScore != null
      ? cpScore.displayScore
      : cpScore.codeSyncScore != null
      ? cpScore.codeSyncScore
      : null;

  /* --------------------- API: load stats --------------------- */

  const loadStats = async () => {
    try {
      setServerError(null);
      setSuccessMessage(null);

      const resp = await apiClient.get<StatsResponse>("/student/stats/me");
      const data = resp.data;

      const cpHandles = (data.cpHandles || {}) as CodingHandles;
      const cpScores = data.cpScores || null;
      const statsMap = data.platformStats || {};

      setHandles({
        leetcode: (cpHandles.leetcode as string) || "",
        codechef: (cpHandles.codechef as string) || "",
        hackerrank: (cpHandles.hackerrank as string) || "",
        codeforces: (cpHandles.codeforces as string) || "",
        github: (cpHandles.github as string) || "",
        atcoder: (cpHandles.atcoder as string) || "",
      });

      const skillMap = deriveSkillMap(cpScores?.platformSkills);

      setCpScore({
        codeSyncScore:
          typeof cpScores?.codeSyncScore === "number"
            ? cpScores.codeSyncScore
            : null,
        displayScore:
          typeof cpScores?.displayScore === "number"
            ? cpScores.displayScore
            : null,
        platformSkills: skillMap,
        lastComputedAt: parseTimestampToIso(
          (cpScores?.lastUpdated ??
            cpScores?.lastComputedAt) as
            | FirestoreTimestampLike
            | string
            | undefined
        ),
        raw: cpScores,
      });

      const newStats: PlatformStatsMap = {
        leetcode: statsMap.leetcode || null,
        codechef: statsMap.codechef || null,
        hackerrank: statsMap.hackerrank || null,
        codeforces: statsMap.codeforces || null,
        github: statsMap.github || null,
        atcoder: statsMap.atcoder || null,
      };

      setPlatformStats(newStats);
    } catch (err: any) {
      console.error("[Dashboard] loadStats error:", err);
      const status = err?.response?.status;

      if (status === 403 && err?.response?.data?.onboardingRequired) {
        navigate("/onboarding", { replace: true });
        return;
      }

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load dashboard.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------- edit handle flow --------------------- */

  const handleChange = (key: PlatformKey, value: string) => {
    setHandles((prev) => ({ ...prev, [key]: value }));
  };

  const openEditModal = (key: PlatformKey) => {
    setEditPlatform(key);
    setEditValue(handles[key] || "");
    setServerError(null);
    setSuccessMessage(null);
  };

  const closeEditModal = () => {
    setEditPlatform(null);
    setEditValue("");
  };

  const handleConfirmHandleUpdate = async () => {
    if (!editPlatform) return;
    const key = editPlatform;
    const newHandle = editValue.trim();

    try {
      setServerError(null);
      setSuccessMessage(null);

      const updatedHandles: Record<PlatformKey, string> = {
        ...handles,
        [key]: newHandle,
      };

      setHandles(updatedHandles);

      await apiClient.patch("/student/cp-handles", {
        cpHandles: updatedHandles,
      });

      setSuccessMessage(
        `Updated ${PLATFORMS.find((p) => p.key === key)?.name || key} handle.`
      );

      await loadStats();
      closeEditModal();
    } catch (err: any) {
      console.error("[Dashboard] handleConfirmHandleUpdate error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update handle.";
      setServerError(msg);
    }
  };

  /* --------------------- refresh stats --------------------- */

  const handleUpdateAll = async () => {
    try {
      setRefreshingAll(true);
      setServerError(null);
      setSuccessMessage(null);

      const resp = await apiClient.post<{
        cpScores: BackendCpScores | null;
        platformStats: Record<PlatformKey, PlatformStats | null>;
      }>("/student/stats/refresh-all");

      const cpScores = resp.data.cpScores || null;
      const statsMap = resp.data.platformStats || {};

      const skillMap = deriveSkillMap(cpScores?.platformSkills);

      setCpScore({
        codeSyncScore:
          typeof cpScores?.codeSyncScore === "number"
            ? cpScores.codeSyncScore
            : null,
        displayScore:
          typeof cpScores?.displayScore === "number"
            ? cpScores.displayScore
            : null,
        platformSkills: skillMap,
        lastComputedAt: parseTimestampToIso(
          (cpScores?.lastUpdated ??
            cpScores?.lastComputedAt) as
            | FirestoreTimestampLike
            | string
            | undefined
        ),
        raw: cpScores,
      });

      setPlatformStats({
        leetcode: statsMap.leetcode || null,
        codechef: statsMap.codechef || null,
        hackerrank: statsMap.hackerrank || null,
        codeforces: statsMap.codeforces || null,
        github: statsMap.github || null,
        atcoder: statsMap.atcoder || null,
      });

      setSuccessMessage("Pulled fresh stats from all platforms.");
    } catch (err: any) {
      console.error("[Dashboard] handleUpdateAll error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to refresh all stats.";
      setServerError(msg);
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleUpdatePlatform = async (platform: PlatformKey) => {
    try {
      setRefreshingPlatform(platform);
      setServerError(null);
      setSuccessMessage(null);

      const resp = await apiClient.post<{
        cpScores: BackendCpScores | null;
        platformStats: Record<PlatformKey, PlatformStats | null>;
      }>("/student/stats/refresh-platform", { platform });

      const cpScores = resp.data.cpScores || null;
      const statsMap = resp.data.platformStats || {};

      const skillMap = deriveSkillMap(cpScores?.platformSkills);

      setCpScore({
        codeSyncScore:
          typeof cpScores?.codeSyncScore === "number"
            ? cpScores.codeSyncScore
            : null,
        displayScore:
          typeof cpScores?.displayScore === "number"
            ? cpScores.displayScore
            : null,
        platformSkills: skillMap,
        lastComputedAt: parseTimestampToIso(
          (cpScores?.lastUpdated ??
            cpScores?.lastComputedAt) as
            | FirestoreTimestampLike
            | string
            | undefined
        ),
        raw: cpScores,
      });

      setPlatformStats({
        leetcode: statsMap.leetcode || null,
        codechef: statsMap.codechef || null,
        hackerrank: statsMap.hackerrank || null,
        codeforces: statsMap.codeforces || null,
        github: statsMap.github || null,
        atcoder: statsMap.atcoder || null,
      });

      setSuccessMessage(
        `Refreshed ${
          PLATFORMS.find((p) => p.key === platform)?.name || platform
        } stats.`
      );
    } catch (err: any) {
      console.error("[Dashboard] handleUpdatePlatform error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to refresh platform stats.";
      setServerError(msg);
    } finally {
      setRefreshingPlatform(null);
    }
  };

  const toggleStats = (key: PlatformKey) => {
    setShowStats((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* --------------------- PER-PLATFORM ANALYTICS UI --------------------- */

  const renderPlatformStats = (key: PlatformKey) => {
    const ps = platformStats[key];
    const handle = handles[key];
    const skill = cpScore.platformSkills[key];

    if (!handle || handle.trim().length === 0) {
      return (
        <p className="text-[0.7rem] text-slate-400">
          Add your username first. Once linked, we&apos;ll start mirroring your
          stats here.
        </p>
      );
    }

    if (!ps) {
      return (
        <p className="text-[0.7rem] text-slate-400">
          Stats not available yet. Use{" "}
          <span className="text-sky-300">Update</span> or{" "}
          <span className="text-sky-300">Update all</span> to pull fresh data.
        </p>
      );
    }

    const difficulty = ps.problemsSolvedByDifficulty || {};
    const badgesArr = ps.badges || [];
    const certificatesArr = ps.certificates || [];
    const domainScores = ps.domainScores || {};
    const domainEntries = Object.entries(domainScores);

    const perPlatformLastScraped = parseTimestampToIso(
      (ps.lastScrapedAt ??
        ps.lastUpdated ??
        ps.lastUpdatedAt) as FirestoreTimestampLike | string | undefined
    );

    const profileBlock = (
      <div className="space-y-1">
        <p className="text-[0.65rem] text-slate-400">Profile</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.68rem]">
          {ps.displayName && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Name</span>
              <span className="text-slate-100 truncate max-w-[120px] text-right">
                {ps.displayName}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Username</span>
            <span className="font-mono text-slate-100 text-[0.7rem]">
              @{ps.handle || handle}
            </span>
          </div>
          {ps.globalRanking != null && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Global rank</span>
              <span className="font-mono text-[0.7rem] text-slate-100">
                #{ps.globalRanking}
              </span>
            </div>
          )}
          {ps.country && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Country</span>
              <span className="text-slate-100 text-[0.7rem]">
                {ps.country}
              </span>
            </div>
          )}
        </div>

        {typeof skill === "number" && (
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[0.6rem] text-slate-400">
              Platform score
            </span>
            <span className="font-mono text-sky-300 text-[0.8rem]">
              {skill.toFixed(0)}
            </span>
          </div>
        )}

        {ps.profileUrl && (
          <a
            href={ps.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex text-[0.65rem] text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
          >
            Open profile ↗
          </a>
        )}
        {perPlatformLastScraped && (
          <p className="text-[0.6rem] text-slate-500 mt-0.5">
            Last scraped:{" "}
            <span className="text-slate-300">
              {formatLastUpdated(perPlatformLastScraped)}
            </span>
          </p>
        )}
      </div>
    );

    /* ---------- LeetCode (HIGHLIGHTED) ---------- */
    if (key === "leetcode") {
      const totalSolved =
        safeNumber(ps.totalSolved) ?? safeNumber(ps.problemsSolvedTotal);
      const easy = safeNumber(ps.solvedEasy) ?? safeNumber(difficulty.easy);
      const medium =
        safeNumber(ps.solvedMedium) ?? safeNumber(difficulty.medium);
      const hard = safeNumber(ps.solvedHard) ?? safeNumber(difficulty.hard);
      const rating = safeNumber(ps.contestRating ?? ps.rating);
      const globalRank = safeNumber(ps.globalRanking);
      const contests =
        safeNumber(ps.attendedContests) ??
        safeNumber(ps.contestsParticipated);
      const badgesCount =
        safeNumber(ps.badgesCount) ??
        (badgesArr.length ? badgesArr.length : undefined);
      const langEntries = Object.entries(ps.languages || {});

      const e = easy ?? 0;
      const m = medium ?? 0;
      const h = hard ?? 0;
      const totalForBar = e + m + h || 1; // avoid /0

      const easyPct = Math.round((e / totalForBar) * 100);
      const mediumPct = Math.round((m / totalForBar) * 100);
      const hardPct = Math.round((h / totalForBar) * 100);

      return (
        <div className="space-y-4 text-[0.7rem] text-slate-200">
          {profileBlock}

          {/* Big total + difficulty breakdown */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">
              Problems solved (lifetime)
            </p>

            <div className="grid grid-cols-5 gap-3 items-stretch">
              {/* Big total */}
              <div className="col-span-2 rounded-2xl border border-amber-500/40 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_55%)] bg-black/60 px-3 py-3 flex flex-col justify-center">
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-amber-200/80">
                  Total solved
                </span>
                <span className="mt-1 font-mono text-2xl text-amber-100 leading-tight">
                  {totalSolved ?? 0}
                </span>
                <span className="mt-1 text-[0.6rem] text-amber-200/80">
                  Across all tags & topics
                </span>
              </div>

              {/* Easy / Medium / Hard chips */}
              <div className="col-span-3 flex flex-col gap-1.5 justify-center">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-[0.65rem] text-slate-300">
                      Easy
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-emerald-200">
                    {easy ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-[0.65rem] text-slate-300">
                      Medium
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-sky-200">
                    {medium ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span className="text-[0.65rem] text-slate-300">
                      Hard
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-rose-200">
                    {hard ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Difficulty distribution bar */}
            <div className="mt-2 space-y-1">
              <p className="text-[0.6rem] text-slate-500">
                Difficulty mix
              </p>
              <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800 flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300"
                  style={{ width: `${easyPct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-300"
                  style={{ width: `${mediumPct}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-300"
                  style={{ width: `${hardPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[0.6rem] text-slate-500">
                <span>{easyPct}% Easy</span>
                <span>{mediumPct}% Medium</span>
                <span>{hardPct}% Hard</span>
              </div>
            </div>
          </div>

          {/* Rating / rank / contests */}
          <div className="space-y-1">
            <p className="text-[0.65rem] text-slate-400">
              Rating & contests
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Contest rating
                </p>
                <p className="mt-1 font-mono text-[0.95rem] text-slate-100">
                  {rating != null ? rating.toFixed(0) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Global rank
                </p>
                <p className="mt-1 font-mono text-[0.95rem] text-slate-100">
                  {globalRank != null ? `#${globalRank}` : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Contests attended
                </p>
                <p className="mt-1 font-mono text-[0.95rem] text-slate-100">
                  {contests ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Badges */}
          {badgesCount != null && (
            <div className="space-y-1">
              <p className="text-[0.65rem] text-slate-400">Badges</p>
              <div className="rounded-xl border border-amber-400/40 bg-black/70 px-3 py-2 flex items-center justify-between">
                <span className="text-[0.65rem] text-slate-300">
                  LeetCode badges
                </span>
                <span className="font-mono text-[0.9rem] text-amber-100">
                  {badgesCount}
                </span>
              </div>
            </div>
          )}

          {/* Languages */}
          {langEntries.length > 0 &&
            renderTopPills(
              langEntries,
              "Languages (submissions by problem count)"
            )}
        </div>
      );
    }

    /* ---------- Codeforces (HIGHLIGHT STYLE) ---------- */
    if (key === "codeforces") {
      const rating = safeNumber(ps.rating);
      const maxRating = safeNumber(ps.maxRating);
      const rankLabel =
        ps.rank != null ? String(ps.rank).toUpperCase() : undefined;
      const contests =
        safeNumber(ps.contestsAttended) ??
        safeNumber(ps.contestsParticipated);
      const solved =
        safeNumber(ps.problemsSolved) ?? safeNumber(ps.problemsSolvedTotal);
      const friends = safeNumber(ps.friendOfCount);
      const contribution = safeNumber(ps.contribution);
      const langEntries = Object.entries(ps.languages || {});

      const current = rating ?? 0;
      const max = maxRating ?? Math.max(current, 1);
      const ratingPct = Math.max(
        0,
        Math.min(100, Math.round((current / max) * 100))
      );

      return (
        <div className="space-y-4 text-[0.7rem] text-slate-200">
          {profileBlock}

          {/* Rating hero + contest chips */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">
              Contest performance
            </p>
            <div className="grid grid-cols-5 gap-3 items-stretch">
              {/* Hero: rating + rank */}
              <div className="col-span-3 rounded-2xl border border-sky-500/50 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_60%)] bg-black/60 px-3 py-3 flex flex-col justify-center">
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-sky-200/80">
                  Codeforces rating
                </span>
                <span className="mt-1 font-mono text-2xl text-sky-100 leading-tight">
                  {rating ?? "--"}
                </span>
                <div className="mt-1 flex items-center justify-between text-[0.6rem] text-sky-100/80">
                  <span>
                    Max:{" "}
                    <span className="font-mono">
                      {maxRating != null ? maxRating : "—"}
                    </span>
                  </span>
                  {rankLabel && (
                    <span>
                      Rank: <span className="font-semibold">{rankLabel}</span>
                    </span>
                  )}
                </div>

                {/* rating gauge */}
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400"
                      style={{ width: `${ratingPct}%` }}
                    />
                  </div>
                  <p className="text-[0.6rem] text-slate-500">
                    {ratingPct}% of peak rating
                  </p>
                </div>
              </div>

              {/* Chips: contests / solved / friends */}
              <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-[0.65rem] text-slate-300">
                      Contests
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-sky-100">
                    {contests ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-[0.65rem] text-slate-300">
                      Problems solved
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-emerald-100">
                    {solved ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    <span className="text-[0.65rem] text-slate-300">
                      Friends
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-purple-100">
                    {friends ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contribution & activity */}
          <div className="space-y-1">
            <p className="text-[0.65rem] text-slate-400">Community impact</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Contribution
                </p>
                <p className="mt-1 font-mono text-[0.9rem]">
                  {contribution ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Friend of count
                </p>
                <p className="mt-1 font-mono text-[0.9rem]">
                  {friends ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Problems solved
                </p>
                <p className="mt-1 font-mono text-[0.9rem]">
                  {solved ?? 0}
                </p>
              </div>
            </div>
          </div>

          {langEntries.length > 0 &&
            renderTopPills(langEntries, "Languages used on Codeforces")}
        </div>
      );
    }

    /* ---------- CodeChef (HIGHLIGHT STYLE) ---------- */
    if (key === "codechef") {
      const current = safeNumber(ps.currentRating ?? ps.rating);
      const highest = safeNumber(ps.highestRating ?? ps.maxRating);
      const division = ps.division ?? undefined;
      const globalRank = safeNumber(ps.globalRank);
      const countryRank = safeNumber(ps.countryRank);

      let fullyTotal: number | undefined;
      let fullyBreakdown:
        | {
            school?: number;
            easy?: number;
            medium?: number;
            hard?: number;
            challenge?: number;
            peer?: number;
          }
        | undefined;

      if (typeof ps.fullySolved === "number") {
        fullyTotal = ps.fullySolved;
      } else if (ps.fullySolved && typeof ps.fullySolved === "object") {
        fullyTotal = safeNumber(ps.fullySolved.total);
        fullyBreakdown = ps.fullySolved;
      }

      let partialTotal: number | undefined;
      if (typeof ps.partiallySolved === "number") {
        partialTotal = ps.partiallySolved;
      } else if (ps.partiallySolved && typeof ps.partiallySolved === "object") {
        partialTotal = safeNumber(ps.partiallySolved.total);
      }

      const stars =
        ps.stars != null ? String(ps.stars) + "★" : undefined;

      const totalProblems =
        (fullyTotal ?? 0) + (partialTotal ?? 0);

      return (
        <div className="space-y-4 text-[0.7rem] text-slate-200">
          {profileBlock}

          {/* Rating hero */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">Rating</p>
            <div className="grid grid-cols-5 gap-3 items-stretch">
              <div className="col-span-3 rounded-2xl border border-amber-500/50 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_58%)] bg-black/70 px-3 py-3 flex flex-col justify-center">
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-amber-200/90">
                  CodeChef rating
                </span>
                <span className="mt-1 font-mono text-2xl text-amber-100 leading-tight">
                  {current ?? "--"}
                </span>
                <div className="mt-1 flex items-center justify-between text-[0.6rem] text-amber-100/80">
                  <span>
                    Max:{" "}
                    <span className="font-mono">
                      {highest != null ? highest : "—"}
                    </span>
                  </span>
                  {stars && (
                    <span className="font-semibold">{stars}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[0.6rem] text-amber-100/80">
                  {division && (
                    <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-[1px]">
                      Division: {division}
                    </span>
                  )}
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                {globalRank != null && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                    <span className="text-[0.65rem] text-slate-300">
                      Global rank
                    </span>
                    <span className="font-mono text-[0.8rem] text-slate-100">
                      #{globalRank}
                    </span>
                  </div>
                )}
                {countryRank != null && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-black/70 px-3 py-1.5">
                    <span className="text-[0.65rem] text-slate-300">
                      Country rank
                    </span>
                    <span className="font-mono text-[0.8rem] text-slate-100">
                      #{countryRank}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Problems solved */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">
              Problems solved on CodeChef
            </p>
            <div className="grid grid-cols-5 gap-3 items-stretch">
              {/* Total problems hero */}
              <div className="col-span-2 rounded-2xl border border-slate-700 bg-black/70 px-3 py-3 flex flex-col justify-center">
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-slate-400">
                  Total attempts
                </span>
                <span className="mt-1 font-mono text-2xl text-slate-100 leading-tight">
                  {totalProblems}
                </span>
                <span className="mt-1 text-[0.6rem] text-slate-500">
                  Fully + partially solved
                </span>
              </div>

              {/* Fully / partial chips */}
              <div className="col-span-3 flex flex-col gap-1.5 justify-center">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-[0.65rem] text-emerald-50/90">
                      Fully solved
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-emerald-100">
                    {fullyTotal ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-500/40 bg-sky-500/5 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span className="text-[0.65rem] text-sky-50/90">
                      Partially solved
                    </span>
                  </div>
                  <span className="font-mono text-[0.8rem] text-sky-100">
                    {partialTotal ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Fully solved breakdown */}
            {fullyBreakdown && (
              <div className="mt-2 rounded-xl border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.65rem] text-slate-400 mb-1">
                  Fully solved breakdown
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-[0.65rem]">
                  <span className="text-slate-300">
                    Easy:{" "}
                    <span className="font-mono">
                      {fullyBreakdown.easy ?? 0}
                    </span>
                  </span>
                  <span className="text-slate-300">
                    Medium:{" "}
                    <span className="font-mono">
                      {fullyBreakdown.medium ?? 0}
                    </span>
                  </span>
                  <span className="text-slate-300">
                    Hard:{" "}
                    <span className="font-mono">
                      {fullyBreakdown.hard ?? 0}
                    </span>
                  </span>
                  <span className="text-slate-300">
                    School:{" "}
                    <span className="font-mono">
                      {fullyBreakdown.school ?? 0}
                    </span>
                  </span>
                  <span className="text-slate-300">
                    Challenge:{" "}
                    <span className="font-mono">
                      {fullyBreakdown.challenge ?? 0}
                    </span>
                  </span>
                  <span className="text-slate-300">
                    Peer:{" "}
                    <span className="font-mono">
                      {fullyBreakdown.peer ?? 0}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    /* ---------- HackerRank (HIGHLIGHT STYLE) ---------- */
    if (key === "hackerrank") {
      const problems =
        safeNumber(ps.problemsSolvedTotal) ??
        safeNumber(ps.problemsSolved);
      const contests = safeNumber(ps.contestsParticipated);
      const badgesCount =
        safeNumber(ps.badgesCount) ??
        (badgesArr.length ? badgesArr.length : undefined);
      const certificatesCount =
        safeNumber(ps.certificatesCount) ?? certificatesArr.length;
      const totalSignals =
        (problems ?? 0) +
        (contests ?? 0) +
        (badgesCount ?? 0) +
        (certificatesCount ?? 0);

      return (
        <div className="space-y-4 text-[0.7rem] text-slate-200">
          {profileBlock}

          {/* Progress hero */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">Progress</p>
            <div className="grid grid-cols-5 gap-3 items-stretch">
              <div className="col-span-3 rounded-2xl border border-emerald-500/50 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.24),_transparent_60%)] bg-black/70 px-3 py-3 flex flex-col justify-center">
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-emerald-100/90">
                  HackerRank signals
                </span>
                <span className="mt-1 font-mono text-2xl text-emerald-50 leading-tight">
                  {totalSignals}
                </span>
                <span className="mt-1 text-[0.6rem] text-emerald-100/80">
                  Problems + contests + badges + certificates
                </span>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5">
                  <span className="text-[0.65rem] text-emerald-50/90">
                    Problems solved
                  </span>
                  <span className="font-mono text-[0.8rem] text-emerald-100">
                    {problems ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-teal-500/40 bg-teal-500/5 px-3 py-1.5">
                  <span className="text-[0.65rem] text-emerald-50/90">
                    Contests
                  </span>
                  <span className="font-mono text-[0.8rem] text-emerald-100">
                    {contests ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Badges & certs */}
          <div className="space-y-1">
            <p className="text-[0.65rem] text-slate-400">
              Recognition
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-400/60 bg-emerald-500/5 px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] text-emerald-50/80">
                    Badges
                  </span>
                  <span className="font-mono text-[0.9rem] text-emerald-100">
                    {badgesCount ?? 0}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.6rem] text-slate-400">
                    Certificates
                  </span>
                  <span className="font-mono text-[0.9rem]">
                    {certificatesCount ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {domainEntries.length > 0 &&
            renderTopPills(domainEntries, "Domains with score")}
        </div>
      );
    }

    /* ---------- GitHub (HIGHLIGHT STYLE) ---------- */
    if (key === "github") {
      const repos = safeNumber(ps.publicRepos);
      const stars = safeNumber(ps.totalStars ?? ps.starsReceived);
      const followers = safeNumber(ps.followers);
      const contributions = safeNumber(ps.contributionsLastYear);
      const streak = safeNumber(ps.currentStreak);
      const longestStreak = safeNumber(ps.longestStreak);
      const forks = safeNumber(ps.forks);
      const topLangEntries = Object.entries(
        ps.topLanguages || ps.languages || {}
      );

      const heroContrib = contributions ?? 0;

      return (
        <div className="space-y-4 text-[0.7rem] text-slate-200">
          {profileBlock}

          {/* Contributions hero */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">
              Open-source footprint
            </p>
            <div className="grid grid-cols-5 gap-3 items-stretch">
              <div className="col-span-3 rounded-2xl border border-slate-400/60 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.3),_transparent_60%)] bg-black/70 px-3 py-3 flex flex-col justify-center">
                <span className="text-[0.6rem] uppercase tracking-[0.16em] text-slate-200/90">
                  Contributions (last year)
                </span>
                <span className="mt-1 font-mono text-2xl text-slate-50 leading-tight">
                  {heroContrib}
                </span>
                <span className="mt-1 text-[0.6rem] text-slate-200/80">
                  Commits, PRs, issues & more
                </span>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-black/70 px-3 py-1.5">
                  <span className="text-[0.65rem] text-slate-300">
                    Public repos
                  </span>
                  <span className="font-mono text-[0.8rem] text-slate-50">
                    {repos ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-black/70 px-3 py-1.5">
                  <span className="text-[0.65rem] text-slate-300">
                    Stars
                  </span>
                  <span className="font-mono text-[0.8rem] text-slate-50">
                    {stars ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Social + streaks */}
          <div className="space-y-1">
            <p className="text-[0.65rem] text-slate-400">Activity</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2">
                <p className="text-[0.6rem] text-slate-400">
                  Followers
                </p>
                <p className="mt-1 font-mono text-[0.9rem]">
                  {followers ?? 0}
                </p>
              </div>
              {streak != null && (
                <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2">
                  <p className="text-[0.6rem] text-slate-400">
                    Current streak
                  </p>
                  <p className="mt-1 font-mono text-[0.9rem]">
                    {streak} days
                  </p>
                </div>
              )}
              {longestStreak != null && (
                <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2">
                  <p className="text-[0.6rem] text-slate-400">
                    Longest streak
                  </p>
                  <p className="mt-1 font-mono text-[0.9rem]">
                    {longestStreak} days
                  </p>
                </div>
              )}
              {forks != null && (
                <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2">
                  <p className="text-[0.6rem] text-slate-400">
                    Forks across repos
                  </p>
                  <p className="mt-1 font-mono text-[0.9rem]">
                    {forks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Languages */}
          {topLangEntries.length > 0 &&
            renderTopPills(topLangEntries, "Languages (repos & commits)")}
        </div>
      );
    }

    /* ---------- AtCoder (HIGHLIGHT STYLE) ---------- */
    if (key === "atcoder") {
      const rating = safeNumber(ps.rating);
      const highest = safeNumber(ps.maxRating ?? ps.highestRating);
      const ratedMatches = safeNumber(ps.ratedMatches);
      const totalContests =
        safeNumber(ps.totalContests) ??
        safeNumber(ps.contestsParticipated);
      const rank =
        ps.rank != null ? String(ps.rank) : undefined;
      const title = ps.title ?? undefined;
      const lastContest = ps.lastContest ?? undefined;
      const solved = safeNumber(ps.problemsSolvedTotal);

      const current = rating ?? 0;
      const max = highest ?? Math.max(current, 1);
      const ratingPct = Math.max(
        0,
        Math.min(100, Math.round((current / max) * 100))
      );

      return (
        <div className="space-y-4 text-[0.7rem] text-slate-200">
          {profileBlock}

          {/* Rating hero */}
          <div className="space-y-2">
            <p className="text-[0.65rem] text-slate-400">
              Rating & contests
            </p>
            <div className="grid grid-cols-5 gap-3 items-stretch">
              <div className="col-span-3 rounded-2xl border border-cyan-500/50 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.2),_transparent_60%)] bg-black/70 px-3 py-3 flex flex-col justify-center">
                <p className="text-[0.65rem] text-cyan-100/90 uppercase tracking-[0.16em]">
                  AtCoder rating
                </p>
                <p className="mt-1 font-mono text-2xl text-cyan-100 leading-tight">
                  {rating ?? "--"}
                  {highest != null && (
                    <span className="text-[0.7rem] text-cyan-100/80 ml-1">
                      (max {highest})
                    </span>
                  )}
                </p>
                {title && (
                  <p className="mt-1 text-[0.65rem] text-cyan-100/80">
                    Title: <span className="font-semibold">{title}</span>
                  </p>
                )}

                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400"
                      style={{ width: `${ratingPct}%` }}
                    />
                  </div>
                  <p className="text-[0.6rem] text-slate-500">
                    {ratingPct}% of peak rating
                  </p>
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5 justify-center">
                {rank && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-black/70 px-3 py-1.5">
                    <span className="text-[0.6rem] text-slate-400">
                      Rank
                    </span>
                    <span className="font-mono text-[0.85rem]">
                      #{rank}
                    </span>
                  </div>
                )}
                {ratedMatches != null && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-black/70 px-3 py-1.5">
                    <span className="text-[0.6rem] text-slate-400">
                      Rated matches
                    </span>
                    <span className="font-mono text-[0.85rem]">
                      {ratedMatches}
                    </span>
                  </div>
                )}
                {totalContests != null && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-black/70 px-3 py-1.5">
                    <span className="text-[0.6rem] text-slate-400">
                      Total contests
                    </span>
                    <span className="font-mono text-[0.85rem]">
                      {totalContests}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <p className="text-[0.65rem] text-slate-400">Progress</p>
            <div className="grid grid-cols-2 gap-3">
              {solved != null && (
                <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2">
                  <p className="text-[0.6rem] text-slate-400">
                    Problems solved
                  </p>
                  <p className="mt-1 font-mono text-[0.9rem]">
                    {solved}
                  </p>
                </div>
              )}
              {lastContest && (
                <div className="rounded-lg border border-slate-700 bg-black/70 px-3 py-2">
                  <p className="text-[0.6rem] text-slate-400">
                    Last contest
                  </p>
                  <p className="mt-1 font-mono text-[0.7rem]">
                    {lastContest}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Generic fallback
    return (
      <div className="space-y-3 text-[0.7rem] text-slate-200">
        {profileBlock}
        <p className="mt-2 text-[0.65rem] text-slate-500">
          Detailed stats for this platform will appear here as we enrich the
          integration.
        </p>
      </div>
    );
  };

  /* --------------------- RENDER --------------------- */

  if (loading) {
    return <DashboardLoading />;
  }

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 relative overflow-hidden">
      {/* background grid + glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18),_transparent_60%)]" />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.16),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.11] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* HEADER with improved copy */}
        <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-500">
              CodeSync · Player HUD
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
              One{" "}
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                score
              </span>{" "}
              for your entire coding grind.
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Every LeetCode problem, Codeforces contest, CodeChef rating jump,
              GitHub commit and HackerRank badge funnels into a single,
              <span className="text-sky-300"> live CodeSync score</span> that
              ranks you fairly on the leaderboard.
            </p>
          </div>

          {/* SCORE + UPDATE ALL ONLY */}
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-950 to-slate-900/70 px-4 py-4 text-[0.7rem] shadow-xl shadow-black/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-100">
                  CodeSync score (global)
                </p>
                <p className="mt-2 text-[0.65rem] text-slate-500">
                  One number that captures your competitive programming +
                  development journey across platforms.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUpdateAll}
                disabled={refreshingAll}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.65rem] font-semibold border ${
                  refreshingAll
                    ? "border-slate-700 text-slate-400 bg-slate-900"
                    : "border-sky-500/70 text-sky-200 bg-sky-500/10 hover:bg-sky-500/20"
                } transition`}
              >
                <FiRefreshCw
                  className={`text-xs ${
                    refreshingAll ? "animate-spin" : ""
                  }`}
                />
                {refreshingAll ? "Updating all…" : "Update all platforms"}
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[0.6rem] text-slate-500 mb-1">
                  Total CodeSync score
                </p>
                <p className="text-3xl font-semibold text-sky-300">
                  {mainScore != null ? mainScore.toFixed(0) : "—"}
                </p>
                <p className="mt-2 text-[0.6rem] text-slate-500">
                  Last computed:{" "}
                  <span className="text-slate-300">
                    {formatLastUpdated(cpScore.lastComputedAt)}
                  </span>
                </p>
              </div>

              <div className="text-right space-y-1">
                <p className="text-[0.6rem] text-slate-500">
                  Linked platforms
                </p>
                <p className="text-lg font-semibold text-slate-100">
                  {linkedPlatformsCount}
                  <span className="ml-1 text-xs text-slate-500">/ 6</span>
                </p>
                <p className="text-[0.6rem] text-slate-500">
                  More platforms → richer score.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* TOASTS */}
        {serverError && (
          <div className="rounded-xl border border-red-500/70 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {serverError}
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/70 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
            {successMessage}
          </div>
        )}

        {/* MAIN GRID: PLATFORM CARDS */}
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const handle = handles[platform.key] || "";
            const statsOpen = showStats[platform.key];
            const isRefreshing = refreshingPlatform === platform.key;
            const themeChip =
              platform.themeChip ||
              "bg-slate-500/10 text-slate-200 border-slate-500/40";

            return (
              <article
                key={platform.key}
                className={`
                  group relative rounded-2xl border border-slate-800/80 
                  bg-gradient-to-br from-[#050712] via-[#05040c] to-[#010209]
                  shadow-[0_18px_42px_rgba(0,0,0,0.75)]
                  overflow-hidden flex flex-col backdrop-blur-sm
                `}
              >
                {/* accent border glow */}
                <div
                  className={`
                    pointer-events-none absolute inset-x-0 -top-px h-[1px]
                    bg-gradient-to-r ${platform.accentFrom} ${platform.accentTo}
                  `}
                />
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div
                    className={`
                      absolute inset-0 bg-gradient-to-br ${platform.accentFrom} ${platform.accentTo}
                      mix-blend-soft-light opacity-15
                    `}
                  />
                </div>

                {/* header row */}
                <div className="relative px-5 pt-4 pb-3 border-b border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-black/80 border border-slate-700 flex items-center justify-center shadow-inner shadow-black/60 flex-shrink-0">
                      {platform.icon ?? (
                        <span className="text-base font-semibold text-slate-200">
                          {platform.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-slate-100">
                          {platform.name}
                        </h2>
                        {platform.tag && (
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[0.6rem] ${themeChip}`}
                          >
                            {platform.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdatePlatform(platform.key)}
                    disabled={isRefreshing}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[0.65rem] font-semibold border ${
                      isRefreshing
                        ? "border-slate-700 text-slate-400 bg-slate-900"
                        : "border-sky-500/70 text-sky-200 bg-sky-500/5 hover:bg-sky-500/15"
                    } transition flex-shrink-0`}
                  >
                    <FiRefreshCw
                      className={`text-xs ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                    {isRefreshing ? "Updating…" : "Update"}
                  </button>
                </div>

                {/* body */}
                <div className="relative px-5 pt-4 pb-4 space-y-3 flex-1">
                  {/* username input */}
                  <div className="space-y-1">
                    <label className="text-[0.7rem] text-slate-400">
                      Username
                    </label>
                    <div className="flex rounded-xl border border-slate-800 bg-black/70 overflow-hidden focus-within:border-sky-400/80 focus-within:bg-black/80 transition">
                      <input
                        type="text"
                        className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
                        value={handle}
                        onChange={(e) =>
                          handleChange(platform.key, e.target.value)
                        }
                        placeholder="your_handle"
                      />
                      <button
                        type="button"
                        onClick={() => openEditModal(platform.key)}
                        className="px-3 bg-black/60 border-l border-slate-800 flex items-center justify-center text-slate-400 hover:text-sky-300 hover:bg-slate-900 transition"
                      >
                        <FaUserEdit className="text-sm" />
                      </button>
                    </div>
                    <p className="text-[0.65rem] text-slate-500 mt-1">
                      Changes are saved only after you confirm in the popup.
                    </p>
                  </div>

                  {/* current handle + status */}
                  <div className="rounded-xl border border-slate-800 bg-black/70 px-3 py-2 text-[0.7rem] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.6rem] tracking-[0.16em] text-slate-500 uppercase">
                        Current username
                      </p>
                      <p className="mt-1 font-mono text-[0.8rem] text-slate-100 truncate">
                        {handle || "Not set"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.6rem] text-slate-500">Status</p>
                      <p
                        className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[0.6rem] border ${
                          handle
                            ? "border-emerald-500/70 text-emerald-300 bg-emerald-500/5"
                            : "border-slate-700 text-slate-400 bg-slate-900"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            handle ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        {handle ? "Linked" : "Missing"}
                      </p>
                    </div>
                  </div>

                  {/* actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStats(platform.key)}
                      className="flex-1 inline-flex items-center justify-center rounded-full border border-slate-700 text-xs font-semibold px-4 py-2 text-slate-200 hover:border-sky-400/80 hover:bg-slate-900/80 transition"
                    >
                      {statsOpen ? "Hide stats" : "Show stats"}
                    </button>
                  </div>

                  {/* stats block */}
                  {statsOpen && (
                    <div className="mt-1 rounded-xl border border-slate-800 bg-black/75 px-3 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[0.7rem] text-slate-200 font-medium">
                          Analytics
                        </p>
                        <span className="text-[0.6rem] text-slate-500">
                          Read-only from platform
                        </span>
                      </div>
                      {renderPlatformStats(platform.key)}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>

      {/* EDIT HANDLE MODAL */}
      {editPlatform && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#05050b] px-5 py-4 shadow-2xl">
            <h2 className="text-sm font-semibold text-slate-100 mb-2">
              Update {PLATFORMS.find((p) => p.key === editPlatform)?.name}{" "}
              handle
            </h2>
            <p className="text-[0.7rem] text-slate-400 mb-3">
              Make sure this matches your actual username on the platform.
              We&apos;ll use this to pull your stats.
            </p>
            <label className="text-[0.7rem] text-slate-400 block mb-1">
              New username
            </label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-black/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              placeholder="your_handle"
            />

            <div className="mt-4 flex justify-end gap-2 text-[0.75rem]">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandleUpdate}
                className="rounded-full border border-emerald-500/80 bg-emerald-500/90 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-400 transition"
              >
                Confirm update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
