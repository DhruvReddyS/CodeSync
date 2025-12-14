// backend/src/server.ts
import dotenv from "dotenv";
dotenv.config(); // ✅ load .env FIRST (Render also injects env vars)

import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

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

/* --------------------------------------------------
 * CORS (Render + Local)
 * -------------------------------------------------- */
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim(); // e.g. https://codesync-web.onrender.com

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
      // allow server-to-server / curl / postman (no origin)
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

/* --------------------------------------------------
 * BODY LIMITS
 * -------------------------------------------------- */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* --------------------------------------------------
 * REQUEST LOGGER
 * -------------------------------------------------- */
app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

/* --------------------------------------------------
 * ROUTES
 * -------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/instructor", instructorRoutes);

// Career suite
app.use("/api/career", careerRoutes);

// CodePad + contests
app.use("/api", codepadRoutes);
app.use("/api", contestsRouter);

// AI
app.use("/api/ai", aiRoutes);

// Health
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    env: {
      hasFrontendUrl: !!FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV || "unknown",
    },
    hint: {
      ats: "POST /api/career/ats-analyzer",
      studentStats: "GET /api/student/stats/me",
    },
  });
});

/* --------------------------------------------------
 * Ensure default instructor user exists (ONE-TIME)
 * -------------------------------------------------- */
async function ensureDefaultInstructor() {
  const usersCol = firestore.collection("users");
  const instructorsCol = firestore.collection("instructors");

  const email = (process.env.DEFAULT_INSTRUCTOR_EMAIL || "instructor@gmail.com").trim();
  const password = process.env.DEFAULT_INSTRUCTOR_PASSWORD || "instructor@1234";
  const name = (process.env.DEFAULT_INSTRUCTOR_NAME || "Default Instructor").trim();

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

      console.log("✅ Created default instructor user document.");
    } else {
      const doc = snap.docs[0];
      userId = doc.id;

      // ensure role + name only (DO NOT touch password here)
      await doc.ref.set(
        {
          email,
          name: doc.data().name || name,
          role: "instructor",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("✅ Default instructor user exists (role ensured).");
    }

    const instructorRef = instructorsCol.doc(userId);
    const instructorSnap = await instructorRef.get();

    // 🔥 IMPORTANT: only set password if instructor doc does NOT exist
    if (!instructorSnap.exists) {
      const passwordHash = await bcrypt.hash(password, 10);

      await instructorRef.set({
        userId,
        passwordHash,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log("✅ Created instructor login (password set once).");
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log("✅ Instructor login already exists (password untouched).");
    }
  } catch (err) {
    console.error("❌ Error ensuring default instructor:", err);
  }
}

/* --------------------------------------------------
 * START SERVER (Render needs 0.0.0.0)
 * -------------------------------------------------- */
const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  ensureDefaultInstructor();
});
