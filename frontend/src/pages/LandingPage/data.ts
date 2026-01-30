// src/pages/LandingPage/data.ts
import React from "react";
import {
  RiLineChartLine,
  RiTrophyLine,
  RiCalendarEventLine,
  RiRobot2Line,
  RiBook2Line,
  RiChatSmile2Line,
  RiUserStarLine,
  RiBuilding2Line,
  RiTeamLine,
} from "react-icons/ri";

/* =====================================================================================
  TYPES
===================================================================================== */

export type StatItem = {
  label: string;
  target: number;
  suffix?: string;
  hint?: string;
};

export type PlatformItem = {
  name: string;
  logoUrl: string; // can be remote (cdn) or local (recommended later)
};

export type FeatureBlock = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  desc: string;
  points: string[];
  tag: "dashboard" | "leaderboard" | "ai" | "calendar" | "career" | "resources";
};

export type RoleBlock = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  points: string[];
};

/* =====================================================================================
  DATA
===================================================================================== */

export const STATS: StatItem[] = [
  { label: "Problems tracked", target: 2500000, suffix: "+", hint: "Across linked handles" },
  { label: "Contests analysed", target: 45000, suffix: "+", hint: "Ratings + history stitched" },
  { label: "Students onboarded", target: 12000, suffix: "+", hint: "Campus + clubs" },
  { label: "Platforms unified", target: 6, suffix: "", hint: "One command center" },
];

// ✅ Only your 6 platforms (logos + names below)
export const PLATFORMS: PlatformItem[] = [
  {
    name: "LeetCode",
    logoUrl: "https://cdn.simpleicons.org/leetcode/ffffff",
  },
  {
    name: "Codeforces",
    logoUrl: "https://cdn.simpleicons.org/codeforces/ffffff",
  },
  {
    name: "CodeChef",
    logoUrl: "https://cdn.simpleicons.org/codechef/ffffff",
  },
  {
    name: "HackerRank",
    logoUrl: "https://cdn.simpleicons.org/hackerrank/ffffff",
  },
  {
    name: "AtCoder",
    // sometimes not present on simpleicons; favicon is stable
    logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=atcoder.jp",
  },
  {
    name: "GitHub",
    logoUrl: "https://cdn.simpleicons.org/github/ffffff",
  },
];

export const FEATURE_BLOCKS: FeatureBlock[] = [
  {
    icon: RiLineChartLine,
    eyebrow: "01 · Multi-platform dashboard",
    title: "A command center for your daily progress.",
    desc: "CodeSync stitches your submissions, streaks, topics and ratings into one premium dashboard that feels alive — not like a spreadsheet.",
    points: ["Unified stats across all linked platforms", "Momentum + streak timelines + trendlines", "Topic + difficulty clarity for faster growth"],
    tag: "dashboard",
  },
  {
    icon: RiTrophyLine,
    eyebrow: "02 · Smart leaderboards",
    title: "Rankings that reward consistency.",
    desc: "Leaderboards that reflect sustained performance — built for batches, clubs, labs and events (not one lucky contest).",
    points: ["Cohorts by branch/year/section/club", "Scheduled sync and verified profiles", "Export-ready views for faculty/events"],
    tag: "leaderboard",
  },
  {
    icon: RiChatSmile2Line,
    eyebrow: "03 · AI assistant + CodePad",
    title: "Mentor-style help inside your editor.",
    desc: "Write and debug with an AI that explains logic, finds bugs, and suggests edge cases — without dumping full solutions.",
    points: ["Ask: why TLE? where bug? give edge cases", "Learning-first guidance (not spoon-feeding)", "Works perfectly with your CodePad flow"],
    tag: "ai",
  },
  {
    icon: RiCalendarEventLine,
    eyebrow: "04 · Contest calendar",
    title: "Contests across platforms — one timeline.",
    desc: "A clean calendar that aggregates upcoming contests and overlays your participation story — schedule, prep and compete with zero tab-hopping.",
    points: ["Unified contest feed across platforms", "Participation + rating trends in one view", "Shareable plans for teams & cohorts"],
    tag: "calendar",
  },
  {
    icon: RiRobot2Line,
    eyebrow: "05 · Career Suite",
    title: "From coding profile → placement profile.",
    desc: "Turn real activity into recruiter-ready material: ATS improvements, resume builder, and skill-aligned opportunities.",
    points: ["ATS analyzer with actionable fixes", "Resume builder powered by your CodeSync data", "Opportunity layer aligned to your skills"],
    tag: "career",
  },
  {
    icon: RiBook2Line,
    eyebrow: "06 · Resources hub",
    title: "Resources mapped to weak spots.",
    desc: "Not a link dump. CodeSync suggests the right sheets, mindmaps and playlists based on what you actually need next.",
    points: ["DSA + Core CS maps (OS/DBMS/CN/OOP)", "Sheets + playlists by topic & difficulty", "Campus bootcamps tied to performance"],
    tag: "resources",
  },
];

export const HOW_STEPS = [
  {
    label: "Step 01",
    title: "Connect platforms",
    desc: "Google sign-in + link handles. No passwords stored — only public/authorised stats are read.",
  },
  {
    label: "Step 02",
    title: "We stitch the story",
    desc: "We fetch, clean and unify your data into dashboards, leaderboards and timelines.",
  },
  {
    label: "Step 03",
    title: "Share one link",
    desc: "Use your CodeSync profile for clubs, fests, internships and placements.",
  },
];

export const SECURITY_POINTS = [
  "OAuth-based login — no raw passwords handled by CodeSync.",
  "Read-only access; we never submit code for you.",
  "Encrypted in transit; access is scoped to your profile.",
  "Institute views can be aggregated/anonymised if needed.",
];

export const ROLES: RoleBlock[] = [
  {
    icon: RiUserStarLine,
    title: "Students",
    points: ["One link for your entire coding identity", "Instant view of streaks, contests, topics & ratings", "Use CodeSync profile in resumes & interviews"],
  },
  {
    icon: RiBuilding2Line,
    title: "Faculty & Departments",
    points: ["Monitor CP & lab activity without spreadsheets", "Spot top performers + students needing support", "Export stats for reviews and reports"],
  },
  {
    icon: RiTeamLine,
    title: "Clubs & Organisers",
    points: ["Cohorts for fests, hackathons, CP groups", "Verified multi-platform shortlisting", "Showcase top coders during events"],
  },
];