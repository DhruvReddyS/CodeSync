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
};

const PLATFORMS: PlatformConfig[] = [
  {
    key: "leetcode",
    name: "LeetCode",
    accentFrom: "from-amber-400/80",
    accentTo: "to-amber-200/50",
    icon: <SiLeetcode className="text-amber-300 text-xl" />,
    tag: "DSA · Interviews",
  },
  {
    key: "codechef",
    name: "CodeChef",
    accentFrom: "from-amber-200/80",
    accentTo: "to-zinc-200/40",
    icon: <SiCodechef className="text-amber-100 text-xl" />,
    tag: "Rated Contests",
  },
  {
    key: "hackerrank",
    name: "HackerRank",
    accentFrom: "from-emerald-300/80",
    accentTo: "to-teal-300/40",
    icon: <SiHackerrank className="text-emerald-300 text-xl" />,
    tag: "Fundamentals",
  },
  {
    key: "codeforces",
    name: "Codeforces",
    accentFrom: "from-sky-400/80",
    accentTo: "to-indigo-300/60",
    icon: <SiCodeforces className="text-sky-300 text-xl" />,
    tag: "Serious CP",
  },
  {
    key: "github",
    name: "GitHub",
    accentFrom: "from-slate-200/80",
    accentTo: "to-slate-500/40",
    icon: <SiGithub className="text-slate-200 text-xl" />,
    tag: "Projects",
  },
  {
    key: "atcoder",
    name: "AtCoder",
    accentFrom: "from-cyan-400/80",
    accentTo: "to-sky-200/50",
    tag: "Advanced CP",
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

type Badge = { name: string; level?: string };
type Certificate = { name: string };

type PlatformStats = {
  platform: PlatformKey;
  handle?: string;
  displayName?: string;

  problemsSolvedTotal?: number;
  problemsSolvedByDifficulty?: {
    easy?: number;
    medium?: number;
    hard?: number;
  };

  rating?: number;
  maxRating?: number;
  score?: number;
  contestsParticipated?: number;

  badges?: Badge[];
  certificates?: Certificate[];

  stars?: number; // CodeChef
  fullySolved?: number;
  partiallySolved?: number;

  domainScores?: Record<string, number>; // HackerRank

  // GitHub-specific
  contributionsLastYear?: number;
  publicRepos?: number;
  starsReceived?: number;

  profileUrl?: string;
};

type PlatformStatsMap = Record<PlatformKey, PlatformStats | null>;

type PlatformSkill = {
  platform: PlatformKey;
  skill: number;
};

type BackendCpScores = {
  codeSyncScore?: number;
  displayScore?: number;
  platformSkills?: PlatformSkill[] | Record<string, any>;
  lastComputedAt?: any; // Timestamp | string
  [key: string]: any;
};

type StatsResponse = {
  cpHandles: Partial<Record<PlatformKey, string | null>>;
  cpScores: BackendCpScores | null;
  platformStats: Record<PlatformKey, PlatformStats | null>;
};

type CpScoreState = {
  codeSyncScore: number | null;  // raw from backend
  displayScore: number | null;   // raw from backend
  platformSkills: Partial<Record<PlatformKey, number>>;
  lastComputedAt: string | null;
};

type FirestoreTimestampLike = {
  seconds: number;
  nanoseconds: number;
} | null;

/* ------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------ */

const parseTimestampToIso = (
  ts: FirestoreTimestampLike | string | undefined
): string | null => {
  if (!ts) return null;
  if (typeof ts === "string") return ts;
  if (typeof ts === "object" && ts.seconds != null) {
    return new Date(ts.seconds * 1000).toISOString();
  }
  return null;
};

const formatLastUpdated = (iso: string | null): string => {
  if (!iso) return "Not computed yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not computed yet";
  return d.toLocaleString();
};

/**
 * Normalize whatever backend sends in cpScores.platformSkills
 * into: Partial<Record<PlatformKey, number>>
 *
 * Supported shapes:
 *  - [{ platform: "leetcode", skill: 70 }, ...]
 *  - { leetcode: 70, codeforces: 40, ... }
 *  - { leetcode: { skill: 70 }, ... }
 */
const deriveSkillMap = (
  raw: any
): Partial<Record<PlatformKey, number>> => {
  const skillMap: Partial<Record<PlatformKey, number>> = {};
  if (!raw) return skillMap;

  // Case 1: array of { platform, skill }
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

  // Case 2: object: { leetcode: 70 } OR { leetcode: { skill: 70 } }
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
    return skillMap;
  }

  return skillMap;
};

/* ------------------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------------------ */

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // handles per platform (string only for inputs)
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
  const [refreshingPlatform, setRefreshingPlatform] = useState<PlatformKey | null>(
    null
  );

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // edit handle modal
  const [editPlatform, setEditPlatform] = useState<PlatformKey | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const linkedPlatformsCount = Object.values(handles).filter(
    (v) => v && v.trim().length > 0
  ).length;

  // 🔢 This is the *single score* we show on UI (no /1000 etc)
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

      // map cpHandles -> local string state
      setHandles({
        leetcode: (cpHandles.leetcode as string) || "",
        codechef: (cpHandles.codechef as string) || "",
        hackerrank: (cpHandles.hackerrank as string) || "",
        codeforces: (cpHandles.codeforces as string) || "",
        github: (cpHandles.github as string) || "",
        atcoder: (cpHandles.atcoder as string) || "",
      });

      // cpScores -> local cpScore
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
          cpScores?.lastComputedAt as FirestoreTimestampLike | string | undefined
        ),
      });

      // platformStats from backend
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

      // Optimistic local update
      setHandles(updatedHandles);

      // 🔁 Hit backend to store cpHandles inside "students" doc
      await apiClient.patch("/student/cp-handles", {
        cpHandles: updatedHandles,
      });

      setSuccessMessage(
        `Updated ${PLATFORMS.find((p) => p.key === key)?.name || key} handle.`
      );

      // Reload stats so that handle + any derived data stays in sync
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
          cpScores?.lastComputedAt as FirestoreTimestampLike | string | undefined
        ),
      });

      setPlatformStats({
        leetcode: statsMap.leetcode || null,
        codechef: statsMap.codechef || null,
        hackerrank: statsMap.hackerrank || null,
        codeforces: statsMap.codeforces || null,
        github: statsMap.github || null,
        atcoder: statsMap.atcoder || null,
      });

      setSuccessMessage("Refreshed stats for all platforms.");
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
          cpScores?.lastComputedAt as FirestoreTimestampLike | string | undefined
        ),
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

  /* --------------------- render platform stats --------------------- */

  const renderPlatformStats = (key: PlatformKey) => {
    const ps = platformStats[key];
    const handle = handles[key];
    const skill = cpScore.platformSkills[key];

    if (!handle || handle.trim().length === 0) {
      return (
        <p className="text-[0.7rem] text-slate-400">
          Add your username first. After refresh, your stats from this
          platform will be shown here.
        </p>
      );
    }

    if (!ps) {
      return (
        <p className="text-[0.7rem] text-slate-400">
          Stats not available yet. Use{" "}
          <span className="text-sky-300">Update</span> or{" "}
          <span className="text-sky-300">Update all</span>.
        </p>
      );
    }

    const difficulty = ps.problemsSolvedByDifficulty || {};
    const badges = ps.badges || [];
    const certificates = ps.certificates || [];
    const domainScores = ps.domainScores || {};
    const badgesCount = badges.length;
    const certCount = certificates.length;
    const domainEntries = Object.entries(domainScores);

    return (
      <div className="space-y-3 text-[0.7rem] text-slate-200">
        {/* Skill + name */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            {ps.displayName && (
              <p className="text-slate-300 font-medium">{ps.displayName}</p>
            )}
            <p className="font-mono text-[0.7rem] text-slate-400">
              @{ps.handle || handle}
            </p>
            {ps.profileUrl && (
              <a
                href={ps.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[0.7rem] text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
              >
                Open profile ↗
              </a>
            )}
          </div>
          {typeof skill === "number" && (
            <div className="text-right">
              <p className="text-[0.65rem] text-slate-500">Skill score</p>
              <p className="text-sm font-semibold text-sky-300">
                {skill.toFixed(0)}
              </p>
            </div>
          )}
        </div>

        {/* numeric stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {ps.problemsSolvedTotal != null && (
            <div className="flex flex-col">
              <span className="text-slate-400">Problems solved</span>
              <span className="font-mono">
                {ps.problemsSolvedTotal}
                {(difficulty.easy ??
                  difficulty.medium ??
                  difficulty.hard) && (
                  <span className="text-[0.6rem] text-slate-500 ml-1">
                    ({difficulty.easy ?? 0}E {difficulty.medium ?? 0}M{" "}
                    {difficulty.hard ?? 0}H)
                  </span>
                )}
              </span>
            </div>
          )}

          {ps.rating != null && (
            <div className="flex flex-col">
              <span className="text-slate-400">Rating</span>
              <span className="font-mono">
                {ps.rating}
                {ps.maxRating != null && (
                  <span className="text-[0.6rem] text-slate-500 ml-1">
                    (max {ps.maxRating})
                  </span>
                )}
              </span>
            </div>
          )}

          {ps.contestsParticipated != null && (
            <div className="flex flex-col">
              <span className="text-slate-400">Contests</span>
              <span className="font-mono">{ps.contestsParticipated}</span>
            </div>
          )}

          {ps.score != null && key !== "github" && (
            <div className="flex flex-col">
              <span className="text-slate-400">Platform score</span>
              <span className="font-mono">{ps.score}</span>
            </div>
          )}

          {ps.fullySolved != null && (
            <div className="flex flex-col">
              <span className="text-slate-400">Fully solved</span>
              <span className="font-mono">{ps.fullySolved}</span>
            </div>
          )}

          {ps.partiallySolved != null && (
            <div className="flex flex-col">
              <span className="text-slate-400">Partially solved</span>
              <span className="font-mono">{ps.partiallySolved}</span>
            </div>
          )}

          {key === "codechef" && ps.stars != null && (
            <div className="flex flex-col">
              <span className="text-slate-400">Stars</span>
              <span className="font-mono">{ps.stars}★</span>
            </div>
          )}

          {key === "github" && (
            <>
              {ps.contributionsLastYear != null && (
                <div className="flex flex-col">
                  <span className="text-slate-400">
                    Contributions (last year)
                  </span>
                  <span className="font-mono">
                    {ps.contributionsLastYear}
                  </span>
                </div>
              )}
              {ps.publicRepos != null && (
                <div className="flex flex-col">
                  <span className="text-slate-400">Public repos</span>
                  <span className="font-mono">{ps.publicRepos}</span>
                </div>
              )}
              {ps.starsReceived != null && (
                <div className="flex flex-col">
                  <span className="text-slate-400">Stars received</span>
                  <span className="font-mono">{ps.starsReceived}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* domain scores */}
        {domainEntries.length > 0 && (
          <div className="space-y-1">
            <p className="text-[0.65rem] text-slate-400">
              Domain breakdown (top {Math.min(domainEntries.length, 4)})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {domainEntries
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([domain, val]) => (
                  <span
                    key={domain}
                    className="rounded-full border border-slate-700 bg-slate-900/70 px-2 py-[1px] text-[0.65rem] text-slate-200"
                  >
                    {domain}:{" "}
                    <span className="font-mono text-sky-300">
                      {val.toFixed(0)}
                    </span>
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* badges + certificates */}
        {(badgesCount > 0 || certCount > 0) && (
          <div className="space-y-1">
            {badgesCount > 0 && (
              <>
                <p className="text-[0.65rem] text-slate-400">
                  Badges ({badgesCount})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {badges.slice(0, 4).map((b, idx) => (
                    <span
                      key={`${b.name}-${idx}`}
                      className="rounded-full border border-amber-500/40 bg-amber-500/5 px-2 py-[1px] text-[0.65rem] text-amber-100"
                    >
                      {b.name}
                      {b.level && (
                        <span className="text-[0.6rem] text-amber-200/80 ml-1">
                          ({b.level})
                        </span>
                      )}
                    </span>
                  ))}
                  {badgesCount > 4 && (
                    <span className="text-[0.65rem] text-slate-400">
                      +{badgesCount - 4} more…
                    </span>
                  )}
                </div>
              </>
            )}

            {certCount > 0 && (
              <>
                <p className="text-[0.65rem] text-slate-400">
                  Certificates ({certCount})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {certificates.slice(0, 3).map((c, idx) => (
                    <span
                      key={`${c.name}-${idx}`}
                      className="rounded-full border border-emerald-500/40 bg-emerald-500/5 px-2 py-[1px] text-[0.65rem] text-emerald-100"
                    >
                      {c.name}
                    </span>
                  ))}
                  {certCount > 3 && (
                    <span className="text-[0.65rem] text-slate-400">
                      +{certCount - 3} more…
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03030a] text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 relative overflow-hidden">
      {/* background grid + glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18),_transparent_60%)]" />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.16),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.11] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-500">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold">
              Your{" "}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                multi-platform coding overview
              </span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
              All your CP profiles, one clean place. Handles, ratings, problems
              solved, contests and a single CodeSync score powering leaderboards.
            </p>
          </div>

          {/* SCORE + UPDATE ALL */}
          <div className="flex flex-col items-stretch gap-3">
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-950 to-slate-900/70 px-4 py-3 text-[0.7rem] shadow-xl shadow-black/40 max-w-sm">
              <p className="font-medium text-slate-100">
                CodeSync score
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] text-slate-500 mb-1">
                    Total score (keeps increasing as you code)
                  </p>
                  <p className="text-2xl font-semibold text-sky-300">
                    {mainScore != null ? mainScore.toFixed(0) : "—"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
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
              </div>
              <p className="mt-2 text-[0.6rem] text-slate-500">
                Last computed:{" "}
                <span className="text-slate-300">
                  {formatLastUpdated(cpScore.lastComputedAt)}
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* SUMMARY STRIP */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/70 bg-black/40 px-4 py-3 flex items-center justify-between backdrop-blur-md">
            <div>
              <p className="text-[0.7rem] text-slate-400">Linked platforms</p>
              <p className="mt-1 text-xl font-semibold text-slate-100">
                {linkedPlatformsCount}
                <span className="ml-1 text-xs text-slate-500">/ 6</span>
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-emerald-400/10 border border-emerald-500/50 flex items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-black/40 px-4 py-3 flex items-center justify-between backdrop-blur-md">
            <div>
              <p className="text-[0.7rem] text-slate-400">Scoring logic</p>
              <p className="mt-1 text-sm font-medium text-slate-100">
                Based on ratings, problems, contests & GitHub activity.
              </p>
            </div>
            <span className="text-[0.65rem] rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-sky-200">
              Aggregated from all 6 platforms
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-black/40 px-4 py-3 flex items-center justify-between backdrop-blur-md">
            <div>
              <p className="text-[0.7rem] text-slate-400">Profile status</p>
              <p className="mt-1 text-sm font-medium text-emerald-300">
                Onboarding complete
              </p>
              <p className="mt-1 text-[0.65rem] text-slate-500">
                Keep solving. The more you code, the higher your score.
              </p>
            </div>
          </div>
        </section>

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

        {/* MAIN GRID 3x2 (6 platforms) */}
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {PLATFORMS.map((platform) => {
            const handle = handles[platform.key] || "";
            const statsOpen = showStats[platform.key];
            const isRefreshing = refreshingPlatform === platform.key;

            return (
              <article
                key={platform.key}
                className={`group relative rounded-2xl border border-slate-800/80 bg-gradient-to-br
                  from-[#050712] via-[#05040c] to-[#010209]
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
                <div className="relative px-5 pt-4 pb-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-black/80 border border-slate-700 flex items-center justify-center shadow-inner shadow-black/60">
                      {platform.icon ?? (
                        <span className="text-base font-semibold text-slate-200">
                          {platform.name[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-100">
                          {platform.name}
                        </h2>
                        {platform.tag && (
                          <span className="inline-flex items-center rounded-full bg-black/60 border border-slate-700 px-2 py-[2px] text-[0.6rem] text-slate-400">
                            {platform.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-[0.65rem] text-slate-500 mt-0.5">
                        Keep this username accurate so we can sync your stats.
                      </p>
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
                    } transition`}
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
                <div className="relative px-5 pt-4 pb-4 space-y-4 flex-1">
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
