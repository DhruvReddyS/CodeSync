import React, { useEffect, useMemo, useState } from "react";
import apiClient from "../../lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTeamLine,
  RiPulseLine,
  RiTrophyLine,
  RiAlarmWarningLine,
  RiSearch2Line,
  RiRefreshLine,
  RiArrowRightUpLine,
  RiDownload2Line,
  RiCloseLine,
  RiBarChart2Line,
  RiFireLine,
  RiMailLine,
  RiPhoneLine,
  RiUser3Line,
  RiHashtag,
  RiTimeLine,
  RiLinksLine,
  RiInformationLine,
  RiFlashlightLine,
  RiShieldLine,
  RiSparkling2Line,
  RiCheckDoubleLine,
  RiFileCopyLine,
  RiExternalLinkLine,
} from "react-icons/ri";

/* ----------------- TYPES ----------------- */

type PlatformId =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "github"
  | "hackerrank"
  | "atcoder";

const PLATFORMS: PlatformId[] = [
  "leetcode",
  "codeforces",
  "codechef",
  "github",
  "hackerrank",
  "atcoder",
];

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

type Student = {
  id: string;
  name: string;
  branch?: string;
  section?: string;
  year?: string;

  codesyncScore?: number; // displayScore
  prevScore?: number | null;
  activeThisWeek?: boolean;
  lastActiveAt?: string | null;

  // quick placeholders (dashboard)
  platforms?: Partial<Record<PlatformId, number>>;
  cpHandles?: Partial<Record<PlatformId, string | null>>;

  email?: string | null;
  phone?: string | null;
};

type DashboardResponse = {
  students: Student[];
  lastSyncAt?: string | null;
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
    prevDisplayScore?: number | null;
    updatedAt?: string | null;
    breakdown?: any;
  } | null;

  platformNumbers?: Partial<Record<PlatformId, any | null>> | null;
  platformSignals?: Partial<Record<PlatformId, number>> | null;

  platformWiseScores?: Partial<
    Record<PlatformId, { total: number; parts: Record<string, number> }>
  > | null;

  platformSum?: number;
  platformTotalScore?: number;
  overallFromPlatforms?: number;
};

/* ----------------- STYLE ----------------- */

const BG = "bg-[#050509]";
const CARD =
  "rounded-2xl border border-slate-800/80 bg-slate-950/45 backdrop-blur-xl shadow-[0_0_0_1px_rgba(15,23,42,0.65)]";
const CARD_SOLID =
  "rounded-2xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(15,23,42,0.65)]";

/* ----------------- UTILS ----------------- */

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}
function pct(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}
function fmt(n: number) {
  return Number.isFinite(n) ? String(Math.round(n)) : "0";
}
function median(arr: number[]) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(
    a.length - 1,
    Math.max(0, Math.floor((p / 100) * a.length) - 1)
  );
  return a[idx];
}
function safeStr(x?: any) {
  return (x ?? "").toString();
}
function niceDate(x?: string | null) {
  if (!x) return "—";
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}
function daysAgo(x?: string | null) {
  if (!x) return null;
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** CSV */
function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  const colSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
  const cols = [...colSet];

  const esc = (v: any) => {
    const str = (v ?? "").toString();
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const csv =
    cols.join(",") +
    "\n" +
    rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ----------------- UI COMPONENTS ----------------- */

function GlowTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="inline-flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-50">
          {title}
        </h1>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400" />
          Instructor
        </span>
      </div>
      {subtitle ? (
        <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: "sky" | "fuchsia" | "emerald" | "rose" | "amber";
}) {
  const toneCls: Record<string, string> = {
    sky: "from-sky-500/28 via-sky-500/10 to-transparent",
    fuchsia: "from-fuchsia-500/28 via-fuchsia-500/10 to-transparent",
    emerald: "from-emerald-500/28 via-emerald-500/10 to-transparent",
    rose: "from-rose-500/28 via-rose-500/10 to-transparent",
    amber: "from-amber-500/28 via-amber-500/10 to-transparent",
  };

  return (
    <div className={`${CARD} p-4 relative overflow-hidden`}>
      <div
        className={`absolute inset-0 bg-gradient-to-br ${toneCls[tone]} opacity-90`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {value}
          </div>
          {hint ? (
            <div className="mt-1 text-xs text-slate-400">{hint}</div>
          ) : null}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  value,
  right,
}: {
  label: string;
  value: number; // 0-100
  right?: React.ReactNode;
}) {
  const v = clamp(value);
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-slate-300 truncate">{label}</div>
      <div className="h-2 flex-1 rounded-full bg-slate-800/60 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
          style={{ width: `${v}%` }}
        />
      </div>
      <div className="w-16 text-right text-xs text-slate-400">
        {right ?? `${Math.round(v)}%`}
      </div>
    </div>
  );
}

function Chip({
  active,
  children,
  onClick,
  tone = "default",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary";
}) {
  const base =
    "rounded-full border px-3 py-1 text-[0.7rem] transition select-none";
  const activeCls =
    tone === "primary"
      ? "border-sky-500/40 bg-sky-500/10 text-slate-100 shadow-[0_0_18px_rgba(56,189,248,0.15)]"
      : "border-slate-700 bg-slate-900/40 text-slate-100";
  const idleCls =
    "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900/60";

  return (
    <button
      onClick={onClick}
      className={[base, active ? activeCls : idleCls].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

function PlatformMini({ platforms }: { platforms?: Student["platforms"] }) {
  const items = [
    ["LC", platforms?.leetcode ?? 0],
    ["CF", platforms?.codeforces ?? 0],
    ["CC", platforms?.codechef ?? 0],
    ["GH", platforms?.github ?? 0],
  ] as const;

  const max = Math.max(1, ...items.map((x) => x[1] ?? 0));
  return (
    <div className="flex items-center gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1">
          <span className="text-[0.65rem] text-slate-500">{k}</span>
          <span className="inline-block h-1.5 w-10 rounded-full bg-slate-800 overflow-hidden">
            <span
              className="block h-full bg-slate-200/70"
              style={{ width: `${((v ?? 0) / max) * 100}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function HandlePill({
  platform,
  handle,
}: {
  platform: PlatformId;
  handle: string | null | undefined;
}) {
  if (!handle) return null;
  const url = PLATFORM_URL[platform](handle);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[0.7rem] text-slate-200 hover:border-sky-400/60 hover:bg-slate-900/60 transition"
      title={`Open ${PLATFORM_LABEL[platform]} profile`}
    >
      <RiLinksLine className="text-slate-400" />
      {PLATFORM_LABEL[platform]} @{handle}
    </button>
  );
}

function ToneBadge({
  tone,
  text,
  icon,
}: {
  tone: "emerald" | "rose" | "amber" | "slate" | "sky";
  text: string;
  icon?: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    slate: "border-slate-700 bg-slate-950/60 text-slate-200",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem]",
        map[tone],
      ].join(" ")}
    >
      {icon}
      {text}
    </span>
  );
}

/** Chips from platformNumbers (backend normalized numbers) */
function numberChips(platform: PlatformId, numbers: any | null) {
  if (!numbers) return [];
  const out: Array<{ k: string; v: string }> = [];

  if (platform === "leetcode") {
    if (numbers.solved != null) out.push({ k: "solved", v: String(numbers.solved) });
    if (numbers.contestRating != null && numbers.contestRating > 0)
      out.push({ k: "rating", v: String(numbers.contestRating) });
    if (numbers.easy != null) out.push({ k: "easy", v: String(numbers.easy) });
    if (numbers.medium != null) out.push({ k: "med", v: String(numbers.medium) });
    if (numbers.hard != null) out.push({ k: "hard", v: String(numbers.hard) });
  }

  if (platform === "codeforces") {
    if (numbers.rating != null && numbers.rating > 0) out.push({ k: "rating", v: String(numbers.rating) });
    if (numbers.maxRating != null && numbers.maxRating > 0) out.push({ k: "max", v: String(numbers.maxRating) });
    if (numbers.contests != null && numbers.contests > 0) out.push({ k: "contests", v: String(numbers.contests) });
    if (numbers.rank) out.push({ k: "rank", v: String(numbers.rank) });
  }

  if (platform === "codechef") {
    if (numbers.rating != null && numbers.rating > 0) out.push({ k: "rating", v: String(numbers.rating) });
    if (numbers.stars != null && numbers.stars > 0) out.push({ k: "stars", v: `${numbers.stars}★` });
  }

  if (platform === "github") {
    if (numbers.contributions != null) out.push({ k: "contrib", v: String(numbers.contributions) });
    if (numbers.publicRepos != null) out.push({ k: "repos", v: String(numbers.publicRepos) });
    if (numbers.followers != null) out.push({ k: "followers", v: String(numbers.followers) });
  }

  if (platform === "hackerrank") {
    if (numbers.badges != null) out.push({ k: "badges", v: String(numbers.badges) });
    if (numbers.stars != null) out.push({ k: "stars", v: `${numbers.stars}★` });
  }

  if (platform === "atcoder") {
    if (numbers.rating != null && numbers.rating > 0) out.push({ k: "rating", v: String(numbers.rating) });
    if (numbers.maxRating != null && numbers.maxRating > 0) out.push({ k: "max", v: String(numbers.maxRating) });
  }

  return out.slice(0, 6);
}

type SortKey = "name" | "branch" | "section" | "year" | "score" | "active";
type SortDir = "asc" | "desc";

/* ----------------- PAGE ----------------- */

export default function InstructorDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // filters
  const [branch, setBranch] = useState<string>("all");
  const [section, setSection] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [q, setQ] = useState<string>("");

  // table
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // drawer + real details
  const [selected, setSelected] = useState<Student | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedStats, setSelectedStats] =
    useState<StudentStatsResponse | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/instructor/dashboard", {
        params: {
          branch: branch === "all" ? undefined : branch,
          section: section === "all" ? undefined : section,
          year: year === "all" ? undefined : year,
          q: q.trim() ? q.trim() : undefined,
        },
      });
      const data: DashboardResponse = res.data;
      setStudents(data.students ?? []);
      setLastSyncAt(data.lastSyncAt ?? null);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await apiClient.post("/instructor/refresh-cohort", {
        branch: branch === "all" ? undefined : branch,
        section: section === "all" ? undefined : section,
        year: year === "all" ? undefined : year,
      });
      await fetchDashboard();
    } catch {
      // ok if not implemented
    } finally {
      setRefreshing(false);
    }
  };

  /** ✅ open drawer + load real platform data */
  const openStudent = async (s: Student) => {
    setSelected(s);
    setSelectedStats(null);
    setStatsLoading(true);
    try {
      const res = await apiClient.get(`/instructor/student/${s.id}/stats`);
      setSelectedStats((res.data ?? null) as StudentStatsResponse | null);
    } catch {
      setSelectedStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => {
    const branches = new Set<string>();
    const sections = new Set<string>();
    const years = new Set<string>();

    students.forEach((s) => {
      if (s.branch) branches.add(String(s.branch));
      if (s.section) sections.add(String(s.section));
      if (s.year) years.add(String(s.year));
    });

    const sortStr = (a: string, b: string) => a.localeCompare(b);
    return {
      branches: ["all", ...Array.from(branches).sort(sortStr)],
      sections: ["all", ...Array.from(sections).sort(sortStr)],
      years: [
        "all",
        ...Array.from(years).sort((a, b) => parseInt(a) - parseInt(b)),
      ],
    };
  }, [students]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter((x) => {
      if (branch !== "all" && safeStr(x.branch) !== branch) return false;
      if (section !== "all" && safeStr(x.section) !== section) return false;
      if (year !== "all" && safeStr(x.year) !== year) return false;

      if (s) {
        const hay =
          `${x.name ?? ""} ${x.id ?? ""} ${x.branch ?? ""} ${x.section ?? ""} ${x.year ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [students, branch, section, year, q]);

  const scores = useMemo(
    () => filtered.map((s) => clamp(s.codesyncScore ?? 0)),
    [filtered]
  );

  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((s) => s.activeThisWeek).length;
    const inactive = total - active;

    const avg = total ? scores.reduce((a, b) => a + b, 0) / total : 0;
    const med = median(scores);
    const p90 = percentile(scores, 90);

    const atRisk = filtered.filter((s) => (s.codesyncScore ?? 0) < 35).length;

    const deltaAvg =
      filtered.some((s) => typeof s.prevScore === "number")
        ? filtered.reduce(
            (a, s) =>
              a +
              ((s.codesyncScore ?? 0) -
                (s.prevScore ?? (s.codesyncScore ?? 0))),
            0
          ) / Math.max(1, total)
        : null;

    return { total, active, inactive, avg, med, p90, atRisk, deltaAvg };
  }, [filtered, scores]);

  const groupCounts = (key: keyof Student) => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const v = (s[key] as string) || "Unknown";
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const byBranch = useMemo(() => groupCounts("branch"), [filtered]);
  const bySection = useMemo(() => groupCounts("section"), [filtered]);
  const byYear = useMemo(() => groupCounts("year"), [filtered]);

  const buckets = useMemo(() => {
    const b = [
      { label: "0-20", min: 0, max: 20, count: 0 },
      { label: "21-40", min: 21, max: 40, count: 0 },
      { label: "41-60", min: 41, max: 60, count: 0 },
      { label: "61-80", min: 61, max: 80, count: 0 },
      { label: "81-100", min: 81, max: 100, count: 0 },
    ];
    filtered.forEach((s) => {
      const sc = Math.round(clamp(s.codesyncScore ?? 0));
      const bucket = b.find((x) => sc >= x.min && sc <= x.max);
      if (bucket) bucket.count += 1;
    });
    return b;
  }, [filtered]);

  const top5 = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => (b.codesyncScore ?? 0) - (a.codesyncScore ?? 0))
        .slice(0, 5),
    [filtered]
  );

  const risk5 = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => (a.codesyncScore ?? 0) - (b.codesyncScore ?? 0))
        .slice(0, 5),
    [filtered]
  );

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const keyFn = (s: Student) => {
      switch (sortKey) {
        case "name":
          return safeStr(s.name).toLowerCase();
        case "branch":
          return safeStr(s.branch).toLowerCase();
        case "section":
          return safeStr(s.section).toLowerCase();
        case "year":
          return parseInt(safeStr(s.year) || "0");
        case "active":
          return s.activeThisWeek ? 1 : 0;
        case "score":
        default:
          return clamp(s.codesyncScore ?? 0);
      }
    };

    return [...filtered].sort((a, b) => {
      const A: any = keyFn(a);
      const B: any = keyFn(b);
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
  };

  const exportCsv = () => {
    const rows = sortedRows.map((s) => {
      const score = clamp(s.codesyncScore ?? 0);
      const prev = typeof s.prevScore === "number" ? clamp(s.prevScore) : null;
      return {
        id: s.id,
        name: s.name,
        branch: s.branch ?? "",
        section: s.section ?? "",
        year: s.year ?? "",
        codesyncScore: score,
        activeThisWeek: s.activeThisWeek ? "yes" : "no",
        lastActiveAt: s.lastActiveAt ?? "",
        prevScore: prev ?? "",
        delta: prev === null ? "" : score - prev,
      };
    });

    downloadCSV(
      `codesync_instructor_students_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  /* =========================
     DRAWER: use backend stats
     ========================= */

  const drawerScore = useMemo(() => {
    const s = selectedStats?.cpScores?.displayScore;
    if (typeof s === "number" && Number.isFinite(s)) return clamp(s);
    return clamp(selected?.codesyncScore ?? 0);
  }, [selectedStats, selected]);

  const drawerSignals = useMemo(() => {
    const out: Record<PlatformId, number> = {
      leetcode: 0,
      codeforces: 0,
      codechef: 0,
      github: 0,
      hackerrank: 0,
      atcoder: 0,
    };
    PLATFORMS.forEach((p) => {
      const v = selectedStats?.platformSignals?.[p];
      out[p] = typeof v === "number" && Number.isFinite(v) ? clamp(v) : 0;
    });
    return out;
  }, [selectedStats]);

  const drawerPlatformTotals = useMemo(() => {
    const out: Record<PlatformId, number> = {
      leetcode: 0,
      codeforces: 0,
      codechef: 0,
      github: 0,
      hackerrank: 0,
      atcoder: 0,
    };
    PLATFORMS.forEach((p) => {
      const v = selectedStats?.platformWiseScores?.[p]?.total;
      out[p] = typeof v === "number" && Number.isFinite(v) ? clamp(v) : 0;
    });
    return out;
  }, [selectedStats]);

  const closeDrawer = () => {
    setSelected(null);
    setSelectedStats(null);
  };

  const lastSyncBadge = useMemo(() => {
    const d = daysAgo(lastSyncAt);
    if (d === null) return { tone: "slate" as const, text: "Sync unknown" };
    if (d <= 0) return { tone: "emerald" as const, text: "Synced today" };
    if (d <= 2) return { tone: "sky" as const, text: `Synced ${d}d ago` };
    return { tone: "amber" as const, text: `Synced ${d}d ago` };
  }, [lastSyncAt]);

  return (
    <div className={`min-h-screen ${BG} text-slate-100`}>
      {/* glow bg */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-24 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-2 sm:px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <GlowTitle
              title="Instructor Dashboard"
              subtitle="Cohort intelligence, performance spread, and student drill-down — in one premium view."
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
                <RiTimeLine className="text-slate-400" />
                Last sync:{" "}
                <span className="text-slate-200">
                  {lastSyncAt
                    ? new Date(lastSyncAt).toLocaleString()
                    : loading
                    ? "Loading…"
                    : "—"}
                </span>
              </span>
              <ToneBadge
                tone={lastSyncBadge.tone}
                text={lastSyncBadge.text}
                icon={<RiCheckDoubleLine />}
              />
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-slate-300">
                <RiInformationLine className="text-slate-400" />
                Filtered:{" "}
                <span className="text-slate-100 tabular-nums">
                  {filtered.length}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Command Bar */}
        <div className="sticky top-0 z-40 -mx-2 sm:-mx-4 lg:-mx-6 px-2 sm:px-4 lg:px-6 py-3 bg-[#050509]/80 backdrop-blur-xl border-b border-slate-800/60">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <RiSearch2Line className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search: name / id / branch / section…"
                  className="w-full sm:w-[26rem] rounded-full border border-slate-800 bg-slate-950/60 pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.12)]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Chip
                  tone="primary"
                  onClick={() => fetchDashboard()}
                  active={false}
                >
                  Apply filters
                </Chip>
                <Chip
                  onClick={() => {
                    setBranch("all");
                    setSection("all");
                    setYear("all");
                    setQ("");
                  }}
                >
                  Reset
                </Chip>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportCsv}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/60 transition"
                type="button"
              >
                <RiDownload2Line /> Export CSV
              </button>

              <button
                onClick={triggerRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition disabled:opacity-70"
                type="button"
              >
                <RiRefreshLine />
                {refreshing ? "Refreshing…" : "Refresh cohort"}
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className={`${CARD} mt-3 p-3`}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <div className="mb-2 text-xs text-slate-400">Branch</div>
                <div className="flex flex-wrap gap-2">
                  {options.branches.slice(0, 14).map((b) => (
                    <Chip key={b} active={branch === b} onClick={() => setBranch(b)}>
                      {b === "all" ? "All" : b}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs text-slate-400">Section</div>
                <div className="flex flex-wrap gap-2">
                  {options.sections.slice(0, 14).map((s) => (
                    <Chip key={s} active={section === s} onClick={() => setSection(s)}>
                      {s === "all" ? "All" : `Sec ${s}`}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs text-slate-400">Year</div>
                <div className="flex flex-wrap gap-2">
                  {options.years.map((y) => (
                    <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                      {y === "all" ? "All" : `Year ${y}`}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            label="Students"
            value={String(kpis.total)}
            hint="Filtered cohort count"
            icon={<RiTeamLine className="text-lg" />}
            tone="sky"
          />
          <StatCard
            label="Active (week)"
            value={String(kpis.active)}
            hint={`${Math.round(pct(kpis.active, kpis.total))}% active`}
            icon={<RiPulseLine className="text-lg" />}
            tone="emerald"
          />
          <StatCard
            label="At-risk"
            value={String(kpis.atRisk)}
            hint={`${Math.round(pct(kpis.atRisk, kpis.total))}% below 35`}
            icon={<RiAlarmWarningLine className="text-lg" />}
            tone="rose"
          />
          <StatCard
            label="Average"
            value={`${fmt(kpis.avg)} / 100`}
            hint={
              kpis.deltaAvg === null
                ? "Mean score"
                : `Avg change: ${kpis.deltaAvg >= 0 ? "+" : ""}${kpis.deltaAvg.toFixed(1)}`
            }
            icon={<RiBarChart2Line className="text-lg" />}
            tone="fuchsia"
          />
          <StatCard
            label="Median"
            value={`${fmt(kpis.med)} / 100`}
            hint="Robust benchmark"
            icon={<RiBarChart2Line className="text-lg" />}
            tone="amber"
          />
          <StatCard
            label="P90"
            value={`${fmt(kpis.p90)} / 100`}
            hint="Top 10% benchmark"
            icon={<RiTrophyLine className="text-lg" />}
            tone="sky"
          />
        </div>

        {/* Breakdown */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">By Branch</div>
              <RiSparkling2Line className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {byBranch.slice(0, 7).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
              {!byBranch.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">By Section</div>
              <RiSparkling2Line className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {bySection.slice(0, 7).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label === "Unknown" ? "Unknown" : `Sec ${x.label}`}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
              {!bySection.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">By Year</div>
              <RiSparkling2Line className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {byYear.slice(0, 7).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label === "Unknown" ? "Unknown" : `Year ${x.label}`}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
              {!byYear.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Distribution */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Score distribution
                </div>
                <div className="text-xs text-slate-500">
                  Cohort spread across score bands
                </div>
              </div>
              <RiBarChart2Line className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {buckets.map((b) => (
                <BarRow
                  key={b.label}
                  label={b.label}
                  value={pct(b.count, kpis.total)}
                  right={<span>{b.count}</span>}
                />
              ))}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Platform mix (quick)
                </div>
                <div className="text-xs text-slate-500">
                  Uses dashboard payload. Drawer shows real platform scores.
                </div>
              </div>
              <RiFireLine className="text-slate-400" />
            </div>

            <div className="mt-4 space-y-3">
              {PLATFORMS.map((p) => {
                const avg =
                  filtered.reduce((a, s) => a + (s.platforms?.[p] ?? 0), 0) /
                  Math.max(1, filtered.length);
                return (
                  <BarRow
                    key={p}
                    label={PLATFORM_LABEL[p]}
                    value={clamp(avg)}
                    right={<span className="tabular-nums">{Math.round(avg)}</span>}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Top + At-risk */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Top performers
                </div>
                <div className="text-xs text-slate-500">
                  Best scores in current filter
                </div>
              </div>
              <RiTrophyLine className="text-slate-300" />
            </div>

            <div className="mt-4 space-y-2">
              {top5.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openStudent(s)}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 hover:bg-slate-900/50 transition"
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-100">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.branch ?? "—"} • Sec {s.section ?? "—"} • Year{" "}
                      {s.year ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold tabular-nums text-slate-100">
                      {Math.round(s.codesyncScore ?? 0)}
                    </div>
                    <RiArrowRightUpLine className="text-slate-400" />
                  </div>
                </button>
              ))}
              {!top5.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  At-risk list
                </div>
                <div className="text-xs text-slate-500">
                  Low score / inactive students
                </div>
              </div>
              <RiAlarmWarningLine className="text-rose-300" />
            </div>

            <div className="mt-4 space-y-2">
              {risk5.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openStudent(s)}
                  className="w-full text-left flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 hover:bg-slate-900/50 transition"
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate text-slate-100">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.activeThisWeek ? "Active" : "Inactive"} •{" "}
                      {s.branch ?? "—"} • Year {s.year ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold tabular-nums text-slate-100">
                      {Math.round(s.codesyncScore ?? 0)}
                    </div>
                    <RiArrowRightUpLine className="text-slate-400" />
                  </div>
                </button>
              ))}
              {!risk5.length && !loading ? (
                <div className="text-sm text-slate-500">No data.</div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Student Grid */}
        <div className="mt-6">
          <div className={`${CARD} p-4`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Student Pulse
                </div>
                <div className="text-xs text-slate-500">
                  Click a student for the intelligence drawer. Handles open the
                  live profile.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                  onClick={() => toggleSort("score")}
                  type="button"
                >
                  Sort: Score
                </button>
                <button
                  className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                  onClick={() => toggleSort("active")}
                  type="button"
                >
                  Sort: Activity
                </button>
                <button
                  className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                  onClick={() => toggleSort("name")}
                  type="button"
                >
                  Sort: Name
                </button>
                <button
                  className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                  onClick={() => fetchDashboard()}
                  type="button"
                >
                  Refresh view
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`sk-${idx}`}
                    className="h-[290px] rounded-3xl border border-slate-800 bg-slate-950/40 animate-pulse"
                  />
                ))
              : sortedRows.map((s) => {
                  const score = clamp(s.codesyncScore ?? 0);
                  const delta =
                    typeof s.prevScore === "number"
                      ? score - clamp(s.prevScore)
                      : null;

                  const handles = s.cpHandles || {};
                  const hasHandles = PLATFORMS.some((p) => !!handles[p]);

                  const last = daysAgo(s.lastActiveAt);
                  const recency =
                    last === null
                      ? { tone: "slate" as const, text: "No activity" }
                      : last <= 2
                      ? { tone: "emerald" as const, text: "Active recently" }
                      : last <= 7
                      ? { tone: "sky" as const, text: `${last}d ago` }
                      : { tone: "amber" as const, text: `${last}d ago` };

                  const risk =
                    score < 35
                      ? { tone: "rose" as const, text: "At-risk" }
                      : score < 55
                      ? { tone: "amber" as const, text: "Needs push" }
                      : { tone: "emerald" as const, text: "Healthy" };

                  return (
                    <button
                      key={s.id}
                      onClick={() => openStudent(s)}
                      className="text-left rounded-3xl border border-slate-800 bg-gradient-to-br from-[#060914] via-[#0b0f22] to-[#07080f] p-4 shadow-[0_26px_80px_rgba(2,6,23,0.65)] hover:border-sky-400/40 hover:shadow-[0_26px_100px_rgba(59,130,246,0.18)] transition"
                      type="button"
                    >
                      {/* top row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-100 truncate">
                            {s.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {s.id} • {s.branch ?? "—"} • Sec {s.section ?? "—"} •
                            Year {s.year ?? "—"}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <ToneBadge
                              tone={risk.tone}
                              text={risk.text}
                              icon={<RiShieldLine />}
                            />
                            <ToneBadge
                              tone={recency.tone}
                              text={recency.text}
                              icon={<RiFlashlightLine />}
                            />
                            {s.activeThisWeek ? (
                              <ToneBadge
                                tone="emerald"
                                text="Active this week"
                                icon={<RiPulseLine />}
                              />
                            ) : (
                              <ToneBadge
                                tone="slate"
                                text="Inactive"
                                icon={<RiAlarmWarningLine />}
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-sm font-semibold text-slate-100 tabular-nums">
                            {Math.round(score)}
                          </div>
                          {delta !== null ? (
                            <div
                              className={[
                                "text-xs tabular-nums",
                                delta >= 0
                                  ? "text-emerald-300"
                                  : "text-rose-300",
                              ].join(" ")}
                            >
                              {delta >= 0 ? "+" : ""}
                              {Math.round(delta)}
                            </div>
                          ) : (
                            <div className="text-[0.65rem] text-slate-500">
                              no delta
                            </div>
                          )}
                        </div>
                      </div>

                      {/* score bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[0.65rem] text-slate-500">
                          <span>CodeSync score</span>
                          <span className="tabular-nums">
                            {Math.round(score)}/100
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-800/70 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>

                      {/* handles */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {PLATFORMS.map((p) => (
                          <HandlePill
                            key={`${s.id}-${p}`}
                            platform={p}
                            handle={handles[p]}
                          />
                        ))}
                        {!hasHandles ? (
                          <span className="text-xs text-slate-500">
                            No linked handles
                          </span>
                        ) : null}
                      </div>

                      {/* bottom row */}
                      <div className="mt-4 flex items-center justify-between">
                        <PlatformMini platforms={s.platforms} />
                        <span className="text-xs text-slate-500 inline-flex items-center gap-2">
                          <RiArrowRightUpLine className="text-slate-400" />
                          Open intelligence
                        </span>
                      </div>
                    </button>
                  );
                })}
          </div>

          {!loading && sortedRows.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">
              No students found.
            </div>
          ) : null}
        </div>

        <div className={`mt-5 ${CARD} p-4`}>
          <div className="text-xs text-slate-400">
            ✅ Drawer uses backend fields:{" "}
            <span className="text-slate-200">
              platformSignals / platformNumbers / platformWiseScores
            </span>{" "}
            from{" "}
            <span className="text-slate-200">
              /instructor/student/:id/stats
            </span>
            .
          </div>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={closeDrawer}
            />

            <motion.aside
              initial={{ x: 520, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 520, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="fixed right-0 top-0 z-50 h-full w-full sm:w-[600px] border-l border-slate-800 bg-[#050509] p-4 overflow-y-auto"
            >
              {/* header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-50 truncate">
                    {selectedStats?.profile?.name ?? selected.name}
                  </div>
                  <div className="text-sm text-slate-400 truncate">
                    {selected.id} • {selected.branch ?? "—"} • Sec{" "}
                    {selected.section ?? "—"} • Year {selected.year ?? "—"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ToneBadge
                      tone={drawerScore < 35 ? "rose" : drawerScore < 55 ? "amber" : "emerald"}
                      text={drawerScore < 35 ? "At-risk" : drawerScore < 55 ? "Needs push" : "Healthy"}
                      icon={<RiShieldLine />}
                    />
                    <ToneBadge
                      tone={
                        (daysAgo(selected.lastActiveAt) ?? 999) <= 2
                          ? "emerald"
                          : (daysAgo(selected.lastActiveAt) ?? 999) <= 7
                          ? "sky"
                          : "amber"
                      }
                      text={
                        daysAgo(selected.lastActiveAt) === null
                          ? "No activity"
                          : `${daysAgo(selected.lastActiveAt)}d ago`
                      }
                      icon={<RiFlashlightLine />}
                    />
                    {selected.activeThisWeek ? (
                      <ToneBadge tone="emerald" text="Active this week" icon={<RiPulseLine />} />
                    ) : (
                      <ToneBadge tone="slate" text="Inactive" icon={<RiAlarmWarningLine />} />
                    )}
                  </div>
                </div>

                <button
                  onClick={closeDrawer}
                  className="h-9 w-9 rounded-full border border-slate-800 bg-slate-950/60 flex items-center justify-center hover:bg-slate-900/60 transition"
                  type="button"
                >
                  <RiCloseLine className="text-slate-200" />
                </button>
              </div>

              {/* score + summary */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className={`${CARD_SOLID} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    CodeSync Score
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-slate-50 tabular-nums">
                    {Math.round(drawerScore)}
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800/70 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
                      style={{ width: `${drawerScore}%` }}
                    />
                  </div>

                  {typeof selectedStats?.cpScores?.prevDisplayScore === "number" ? (
                    <div className="mt-2 text-xs text-slate-400">
                      Previous:{" "}
                      <span className="tabular-nums text-slate-200">
                        {Math.round(selectedStats.cpScores.prevDisplayScore)}
                      </span>{" "}
                      • Delta:{" "}
                      <span
                        className={
                          drawerScore - clamp(selectedStats.cpScores.prevDisplayScore) >= 0
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }
                      >
                        {drawerScore - clamp(selectedStats.cpScores.prevDisplayScore) >= 0 ? "+" : ""}
                        {Math.round(drawerScore - clamp(selectedStats.cpScores.prevDisplayScore))}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      No previous snapshot.
                    </div>
                  )}
                </div>

                <div className={`${CARD_SOLID} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    Signals & Recency
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Platform sum:{" "}
                    <span className="text-slate-200 tabular-nums">
                      {Math.round(selectedStats?.platformSum ?? 0)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Platform avg:{" "}
                    <span className="text-slate-200 tabular-nums">
                      {Math.round(selectedStats?.overallFromPlatforms ?? 0)}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Updated:{" "}
                    <span className="text-slate-200">
                      {niceDate(
                        selectedStats?.cpScores?.updatedAt ??
                          selectedStats?.profile?.updatedAt ??
                          selected.lastActiveAt
                      )}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                    <RiInformationLine className="text-slate-400" />
                    Tip: Platform totals explain *why* score is high/low.
                  </div>
                </div>
              </div>

              {/* contact */}
              {(selectedStats?.profile?.email ||
                selectedStats?.profile?.phone ||
                selected.email ||
                selected.phone) ? (
                <div className={`mt-3 ${CARD_SOLID} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    Contact
                  </div>
                  <div className="mt-2 space-y-2 text-sm text-slate-200">
                    {(selectedStats?.profile?.email ?? selected.email) ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <RiMailLine className="text-slate-400" />
                          <span className="truncate">
                            {selectedStats?.profile?.email ?? selected.email}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await copyToClipboard(
                              String(selectedStats?.profile?.email ?? selected.email)
                            );
                            if (!ok) alert("Copy failed");
                          }}
                        >
                          <RiFileCopyLine /> Copy
                        </button>
                      </div>
                    ) : null}

                    {(selectedStats?.profile?.phone ?? selected.phone) ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <RiPhoneLine className="text-slate-400" />
                          <span className="truncate">
                            {selectedStats?.profile?.phone ?? selected.phone}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await copyToClipboard(
                              String(selectedStats?.profile?.phone ?? selected.phone)
                            );
                            if (!ok) alert("Copy failed");
                          }}
                        >
                          <RiFileCopyLine /> Copy
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* platforms */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      Platform intelligence
                    </div>
                    <div className="text-xs text-slate-500">
                      Totals + signals + normalized numbers + score parts
                    </div>
                  </div>
                  <RiFireLine className="text-slate-400" />
                </div>

                <div className="mt-3">
                  {statsLoading ? (
                    <div className={`${CARD_SOLID} p-4 text-sm text-slate-400`}>
                      Loading platform data…
                    </div>
                  ) : !selectedStats ? (
                    <div className={`${CARD_SOLID} p-4 text-sm text-slate-500`}>
                      No platform stats found. (Check cpProfiles subcollection +
                      stats route.)
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {PLATFORMS.map((pid) => {
                        const handle = selectedStats?.cpHandles?.[pid] ?? null;
                        const numbers = selectedStats?.platformNumbers?.[pid] ?? null;
                        const chips = numberChips(pid, numbers);

                        const total = drawerPlatformTotals[pid];
                        const signal = drawerSignals[pid];

                        const parts =
                          selectedStats?.platformWiseScores?.[pid]?.parts ?? null;
                        const partEntries = parts
                          ? Object.entries(parts).sort(
                              (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
                            )
                          : [];

                        const openPlatform = () => {
                          if (!handle) return;
                          window.open(
                            PLATFORM_URL[pid](handle),
                            "_blank",
                            "noopener,noreferrer"
                          );
                        };

                        return (
                          <div key={pid} className={`${CARD_SOLID} p-3`}>
                            {/* header row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-slate-100">
                                    {PLATFORM_LABEL[pid]}
                                  </div>
                                  {handle ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPlatform();
                                      }}
                                      className="inline-flex items-center gap-1 text-[0.72rem] text-slate-300 hover:text-slate-100 transition"
                                      title="Open profile"
                                    >
                                      @{handle} <RiExternalLinkLine className="text-slate-500" />
                                    </button>
                                  ) : (
                                    <span className="text-[0.72rem] text-slate-500">
                                      no username
                                    </span>
                                  )}
                                </div>

                                {/* chips */}
                                {chips.length ? (
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    {chips.map((c) => (
                                      <span
                                        key={`${pid}-${c.k}`}
                                        className="rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-slate-200"
                                      >
                                        {c.k} {c.v}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs text-slate-500">
                                    {numbers ? "stats present" : "missing platformNumbers"}
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                <div className="text-[0.7rem] text-slate-500">
                                  total · signal
                                </div>
                                <div className="text-sm font-semibold text-slate-100 tabular-nums">
                                  {Math.round(total)}{" "}
                                  <span className="text-slate-500">·</span>{" "}
                                  {Math.round(signal)}
                                </div>
                              </div>
                            </div>

                            {/* total bar */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[0.7rem] text-slate-500">
                                <span>Platform total</span>
                                <span className="tabular-nums">
                                  {Math.round(total)}/100
                                </span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-slate-800/60 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
                                  style={{ width: `${clamp(total)}%` }}
                                />
                              </div>
                            </div>

                            {/* parts breakdown */}
                            {partEntries.length ? (
                              <div className="mt-3 space-y-2">
                                <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                                  Score parts
                                </div>

                                {partEntries.slice(0, 6).map(([k, v]) => (
                                  <div
                                    key={`${pid}-part-${k}`}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="text-xs text-slate-300">
                                      {k}
                                    </div>
                                    <div className="text-xs text-slate-300 tabular-nums">
                                      {Math.round(v)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-3 text-xs text-slate-500">
                                No breakdown parts returned.
                              </div>
                            )}

                            {/* micro actions */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {handle ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const ok = await copyToClipboard(handle);
                                      if (!ok) alert("Copy failed");
                                    }}
                                  >
                                    <RiFileCopyLine /> Copy handle
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-xs text-slate-300 hover:bg-slate-900/60 transition"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPlatform();
                                    }}
                                  >
                                    <RiExternalLinkLine /> Open
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  No handle linked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* footer buttons */}
              <div className="mt-5 flex items-center gap-2">
                <button
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/60 transition"
                  type="button"
                  onClick={() => window.location.assign(`/profile/${selected.id}`)}
                >
                  Open profile <RiArrowRightUpLine />
                </button>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition"
                  type="button"
                  onClick={() => alert("Next: add instructor notes / messaging.")}
                >
                  Quick Action <RiSparkling2Line />
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                <RiShieldLine className="text-slate-400" />
                This panel is designed for *interventions*: identify risk, see causes, and act.
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
