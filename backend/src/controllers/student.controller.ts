import { Request, Response, NextFunction } from "express";

export async function createOrUpdateStudent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = req.body;

    // later: validate + save to Firestore
    return res.status(201).json({
      message: "Onboarding data received",
      data
    });
  } catch (err) {
    next(err);
  }
}
