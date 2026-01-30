"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const generative_ai_1 = require("@google/generative-ai");
const auth_middleware_1 = __importDefault(require("../middleware/auth.middleware"));
const role_middleware_1 = require("../middleware/role.middleware");
const firebase_1 = require("../config/firebase");
const router = express_1.default.Router();
/**
 * backend/.env
 * GEMINI_KEYS=key1,key2,key3
 * GEMINI_MODEL=gemini-2.5-flash (optional)
 *
 * server.ts must load env:
 *   import "dotenv/config";
 */
const RAW_KEYS = process.env.GEMINI_KEYS || "";
const GEMINI_KEYS = RAW_KEYS
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
function getUid(req) {
    const uid = req.user?.uid ||
        req.user?.user_id ||
        req.user?.id ||
        req.userId ||
        req.uid;
    return typeof uid === "string" && uid.trim() ? uid : null;
}
/* ------------------------------ Key state ------------------------------ */
const keyStates = GEMINI_KEYS.map((k) => ({
    key: k,
    blockedForever: false,
    cooldownUntil: null,
    lastError: null,
    lastStatus: null,
}));
let rrIndex = 0;
const now = () => Date.now();
function pickKey() {
    const n = keyStates.length;
    for (let i = 0; i < n; i++) {
        const idx = (rrIndex + i) % n;
        const ks = keyStates[idx];
        if (ks.blockedForever)
            continue;
        if (ks.cooldownUntil && ks.cooldownUntil > now())
            continue;
        rrIndex = (idx + 1) % n;
        return ks;
    }
    return null;
}
/* ------------------------------ Rate limiters ------------------------------ */
const atsLimiter = (0, express_rate_limit_1.default)({ windowMs: 60 * 1000, max: 8 });
const resumeAiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});
// ✅ Job Suggestions limiter
const jobSuggestLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});
/* ------------------------------ Error helpers ------------------------------ */
function getGeminiError(err) {
    const status = err?.status || err?.response?.status;
    const msg = err?.message ||
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        String(err);
    return {
        status: typeof status === "number" ? status : undefined,
        message: String(msg).replace(/\s+/g, " ").trim(),
    };
}
function isLeakedOrInvalid(err) {
    const m = getGeminiError(err).message.toLowerCase();
    return (m.includes("reported as leaked") ||
        m.includes("api key not valid") ||
        m.includes("api_key_invalid") ||
        m.includes("invalid api key"));
}
function isQuotaOrRateLimit(err) {
    const { status, message } = getGeminiError(err);
    const m = message.toLowerCase();
    return (status === 429 ||
        m.includes("exceeded your current quota") ||
        m.includes("rate limit") ||
        m.includes("too many requests") ||
        m.includes("resource_exhausted"));
}
function isOverloaded(err) {
    const { status, message } = getGeminiError(err);
    const m = message.toLowerCase();
    return status === 503 || m.includes("overloaded") || m.includes("unavailable");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* =========================================================
 * ATS deterministic engine
 * ========================================================= */
const HARD_SKILL_HINTS = [
    "kubernetes",
    "docker",
    "terraform",
    "ansible",
    "aws",
    "gcp",
    "azure",
    "linux",
    "git",
    "github",
    "gitlab",
    "jenkins",
    "cicd",
    "ci/cd",
    "microservices",
    "rest",
    "api",
    "sql",
    "mongodb",
    "redis",
    "python",
    "java",
    "javascript",
    "node",
    "express",
    "react",
    "typescript",
    "postgres",
    "mysql",
    "prometheus",
    "grafana",
    "splunk",
    "elk",
    "nginx",
    "kafka",
    "spark",
    "ml",
    "ai",
    "genai",
    "llm",
];
const SOFT_SKILL_HINTS = [
    "communication",
    "collaboration",
    "teamwork",
    "leadership",
    "ownership",
    "problem solving",
    "stakeholder",
    "agile",
    "scrum",
    "kanban",
    "prioritize",
    "initiative",
    "mentoring",
];
const ACTION_VERBS = [
    "built",
    "developed",
    "designed",
    "implemented",
    "delivered",
    "optimized",
    "improved",
    "automated",
    "migrated",
    "deployed",
    "led",
    "owned",
    "created",
    "integrated",
    "reduced",
    "increased",
    "enhanced",
    "monitored",
    "debugged",
    "shipped",
    "architected",
];
function normalize(s) {
    return s.toLowerCase().replace(/\s+/g, " ").trim();
}
function tokenize(s) {
    return normalize(s)
        .replace(/[^a-z0-9+\-#/.\s]/g, " ")
        .split(" ")
        .map((x) => x.trim())
        .filter(Boolean);
}
function uniq(arr) {
    return Array.from(new Set(arr));
}
function countRegex(text, re) {
    const m = text.match(re);
    return m ? m.length : 0;
}
function clamp0_100(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
}
function extractKeywordsFromJD(jobDescription) {
    const jd = normalize(jobDescription);
    const hard = HARD_SKILL_HINTS.filter((k) => jd.includes(k));
    const soft = SOFT_SKILL_HINTS.filter((k) => jd.includes(k));
    const rawTokens = tokenize(jobDescription);
    const techish = rawTokens.filter((t) => t.length >= 3 && t.length <= 24);
    const combined = uniq([...hard, ...soft, ...techish]);
    const stop = new Set([
        "and",
        "or",
        "the",
        "with",
        "for",
        "to",
        "in",
        "of",
        "a",
        "an",
        "on",
        "as",
        "is",
        "are",
        "be",
        "you",
        "we",
        "our",
        "your",
        "this",
        "that",
        "will",
        "should",
        "must",
        "experience",
        "knowledge",
        "skills",
        "ability",
        "understanding",
        "years",
        "year",
        "role",
        "responsibilities",
        "requirements",
        "preferred",
        "strong",
        "good",
    ]);
    return uniq(combined.map(normalize).filter((x) => x && !stop.has(x))).slice(0, 280);
}
function detectCoreHeadings(resume) {
    const t = normalize(resume);
    const must = ["experience", "education", "skills"];
    return must.every((h) => t.includes(h));
}
function computeATSScore(resumeTextRaw, jobDescRaw) {
    const resumeText = normalize(resumeTextRaw);
    const jobDescription = normalize(jobDescRaw);
    const jdKeywords = extractKeywordsFromJD(jobDescRaw);
    const present = [];
    const missing = [];
    for (const k of jdKeywords) {
        const ok = resumeText.includes(k);
        (ok ? present : missing).push(k);
    }
    const keywordScore = jdKeywords.length === 0 ? 60 : (present.length / jdKeywords.length) * 100;
    const jdHard = HARD_SKILL_HINTS.filter((k) => jobDescription.includes(k));
    const jdSoft = SOFT_SKILL_HINTS.filter((k) => jobDescription.includes(k));
    const hardPresent = jdHard.filter((k) => resumeText.includes(k));
    const softPresent = jdSoft.filter((k) => resumeText.includes(k));
    const hardSkillScore = jdHard.length === 0 ? 60 : (hardPresent.length / jdHard.length) * 100;
    const softSkillScore = jdSoft.length === 0 ? 60 : (softPresent.length / jdSoft.length) * 100;
    const bulletsCount = countRegex(resumeTextRaw, /(^|\n)\s*[-•]\s+/g);
    const metricsCount = countRegex(resumeTextRaw, /\b(\d+%|\d+\s?(x|X)|\d+\s?(k|K|m|M)|₹\s?\d+|\$\s?\d+)\b/g);
    const actionVerbSignals = ACTION_VERBS.filter((v) => resumeText.includes(v)).length;
    const impactScore = clamp0_100((Math.min(metricsCount, 10) / 10) * 55 +
        (Math.min(actionVerbSignals, 12) / 12) * 45);
    const suspiciousTableSignals = resumeTextRaw.includes("|") ||
        resumeTextRaw.includes("│") ||
        resumeTextRaw.includes("—|") ||
        resumeTextRaw.includes("|—");
    const emailDetected = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resumeTextRaw);
    const phoneDetected = /\b(\+?\d{1,3}[\s-]?)?\d{10}\b/.test(resumeTextRaw.replace(/[()]/g, ""));
    const linkedinDetected = /linkedin\.com/i.test(resumeTextRaw);
    const githubDetected = /github\.com/i.test(resumeTextRaw);
    const hasCoreHeadings = detectCoreHeadings(resumeTextRaw);
    const len = resumeTextRaw.length;
    const pageHint = len < 3500 ? "short" : len > 9000 ? "long" : "ok";
    const issues = [];
    const wins = [];
    if (suspiciousTableSignals)
        issues.push("Table/column formatting signals detected; ATS parsing may break.");
    else
        wins.push("No obvious table separators detected (ATS friendly).");
    if (hasCoreHeadings)
        wins.push("Core headings detected (Skills/Experience/Education).");
    else
        issues.push("Core headings missing or weak; add clear Skills, Experience, Education headings.");
    if (bulletsCount >= 10)
        wins.push("Good bullet density; easy for recruiters to scan.");
    else if (bulletsCount >= 5)
        wins.push("Some bullet points detected; can increase for impact.");
    else
        issues.push("Low bullet usage; convert Experience/Projects into bullets.");
    if (metricsCount >= 5)
        wins.push("Strong quantified impact (numbers/%, scale) detected.");
    else if (metricsCount >= 2)
        wins.push("Some metrics detected; add more quantified outcomes.");
    else
        issues.push("Low measurable impact; add numbers: %, time saved, users, scale, revenue.");
    if (actionVerbSignals >= 8)
        wins.push("Strong action verbs coverage (good framing).");
    else
        issues.push("Action verbs weak; use built/implemented/optimized/led with outcomes.");
    if (!emailDetected)
        issues.push("Email not detected; ensure contact section is parseable.");
    if (!phoneDetected)
        issues.push("Phone not detected; add a clear phone line.");
    if (!linkedinDetected)
        issues.push("LinkedIn not detected; add your profile URL.");
    const formatScore = clamp0_100(100 -
        (suspiciousTableSignals ? 25 : 0) -
        (!hasCoreHeadings ? 18 : 0) -
        (!emailDetected ? 10 : 0) -
        (!phoneDetected ? 8 : 0) -
        (pageHint === "long" ? 10 : 0) -
        (pageHint === "short" ? 8 : 0));
    const roleFitScore = clamp0_100(0.55 * keywordScore + 0.25 * hardSkillScore + 0.2 * softSkillScore);
    const matchPercent = clamp0_100(0.32 * keywordScore +
        0.24 * hardSkillScore +
        0.12 * softSkillScore +
        0.18 * impactScore +
        0.14 * formatScore);
    return {
        matchPercent,
        keywordScore: clamp0_100(keywordScore),
        hardSkillScore: clamp0_100(hardSkillScore),
        softSkillScore: clamp0_100(softSkillScore),
        roleFitScore: clamp0_100(roleFitScore),
        impactScore: clamp0_100(impactScore),
        formatScore: clamp0_100(formatScore),
        keywords: {
            total: jdKeywords.length,
            presentTop: present.slice(0, 50),
            missingTop: missing.slice(0, 50),
        },
        format: {
            issues: issues.slice(0, 18),
            wins: wins.slice(0, 18),
            stats: {
                bulletsCount,
                metricsCount,
                actionVerbSignals,
                emailDetected,
                phoneDetected,
                linkedinDetected,
                githubDetected,
                hasCoreHeadings,
                suspiciousTableSignals,
                pageHint,
            },
        },
    };
}
function mapToFrontendEngine(raw) {
    const overallScore = raw.matchPercent;
    const categoryScores = {
        atsCompatibility: raw.formatScore,
        keywordMatch: raw.keywordScore,
        experienceAlignment: raw.hardSkillScore,
        impactMetrics: raw.impactScore,
        readability: clamp0_100(55 +
            Math.min(raw.format.stats.bulletsCount, 20) * 2 +
            Math.min(raw.format.stats.actionVerbSignals, 12) * 2),
        structure: clamp0_100(60 +
            Math.min(raw.format.stats.bulletsCount, 18) * 2 +
            Math.min(raw.format.stats.metricsCount, 10) * 2),
    };
    return {
        overallScore,
        categoryScores,
        keywordInsights: {
            present: raw.keywords.presentTop,
            missing: raw.keywords.missingTop,
            criticalMissing: raw.keywords.missingTop.slice(0, 12),
        },
        formatFindings: {
            issues: raw.format.issues,
            wins: raw.format.wins,
        },
        matchPercent: raw.matchPercent,
        hardScore: raw.hardSkillScore,
        softScore: raw.softSkillScore,
        keywords: {
            total: raw.keywords.total,
            presentTop: raw.keywords.presentTop,
            missingTop: raw.keywords.missingTop,
        },
        format: {
            issues: raw.format.issues,
            wins: raw.format.wins,
            stats: {
                bulletsCount: raw.format.stats.bulletsCount,
                metricsCount: raw.format.stats.metricsCount,
                actionVerbSignals: raw.format.stats.actionVerbSignals,
            },
        },
    };
}
/* ------------------------------ JSON extraction ------------------------------ */
function safeExtractJson(text) {
    const m = text.match(/```json([\s\S]*?)```/i);
    if (m?.[1])
        return m[1].trim();
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first)
        return text.slice(first, last + 1).trim();
    return null;
}
function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
/* ------------------------------ Gemini call with backoff ------------------------------ */
async function geminiGenerateText(apiKey, prompt) {
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
        },
    });
    const out = await model.generateContent(prompt);
    return out.response.text();
}
async function callGeminiWithBackoff(prompt) {
    let lastStatus = null;
    let lastError = null;
    for (let attempt = 0; attempt < keyStates.length; attempt++) {
        const ks = pickKey();
        if (!ks)
            break;
        for (let r = 0; r < 3; r++) {
            try {
                const text = await geminiGenerateText(ks.key, prompt);
                ks.lastError = null;
                ks.lastStatus = 200;
                return { ok: true, text, lastStatus: 200, lastError: null };
            }
            catch (err) {
                const meta = getGeminiError(err);
                lastStatus = meta.status ?? null;
                lastError = meta.message;
                ks.lastError = meta.message;
                ks.lastStatus = meta.status ?? null;
                if (isLeakedOrInvalid(err)) {
                    ks.blockedForever = true;
                    break;
                }
                if (isQuotaOrRateLimit(err)) {
                    ks.cooldownUntil = now() + 15 * 60 * 1000;
                    break;
                }
                if (isOverloaded(err)) {
                    await sleep(450 * (r + 1) * (r + 1));
                    continue;
                }
                break;
            }
        }
    }
    return { ok: false, text: "", lastStatus, lastError };
}
async function geminiJsonStrict(prompt) {
    const g = await callGeminiWithBackoff(prompt);
    if (!g.ok) {
        const msg = `Gemini failed: ${g.lastError || "Unknown"}${g.lastStatus ? ` (HTTP ${g.lastStatus})` : ""}`;
        throw new Error(msg);
    }
    const jsonStr = safeExtractJson(g.text) ?? g.text;
    const parsed = safeJsonParse(jsonStr);
    if (!parsed)
        throw new Error("AI returned non-JSON output unexpectedly");
    return parsed;
}
/* ------------------------------ ✅ Job Suggestions normalize helper ------------------------------ */
function normalizeJobSuggestions(input) {
    const arr = Array.isArray(input?.jobs)
        ? input.jobs
        : Array.isArray(input)
            ? input
            : [];
    if (!Array.isArray(arr))
        return [];
    const cleaned = arr
        .map((j) => ({
        title: String(j?.title ?? "").trim(),
        level: String(j?.level ?? "").trim(),
        summary: String(j?.summary ?? "").trim(),
        idealCompanies: Array.isArray(j?.idealCompanies)
            ? j.idealCompanies.map((x) => String(x).trim()).filter(Boolean)
            : [],
        keySkills: Array.isArray(j?.keySkills)
            ? j.keySkills.map((x) => String(x).trim()).filter(Boolean)
            : [],
    }))
        .filter((j) => j.title && j.level && j.summary)
        .slice(0, 10)
        .map((j) => ({
        ...j,
        idealCompanies: j.idealCompanies.slice(0, 8),
        keySkills: j.keySkills.slice(0, 18),
    }));
    return cleaned;
}
/* =========================================================
 * Routes
 * ========================================================= */
router.get("/ping", (_req, res) => {
    res.json({
        ok: true,
        keyCount: keyStates.length,
        keys: keyStates.map((k) => ({
            blocked: !!k.blockedForever,
            cooldownUntil: k.cooldownUntil,
            lastError: k.lastError,
            lastStatus: k.lastStatus,
        })),
    });
});
/* ------------------------------ ATS Analyzer ------------------------------ */
function buildAiPrompt(resumeText, jobDescription, engine) {
    return `
Return ONLY valid JSON. No markdown. No backticks. No extra text.

Schema:
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "plan30": ["string"],
  "plan60": ["string"],
  "plan90": ["string"],
  "tailoredResume": "string",
  "changesMade": "string",
  "generatedResume": "string",
  "about": "string",
  "improve": "string",
  "percent": "string"
}

Constraints:
- Do not invent companies/roles/projects/years.
- Use only resume facts; if unknown, use placeholders like [Project], [Metric], [Link].
- TailoredResume: ATS-friendly, single-column, clean headings, bullets.
- GeneratedResume: JD-based template with placeholders only (no fake companies).
- Ensure arrays have meaningful items.

Missing keywords to focus: ${(engine.keywordInsights?.missing ||
        engine.keywords?.missingTop ||
        [])
        .slice(0, 25)
        .join(", ")}

Resume:
${resumeText}

JobDescription:
${jobDescription}
`.trim();
}
router.post("/ats-analyzer", atsLimiter, express_1.default.json({ limit: "16mb" }), async (req, res) => {
    try {
        const { jobDescription, resumeText } = req.body;
        if (!jobDescription?.trim() || !resumeText?.trim()) {
            return res
                .status(400)
                .json({ error: "jobDescription and resumeText are required." });
        }
        const raw = computeATSScore(String(resumeText).slice(0, 140000), String(jobDescription).slice(0, 80000));
        const engine = mapToFrontendEngine(raw);
        if (!keyStates.length) {
            return res.json({
                engine,
                sections: null,
                warning: "No Gemini keys configured. Returned deterministic engine only.",
            });
        }
        const prompt = buildAiPrompt(String(resumeText).slice(0, 110000), String(jobDescription).slice(0, 60000), engine);
        const g = await callGeminiWithBackoff(prompt);
        if (g.ok) {
            const jsonStr = safeExtractJson(g.text) ?? g.text;
            const parsed = safeJsonParse(jsonStr);
            if (parsed) {
                const safeSections = {
                    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
                    plan30: Array.isArray(parsed.plan30) ? parsed.plan30 : [],
                    plan60: Array.isArray(parsed.plan60) ? parsed.plan60 : [],
                    plan90: Array.isArray(parsed.plan90) ? parsed.plan90 : [],
                    tailoredResume: String(parsed.tailoredResume || ""),
                    generatedResume: String(parsed.generatedResume || ""),
                    changesMade: String(parsed.changesMade || ""),
                    about: String(parsed.about || ""),
                    improve: String(parsed.improve || ""),
                    percent: String(parsed.percent || `${engine.overallScore ?? engine.matchPercent ?? 0}%`),
                };
                return res.json({
                    engine,
                    sections: safeSections,
                    warning: null,
                    gemini: { lastStatus: 200, lastError: null },
                    keyStatus: keyStates.map((k) => ({
                        blocked: !!k.blockedForever,
                        cooling: !!(k.cooldownUntil && k.cooldownUntil > now()),
                        lastStatus: k.lastStatus,
                    })),
                });
            }
            return res.json({
                engine,
                sections: null,
                warning: "AI returned non-JSON output unexpectedly. Returning deterministic engine only.",
                gemini: { lastStatus: g.lastStatus, lastError: "Non-JSON output from model" },
            });
        }
        return res.json({
            engine,
            sections: null,
            warning: `AI partial mode: ${g.lastError || "Unknown error"}${g.lastStatus ? ` (HTTP ${g.lastStatus})` : ""}`,
            gemini: { lastStatus: g.lastStatus, lastError: g.lastError },
        });
    }
    catch (err) {
        console.error("[ATS] fatal:", err);
        return res.status(500).json({
            error: "ATS failed",
            details: err?.message || "Unknown error",
            lastError: err?.message || "Unknown error",
            lastStatus: 500,
        });
    }
});
/* =========================================================
 * ✅ Job Suggestions
 * ========================================================= */
router.post("/job-suggestions", jobSuggestLimiter, auth_middleware_1.default, role_middleware_1.requireStudent, express_1.default.json({ limit: "2mb" }), async (req, res) => {
    try {
        const body = (req.body || {});
        const currentProfile = String(body.currentProfile || "").trim();
        const interests = String(body.interests || "").trim();
        const locationPref = String(body.locationPref || "").trim();
        if (!currentProfile && !interests) {
            return res.status(400).json({
                ok: false,
                message: "Provide at least currentProfile or interests",
            });
        }
        // Optional tiny personalization from student doc
        let studentContext = "";
        const uid = getUid(req);
        if (uid) {
            const snap = await firebase_1.firestore.collection("students").doc(uid).get();
            const st = snap.data() || {};
            const name = st.fullname || st.name || "";
            const branch = st.branch || "";
            const year = st.year || "";
            studentContext = `
STUDENT_META:
name: ${name || "(unknown)"}
branch: ${branch || "(unknown)"}
year: ${year || "(unknown)"}
`.trim();
        }
        const prompt = `
Return ONLY valid JSON. No markdown. No backticks. No extra text.

You are an expert career advisor for computer science students.
Your output MUST match this schema exactly:

{
  "jobs": [
    {
      "title": "string",
      "level": "string (Intern / Entry / New Grad / Junior / Mid)",
      "summary": "string (2-3 lines, specific and actionable)",
      "idealCompanies": ["string", "..."],
      "keySkills": ["string", "..."]
    }
  ]
}

Rules:
- Generate 5 to 7 roles.
- Titles must be realistic common roles on job portals.
- Avoid repeating near-identical roles.
- keySkills: 8 to 14 items each (mix of tech + concepts).
- idealCompanies: 3 to 6 companies (mix big + startups relevant).
- If the user sounds like a student, include internships/new-grad roles.
- Keep summaries crisp; no generic filler.

${studentContext}

USER_CURRENT_PROFILE:
${currentProfile || "(not provided)"}

USER_INTERESTS:
${interests || "(not provided)"}

LOCATION_PREFERENCE:
${locationPref || "(not provided)"}
      `.trim();
        const parsed = await geminiJsonStrict(prompt);
        const jobs = normalizeJobSuggestions(parsed);
        return res.json({
            ok: true,
            jobs,
            keyStatus: keyStates.map((k) => ({
                blocked: !!k.blockedForever,
                cooling: !!(k.cooldownUntil && k.cooldownUntil > now()),
                lastStatus: k.lastStatus,
            })),
        });
    }
    catch (e) {
        console.error("[job-suggestions] error:", e);
        return res.status(500).json({
            ok: false,
            message: e?.message || "Job suggestions failed",
        });
    }
});
/* =========================================================
 * ✅ Resume Builder AI Routes
 * ========================================================= */
router.get("/resume-builder/skill-badges", auth_middleware_1.default, role_middleware_1.requireStudent, async (req, res) => {
    try {
        const uid = getUid(req);
        if (!uid)
            return res
                .status(401)
                .json({ ok: false, message: "Unauthorized (uid missing)" });
        const platforms = [
            "leetcode",
            "codechef",
            "codeforces",
            "hackerrank",
            "github",
            "atcoder",
        ];
        const badges = [];
        const suggestedConcepts = new Set();
        const suggestedTools = new Set();
        for (const p of platforms) {
            const snap = await firebase_1.firestore
                .collection("students")
                .doc(uid)
                .collection("cpProfiles")
                .doc(p)
                .get();
            const stats = snap.data() || {};
            if (p === "leetcode") {
                const solved = Number(stats.totalSolved ||
                    stats.problemsSolvedTotal ||
                    stats.problemsSolved ||
                    0);
                if (solved >= 500)
                    badges.push({ label: "LeetCode 500+", level: "platinum", meta: `${solved}` });
                else if (solved >= 300)
                    badges.push({ label: "LeetCode 300+", level: "gold", meta: `${solved}` });
                else if (solved >= 150)
                    badges.push({ label: "LeetCode 150+", level: "silver", meta: `${solved}` });
                suggestedConcepts.add("Problem Solving");
                suggestedConcepts.add("DSA");
            }
            if (p === "codeforces") {
                const maxRating = Number(stats.maxRating || stats.currentRating || stats.rating || 0);
                if (maxRating >= 1800)
                    badges.push({ label: "Codeforces Expert+", level: "platinum", meta: `${maxRating}` });
                else if (maxRating >= 1400)
                    badges.push({ label: "Codeforces Specialist+", level: "gold", meta: `${maxRating}` });
                else if (maxRating >= 1200)
                    badges.push({ label: "Codeforces 1200+", level: "silver", meta: `${maxRating}` });
                suggestedConcepts.add("Competitive Programming");
                suggestedConcepts.add("Algorithms");
            }
            if (p === "codechef") {
                const maxRating = Number(stats.maxRating || stats.currentRating || stats.rating || 0);
                if (maxRating >= 2000)
                    badges.push({ label: "CodeChef 2000+", level: "platinum", meta: `${maxRating}` });
                else if (maxRating >= 1600)
                    badges.push({ label: "CodeChef 1600+", level: "gold", meta: `${maxRating}` });
                else if (maxRating >= 1400)
                    badges.push({ label: "CodeChef 1400+", level: "silver", meta: `${maxRating}` });
                suggestedConcepts.add("Competitive Programming");
            }
            if (p === "hackerrank") {
                const badgesCount = Array.isArray(stats.badges)
                    ? stats.badges.length
                    : Number(stats.badgesCount || 0);
                if (badgesCount >= 10)
                    badges.push({ label: "HackerRank 10+ badges", level: "gold", meta: `${badgesCount}` });
                else if (badgesCount >= 5)
                    badges.push({ label: "HackerRank 5+ badges", level: "silver", meta: `${badgesCount}` });
                suggestedConcepts.add("Problem Solving");
            }
            if (p === "github") {
                const contrib = Number(stats.contributions || stats.totalContributions || 0);
                if (contrib >= 1000)
                    badges.push({ label: "GitHub 1000+ contribs", level: "platinum", meta: `${contrib}` });
                else if (contrib >= 500)
                    badges.push({ label: "GitHub 500+ contribs", level: "gold", meta: `${contrib}` });
                else if (contrib >= 200)
                    badges.push({ label: "GitHub 200+ contribs", level: "silver", meta: `${contrib}` });
                suggestedTools.add("Git");
                suggestedTools.add("GitHub");
                suggestedConcepts.add("Open Source");
            }
            if (p === "atcoder") {
                const maxRating = Number(stats.maxRating || stats.rating || 0);
                if (maxRating >= 1200)
                    badges.push({ label: "AtCoder 1200+", level: "gold", meta: `${maxRating}` });
                else if (maxRating >= 800)
                    badges.push({ label: "AtCoder 800+", level: "silver", meta: `${maxRating}` });
                suggestedConcepts.add("Competitive Programming");
            }
        }
        return res.json({
            ok: true,
            badges,
            suggestedConcepts: Array.from(suggestedConcepts),
            suggestedTools: Array.from(suggestedTools),
        });
    }
    catch (e) {
        return res
            .status(500)
            .json({ ok: false, message: e?.message || "Failed to import badges" });
    }
});
router.post("/resume-builder/ai-build", resumeAiLimiter, auth_middleware_1.default, role_middleware_1.requireStudent, express_1.default.json({ limit: "4mb" }), async (req, res) => {
    try {
        const { resume, template } = req.body || {};
        if (!resume)
            return res.status(400).json({ ok: false, message: "Missing resume" });
        const prompt = `
Return ONLY JSON: {"ok":true,"resume":{...same schema as input...}}.
No markdown.

You are an expert tech resume writer.

Rules:
- ATS-safe, single-column, simple bullets.
- Do NOT invent companies/roles/years/metrics.
- Improve summary and bullet clarity with truthful phrasing.
- Preserve schema keys exactly (same keys as input).
- If data missing, keep empty or placeholder, don't hallucinate.

template: ${template || ""}

INPUT RESUME JSON:
${JSON.stringify(resume)}
`.trim();
        const parsed = await geminiJsonStrict(prompt);
        if (!parsed?.ok || !parsed?.resume) {
            return res.status(502).json({ ok: false, message: "Bad AI JSON response" });
        }
        return res.json(parsed);
    }
    catch (e) {
        return res.status(500).json({ ok: false, message: e?.message || "AI build failed" });
    }
});
router.post("/resume-builder/tailor", resumeAiLimiter, auth_middleware_1.default, role_middleware_1.requireStudent, express_1.default.json({ limit: "10mb" }), async (req, res) => {
    try {
        const { resume, template, targetRole, jobDescription } = req.body || {};
        if (!resume)
            return res.status(400).json({ ok: false, message: "Missing resume" });
        if (!jobDescription)
            return res.status(400).json({ ok: false, message: "Missing jobDescription" });
        const prompt = `
Return ONLY JSON: {"ok":true,"resume":{...same schema as input...}}.
No markdown.

You are a resume tailoring expert.

Goals:
- Align summary/skills/bullets to JD keywords naturally.
- Do NOT lie: no fake companies/awards/metrics.
- Reorder strongest content first.
- Preserve schema keys exactly.

template: ${template || ""}
targetRole: ${targetRole || ""}

JOB DESCRIPTION:
${jobDescription}

RESUME JSON:
${JSON.stringify(resume)}
`.trim();
        const parsed = await geminiJsonStrict(prompt);
        if (!parsed?.ok || !parsed?.resume) {
            return res.status(502).json({ ok: false, message: "Bad AI JSON response" });
        }
        return res.json(parsed);
    }
    catch (e) {
        return res.status(500).json({ ok: false, message: e?.message || "Tailoring failed" });
    }
});
router.post("/resume-builder/rewrite-bullets", resumeAiLimiter, auth_middleware_1.default, role_middleware_1.requireStudent, express_1.default.json({ limit: "2mb" }), async (req, res) => {
    try {
        const { section, item, targetRole, jobDescription } = req.body || {};
        if (!item)
            return res.status(400).json({ ok: false, message: "Missing item" });
        const prompt = `
Return ONLY JSON: {"ok":true,"bullets":[...]}.
No markdown.

Rewrite bullets for section="${section}".

Rules:
- 3 to 6 bullets.
- ATS-friendly, strong action verbs, concise.
- Do NOT invent achievements/companies/metrics.
- If impact isn't provided, keep safe phrasing.
- Align to targetRole/JD if provided.

targetRole: ${targetRole || ""}

JOB DESCRIPTION (optional):
${jobDescription || ""}

ITEM JSON:
${JSON.stringify(item)}
`.trim();
        const parsed = await geminiJsonStrict(prompt);
        if (!parsed?.ok || !Array.isArray(parsed?.bullets)) {
            return res.status(502).json({ ok: false, message: "Bad AI JSON response" });
        }
        return res.json(parsed);
    }
    catch (e) {
        return res.status(500).json({ ok: false, message: e?.message || "Rewrite failed" });
    }
});
exports.default = router;
