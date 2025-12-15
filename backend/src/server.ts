// backend/src/server.ts
import dotenv from "dotenv";
dotenv.config(); // ✅ load env vars (Render injects automatically)

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

// ROUTES
import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import instructorRoutes from "./routes/instructor.routes";
import careerRoutes from "./routes/career.routes";
import aiRoutes from "./routes/ai.routes";
import codepadRoutes from "./routes/codepad.routes";
import contestsRouter from "./routes/contests.routes";

// FIREBASE
import { firestore, FieldValue } from "./config/firebase";

const app = express();
app.disable("x-powered-by");

/* ==================================================
 * ✅ CORS CONFIG (LOCAL + RENDER)
 * ================================================== */
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim(); // e.g. https://codesync-mvsr.onrender.com

const allowedOrigins = new Set<string>([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

if (FRONTEND_URL) allowedOrigins.add(FRONTEND_URL);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman / server-to-server
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`❌ CORS blocked origin: ${origin}`));
    },
    credentials: false, // ✅ Bearer token auth (NO cookies)
  })
);

/* ==================================================
 * BODY PARSERS
 * ================================================== */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* ==================================================
 * REQUEST LOGGER
 * ================================================== */
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/* ==================================================
 * ROUTES
 * ================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/instructor", instructorRoutes);

// Career Suite
app.use("/api/career", careerRoutes);

// CodePad + Contests
app.use("/api", codepadRoutes);
app.use("/api", contestsRouter);

// AI
app.use("/api/ai", aiRoutes);

/* ==================================================
 * HEALTH CHECK
 * ================================================== */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      nodeEnv: process.env.NODE_ENV || "unknown",
      frontendUrl: FRONTEND_URL || "not-set",
    },
    time: new Date().toISOString(),
  });
});

/* ==================================================
 * ✅ SPA FALLBACK (Fix React Router refresh 404 on Render)
 * - Works ONLY if you serve frontend build from this backend
 * - If frontend is a separate Render Static Site, do rewrite there instead
 * ================================================== */
const clientDist =
  process.env.CLIENT_DIST?.trim() ||
  path.join(__dirname, "../../frontend/dist"); // adjust if your dist path differs

if (fs.existsSync(clientDist)) {
  console.log("🟢 Serving frontend from:", clientDist);

  app.use(express.static(clientDist));

  // IMPORTANT: keep this AFTER /api routes
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API route not found" });
    }
    return res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.log(
    "🟡 Frontend dist not found. Skipping static hosting. (clientDist=",
    clientDist,
    ")"
  );

  // Optional: API-only 404 handler
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });
}

/* ==================================================
 * ENSURE DEFAULT INSTRUCTOR (ONE-TIME SAFE)
 * ================================================== */
async function ensureDefaultInstructor() {
  const usersCol = firestore.collection("users");
  const instructorsCol = firestore.collection("instructors");

  const email =
    (process.env.DEFAULT_INSTRUCTOR_EMAIL || "instructor@gmail.com").trim();
  const password =
    process.env.DEFAULT_INSTRUCTOR_PASSWORD || "instructor@1234";
  const name =
    (process.env.DEFAULT_INSTRUCTOR_NAME || "Default Instructor").trim();

  try {
    const snap = await usersCol.where("email", "==", email).limit(1).get();
    let userId: string;

    if (snap.empty) {
      const userRef = usersCol.doc();
      userId = userRef.id;

      await userRef.set({
        email,
        name,
        role: "instructor",
        firebaseUid: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("✅ Created default instructor user.");
    } else {
      const doc = snap.docs[0];
      userId = doc.id;

      await doc.ref.set(
        { role: "instructor", updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      console.log("✅ Instructor user already exists.");
    }

    const instructorRef = instructorsCol.doc(userId);
    const instructorSnap = await instructorRef.get();

    // 🔐 Only set password ONCE
    if (!instructorSnap.exists) {
      const passwordHash = await bcrypt.hash(password, 10);

      await instructorRef.set({
        userId,
        passwordHash,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("🔐 Instructor login created");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log("🔐 Instructor login already exists (password unchanged)");
    }
  } catch (err) {
    console.error("❌ Error ensuring default instructor:", err);
  }
}

/* ==================================================
 * GLOBAL ERROR HANDLER (CORS + others)
 * ================================================== */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("❌ Server error:", err?.message || err);
  return res.status(500).json({ message: err?.message || "Internal server error" });
});

/* ==================================================
 * START SERVER (Render needs 0.0.0.0)
 * ================================================== */
const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 CodeSync API running on port ${PORT}`);
  ensureDefaultInstructor();
});
