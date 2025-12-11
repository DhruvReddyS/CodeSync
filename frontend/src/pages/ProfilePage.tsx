// src/pages/ProfilePage.tsx

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { SiLeetcode, SiCodechef, SiCodeforces, SiHackerrank, SiGithub } from "react-icons/si";

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
  onboardingCompleted: boolean;
};

const chipify = (value?: string[] | string) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  // "C, C++, DSA" -> ["C", "C++", "DSA"]
  return value
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const ProfilePage: React.FC = () => {
  const [data, setData] = useState<StudentProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await apiClient.get("/student/profile");
        setData(res.data as StudentProfileResponse);
      } catch (err: any) {
        console.error("[ProfilePage] error:", err);
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load profile.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  const { fullname, cpHandles, profile } = data;

  const skills = chipify(profile.skills);
  const interests = chipify(profile.interests);

  return (
    <div className="min-h-screen bg-[#02030a] text-slate-100 relative overflow-hidden">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_60%)]" />
        <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.14),_transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              This is your academic snapshot, CP handles, and portfolio summary
              that powers dashboards & leaderboards. Update details from the
              onboarding wizard any time.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 bg-sky-500/10 px-4 py-1.5 text-[0.7rem] font-semibold text-sky-100 hover:bg-sky-500/20 transition"
            >
              Edit profile in wizard
            </Link>
            <Link
              to="/dashboard"
              className="text-[0.7rem] text-slate-400 hover:text-slate-200 transition"
            >
              ← Back to dashboard
            </Link>
          </div>
        </header>

        {/* GRID */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* LEFT: BASIC + ACADEMIC */}
          <div className="space-y-5">
            {/* Basic details */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <h2 className="text-sm font-semibold text-slate-100 mb-3">
                Basic details
              </h2>

              <div className="grid gap-3 sm:grid-cols-2 text-[0.75rem]">
                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">Full name</p>
                  <p className="font-medium text-slate-100">
                    {data.fullname || "—"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">
                    College email
                  </p>
                  <p className="text-slate-100 truncate">
                    {data.collegeEmail || "—"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">
                    Personal email
                  </p>
                  <p className="text-slate-100 truncate">
                    {data.personalEmail || "—"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">Phone</p>
                  <p className="text-slate-100">{data.phone || "—"}</p>
                </div>
              </div>
            </div>

            {/* Academic grouping */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <h2 className="text-sm font-semibold text-slate-100 mb-3">
                Academic grouping
              </h2>
              <div className="grid gap-3 sm:grid-cols-3 text-[0.75rem]">
                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">Branch</p>
                  <p className="text-slate-100">{data.branch || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">Section</p>
                  <p className="text-slate-100">{data.section || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">
                    Year of study
                  </p>
                  <p className="text-slate-100">{data.year || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">Roll number</p>
                  <p className="text-slate-100">{data.rollNumber || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 text-[0.65rem]">
                    Graduation year
                  </p>
                  <p className="text-slate-100">
                    {data.graduationYear || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: CP + PORTFOLIO */}
          <div className="space-y-5">
            {/* CP handles */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Coding profiles
                </h2>
                <Link
                  to="/dashboard"
                  className="text-[0.65rem] text-sky-400 hover:text-sky-300 transition"
                >
                  Edit handles in dashboard →
                </Link>
              </div>

              <div className="space-y-2 text-[0.75rem]">
                {[
                  {
                    key: "leetcode" as const,
                    label: "LeetCode",
                    icon: <SiLeetcode className="text-amber-300 text-sm" />,
                  },
                  {
                    key: "codechef" as const,
                    label: "CodeChef",
                    icon: <SiCodechef className="text-amber-100 text-sm" />,
                  },
                  {
                    key: "codeforces" as const,
                    label: "Codeforces",
                    icon: <SiCodeforces className="text-sky-300 text-sm" />,
                  },
                  {
                    key: "hackerrank" as const,
                    label: "HackerRank",
                    icon: <SiHackerrank className="text-emerald-300 text-sm" />,
                  },
                  {
                    key: "github" as const,
                    label: "GitHub",
                    icon: <SiGithub className="text-slate-200 text-sm" />,
                  },
                ].map((p) => {
                  const username = cpHandles[p.key];
                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-black/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-black/80 border border-slate-700 flex items-center justify-center">
                          {p.icon}
                        </div>
                        <div>
                          <p className="text-[0.75rem] font-medium text-slate-100">
                            {p.label}
                          </p>
                          <p className="text-[0.65rem] text-slate-400">
                            {username ? `@${username}` : "Not linked"}
                          </p>
                        </div>
                      </div>
                      {username && (
                        <span className="text-[0.65rem] rounded-full border border-emerald-500/60 bg-emerald-500/5 px-2 py-[2px] text-emerald-200">
                          Linked
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Portfolio snapshot */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-5 py-4 shadow-[0_18px_42px_rgba(0,0,0,0.75)]">
              <h2 className="text-sm font-semibold text-slate-100 mb-3">
                Portfolio snapshot
              </h2>

              <div className="space-y-3 text-[0.75rem]">
                <div>
                  <p className="text-[0.65rem] text-slate-500 mb-1">About</p>
                  <p className="text-slate-200 whitespace-pre-line">
                    {profile.about || "You can add a short summary about yourself in the onboarding wizard."}
                  </p>
                </div>

                {skills.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] text-slate-500 mb-1">
                      Skills
                    </p>
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
                  </div>
                )}

                {interests.length > 0 && (
                  <div>
                    <p className="text-[0.65rem] text-slate-500 mb-1">
                      Interests
                    </p>
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
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {profile.linkedin && (
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[0.7rem] text-sky-300 hover:text-sky-200 underline decoration-sky-500/70"
                    >
                      LinkedIn profile
                    </a>
                  )}
                  {profile.github && (
                    <a
                      href={profile.github}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[0.7rem] text-slate-200 hover:text-slate-50 underline decoration-slate-500/80"
                    >
                      GitHub profile
                    </a>
                  )}
                  {profile.portfolio && (
                    <a
                      href={profile.portfolio}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[0.7rem] text-emerald-300 hover:text-emerald-200 underline decoration-emerald-500/80"
                    >
                      Portfolio / personal site
                    </a>
                  )}
                  {profile.otherSocials && (
                    <p className="text-[0.7rem] text-slate-300">
                      Other socials:{" "}
                      <span className="text-slate-400">
                        {profile.otherSocials}
                      </span>
                    </p>
                  )}
                </div>

                {(profile.projects ||
                  profile.internships ||
                  profile.certificates) && (
                  <div className="pt-1 border-t border-slate-800/70 space-y-2">
                    {profile.projects && (
                      <div>
                        <p className="text-[0.65rem] text-slate-500 mb-1">
                          Projects
                        </p>
                        <p className="text-[0.75rem] text-slate-200 whitespace-pre-line">
                          {profile.projects}
                        </p>
                      </div>
                    )}
                    {profile.internships && (
                      <div>
                        <p className="text-[0.65rem] text-slate-500 mb-1">
                          Internships
                        </p>
                        <p className="text-[0.75rem] text-slate-200 whitespace-pre-line">
                          {profile.internships}
                        </p>
                      </div>
                    )}
                    {profile.certificates && (
                      <div>
                        <p className="text-[0.65rem] text-slate-500 mb-1">
                          Certificates
                        </p>
                        <p className="text-[0.75rem] text-slate-200 whitespace-pre-line">
                          {profile.certificates}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
