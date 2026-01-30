// src/pages/LandingPage/ui.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/* =====================================================================================
  UTIL
===================================================================================== */

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* =====================================================================================
  CURSOR GLOW (spring-smoothed)
===================================================================================== */

export function useCursorGlow(disabled = false) {
  const reduce = useReducedMotion() ?? false;
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const setCenter = () => setPos({ x: window.innerWidth * 0.55, y: window.innerHeight * 0.35 });
    setCenter();

    if (reduce || disabled) return;
    
    let rafId: number;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
      });
    };
    
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("resize", setCenter);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", setCenter);
      cancelAnimationFrame(rafId);
    };
  }, [reduce, disabled]);

  // Reduced stiffness for better performance
  const sx = useSpring(pos.x, { stiffness: 100, damping: 25, mass: 0.5 });
  const sy = useSpring(pos.y, { stiffness: 100, damping: 25, mass: 0.5 });

  return { x: sx, y: sy };
}

/* =====================================================================================
  HYPER BACKDROP (aurora + warp grid + scanlines + noise + beams)
===================================================================================== */

export function HyperBackdrop({ lowMotion = false }: { lowMotion?: boolean } = {}) {
  return (
    <>
      <style>{`
        @keyframes spinSlow { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes beam { 0%{ transform: translateX(-140%) skewX(-12deg);} 100%{ transform: translateX(140%) skewX(-12deg);} }
        @keyframes scan { 0%{ transform: translateY(-120%);} 100%{ transform: translateY(220%);} }
        @keyframes warp { 0%{ background-position: 0px 0px;} 100%{ background-position: 120px 120px;} }
        @keyframes shimmer { 0%{ transform: translateX(-140%);} 100%{ transform: translateX(140%);} }
        @keyframes flicker { 0%,100%{ opacity: 0.65;} 50%{ opacity: 0.95;} }
      `}</style>

      {/* Aurora blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[0] overflow-hidden">
        <div className="absolute -left-44 -top-44 h-[520px] w-[520px] rounded-full bg-sky-500/18 blur-[120px]" />
        <div className="absolute -right-52 -top-28 h-[560px] w-[560px] rounded-full bg-fuchsia-500/16 blur-[140px]" />
        <div className="absolute left-[30%] -bottom-72 h-[720px] w-[720px] rounded-full bg-emerald-500/10 blur-[160px]" />
        <div className="absolute right-[18%] bottom-[-38%] h-[560px] w-[560px] rounded-full bg-rose-500/10 blur-[170px]" />
      </div>

      {/* Warp grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[0] opacity-[0.14]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            animation: lowMotion ? "none" : "warp 14s linear infinite",
          }}
        />
      </div>

      {/* Scanlines */}
      {!lowMotion && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[0] opacity-[0.18]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.06)_1px,transparent_1px,transparent_7px)] mix-blend-overlay" />
        </div>
      )}

      {/* Noise */}
      {!lowMotion && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[0] opacity-[0.06]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Cfilter id=%22n%22 x=%220%22 y=%220%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22300%22 height=%22300%22 filter=%22url(%23n)%22 opacity=%220.55%22/%3E%3C/svg%3E')] mix-blend-overlay" />
        </div>
      )}

      {/* Ambient beams */}
      {!lowMotion && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[0] opacity-[0.55]">
          <div
            className="absolute -inset-x-24 top-[18%] h-20 bg-gradient-to-r from-transparent via-white/12 to-transparent"
            style={{ animation: "beam 6.8s linear infinite" }}
          />
          <div
            className="absolute -inset-x-24 top-[52%] h-16 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "beam 8.6s linear infinite" }}
          />
        </div>
      )}
    </>
  );
}

/* =====================================================================================
  CARDS
===================================================================================== */

export function HoloCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "group relative rounded-3xl border border-slate-800/70 bg-black/50 backdrop-blur-xl overflow-hidden",
        "shadow-[0_0_0_1px_rgba(15,23,42,0.30),0_30px_140px_rgba(0,0,0,0.62)]",
        className
      )}
    >
      {/* edge glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[2px] opacity-0 group-hover:opacity-100 transition duration-500"
        style={{
          background:
            "conic-gradient(from 180deg, rgba(56,189,248,0.0), rgba(56,189,248,0.24), rgba(168,85,247,0.20), rgba(52,211,153,0.14), rgba(249,115,115,0.10), rgba(56,189,248,0.0))",
          filter: "blur(10px)",
        }}
      />

      {/* glossy */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          background:
            "radial-gradient(900px circle at 15% 10%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(800px circle at 85% 80%, rgba(255,255,255,0.06), transparent 60%)",
        }}
      />

      {/* micro grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:18px_18px]" />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

/* =====================================================================================
  REVEAL / PARALLAX
===================================================================================== */

export function Reveal({ children, delay = 0, y = 18 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? { opacity: 1 } : { opacity: 0, y, filter: "blur(10px)" }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.6, 
        ease: "easeOut", 
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

export function ParallaxY({
  children,
  strength = 44,
  disabled = false,
}: {
  children: React.ReactNode;
  strength?: number;
  disabled?: boolean;
}) {
  if (disabled) {
    return <div>{children}</div>;
  }
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);
  return (
    <motion.div ref={ref} style={{ y }}>
      {children}
    </motion.div>
  );
}

/* =====================================================================================
  TEXT: GLITCH SCRAMBLE
===================================================================================== */

export function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (reduce) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+";
    let frame = 0;
    let raf = 0;

    const scramble = () => {
      frame++;
      const p = Math.min(1, frame / 26);
      const reveal = Math.floor(text.length * p);

      const next = text
        .split("")
        .map((c, i) => {
          if (i < reveal) return c;
          if (c === " ") return " ";
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("");

      setOut(next);
      if (p < 1) raf = requestAnimationFrame(scramble);
      else setOut(text);
    };

    raf = requestAnimationFrame(scramble);
    return () => cancelAnimationFrame(raf);
  }, [text, reduce]);

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-[2]">{out}</span>
      <span aria-hidden className="absolute left-0 top-0 z-[1] opacity-30 translate-x-[1px] -translate-y-[1px] text-sky-300 blur-[0.6px]">
        {out}
      </span>
      <span aria-hidden className="absolute left-0 top-0 z-[1] opacity-25 -translate-x-[1px] translate-y-[1px] text-fuchsia-300 blur-[0.6px]">
        {out}
      </span>
    </span>
  );
}

/* =====================================================================================
  TILT
===================================================================================== */

export function Tilt({ children, className = "", max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion() ?? false;

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotY = (px - 0.5) * max;
    const rotX = -(py - 0.5) * max;
    el.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0px)`;
  };

  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={cn("transition-transform duration-200 will-change-transform", className)}>
      {children}
    </div>
  );
}

/* =====================================================================================
  ORBIT PARTICLES
===================================================================================== */

export function OrbitParticles({
  className = "",
  count = 10,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            width: 420 + i * 28,
            height: 420 + i * 28,
            transform: "translate(-50%, -50%)",
            opacity: 0.08 + i * 0.01,
            animation: `spinSlow ${8 + i * 2.5}s linear infinite`,
          }}
        >
          <div
            className="absolute left-1/2 top-0 h-1.5 w-1.5 rounded-full bg-white"
            style={{
              transform: "translateX(-50%)",
              boxShadow:
                i % 3 === 0
                  ? "0 0 22px rgba(56,189,248,0.55)"
                  : i % 3 === 1
                  ? "0 0 22px rgba(168,85,247,0.50)"
                  : "0 0 22px rgba(52,211,153,0.45)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* =====================================================================================
  DOCK (hero quick actions)
===================================================================================== */

export function Dock({
  items,
  className = "",
}: {
  items: Array<{ label: string; onClick?: () => void; icon?: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-black/45 p-2 backdrop-blur-xl", className)}>
      {items.map((it) => (
        <button
          key={it.label}
          onClick={it.onClick}
          className="group relative flex items-center gap-2 rounded-xl border border-slate-800 bg-black/40 px-3 py-2 text-[11px] text-slate-200 hover:border-sky-500/40 hover:bg-slate-900/40 transition"
        >
          <span className="text-sky-300">{it.icon}</span>
          <span className="font-medium">{it.label}</span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500"
            style={{
              background: "radial-gradient(420px circle at 20% 20%, rgba(56,189,248,0.16), transparent 60%)",
            }}
          />
        </button>
      ))}
    </div>
  );
}

/* =====================================================================================
  OPTIONAL: MARQUEE PRIMITIVE (if you ever want it elsewhere)
===================================================================================== */

export function Marquee({ items, speed = 18 }: { items: React.ReactNode[]; speed?: number }) {
  const reduce = useReducedMotion() ?? false;
  const loop = useMemo(() => [...items, ...items], [items]);

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/75 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/75 to-transparent" />
      <motion.div
        className="flex gap-3 w-max"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={reduce ? undefined : { duration: speed, ease: "linear", repeat: Infinity }}
      >
        {loop.map((node, idx) => (
          <div key={idx} className="shrink-0">
            {node}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* =====================================================================================
  STAGGER ANIMATIONS (for sequential reveals)
===================================================================================== */

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export function StaggerContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : (containerVariants as any)}
      initial={reduce ? "visible" : "hidden"}
      whileInView={reduce ? "visible" : "visible"}
      viewport={{ once: true, margin: "-100px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : (itemVariants as any)}
    >
      {children}
    </motion.div>
  );
}
