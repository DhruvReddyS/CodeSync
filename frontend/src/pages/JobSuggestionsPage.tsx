// src/pages/JobSuggestionsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../lib/apiClient";
import {
  RiSparkling2Line,
  RiMapPin2Line,
  RiMagicLine,
  RiFilter3Line,
  RiBookmarkLine,
  RiBookmarkFill,
  RiFileCopy2Line,
  RiRefreshLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiSearch2Line,
  RiSwapLine,
  RiCloseLine,
} from "react-icons/ri";

type JobSuggestion = {
  title: string;
  level: string;
  summary: string;
  idealCompanies: string[];
  keySkills: string[];
};

type TabKey = "all" | "saved";

const LS_PROFILE_KEY = "codesync_job_suggest_profile_v2";
const LS_FAV_KEY = "codesync_job_suggest_favs_v2";

const PRESETS = [
  {
    label: "Frontend (React)",
    interests:
      "Frontend developer, React/TypeScript, UI engineering, performance, design systems, product-focused teams",
  },
  {
    label: "Backend (Node)",
    interests:
      "Backend developer, Node/Express, REST APIs, databases, auth, caching, scalability",
  },
  {
    label: "Full-Stack (MERN)",
    interests:
      "Full-stack developer, MERN, building end-to-end products, startup environment, shipping fast",
  },
  {
    label: "ML / AI",
    interests:
      "ML engineer, applied AI, LLM apps, Python, evaluation, data pipelines, MLOps basics",
  },
  {
    label: "DevOps / Cloud",
    interests:
      "DevOps engineer, cloud, CI/CD, Docker, monitoring, reliability, deployment",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeSkill(s: string) {
  return s.trim().toLowerCase();
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a.map(normalizeSkill));
  const B = new Set(b.map(normalizeSkill));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = new Set<string>([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* -----------------------------
 * Timeline Simulator (frontend)
 * ----------------------------- */
function buildTimeline(job: JobSuggestion) {
  const skills = job.keySkills ?? [];
  const n = skills.length;

  const level = (job.level || "").toLowerCase();
  const levelFactor =
    level.includes("senior") || level.includes("lead")
      ? 1.3
      : level.includes("mid")
      ? 1.15
      : 1.0;

  const intensity = Math.max(1, Math.min(4, Math.round((n / 6) * levelFactor)));
  const focusSkills = skills.slice(
    0,
    Math.min(6, Math.max(3, Math.floor(n / 2)))
  );

  const mk = (months: number) => {
    const base = [
      `Lock ${Math.min(3, focusSkills.length)} core skills: ${focusSkills
        .slice(0, Math.min(3, focusSkills.length))
        .join(", ")}`,
      `Build 1 project that proves "${job.title}" work (end-to-end, deployed)`,
      `Rewrite resume bullets with metrics + impact (2–3 strong bullets)`,
    ];

    const extra =
      months >= 12
        ? [
            `Add 1 advanced project + testing + docs (show engineering maturity)`,
            `Mock interviews: 2/week + fix weak areas (DSA / system design / projects)`,
          ]
        : months >= 6
        ? [`Add 1 mini-project focused on a missing area (auth/caching/CI/etc.)`]
        : [`Daily practice: 30–45 mins + weekly review`];

    const ramp =
      intensity >= 3
        ? [`Do a weekly showcase: demo + GitHub README + short video`]
        : [`Maintain a weekly progress log (1 page)`];

    return [...base, ...extra, ...ramp];
  };

  return {
    intensity,
    focusSkills,
    m6: mk(6),
    m12: mk(12),
    m24: [
      `Specialize: pick 1 niche inside ${job.title} (performance, security, infra, ML, etc.)`,
      `Ship 2 flagship projects + consistent open-source/club work`,
      `Apply to stronger companies using targeted portfolio + referrals`,
      `Negotiate: track offers, prep behavioral, highlight outcomes`,
    ],
  };
}

/* -----------------------------
 * Skill parsing (frontend-only)
 * ----------------------------- */
function tokenizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildUserSkillSet(userText: string) {
  const tokens = new Set(tokenizeText(userText));
  return tokens;
}

function normalizeSkillForMatch(skill: string) {
  const s = normalizeSkill(skill);
  if (s === "node" || s === "nodejs") return "node.js";
  if (s === "js") return "javascript";
  if (s === "ts") return "typescript";
  if (s === "postgres") return "postgresql";
  if (s === "reactjs") return "react";
  return s;
}

type SkillStatus = "have" | "maybe" | "missing";

/* -----------------------------
 * Galaxy math (SVG only)
 * ----------------------------- */
function hashToFloat(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

type GalaxyNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  tier: 0 | 1 | 2;
};

type GalaxyEdge = {
  id: string;
  a: string;
  b: string;
  w: number;
};

function buildGalaxy(skills: string[], w: number, h: number) {
  const cx0 = w / 2;
  const cy0 = h / 2;

  const list = (skills ?? []).filter(Boolean).slice(0, 16);
  const N = list.length;

  const r0 = Math.min(w, h) * 0.16;
  const r1 = Math.min(w, h) * 0.26;
  const r2 = Math.min(w, h) * 0.38;

  const tierForIndex = (i: number): 0 | 1 | 2 => {
    if (i < Math.ceil(N * 0.34)) return 0;
    if (i < Math.ceil(N * 0.72)) return 1;
    return 2;
  };

  const nodes: GalaxyNode[] = list.map((s, i) => {
    const tier = tierForIndex(i);
    const baseR = tier === 0 ? r0 : tier === 1 ? r1 : r2;

    const a = hashToFloat(s + "|a") * Math.PI * 2;
    const jitter = (hashToFloat(s + "|j") - 0.5) * (tier === 0 ? 10 : 16);

    const rr = baseR + jitter;
    const x = cx0 + Math.cos(a) * rr;
    const y = cy0 + Math.sin(a) * rr;

    const size = tier === 0 ? 10 : tier === 1 ? 8 : 7;
    const varSize = (hashToFloat(s + "|z") - 0.5) * 2;
    const r = clamp(size + varSize, 6, 12);

    return { id: `${s}-${i}`, label: s, x, y, r, tier };
  });

  const edges: GalaxyEdge[] = [];
  const dist = (a: GalaxyNode, b: GalaxyNode) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  for (const n of nodes) {
    const candidates = nodes
      .filter((m) => m.id !== n.id)
      .map((m) => ({ m, d: dist(n, m) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, n.tier === 0 ? 3 : 2);

    for (const c of candidates) {
      const aId = n.id < c.m.id ? n.id : c.m.id;
      const bId = n.id < c.m.id ? c.m.id : n.id;
      const id = `${aId}__${bId}`;
      if (edges.some((e) => e.id === id)) continue;

      const wgt = clamp(1.6 - c.d / 180, 0.55, 1.35);
      edges.push({ id, a: aId, b: bId, w: wgt });
    }
  }

  return { nodes, edges, cx0, cy0, rings: [r0, r1, r2] };
}

/* -----------------------------
 * Learning path (frontend-only)
 * ----------------------------- */
function buildLearningPath(skill: string, tier: number) {
  const s = normalizeSkill(skill);

  const basics = [
    "Learn core concepts + terminology",
    "Do 5–10 small exercises",
    "Build 1 mini feature using it",
  ];

  const intermediate = [
    "Integrate it into a real project",
    "Add testing + error handling",
    "Measure performance / reliability",
  ];

  const advanced = [
    "Learn best practices + pitfalls",
    "Read 2 high-quality docs/articles",
    "Create a portfolio demo + README",
  ];

  const tierHint =
    tier === 0
      ? "Core skill (mandatory for role)"
      : tier === 1
      ? "Supporting skill (makes you hire-ready)"
      : "Specialization skill (helps you stand out)";

  const extra =
    s.includes("auth") || s.includes("jwt")
      ? ["Implement login + refresh tokens", "Add RBAC roles + middleware"]
      : s.includes("redis") || s.includes("cache")
      ? ["Add caching layer + TTL", "Handle cache invalidation strategies"]
      : s.includes("docker")
      ? ["Containerize app + env configs", "Write a production-ready Dockerfile"]
      : s.includes("sql")
      ? ["Design tables + indexes", "Write joins + optimize slow queries"]
      : [];

  const base =
    tier === 0
      ? basics
      : tier === 1
      ? [...basics, ...intermediate]
      : [...basics, ...intermediate, ...advanced];

  return {
    tierHint,
    steps: [...base.slice(0, 6), ...extra].slice(0, 7),
  };
}

/* =========================================================
 * Page
 * ========================================================= */
const JobSuggestionsPage: React.FC = () => {
  const [currentProfile, setCurrentProfile] = useState("");
  const [interests, setInterests] = useState("");
  const [locationPref, setLocationPref] = useState("");

  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobSuggestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "best_overlap" | "skills_desc" | "skills_asc" | "saved_first"
  >("saved_first");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyWithCompanies, setOnlyWithCompanies] = useState(false);

  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);

  const didHydrate = useRef(false);

  const canSubmit = useMemo(() => {
    const a = currentProfile.trim().length;
    const b = interests.trim().length;
    return a + b >= 20;
  }, [currentProfile, interests]);

  const userText = useMemo(
    () => `${currentProfile}\n${interests}`,
    [currentProfile, interests]
  );
  const userSkillTokens = useMemo(() => buildUserSkillSet(userText), [userText]);

  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;

    try {
      const raw = localStorage.getItem(LS_PROFILE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCurrentProfile(parsed.currentProfile ?? "");
        setInterests(parsed.interests ?? "");
        setLocationPref(parsed.locationPref ?? "");
      }
    } catch {}

    try {
      const rawFav = localStorage.getItem(LS_FAV_KEY);
      if (rawFav) setFavs(JSON.parse(rawFav));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_PROFILE_KEY,
        JSON.stringify({ currentProfile, interests, locationPref })
      );
    } catch {}
  }, [currentProfile, interests, locationPref]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_FAV_KEY, JSON.stringify(favs));
    } catch {}
  }, [favs]);

  const handlePreset = (presetInterests: string) => setInterests(presetInterests);

  const handleSuggest = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    setJobs([]);
    setExpandedIdx(0);
    setCompareOpen(false);
    setCompareA(null);
    setCompareB(null);

    try {
      const res = await apiClient.post("/career/job-suggestions", {
        currentProfile,
        interests,
        locationPref,
      });

      const nextJobs: JobSuggestion[] = res.data.jobs ?? [];
      setJobs(nextJobs);
      setExpandedIdx(nextJobs.length ? 0 : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = (job: JobSuggestion) => {
    const key = `${job.title}__${job.level}`;
    setFavs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 900);
  };

  // LANDING PAGE THEME (synced)
  const pageBg = "bg-[#050509] text-slate-100 font-display overflow-x-hidden";

  const enrichedJobs = useMemo(() => {
    const base = [...jobs];

    const filtered = base.filter((j) => {
      const s = search.trim().toLowerCase();
      const favKey = `${j.title}__${j.level}`;
      const isFav = !!favs[favKey];

      if (tab === "saved" && !isFav) return false;
      if (onlyWithCompanies && (!j.idealCompanies || j.idealCompanies.length === 0))
        return false;
      if (!s) return true;

      const hay = [
        j.title,
        j.level,
        j.summary,
        ...(j.keySkills ?? []),
        ...(j.idealCompanies ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });

    const sorted = filtered.sort((a, b) => {
      const aKey = `${a.title}__${a.level}`;
      const bKey = `${b.title}__${b.level}`;
      const aFav = favs[aKey] ? 1 : 0;
      const bFav = favs[bKey] ? 1 : 0;

      if (sortBy === "saved_first" && aFav !== bFav) return bFav - aFav;

      const aSkills = (a.keySkills ?? []).length;
      const bSkills = (b.keySkills ?? []).length;

      if (sortBy === "skills_desc") return bSkills - aSkills;
      if (sortBy === "skills_asc") return aSkills - bSkills;

      const anchor = expandedIdx != null ? jobs[expandedIdx] : null;
      if (sortBy === "best_overlap" && anchor) {
        const oa = jaccard(anchor.keySkills ?? [], a.keySkills ?? []);
        const ob = jaccard(anchor.keySkills ?? [], b.keySkills ?? []);
        return ob - oa;
      }

      return a.title.localeCompare(b.title);
    });

    return sorted;
  }, [jobs, search, tab, onlyWithCompanies, favs, sortBy, expandedIdx]);

  const overlapPairs = useMemo(() => {
    if (!jobs.length) return [];
    const pairs: Array<{ a: number; b: number; score: number }> = [];
    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        const score = jaccard(jobs[i].keySkills ?? [], jobs[j].keySkills ?? []);
        if (score > 0) pairs.push({ a: i, b: j, score });
      }
    }
    pairs.sort((x, y) => y.score - x.score);
    return pairs.slice(0, 6);
  }, [jobs]);

  const compareData = useMemo(() => {
    if (compareA == null || compareB == null) return null;
    const A = jobs[compareA];
    const B = jobs[compareB];
    if (!A || !B) return null;

    const aSkills = (A.keySkills ?? []).map(normalizeSkill);
    const bSkills = (B.keySkills ?? []).map(normalizeSkill);
    const setA = new Set(aSkills);
    const setB = new Set(bSkills);

    const shared = [...setA].filter((s) => setB.has(s));
    const onlyA = [...setA].filter((s) => !setB.has(s));
    const onlyB = [...setB].filter((s) => !setA.has(s));
    const overlap = jaccard(A.keySkills ?? [], B.keySkills ?? []);

    return { A, B, shared, onlyA, onlyB, overlap };
  }, [compareA, compareB, jobs]);

  return (
    <div className={cx("min-h-screen w-full", pageBg)}>
      <style>{`
        @keyframes galaxySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ✅ reduced left-right padding + better max width */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 xl:px-10 pt-10 sm:pt-12 pb-12 sm:pb-14">
        {/* Hero */}
        <div className="rounded-3xl border border-slate-800 bg-black/90 p-4 sm:p-5 shadow-[0_0_30px_rgba(15,23,42,0.8)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-4 py-1 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <RiSparkling2Line />
                Career Suite · Job Suggestions
              </div>

              <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
                Role suggestions +{" "}
                <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                  Skill Galaxy
                </span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
                Compare roles, see overlap, simulate timelines — and visualize required skills
                in a galaxy that highlights your skill gaps.
              </p>

              <div className="mt-3 h-[1px] w-24 bg-gradient-to-r from-sky-400 to-fuchsia-400 rounded-full" />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:bg-slate-900/70 transition"
              >
                <RiFilter3Line />
                Filters
                {filtersOpen ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
              </button>

              <button
                onClick={() => {
                  setCompareOpen((v) => !v);
                  setCompareA(null);
                  setCompareB(null);
                }}
                disabled={!jobs.length}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:bg-slate-900/70 transition disabled:opacity-50"
              >
                <RiSwapLine />
                Compare
              </button>

              <button
                onClick={() => {
                  setCurrentProfile("");
                  setInterests("");
                  setLocationPref("");
                  setJobs([]);
                  setExpandedIdx(null);
                  setSearch("");
                  setTab("all");
                  setCompareOpen(false);
                  setCompareA(null);
                  setCompareB(null);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2 text-sm text-slate-100 hover:bg-slate-900/70 transition"
              >
                <RiRefreshLine />
                Reset
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="mt-5 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.interests)}
                className="rounded-full border border-slate-800 bg-[#111318] px-4 py-2 text-sm shadow-[0_0_10px_rgba(15,23,42,0.7)] hover:border-sky-500/60 hover:bg-slate-900/60 transition"
              >
                <span className="font-medium text-slate-200">{p.label}</span>
              </button>
            ))}
          </div>

          {filtersOpen && (
            <div className="mt-5 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-[#05060b] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full border border-slate-800 bg-black/70 p-1">
                  <button
                    onClick={() => setTab("all")}
                    className={cx(
                      "rounded-full px-4 py-1.5 text-xs transition",
                      tab === "all"
                        ? "bg-sky-500 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.45)]"
                        : "text-slate-200 hover:bg-slate-900/50"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTab("saved")}
                    className={cx(
                      "rounded-full px-4 py-1.5 text-xs transition",
                      tab === "saved"
                        ? "bg-sky-500 text-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.45)]"
                        : "text-slate-200 hover:bg-slate-900/50"
                    )}
                  >
                    Saved
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyWithCompanies}
                    onChange={(e) => setOnlyWithCompanies(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900"
                  />
                  Only roles with companies
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-4 py-2 w-full sm:w-auto">
                  <RiSearch2Line className="text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search role / skill / company..."
                    className="w-full sm:w-72 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full sm:w-auto rounded-full border border-slate-800 bg-black/80 px-4 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/30"
                >
                  <option value="saved_first">Sort: Saved first</option>
                  <option value="skills_desc">Sort: Most skills</option>
                  <option value="skills_asc">Sort: Least skills</option>
                  <option value="best_overlap">Sort: Best overlap (with open role)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Compare Modal */}
        {compareOpen && (
          <div className="mt-5 rounded-3xl border border-slate-800 bg-black/90 p-4 sm:p-5 shadow-[0_0_25px_rgba(15,23,42,0.7)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Compare two roles (overlap + differences)
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Pick any 2 roles. Shared skills glow.
                </p>
              </div>
              <button
                onClick={() => setCompareOpen(false)}
                className="rounded-full border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-900/70 transition"
              >
                <RiCloseLine />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                value={compareA ?? ""}
                onChange={(e) =>
                  setCompareA(e.target.value === "" ? null : Number(e.target.value))
                }
                className="rounded-2xl border border-slate-800 bg-[#05060b] px-3 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="">Select Role A</option>
                {jobs.map((j, idx) => (
                  <option key={idx} value={idx}>
                    {j.title} • {j.level}
                  </option>
                ))}
              </select>

              <select
                value={compareB ?? ""}
                onChange={(e) =>
                  setCompareB(e.target.value === "" ? null : Number(e.target.value))
                }
                className="rounded-2xl border border-slate-800 bg-[#05060b] px-3 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="">Select Role B</option>
                {jobs.map((j, idx) => (
                  <option key={idx} value={idx}>
                    {j.title} • {j.level}
                  </option>
                ))}
              </select>
            </div>

            {compareData && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-[#05060b] p-4">
                  <p className="text-sm font-semibold text-slate-100">
                    {compareData.A.title} • {compareData.A.level}
                  </p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black/70">
                    <SkillGalaxy
                      id="compareA"
                      roleTitle={compareData.A.title}
                      skills={compareData.A.keySkills ?? []}
                      userSkillTokens={userSkillTokens}
                      sharedSkills={new Set(compareData.shared)}
                      height={210}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#05060b] p-4">
                  <p className="text-sm font-semibold text-slate-100">
                    {compareData.B.title} • {compareData.B.level}
                  </p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-black/70">
                    <SkillGalaxy
                      id="compareB"
                      roleTitle={compareData.B.title}
                      skills={compareData.B.keySkills ?? []}
                      userSkillTokens={userSkillTokens}
                      sharedSkills={new Set(compareData.shared)}
                      height={210}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#05060b] p-4 lg:col-span-2">
                  <p className="text-sm font-semibold text-slate-100">
                    Overlap:{" "}
                    <span className="text-sky-300">
                      {Math.round(compareData.overlap * 100)}%
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ Main grid: tighter gap + better columns */}
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr,1.35fr]">
          {/* Left - Inputs */}
          <div className="space-y-4 rounded-3xl border border-slate-800 bg-black/90 p-4 sm:p-5 shadow-[0_0_25px_rgba(15,23,42,0.6)]">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Current profile
                </label>
                <span className="text-[11px] text-slate-500">
                  {currentProfile.trim().length}/800
                </span>
              </div>
              <textarea
                className="mt-1 h-32 w-full resize-none rounded-2xl border border-slate-800 bg-[#05060b] px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/30"
                placeholder="e.g. 3rd year CSIT, DSA + MERN/Flask projects, CP, internships..."
                value={currentProfile}
                maxLength={800}
                onChange={(e) => setCurrentProfile(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Interests & dream roles
                </label>
                <span className="text-[11px] text-slate-500">
                  {interests.trim().length}/800
                </span>
              </div>
              <textarea
                className="mt-1 h-28 w-full resize-none rounded-2xl border border-slate-800 bg-[#05060b] px-3 py-2 text-sm text-slate-100 outline-none focus:ring focus:ring-sky-500/30"
                placeholder="Backend dev, ML, fintech, startups, product teams..."
                value={interests}
                maxLength={800}
                onChange={(e) => setInterests(e.target.value)}
              />
              {!canSubmit && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Add a bit more detail (min ~20 chars combined) so the AI gets sharper.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Location preference (optional)
              </label>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-800 bg-[#05060b] px-3 py-2">
                <RiMapPin2Line className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Hyderabad, Bangalore, remote"
                  value={locationPref}
                  onChange={(e) => setLocationPref(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleSuggest}
              disabled={!canSubmit || loading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-7 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.6)] hover:bg-sky-400 active:scale-95 transition disabled:opacity-50"
            >
              <RiMagicLine />
              {loading ? "Thinking about your path…" : "Get AI Suggestions"}
            </button>

            {/* Overlap Analyzer */}
            {jobs.length > 1 && (
              <div className="mt-2 rounded-3xl border border-slate-800 bg-[#05060b] p-4">
                <p className="text-xs font-semibold text-slate-200">
                  Role overlap analyzer (top pairs)
                </p>
                <div className="mt-3 space-y-2">
                  {overlapPairs.map((p, i) => {
                    const A = jobs[p.a];
                    const B = jobs[p.b];
                    const pct = Math.round(p.score * 100);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setExpandedIdx(p.a);
                          setCompareOpen(true);
                          setCompareA(p.a);
                          setCompareB(p.b);
                        }}
                        className="w-full rounded-2xl border border-slate-800 bg-black/70 p-3 text-left hover:bg-slate-900/50 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-slate-100">
                            {A.title} <span className="text-slate-500">vs</span>{" "}
                            {B.title}
                          </p>
                          <span className="rounded-full border border-slate-800 bg-black/70 px-2 py-1 text-[11px] text-sky-300">
                            {pct}% overlap
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Click to open compare mode
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right - Suggestions */}
          <div className="rounded-3xl border border-slate-800 bg-black/90 p-4 sm:p-5 shadow-[0_0_25px_rgba(15,23,42,0.6)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">
                Recommended roles & directions
              </p>
              <p className="text-[11px] text-slate-500">
                {enrichedJobs.length ? `${enrichedJobs.length} roles` : ""}
              </p>
            </div>

            {loading && (
              <div className="mt-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-800 bg-[#05060b] p-4"
                  >
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
                    <div className="mt-3 h-3 w-[90%] animate-pulse rounded bg-slate-800" />
                    <div className="mt-2 h-3 w-[75%] animate-pulse rounded bg-slate-800" />
                    <div className="mt-3 flex gap-2">
                      {[0, 1, 2, 3].map((k) => (
                        <div key={k} className="h-6 w-16 animate-pulse rounded-full bg-slate-800" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && enrichedJobs.length === 0 && (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-800 bg-[#05060b] p-6">
                <p className="text-sm font-semibold text-slate-100">Nothing here yet.</p>
                <p className="mt-2 text-sm text-slate-400">
                  Add your profile + interests and run suggestions.
                </p>
              </div>
            )}

            {!loading && enrichedJobs.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {enrichedJobs.map((job) => {
                  const idx = jobs.findIndex(
                    (j) => j.title === job.title && j.level === job.level
                  );
                  const expanded = expandedIdx === idx;

                  const favKey = `${job.title}__${job.level}`;
                  const isFav = !!favs[favKey];

                  const timeline = buildTimeline(job);

                  const skillText = (job.keySkills ?? []).join(", ");
                  const companyText =
                    job.idealCompanies?.length > 0
                      ? job.idealCompanies.join(", ")
                      : "—";

                  const copyBlock = [
                    `Role: ${job.title} (${job.level})`,
                    `Summary: ${job.summary}`,
                    `Key skills: ${skillText || "—"}`,
                    `Ideal companies: ${companyText}`,
                    ``,
                    `Timeline (frontend simulated):`,
                    `6 months:`,
                    ...timeline.m6.map((x) => `- ${x}`),
                    `12 months:`,
                    ...timeline.m12.map((x) => `- ${x}`),
                    `24 months:`,
                    ...timeline.m24.map((x) => `- ${x}`),
                  ].join("\n");

                  return (
                    <JobCard
                      key={favKey}
                      job={job}
                      idx={idx}
                      expanded={expanded}
                      favKey={favKey}
                      isFav={isFav}
                      copiedKey={copiedKey}
                      onToggleFav={() => toggleFav(job)}
                      onCopy={() => handleCopy(favKey, copyBlock)}
                      onToggleExpand={() =>
                        setExpandedIdx((p) => (p === idx ? null : idx))
                      }
                      timeline={timeline}
                      userSkillTokens={userSkillTokens}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {Object.values(favs).some(Boolean) && (
          <div className="mt-5 rounded-3xl border border-slate-800 bg-black/90 p-4 text-sm text-slate-300">
            <span className="font-semibold text-slate-100">Saved:</span>{" "}
            {Object.entries(favs)
              .filter(([, v]) => v)
              .slice(0, 6)
              .map(([k]) => k.replace("__", " • "))
              .join("  |  ")}
            {Object.entries(favs).filter(([, v]) => v).length > 6 ? "  |  …" : ""}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobSuggestionsPage;

/* =========================================================
 * Components (same file)
 * ========================================================= */

function JobCard({
  job,
  idx,
  expanded,
  favKey,
  isFav,
  copiedKey,
  onToggleFav,
  onCopy,
  onToggleExpand,
  timeline,
  userSkillTokens,
}: {
  job: JobSuggestion;
  idx: number;
  expanded: boolean;
  favKey: string;
  isFav: boolean;
  copiedKey: string | null;
  onToggleFav: () => void;
  onCopy: () => void;
  onToggleExpand: () => void;
  timeline: ReturnType<typeof buildTimeline>;
  userSkillTokens: Set<string>;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border p-4 transition",
        expanded
          ? "border-sky-500/40 bg-[#05060b] shadow-[0_0_20px_rgba(56,189,248,0.18)]"
          : "border-slate-800 bg-[#05060b] hover:border-slate-700"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button onClick={onToggleExpand} className="text-left">
          <p className="text-base font-semibold text-slate-50">{job.title}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {job.level}
          </p>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFav}
            className="rounded-full border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-900/70 transition"
            title="Save"
          >
            {isFav ? (
              <RiBookmarkFill className="text-sky-300" />
            ) : (
              <RiBookmarkLine />
            )}
          </button>

          <button
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/70 transition"
            title="Copy"
          >
            {copiedKey === favKey ? (
              <>
                <RiCheckLine className="text-emerald-300" />
                Copied
              </>
            ) : (
              <>
                <RiFileCopy2Line />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{job.summary}</p>

      {job.keySkills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {job.keySkills.slice(0, expanded ? 18 : 10).map((s) => (
            <span
              key={s}
              className="rounded-full border border-slate-800 bg-black/70 px-3 py-1.5 text-[11px] text-slate-200"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {job.idealCompanies?.length > 0 && (
        <p className="mt-3 text-[12px] text-slate-400">
          Good fit companies:{" "}
          <span className="text-slate-200">{job.idealCompanies.join(", ")}</span>
        </p>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Skill Galaxy */}
          <div className="rounded-3xl border border-slate-800 bg-black/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-200">
                Skill Galaxy (gap overlay + click learning path)
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" /> have
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400/80" /> maybe
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-fuchsia-400/80" /> missing
                </span>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-3xl border border-slate-800 bg-[#050710]">
              <SkillGalaxy
                id={`job-${idx}`}
                roleTitle={job.title}
                skills={job.keySkills ?? []}
                userSkillTokens={userSkillTokens}
                height={230}
              />
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              Radius/tiers: inner orbit = core skills, outer orbit = specialization.
            </p>
          </div>

          {/* Timeline */}
          <div className="rounded-3xl border border-slate-800 bg-black/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-200">
                Career Timeline Simulator
              </p>
              <span className="rounded-full border border-slate-800 bg-black/70 px-2 py-1 text-[11px] text-sky-300">
                Intensity {timeline.intensity}/4
              </span>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#05060b] p-3">
                <p className="text-xs font-semibold text-slate-200">6 Months</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {timeline.m6.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#05060b] p-3">
                <p className="text-xs font-semibold text-slate-200">12 Months</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {timeline.m12.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#05060b] p-3">
                <p className="text-xs font-semibold text-slate-200">24 Months</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {timeline.m24.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * SkillGalaxy component (pure frontend)
 * ========================================================= */
function SkillGalaxy({
  id,
  roleTitle,
  skills,
  userSkillTokens,
  sharedSkills,
  height = 220,
}: {
  id: string;
  roleTitle: string;
  skills: string[];
  userSkillTokens: Set<string>;
  sharedSkills?: Set<string>;
  height?: number;
}) {
  // ✅ slightly smaller base width so it fits tablets better
  const W = 480;
  const H = height;

  const galaxy = useMemo(() => buildGalaxy(skills ?? [], W, H), [skills, H]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = selectedId || hoverId;

  const hoveredNode = useMemo(() => {
    if (!activeId) return null;
    return galaxy.nodes.find((n) => n.id === activeId) || null;
  }, [activeId, galaxy.nodes]);

  const statusFor = useMemo(() => {
    const userTokens = userSkillTokens;
    const map = new Map<string, SkillStatus>();

    for (const n of galaxy.nodes) {
      const s = normalizeSkillForMatch(n.label);
      const parts = s.split(/[\s/.-]+/g).filter(Boolean);

      const fullHit = userTokens.has(s);
      const tokenHits = parts.filter((p) => userTokens.has(p)).length;
      const ratio = parts.length ? tokenHits / parts.length : 0;

      let st: SkillStatus = "missing";
      if (fullHit || ratio >= 0.67) st = "have";
      else if (ratio >= 0.34) st = "maybe";
      else st = "missing";

      map.set(n.id, st);
    }
    return map;
  }, [galaxy.nodes, userSkillTokens]);

  const centerLabel = useMemo(() => {
    const t = roleTitle.split(" ");
    return (t[0] || "Role").slice(0, 10);
  }, [roleTitle]);

  const learning = useMemo(() => {
    if (!hoveredNode) return null;
    return buildLearningPath(hoveredNode.label, hoveredNode.tier);
  }, [hoveredNode]);

  const sharedSet = sharedSkills ?? new Set<string>();

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-full"
        style={{ height }}
      >
        <defs>
          <radialGradient id={`bg-${id}`} cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="rgba(56,189,248,.18)" />
            <stop offset="55%" stopColor="rgba(168,85,247,.12)" />
            <stop offset="100%" stopColor="rgba(2,6,23,0)" />
          </radialGradient>

          <filter id={`softGlow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="rgba(2,6,23,.10)" />
        <circle
          cx={galaxy.cx0}
          cy={galaxy.cy0}
          r={Math.min(W, H) * 0.9}
          fill={`url(#bg-${id})`}
        />

        {galaxy.rings.map((r, i) => (
          <ellipse
            key={i}
            cx={galaxy.cx0}
            cy={galaxy.cy0}
            rx={r * 1.22}
            ry={r * 0.68}
            fill="none"
            stroke="rgba(148,163,184,.10)"
            strokeWidth={i === 0 ? 1.3 : 1.0}
          />
        ))}

        <g
          style={{
            transformOrigin: `${galaxy.cx0}px ${galaxy.cy0}px`,
            animation: "galaxySpin 28s linear infinite",
          }}
        >
          {galaxy.edges.map((e) => {
            const A = galaxy.nodes.find((n) => n.id === e.a);
            const B = galaxy.nodes.find((n) => n.id === e.b);
            if (!A || !B) return null;

            const edgeActive = activeId && (activeId === e.a || activeId === e.b);

            return (
              <line
                key={e.id}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={edgeActive ? "rgba(56,189,248,.45)" : "rgba(148,163,184,.14)"}
                strokeWidth={edgeActive ? 1.8 : 1.1}
              />
            );
          })}

          {galaxy.nodes.map((n) => {
            const st = statusFor.get(n.id) ?? "missing";
            const active = activeId === n.id;

            // Landing palette:
            // have = emerald, maybe = sky, missing = fuchsia
            const fill =
              st === "have"
                ? "rgba(52,211,153,.40)"
                : st === "maybe"
                ? "rgba(56,189,248,.35)"
                : "rgba(217,70,239,.30)";

            const stroke =
              sharedSet.has(normalizeSkill(n.label))
                ? "rgba(52,211,153,.70)"
                : active
                ? "rgba(226,232,240,.65)"
                : "rgba(148,163,184,.22)";

            return (
              <g
                key={n.id}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={() => setSelectedId((p) => (p === n.id ? null : n.id))}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={active ? n.r + 2.2 : n.r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={active ? 2 : 1.2}
                  filter={`url(#softGlow-${id})`}
                />
              </g>
            );
          })}
        </g>

        <g filter={`url(#softGlow-${id})`}>
          <circle
            cx={galaxy.cx0}
            cy={galaxy.cy0}
            r={22}
            fill="rgba(56,189,248,.10)"
            stroke="rgba(56,189,248,.35)"
            strokeWidth={2}
          />
          <text
            x={galaxy.cx0}
            y={galaxy.cy0 + 4}
            textAnchor="middle"
            fontSize="11"
            fill="rgba(226,232,240,.92)"
          >
            {centerLabel}
          </text>
        </g>
      </svg>

      {hoveredNode && learning && (
        <div
          className="pointer-events-none absolute right-3 top-3 w-[260px] rounded-2xl border border-slate-800 bg-black/90 p-3 text-xs text-slate-100 shadow-lg"
          style={{ backdropFilter: "blur(10px)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-50">{hoveredNode.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {learning.tierHint} • Tier {hoveredNode.tier + 1}
              </div>
            </div>
            <span className="rounded-full border border-slate-800 bg-black/70 px-2 py-1 text-[10px] text-slate-300">
              click to lock
            </span>
          </div>

          <div className="mt-2 space-y-1">
            {learning.steps.map((s, i) => (
              <div key={i} className="text-[11px] text-slate-200">
                • {s}
              </div>
            ))}
          </div>

          <div className="mt-2 text-[11px] text-slate-400">
            (Gap overlay uses your profile text — no backend.)
          </div>
        </div>
      )}
    </div>
  );
}
