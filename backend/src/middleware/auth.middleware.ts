// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../config/jwt";
import { firestore } from "../config/firebase";

export interface AuthedRequest extends Request {
  user?: {
    sub: string;
    role: "student" | "instructor" | "admin" | string;
  };
  student?: any;
}

export default async function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = verifyToken(token) as {
      sub: string;
      role: "student" | "instructor" | "admin" | string;
    };
    req.user = payload;

    // 🔍 Only students require onboarding checks
    if (payload.role === "student") {
      // We must allow hitting the onboarding endpoint even if
      // the student doc doesn't exist or onboarding is incomplete.
      const baseUrl = req.baseUrl || "";
      const path = req.path || "";

      const isStudentOnboardingRoute =
        baseUrl.startsWith("/api/student") && path === "/onboarding";

      if (!isStudentOnboardingRoute) {
        const studentDoc = await firestore
          .collection("students")
          .doc(payload.sub)
          .get();

        if (!studentDoc.exists) {
          return res.status(403).json({
            onboardingRequired: true,
            message: "Onboarding required",
          });
        }

        const data = studentDoc.data();
        req.student = data;

        if (!data?.onboardingCompleted) {
          return res.status(403).json({
            onboardingRequired: true,
            message: "Onboarding incomplete",
          });
        }
      }
    }

    return next();
  } catch (err) {
    console.error("❌ auth error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
