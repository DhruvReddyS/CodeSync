// src/pages/ResumeBuilderPage.tsx

import React, { useState } from "react";
import apiClient from "../lib/apiClient";

const ResumeBuilderPage: React.FC = () => {
  const [about, setAbout] = useState("");
  const [highlights, setHighlights] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState("");

  const handleGenerate = async () => {
    if (!about && !highlights) return;
    setLoading(true);
    try {
      const res = await apiClient.post("/career/resume-builder", {
        about,
        highlights,
        targetRole,
      });
      setGeneratedResume(res.data.resumeMarkdown ?? "");
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
          Resume Builder
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Paste your raw details and let Gemini convert them into a clean,
          ATS-friendly resume structure.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Input side */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <label className="text-xs font-medium text-slate-300">
                Target role / headline
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring"
                placeholder="e.g. SDE Intern | Backend Developer | Data Analyst"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                About you (summary)
              </label>
              <textarea
                className="mt-1 h-28 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring"
                placeholder="Describe your background, current year, tech stack, highlights..."
                value={about}
                onChange={(e) => setAbout(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300">
                Raw bullet points (projects, internships, achievements)
              </label>
              <textarea
                className="mt-1 h-40 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-emerald-500/40 focus:ring"
                placeholder="- Built CodeSync, a coding analytics platform&#10;- SnapFix mobile app for civic issue reporting&#10;- ..."
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Generating with Gemini…" : "Generate Resume"}
            </button>
          </div>

          {/* Output side */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-medium text-slate-300">
              AI-generated resume (Markdown)
            </p>
            <div className="mt-2 h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs font-mono text-slate-200">
              {generatedResume ? (
                <pre className="whitespace-pre-wrap">{generatedResume}</pre>
              ) : (
                <p className="text-slate-500">
                  Output will appear here. You can later export this to PDF /
                  DOCX.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilderPage;
