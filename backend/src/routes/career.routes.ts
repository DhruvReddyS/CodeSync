// backend/src/routes/career.routes.ts

import express, { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";

const router = express.Router();

/* -------------------------------------------------------
 * 🔑 GEMINI API KEYS (NO .env)
 * ----------------------------------------------------- */

const GEMINI_KEYS = [
  "AIzaSyD8nbZuM0LEFjmRnOJ6Ax2A9E3dhWAoiYw",
  "AIzaSyB3s9m2K69KtE7pcT3_L-_-vF2g59kRAgk",
  "AIzaSyCn8ATDZk8gu_R0SMvHHIQ0I480pVEJFMs",
];

let keyIndex = 0;

function getModel() {
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  keyIndex++;

  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash", // if any key has issues, you can swap to "gemini-1.5-flash"
  });
}

/* -------------------------------------------------------
 * 📄 MULTER (PDF upload in memory)
 * ----------------------------------------------------- */

const upload = multer(); // memory storage → req.file.buffer

/* -------------------------------------------------------
 * 🧹 AI JSON CLEANER
 * ----------------------------------------------------- */

function parseJsonLoose<T = any>(raw: string): T {
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");
    return JSON.parse(cleaned);
  }
}

/* -------------------------------------------------------
 * 📄 PDF → TEXT via GEMINI (no pdf-parse)
 * ----------------------------------------------------- */

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const model = getModel();
    const base64 = buffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: "application/pdf",
        },
      },
      {
        text: `
You are reading a resume PDF.
Extract ONLY the raw plain text content in reading order.
Do NOT summarize, do NOT add comments. Just output the full text.
        `.trim(),
      },
    ]);

    const text = result.response.text().trim();
    return text;
  } catch (err) {
    console.error("PDF → TEXT (Gemini) error:", err);
    return "";
  }
}

/* -------------------------------------------------------
 * 📌 1. ATS ANALYZER — WITH PDF SUPPORT (via Gemini)
 * ----------------------------------------------------- */

router.post(
  "/ats-analyzer",
  upload.single("resumeFile"),
  async (req: Request, res: Response) => {
    try {
      const model = getModel();

      const body: any = req.body || {};

      let resumeText: string = body.resumeText || "";
      const jobDescription: string = body.jobDescription || "";

      const jobTitle: string = body.jobTitle || "";
      const companyName: string = body.companyName || "";
      const jobLocation: string = body.jobLocation || "";
      const jobSeniority: string = body.jobSeniority || "";

      // 1️⃣ If no resumeText but PDF file is present → let Gemini extract text
      if (!resumeText && req.file) {
        const extracted = await extractTextFromPdf(req.file.buffer);
        if (extracted) {
          resumeText = extracted;
          console.log("[ATS] Extracted resume text from PDF, length:", extracted.length);
        } else {
          console.warn("[ATS] PDF text extraction failed, falling back to text-only mode.");
        }
      }

      // 2️⃣ Still nothing? Then we cannot proceed.
      if (!resumeText || !jobDescription) {
        return res.status(400).json({
          error:
            "Missing resume text or job description. Paste your resume or upload a readable PDF.",
        });
      }

      const prompt = `
You are the most advanced ATS (Applicant Tracking System) simulator for SOFTWARE/TECH roles.

Return ONLY valid JSON. No markdown, no commentary.

JOB META:
- Title: ${jobTitle || "Not specified"}
- Company: ${companyName || "Not specified"}
- Location: ${jobLocation || "Not specified"}
- Seniority: ${jobSeniority || "Not specified"}

Compare the RESUME and JOB DESCRIPTION and return:

{
  "overallScore": 0-100,
  "skillsMatch": 0-100,
  "experienceMatch": 0-100,
  "formattingScore": 0-100,
  "keywordDensityScore": 0-100,
  "seniorityFit": 0-100,
  "achievementsImpactScore": 0-100,

  "sectionScores": {
    "summary": 0-100,
    "skills": 0-100,
    "projects": 0-100,
    "experience": 0-100,
    "education": 0-100,
    "extras": 0-100
  },

  "missingKeywords": ["string"],
  "redundantKeywords": ["string"],
  "softSkillsMissing": ["string"],

  "techStackCoverage": [
    { "name": "React", "level": "strong" | "medium" | "weak" }
  ],

  "suggestions": ["string"],
  "bulletLevelFeedback": [
    { "section": "Projects", "issue": "string", "fix": "string" }
  ],

  "recruiterSnapshot": "2–4 sentence summary"
}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      const parsed = parseJsonLoose<any>(raw);

      const output = {
        overallScore: parsed.overallScore ?? 0,
        skillsMatch: parsed.skillsMatch ?? 0,
        experienceMatch: parsed.experienceMatch ?? 0,
        formattingScore: parsed.formattingScore ?? 0,

        keywordDensityScore: parsed.keywordDensityScore ?? 0,
        seniorityFit: parsed.seniorityFit ?? 0,
        achievementsImpactScore: parsed.achievementsImpactScore ?? 0,

        sectionScores: parsed.sectionScores ?? {},

        missingKeywords: parsed.missingKeywords ?? [],
        redundantKeywords: parsed.redundantKeywords ?? [],
        softSkillsMissing: parsed.softSkillsMissing ?? [],

        techStackCoverage: parsed.techStackCoverage ?? [],
        suggestions: parsed.suggestions ?? [],
        bulletLevelFeedback: parsed.bulletLevelFeedback ?? [],
        recruiterSnapshot: parsed.recruiterSnapshot ?? "",
      };

      return res.json(output);
    } catch (err) {
      console.error("ATS ANALYZER ERROR:", err);
      return res.status(500).json({ error: "ATS Analyzer failed" });
    }
  }
);

/* -------------------------------------------------------
 * 📌 2. RESUME BUILDER — MARKDOWN OUTPUT
 * ----------------------------------------------------- */

router.post("/resume-builder", async (req: Request, res: Response) => {
  try {
    const model = getModel();
    const { about, highlights, targetRole } = req.body as {
      about?: string;
      highlights?: string;
      targetRole?: string;
    };

    const prompt = `
You are a professional resume writer for SOFTWARE/TECH students.

Create an ATS-friendly single-column resume in MARKDOWN only.

TARGET ROLE:
${targetRole || "Not specified"}

ABOUT:
${about || ""}

HIGHLIGHTS (projects, achievements, internships etc.):
${highlights || ""}

Rules:
- Sections: SUMMARY, SKILLS, PROJECTS, EXPERIENCE, EDUCATION, EXTRA.
- Use concise bullet points with strong action verbs.
- Use numbers/impact wherever possible.
- No extra commentary. Only valid Markdown resume.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    res.json({ resumeMarkdown: text });
  } catch (err) {
    console.error("RESUME BUILDER ERROR:", err);
    res.status(500).json({ error: "Resume builder failed" });
  }
});

/* -------------------------------------------------------
 * 📌 3. JOB SUGGESTIONS ENGINE
 * ----------------------------------------------------- */

router.post("/job-suggestions", async (req: Request, res: Response) => {
  try {
    const model = getModel();
    const { currentProfile, interests, locationPref } = req.body as {
      currentProfile?: string;
      interests?: string;
      locationPref?: string;
    };

    const prompt = `
You are a career coach for early-stage software engineers in India.

Suggest 4–6 realistic role options. Return ONLY JSON:

{
  "jobs": [
    {
      "title": "string",
      "level": "Internship | Entry level | Junior",
      "summary": "2–3 lines about why this fits",
      "idealCompanies": ["string"],
      "keySkills": ["string"]
    }
  ]
}

CURRENT PROFILE:
${currentProfile || ""}

INTERESTS:
${interests || ""}

LOCATION PREFERENCE:
${locationPref || ""}
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    const parsed = parseJsonLoose<{ jobs?: any[] }>(raw);

    res.json({
      jobs: parsed.jobs ?? [],
    });
  } catch (err) {
    console.error("JOB SUGGESTIONS ERROR:", err);
    res.status(500).json({ error: "Job suggestions failed" });
  }
});

export default router;
