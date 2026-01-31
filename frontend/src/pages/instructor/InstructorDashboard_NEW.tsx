'use client';

import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
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
  RiTimeLine,
  RiLinksLine,
  RiInformationLine,
  RiFlashlightLine,
  RiShieldLine,
  RiSparkling2Line,
  RiCheckDoubleLine,
} from 'react-icons/ri';

/* ==================== TYPES ==================== */

type PlatformId = 'leetcode' | 'codeforces' | 'codechef' | 'github' | 'hackerrank' | 'atcoder';

const PLATFORMS: PlatformId[] = [
  'leetcode',
  'codeforces',
  'codechef',
  'github',
  'hackerrank',
  'atcoder',
];

const PLATFORM_LABEL: Record<PlatformId, string> = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  github: 'GitHub',
  hackerrank: 'HackerRank',
  atcoder: 'AtCoder',
};

const PLATFORM_URL: Record<PlatformId, (h: string) => string> = {
  leetcode: (h) => `https://leetcode.com/u/${h}/`,
  codeforces: (h) => `https://codeforces.com/profile/${h}`,
  codechef: (h) => `https://www.codechef.com/users/${h}`,
  github: (h) => `https://github.com/${h}`,
  hackerrank: (h) => `https://www.hackerrank.com/profile/${h}`,
  atcoder: (h) => `https://atcoder.jp/users/${h}`,
};

type CpScores = {
  displayScore?: number;
  codeSyncScore?: number;
  prevDisplayScore?: number | null;
  totalProblemsSolved?: number;
  platformSkills?: Record<PlatformId, number>;
  breakdown?: any;
  updatedAt?: string;
};

type Student = {
  id: string;
  name: string;
  branch?: string;
  section?: string;
  year?: string;

  displayScore?: number;
  codeSyncScore?: number;
  prevScore?: number | null;
  activeThisWeek?: boolean;
  lastActiveAt?: string | null;

  cpHandles?: Partial<Record<PlatformId, string | null>>;
  platforms?: Partial<Record<PlatformId, number>>;

  email?: string | null;
  phone?: string | null;
};

type StudentStatsResponse = {
  profile?: {
    id?: string;
    fullName?: string;
    branch?: string | null;
    section?: string | null;
    year?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;

  cpHandles?: Partial<Record<PlatformId, string | null>> | null;
  cpScores?: CpScores | null;

  platformNumbers?: Partial<Record<PlatformId, any | null>> | null;
  platformSignals?: Partial<Record<PlatformId, number>> | null;
  platformWiseScores?: Partial<
    Record<PlatformId, { total: number; parts: Record<string, number> }>
  > | null;

  platformSum?: number;
  platformStats?: Record<PlatformId, any | null>;
};

/* ==================== STYLES ==================== */

const BG = 'bg-[#050509]';
const CARD =
  'rounded-2xl border border-slate-800/80 bg-slate-950/45 backdrop-blur-xl shadow-[0_0_0_1px_rgba(15,23,42,0.65)]';
const CARD_SOLID =
  'rounded-2xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-xl shadow-[0_0_0_1px_rgba(15,23,42,0.65)]';

/* ==================== UTILS ==================== */

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return (part / total) * 100;
}

function fmt(n: number) {
  return Number.isFinite(n) ? String(Math.round(n)) : '0';
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
  return (x ?? '').toString();
}

function safeNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function niceDate(x?: string | null) {
  if (!x) return '—';
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) return '—';
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

function downloadCSV(filename: string, rows: Array<Record<string, any>>) {
  const colSet = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) colSet.add(k);
  const cols = [...colSet];

  const esc = (v: any) => {
    const str = (v ?? '').toString();
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const csv =
    cols.join(',') +
    '\n' +
    rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ==================== COMPONENTS ==================== */

function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'sky',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'sky' | 'fuchsia' | 'emerald' | 'rose' | 'amber';
}) {
  const toneCls: Record<string, string> = {
    sky: 'from-sky-500/28 via-sky-500/10 to-transparent',
    fuchsia: 'from-fuchsia-500/28 via-fuchsia-500/10 to-transparent',
    emerald: 'from-emerald-500/28 via-emerald-500/10 to-transparent',
    rose: 'from-rose-500/28 via-rose-500/10 to-transparent',
    amber: 'from-amber-500/28 via-amber-500/10 to-transparent',
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
  value: number;
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
  tone = 'default',
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'primary';
}) {
  const base =
    'rounded-full border px-3 py-1 text-[0.7rem] transition select-none';
  const activeCls =
    tone === 'primary'
      ? 'border-sky-500/40 bg-sky-500/10 text-slate-100 shadow-[0_0_18px_rgba(56,189,248,0.15)]'
      : 'border-slate-700 bg-slate-900/40 text-slate-100';
  const idleCls =
    'border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900/60';

  return (
    <button
      onClick={onClick}
      className={[base, active ? activeCls : idleCls].join(' ')}
      type="button"
    >
      {children}
    </button>
  );
}

function ToneBadge({
  tone,
  text,
  icon,
}: {
  tone: 'emerald' | 'rose' | 'amber' | 'slate' | 'sky';
  text: string;
  icon?: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    slate: 'border-slate-700 bg-slate-950/60 text-slate-200',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  };
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem]',
        map[tone],
      ].join(' ')}
    >
      {icon}
      {text}
    </span>
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
        window.open(url, '_blank', 'noopener,noreferrer');
      }}
      className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[0.7rem] text-slate-200 hover:border-sky-400/60 hover:bg-slate-900/60 transition"
      title={`Open ${PLATFORM_LABEL[platform]} profile`}
    >
      <RiLinksLine className="text-slate-400" />
      {PLATFORM_LABEL[platform]} @{handle}
    </button>
  );
}

type SortKey = 'name' | 'branch' | 'section' | 'year' | 'score' | 'active';
type SortDir = 'asc' | 'desc';

/* ==================== PAGE ==================== */

export default function InstructorDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const [branch, setBranch] = useState<string>('all');
  const [section, setSection] = useState<string>('all');
  const [year, setYear] = useState<string>('all');
  const [q, setQ] = useState<string>('');

  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [selected, setSelected] = useState<Student | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedStats, setSelectedStats] = useState<StudentStatsResponse | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/instructor/dashboard', {
        params: {
          branch: branch === 'all' ? undefined : branch,
          section: section === 'all' ? undefined : section,
          year: year === 'all' ? undefined : year,
          q: q.trim() ? q.trim() : undefined,
        },
      });
      const data = res.data || {};
      setStudents(data.students ?? []);
      setLastSyncAt(data.lastSyncAt ?? null);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await apiClient.post('/instructor/refresh-cohort', {
        branch: branch === 'all' ? undefined : branch,
        section: section === 'all' ? undefined : section,
        year: year === 'all' ? undefined : year,
      });
      await fetchDashboard();
    } catch {
      // ok if not implemented
    } finally {
      setRefreshing(false);
    }
  };

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

  const getDisplayScore = (s: Student) => clamp(s.displayScore ?? 0);
  const getTotalScore = (s: Student) => safeNum(s.codeSyncScore ?? 0);
  const getRankScore = (s: Student) => getDisplayScore(s);

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
      branches: ['all', ...Array.from(branches).sort(sortStr)],
      sections: ['all', ...Array.from(sections).sort(sortStr)],
      years: [
        'all',
        ...Array.from(years).sort((a, b) => parseInt(a) - parseInt(b)),
      ],
    };
  }, [students]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter((x) => {
      if (branch !== 'all' && safeStr(x.branch) !== branch) return false;
      if (section !== 'all' && safeStr(x.section) !== section) return false;
      if (year !== 'all' && safeStr(x.year) !== year) return false;

      if (s) {
        const hay =
          `${x.name ?? ''} ${x.id ?? ''} ${x.branch ?? ''} ${x.section ?? ''} ${x.year ?? ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [students, branch, section, year, q]);

  const scores = useMemo(() => filtered.map((s) => getDisplayScore(s)), [filtered]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((s) => s.activeThisWeek).length;
    const inactive = total - active;

    const avg = total ? scores.reduce((a, b) => a + b, 0) / total : 0;
    const med = median(scores);
    const p90 = percentile(scores, 90);

    const atRisk = filtered.filter((s) => getDisplayScore(s) < 35).length;

    const deltaAvg =
      filtered.some((s) => typeof s.prevScore === 'number')
        ? filtered.reduce(
            (a, s) =>
              a +
              (getDisplayScore(s) - (s.prevScore ?? getDisplayScore(s))),
            0
          ) / Math.max(1, total)
        : null;

    return { total, active, inactive, avg, med, p90, atRisk, deltaAvg };
  }, [filtered, scores]);

  const groupCounts = (key: keyof Student) => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const v = (s[key] as string) || 'Unknown';
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const byBranch = useMemo(() => groupCounts('branch'), [filtered]);
  const bySection = useMemo(() => groupCounts('section'), [filtered]);
  const byYear = useMemo(() => groupCounts('year'), [filtered]);

  const buckets = useMemo(() => {
    const b = [
      { label: '0-20', min: 0, max: 20, count: 0 },
      { label: '21-40', min: 21, max: 40, count: 0 },
      { label: '41-60', min: 41, max: 60, count: 0 },
      { label: '61-80', min: 61, max: 80, count: 0 },
      { label: '81-100', min: 81, max: 100, count: 0 },
    ];
    filtered.forEach((s) => {
      const sc = Math.round(getDisplayScore(s));
      const bucket = b.find((x) => sc >= x.min && sc <= x.max);
      if (bucket) bucket.count += 1;
    });
    return b;
  }, [filtered]);

  const top5 = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => getRankScore(b) - getRankScore(a))
        .slice(0, 5),
    [filtered]
  );

  const risk5 = useMemo(() => {
    const topIds = new Set(top5.map((s) => s.id));
    const candidates = filtered.filter((s) => {
      const score = getRankScore(s);
      return score < 35 || !s.activeThisWeek;
    });
    return candidates
      .filter((s) => !topIds.has(s.id))
      .sort((a, b) => getRankScore(a) - getRankScore(b))
      .slice(0, 5);
  }, [filtered, top5]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;

    const keyFn = (s: Student) => {
      switch (sortKey) {
        case 'name':
          return safeStr(s.name).toLowerCase();
        case 'branch':
          return safeStr(s.branch).toLowerCase();
        case 'section':
          return safeStr(s.section).toLowerCase();
        case 'year':
          return parseInt(safeStr(s.year) || '0');
        case 'active':
          return s.activeThisWeek ? 1 : 0;
        case 'score':
        default:
          return getDisplayScore(s);
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
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir(k === 'name' ? 'asc' : 'desc');
    }
  };

  const exportCsv = () => {
    const rows = sortedRows.map((s) => {
      const score = getDisplayScore(s);
      const totalScore = getTotalScore(s);
      const prev = typeof s.prevScore === 'number' ? clamp(s.prevScore) : null;
      return {
        id: s.id,
        name: s.name,
        branch: s.branch ?? '',
        section: s.section ?? '',
        year: s.year ?? '',
        displayScore: score,
        codeSyncScore: totalScore,
        activeThisWeek: s.activeThisWeek ? 'yes' : 'no',
        lastActiveAt: s.lastActiveAt ?? '',
        prevScore: prev ?? '',
        delta: prev === null ? '' : score - prev,
      };
    });

    downloadCSV(
      `codesync_instructor_students_${new Date().toISOString().slice(0, 10)}.csv`,
      rows
    );
  };

  const maxTotalScore = useMemo(() => {
    const vals = sortedRows.map((s) => getTotalScore(s));
    return Math.max(1, ...vals);
  }, [sortedRows]);

  const closeDrawer = () => {
    setSelected(null);
    setSelectedStats(null);
  };

  const drawerScore = useMemo(() => {
    const s = selectedStats?.cpScores?.displayScore;
    if (typeof s === 'number' && Number.isFinite(s)) return clamp(s);
    return clamp(selected?.displayScore ?? 0);
  }, [selectedStats, selected]);

  const drawerTotalScore = useMemo(() => {
    const s = selectedStats?.cpScores?.codeSyncScore;
    if (typeof s === 'number' && Number.isFinite(s)) return s;
    const fallback = selectedStats?.platformSum ?? null;
    if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
    return getTotalScore(selected ?? ({} as Student));
  }, [selectedStats, selected]);

  return (
    <div className={`min-h-screen ${BG} text-slate-100`}>
      {/* Glow bg */}
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute -top-24 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-96 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-2 sm:px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Instructor Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Cohort analytics and student performance tracking
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            label="Students"
            value={String(kpis.total)}
            hint="Total in cohort"
            icon={<RiTeamLine className="text-lg" />}
            tone="sky"
          />
          <StatCard
            label="Active (Week)"
            value={String(kpis.active)}
            hint={`${Math.round(pct(kpis.active, kpis.total))}% active`}
            icon={<RiPulseLine className="text-lg" />}
            tone="emerald"
          />
          <StatCard
            label="At-Risk"
            value={String(kpis.atRisk)}
            hint={`${Math.round(pct(kpis.atRisk, kpis.total))}% <35`}
            icon={<RiAlarmWarningLine className="text-lg" />}
            tone="rose"
          />
          <StatCard
            label="Average"
            value={`${fmt(kpis.avg)}/100`}
            hint={
              kpis.deltaAvg === null
                ? 'Mean'
                : `Δ ${kpis.deltaAvg >= 0 ? '+' : ''}${fmt(kpis.deltaAvg)}`
            }
            icon={<RiBarChart2Line className="text-lg" />}
            tone="fuchsia"
          />
          <StatCard
            label="Median"
            value={`${fmt(kpis.med)}/100`}
            hint="50th percentile"
            icon={<RiBarChart2Line className="text-lg" />}
            tone="amber"
          />
          <StatCard
            label="P90"
            value={`${fmt(kpis.p90)}/100`}
            hint="90th percentile"
            icon={<RiTrophyLine className="text-lg" />}
            tone="sky"
          />
        </div>

        {/* Distribution */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Score Distribution
              </h3>
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
                <h3 className="text-sm font-semibold text-slate-100">
                  By Branch
                </h3>
              </div>
              <RiSparkling2Line className="text-slate-400" />
            </div>
            <div className="mt-4 space-y-3">
              {byBranch.slice(0, 5).map((x) => (
                <BarRow
                  key={x.label}
                  label={x.label}
                  value={pct(x.count, kpis.total)}
                  right={<span>{x.count}</span>}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Top & At-Risk */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Top Performers
              </h3>
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
                    <div className="text-xs text-slate-500">
                      {s.branch ?? '—'} • Sec {s.section ?? '—'}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-100 tabular-nums">
                    {Math.round(getRankScore(s))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                At-Risk Students
              </h3>
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
                    <div className="text-xs text-slate-500">
                      {s.activeThisWeek ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-100 tabular-nums">
                    {Math.round(getRankScore(s))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={`${CARD} mt-6 p-4`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <RiSearch2Line className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or id…"
                className="w-full rounded-full border border-slate-800 bg-slate-950/60 pl-9 pr-4 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/50"
              />
            </div>
            <div className="flex gap-2">
              <Chip
                tone="primary"
                onClick={() => fetchDashboard()}
                active={false}
              >
                Apply
              </Chip>
              <button
                onClick={exportCsv}
                className="rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/60 transition"
                type="button"
              >
                <RiDownload2Line className="inline mr-1" />
                Export
              </button>
              <button
                onClick={triggerRefresh}
                disabled={refreshing}
                className="rounded-full border border-slate-800 bg-gradient-to-r from-sky-400 to-fuchsia-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                type="button"
              >
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Student Grid */}
        <div className="mt-6">
          <div className={`${CARD} p-4 mb-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                Students ({filtered.length})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSort('score')}
                  className="text-xs px-2 py-1 rounded border border-slate-800 hover:bg-slate-900/60"
                  type="button"
                >
                  Score
                </button>
                <button
                  onClick={() => toggleSort('name')}
                  className="text-xs px-2 py-1 rounded border border-slate-800 hover:bg-slate-900/60"
                  type="button"
                >
                  Name
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`sk-${idx}`}
                    className="h-[280px] rounded-2xl border border-slate-800 bg-slate-950/40 animate-pulse"
                  />
                ))
              : sortedRows.map((s) => {
                  const displayScore = getDisplayScore(s);
                  const score = getTotalScore(s);
                  const delta =
                    typeof s.prevScore === 'number'
                      ? displayScore - clamp(s.prevScore)
                      : null;

                  const handles = s.cpHandles || {};
                  const hasHandles = PLATFORMS.some((p) => !!handles[p]);

                  const risk =
                    displayScore < 35
                      ? { tone: 'rose' as const, text: 'At-risk' }
                      : displayScore < 55
                      ? { tone: 'amber' as const, text: 'Needs push' }
                      : { tone: 'emerald' as const, text: 'Healthy' };

                  return (
                    <button
                      key={s.id}
                      onClick={() => openStudent(s)}
                      className="text-left rounded-2xl border border-slate-800 bg-gradient-to-br from-[#060914] via-[#0b0f22] to-[#07080f] p-4 shadow-[0_26px_80px_rgba(2,6,23,0.65)] hover:border-sky-400/40 transition"
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-slate-100 truncate">
                            {s.name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {s.branch ?? '—'} • Sec {s.section ?? '—'} • Year{' '}
                            {s.year ?? '—'}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <ToneBadge
                              tone={risk.tone}
                              text={risk.text}
                              icon={<RiShieldLine />}
                            />
                            {s.activeThisWeek ? (
                              <ToneBadge
                                tone="emerald"
                                text="Active"
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
                            {Math.round(displayScore)}
                          </div>
                          {delta !== null ? (
                            <div
                              className={`text-[0.65rem] font-semibold tabular-nums ${
                                delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {delta >= 0 ? '+' : ''}
                              {fmt(delta)}
                            </div>
                          ) : (
                            <div className="text-[0.65rem] text-slate-500">
                              No prior
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[0.65rem] text-slate-500 mb-1">
                          <span>Total Score</span>
                          <span className="tabular-nums">
                            {Math.round(score)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800/70 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400"
                            style={{ width: `${(score / maxTotalScore) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
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

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          <RiArrowRightUpLine className="inline mr-1" />
                          View details
                        </span>
                      </div>
                    </button>
                  );
                })}
          </div>

          {!loading && sortedRows.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">No students found.</div>
          ) : null}
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
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="fixed right-0 top-0 z-50 h-full w-full sm:w-[600px] border-l border-slate-800 bg-[#050509] p-4 overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-50 truncate">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-slate-400 truncate">
                    {selected.id} • {selected.branch ?? '—'} • Sec{' '}
                    {selected.section ?? '—'}
                  </p>
                </div>

                <button
                  onClick={closeDrawer}
                  className="h-9 w-9 rounded-full border border-slate-800 bg-slate-950/60 flex items-center justify-center hover:bg-slate-900/60"
                  type="button"
                >
                  <RiCloseLine className="text-slate-200" />
                </button>
              </div>

              {/* Scores */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className={`${CARD_SOLID} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    Display Score
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
                </div>

                <div className={`${CARD_SOLID} p-3`}>
                  <div className="text-[0.7rem] uppercase tracking-[0.14em] text-slate-400">
                    Total Score
                  </div>
                  <div className="mt-1 text-3xl font-semibold text-slate-50 tabular-nums">
                    {Math.round(drawerTotalScore)}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    From all platforms
                  </div>
                </div>
              </div>

              {/* Platforms */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100 mb-3">
                  Linked Profiles
                </h3>
                <div className="space-y-2">
                  {PLATFORMS.map((p) => {
                    const handle = selectedStats?.cpHandles?.[p];
                    return (
                      <div key={p} className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">
                          {PLATFORM_LABEL[p]}
                        </span>
                        {handle ? (
                          <HandlePill platform={p} handle={handle} />
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 flex gap-2">
                <button
                  className="flex-1 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm hover:bg-slate-900/60 transition"
                  type="button"
                  onClick={() => {
                    window.location.assign(`/profile/${selected.id}`);
                  }}
                >
                  View Profile
                </button>
                <button
                  className="flex-1 rounded-full border border-slate-800 bg-gradient-to-r from-sky-400 to-fuchsia-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
                  type="button"
                  onClick={() => closeDrawer()}
                >
                  Close
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
