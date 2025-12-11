// src/routes/instructor.routes.ts
import { Router, Response } from "express";
import { firestore } from "../config/firebase";
import authMiddleware, { AuthedRequest } from "../middleware/auth.middleware";
import { requireInstructor } from "../middleware/role.middleware";

const router = Router();

const usersCol = firestore.collection("users");
const instructorsCol = firestore.collection("instructors");

// ----------------------------------------------------------
// GET /api/instructor/me
// Returns basic user data + instructor-specific data
// ----------------------------------------------------------
router.get(
  "/me",
  authMiddleware,
  requireInstructor,
  async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.sub;

    try {
      const userDoc = await usersCol.doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "User not found" });
      }

      const instrDoc = await instructorsCol.doc(userId).get();

      return res.json({
        user: { id: userDoc.id, ...userDoc.data() },
        instructor: instrDoc.exists ? instrDoc.data() : null,
      });
    } catch (err) {
      console.error("❌ GET /instructor/me error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
