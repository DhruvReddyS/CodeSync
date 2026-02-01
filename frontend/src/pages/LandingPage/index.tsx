// src/pages/LandingPage/index.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
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
  RiChatSmile2Line,
  RiCalendarEventLine,
  RiTrophyLine,
  RiLineChartLine,
  RiRobot2Line,
  RiBook2Line,
  RiPulseLine,
  RiFlashlightLine,
  RiStarSmileLine,
  RiCodeBoxLine,
} from "react-icons/ri";

import {
  Dock,
  GlitchText,
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

import { FEATURE_BLOCKS, PLATFORMS, ROLES, SECURITY_POINTS, STATS } from "./data";
import csLogo from "../../assets/logo/logo.png";

/**
 * LandingPage — Futuristic Top 1% UI (module chambers, no boring preview cards)
 * Updated:
 * ✅ Platforms marquee = Logo + name below
 * ✅ MotionValue string bug fixed via useMotionTemplate
 * ✅ Responsive polish
 */

const BRAND_GRAD =
  "text-transparent bg-clip-text bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_28%,#a78bfa_58%,#d946ef_100%)]";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const [lowPower, setLowPower] = useState(false);
  const [booting, setBooting] = useState(true);
  const glow = useCursorGlow(lowPower);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const update = () =>
      setLowPower(
        reduced.matches || coarse.matches || window.innerWidth < 900
      );
    update();
    window.addEventListener("resize", update);
    reduced.addEventListener?.("change", update);
    coarse.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      reduced.removeEventListener?.("change", update);
      coarse.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    const delay = reduce ? 0 : 800;
    const timer = window.setTimeout(() => setBooting(false), delay);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  // ✅ fix MotionValue usage in template string
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
      <AnimatePresence>
        {booting && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050509]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="relative flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl bg-slate-950/90 border border-slate-800 flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.5)]">
                  <img src={csLogo} alt="CodeSync" className="h-10 w-10" />
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full border border-slate-800 border-t-sky-400/80 border-r-fuchsia-400/70 animate-spin [animation-duration:1.2s]" />
                </div>
              </div>
              <p className="text-[0.7rem] uppercase tracking-[0.3em] text-slate-500">
                Loading CodeSync
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <HyperBackdrop lowMotion={lowPower} />

      {/* Cursor plasma (brand hues) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-90"
        style={{ background: cursorPlasma }}
      />

      <div className="relative z-[2]">
        {/* HERO */}
        <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pt-16 sm:pt-20 pb-12 sm:pb-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] items-center">
            {/* LEFT */}
            <div className="space-y-7">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/55 px-4 py-1.5 text-xs text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide">
                    <span className={cn("font-semibold", BRAND_GRAD)}>CodeSync</span> · Competitive Programming Command Center
                  </span>
                  <span className="ml-2 hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <RiSparkling2Line /> neural UI
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-black/40 px-3 py-1 text-[11px] text-slate-400">
                  <RiPulseLine className="text-emerald-300" />
                  live sync · 12h
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
                Sync your competitive programming journey across platforms. Real-time dashboards, AI-powered insights, 
                and everything you need to dominate coding contests — all in one neural interface.
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
                  whileHover={{ scale: 1.05, boxShadow: "0 0 70px rgba(34,211,238,0.75)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Get started <RiArrowRightLine className="text-lg" />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background: "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 35%, transparent 70%)",
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

              {/* Quick “power dock” */}
              <Dock
                className="mt-4 w-fit"
                items={[
                  { label: "Dashboard", onClick: () => scrollToId("chambers"), icon: <RiLineChartLine /> },
                  { label: "Leaderboard", onClick: () => scrollToId("chambers"), icon: <RiTrophyLine /> },
                  { label: "CodePad", onClick: () => scrollToId("chambers"), icon: <RiTerminalBoxLine /> },
                  { label: "AI Assistant", onClick: () => scrollToId("chambers"), icon: <RiChatSmile2Line /> },
                  { label: "Contests", onClick: () => scrollToId("chambers"), icon: <RiCalendarEventLine /> },
                  { label: "Career", onClick: () => scrollToId("chambers"), icon: <RiRobot2Line /> },
                ]}
              />

              <div className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-2">
                <RiShieldCheckLine className="text-emerald-300" />
                OAuth · Read-only analytics · Privacy-first
              </div>
            </div>

            {/* RIGHT: brand holo artifact */}
            <ParallaxY strength={44} disabled={lowPower}>
              <Tilt className="will-change-transform">
                <HoloCard className="p-6 sm:p-7 relative">
                  <OrbitParticles className="opacity-70" count={lowPower ? 4 : 10} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Identity Fusion</div>
                      <div className="text-[11px] text-slate-500">lc · cf · cc · hr · at · gh</div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-slate-800 bg-black/45 p-5 overflow-hidden">
                      <div className="absolute inset-0 opacity-70 pointer-events-none">
                        <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-cyan-400/14 blur-[120px]" />
                        <div className="absolute -right-28 -top-24 h-72 w-72 rounded-full bg-violet-400/14 blur-[120px]" />
                        <div className="absolute left-[35%] -bottom-36 h-80 w-80 rounded-full bg-fuchsia-400/12 blur-[140px]" />
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 text-xs text-slate-300">
                            <span className="h-2 w-2 rounded-full bg-cyan-300" />
                            fused signal
                          </div>
                          <div className="text-[11px] text-emerald-300">+18% momentum</div>
                        </div>

                        {/* Reactor rings */}
                        <Reactor reduce={reduce} />

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <HoloStat label="Core skill" value="DP + Graphs" />
                          <HoloStat label="Next target" value="1900 CF" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-800 bg-black/35 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">system log</div>
                      <div className="mt-2 font-mono text-[11px] text-slate-300">
                        <span className="text-emerald-300">$</span> codesync sync{" "}
                        <span className="text-cyan-300">--unify</span>{" "}
                        <span className="text-violet-300">--rank</span>{" "}
                        <span className="text-fuchsia-300">--coach</span>
                        <div className="mt-1 text-slate-500">→ refreshed 12h · profile link ready</div>
                      </div>
                    </div>
                  </div>
                </HoloCard>
              </Tilt>
            </ParallaxY>
          </div>
        </section>

        {/* STATS */}
        <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-12 sm:pb-16">
          <Reveal>
            <HoloCard className="p-6 sm:p-8">
              <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map((s, i) => (
                  <StaggerItem key={s.label}>
                    <Tilt>
                      <motion.div 
                        className="rounded-3xl border border-slate-800 bg-black/35 p-5 relative overflow-hidden group"
                        whileHover={{ scale: 1.02, borderColor: "rgb(34, 211, 238)" }}
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
                          <AnimatedNumber target={s.target} suffix={s.suffix} animate={!lowPower} />
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-200">{s.label}</div>
                        <div className="mt-2 text-[11px] text-slate-500">{s.hint ?? "verified · unified · clean"}</div>
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

        {/* INTEGRATIONS — ✅ logo + name below */}
        <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-14 sm:pb-18">
          <Reveal>
            <HoloCard className="p-6 sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-base sm:text-lg font-semibold">
                    Platforms become <span className={BRAND_GRAD}>one identity</span>
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-slate-400">
                    Unified stats across everything you already use.
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live stats every 12 hours
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
            reduce={reduce}
            onStart={() => navigate("/auth?mode=student")}
          />
        </section>

        {/* ROLES */}
        <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16 sm:pb-20">
          <Reveal>
            <HoloCard className="p-6 sm:p-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Built for <span className={BRAND_GRAD}>students, faculty and clubs</span>.
                </h2>
                <p className="text-sm text-slate-400 max-w-2xl mx-auto">
                  Students grind. CodeSync turns it into dashboards that look premium enough for placements and reports.
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
                            {r.points.map((p, idx) => (
                              <motion.div 
                                key={p} 
                                className="flex gap-2 text-sm text-slate-200"
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
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
        <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16 sm:pb-20">
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
                    CodeSync reads what it needs to build analytics. It never submits code or changes your profiles.
                  </p>
                </div>

                <div className="space-y-2">
                  {SECURITY_POINTS.map((p) => (
                    <div key={p} className="rounded-2xl border border-slate-800 bg-[#060812] p-3">
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
        <section className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40 pb-16 sm:pb-20">
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
                    <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">final call</div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Make your coding work look <span className={BRAND_GRAD}>elite</span>.
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      One link for your entire coding identity. Built to impress clubs, faculty and recruiters.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                    <motion.button
                      onClick={() => navigate("/auth?mode=student")}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-300 px-7 py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-[0_0_55px_rgba(34,211,238,0.55)] hover:bg-cyan-200 transition"
                      whileHover={{ 
                        scale: 1.06, 
                        boxShadow: "0 0 80px rgba(34,211,238,0.9)",
                        background: "rgb(165, 243, 252)"
                      }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
            Built for students, campuses and CP clubs · Read-only analytics
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
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-black/80 to-transparent z-[2]" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-black/80 to-transparent z-[2]" />

      <motion.div
        className="flex w-max gap-4 sm:gap-6 py-2"
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
        "w-[112px] sm:w-[126px] md:w-[138px]",
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
  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ["start start", "end end"] });

  const bg1 = useTransform(scrollYProgress, [0, 1], [0.12, 0.22]);
  const bg2 = useTransform(scrollYProgress, [0, 1], [0.10, 0.18]);

  const morphBg = useMotionTemplate`
    radial-gradient(1200px circle at 20% 15%, rgba(34,211,238,${bg1}), transparent 55%),
    radial-gradient(1200px circle at 80% 65%, rgba(167,139,250,${bg2}), transparent 60%),
    radial-gradient(900px circle at 50% 110%, rgba(217,70,239,0.10), transparent 60%)
  `;

  const chambers = useMemo(() => {
    const signatures = [
      { icon: <RiLineChartLine />, sub: "Multi-platform dashboard", vibe: "signal → clarity" },
      { icon: <RiTrophyLine />, sub: "Smart leaderboards", vibe: "consistency → rank" },
      { icon: <RiChatSmile2Line />, sub: "AI mentor assistant", vibe: "explain → debug" },
      { icon: <RiCalendarEventLine />, sub: "Contest calendar", vibe: "plan → compete" },
      { icon: <RiRobot2Line />, sub: "Career suite", vibe: "profile → placement" },
      { icon: <RiBook2Line />, sub: "Resources hub", vibe: "weakness → mastery" },
    ];
    return FEATURE_BLOCKS.slice(0, 6).map((b, i) => ({ ...b, sig: signatures[i] }));
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: morphBg }} />

      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40">
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
              No boring cards. This is the product personality — cinematic, premium, futuristic.
            </p>
          </div>
        </Reveal>
      </div>

      <div className="space-y-10 sm:space-y-14 pb-10 sm:pb-14">
        {chambers.map((c, idx) => (
          <Chamber
            key={c.title}
            idx={idx}
            brandGrad={brandGrad}
            title={c.title}
            desc={c.desc}
            points={c.points}
            icon={c.sig.icon}
            sub={c.sig.sub}
            vibe={c.sig.vibe}
            reduce={reduce}
            cta={idx === 2 ? { label: "Start now", onClick: onStart } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function Chamber({
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

  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);
  const rot = useTransform(scrollYProgress, [0, 1], reversed ? [6, -6] : [-6, 6]);
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], [0.08, 0.22, 0.08]);

  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-40">
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
          <motion.div style={reduce ? undefined : { y, rotateZ: rot }} className={cn(reversed ? "lg:order-2" : "", "will-change-transform")}>
            <Tilt>
              <HoloCard className="p-6 sm:p-7 relative overflow-hidden">
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-[#070a14] text-cyan-300 text-xl">
                      {icon}
                    </div>
                    <div>
                      <div className={cn("text-[11px] uppercase tracking-[0.28em]", brandGrad)}>{sub}</div>
                      <div className="text-sm font-semibold text-slate-100">{title}</div>
                    </div>
                  </div>

                  <div className="mt-5">
                    {idx === 0 && <ArtifactDashboard />}
                    {idx === 1 && <ArtifactLeaderboard />}
                    {idx === 2 && <ArtifactCodePad />}
                    {idx === 3 && <ArtifactCalendar />}
                    {idx === 4 && <ArtifactCareer />}
                    {idx === 5 && <ArtifactResources />}
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
                {points.map((p) => (
                  <div key={p} className="rounded-2xl border border-slate-800 bg-black/35 p-3">
                    <div className="flex gap-2 text-xs sm:text-sm text-slate-200">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      <span className="leading-relaxed">{p}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <RiShieldCheckLine className="text-emerald-300" />
                Built to feel premium — not “AI template”.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* =====================================================================================
  ARTIFACTS
===================================================================================== */

function ArtifactDashboard() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-black/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">signal map</div>
        <div className="text-[11px] text-emerald-300">live</div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Pill title="Streak" value="23d" tone="cyan" />
        <Pill title="Solved" value="312" tone="violet" />
        <Pill title="Momentum" value="+18%" tone="fuchsia" />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-[#060812] p-3">
        <div className="text-[11px] text-slate-400">trend reactor</div>
        <div className="mt-3 flex items-end gap-2 h-24">
          {[26, 48, 36, 62, 54, 70, 58, 82].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-xl bg-[linear-gradient(to_top,#0b1220,#22d3ee,#a78bfa,#d946ef)]"
              style={{ height: `${h}%`, opacity: 0.9 }}
            />
          ))}
        </div>
        <div className="mt-2 text-[10px] text-slate-500">
          Last 8 sessions · volatility down · focus on DP + graphs
        </div>
      </div>
    </div>
  );
}

function ArtifactLeaderboard() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-black/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">rank lattice</div>
        <div className="text-[11px] text-slate-500">verified</div>
      </div>

      <div className="mt-3 space-y-2">
        {[
          { n: "Amar R", s: "982", t: "+42", top: true },
          { n: "Sanjay", s: "941", t: "+18" },
          { n: "Riya", s: "903", t: "+27" },
        ].map((r, i) => (
          <div
            key={r.n}
            className={cn(
              "rounded-2xl border bg-[#060812] px-3 py-2 flex items-center justify-between",
              r.top ? "border-cyan-400/35 shadow-[0_0_40px_rgba(34,211,238,0.18)]" : "border-slate-800"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-9 w-9 rounded-xl border bg-black/40 flex items-center justify-center",
                  r.top ? "border-cyan-400/30 text-cyan-300" : "border-slate-700 text-slate-300"
                )}
              >
                {i === 0 ? <RiTrophyLine /> : <RiStarSmileLine />}
              </div>
              <div>
                <div className="text-sm font-semibold">{r.n}</div>
                <div className="text-[11px] text-slate-500">consistency index</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{r.s}</div>
              <div className="text-[11px] text-emerald-300">{r.t}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end gap-1.5 h-20">
        {[18, 36, 28, 62, 54, 60, 44, 58, 50].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-full bg-[linear-gradient(to_top,#0b1220,#22d3ee,#a78bfa,#d946ef)]"
            style={{ height: `${h}%`, opacity: 0.85 }}
          />
        ))}
      </div>
    </div>
  );
}

function ArtifactCodePad() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-black/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">codepad core</div>
        <div className="text-[11px] text-slate-500">run · debug · edge cases</div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-[#060812] p-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <RiTerminalBoxLine className="text-cyan-300" /> main.cpp
        </div>
        <pre className="mt-2 text-[12px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap">{`// Kadane (max subarray)
long long best = -INF, cur = 0;
for (int x : a) {
  cur = max<long long>(x, cur + x);
  best = max(best, cur);
}`}</pre>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-800 bg-black/35 p-2">
            <div className="text-[11px] text-slate-400">stdout</div>
            <div className="mt-1 font-mono text-[12px] text-emerald-200">6</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-black/35 p-2">
            <div className="text-[11px] text-slate-400">AI note</div>
            <div className="mt-1 text-[12px] text-slate-200">edge cases: all negatives, multi-T</div>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-black/35 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <RiChatSmile2Line className="text-fuchsia-300" />
          AI Debug Companion
        </div>
        <div className="mt-2 text-[12px] text-slate-300">
          Explain logic, spot bugs, suggest testcases — without dumping full solutions.
        </div>
      </div>
    </div>
  );
}

function ArtifactCalendar() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-black/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">contest mesh</div>
        <div className="text-[11px] text-slate-500">all platforms</div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
          <div key={d} className="rounded-2xl border border-slate-800 bg-[#060812] p-2">
            <div className="text-[10px] text-slate-500">{d}</div>
            <div className="mt-2 h-8 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-center text-[10px] text-slate-400">
              {i === 1 ? "LC 9PM" : i === 4 ? "CF 8PM" : "Focus"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-black/35 p-3 text-[12px] text-slate-300">
        Your plan is auto-built from upcoming contests + your weak topics.
      </div>
    </div>
  );
}

function ArtifactCareer() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-black/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">career engine</div>
        <div className="text-[11px] text-slate-500">ats · resume · jobs</div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-[#060812] p-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-slate-400">ATS score</div>
          <div className="text-sm font-semibold text-emerald-200">82 / 100</div>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-900 overflow-hidden">
          <div className="h-full w-[82%] bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa,#d946ef)]" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <SmallTile title="Fix keywords" desc="Align with role JD" />
          <SmallTile title="Quantify impact" desc="+%, #, time saved" />
          <SmallTile title="Projects" desc="Auto from CodeSync" />
          <SmallTile title="Jobs" desc="Skill-based matching" />
        </div>
      </div>
    </div>
  );
}

function ArtifactResources() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-black/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">resource vault</div>
        <div className="text-[11px] text-slate-500">mapped to weakness</div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <VaultCard icon={<RiBook2Line />} title="DP Mindmap" tone="cyan" />
        <VaultCard icon={<RiCodeBoxLine />} title="Graphs Sheet" tone="violet" />
        <VaultCard icon={<RiStarSmileLine />} title="Greedy Playlist" tone="fuchsia" />
        <VaultCard icon={<RiTerminalBoxLine />} title="OS Cheatsheet" tone="cyan" />
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-black/35 p-3 text-[12px] text-slate-300">
        Revision becomes focused: weak topic → curated content → practice set.
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
    <div className="mt-4 relative h-44 w-full rounded-3xl border border-slate-800 bg-[#060812] overflow-hidden">
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
        fusion stable · latency 12ms · integrity ok
      </div>
    </div>
  );
}

function Pill({ title, value, tone }: { title: string; value: string; tone: "cyan" | "violet" | "fuchsia" }) {
  const badge =
    tone === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
      : tone === "violet"
      ? "border-violet-400/25 bg-violet-400/10 text-violet-200"
      : "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200";

  return (
    <div className="rounded-2xl border border-slate-800 bg-black/35 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">{title}</div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[10px]", badge)}>{value}</span>
      </div>
      <div className="mt-2 h-[2px] w-14 rounded-full bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#a78bfa,#d946ef)]" />
    </div>
  );
}

function TagMini({ label, tone }: { label: string; tone: "cyan" | "violet" }) {
  const cls =
    tone === "cyan"
      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
      : "border-violet-400/25 bg-violet-400/10 text-violet-200";
  return <div className={cn("mt-2 rounded-xl border px-2 py-1 text-[10px]", cls)}>{label}</div>;
}

function SmallTile({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-black/35 p-2">
      <div className="text-[11px] font-semibold text-slate-200">{title}</div>
      <div className="mt-1 text-[10px] text-slate-500">{desc}</div>
    </div>
  );
}

function VaultCard({
  icon,
  title,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "cyan" | "violet" | "fuchsia";
}) {
  const glow =
    tone === "cyan"
      ? "shadow-[0_0_40px_rgba(34,211,238,0.12)]"
      : tone === "violet"
      ? "shadow-[0_0_40px_rgba(167,139,250,0.10)]"
      : "shadow-[0_0_40px_rgba(217,70,239,0.10)]";

  const iconCls =
    tone === "cyan" ? "text-cyan-300" : tone === "violet" ? "text-violet-300" : "text-fuchsia-300";

  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-black/35 p-3 flex items-center gap-3", glow)}>
      <div className={cn("h-10 w-10 rounded-xl border border-slate-700 bg-black/40 flex items-center justify-center", iconCls)}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-slate-500">curated · mapped</div>
      </div>
    </div>
  );
}

/* =====================================================================================
  Local AnimatedNumber (safe)
===================================================================================== */
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

  React.useEffect(() => {
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
