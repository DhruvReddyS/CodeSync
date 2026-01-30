"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/server.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // ✅ load env vars (Render injects automatically)
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ROUTES
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const instructor_routes_1 = __importDefault(require("./routes/instructor.routes"));
const career_routes_1 = __importDefault(require("./routes/career.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const codepad_routes_1 = __importDefault(require("./routes/codepad.routes"));
const contests_routes_1 = __importDefault(require("./routes/contests.routes"));
// FIREBASE
const firebase_1 = require("./config/firebase");
const app = (0, express_1.default)();
app.disable("x-powered-by");
/* ==================================================
 * ✅ CORS CONFIG (LOCAL + RENDER)
 * ================================================== */
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim(); // e.g. https://codesync-mvsr.onrender.com
const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://codesync-mvsr.onrender.com", // ✅ Production frontend
]);
if (FRONTEND_URL)
    allowedOrigins.add(FRONTEND_URL);
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin)
            return cb(null, true); // Postman / server-to-server
        if (allowedOrigins.has(origin))
            return cb(null, true);
        return cb(new Error(`❌ CORS blocked origin: ${origin}`));
    },
    credentials: false, // ✅ Bearer token auth (NO cookies)
}));
/* ==================================================
 * ✅ SECURITY HEADERS (Fix COOP/COEP issues)
 * ================================================== */
app.use((req, res, next) => {
    // Allow window.closed check from Firebase Auth
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
});
/* ==================================================
 * BODY PARSERS
 * ================================================== */
app.use(express_1.default.json({ limit: "5mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "5mb" }));
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
app.use("/api/auth", auth_routes_1.default);
app.use("/api/student", student_routes_1.default);
app.use("/api/instructor", instructor_routes_1.default);
// Career Suite
app.use("/api/career", career_routes_1.default);
// CodePad + Contests
app.use("/api", codepad_routes_1.default);
app.use("/api", contests_routes_1.default);
// AI
app.use("/api/ai", ai_routes_1.default);
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
const clientDist = process.env.CLIENT_DIST?.trim() ||
    path_1.default.join(__dirname, "../../frontend/dist"); // adjust if your dist path differs
if (fs_1.default.existsSync(clientDist)) {
    console.log("🟢 Serving frontend from:", clientDist);
    app.use(express_1.default.static(clientDist));
    // IMPORTANT: keep this AFTER /api routes
    // Use regex pattern for catch-all SPA fallback
    app.get(/^\/(?!api\/)/, (req, res) => {
        return res.sendFile(path_1.default.join(clientDist, "index.html"));
    });
}
else {
    console.log("🟡 Frontend dist not found. Skipping static hosting. (clientDist=", clientDist, ")");
    // Optional: API-only 404 handler
    app.use("/api", (_req, res) => {
        res.status(404).json({ message: "API route not found" });
    });
}
/* ==================================================
 * ENSURE DEFAULT INSTRUCTOR (ONE-TIME SAFE)
 * ================================================== */
async function ensureDefaultInstructor() {
    const usersCol = firebase_1.firestore.collection("users");
    const instructorsCol = firebase_1.firestore.collection("instructors");
    const email = (process.env.DEFAULT_INSTRUCTOR_EMAIL || "instructor@gmail.com").trim();
    const password = process.env.DEFAULT_INSTRUCTOR_PASSWORD || "instructor@1234";
    const name = (process.env.DEFAULT_INSTRUCTOR_NAME || "Default Instructor").trim();
    try {
        const snap = await usersCol.where("email", "==", email).limit(1).get();
        let userId;
        if (snap.empty) {
            const userRef = usersCol.doc();
            userId = userRef.id;
            await userRef.set({
                email,
                name,
                role: "instructor",
                firebaseUid: null,
                createdAt: firebase_1.FieldValue.serverTimestamp(),
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            });
            console.log("✅ Created default instructor user.");
        }
        else {
            const doc = snap.docs[0];
            userId = doc.id;
            await doc.ref.set({ role: "instructor", updatedAt: firebase_1.FieldValue.serverTimestamp() }, { merge: true });
            console.log("✅ Instructor user already exists.");
        }
        const instructorRef = instructorsCol.doc(userId);
        const instructorSnap = await instructorRef.get();
        // 🔐 Only set password ONCE
        if (!instructorSnap.exists) {
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            await instructorRef.set({
                userId,
                passwordHash,
                createdAt: firebase_1.FieldValue.serverTimestamp(),
                updatedAt: firebase_1.FieldValue.serverTimestamp(),
            });
            console.log("🔐 Instructor login created");
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
        }
        else {
            console.log("🔐 Instructor login already exists (password unchanged)");
        }
    }
    catch (err) {
        console.error("❌ Error ensuring default instructor:", err);
    }
}
/* ==================================================
 * GLOBAL ERROR HANDLER (CORS + others)
 * ================================================== */
app.use((err, _req, res, _next) => {
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
