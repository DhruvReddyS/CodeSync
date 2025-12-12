// src/pages/CareerSuitePage.tsx

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaMagic, FaSearch, FaSuitcase } from "react-icons/fa";

const CareerSuitePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50">
      {/* Glow background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 left-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Career Suite · AI Powered
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Design your career stack with{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                CodeSync Career Suite
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">
              Build ATS-friendly resumes, benchmark them against real job
              descriptions, and get smart AI-curated job suggestions — all in
              one place, powered by Gemini.
            </p>
          </div>

          <div className="mt-2 flex gap-3 text-xs text-slate-400">
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Engine
              </p>
              <p className="font-medium text-slate-100">Gemini 2.5 · API</p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Mode
              </p>
              <p className="font-medium text-slate-100">Career Ops</p>
            </div>
          </div>
        </header>

        {/* Cards */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
        >
          {/* Resume Builder */}
          <CareerSuiteCard
            to="/career/resume-builder"
            icon={<FaMagic className="h-5 w-5" />}
            title="Resume Builder"
            badge="Gemini-assisted"
            description="Turn raw achievements into a polished, ATS-friendly resume. Let AI handle phrasing, sectioning, and bullet points."
            gradient="from-emerald-500/20 via-emerald-400/10 to-cyan-500/10"
            accent="border-emerald-400/40 hover:border-emerald-300"
          />

          {/* ATS Analyzer */}
          <CareerSuiteCard
            to="/career/ats-analyzer"
            icon={<FaSearch className="h-5 w-5" />}
            title="ATS Analyzer"
            badge="Job-aligned scoring"
            description="Upload your resume & paste a JD. Get an ATS-style match score, missing keywords, and concrete edits."
            gradient="from-violet-500/20 via-indigo-500/10 to-sky-500/10"
            accent="border-violet-400/40 hover:border-violet-300"
          />

          {/* Job Suggestions */}
          <CareerSuiteCard
            to="/career/job-suggestions"
            icon={<FaSuitcase className="h-5 w-5" />}
            title="Job Suggestions"
            badge="Smart search"
            description="Describe your dream role. AI curates job titles, role descriptions and skill-gap hints to target next."
            gradient="from-amber-500/20 via-orange-500/10 to-rose-500/10"
            accent="border-amber-400/40 hover:border-amber-300"
          />
        </motion.div>
      </div>
    </div>
  );
};

type CardProps = {
  to: string;
  icon: React.ReactNode;
  title: string;
  badge: string;
  description: string;
  gradient: string;
  accent: string;
};

const CareerSuiteCard: React.FC<CardProps> = ({
  to,
  icon,
  title,
  badge,
  description,
  gradient,
  accent,
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <Link
        to={to}
        className={`group relative block overflow-hidden rounded-2xl border bg-gradient-to-br ${gradient} ${accent} transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.9)]`}
      >
        {/* subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen group-hover:opacity-100">
          <div className="absolute -top-10 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/70 ring-1 ring-slate-600/60">
                {icon}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-50">
                  {title}
                </h2>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Career Suite · CodeSync
                </p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-100">
              {badge}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-slate-300">
            {description}
          </p>

          <div className="mt-auto flex items-center justify-between pt-2 text-xs">
            <span className="text-slate-400">
              Powered by{" "}
              <span className="font-semibold text-slate-100">Gemini</span>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-200">
              <span className="text-[11px] font-medium">Open tool</span>
              <span className="transition-transform group-hover:translate-x-0.5">
                ↗
              </span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CareerSuitePage;
