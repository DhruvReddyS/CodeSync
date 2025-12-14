// src/pages/StudentPublicProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowLeftLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiCheckLine,
  RiTimeLine,
  RiSparkling2Line,
  RiTrophyLine,
  RiShieldCheckLine,
  RiBarChart2Line,
  RiPulseLine,
  RiMailLine,
  RiPhoneLine,
  RiBuilding2Line,
  RiGraduationCapLine,
  RiHashtag,
  RiStarSmileLine,
  RiLinksLine,
  RiCloseLine,
  RiArrowRightUpLine,
  RiUser3Line,
  RiVerifiedBadgeLine,
  RiFireLine,
  RiInformationLine,
  RiMedalLine,
  RiBookmarkLine,
} from "react-icons/ri";
import {
  SiLeetcode,
  SiCodechef,
  SiCodeforces,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";

/* ---------------- TYPES ---------------- */

type PlatformKey =
  | "leetcode"
  | "codechef"
  | "hackerrank"
  | "codeforces"
  | "github"
  | "atcoder";

type CpScores = {
  codeSyncScore?: number | null;
  displayScore?: number | null; // backend might send huge values sometimes
  platformSkills?: Partial<Record<PlatformKey, number>>;
};

type ApiProfile = {
  id: string;
  fullname: string | null;

  branch: string | null;
  section: string | null;
  year: string | number | null;
  rollNumber: string | null;
  graduationYear: string | null;

  collegeEmail?: string | null;
  personalEmail?: string | null;
  phone?: string | null;

  cpHandles: Partial<Record<PlatformKey, string | null>>;
  cpScores: CpScores | null;
  platformStats: Record<string, any | null>;
  profile: any;
};

type ApiPublicProfileResponse = {
  student: {
    id: string;
    fullName: string | null;
    branch: string | null;
    section: string | null;
    year: string | number | null;
    rollNumber: string | null;
    graduationYear: string | null;
    profile: any;
    cpHandles: Partial<Record<PlatformKey, string | null>>;
    collegeEmail?: string | null;
    personalEmail?: string | null;
    phone?: string | null;
  };
  cpScores: CpScores | null;
  platformStats: Record<string, any | null>;
};

const PLATFORM_META: Record<
  PlatformKey,
  {
    label: string;
    short: string;
    icon: React.ReactNode;
    colorClass: string;
    glow: string;
    baseUrl?: (h: string) => string;
  }
> = {
  leetcode: {
    label: "LeetCode",
    short: "LC",
    icon: <SiLeetcode />,
    colorClass: "text-amber-300",
    glow: "from-amber-500/28 via-amber-500/0 to-transparent",
    baseUrl: (h) => `https://leetcode.com/u/${h}/`,
  },
  codechef: {
    label: "CodeChef",
    short: "CC",
    icon: <SiCodechef />,
    colorClass: "text-orange-300",
    glow: "from-orange-500/28 via-orange-500/0 to-transparent",
    baseUrl: (h) => `https://www.codechef.com/users/${h}`,
  },
  hackerrank: {
    label: "HackerRank",
    short: "HR",
    icon: <SiHackerrank />,
    colorClass: "text-emerald-300",
    glow: "from-emerald-500/28 via-emerald-500/0 to-transparent",
    baseUrl: (h) => `https://www.hackerrank.com/profile/${h}`,
  },
  codeforces: {
    label: "Codeforces",
    short: "CF",
    icon: <SiCodeforces />,
    colorClass: "text-sky-300",
    glow: "from-sky-500/28 via-sky-500/0 to-transparent",
    baseUrl: (h) => `https://codeforces.com/profile/${h}`,
  },
  github: {
    label: "GitHub",
    short: "GH",
    icon: <SiGithub />,
    colorClass: "text-lime-300",
    glow: "from-lime-500/28 via-lime-500/0 to-transparent",
    baseUrl: (h) => `https://github.com/${h}`,
  },
  atcoder: {
    label: "AtCoder",
    short: "AC",
    icon: <RiLinksLine />,
    colorClass: "text-indigo-300",
    glow: "from-indigo-500/28 via-indigo-500/0 to-transparent",
    baseUrl: (h) => `https://atcoder.jp/users/${h}`,
  },
};

const PLATFORM_ORDER: PlatformKey[] = [
  "leetcode",
  "codechef",
  "hackerrank",
  "codeforces",
  "github",
  "atcoder",
];

/* ---------------- UTILS ---------------- */

function safeNum(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function formatValue(v: any): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isFinite(n)) return n.toLocaleString("en-IN");
  return String(v);
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function scoreTier(score: number) {
  if (score >= 85)
    return {
      label: "Elite",
      hint: "Top-tier consistency",
      cls: "text-emerald-300",
    };
  if (score >= 70)
    return { label: "Strong", hint: "High signal performer", cls: "text-sky-300" };
  if (score >= 50)
    return { label: "Rising", hint: "Solid momentum", cls: "text-amber-300" };
  if (score > 0)
    return { label: "Starter", hint: "Growing baseline", cls: "text-slate-200" };
  return { label: "—", hint: "No score yet", cls: "text-slate-500" };
}

function initialsFromName(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase?.()).join("") || "U";
}

function hashToHue(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 360;
}

/* ---------------- PREMIUM SCORE RING (SVG) ---------------- */

function ScoreRing({
  value,
  size = 168,
  displayText,
}: {
  value: number; // ring progress expects 0..100
  size?: number;
  displayText: string; // center text
}) {
  const pct = clamp01(value / 100);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const gap = c - dash;

  const digits = (displayText || "").replace(/[^\d]/g, "").length;
  const numClass =
    digits >= 9
      ? "text-lg"
      : digits >= 7
      ? "text-xl"
      : digits === 6
      ? "text-2xl"
      : digits === 5
      ? "text-[1.75rem]"
      : "text-3xl";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.95)" />
            <stop offset="55%" stopColor="rgba(236,72,153,0.85)" />
            <stop offset="100%" stopColor="rgba(74,222,128,0.85)" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(148,163,184,0.18)"
          strokeWidth={stroke}
          fill="transparent"
        />

        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${gap}` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          filter="url(#softGlow)"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <p className="text-[0.62rem] uppercase tracking-[0.34em] text-slate-500">
          CodeSync
        </p>
        <p className={`mt-1 font-bold text-slate-50 tabular-nums ${numClass} leading-none`}>
          {displayText}
        </p>
        <p className="mt-2 text-[0.72rem] text-slate-400">Unified score</p>
      </div>

      <div className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-sky-500/18 via-fuchsia-500/10 to-emerald-500/14 blur-xl" />
    </div>
  );
}

/* ---------------- MAIN PAGE ---------------- */

export default function StudentPublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"overview" | "platforms" | "portfolio">("overview");
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);

  const [activePlatform, setActivePlatform] = useState<PlatformKey | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await apiClient.get<ApiPublicProfileResponse>(`/student/profile/${id}`);
        const payload = res.data;

        const normalized: ApiProfile = {
          id: payload.student?.id || id,
          fullname: payload.student?.fullName ?? null,

          branch: payload.student?.branch ?? null,
          section: payload.student?.section ?? null,
          year: payload.student?.year ?? null,
          rollNumber: payload.student?.rollNumber ?? null,
          graduationYear: payload.student?.graduationYear ?? null,

          collegeEmail: payload.student?.collegeEmail ?? null,
          personalEmail: payload.student?.personalEmail ?? null,
          phone: payload.student?.phone ?? null,

          cpHandles: payload.student?.cpHandles ?? {},
          cpScores: payload.cpScores ?? null,
          platformStats: payload.platformStats ?? {},
          profile: payload.student?.profile ?? {},
        };

        setData(normalized);
      } catch (e: any) {
        console.error("[StudentPublicProfilePage] load error:", e);
        setErr(e?.response?.data?.message || e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const copyText = async (text: string, okMsg = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ msg: okMsg, ok: true });
    } catch {
      setToast({ msg: "Copy failed", ok: false });
    }
  };

  if (loading) return <LoadingShell onBack={() => navigate(-1)} />;
  if (!data || err)
    return <ErrorShell message={err || "Unknown error"} onBack={() => navigate(-1)} />;

  /* ---------------- DERIVED ---------------- */

  const fullname = data.fullname || "Student";
  const initials = initialsFromName(fullname);

  const rawScore = safeNum(data?.cpScores?.displayScore ?? data?.cpScores?.codeSyncScore ?? 0);
  const ringScore = Math.max(
    0,
    Math.min(100, safeNum(data?.cpScores?.displayScore ?? 0) || (rawScore > 100 ? 100 : rawScore))
  );
  const scoreText = formatValue(Math.round(rawScore));

  const tier = scoreTier(
    Math.max(
      0,
      Math.min(100, safeNum(data?.cpScores?.displayScore ?? (rawScore > 100 ? 100 : rawScore)))
    )
  );

  const profile = data.profile || {};
  const aboutText =
    profile?.about?.trim?.() || "No bio added yet. Stats and platform links are visible below.";

  const skills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
  const interests: string[] = Array.isArray(profile?.interests) ? profile.interests : [];

  const projects: any[] = Array.isArray(profile?.projects) ? profile.projects : [];
  const certifications: any[] = Array.isArray(profile?.certifications) ? profile.certifications : [];
  const internships: any[] = Array.isArray(profile?.internships) ? profile.internships : [];
  const links: any[] = Array.isArray(profile?.links) ? profile.links : [];

  const linkedPlatforms = PLATFORM_ORDER.filter(
    (p) => ((data.cpHandles?.[p] || "") as string).trim().length > 0
  );
  const linkedPlatformsCount = linkedPlatforms.length;

  const openHandle = (platform: PlatformKey) => {
    const h = ((data?.cpHandles?.[platform] || "") as string).trim();
    const toUrl = PLATFORM_META[platform].baseUrl;
    if (!h || !toUrl) return;
    window.open(toUrl(h), "_blank", "noopener,noreferrer");
  };

  const solvedByPlatform = (p: PlatformKey) => {
    const s = (data.platformStats || {})[p] || null;
    return s?.totalSolved ?? s?.problemsSolved ?? s?.problemsSolvedTotal ?? s?.solved ?? null;
  };

  const ratingByPlatform = (p: PlatformKey) => {
    const s = (data.platformStats || {})[p] || null;
    return s?.rating ?? s?.contestRating ?? s?.currentRating ?? s?.maxRating ?? null;
  };

  const contestsByPlatform = (p: PlatformKey) => {
    const s = (data.platformStats || {})[p] || null;
    return s?.contestsParticipated ?? s?.contests ?? s?.contestCount ?? null;
  };

  const totalSolved = PLATFORM_ORDER.reduce((acc, p) => acc + safeNum(solvedByPlatform(p)), 0);

  const completeness = clamp01(
    (skills.length / 10) * 0.35 +
      (linkedPlatformsCount / 6) * 0.35 +
      clamp01(ringScore / 100) * 0.3
  );
  const energy = clamp01(clamp01(ringScore / 100) * 0.7 + (linkedPlatformsCount / 6) * 0.3);

  const platformSkills = data?.cpScores?.platformSkills || {};
  const maxPlatformSkill = Math.max(
    1,
    ...PLATFORM_ORDER.map((k) => safeNum(platformSkills?.[k] ?? 0))
  );

  const avatarUrl =
    profile?.avatarUrl || profile?.photoUrl || profile?.imageUrl || profile?.avatar || null;

  const bannerUrl = profile?.bannerUrl || profile?.coverUrl || profile?.coverImage || null;

  const hue = hashToHue(data.id || fullname);

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 relative overflow-hidden">
      <BgPro hue={hue} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            className="fixed z-[80] bottom-6 left-1/2 -translate-x-1/2"
          >
            <div
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs shadow-[0_30px_90px_rgba(0,0,0,0.75)]
              ${
                toast.ok
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-rose-500/30 bg-rose-500/10"
              }`}
            >
              {toast.ok ? <RiCheckLine className="text-emerald-300" /> : <RiTimeLine className="text-rose-300" />}
              <span className="text-slate-200">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Modal */}
      <AnimatePresence>
        {activePlatform && (
          <PlatformModal
            platform={activePlatform}
            handle={((data.cpHandles?.[activePlatform] || "") as string).trim()}
            stats={(data.platformStats || {})[activePlatform] || null}
            onClose={() => setActivePlatform(null)}
            onCopy={(h) => copyText(h, `${PLATFORM_META[activePlatform].short} handle copied`)}
            onOpen={() => openHandle(activePlatform)}
          />
        )}
      </AnimatePresence>

      <main className="relative mx-auto max-w-6xl px-5 sm:px-7 lg:px-10 py-8">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#050712]/90 px-3 py-2 text-xs text-slate-200 hover:border-sky-400 transition"
          >
            <RiArrowLeftLine /> Back
          </button>
          <div />
        </div>

        {/* HERO */}
        <section className="mt-5 overflow-hidden rounded-[28px] border border-slate-800 bg-[#050712]/70 backdrop-blur-2xl shadow-[0_30px_120px_rgba(0,0,0,0.78)]">
          <div className="relative h-40 sm:h-44">
            {bannerUrl ? (
              <div className="absolute inset-0">
                <img
                  src={bannerUrl}
                  alt="cover"
                  className="h-full w-full object-cover opacity-70"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#02020a]/20 via-[#02020a]/55 to-[#02020a]/92" />
              </div>
            ) : (
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_30%,rgba(56,189,248,0.38),transparent_45%),radial-gradient(circle_at_75%_25%,rgba(236,72,153,0.28),transparent_48%),radial-gradient(circle_at_55%_90%,rgba(74,222,128,0.24),transparent_45%)]" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#02020a]/10 via-[#02020a]/50 to-[#02020a]/95" />
              </div>
            )}

            <div className="absolute inset-0 opacity-[0.10] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:110px_110px]" />
            <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_1px_1px,#94a3b8_1px,transparent_0)] bg-[size:18px_18px]" />

            <div className="absolute left-5 sm:left-7 top-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[0.7rem] text-slate-200 backdrop-blur-xl">
                <RiVerifiedBadgeLine className="text-sky-300" />
                Public Profile
              </span>
            </div>
          </div>

          <div className="px-5 sm:px-7 pb-6">
            <div className="-mt-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
              {/* LEFT: Identity */}
              <div className="flex items-end gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative"
                >
                  <div className="h-24 w-24 rounded-3xl border border-slate-700 bg-slate-950 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="h-16 w-16 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-2xl font-bold">
                          {initials}
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-sky-500/20 via-fuchsia-500/12 to-emerald-500/18 blur-lg" />
                </motion.div>

                <div className="min-w-0 pb-1">
                  <p className="text-xs uppercase tracking-[0.26em] text-slate-500 truncate">
                    {data.branch || "—"}
                    {data.section ? ` · Sec ${data.section}` : ""}
                    {data.year ? ` · Year ${data.year}` : ""}
                  </p>

                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{fullname}</h1>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-[0.75rem] text-slate-200">
                      <RiSparkling2Line className={tier.cls} />
                      <span className={tier.cls}>{tier.label}</span>
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                      <RiHashtag className="text-slate-500" />
                      Roll: <span className="text-slate-200">{data.rollNumber || "—"}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                      <RiGraduationCapLine className="text-slate-500" />
                      Grad: <span className="text-slate-200">{data.graduationYear || "—"}</span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                      <RiFireLine className="text-fuchsia-300" />
                      Energy: <span className="text-slate-200">{Math.round(energy * 100)}%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ RIGHT: ULTIMATE PREMIUM HERO METRICS PANEL */}
              <div className="w-full lg:w-[620px]">
                <HeroMetricsPanel
                  scoreRing={<ScoreRing value={ringScore} displayText={scoreText} size={190} />}
                  completeness={completeness}
                  competitive={clamp01(ringScore / 100)}
                  totalSolved={totalSolved}
                  linkedPlatformsCount={linkedPlatformsCount}
                  skillsCount={skills.length}
                />
              </div>
            </div>

            <div className="mt-6">
              <TabBar
                tab={tab}
                setTab={setTab}
                items={[
                  { key: "overview", label: "Overview" },
                  { key: "platforms", label: "Platforms" },
                  { key: "portfolio", label: "Portfolio" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* BODY GRID */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
          {/* LEFT */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <ProCard
              title="About"
              subtitle="Recruiter-style snapshot"
              icon={<RiUser3Line className="text-sky-300" />}
            >
              <p className="text-xs text-slate-300 leading-relaxed">{aboutText}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <QuickBtn
                  onClick={() => copyText(fullname, "Name copied")}
                  icon={<RiFileCopyLine className="text-slate-500" />}
                  label="Copy name"
                />
                <QuickBtn
                  onClick={() => setTab("portfolio")}
                  icon={<RiBookmarkLine className="text-slate-500" />}
                  label="View portfolio"
                />
              </div>
            </ProCard>

            <ProCard
              title="Contact"
              subtitle="Only if shared by student"
              icon={<RiMailLine className="text-emerald-300" />}
            >
              <div className="space-y-2 text-xs">
                <Line icon={<RiBuilding2Line className="text-slate-500" />} k="Branch" v={data.branch || "—"} />
                <Line icon={<RiHashtag className="text-slate-500" />} k="Section" v={data.section || "—"} />
                <Line
                  icon={<RiGraduationCapLine className="text-slate-500" />}
                  k="Year"
                  v={String(data.year ?? "—")}
                />
                <Line icon={<RiHashtag className="text-slate-500" />} k="Roll No" v={data.rollNumber || "—"} />

                {data.collegeEmail || data.personalEmail || data.phone ? (
                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                    {data.collegeEmail && (
                      <Line icon={<RiMailLine className="text-slate-500" />} k="College" v={data.collegeEmail} mono />
                    )}
                    {data.personalEmail && (
                      <Line icon={<RiMailLine className="text-slate-500" />} k="Personal" v={data.personalEmail} mono />
                    )}
                    {data.phone && <Line icon={<RiPhoneLine className="text-slate-500" />} k="Phone" v={data.phone} mono />}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[0.72rem] text-slate-500">No contact details shared publicly.</p>
                  </div>
                )}
              </div>
            </ProCard>

            <ProCard
              title="Skills & Interests"
              subtitle="From student portfolio"
              icon={<RiStarSmileLine className="text-fuchsia-300" />}
            >
              {skills.length ? (
                <>
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">Skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.slice(0, 16).map((s, i) => (
                      <Chip key={`${s}-${i}`} text={s} icon={<RiStarSmileLine />} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyNote text="No skills added." />
              )}

              {interests.length ? (
                <>
                  <p className="mt-4 text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">Interests</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {interests.slice(0, 16).map((s, i) => (
                      <Chip key={`${s}-${i}`} text={s} icon={<RiPulseLine />} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <EmptyNote text="No interests added." />
                </div>
              )}
            </ProCard>
          </aside>

          {/* RIGHT */}
          <section className="space-y-6">
            <AnimatePresence mode="wait">
              {/* OVERVIEW */}
              {tab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ProCard
                      title="Platform Contribution"
                      subtitle="What’s powering the score"
                      icon={<RiMedalLine className="text-amber-300" />}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {PLATFORM_ORDER.map((k) => {
                          const meta = PLATFORM_META[k];
                          const handle = ((data.cpHandles?.[k] || "") as string).trim();
                          const v = safeNum(platformSkills?.[k] ?? 0);
                          const active = !!handle || v > 0;
                          const pct = clamp01(v / maxPlatformSkill);

                          return (
                            <motion.button
                              key={k}
                              whileHover={active ? { y: -2 } : undefined}
                              onClick={() => (active ? setActivePlatform(k) : null)}
                              className={`text-left rounded-[22px] border overflow-hidden transition ${
                                active
                                  ? "border-slate-800 bg-slate-950/45 hover:border-sky-400/60"
                                  : "border-slate-900 bg-slate-950/20 opacity-70 cursor-not-allowed"
                              }`}
                            >
                              <div className={`h-8 bg-gradient-to-r ${meta.glow} ${active ? "opacity-80" : "opacity-35"}`} />
                              <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className={`${meta.colorClass} text-base shrink-0`}>{meta.icon}</span>
                                      <p className="text-sm font-semibold text-slate-100 truncate">
                                        {meta.label}
                                      </p>
                                    </div>
                                    <p className="mt-1 text-[0.72rem] text-slate-500 truncate">
                                      {handle ? `@${handle}` : "not linked"}
                                    </p>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <p className="text-[0.62rem] uppercase tracking-[0.22em] text-slate-500">
                                      Points
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-100 tabular-nums">
                                      {v ? v.toLocaleString("en-IN") : "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <div className="h-2 rounded-full bg-slate-950/70 border border-slate-800 overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.round(pct * 100)}%` }}
                                      transition={{ duration: 0.6, ease: "easeOut" }}
                                      className="h-full rounded-full bg-gradient-to-r from-sky-400/70 via-fuchsia-400/55 to-emerald-400/60"
                                    />
                                  </div>
                                  <p className="mt-2 text-[0.72rem] text-slate-500">Tap to view stats</p>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </ProCard>

                    <ProCard
                      title="Executive Snapshot"
                      subtitle="Fast signals (auto-derived)"
                      icon={<RiSparkling2Line className="text-sky-300" />}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Kpi
                          icon={<RiTrophyLine className="text-amber-300" />}
                          label="Tier"
                          value={tier.label}
                          hint={tier.hint}
                          accent={tier.cls}
                        />
                        <Kpi
                          icon={<RiShieldCheckLine className="text-emerald-300" />}
                          label="Profile strength"
                          value={skills.length >= 6 ? "Strong" : skills.length ? "Medium" : "—"}
                          hint="Skills + portfolio signals"
                        />
                        <Kpi
                          icon={<RiBarChart2Line className="text-sky-300" />}
                          label="Platforms linked"
                          value={`${linkedPlatformsCount}/6`}
                          hint="Handles connected"
                        />
                        <Kpi
                          icon={<RiPulseLine className="text-fuchsia-300" />}
                          label="Momentum"
                          value={`${Math.round(energy * 100)}%`}
                          hint="Score + linked platforms"
                        />
                      </div>

                      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">
                            Quick actions
                          </p>
                          <span className="text-[0.7rem] text-slate-500 inline-flex items-center gap-2">
                            <RiInformationLine /> safe external links
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {linkedPlatforms.slice(0, 4).map((p) => (
                            <button
                              key={p}
                              onClick={() => openHandle(p)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#050712] px-3 py-2 text-xs text-slate-200 hover:border-sky-400 transition"
                            >
                              <span className={PLATFORM_META[p].colorClass}>{PLATFORM_META[p].icon}</span>
                              Open {PLATFORM_META[p].short}
                              <RiArrowRightUpLine className="text-slate-500" />
                            </button>
                          ))}
                          {!linkedPlatforms.length && (
                            <span className="text-xs text-slate-500">No linked platforms yet.</span>
                          )}
                        </div>
                      </div>
                    </ProCard>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InsightCard
                      title="Solved volume"
                      value={formatValue(totalSolved)}
                      icon={<RiTrophyLine className="text-amber-300" />}
                      sub="Sum across platforms"
                    />
                    <InsightCard
                      title="Portfolio items"
                      value={formatValue(projects.length + internships.length + certifications.length)}
                      icon={<RiBookmarkLine className="text-sky-300" />}
                      sub="Projects + internships + certs"
                    />
                    <InsightCard
                      title="Shareable profile"
                      value="Ready"
                      icon={<RiInformationLine className="text-emerald-300" />}
                      sub="Open handles from Platforms tab"
                    />
                  </div>
                </motion.div>
              )}

              {/* PLATFORMS */}
              {tab === "platforms" && (
                <motion.div
                  key="platforms"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <ProCard
                    title="Platform Stats"
                    subtitle="Tap a platform to drill down"
                    icon={<RiBarChart2Line className="text-sky-300" />}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {PLATFORM_ORDER.map((p) => {
                        const meta = PLATFORM_META[p];
                        const handle = ((data.cpHandles?.[p] || "") as string).trim();
                        const linked = !!handle;

                        const solved = solvedByPlatform(p);
                        const rating = ratingByPlatform(p);
                        const contests = contestsByPlatform(p);

                        return (
                          <motion.button
                            key={p}
                            whileHover={linked ? { y: -3 } : undefined}
                            onClick={() => (linked ? setActivePlatform(p) : null)}
                            className={`text-left rounded-[24px] border bg-slate-950/40 overflow-hidden transition ${
                              linked ? "border-slate-800 hover:border-sky-400/60" : "border-slate-900 opacity-70 cursor-not-allowed"
                            }`}
                          >
                            <div className={`h-9 bg-gradient-to-r ${meta.glow} ${linked ? "opacity-85" : "opacity-35"}`} />
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`${meta.colorClass} text-lg shrink-0`}>{meta.icon}</span>
                                    <p className="text-sm font-semibold text-slate-100 truncate">
                                      {meta.label}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-[0.72rem] text-slate-500 truncate">
                                    {handle ? `@${handle}` : "not linked"}
                                  </p>
                                </div>

                                <span className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#050712] px-3 py-2 text-xs text-slate-200">
                                  View <RiArrowRightUpLine className="text-slate-500" />
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <MiniStatBox label="Solved" value={solved} />
                                <MiniStatBox label="Rating" value={rating} />
                                <MiniStatBox label="Contests" value={contests} />
                              </div>

                              {!linked && (
                                <p className="mt-3 text-[0.72rem] text-slate-500">Link handle to show stats.</p>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </ProCard>
                </motion.div>
              )}

              {/* PORTFOLIO */}
              {tab === "portfolio" && (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <ProCard
                    title="Portfolio"
                    subtitle="Clean, recruiter-readable blocks"
                    icon={<RiBookmarkLine className="text-emerald-300" />}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <GlassBlock title="About" icon={<RiShieldCheckLine className="text-emerald-300" />}>
                        <p className="text-xs text-slate-300 leading-relaxed">{aboutText}</p>
                      </GlassBlock>

                      <GlassBlock title="Highlights" icon={<RiMedalLine className="text-amber-300" />}>
                        <ul className="space-y-2 text-xs text-slate-300">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-500">Tier</span>
                            <span className={`font-semibold ${tier.cls}`}>{tier.label}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-500">Platforms linked</span>
                            <span className="font-semibold text-slate-100 tabular-nums">
                              {linkedPlatformsCount}/6
                            </span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-500">Solved (sum)</span>
                            <span className="font-semibold text-slate-100 tabular-nums">
                              {formatValue(totalSolved)}
                            </span>
                          </li>
                        </ul>
                      </GlassBlock>
                    </div>

                    <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <GlassBlock title="Projects" icon={<RiSparkling2Line className="text-sky-300" />}>
                        {projects.length ? (
                          <div className="space-y-3">
                            {projects.slice(0, 4).map((p: any, idx: number) => (
                              <PortfolioRow
                                key={idx}
                                title={p?.title || p?.name || "Untitled"}
                                subtitle={p?.description || p?.summary || "—"}
                                meta={p?.stack || p?.tech || p?.role || null}
                                link={p?.link || p?.url || null}
                                onCopy={(txt) => copyText(txt, "Copied")}
                              />
                            ))}
                          </div>
                        ) : (
                          <EmptyNote text="No projects added." />
                        )}
                      </GlassBlock>

                      <GlassBlock title="Experience & Certifications" icon={<RiTrophyLine className="text-fuchsia-300" />}>
                        {internships.length || certifications.length ? (
                          <div className="space-y-3">
                            {internships.slice(0, 2).map((x: any, idx: number) => (
                              <PortfolioRow
                                key={`intern-${idx}`}
                                title={x?.company || x?.title || "Internship"}
                                subtitle={x?.role || x?.description || "—"}
                                meta={x?.duration || x?.time || null}
                                link={x?.link || x?.url || null}
                                onCopy={(txt) => copyText(txt, "Copied")}
                              />
                            ))}
                            {certifications.slice(0, 2).map((c: any, idx: number) => (
                              <PortfolioRow
                                key={`cert-${idx}`}
                                title={c?.name || c?.title || "Certification"}
                                subtitle={c?.issuer || c?.provider || "—"}
                                meta={c?.year || c?.date || null}
                                link={c?.link || c?.url || null}
                                onCopy={(txt) => copyText(txt, "Copied")}
                              />
                            ))}
                          </div>
                        ) : (
                          <EmptyNote text="No internships/certifications added." />
                        )}
                      </GlassBlock>
                    </div>

                    <div className="mt-5">
                      <GlassBlock title="Links" icon={<RiLinksLine className="text-indigo-300" />}>
                        {links.length ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {links.slice(0, 6).map((l: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => (l?.url ? window.open(l.url, "_blank", "noopener,noreferrer") : null)}
                                className="text-left rounded-2xl border border-slate-800 bg-[#050712] px-4 py-3 hover:border-sky-400/60 transition"
                              >
                                <p className="text-xs font-semibold text-slate-200 truncate">
                                  {l?.label || l?.title || "Link"}
                                </p>
                                <p className="mt-1 text-[0.72rem] text-slate-500 truncate">{l?.url || "—"}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <EmptyNote text="No links added." />
                        )}
                      </GlassBlock>
                    </div>
                  </ProCard>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-[26px] border border-slate-800 bg-[#050712]/55 p-4">
              <p className="text-[0.7rem] uppercase tracking-[0.28em] text-slate-500">Public view</p>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Designed for fast leaderboard exploration — clean scanning, crisp stats, safe links, premium UI.
              </p>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

/* ---------------- LOADING / ERROR ---------------- */

function LoadingShell({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 relative overflow-hidden">
      <BgPro hue={210} />
      <main className="relative mx-auto max-w-6xl px-5 sm:px-7 lg:px-10 py-8">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#050712]/90 px-3 py-2 text-xs text-slate-200 hover:border-sky-400 transition"
          >
            <RiArrowLeftLine /> Back
          </button>
          <div className="h-8 w-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-800 bg-[#050712]/70 overflow-hidden">
          <div className="h-44 bg-slate-900/40 animate-pulse" />
          <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-44 rounded bg-slate-900/60 border border-slate-800 animate-pulse" />
                <div className="mt-3 h-8 w-72 rounded bg-slate-900/60 border border-slate-800 animate-pulse" />
                <div className="mt-3 h-4 w-56 rounded bg-slate-900/60 border border-slate-800 animate-pulse" />
              </div>
            </div>
            <div className="h-44 rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-[28px] bg-slate-900/30 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ErrorShell({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#02020a] text-slate-100 flex items-center justify-center px-4 relative overflow-hidden">
      <BgPro hue={345} />
      <div className="relative max-w-md w-full rounded-[28px] border border-slate-800 bg-[#050712]/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.8)]">
        <p className="text-sm font-semibold text-rose-300">Couldn’t open profile</p>
        <p className="mt-2 text-xs text-slate-400">{message}</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-200 hover:border-sky-400"
        >
          <RiArrowLeftLine /> Go back
        </button>
      </div>
    </div>
  );
}

/* ---------------- BACKGROUND (PRO) ---------------- */

function BgPro({ hue }: { hue: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute -top-40 left-[-60px] h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, hsla(${hue}, 90%, 60%, 0.26), transparent 60%)`,
        }}
      />
      <div
        className="absolute top-[35%] right-[-140px] h-96 w-96 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, hsla(${(hue + 120) % 360}, 90%, 60%, 0.18), transparent 60%)`,
        }}
      />
      <div
        className="absolute bottom-[-140px] left-[20%] h-80 w-80 rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle at center, hsla(${(hue + 240) % 360}, 90%, 60%, 0.16), transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:90px_90px]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,#94a3b8_1px,transparent_0)] bg-[size:18px_18px]" />
    </div>
  );
}

/* ---------------- HERO METRICS (ULTIMATE) ---------------- */

function HeroMetricsPanel({
  scoreRing,
  completeness,
  competitive,
  totalSolved,
  linkedPlatformsCount,
  skillsCount,
}: {
  scoreRing: React.ReactNode;
  completeness: number;
  competitive: number;
  totalSolved: number;
  linkedPlatformsCount: number;
  skillsCount: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#050712]/70 backdrop-blur-2xl shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.14),transparent_35%),radial-gradient(circle_at_70%_95%,rgba(74,222,128,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] bg-[radial-gradient(circle_at_1px_1px,#94a3b8_1px,transparent_0)] bg-[size:18px_18px]" />

      <div className="relative p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-[220px,1fr] gap-5 items-center">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-sky-500/15 via-fuchsia-500/10 to-emerald-500/12 blur-2xl" />
              <div className="relative">{scoreRing}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <SignalMeterPro label="Profile completeness" value={completeness} />
              <SignalMeterPro label="Competitive signal" value={competitive} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniPill
                icon={<RiTrophyLine className="text-amber-300" />}
                label="Solved"
                value={formatValue(totalSolved)}
              />
              <MiniPill
                icon={<RiBarChart2Line className="text-sky-300" />}
                label="Platforms"
                value={formatValue(linkedPlatformsCount)}
              />
              <MiniPill
                icon={<RiShieldCheckLine className="text-emerald-300" />}
                label="Skills"
                value={formatValue(skillsCount)}
              />
            </div>

            <div className="pt-1">
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalMeterPro({ label, value }: { label: string; value: number }) {
  const pct = Math.round(clamp01(value) * 100);

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">{label}</p>
        <p className="text-[0.75rem] font-semibold text-slate-300 tabular-nums">{pct}%</p>
      </div>

      <div className="mt-2 h-2.5 rounded-full bg-[#030414] border border-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-sky-400/90 via-fuchsia-400/70 to-emerald-400/80"
        />
      </div>
    </div>
  );
}

function MiniPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800/80 bg-slate-950/35 px-3 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-9 w-9 rounded-xl border border-slate-800 bg-[#050712] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-slate-500 truncate">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100 tabular-nums truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function ProCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-[#050712]/75 backdrop-blur-2xl shadow-[0_22px_90px_rgba(0,0,0,0.74)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-50">{title}</p>
          {subtitle && <p className="mt-1 text-[0.72rem] text-slate-500">{subtitle}</p>}
        </div>
        <div className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/50 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function TabBar<T extends string>({
  tab,
  setTab,
  items,
}: {
  tab: T;
  setTab: (t: T) => void;
  items: { key: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 p-2">
      {items.map((it) => {
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs transition ${
              active ? "text-slate-50" : "text-slate-300 hover:text-slate-50"
            }`}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-xl border border-slate-700 bg-[#050712]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function QuickBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-[#050712] px-3 py-2 text-xs text-slate-200 hover:border-sky-400 transition"
    >
      {icon}
      {label}
    </button>
  );
}

function Line({
  icon,
  k,
  v,
  mono,
}: {
  icon: React.ReactNode;
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-base">{icon}</span>
        <span className="text-slate-500">{k}</span>
      </div>
      <span className={`text-right text-slate-200 ${mono ? "font-mono text-[0.75rem]" : ""}`}>
        {v}
      </span>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-xs text-slate-200">
      <span className="text-slate-500">{icon}</span>
      {text}
    </span>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="rounded-3xl border border-slate-800 bg-slate-950/45 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className={`mt-2 text-lg font-semibold text-slate-50 ${accent || ""}`}>{value}</p>
          <p className="mt-1 text-[0.72rem] text-slate-500">{hint}</p>
        </div>
        <div className="h-10 w-10 rounded-2xl border border-slate-800 bg-[#050712] flex items-center justify-center">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function InsightCard({
  title,
  value,
  icon,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/35 p-5 overflow-hidden relative">
      <div className="absolute -top-14 -right-14 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.16),_transparent_60%)] blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-200">{title}</p>
          <div className="h-10 w-10 rounded-2xl border border-slate-800 bg-[#050712] flex items-center justify-center">
            {icon}
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-50 tabular-nums">{value}</p>
        <p className="mt-2 text-[0.75rem] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function MiniStatBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#050712] px-3 py-2 min-w-0 overflow-hidden">
      <p className="text-[0.60rem] uppercase tracking-[0.16em] text-slate-500 truncate">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100 tabular-nums truncate">{formatValue(value)}</p>
    </div>
  );
}

function GlassBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/30 p-4 overflow-hidden relative">
      <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.16),_transparent_60%)] blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-200">{title}</p>
          <div className="h-10 w-10 rounded-2xl border border-slate-800 bg-[#050712] flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function PortfolioRow({
  title,
  subtitle,
  meta,
  link,
  onCopy,
}: {
  title: string;
  subtitle: string;
  meta?: string | null;
  link?: string | null;
  onCopy: (txt: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#050712] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{title}</p>
          <p className="mt-1 text-[0.72rem] text-slate-500 line-clamp-2">{subtitle}</p>
          {meta ? <p className="mt-2 text-[0.72rem] text-slate-400 truncate">{meta}</p> : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {link ? (
            <>
              <button
                onClick={() => onCopy(link)}
                className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center hover:border-sky-400/60 transition"
                title="Copy link"
              >
                <RiFileCopyLine className="text-slate-400" />
              </button>
              <button
                onClick={() => window.open(link, "_blank", "noopener,noreferrer")}
                className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-center hover:border-sky-400/60 transition"
                title="Open"
              >
                <RiExternalLinkLine className="text-slate-400" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- PLATFORM MODAL ---------------- */

function PlatformModal({
  platform,
  handle,
  stats,
  onClose,
  onCopy,
  onOpen,
}: {
  platform: PlatformKey;
  handle: string;
  stats: any | null;
  onClose: () => void;
  onCopy: (handle: string) => void;
  onOpen: () => void;
}) {
  const meta = PLATFORM_META[platform];

  const solved =
    stats?.totalSolved ?? stats?.problemsSolved ?? stats?.problemsSolvedTotal ?? stats?.solved ?? null;

  const rating =
    stats?.rating ?? stats?.contestRating ?? stats?.currentRating ?? stats?.maxRating ?? null;

  const contests =
    stats?.contestsParticipated ?? stats?.contests ?? stats?.contestCount ?? null;

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full max-w-lg rounded-[28px] border border-slate-800 bg-[#050712]/92 shadow-[0_40px_140px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        <div className={`h-14 bg-gradient-to-r ${meta.glow} opacity-90`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`${meta.colorClass} text-xl shrink-0`}>{meta.icon}</span>
                <p className="text-lg font-semibold text-slate-50 truncate">{meta.label}</p>
              </div>
              <p className="mt-1 text-xs text-slate-400 truncate">{handle ? `@${handle}` : "not linked"}</p>
            </div>

            <button
              onClick={onClose}
              className="h-10 w-10 rounded-2xl border border-slate-800 bg-slate-950/40 flex items-center justify-center hover:border-sky-400/60 transition"
            >
              <RiCloseLine className="text-slate-400" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStatBox label="Solved" value={solved} />
            <MiniStatBox label="Rating" value={rating} />
            <MiniStatBox label="Contests" value={contests} />
          </div>

          <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/35 p-4">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-slate-500">Actions</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onCopy(handle)}
                disabled={!handle}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                  handle
                    ? "border-slate-800 bg-[#050712] text-slate-200 hover:border-sky-400"
                    : "border-slate-900 bg-slate-950/20 text-slate-600 cursor-not-allowed"
                }`}
              >
                <RiFileCopyLine className="text-slate-500" />
                Copy handle
              </button>
              <button
                onClick={onOpen}
                disabled={!handle}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                  handle
                    ? "border-slate-800 bg-[#050712] text-slate-200 hover:border-sky-400"
                    : "border-slate-900 bg-slate-950/20 text-slate-600 cursor-not-allowed"
                }`}
              >
                <RiExternalLinkLine className="text-slate-500" />
                Open profile
              </button>
            </div>
          </div>

          {!stats && (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-xs text-slate-500">No scraped stats found yet. Refresh may be pending.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
