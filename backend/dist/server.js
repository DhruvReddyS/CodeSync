"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const student_routes_1 = __importDefault(require("./routes/student.routes"));
const instructor_routes_1 = __importDefault(require("./routes/instructor.routes"));
const auth_middleware_1 = require("./middlewares/auth.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // your Vite frontend
    credentials: true,
}));
app.use(express_1.default.json());
// Public auth routes
app.use("/api/auth", auth_routes_1.default);
// Protected student routes
app.use("/api/student", auth_middleware_1.requireStudent, student_routes_1.default);
// Protected instructor routes
app.use("/api/instructor", auth_middleware_1.requireInstructor, instructor_routes_1.default);
// Health
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
