// src/middleware/role.middleware.ts
import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth.middleware";

export function requireStudent(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({ message: "Student access required" });
  }
  next();
}

export function requireInstructor(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || (req.user.role !== "instructor" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Instructor access required" });
  }
  next();
}

export function requireStudentOrInstructor(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (
    !req.user ||
    (req.user.role !== "student" &&
      req.user.role !== "instructor" &&
      req.user.role !== "admin")
  ) {
    return res.status(403).json({ message: "Student or instructor access required" });
  }
  next();
}
