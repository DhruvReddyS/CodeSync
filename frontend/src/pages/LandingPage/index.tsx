// src/pages/LandingPage/index.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import {
  RiArrowRightLine,
  RiSparkling2Line,
  RiShieldCheckLine,
  RiTerminalBoxLine,
  RiCalendarEventLine,
  RiTrophyLine,
  RiLineChartLine,
  RiRobot2Line,
  RiBook2Line,
  RiPulseLine,
  RiFlashlightLine,
} from "react-icons/ri";

import {
  Dock,
  HoloCard,
  HyperBackdrop,
  OrbitParticles,
  ParallaxY,
  Reveal,
  StaggerContainer,
  StaggerItem,
  Tilt,
  useCursorGlow,
  cn,
} from "./ui";

import { PLATFORMS, ROLES, SECURITY_POINTS, STATS } from "./data";

const BRAND_GRAD =
  "text-transparent bg-clip-text bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_28%,#a78bfa_58%,#d946ef_100%)]";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;

  const [lowPower, setLowPower] = useState(false);
  const glow = useCursorGlow(lowPower);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia?.("(pointer: coarse)");

    const update = () => {
      const prefersReduced = !!reduced?.matches;
      const isCoarse = !!coarse?.matches;
      const small = window.innerWidth < 900;
      setLowPower(prefersReduced || isCoarse || small);
    };

    update();
    window.addEventListener("resize", update);

    // older safari fallback
    const add = (m?: MediaQueryList) => {
      if (!m) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyM = m as any;
      if (m.addEventListener) m.addEventListener("change", update);
      else if (anyM.addListener) anyM.addListener(update);
    };
    const remove = (m?: MediaQueryList) => {
      if (!m) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyM = m as any;
      if (m.removeEventListener) m.removeEventListener("change", update);
      else if (anyM.removeListener) anyM.removeListener(update);
    };

    add(reduced);
    add(coarse);

    return () => {
      window.removeEventListener("resize", update);
      remove(reduced);
      remove(coarse);
    };
  }, []);

  const cursorPlasma = useMotionTemplate`
    radial-gradient(760px circle at ${glow.x}px ${glow.y}px,
      rgba(34,211,238,0.18),
      rgba(96,165,250,0.12),
      rgba(167,139,250,0.10),
      rgba(217,70,239,0.08),
      transparent 62%)
  `;

  return (
    <div className="min-h-screen w-full bg-[#050509] text-slate-100 overflow-x-hidden">
      <HyperBackdrop lowMotion={lowPower} />

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-90"
        style={{ background: cursorPlasma }}
      />

      <div className="relative z-[2]">
        {/* HERO */}
        <section className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pt-16 sm:pt-20 pb-12 sm:pb-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] items-center">
            {/* LEFT */}
            <div className="space-y-7">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/55 px-4 py-1.5 text-xs text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide">
                    <span className={cn("font-semibold", BRAND_GRAD)}>CodeSync</span>{" "}
                    · Competitive Programming Command Center
                  </span>
                  <span className="ml-2 hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <RiSparkling2Line /> neural UI
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[11px] text-slate-400">
                  <RiPulseLine className="text-emerald-300" />
                  refresh cycle · cached · 12h
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.02]">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="block"
                >
                  Code globally.
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                  className="block"
                >
                  <span className={BRAND_GRAD}>Compete. Learn. Elevate.</span>
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                className="max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed"
              >
                CodeSync unifies your LeetCode, Codeforces, CodeChef, HackerRank,
                AtCoder and GitHub signals into one clean score + dashboard.
                Smart caching keeps everything fast, and background refresh keeps
                it accurate—without touching your code or profiles.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                className="flex flex-wrap gap-3 items-center"
              >
                <motion.button
                  onClick={() => navigate("/auth?mode=student")}
                  className="relative overflow-hidden inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm sm:text-base font-semibold text-slate-950 bg-cyan-300 hover:bg-cyan-200 border border-cyan-200/40 shadow-[0_0_55px_rgba(34,211,238,0.55)] transition"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 70px rgba(34,211,238,0.75)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                >
                  Get started <RiArrowRightLine className="text-lg" />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background:
                        "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 35%, transparent 70%)",
                    }}
                  />
                </motion.button>

                <motion.button
                  onClick={() => navigate("/auth?mode=instructor")}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-black/35 px-7 py-3 text-sm sm:text-base text-slate-100 hover:bg-slate-900/45 transition"
                  whileHover={{ scale: 1.02, borderColor: "rgb(100, 180, 255)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Teacher login
                </motion.button>

                <motion.a
                  href="#chambers"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-black/35 px-7 py-3 text-sm sm:text-base text-slate-100 hover:bg-slate-900/45 transition"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Enter the modules <RiFlashlightLine />
                </motion.a>
              </motion.div>

              {/* Dock */}
              <Dock
                className="mt-4 w-fit"
                items={[
                  {
                    label: "Dashboard",
                    onClick: () => scrollToId("module-dashboard"),
                    icon: <RiLineChartLine />,
                  },
                  {
                    label: "Leaderboard",
                    onClick: () => scrollToId("module-leaderboard"),
                    icon: <RiTrophyLine />,
                  },
                  {
                    label: "CodePad",
                    onClick: () => scrollToId("module-codepad"),
                    icon: <RiTerminalBoxLine />,
                  },
                  {
                    label: "CS.AI",
                    onClick: () => scrollToId("module-csai"),
                    icon: <RiSparkling2Line />,
                  },
                  {
                    label: "Contests",
                    onClick: () => scrollToId("module-contests"),
                    icon: <RiCalendarEventLine />,
                  },
                  {
                    label: "Career",
                    onClick: () => scrollToId("module-career"),
                    icon: <RiRobot2Line />,
                  },
                ]}
              />

              <div className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-2">
                <RiShieldCheckLine className="text-emerald-300" />
                OAuth · Read-only analytics · Cache + background refresh
              </div>
            </div>

            {/* RIGHT */}
            <ParallaxY strength={44} disabled={lowPower}>
              <Tilt className="will-change-transform">
                <HoloCard className="p-5 sm:p-6 relative">
                  <OrbitParticles className="opacity-70" count={lowPower ? 4 : 10} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Unified Signal Engine
                      </div>
                      <div className="text-[11px] text-slate-500">cache · queue · normalize</div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-slate-800 bg-black/45 p-4 sm:p-5 overflow-hidden relative">
                      <div className="absolute inset-0 opacity-70 pointer-events-none">
                        <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-cyan-400/14 blur-[120px]" />
                        <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full bg-violet-400/14 blur-[120px]" />
                        <div className="absolute left-[35%] -bottom-36 h-80 w-80 rounded-full bg-fuchsia-400/12 blur-[140px]" />
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-cyan-300" />
                            score build pipeline
                          </div>
                          <div className="text-[11px] text-emerald-300">fresh · 12h cycle</div>
                        </div>

                        <Reactor reduce={reduce || lowPower} />

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <HoloStat label="Cache hit rate" value="92%" />
                          <HoloStat label="Avg refresh" value="11.8s" />
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <HoloStat label="Normalized score" value="0–100" />
                          <HoloStat label="Read-only" value="Always" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-slate-800 bg-black/35 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        refresh log
                      </div>
                      <div className="mt-2 font-mono text-[11px] text-slate-300">
                        <span className="text-emerald-300">$</span> codesync refresh{" "}
                        <span className="text-cyan-300">--delta</span>{" "}
                        <span className="text-violet-300">--cache</span>{" "}
                        <span className="text-fuchsia-300">--score</span>
                        <div className="mt-1 text-slate-500">
                          → cached pages · instant loads · background updates
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-2">
                      <RiShieldCheckLine className="text-emerald-300" />
                      No submissions · no edits · only analytics
                    </div>
                  </div>
                </HoloCard>
              </Tilt>
            </ParallaxY>
          </div>
        </section>

        {/* STATS */}
        <section className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-12 sm:pb-16">
          <Reveal>
            <HoloCard className="p-6 sm:p-8">
              <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map((s, i) => (
                  <StaggerItem key={s.label}>
                    <Tilt>
                      <motion.div
                        className="rounded-3xl border border-slate-800 bg-black/35 p-4 sm:p-5 relative overflow-hidden group"
                        whileHover={{
                          scale: 1.02,
                          borderColor: "rgb(34, 211, 238)",
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-80"
                          style={{
                            background:
                              i % 3 === 0
                                ? "radial-gradient(520px circle at 15% 15%, rgba(34,211,238,0.18), transparent 60%)"
                                : i % 3 === 1
                                ? "radial-gradient(520px circle at 15% 15%, rgba(167,139,250,0.16), transparent 60%)"
                                : "radial-gradient(520px circle at 15% 15%, rgba(217,70,239,0.14), transparent 60%)",
                          }}
                        />
                        <div className="relative">
                          <div className="text-2xl sm:text-3xl font-semibold text-slate-50">
                            <AnimatedNumber
                              target={s.target}
                              suffix={s.suffix}
                              animate={!lowPower}
                            />
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-200">
                            {s.label}
                          </div>
                          <div className="mt-2 text-[11px] text-slate-500">
                            {s.hint ?? "cached · unified · fast"}
                          </div>
                          <motion.div
                            className="mt-3 h-[2px] w-16 rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa,#d946ef)]"
                            initial={{ width: 0 }}
                            whileInView={{ width: 64 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                          />
                        </div>
                      </motion.div>
                    </Tilt>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </HoloCard>
          </Reveal>
        </section>

        {/* INTEGRATIONS */}
        <section className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-14 sm:pb-18">
          <Reveal>
            <HoloCard className="p-6 sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-base sm:text-lg font-semibold">
                    Platforms become <span className={BRAND_GRAD}>one identity</span>
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-slate-400">
                    Unified stats + consistent scoring across everything you already use.
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Cached pages · refreshed in background
                </div>
              </div>

              <div className="mt-5">
                <PlatformMarquee platforms={PLATFORMS} />
              </div>
            </HoloCard>
          </Reveal>
        </section>

        {/* FEATURE CHAMBERS */}
        <section id="chambers" className="w-full pb-8">
          <FeatureChambers
            brandGrad={BRAND_GRAD}
            reduce={reduce || lowPower}
            onStart={() => navigate("/auth?mode=student")}
          />
        </section>

        {/* ROLES */}
        <section className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16 sm:pb-20">
          <Reveal>
            <HoloCard className="p-6 sm:p-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Built for <span className={BRAND_GRAD}>students, faculty and clubs</span>.
                </h2>
                <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                  Students grind. CodeSync turns it into premium dashboards—perfect for reports,
                  clubs and placements.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <StaggerContainer className="contents">
                  {ROLES.map((r) => (
                    <StaggerItem key={r.title}>
                      <Tilt>
                        <motion.div
                          className="rounded-3xl border border-slate-800 bg-[#060812] p-5 hover:border-cyan-400/40 transition"
                          whileHover={{ borderColor: "rgb(34, 211, 238)", y: -4 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center gap-3">
                            <motion.div
                              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-black/40 text-cyan-300 text-xl"
                              whileHover={{ scale: 1.1, rotate: 5 }}
                            >
                              <r.icon />
                            </motion.div>
                            <div className="text-base font-semibold">{r.title}</div>
                          </div>

                          <div className="mt-4 space-y-2">
                            {r.points.map((p: string, idx: number) => (
                              <motion.div
                                key={`${r.title}-${idx}`}
                                className="flex gap-2 text-sm text-slate-200"
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                viewport={{ once: true }}
                              >
                                <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-cyan-300" />
                                <span className="leading-relaxed">{p}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </Tilt>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </HoloCard>
          </Reveal>
        </section>

        {/* SECURITY */}
        <section className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16 sm:pb-20">
          <Reveal>
            <HoloCard className="p-6 sm:p-8">
              <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/45 px-3 py-1 text-[11px] text-slate-300">
                    <RiShieldCheckLine className="text-cyan-300" />
                    Security & Privacy
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Privacy-first. Read-only. <span className={BRAND_GRAD}>Built for trust.</span>
                  </h2>
                  <p className="text-sm text-slate-400 max-w-xl">
                    CodeSync reads what it needs to build analytics. Caching speeds up every view.
                    Background refresh keeps the data current—without modifying anything on your accounts.
                  </p>
                </div>

                <div className="space-y-2">
                  {SECURITY_POINTS.map((p: string, idx: number) => (
                    <div
                      key={`${idx}-${p.slice(0, 18)}`}
                      className="rounded-2xl border border-slate-800 bg-[#060812] p-3"
                    >
                      <div className="flex gap-2 text-sm text-slate-200">
                        <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-cyan-300" />
                        <span className="leading-relaxed">{p}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </HoloCard>
          </Reveal>
        </section>

        {/* CTA */}
        <section className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16 sm:pb-20">
          <Reveal>
            <HoloCard className="p-7 sm:p-10">
              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[linear-gradient(90deg,rgba(0,0,0,0.55),rgba(6,8,18,0.80),rgba(0,0,0,0.55))] p-7 sm:p-10">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-75">
                  <div className="absolute right-[-12%] top-[-20%] h-72 w-72 rounded-full bg-cyan-400/14 blur-[120px]" />
                  <div className="absolute left-[-10%] bottom-[-30%] h-72 w-72 rounded-full bg-violet-400/14 blur-[120px]" />
                  <div className="absolute left-[35%] top-[30%] h-64 w-64 rounded-full bg-fuchsia-400/12 blur-[120px]" />
                </div>

                <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-center">
                  <div className="space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                      final call
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Make your coding work look <span className={BRAND_GRAD}>elite</span>.
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      One link for your entire coding identity. Fast loads with caching.
                      Accurate analytics with scheduled refresh.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                    <motion.button
                      onClick={() => navigate("/auth?mode=student")}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-7 py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-[0_0_55px_rgba(34,211,238,0.55)] hover:bg-cyan-200 transition"
                      whileHover={{
                        scale: 1.06,
                        boxShadow: "0 0 80px rgba(34,211,238,0.9)",
                        background: "rgb(165, 243, 252)",
                      }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    >
                      Start CodeSync <RiArrowRightLine className="text-lg" />
                    </motion.button>

                    <motion.button
                      onClick={() => navigate("/auth?mode=instructor")}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-black/35 px-7 py-3 text-sm sm:text-base text-slate-100 hover:bg-slate-900/45 transition"
                      whileHover={{ scale: 1.04, borderColor: "rgb(100, 180, 255)" }}
                      whileTap={{ scale: 0.96 }}
                    >
                      Institute login
                    </motion.button>
                  </div>
                </div>

                <div className="mt-6 text-[11px] text-slate-500 flex items-center gap-2">
                  <RiShieldCheckLine className="text-emerald-300" />
                  OAuth · Read-only analytics · Privacy-first
                </div>
              </div>
            </HoloCard>
          </Reveal>
        </section>

        <footer className="border-t border-slate-900 py-8 text-center">
          <div className="text-xs sm:text-sm text-slate-500">
            <span className={cn("font-semibold", BRAND_GRAD)}>CodeSync</span> · Neural black + neon · 2026
          </div>
          <div className="mt-2 text-[11px] text-slate-600">
            Built for students, campuses and CP clubs · Cached views · Scheduled refresh
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;

/* =====================================================================================
  Platforms marquee: LOGO + NAME BELOW
===================================================================================== */

function PlatformMarquee({
  platforms,
}: {
  platforms: Array<{ name: string; logoUrl: string }>;
}) {
  const reduce = useReducedMotion() ?? false;
  const loop = useMemo(() => [...platforms, ...platforms], [platforms]);

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-black/80 to-transparent z-[2]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-black/80 to-transparent z-[2]"
      />

      <motion.div
        className="flex w-max gap-3 sm:gap-5 py-2"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={reduce ? undefined : { duration: 20, ease: "linear", repeat: Infinity }}
      >
        {loop.map((p, idx) => (
          <PlatformTile key={`${p.name}-${idx}`} name={p.name} logoUrl={p.logoUrl} />
        ))}
      </motion.div>
    </div>
  );
}

function PlatformTile({ name, logoUrl }: { name: string; logoUrl: string }) {
  return (
    <div
      className={cn(
        "relative group shrink-0",
        "w-[104px] sm:w-[120px] md:w-[132px]",
        "rounded-3xl border border-slate-800 bg-[#060812]/70 backdrop-blur-xl",
        "px-4 py-4",
        "shadow-[0_0_40px_rgba(0,0,0,0.55)]",
        "transition duration-300 hover:-translate-y-[2px] hover:border-cyan-300/40"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500"
        style={{
          background:
            "radial-gradient(520px circle at 30% 25%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(520px circle at 70% 75%, rgba(167,139,250,0.14), transparent 60%)",
        }}
      />

      <div className="relative flex flex-col items-center justify-center gap-2">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 transition duration-500"
            style={{
              background:
                "radial-gradient(circle, rgba(34,211,238,0.22), rgba(167,139,250,0.14), transparent 65%)",
              filter: "blur(10px)",
            }}
          />
          <img
            src={logoUrl}
            alt={name}
            className={cn(
              "relative h-10 w-10 sm:h-11 sm:w-11",
              "drop-shadow-[0_0_18px_rgba(34,211,238,0.22)]",
              "group-hover:scale-[1.06] transition duration-300"
            )}
            loading="lazy"
          />
        </div>

        <div className="text-[12px] sm:text-[13px] font-semibold text-slate-200 text-center leading-tight">
          {name}
        </div>

        <div className="h-[2px] w-10 rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa,#d946ef)] opacity-60 group-hover:opacity-100 transition duration-300" />
      </div>
    </div>
  );
}

/* =====================================================================================
  CHAMBERS
===================================================================================== */

function FeatureChambers({
  brandGrad,
  reduce,
  onStart,
}: {
  brandGrad: string;
  reduce: boolean;
  onStart: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  const bg1 = useTransform(scrollYProgress, [0, 1], [0.12, 0.22]);
  const bg2 = useTransform(scrollYProgress, [0, 1], [0.1, 0.18]);

  const morphBg = useMotionTemplate`
    radial-gradient(1200px circle at 20% 15%, rgba(34,211,238,${bg1}), transparent 55%),
    radial-gradient(1200px circle at 80% 65%, rgba(167,139,250,${bg2}), transparent 60%),
    radial-gradient(900px circle at 50% 110%, rgba(217,70,239,0.10), transparent 60%)
  `;

  const chambers = useMemo(() => {
    const signatures = [
      { id: "module-dashboard", icon: <RiLineChartLine />, sub: "Unified dashboard", vibe: "signal → clarity" },
      { id: "module-leaderboard", icon: <RiTrophyLine />, sub: "Leaderboards", vibe: "consistency → rank" },
      { id: "module-codepad", icon: <RiTerminalBoxLine />, sub: "CodePad", vibe: "write → run" },
      { id: "module-csai", icon: <RiSparkling2Line />, sub: "CS.AI mentor", vibe: "ask → understand" },
      { id: "module-contests", icon: <RiCalendarEventLine />, sub: "Contest calendar", vibe: "plan → compete" },
      { id: "module-career", icon: <RiRobot2Line />, sub: "Career suite", vibe: "skills → offers" },
      { id: "module-resources", icon: <RiBook2Line />, sub: "Resources hub", vibe: "weakness → mastery" },
    ];

    const content = [
      {
        title: "Unified Dashboard",
        desc:
          "A single, premium overview of your coding identity: unified score, platform breakdown, consistency signals, and trends — with caching for instant loads.",
        points: [
          "Unified CodeSync Score (0–100)",
          "Platform-wise breakdown (solved/rating/contests)",
          "Streak & consistency insights",
          "Cache + background refresh status",
        ],
      },
      {
        title: "Leaderboards",
        desc:
          "Compare students fairly across platforms using a normalized score. Filter by year/branch/section and open any profile for deep insights.",
        points: [
          "Fair normalized ranking",
          "Filters: year / branch / section",
          "Student profile drill-down",
          "Badges for consistency & growth",
        ],
      },
      {
        title: "CodePad",
        desc:
          "A clean coding workspace to practice: select language, run code, test with custom input, and keep drafts organized.",
        points: [
          "Language picker + run output",
          "Custom stdin input",
          "Save drafts / snippets",
          "Error-friendly output panel",
        ],
      },
      {
        title: "CS.AI Doubt Assistant",
        desc:
          "An AI mentor that explains concepts clearly: intuition-first hints, edge cases, complexity, and follow-ups — without dumping full solutions.",
        points: [
          "Intuition-first explanation",
          "Edge cases & pitfalls",
          "Time/space complexity",
          "Hint mode (no spoilers)",
        ],
      },
      {
        title: "Contest Calendar",
        desc:
          "All contests in one calendar. Filter by platform, view upcoming events, and plan your week like a pro.",
        points: [
          "Platform filters (LC/CF/CC/AT…)",
          "Upcoming contests list",
          "Reminder-ready design",
          "Clean month/week/day views",
        ],
      },
      {
        title: "Career Suite",
        desc:
          "Career tools built into the CP workflow: resume builder, ATS analyzer, JD match, and job suggestions — made for placements.",
        points: [
          "AI resume builder",
          "ATS & JD match score",
          "Job suggestions & skill gaps",
          "Portfolio-ready profile export",
        ],
      },
      {
        title: "Resources Hub",
        desc:
          "Curated tracks and resources based on your weaknesses. Filter by level, topic, and format — bookmark and learn faster.",
        points: [
          "Tracks by level & topic",
          "Filters: DSA / CP / Web / CS Core",
          "Bookmarks & progress-ready",
          "Curated “best-first” picks",
        ],
      },
    ];

    return content.map((b, i) => ({ ...b, sig: signatures[i] }));
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: morphBg }}
      />

      <div className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40">
        <Reveal>
          <div className="pt-2 pb-10 sm:pb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/45 px-3 py-1 text-[11px] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="uppercase tracking-[0.22em]">feature chambers</span>
            </div>

            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
              Every module gets a <span className={brandGrad}>signature presence</span>.
            </h2>

            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Cinematic, premium, futuristic—while still describing the real product:
              unified scoring, caching, and refresh.
            </p>
          </div>
        </Reveal>
      </div>

      <div className="space-y-10 sm:space-y-14 pb-10 sm:pb-14">
        {chambers.map((c, idx) => (
          <Chamber
            key={`${c.title}-${idx}`}
            id={c.sig.id}
            idx={idx}
            brandGrad={brandGrad}
            title={c.title}
            desc={c.desc}
            points={c.points}
            icon={c.sig.icon}
            sub={c.sig.sub}
            vibe={c.sig.vibe}
            reduce={reduce}
            cta={idx === 0 ? { label: "Start now", onClick: onStart } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function Chamber({
  id,
  idx,
  brandGrad,
  title,
  sub,
  vibe,
  desc,
  points,
  icon,
  reduce,
  cta,
}: {
  id: string;
  idx: number;
  brandGrad: string;
  title: string;
  sub: string;
  vibe: string;
  desc: string;
  points: string[];
  icon: React.ReactNode;
  reduce: boolean;
  cta?: { label: string; onClick: () => void };
}) {
  const reversed = idx % 2 === 1;
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const y = useTransform(scrollYProgress, [0, 1], [26, -26]);
  const rot = useTransform(scrollYProgress, [0, 1], reversed ? [5, -5] : [-5, 5]);
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], [0.08, 0.22, 0.08]);

  return (
    <div id={id} className="w-full px-5 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 scroll-mt-28">
      <div
        ref={ref}
        className={cn(
          "grid gap-8 lg:gap-12 items-center",
          reversed
            ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            : "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        )}
      >
        <Reveal>
          <motion.div
            style={reduce ? undefined : { y, rotateZ: rot }}
            className={cn(reversed ? "lg:order-2" : "", "will-change-transform")}
          >
            <Tilt>
              <HoloCard className="p-5 sm:p-6 relative overflow-hidden">
                <OrbitParticles className="opacity-70" count={4} />

                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    opacity: glow,
                    background:
                      "radial-gradient(900px circle at 25% 25%, rgba(34,211,238,0.28), transparent 55%), radial-gradient(900px circle at 70% 70%, rgba(167,139,250,0.22), transparent 60%), radial-gradient(900px circle at 40% 90%, rgba(217,70,239,0.16), transparent 60%)",
                  }}
                />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      module {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="text-[11px] text-slate-500">{vibe}</div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-[#070a14] text-cyan-300 text-xl">
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className={cn("text-[11px] uppercase tracking-[0.28em]", brandGrad)}>
                        {sub}
                      </div>
                      <div className="text-sm font-semibold text-slate-100 truncate">{title}</div>
                    </div>
                  </div>

                  {/* fixed viewport */}
                  <div className="mt-5">
                    <div className="min-h-[380px] sm:min-h-[400px]">
                      {idx === 0 && <ArtifactDashboard />}
                      {idx === 1 && <ArtifactLeaderboard />}
                      {idx === 2 && <ArtifactCodePad />}
                      {idx === 3 && <ArtifactDoubtAssistant />}
                      {idx === 4 && <ArtifactCalendar />}
                      {idx === 5 && <ArtifactCareer />}
                      {idx === 6 && <ArtifactResources />}
                    </div>
                  </div>

                  {cta && (
                    <div className="mt-5">
                      <button
                        onClick={cta.onClick}
                        className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_55px_rgba(34,211,238,0.50)] hover:bg-cyan-200 transition active:scale-[0.98]"
                      >
                        {cta.label} <RiArrowRightLine />
                      </button>
                    </div>
                  )}
                </div>
              </HoloCard>
            </Tilt>
          </motion.div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className={cn(reversed ? "lg:order-1" : "")}>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{sub}</div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  <span className={brandGrad}>{title}</span>
                </h3>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">{desc}</p>

              <div className="grid gap-2 sm:grid-cols-2 max-w-2xl">
                {points.map((p, i) => (
                  <div key={`${id}-point-${i}`} className="rounded-2xl border border-slate-800 bg-black/35 p-3">
                    <div className="flex gap-2 text-xs sm:text-sm text-slate-200">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      <span className="leading-relaxed">{p}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <RiShieldCheckLine className="text-emerald-300" />
                Premium UI with product-accurate messaging.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* =====================================================================================
  ARTIFACTS — FIXED (responsive + consistent + no TS union issues)
===================================================================================== */

function ArtifactShell({
  title,
  subtitle,
  rightSlot,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-slate-800",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]",
        "shadow-[0_0_40px_rgba(0,0,0,0.55)]",
        "p-4 sm:p-5 flex flex-col",
        "min-h-[380px] sm:min-h-[400px]",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(700px circle at 15% 10%, rgba(34,211,238,0.10), transparent 55%), radial-gradient(700px circle at 85% 75%, rgba(167,139,250,0.08), transparent 60%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] sm:text-[14px] font-semibold text-slate-100 tracking-tight truncate">
            {title}
          </div>
          <div className="mt-1 text-[11px] sm:text-[12px] text-slate-500 leading-relaxed">
            {subtitle}
          </div>
        </div>
        {rightSlot}
      </div>

      <div className="relative mt-4 flex-1 min-h-0">{children}</div>

      <div className="relative mt-4 flex items-center justify-between text-[10px] text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          preview · dummy data
        </span>
        <span className="text-slate-500">consistent layout</span>
      </div>
    </div>
  );
}

type PillTone =
  | "slate"
  | "cyan"
  | "violet"
  | "emerald"
  | "amber"
  | "fuchsia"
  | "pink"
  | "sky"
  | "yellow"
  | "teal";

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: PillTone;
}) {
  const cls =
    tone === "cyan"
      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
      : tone === "violet"
      ? "border-violet-300/25 bg-violet-300/10 text-violet-200"
      : tone === "emerald"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
      : tone === "amber"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-200"
      : tone === "fuchsia"
      ? "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-200"
      : tone === "pink"
      ? "border-pink-300/25 bg-pink-300/10 text-pink-200"
      : tone === "sky"
      ? "border-sky-300/25 bg-sky-300/10 text-sky-200"
      : tone === "yellow"
      ? "border-yellow-300/25 bg-yellow-300/10 text-yellow-200"
      : tone === "teal"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200"
      : "border-slate-700 bg-black/35 text-slate-300";

  return (
    <div className={cn("rounded-full border px-3 py-1 text-[10px] whitespace-nowrap", cls)}>
      {children}
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800 bg-[#060812]",
        "p-3 sm:p-4 h-full flex flex-col",
        "min-h-0",
        className
      )}
    >
      {children}
    </div>
  );
}

function MiniCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "violet" | "emerald" | "amber";
}) {
  const valCls =
    tone === "cyan"
      ? "text-cyan-200"
      : tone === "violet"
      ? "text-violet-200"
      : tone === "emerald"
      ? "text-emerald-200"
      : tone === "amber"
      ? "text-amber-200"
      : "text-slate-100";

  return (
    <div className="rounded-2xl border border-slate-800 bg-black/30 p-3 min-h-[86px]">
      <div className="text-[10px] text-slate-500 uppercase tracking-[0.18em]">{title}</div>
      <div className={cn("mt-1 text-[18px] font-semibold leading-none", valCls)}>{value}</div>
      {hint && <div className="mt-2 text-[10px] text-slate-600">{hint}</div>}
    </div>
  );
}

/* ---- MODULE ARTIFACTS (clean, aligned, responsive, no overflow) ---- */

function ArtifactDashboard() {
  return (
    <ArtifactShell
      title="Unified Dashboard"
      subtitle="Your complete coding identity in one view — cached for instant loads."
      rightSlot={<Pill tone="emerald">Cache: ON</Pill>}
    >
      <Panel>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Pill tone="cyan">Score 0–100</Pill>
            <Pill>Background refresh</Pill>
            <Pill tone="violet">6 platforms</Pill>
          </div>
          <Pill tone="cyan">Sync now</Pill>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MiniCard title="CodeSync Score" value="0" hint="Waiting for first sync" tone="cyan" />
          <MiniCard title="Consistency" value="—" hint="Streak & activity after sync" tone="emerald" />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { name: "LeetCode", meta: "solved · difficulty split" },
            { name: "Codeforces", meta: "rating · contests" },
            { name: "CodeChef", meta: "rating · ranks" },
            { name: "HackerRank", meta: "skills · badges" },
            { name: "AtCoder", meta: "rating · contests" },
            { name: "GitHub", meta: "contrib · projects" },
          ].map((p) => (
            <div
              key={p.name}
              className="rounded-2xl border border-slate-800 bg-black/25 p-3 min-h-[90px] flex flex-col"
            >
              <div className="text-[12px] font-semibold text-slate-200">{p.name}</div>
              <div className="mt-1 text-[10px] text-slate-500 leading-snug flex-1">{p.meta}</div>
              <div className="mt-2 flex items-center justify-between">
                <Pill>Linked</Pill>
                <div className="text-[10px] text-slate-600">cached</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </ArtifactShell>
  );
}

function ArtifactLeaderboard() {
  return (
    <ArtifactShell
      title="Leaderboards"
      subtitle="Fair ranking using normalized CodeSync Score — filter and drill into profiles."
      rightSlot={<Pill tone="violet">Rank: Live</Pill>}
    >
      <Panel>
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Pill>Year: All</Pill>
            <Pill>Branch: All</Pill>
            <Pill>Section: All</Pill>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-black/35 px-3 py-2 text-[11px] text-slate-400 w-full sm:w-[260px]">
            Search name / roll / handle…
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <MiniCard title="Top Score" value="26,915" hint="dummy data" tone="amber" />
          <MiniCard title="Students" value="3" hint="in current view" tone="violet" />
          <MiniCard title="Refresh" value="12h" hint="cache cycle" tone="emerald" />
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 bg-black/25 overflow-hidden">
          <div className="grid grid-cols-[72px_1fr_96px_80px] gap-0 border-b border-slate-800 bg-black/35 px-3 py-2 text-[10px] text-slate-500">
            <div>Rank</div>
            <div>Student</div>
            <div className="text-right">Score</div>
            <div className="text-right">Trend</div>
          </div>

          {[
            { r: "1", n: "jhon", s: "26,915", t: "+214" },
            { r: "2", n: "Student Two", s: "20,113", t: "+88" },
            { r: "3", n: "alex", s: "8,079", t: "+12" },
          ].map((x) => (
            <div
              key={x.r}
              className="grid grid-cols-[72px_1fr_96px_80px] px-3 py-2 text-[11px] text-slate-200 border-b border-slate-900 last:border-b-0"
            >
              <div className="text-slate-400">{x.r}</div>
              <div className="truncate font-medium">{x.n}</div>
              <div className="text-right text-cyan-200 font-semibold">{x.s}</div>
              <div className="text-right text-emerald-200">{x.t}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
          <span>Click any student to open detailed profile.</span>
          <span className="text-cyan-200">Open profile ↗</span>
        </div>
      </Panel>
    </ArtifactShell>
  );
}

function ArtifactCodePad() {
  return (
    <ArtifactShell
      title="CodePad"
      subtitle="A clean practice workspace — pick language, run code, and test with input."
      rightSlot={<Pill tone="cyan">Run</Pill>}
    >
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <Pill tone="violet">Python</Pill>
            <Pill>v3.10</Pill>
            <Pill>stdin</Pill>
          </div>
          <div className="flex gap-2">
            <Pill>Reset</Pill>
            <Pill tone="cyan">Execute</Pill>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-black/25 p-3 min-h-[190px] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <RiTerminalBoxLine className="text-cyan-300" /> editor
              </div>
              <div className="text-[10px] text-slate-600">autosave drafts</div>
            </div>

            <div className="mt-2 rounded-xl border border-slate-800 bg-black/35 p-3 font-mono text-[12px] text-slate-200 flex-1 overflow-hidden">
              <div className="text-slate-500">1</div>
              <div className="-mt-4 pl-5">
                <span className="text-cyan-200">print</span>(
                <span className="text-fuchsia-200">"Hello, World!"</span>)
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <Pill>Snippets</Pill>
              <Pill>Templates</Pill>
              <Pill tone="emerald">Saved drafts</Pill>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-black/25 p-3">
              <div className="text-[11px] text-slate-400">INPUT (stdin)</div>
              <div className="mt-2 h-16 rounded-xl border border-slate-800 bg-black/35" />
              <div className="mt-2 text-[10px] text-slate-600">Paste custom testcases here.</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-black/25 p-3">
              <div className="text-[11px] text-slate-400">OUTPUT</div>
              <div className="mt-2 h-16 rounded-xl border border-slate-800 bg-black/35 p-2 font-mono text-[11px] text-emerald-200">
                Run your code to see output…
              </div>
              <div className="mt-2 text-[10px] text-slate-600">Errors are shown with friendly hints.</div>
            </div>
          </div>
        </div>
      </Panel>
    </ArtifactShell>
  );
}

function ArtifactDoubtAssistant() {
  const reduce = useReducedMotion() ?? false;

  return (
    <ArtifactShell
      title="CS.AI Doubt Assistant"
      subtitle="Ask doubts while practicing — intuition first, hints, edge-cases & complexity."
      rightSlot={<Pill tone="fuchsia">Explain</Pill>}
    >
      <Panel>
        <div className="rounded-2xl border border-slate-800 bg-black/25 p-3 overflow-hidden relative flex-1 min-h-0">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            animate={reduce ? undefined : { backgroundPositionX: ["0%", "100%"] }}
            transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(217,70,239,0.00), rgba(217,70,239,0.12), rgba(34,211,238,0.12), rgba(167,139,250,0.10), rgba(217,70,239,0.00))",
              backgroundSize: "200% 100%",
            }}
          />

          <div className="relative flex flex-col h-full min-h-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-400">Ask a doubt</div>
              <Pill>Hint mode</Pill>
            </div>

            <div className="mt-2 rounded-xl border border-slate-800 bg-black/35 p-2 text-[11px] text-slate-200">
              “Why does Kadane work for maximum subarray?”
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniExplainChip label="Intuition" value="best suffix ending here" />
              <MiniExplainChip label="Edge case" value="all negatives handling" />
              <MiniExplainChip label="Complexity" value="O(n) time · O(1) space" />
              <MiniExplainChip label="Next step" value="walkthrough on sample input" />
            </div>

            <div className="mt-auto pt-3 flex items-center justify-between">
              <div className="text-[10px] text-slate-500">Learning-first · no copy-paste solutions</div>
              <div className="text-[10px] text-cyan-200">Ask ↗</div>
            </div>
          </div>
        </div>
      </Panel>
    </ArtifactShell>
  );
}

function MiniExplainChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-black/35 px-3 py-2 min-h-[58px]">
      <div className="text-[9px] text-slate-500 uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-1 text-[11px] text-slate-200 leading-snug">{value}</div>
    </div>
  );
}

function ArtifactCalendar() {
  const reduce = useReducedMotion() ?? false;

  // Dummy month layout (FEB 2026) — for UI only
  const monthLabel = "FEBRUARY 2026";

  type PlatformCode = "LC" | "CF" | "CC" | "AT" | "OT";
  type Event = {
    id: string;
    day: number; // 1..28
    title: string;
    code: PlatformCode;
    tone: "violet" | "sky" | "amber" | "pink" | "teal";
  };

  const events: Event[] = [
    { id: "e1", day: 4, title: "Starters 224", code: "CC", tone: "amber" },
    { id: "e2", day: 4, title: "Beginner Contest 105", code: "CC", tone: "pink" },
    { id: "e3", day: 5, title: "Weekly Contest 216", code: "LC", tone: "violet" },

    { id: "e4", day: 7, title: "AtCoder Beginner Contest", code: "AT", tone: "teal" },
    { id: "e5", day: 7, title: "Codeforces Round (…)", code: "CF", tone: "sky" },

    { id: "e6", day: 8, title: "Weekly Contest 488", code: "LC", tone: "violet" },
    { id: "e7", day: 8, title: "Codeforces Round (…)", code: "CF", tone: "sky" },
    { id: "e8", day: 8, title: "AtCoder Regular Contest", code: "AT", tone: "teal" },

    { id: "e9", day: 11, title: "Starters 225", code: "CC", tone: "amber" },
    { id: "e10", day: 11, title: "Codeforces Round (…)", code: "CF", tone: "sky" },
    { id: "e11", day: 11, title: "Codeforces Round (…)", code: "CF", tone: "sky" },

    { id: "e12", day: 13, title: "THIRD Programming …", code: "AT", tone: "teal" },
    { id: "e13", day: 14, title: "AtCoder Beginner Contest", code: "AT", tone: "teal" },

    { id: "e14", day: 20, title: "BlackRock Hackathon", code: "OT", tone: "amber" },
    { id: "e15", day: 21, title: "AtCoder Beginner Contest", code: "AT", tone: "teal" },
    { id: "e16", day: 21, title: "Kotlin Heroes: Pract…", code: "CF", tone: "sky" },
  ];

  // Feb 2026 starts on Sunday in this dummy UI (so day 1 sits under SUN)
  // To change alignment later, adjust `leadingBlanks`.
  const leadingBlanks = 0; // 0..6
  const totalDays = 28;

  const cells = useMemo(() => {
    const out: Array<{ kind: "blank" } | { kind: "day"; d: number }> = [];
    for (let i = 0; i < leadingBlanks; i++) out.push({ kind: "blank" });
    for (let d = 1; d <= totalDays; d++) out.push({ kind: "day", d });
    // make full 5 rows (35 cells) for stable height in the artifact
    while (out.length < 35) out.push({ kind: "blank" });
    return out;
  }, [leadingBlanks]);

  const byDay = useMemo(() => {
    const map = new Map<number, Event[]>();
    for (const e of events) {
      const arr = map.get(e.day) ?? [];
      arr.push(e);
      map.set(e.day, arr);
    }
    return map;
  }, [events]);

  const [view, setView] = useState<"Month" | "Week" | "Day" | "Agenda">("Month");

  return (
    <ArtifactShell
      title="Contest Calendar"
      subtitle="Month stays clean. Week/Day show timings. Click any contest for details."
      rightSlot={<Pill tone="amber">Live</Pill>}
      className="!min-h-[420px] sm:!min-h-[440px]"
    >
      <Panel className="h-full">
        {/* TOP BAR (like reference) */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="rounded-2xl border border-slate-800 bg-black/30 px-3 py-2 text-[11px] text-slate-300">
              <span className="text-slate-500">Calendar</span>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-black/25 p-1">
              <button className="px-3 py-1.5 rounded-xl text-[11px] text-slate-300 hover:bg-black/40 transition">
                Today
              </button>
              <button className="px-3 py-1.5 rounded-xl text-[11px] text-slate-300 hover:bg-black/40 transition">
                Back
              </button>
              <button className="px-3 py-1.5 rounded-xl text-[11px] text-slate-300 hover:bg-black/40 transition">
                Next
              </button>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {monthLabel}
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-black/25 p-1">
            {(["Month", "Week", "Day", "Agenda"] as const).map((t) => {
              const active = view === t;
              return (
                <motion.button
                  key={t}
                  type="button"
                  onClick={() => setView(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] transition",
                    active
                      ? "bg-cyan-300/15 text-cyan-200 border border-cyan-300/25"
                      : "text-slate-300 hover:bg-black/40"
                  )}
                  whileHover={reduce ? undefined : { y: -1 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                >
                  {t}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* GRID HEADER */}
        <div className="mt-3 rounded-3xl border border-slate-800 bg-black/25 overflow-hidden">
          <div className="grid grid-cols-7 gap-0 border-b border-slate-800 bg-black/30">
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
              <div
                key={d}
                className="px-3 py-2 text-[10px] text-slate-500 uppercase tracking-[0.22em]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* MONTH GRID (compact but premium) */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((c, idx) => {
              if (c.kind === "blank") {
                return (
                  <div
                    key={`b-${idx}`}
                    className="h-[74px] sm:h-[78px] border-r border-b border-slate-900/70 bg-[#060812]/55"
                  />
                );
              }

              const list = byDay.get(c.d) ?? [];
              const show = list.slice(0, 2);
              const more = Math.max(0, list.length - show.length);

              return (
                <div
                  key={`d-${c.d}`}
                  className={cn(
                    "h-[74px] sm:h-[78px]",
                    "border-r border-b border-slate-900/70",
                    "bg-[#060812]/75 hover:bg-[#070a16] transition",
                    "px-2.5 py-2"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-[11px] text-slate-300 font-semibold">
                      {String(c.d).padStart(2, "0")}
                    </div>
                    {/* tiny status dots for “activity” */}
                    <div className="flex gap-1">
                      {list.length > 0 && (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" />
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-300/50" />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {show.map((e) => (
                      <SmallEventChip
                        key={e.id}
                        code={e.code}
                        title={e.title}
                        tone={e.tone}
                      />
                    ))}

                    {more > 0 && (
                      <div className="text-[10px] text-slate-500 pl-1">
                        +{more} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* footer note */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
          <span>Month view stays clean — Week/Day can show real timings later.</span>
          <span className="text-cyan-200">Click chip → details ↗</span>
        </div>
      </Panel>
    </ArtifactShell>
  );
}

/* ------------------------------ Small Event Chip (like your reference) ------------------------------ */

function SmallEventChip({
  code,
  title,
  tone,
}: {
  code: "LC" | "CF" | "CC" | "AT" | "OT";
  title: string;
  tone: "violet" | "sky" | "amber" | "pink" | "teal";
}) {
  const cls =
    tone === "violet"
      ? "border-violet-300/35 bg-violet-300/15 text-violet-100"
      : tone === "sky"
      ? "border-sky-300/35 bg-sky-300/15 text-sky-100"
      : tone === "amber"
      ? "border-amber-300/40 bg-amber-300/15 text-amber-100"
      : tone === "pink"
      ? "border-pink-300/35 bg-pink-300/15 text-pink-100"
      : "border-emerald-300/35 bg-emerald-300/12 text-emerald-100";

  const badge =
    tone === "violet"
      ? "bg-violet-300/30 border-violet-200/30"
      : tone === "sky"
      ? "bg-sky-300/30 border-sky-200/30"
      : tone === "amber"
      ? "bg-amber-300/30 border-amber-200/30"
      : tone === "pink"
      ? "bg-pink-300/30 border-pink-200/30"
      : "bg-emerald-300/25 border-emerald-200/25";

  return (
    <div
      className={cn(
        "w-full rounded-full border px-2 py-[3px]",
        "flex items-center gap-2",
        "text-[10px] leading-none",
        "overflow-hidden",
        cls
      )}
      title={`${code} · ${title}`}
    >
      <span
        className={cn(
          "shrink-0 rounded-full border px-1.5 py-[2px] text-[9px]",
          "text-slate-100",
          badge
        )}
      >
        {code}
      </span>
      <span className="truncate">{title}</span>
    </div>
  );
}

  
function ArtifactCareer() {
  return (
    <ArtifactShell
      title="Career Suite"
      subtitle="Placement-focused tools: resume builder, ATS analyzer, JD match & job suggestions."
      rightSlot={<Pill tone="emerald">Career Ops</Pill>}
    >
      <Panel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <CareerTool
            title="Resume Builder"
            chip="AI-assisted"
            desc="Turn raw achievements into a polished, ATS-friendly resume."
            tone="teal"
          />
          <CareerTool
            title="ATS Analyzer"
            chip="Match score"
            desc="Upload resume + paste JD. Get match score & exact improvements."
            tone="violet"
          />
          <CareerTool
            title="Job Suggestions"
            chip="Targeting"
            desc="Get roles, keywords, and skill-gap hints tailored to your profile."
            tone="amber"
          />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <MiniCard title="JD Match" value="—" hint="after upload" tone="violet" />
          <MiniCard title="ATS Score" value="—" hint="after scan" tone="emerald" />
          <MiniCard title="Suggested Roles" value="—" hint="after profile setup" tone="amber" />
        </div>

        <div className="mt-3 text-[10px] text-slate-600">Export-ready profile & resume hooks later.</div>
      </Panel>
    </ArtifactShell>
  );
}

function CareerTool({
  title,
  chip,
  desc,
  tone,
}: {
  title: string;
  chip: string;
  desc: string;
  tone: "teal" | "violet" | "amber";
}) {
  const grad =
    tone === "teal"
      ? "bg-[radial-gradient(800px_circle_at_20%_20%,rgba(16,185,129,0.16),transparent_55%)]"
      : tone === "violet"
      ? "bg-[radial-gradient(800px_circle_at_20%_20%,rgba(167,139,250,0.16),transparent_55%)]"
      : "bg-[radial-gradient(800px_circle_at_20%_20%,rgba(245,158,11,0.16),transparent_55%)]";

  const chipCls =
    tone === "teal"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
      : tone === "violet"
      ? "border-violet-300/30 bg-violet-300/10 text-violet-200"
      : "border-amber-300/30 bg-amber-300/10 text-amber-200";

  return (
    <div className={cn("relative rounded-2xl border border-slate-800 bg-[#060812] p-4 overflow-hidden min-h-[118px]", grad)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold text-slate-100 leading-snug">{title}</div>
        <div className={cn("rounded-full border px-2 py-1 text-[9px] whitespace-nowrap", chipCls)}>{chip}</div>
      </div>
      <div className="mt-2 text-[11px] text-slate-300 leading-relaxed">{desc}</div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[10px] text-slate-500">placement-ready</div>
        <div className="text-[10px] text-cyan-200">Open tool ↗</div>
      </div>
    </div>
  );
}

function ArtifactResources() {
  return (
    <ArtifactShell
      title="Resources Hub"
      subtitle="Curated tracks + best-first resources based on your level and topic."
      rightSlot={<Pill tone="cyan">Curated</Pill>}
    >
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <Pill tone="cyan">Beginner</Pill>
            <Pill>Intermediate</Pill>
            <Pill>Advanced</Pill>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-black/35 px-3 py-2 text-[11px] text-slate-400 w-full sm:w-[260px]">
            Search title / topic / author…
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {["All", "DSA", "CP", "Web Dev", "CS Core", "System Design"].map((x, i) => (
            <Pill key={x} tone={i === 1 ? "violet" : "slate"}>
              {x}
            </Pill>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CourseCard
            title="Data Structures & Algorithms in Python"
            chip="Best starter"
            meta={["Beginner", "DSA", "Playlist", "8–10 hours"]}
          />
          <CourseCard
            title="Striver’s A2Z DSA Sheet"
            chip="Interview"
            meta={["Intermediate", "DSA", "Sheet", "Long term"]}
          />
          <CourseCard
            title="CS50: Intro to Computer Science"
            chip="Classic"
            meta={["Beginner", "CS Core", "Course", "8–12 weeks"]}
          />
          <CourseCard
            title="Modern Web Dev (HTML/CSS/JS/React)"
            chip="Projects"
            meta={["Beginner", "Web Dev", "Roadmap", "Guided"]}
          />
        </div>
      </Panel>
    </ArtifactShell>
  );
}

function CourseCard({
  title,
  chip,
  meta,
}: {
  title: string;
  chip: string;
  meta: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-black/25 p-4 min-h-[132px] flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold text-slate-100 leading-snug line-clamp-2">{title}</div>
        <Pill tone="violet">{chip}</Pill>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {meta.slice(0, 3).map((m) => (
          <Pill key={m}>{m}</Pill>
        ))}
      </div>

      <div className="mt-2 text-[10px] text-slate-500">{meta[3]}</div>

      <div className="mt-auto pt-3 flex items-center justify-end">
        <Pill tone="cyan">Open ↗</Pill>
      </div>
    </div>
  );
}

/* =====================================================================================
  SMALL PIECES
===================================================================================== */

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function HoloStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#060812] p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Reactor({ reduce }: { reduce: boolean }) {
  return (
    <div className="mt-4 relative h-40 sm:h-44 w-full rounded-3xl border border-slate-800 bg-[#060812] overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-80"
        animate={reduce ? undefined : { backgroundPositionX: ["0%", "100%"] }}
        transition={reduce ? undefined : { duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(34,211,238,0.0), rgba(34,211,238,0.18), rgba(167,139,250,0.18), rgba(217,70,239,0.12), rgba(34,211,238,0.0))",
          backgroundSize: "200% 100%",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-28 w-28">
          <motion.div
            className="absolute inset-0 rounded-full border border-cyan-300/35"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={reduce ? undefined : { duration: 8, repeat: Infinity, ease: "linear" }}
            style={{ boxShadow: "0 0 70px rgba(34,211,238,0.18)" }}
          />
          <motion.div
            className="absolute inset-[10px] rounded-full border border-violet-300/30"
            animate={reduce ? undefined : { rotate: -360 }}
            transition={reduce ? undefined : { duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ boxShadow: "0 0 70px rgba(167,139,250,0.14)" }}
          />
          <motion.div
            className="absolute inset-[22px] rounded-full border border-fuchsia-300/25"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={reduce ? undefined : { duration: 12, repeat: Infinity, ease: "linear" }}
            style={{ boxShadow: "0 0 70px rgba(217,70,239,0.12)" }}
          />
          <div
            className="absolute inset-[36px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.35),rgba(167,139,250,0.18),rgba(0,0,0,0)_70%)]"
            style={{ boxShadow: "0 0 80px rgba(34,211,238,0.22)" }}
          />
        </div>
      </div>

      <div className="absolute left-4 bottom-4 text-[11px] text-slate-400">
        cache warm · refresh queued · integrity ok
      </div>
    </div>
  );
}

function AnimatedNumber({
  target,
  suffix,
  animate = true,
}: {
  target: number;
  suffix?: string;
  animate?: boolean;
}) {
  const reduce = useReducedMotion() ?? false;
  const [value, setValue] = useState(reduce || !animate ? target : 0);

  useEffect(() => {
    if (reduce || !animate) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1200;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce, animate]);

  return (
    <span>
      {value.toLocaleString()}
      {suffix ?? ""}
    </span>
  );
}
