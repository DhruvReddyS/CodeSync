import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);

// Simple health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
