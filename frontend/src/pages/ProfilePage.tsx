// src/pages/ProfilePage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import {
  SiLeetcode,
  SiCodechef,
  SiCodeforces,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";
import {
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiExternalLinkLine,
  RiSave3Line,
  RiRefreshLine,
  RiInformationLine,
} from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";

type CpHandles = {
  leetcode?: string | null;
  codeforces?: string | null;
  codechef?: string | null;
  github?: string | null;
  hackerrank?: string | null;
  atcoder?: string | null;
};

type ProfileMeta = {
  about?: string;
  skills?: string[] | string;
  interests?: string[] | string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  otherSocials?: string;
  projects?: string;
  internships?: string;
  certificates?: string;
};

type StudentProfileResponse = {
  id: string;
  fullname: string | null;
  collegeEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  branch: string | null;
  section: string | null;
  year: string | null;
  rollNumber: string | null;
  graduationYear: string | null;
  cpHandles: CpHandles;
  profile: ProfileMeta;
  onboardingCompleted: boolean; // kept for compatibility, not shown in UI
};

/* ------------------------------ Helpers ------------------------------ */

const chipify = (value?: string[] | string) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const toCSV = (arr: string[]) => arr.join(", ");
const cleanHandle = (v: string) => v.replace(/^@+/, "").trim();

const normalizeUrl = (url?: string) => {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

const shallowEqualJSON = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

const FieldLabel: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <div className="flex items-center gap-2">
    <p className="text-slate-500 text-[0.65rem]">{label}</p>
    {hint ? (
      <span className="inline-flex items-center gap-1 text-[0.65rem] text-slate-500/80">
        <RiInformationLine className="text-[0.8rem]" />
        {hint}
      </span>
    ) : null}
  </div>
);

const InputBase =
  "w-full rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-[0.8rem] text-slate-100 placeholder:text-slate-600 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 transition";

const TextareaBase =
  "w-full min-h-[92px] rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-[0.8rem] text-slate-100 placeholder:text-slate-600 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 transition resize-y";

/* ------------------------------ Component ------------------------------ */

const ProfilePage: React.FC = () => {
  const [data, setData] = useState<StudentProfileResponse | null>(null);
  const [initial, setInitial] = useState<StudentProfileResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // 🔥 Save animation flags
  const [savePulse, setSavePulse] = useState(false);
  const [confetti, setConfetti] = useState(false);

  // edit mode per section
  const [edit, setEdit] = useState({
    basic: false,
    academic: false,
    cp: false,
    portfolio: false,
  });

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await apiClient.get("/student/profile");
        const payload = res.data as StudentProfileResponse;

        const normalized: StudentProfileResponse = {
          ...payload,
          profile: {
            ...payload.profile,
            skills: chipify(payload.profile?.skills),
            interests: chipify(payload.profile?.interests),
          },
          cpHandles: payload.cpHandles || {},
        };

        setData(normalized);
        setInitial(normalized);
      } catch (err: any) {
        console.error("[ProfilePage] error:", err);
        const msg =
          err?.response?.data?.message || err?.message || "Failed to load profile.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = useMemo(() => {
    if (!data || !initial) return false;
    return !shallowEqualJSON(data, initial);
  }, [data, initial]);

  const skills = useMemo(() => chipify(data?.profile?.skills), [data?.profile?.skills]);
  const interests = useMemo(
    () => chipify(data?.profile?.interests),
    [data?.profile?.interests]
  );

  const anyEditOn = edit.basic || edit.academic || edit.cp || edit.portfolio;

  const toggleSection = (k: keyof typeof edit) =>
    setEdit((p) => ({ ...p, [k]: !p[k] }));

  const closeAllEdits = () =>
    setEdit({ basic: false, academic: false, cp: false, portfolio: false });

  const resetToInitial = () => {
    if (!initial) return;
    setData(initial);
    setSaveMsg(null);
    closeAllEdits();
  };

  const updateTop = (key: keyof StudentProfileResponse, value: any) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaveMsg(null);
  };

  const updateProfile = (key: keyof ProfileMeta, value: any) => {
    setData((prev) =>
      prev ? { ...prev, profile: { ...(prev.profile || {}), [key]: value } } : prev
    );
    setSaveMsg(null);
  };

  const updateHandle = (key: keyof CpHandles, value: string) => {
    const cleaned = value ? cleanHandle(value) : "";
    setData((prev) =>
      prev
        ? {
            ...prev,
            cpHandles: { ...(prev.cpHandles || {}), [key]: cleaned || null },
          }
        : prev
    );
    setSaveMsg(null);
  };

  const validate = (payload: StudentProfileResponse) => {
    const errs: string[] = [];
    if (payload.phone && payload.phone.replace(/\D/g, "").length < 8) {
      errs.push("Phone number looks too short.");
    }
    const urls = [
      payload.profile?.linkedin,
      payload.profile?.github,
      payload.profile?.portfolio,
    ].filter(Boolean) as string[];
    for (const u of urls) {
      const nu = normalizeUrl(u);
      try {
        new URL(nu);
      } catch {
        errs.push(`Invalid URL: ${u}`);
      }
    }
    return errs;
  };

  const triggerSavedAnimation = () => {
    // quick pulse + subtle “sparkle/confetti” dots
    setSavePulse(true);
    setConfetti(true);

    window.setTimeout(() => setSavePulse(false), 520);
    window.setTimeout(() => setConfetti(false), 900);
  };

  const handleSave = async () => {
    if (!data) return;
    setError(null);
    setSaveMsg(null);

    const prepared: StudentProfileResponse = {
      ...data,
      profile: {
        ...(data.profile || {}),
        skills: chipify(data.profile?.skills),
        interests: chipify(data.profile?.interests),
        linkedin: normalizeUrl(data.profile?.linkedin || "") || "",
        github: normalizeUrl(data.profile?.github || "") || "",
        portfolio: normalizeUrl(data.profile?.portfolio || "") || "",
      },
      cpHandles: {
        ...(data.cpHandles || {}),
        leetcode: data.cpHandles?.leetcode ? cleanHandle(data.cpHandles.leetcode) : null,
        codechef: data.cpHandles?.codechef ? cleanHandle(data.cpHandles.codechef) : null,
        codeforces: data.cpHandles?.codeforces
          ? cleanHandle(data.cpHandles.codeforces)
          : null,
        hackerrank: data.cpHandles?.hackerrank
          ? cleanHandle(data.cpHandles.hackerrank)
          : null,
        github: data.cpHandles?.github ? cleanHandle(data.cpHandles.github) : null,
        atcoder: data.cpHandles?.atcoder ? cleanHandle(data.cpHandles.atcoder) : null,
      },
    };

    const errs = validate(prepared);
    if (errs.length) {
      setError(errs[0]);
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.put("/student/profile", prepared);
      const updated = res.data as StudentProfileResponse;

      const normalizedUpdated: StudentProfileResponse = {
        ...updated,
        profile: {
          ...updated.profile,
          skills: chipify(updated.profile?.skills),
          interests: chipify(updated.profile?.interests),
        },
        cpHandles: updated.cpHandles || {},
      };

      setData(normalizedUpdated);
      setInitial(normalizedUpdated);
      setSaveMsg("Saved successfully.");
      closeAllEdits();

      // ✅ animation after successful save
      triggerSavedAnimation();
    } catch (err: any) {
      console.error("[ProfilePage] save error:", err);
      const msg =
        err?.response?.data?.message || err?.message || "Failed to save profile.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------ UI States ------------------------------ */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02030a] text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading your profile…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#02030a] text-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/60 bg-rose-500/10 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-rose-100 mb-1">
            Couldn&apos;t load profile
          </p>
          <p className="text-xs text-rose-200/80 mb-3">{error}</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold border border-sky-500/70 text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 transition"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { fullname } = data;

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 relative overflow-hidden">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_60%)]" />
        <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.14),_transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:80px_80px]"
        />
      </div>

      {/* ✅ Saved animation overlay */}
      <AnimatePresence>
        {confetti && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* subtle sparkles near top center */}
            <div className="absolute left-1/2 top-16 -translate-x-1/2">
              <div className="relative h-16 w-64">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full bg-white/70"
                    initial={{
                      opacity: 0,
                      x: 0,
                      y: 0,
                      scale: 0.6,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      x: (i - 4.5) * 10,
                      y: (i % 2 === 0 ? 1 : -1) * (18 + i * 2),
                      scale: [0.6, 1.1, 0.7],
                    }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.02 }}
                  />
                ))}
              </div>
            </div>

            {/* center check burst */}
            <div className="absolute left-1/2 top-28 -translate-x-1/2">
              <motion.div
                className="rounded-full border border-emerald-500/40 bg-emerald-500/10 backdrop-blur px-4 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                initial={{ scale: 0.85, opacity: 0, y: -8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="flex items-center gap-2 text-emerald-100 text-[0.8rem] font-semibold">
                  <RiCheckLine />
                  Saved
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky save bar */}
      {dirty && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(980px,92vw)]"
          animate={savePulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3 shadow-[0_22px_60px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-amber-300/80" />
              <div>
                <p className="text-[0.8rem] font-semibold text-slate-100">
                  You have unsaved changes
                </p>
                <p className="text-[0.7rem] text-slate-400">
                  Save to update your dashboard, leaderboards, and resume tools.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={resetToInitial}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-[0.75rem] font-semibold text-slate-200 hover:bg-black/60 transition disabled:opacity-60"
              >
                <RiRefreshLine />
                Reset
              </button>

              <motion.button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-sky-500/70 bg-sky-500/10 px-4 py-2 text-[0.75rem] font-semibold text-sky-100 hover:bg-sky-500/20 transition disabled:opacity-60"
                whileTap={{ scale: 0.98 }}
                animate={
                  savePulse
                    ? {
                        boxShadow: [
                          "0 0 0 rgba(0,0,0,0)",
                          "0 0 26px rgba(16,185,129,0.22)",
                          "0 0 0 rgba(0,0,0,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <RiSave3Line />
                {saving ? "Saving…" : "Save changes"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-slate-500">
              Profile
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold">
              {fullname ? (
                <>
                  Hey,{" "}
                  <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
                    {fullname}
                  </span>
                </>
              ) : (
                "Your CodeSync profile"
              )}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl">
              View and edit your academic info, coding handles, and portfolio details.
            </p>

            {saveMsg && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-[0.75rem] text-emerald-100">
                <RiCheckLine />
                {saveMsg}
              </div>
            )}
            {error && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[0.75rem] text-rose-100">
                <RiCloseLine />
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              to="/dashboard"
              className="text-[0.7rem] text-slate-400 hover:text-slate-200 transition"
            >
              ← Back to dashboard
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={resetToInitial}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-4 py-1.5 text-[0.7rem] font-semibold text-slate-200 hover:bg-black/60 transition disabled:opacity-50"
              >
                <RiRefreshLine />
                Reset
              </button>

              <motion.button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-2 rounded-full border border-sky-500/70 bg-sky-500/10 px-4 py-1.5 text-[0.7rem] font-semibold text-sky-100 hover:bg-sky-500/20 transition disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
                animate={savePulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <RiSave3Line />
                {saving ? "Saving…" : "Save"}
              </motion.button>
            </div>
          </div>
        </header>

        {/* GRID */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Basic details */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-100">Basic details</h2>
                <button
                  onClick={() => toggleSection("basic")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[0.7rem] font-semibold text-slate-200 hover:bg-black/60 transition"
                >
                  <RiEditLine />
                  {edit.basic ? "Done" : "Edit"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-[0.75rem]">
                <div className="space-y-1">
                  <FieldLabel label="Full name" />
                  {edit.basic ? (
                    <input
                      className={InputBase}
                      value={data.fullname || ""}
                      onChange={(e) => updateTop("fullname", e.target.value)}
                      placeholder="Your full name"
                    />
                  ) : (
                    <p className="font-medium text-slate-100">{data.fullname || "—"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <FieldLabel label="College email" />
                  {edit.basic ? (
                    <input
                      className={InputBase}
                      value={data.collegeEmail || ""}
                      onChange={(e) => updateTop("collegeEmail", e.target.value)}
                      placeholder="College email"
                    />
                  ) : (
                    <p className="text-slate-100 truncate">{data.collegeEmail || "—"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <FieldLabel label="Personal email" />
                  {edit.basic ? (
                    <input
                      className={InputBase}
                      value={data.personalEmail || ""}
                      onChange={(e) => updateTop("personalEmail", e.target.value)}
                      placeholder="Personal email"
                    />
                  ) : (
                    <p className="text-slate-100 truncate">{data.personalEmail || "—"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <FieldLabel label="Phone" />
                  {edit.basic ? (
                    <input
                      className={InputBase}
                      value={data.phone || ""}
                      onChange={(e) => updateTop("phone", e.target.value)}
                      placeholder="Phone number"
                    />
                  ) : (
                    <p className="text-slate-100">{data.phone || "—"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Academic grouping */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-100">Academic grouping</h2>
                <button
                  onClick={() => toggleSection("academic")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[0.7rem] font-semibold text-slate-200 hover:bg-black/60 transition"
                >
                  <RiEditLine />
                  {edit.academic ? "Done" : "Edit"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 text-[0.75rem]">
                {[
                  { k: "branch", label: "Branch", ph: "CSE / CSIT / ECE…" },
                  { k: "section", label: "Section", ph: "A / B / C…" },
                  { k: "year", label: "Year of study", ph: "1 / 2 / 3 / 4" },
                  { k: "rollNumber", label: "Roll number", ph: "Roll no." },
                  { k: "graduationYear", label: "Graduation year", ph: "2026" },
                ].map((f) => {
                  const key = f.k as keyof StudentProfileResponse;
                  const value = (data[key] as any) || "";
                  return (
                    <div key={f.k} className="space-y-1">
                      <FieldLabel label={f.label} />
                      {edit.academic ? (
                        <input
                          className={InputBase}
                          value={value}
                          onChange={(e) => updateTop(key, e.target.value)}
                          placeholder={f.ph}
                        />
                      ) : (
                        <p className="text-slate-100">{value || "—"}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            {/* CP handles */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-sm font-semibold text-slate-100">Coding profiles</h2>
                <button
                  onClick={() => toggleSection("cp")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[0.7rem] font-semibold text-slate-200 hover:bg-black/60 transition"
                >
                  <RiEditLine />
                  {edit.cp ? "Done" : "Edit"}
                </button>
              </div>

              <div className="space-y-2 text-[0.75rem]">
                {[
                  {
                    key: "leetcode" as const,
                    label: "LeetCode",
                    icon: <SiLeetcode className="text-amber-300 text-sm" />,
                    url: (u: string) => `https://leetcode.com/${u}`,
                  },
                  {
                    key: "codechef" as const,
                    label: "CodeChef",
                    icon: <SiCodechef className="text-amber-100 text-sm" />,
                    url: (u: string) => `https://www.codechef.com/users/${u}`,
                  },
                  {
                    key: "codeforces" as const,
                    label: "Codeforces",
                    icon: <SiCodeforces className="text-sky-300 text-sm" />,
                    url: (u: string) => `https://codeforces.com/profile/${u}`,
                  },
                  {
                    key: "hackerrank" as const,
                    label: "HackerRank",
                    icon: <SiHackerrank className="text-emerald-300 text-sm" />,
                    url: (u: string) => `https://www.hackerrank.com/profile/${u}`,
                  },
                  {
                    key: "github" as const,
                    label: "GitHub",
                    icon: <SiGithub className="text-slate-200 text-sm" />,
                    url: (u: string) => `https://github.com/${u}`,
                  },
                  {
                    key: "atcoder" as const,
                    label: "AtCoder",
                    icon: (
                      <span className="text-slate-200 text-[0.7rem] font-semibold">AC</span>
                    ),
                    url: (u: string) => `https://atcoder.jp/users/${u}`,
                  },
                ].map((p) => {
                  const username = data.cpHandles?.[p.key] || "";
                  const linked = Boolean(username);
                  return (
                    <div
                      key={p.key}
                      className="rounded-xl border border-slate-800 bg-black/60 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 shrink-0 rounded-lg bg-black/80 border border-slate-700 flex items-center justify-center">
                            {p.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[0.75rem] font-medium text-slate-100">
                              {p.label}
                            </p>
                            {!edit.cp ? (
                              <p className="text-[0.65rem] text-slate-400 truncate">
                                {linked ? `@${username}` : "Not linked"}
                              </p>
                            ) : (
                              <input
                                className={InputBase}
                                value={username}
                                onChange={(e) => updateHandle(p.key, e.target.value)}
                                placeholder={`Enter ${p.label} username`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {linked && (
                            <span className="text-[0.65rem] rounded-full border border-emerald-500/60 bg-emerald-500/5 px-2 py-[2px] text-emerald-200">
                              Linked
                            </span>
                          )}
                          {linked && !edit.cp && (
                            <a
                              href={p.url(username)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[0.65rem] text-sky-300 hover:text-sky-200 transition"
                            >
                              Open <RiExternalLinkLine />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Portfolio snapshot */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-100">Portfolio snapshot</h2>
                <button
                  onClick={() => toggleSection("portfolio")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[0.7rem] font-semibold text-slate-200 hover:bg-black/60 transition"
                >
                  <RiEditLine />
                  {edit.portfolio ? "Done" : "Edit"}
                </button>
              </div>

              <div className="space-y-4 text-[0.75rem]">
                {/* About */}
                <div className="space-y-1">
                  <FieldLabel label="About" hint="Short intro shown in career suite" />
                  {edit.portfolio ? (
                    <textarea
                      className={TextareaBase}
                      value={data.profile?.about || ""}
                      onChange={(e) => updateProfile("about", e.target.value)}
                      placeholder="Write a short summary about yourself…"
                    />
                  ) : (
                    <p className="text-slate-200 whitespace-pre-line">
                      {data.profile?.about || "—"}
                    </p>
                  )}
                </div>

                {/* Skills & Interests */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <FieldLabel label="Skills" hint="Comma separated" />
                    {edit.portfolio ? (
                      <input
                        className={InputBase}
                        value={
                          Array.isArray(data.profile?.skills)
                            ? toCSV(data.profile?.skills as string[])
                            : (data.profile?.skills as string) || ""
                        }
                        onChange={(e) => updateProfile("skills", chipify(e.target.value))}
                        placeholder="React, Node, DSA, MongoDB…"
                      />
                    ) : skills.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-sky-500/60 bg-sky-500/5 px-2 py-[2px] text-[0.65rem] text-sky-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[0.75rem]">—</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <FieldLabel label="Interests" hint="Comma separated" />
                    {edit.portfolio ? (
                      <input
                        className={InputBase}
                        value={
                          Array.isArray(data.profile?.interests)
                            ? toCSV(data.profile?.interests as string[])
                            : (data.profile?.interests as string) || ""
                        }
                        onChange={(e) => updateProfile("interests", chipify(e.target.value))}
                        placeholder="Web dev, ML, CP, UI design…"
                      />
                    ) : interests.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {interests.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-fuchsia-500/60 bg-fuchsia-500/5 px-2 py-[2px] text-[0.65rem] text-fuchsia-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[0.75rem]">—</p>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { k: "linkedin", label: "LinkedIn URL", ph: "linkedin.com/in/…" },
                    { k: "github", label: "GitHub URL", ph: "github.com/…" },
                    { k: "portfolio", label: "Portfolio URL", ph: "your-site.com" },
                    { k: "otherSocials", label: "Other socials", ph: "Twitter, Instagram…" },
                  ].map((f) => {
                    const key = f.k as keyof ProfileMeta;
                    const value = (data.profile?.[key] as string) || "";
                    const isUrl = key === "linkedin" || key === "github" || key === "portfolio";
                    return (
                      <div key={f.k} className="space-y-1">
                        <FieldLabel label={f.label} />
                        {edit.portfolio ? (
                          <input
                            className={InputBase}
                            value={value}
                            onChange={(e) => updateProfile(key, e.target.value)}
                            placeholder={f.ph}
                          />
                        ) : value ? (
                          isUrl ? (
                            <a
                              href={normalizeUrl(value)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[0.75rem] text-sky-300 hover:text-sky-200 underline decoration-sky-500/60"
                            >
                              {key === "linkedin"
                                ? "LinkedIn profile"
                                : key === "github"
                                ? "GitHub profile"
                                : "Portfolio / personal site"}
                              <RiExternalLinkLine />
                            </a>
                          ) : (
                            <p className="text-slate-200">{value}</p>
                          )
                        ) : (
                          <p className="text-slate-400 text-[0.75rem]">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Long text fields */}
                <div className="pt-3 border-t border-slate-800/70 grid gap-3">
                  {[
                    { k: "projects", label: "Projects", ph: "List your best projects (2–5)…" },
                    { k: "internships", label: "Internships", ph: "Company, role, dates, impact…" },
                    { k: "certificates", label: "Certificates", ph: "Certificate name + issuer…" },
                  ].map((f) => {
                    const key = f.k as keyof ProfileMeta;
                    const value = (data.profile?.[key] as string) || "";
                    return (
                      <div key={f.k} className="space-y-1">
                        <FieldLabel label={f.label} />
                        {edit.portfolio ? (
                          <textarea
                            className={TextareaBase}
                            value={value}
                            onChange={(e) => updateProfile(key, e.target.value)}
                            placeholder={f.ph}
                          />
                        ) : value ? (
                          <p className="text-slate-200 whitespace-pre-line">{value}</p>
                        ) : (
                          <p className="text-slate-400 text-[0.75rem]">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save / Cancel small actions */}
            {anyEditOn && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4 flex items-center justify-between gap-3">
                <p className="text-[0.75rem] text-slate-400">
                  Tip: You can edit section-wise. Use{" "}
                  <span className="text-slate-200 font-semibold">Save</span> to persist.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeAllEdits}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-[0.75rem] font-semibold text-slate-200 hover:bg-black/60 transition"
                  >
                    <RiCloseLine />
                    Close
                  </button>
                  <motion.button
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/70 bg-sky-500/10 px-4 py-2 text-[0.75rem] font-semibold text-sky-100 hover:bg-sky-500/20 transition disabled:opacity-50"
                    whileTap={{ scale: 0.98 }}
                    animate={savePulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  >
                    <RiSave3Line />
                    {saving ? "Saving…" : "Save"}
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
