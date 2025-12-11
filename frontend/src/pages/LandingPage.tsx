import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiArrowRightLine,
  RiLineChartLine,
  RiTrophyLine,
  RiCalendarEventLine,
  RiCodeBoxLine,
  RiRobot2Line,
  RiBook2Line,
  RiChatSmile2Line,
  RiUserStarLine,
  RiBuilding2Line,
  RiTeamLine,
  RiShieldCheckLine,
} from "react-icons/ri";

/* ----------------- TYPES & DATA ----------------- */

type StatItem = {
  label: string;
  target: number;
  suffix?: string;
};

const STATS: StatItem[] = [
  { label: "Problems tracked", target: 2500000, suffix: "+" },
  { label: "Contests analysed", target: 45000, suffix: "+" },
  { label: "Students onboarded", target: 12000, suffix: "+" },
  { label: "Platforms unified", target: 9, suffix: "+" },
];

const PLATFORMS = [
  { name: "LeetCode", color: "text-violet-300" },
  { name: "Codeforces", color: "text-sky-300" },
  { name: "CodeChef", color: "text-orange-300" },
  { name: "GitHub", color: "text-slate-100" },
  { name: "GeeksforGeeks", color: "text-emerald-300" },
  { name: "HackerRank", color: "text-amber-300" },
  { name: "AtCoder", color: "text-cyan-300" },
  { name: "HackerEarth", color: "text-blue-300" },
  { name: "Code360", color: "text-pink-300" },
];

const FEATURE_BLOCKS = [
  {
    icon: RiLineChartLine,
    eyebrow: "1 · Multi-platform dashboard",
    title: "A single home for all your coding progress.",
    desc: "CodeSync transforms your activity from every platform into one intelligent dashboard — so you know exactly where you stand, what you’ve mastered, and what to improve next.",
    points: [
      "Consolidated stats from LeetCode, CF, CC, GFG, HR, GitHub & more",
      "Daily / weekly activity graphs and streak timelines",
      "Topic, difficulty and tag-level insights across platforms",
    ],
  },
  {
    icon: RiTrophyLine,
    eyebrow: "2 · Smart leaderboards",
    title: "Rankings tuned for real performance — not one lucky contest.",
    desc: "Dynamic leaderboards that reflect your sustained coding depth. Ideal for labs, CP clubs, techfests, hackathons and internal assessments.",
    points: [
      "Leaderboards by branch, year, batch, section & custom cohorts",
      "Auto-refresh every 12 hours from live platform stats",
      "Export-ready views for faculty reviews and event results",
    ],
  },
  {
    icon: RiChatSmile2Line,
    eyebrow: "3 · AI doubt assistant + CodePad",
    title: "Your coding companion that explains, not spoon-feeds.",
    desc: "Write, run and debug code in an integrated CodePad, assisted by an AI tuned to explain logic, spot patterns and suggest test cases — without dumping full contest solutions.",
    points: [
      "Multi-language CodePad — C, C++, Java, Python & JavaScript",
      "Ask “why is this TLE?”, “where’s the bug?”, “give edge cases”",
      "Learning-first AI prompts crafted for real conceptual growth",
    ],
  },
  {
    icon: RiCalendarEventLine,
    eyebrow: "4 · Contests calendar",
    title: "Every contest. Every platform. One calm schedule.",
    desc: "Stop jumping between websites. CodeSync aggregates contests across major platforms into a simple, readable feed with your participation story layered on top.",
    points: [
      "Upcoming contests from LC, CF, CC, AtCoder, HE & more",
      "Highlight which contests friends or batchmates are joining",
      "Contest history and rating trends in one place",
    ],
  },
  {
    icon: RiRobot2Line,
    eyebrow: "5 · Career Suite",
    title: "From coding profile to placement profile.",
    desc: "CodeSync converts your stats, contests and projects into recruiter-friendly material — with tools to refine your resume and surface relevant opportunities.",
    points: [
      "ATS analyzer with clear, actionable improvements",
      "AI resume builder powered by real CodeSync data",
      "Job recommendation layer aligned with your skills & activity",
    ],
  },
  {
    icon: RiBook2Line,
    eyebrow: "6 · Resources hub",
    title: "Mind maps, courses and sheets — aligned with your progress.",
    desc: "Not just a dump of links. CodeSync connects your performance to curated resources so every revision session is focused and intentional.",
    points: [
      "Mind maps for DSA and core CS (OS, DBMS, CN, OOP)",
      "Playlists, courses and problem sheets by topic & difficulty",
      "Campus / club-specific bootcamps tied to real performance",
    ],
  },
];

const HOW_STEPS = [
  {
    label: "Step 1",
    title: "Connect your platforms",
    desc: "Sign in with Google and link your coding profiles. No passwords stored — we only read public / authorised stats.",
  },
  {
    label: "Step 2",
    title: "Let CodeSync do the heavy lifting",
    desc: "We fetch, clean and stitch your data into dashboards, leaderboards and timelines that are easy to read.",
  },
  {
    label: "Step 3",
    title: "Share one link when it matters",
    desc: "Use your CodeSync profile for clubs, fests, internships and placements instead of sending screenshots and spreadsheets.",
  },
];

const SECURITY_POINTS = [
  "OAuth-based login — no raw passwords handled by CodeSync.",
  "Read-only access to coding platforms; we never submit code for you.",
  "Data encrypted in transit; access is scoped to your own profile.",
  "Institute views are aggregated and anonymised where needed.",
];

/* ----------------- MAIN PAGE ----------------- */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#050509] text-slate-100 font-display overflow-x-hidden">
      {/* HERO */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-14">
          {/* LEFT */}
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/80 px-4 py-1 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              CodeSync · Competitive Programming Command Center
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              Your entire coding journey,{" "}
              <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                organised with intent
              </span>{" "}
              in one dashboard.
            </h1>

            <p className="max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
              Connect all your competitive programming profiles and watch
              CodeSync convert scattered progress into a clean, intelligent
              dashboard — designed for growth, clarity and precision.
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              {/* Student CTA → Auth, student mode */}
              <button
                onClick={() => navigate("/auth?mode=student")}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-7 py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.6)] hover:bg-sky-400 active:scale-95 transition"
              >
                Get started with Google
                <RiArrowRightLine className="text-lg" />
              </button>

              {/* Teacher CTA → Auth, instructor mode */}
              <button
                onClick={() => navigate("/auth?mode=instructor")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-7 py-3 text-sm sm:text-base text-slate-100 hover:bg-slate-900/70 transition"
              >
                Teacher login
              </button>

              <a
                href="#features"
                className="rounded-full border border-slate-700 px-7 py-3 text-sm sm:text-base text-slate-100 hover:bg-slate-900/70 transition"
              >
                Explore features
              </a>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-500">
              Read-only analytics · OAuth sign-in · Built for students, campuses
              and CP clubs.
            </p>
          </div>

          {/* RIGHT – snapshot card */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-black/90 p-6 shadow-[0_0_30px_rgba(15,23,42,0.8)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Today&apos;s snapshot
                </span>
                <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live sync every 12h
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <MiniStat label="Solved this week" value="132" />
                <MiniStat label="Active platforms" value="7" />
                <MiniStat label="Contests this month" value="12" />
                <MiniStat label="Current streak" value="23 days" />
              </div>

              <div className="mt-3 rounded-2xl border border-slate-800 bg-[#050812] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-300">
                    Last 7 days submissions
                  </span>
                  <span className="text-[11px] text-emerald-300">+18%</span>
                </div>
                <div className="flex items-end gap-1.5 h-20">
                  {[20, 45, 35, 70, 50, 65, 40].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-full bg-gradient-to-t from-slate-800 via-sky-400 to-emerald-300"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                  <span>M</span>
                  <span>T</span>
                  <span>W</span>
                  <span>T</span>
                  <span>F</span>
                  <span>S</span>
                  <span>S</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS – all 9 platforms */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-12">
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl text-slate-300">
            Integrate with your favourite platforms
          </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
            One unified coding identity across LeetCode, Codeforces, CodeChef,
            GFG, HackerRank, GitHub, AtCoder, HackerEarth and Code360.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {PLATFORMS.map((p) => (
            <div
              key={p.name}
              className="inline-flex items-center rounded-full border border-slate-800 bg-[#111318] px-4 py-2 text-sm shadow-[0_0_10px_rgba(15,23,42,0.7)]"
            >
              <span className={`font-medium ${p.color}`}>{p.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <span className="inline-flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live stats updating every 12 hours
          </span>
        </div>
      </section>

      {/* STATS ROW */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-black/90 px-6 sm:px-10 py-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* FEATURES – ALTERNATING */}
      <section
        id="features"
        className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-20 space-y-12"
      >
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything around your{" "}
            <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
              coding journey
            </span>{" "}
            in one calm layout.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Dashboard, leaderboards, AI assistant, multi-language CodePad,
            contests calendar, career suite and resources — all stitched into a
            subtle black + neon experience.
          </p>
        </div>

        <div className="space-y-14">
          {FEATURE_BLOCKS.map((block, i) => (
            <FeatureRow key={block.title} block={block} reversed={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-black/90 p-6 sm:p-8 space-y-8">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold">
              How CodeSync fits into your routine.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              No new platform to “shift” to. You keep coding where you
              already code — CodeSync quietly stays on top of everything.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-800 bg-[#05060b] p-5 space-y-3"
              >
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {step.label}
                </span>
                <h3 className="text-sm sm:text-base font-semibold">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECURITY & PRIVACY */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-18">
        <div className="rounded-3xl border border-slate-800 bg-black/90 p-6 sm:p-8 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#05060b] px-3 py-1 text-[11px] text-slate-300">
              <RiShieldCheckLine className="text-sky-400" />
              Security & Privacy
            </div>
            <h2 className="text-2xl font-bold">
              Designed to be safe for students and campuses.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              CodeSync only needs enough access to read your stats and activity.
              It never modifies your profiles or submits code on your behalf.
            </p>
          </div>

          <div className="space-y-2">
            {SECURITY_POINTS.map((p) => (
              <div key={p} className="flex gap-3 text-xs sm:text-sm text-slate-300">
                <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-18">
        <div className="rounded-3xl border border-slate-800 bg-black/90 p-6 sm:p-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Built for{" "}
              <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                students, faculty and clubs.
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
              Students keep grinding on their favourite platforms. CodeSync
              quietly tracks, organises and presents it for labs, clubs and
              placements.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <RoleCard
              icon={RiUserStarLine}
              title="Students"
              points={[
                "One clean link for your entire coding identity",
                "Instant view of streaks, contests, topics and ratings",
                "Use CodeSync profile with resumes, portfolios and interviews",
              ]}
            />
            <RoleCard
              icon={RiBuilding2Line}
              title="Faculty & Departments"
              points={[
                "Monitor CP and lab activity without spreadsheets",
                "Identify top performers and students who need support",
                "Export stats for reviews, reports and accreditation",
              ]}
            />
            <RoleCard
              icon={RiTeamLine}
              title="Clubs & Organisers"
              points={[
                "Create cohorts for contests, fests and hackathons",
                "Shortlist using verified multi-platform performance",
                "Showcase top coders during events and ceremonies",
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-black via-[#050815] to-black px-6 sm:px-10 py-10 sm:py-14">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute right-[-10%] top-[-10%] h-56 w-56 rounded-full bg-sky-500/30 blur-[110px]" />
            <div className="absolute left-[-5%] bottom-[-15%] h-56 w-56 rounded-full bg-fuchsia-500/30 blur-[110px]" />
          </div>

          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Your coding work deserves a place{" "}
                <span className="text-transparent bg-[linear-gradient(90deg,#38bdf8,#a855f7,#f97373)] bg-clip-text">
                  that reflects your effort.
                </span>
              </h2>
              <p className="text-sm sm:text-base text-slate-200">
                CodeSync quietly tracks everything you solve, attempt, learn and
                compete in — so you can focus on improving while we build the
                profile you’ll proudly share.
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Perfect for SIH teams, techfests, CP clubs and placement
                seasons where numbers speak louder than buzzwords.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => navigate("/auth?mode=student")}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-7 py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.7)] hover:bg-sky-400 active:scale-95 transition"
              >
                Start CodeSync
                <RiArrowRightLine className="text-lg" />
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-full border border-slate-600 px-6 py-3 text-sm sm:text-base text-slate-100 hover:bg-slate-900/70 transition"
              >
                View sample dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs sm:text-sm text-slate-500">
        CodeSync · Black + subtle neon · 2025
      </footer>
    </div>
  );
};

export default LandingPage;

/* ----------------- SMALL COMPONENTS ----------------- */

function AnimatedNumber({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let current = 0;
    const duration = 1400;
    const steps = 60;
    const increment = target / steps;
    const interval = duration / steps;

    const id = window.setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        window.clearInterval(id);
      }
      setValue(Math.floor(current));
    }, interval);

    return () => window.clearInterval(id);
  }, [target]);

  const formatted =
    target > 100000 ? `${value.toLocaleString()}+` : value.toLocaleString();

  return <>{formatted}</>;
}

function StatCard({ label, target, suffix }: StatItem) {
  return (
    <div className="space-y-1">
      <div className="text-2xl sm:text-3xl font-semibold text-slate-50">
        <AnimatedNumber target={target} />
        {suffix ?? ""}
      </div>
      <div className="text-sm font-medium text-slate-200">{label}</div>
      <div className="h-[1px] w-12 bg-gradient-to-r from-sky-400 to-fuchsia-400 rounded-full" />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#050710] p-3">
      <div className="text-sm font-semibold text-slate-100">{value}</div>
      <div className="mt-1 text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

type FeatureBlock = (typeof FEATURE_BLOCKS)[number];

function FeatureRow({
  block,
  reversed,
}: {
  block: FeatureBlock;
  reversed: boolean;
}) {
  const Icon = block.icon;

  return (
    <div
      className={`flex flex-col items-center gap-10 md:gap-14 ${
        reversed ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      {/* Visual (25%) */}
      <div className="w-full md:w-1/3">
        <div className="relative aspect-[4/3] rounded-3xl border border-slate-800 bg-black p-4 shadow-[0_0_20px_rgba(15,23,42,0.8)]">
          <div className="flex h-full flex-col justify-between rounded-2xl bg-[#050710] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                CodeSync
              </div>
              <div className="flex gap-1.5">
                <span className="h-1 w-4 rounded-full bg-sky-400/80" />
                <span className="h-1 w-4 rounded-full bg-fuchsia-400/80" />
                <span className="h-1 w-4 rounded-full bg-emerald-400/80" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-sky-300 text-xl">
                <Icon />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Preview
                </p>
                <p className="text-sm text-slate-100 line-clamp-2">
                  {block.title}
                </p>
              </div>
            </div>

            <div className="mt-3 h-[1px] w-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400" />

            <p className="mt-2 text-[11px] text-slate-400">
              Placeholder visual. Later you can drop in a real screenshot of
              your analytics, leaderboard, AI CodePad or resources page here.
            </p>
          </div>
        </div>
      </div>

      {/* Text (75%) */}
      <div className="w-full md:w-2/3 space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-slate-500">
            {block.eyebrow}
          </p>
          <h3 className="text-xl sm:text-2xl font-semibold">{block.title}</h3>
        </div>
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
          {block.desc}
        </p>
        <ul className="grid gap-1.5 text-xs sm:text-sm text-slate-300 max-w-xl">
          {block.points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  points,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/90 p-5 space-y-3 hover:border-sky-500/60 transition">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-sky-300 text-xl">
          <Icon />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ul className="space-y-1 text-xs sm:text-sm text-slate-300">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-400" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
