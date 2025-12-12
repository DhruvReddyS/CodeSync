// src/pages/ATSAnalyzerPage.tsx

import React, { useState } from "react";
import apiClient from "../lib/apiClient";

/* ---------------- TYPES ---------------- */

type TechCoverage = {
  name: string;
  level: "strong" | "medium" | "weak";
};

type SectionScores = {
  summary?: number;
  skills?: number;
  projects?: number;
  experience?: number;
  education?: number;
  extras?: number;
};

type BulletFeedback = {
  section: string;
  issue: string;
  fix: string;
};

type ATSResult = {
  overallScore: number;
  skillsMatch: number;
  experienceMatch: number;
  formattingScore: number;

  // Advanced fields (optional – backend may or may not fill them)
  keywordDensityScore?: number;
  seniorityFit?: number;
  achievementsImpactScore?: number;

  sectionScores?: SectionScores;
  missingKeywords: string[];
  redundantKeywords?: string[];
  softSkillsMissing?: string[];
  techStackCoverage?: TechCoverage[];
  suggestions: string[];
  bulletLevelFeedback?: BulletFeedback[];
  recruiterSnapshot?: string;
};

const ATSAnalyzerPage: React.FC = () => {
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobSeniority, setJobSeniority] = useState("");
  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setResumeFile(file);
  };

  const handleAnalyze = async () => {
    if ((!resumeText && !resumeFile) || !jobDescription) {
      setError("Please upload a resume (PDF) or paste resume text, and add a job description.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // If PDF provided → send multipart with file
      if (resumeFile) {
        const formData = new FormData();
        formData.append("resumeFile", resumeFile);
        formData.append("jobDescription", jobDescription);
        formData.append("jobTitle", jobTitle);
        formData.append("jobLocation", jobLocation);
        formData.append("jobSeniority", jobSeniority);
        formData.append("companyName", companyName);

        const res = await apiClient.post("/career/ats-analyzer", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setResult(res.data);
      } else {
        // Fallback: text-only (current backend already supports this)
        const res = await apiClient.post("/career/ats-analyzer", {
          resumeText,
          jobDescription,
          jobTitle,
          jobLocation,
          jobSeniority,
          companyName,
        });
        setResult(res.data);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while running the ATS analysis.");
    } finally {
      setLoading(false);
    }
  };

  const scoreBand = (n: number) => {
    if (n >= 80) return { label: "Strong fit", color: "text-emerald-400" };
    if (n >= 60) return { label: "Moderate fit", color: "text-amber-300" };
    if (n >= 40) return { label: "Needs work", color: "text-rose-300" };
    return { label: "Poor match", color: "text-rose-400" };
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          ATS Analyzer 2.0
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Upload your resume (PDF) or paste it, add a job description, and let
          the AI-grade ATS simulate how real hiring systems score you: keywords, sections,
          seniority, formatting, and recruiter-friendly insights.
        </p>

        {/* Layout */}
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr,1.3fr]">
          {/* LEFT: Inputs */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {/* Resume upload */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Resume (PDF preferred)
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/80 px-3 py-4 text-center text-xs text-slate-400 hover:border-violet-400 hover:bg-slate-900 transition">
                  <span className="font-medium text-slate-100">
                    Drop your resume PDF here or click to upload
                  </span>
                  <span className="mt-1 text-[0.7rem] text-slate-500">
                    Up to ~5 MB · PDF only for best parsing
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {resumeFile && (
                  <p className="text-[0.7rem] text-emerald-300">
                    Selected: <span className="font-medium">{resumeFile.name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="relative mt-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Or paste resume text
                </label>
                <span className="text-[0.65rem] text-slate-500">
                  Optional if PDF is uploaded
                </span>
              </div>
              <textarea
                className="mt-1 h-40 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none ring-violet-500/40 focus:ring"
                placeholder="Paste your resume text here (export as text / copy from PDF)..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </div>

            {/* Job info mini fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[0.7rem] font-medium text-slate-300">
                  Job title
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs outline-none ring-violet-500/40 focus:ring"
                  placeholder="e.g. SDE Intern, Backend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[0.7rem] font-medium text-slate-300">
                  Company
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs outline-none ring-violet-500/40 focus:ring"
                  placeholder="e.g. Microsoft, Early-stage startup"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[0.7rem] font-medium text-slate-300">
                  Location
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs outline-none ring-violet-500/40 focus:ring"
                  placeholder="e.g. Hyderabad, Remote"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[0.7rem] font-medium text-slate-300">
                  Seniority
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs outline-none ring-violet-500/40 focus:ring"
                  placeholder="e.g. Internship, Entry level, Junior"
                  value={jobSeniority}
                  onChange={(e) => setJobSeniority(e.target.value)}
                />
              </div>
            </div>

            {/* Job description */}
            <div className="mt-2">
              <label className="text-xs font-medium text-slate-300">
                Job description
              </label>
              <textarea
                className="mt-1 h-40 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none ring-violet-500/40 focus:ring"
                placeholder="Paste the JD from LinkedIn / Naukri / company site..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="mt-1 text-[0.7rem] text-rose-400">{error}</p>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-violet-500/40 transition hover:bg-violet-400 disabled:opacity-60"
            >
              {loading ? "Running ATS analysis…" : "Analyze Match"}
            </button>

            <p className="mt-1 text-[0.65rem] text-slate-500">
              We never store your resume. Everything runs as a one-off analysis.
            </p>
          </div>

          {/* RIGHT: Results */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-medium text-slate-300">
              Match summary
            </p>

            {!result ? (
              <p className="mt-2 text-xs text-slate-400">
                After you run the analysis, you&apos;ll see a detailed ATS-style
                breakdown here: overall match, section scores, keyword coverage,
                and recruiter insights.
              </p>
            ) : (
              <>
                {/* Top band: Overall score & band */}
                <OverallScorePanel result={result} />

                {/* Core scores grid */}
                <div className="mt-3 flex flex-wrap gap-3">
                  <ScoreBadge label="Skills Match" value={result.skillsMatch} />
                  <ScoreBadge
                    label="Experience Match"
                    value={result.experienceMatch}
                  />
                  <ScoreBadge
                    label="Formatting"
                    value={result.formattingScore}
                  />
                  {typeof result.keywordDensityScore === "number" && (
                    <ScoreBadge
                      label="Keyword Coverage"
                      value={result.keywordDensityScore}
                    />
                  )}
                  {typeof result.seniorityFit === "number" && (
                    <ScoreBadge
                      label="Seniority Fit"
                      value={result.seniorityFit}
                    />
                  )}
                  {typeof result.achievementsImpactScore === "number" && (
                    <ScoreBadge
                      label="Impact of Achievements"
                      value={result.achievementsImpactScore}
                    />
                  )}
                </div>

                {/* Section breakdown */}
                {result.sectionScores && (
                  <SectionBreakdown sectionScores={result.sectionScores} />
                )}

                {/* Keywords */}
                <div className="grid gap-3 md:grid-cols-2">
                  <KeywordBlock
                    title="Missing / weak keywords"
                    emptyText="No critical keywords missing — strong alignment"
                    pills={result.missingKeywords}
                    tone="danger"
                  />
                  <KeywordBlock
                    title="Overused / redundant keywords"
                    emptyText="No obvious keyword stuffing detected"
                    pills={result.redundantKeywords || []}
                    tone="neutral"
                  />
                </div>

                {/* Tech stack + soft skills */}
                <div className="grid gap-3 md:grid-cols-2">
                  {result.techStackCoverage && result.techStackCoverage.length > 0 && (
                    <TechCoverageBlock tech={result.techStackCoverage} />
                  )}
                  <KeywordBlock
                    title="Soft skills / behavior signals missing"
                    emptyText="Soft skills look balanced for this JD."
                    pills={result.softSkillsMissing || []}
                    tone="soft"
                  />
                </div>

                {/* Bullet-level feedback */}
                {result.bulletLevelFeedback &&
                  result.bulletLevelFeedback.length > 0 && (
                    <BulletFeedbackBlock bullets={result.bulletLevelFeedback} />
                  )}

                {/* Suggestions */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300">
                    Suggested improvements (do these next)
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-300">
                    {result.suggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                {/* Recruiter snapshot */}
                {result.recruiterSnapshot && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <h3 className="text-xs font-semibold text-slate-300">
                      Recruiter snapshot
                    </h3>
                    <p className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">
                      {result.recruiterSnapshot}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- SUBCOMPONENTS ---------------- */

const ScoreBadge: React.FC<{
  label: string;
  value: number;
}> = ({ label, value }) => {
  const base =
    value >= 80
      ? "border-emerald-400/60 bg-emerald-500/10"
      : value >= 60
      ? "border-amber-300/60 bg-amber-500/10"
      : "border-rose-400/60 bg-rose-500/10";

  return (
    <div
      className={`flex min-w-[120px] flex-col rounded-xl border px-3 py-2 text-xs ${base}`}
    >
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-200">
        {label}
      </span>
      <span className="mt-1 text-lg font-semibold text-slate-50">
        {value.toFixed(0)}
        <span className="text-xs text-slate-200"> / 100</span>
      </span>
    </div>
  );
};

const OverallScorePanel: React.FC<{ result: ATSResult }> = ({ result }) => {
  const band = scoreBandStatic(result.overallScore);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 border border-slate-700">
          <span className="text-xl font-semibold text-slate-50">
            {result.overallScore.toFixed(0)}
          </span>
          <span className="absolute -bottom-1 text-[0.6rem] text-slate-400">
            / 100
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-200">
            Overall ATS match
          </p>
          <p className={`text-[0.75rem] font-medium ${band.color}`}>
            {band.label}
          </p>
          <p className="mt-0.5 text-[0.7rem] text-slate-400 max-w-xs">
            Combine this with keyword gaps and section scores below to decide
            what to edit first.
          </p>
        </div>
      </div>
      <div className="h-2 w-full max-w-xs rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.min(result.overallScore, 100)}%` }}
        />
      </div>
    </div>
  );
};

function scoreBandStatic(n: number) {
  if (n >= 80) return { label: "Strong fit – ready to apply now", color: "text-emerald-400" };
  if (n >= 60)
    return {
      label: "Decent fit – a few targeted edits will help",
      color: "text-amber-300",
    };
  if (n >= 40)
    return {
      label: "Weak fit – you need to tailor this resume",
      color: "text-rose-300",
    };
  return {
    label: "Very low match – rewrite around this JD",
    color: "text-rose-400",
  };
}

const SectionBreakdown: React.FC<{ sectionScores: SectionScores }> = ({
  sectionScores,
}) => {
  const items: { key: keyof SectionScores; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "skills", label: "Skills" },
    { key: "projects", label: "Projects" },
    { key: "experience", label: "Experience" },
    { key: "education", label: "Education" },
    { key: "extras", label: "Extras / Activities" },
  ];

  const hasAny = items.some((i) => typeof sectionScores[i.key] === "number");
  if (!hasAny) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-300">
        Section-by-section score
      </h3>
      <div className="mt-2 space-y-2">
        {items.map(({ key, label }) => {
          const v = sectionScores[key];
          if (typeof v !== "number") return null;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-28 text-[0.7rem] text-slate-400">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400"
                  style={{ width: `${Math.min(v, 100)}%` }}
                />
              </div>
              <span className="w-10 text-right text-[0.7rem] text-slate-300">
                {v.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const KeywordBlock: React.FC<{
  title: string;
  emptyText: string;
  pills: string[];
  tone: "danger" | "neutral" | "soft";
}> = ({ title, emptyText, pills, tone }) => {
  const base =
    tone === "danger"
      ? "bg-rose-500/10 text-rose-200"
      : tone === "soft"
      ? "bg-emerald-500/8 text-emerald-200"
      : "bg-slate-600/20 text-slate-200";

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-300">{title}</h3>
      {pills.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {pills.map((kw) => (
            <span
              key={kw}
              className={`rounded-full px-2 py-1 text-[0.7rem] ${base}`}
            >
              {kw}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-[0.7rem] text-slate-400">{emptyText}</p>
      )}
    </div>
  );
};

const TechCoverageBlock: React.FC<{ tech: TechCoverage[] }> = ({ tech }) => {
  const strong = tech.filter((t) => t.level === "strong");
  const medium = tech.filter((t) => t.level === "medium");
  const weak = tech.filter((t) => t.level === "weak");

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-300">
        Tech stack coverage
      </h3>
      <div className="mt-1 space-y-1.5">
        {strong.length > 0 && (
          <TechRow label="Strong" items={strong.map((t) => t.name)} level="strong" />
        )}
        {medium.length > 0 && (
          <TechRow label="Okay" items={medium.map((t) => t.name)} level="medium" />
        )}
        {weak.length > 0 && (
          <TechRow label="Weak / missing" items={weak.map((t) => t.name)} level="weak" />
        )}
      </div>
    </div>
  );
};

const TechRow: React.FC<{
  label: string;
  items: string[];
  level: "strong" | "medium" | "weak";
}> = ({ label, items, level }) => {
  const color =
    level === "strong"
      ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/40"
      : level === "medium"
      ? "bg-amber-500/10 text-amber-200 border-amber-400/40"
      : "bg-rose-500/10 text-rose-200 border-rose-400/40";

  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 w-20 text-[0.7rem] text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it}
            className={`rounded-full border px-2 py-0.5 text-[0.7rem] ${color}`}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
};

const BulletFeedbackBlock: React.FC<{ bullets: BulletFeedback[] }> = ({
  bullets,
}) => {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-300">
        Bullet-level feedback
      </h3>
      <div className="mt-1 space-y-1.5 text-[0.7rem] text-slate-300">
        {bullets.map((b, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-2"
          >
            <p className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-500">
              {b.section}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-rose-300">
              Issue: {b.issue}
            </p>
            <p className="mt-0.5 text-[0.7rem] text-emerald-300">
              Fix: {b.fix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ATSAnalyzerPage;
