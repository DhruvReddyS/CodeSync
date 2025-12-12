// src/pages/JobSuggestionsPage.tsx

import React, { useState } from "react";
import apiClient from "../lib/apiClient";

type JobSuggestion = {
  title: string;
  level: string;
  summary: string;
  idealCompanies: string[];
  keySkills: string[];
};

const JobSuggestionsPage: React.FC = () => {
  const [currentProfile, setCurrentProfile] = useState("");
  const [interests, setInterests] = useState("");
  const [locationPref, setLocationPref] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<JobSuggestion[]>([]);

  const handleSuggest = async () => {
    if (!currentProfile && !interests) return;
    setLoading(true);
    setJobs([]);
    try {
      const res = await apiClient.post("/career/job-suggestions", {
        currentProfile,
        interests,
        locationPref,
      });
      setJobs(res.data.jobs ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Job Suggestions
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Share your current profile and interests. Gemini will propose job
          titles, role direction and skill gaps to target.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
          {/* Left - Inputs */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <label className="text-xs font-medium text-slate-300">
                Current profile
              </label>
              <textarea
                className="mt-1 h-28 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none ring-emerald-500/40 focus:ring"
                placeholder="e.g. 3rd year CSIT, strong in DSA, projects in MERN / Flask / ML..."
                value={currentProfile}
                onChange={(e) => setCurrentProfile(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Interests & dream roles
              </label>
              <textarea
                className="mt-1 h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none ring-emerald-500/40 focus:ring"
                placeholder="Backend dev, ML engineer, startup culture, fintech, devrel..."
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Location preference (optional)
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring"
                placeholder="e.g. Hyderabad, Bangalore, remote"
                value={locationPref}
                onChange={(e) => setLocationPref(e.target.value)}
              />
            </div>

            <button
              onClick={handleSuggest}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Thinking about your path…" : "Get AI Suggestions"}
            </button>
          </div>

          {/* Right - Suggestions */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-medium text-slate-300">
              Recommended roles & directions
            </p>

            {jobs.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                You’ll see AI-curated job titles and role paths here after you
                run suggestions.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {jobs.map((job, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-50">
                          {job.title}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          {job.level}
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-200">
                        AI suggestion
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-300">
                      {job.summary}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {job.keySkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {job.idealCompanies.length > 0 && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        Good fit companies:{" "}
                        <span className="text-slate-200">
                          {job.idealCompanies.join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSuggestionsPage;
