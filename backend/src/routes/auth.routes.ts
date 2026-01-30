// src/routes/auth.routes.ts

import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { firebaseAuth, FieldValue } from "../config/firebase";
import { signToken } from "../config/jwt";
import { collections, BaseUser, StudentProfile, InstructorCredentials } from "../models/collections";

const router = Router();

// Use centralized collection references
const { users: usersCol, students: studentsCol, instructors: instructorsCol } = collections;

/* ----------------------------------------------------------
   Helper: Find user by email
---------------------------------------------------------- */
async function findUserByEmail(email: string) {
  const snap = await usersCol.where("email", "==", email).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as BaseUser & { id: string };
}

/* ----------------------------------------------------------
   STUDENT GOOGLE LOGIN
   POST /api/auth/student/google
---------------------------------------------------------- */
router.post("/student/google", async (req, res) => {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  try {
    // 1) Verify Firebase ID token
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    const firebaseUid = decoded.uid;
    const email = decoded.email;
    const displayName = decoded.name || "";
    const photoURL = decoded.picture || "";

    if (!email) {
      return res.status(400).json({ message: "Email missing in Firebase token" });
    }

    // 2) Find or create user in "users" collection
    let isNewUser = false;
    let userId: string;

    const existing = await findUserByEmail(email);

    if (!existing) {
      isNewUser = true;

      const userRef = usersCol.doc(firebaseUid);
      userId = userRef.id;

      await userRef.set({
        firebaseUid,
        email,
        name: displayName,
        photoURL,
        role: "student",
        status: "active", // ✅ NEW: explicit status
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      } as BaseUser);
    } else {
      userId = existing.id;

      await usersCol.doc(userId).set(
        {
          firebaseUid,
          email,
          name: existing.name || displayName,
          photoURL: existing.photoURL || photoURL,
          role: existing.role || "student",
          status: existing.status || "active", // ✅ Preserve status
          updatedAt: FieldValue.serverTimestamp(),
        } as Partial<BaseUser>,
        { merge: true }
      );
    }

    // 3) Upsert student document
    const studentRef = studentsCol.doc(userId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      await studentRef.set({
        // No userId field - use doc ID instead ✅
        onboardingCompleted: false,
        status: "active", // ✅ NEW: explicit status
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      } as Partial<StudentProfile>);

      // ✅ Also create empty studentScores document
      try {
        const { collections } = require("../models/collections");
        const admin = require("firebase-admin");
        await collections.studentScores.doc(userId).set({
          displayScore: 0,
          codeSyncScore: 0,
          platformSkills: {},
          totalProblemsSolved: 0,
          breakdown: {},
          computedAt: FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          ),
          version: 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (scoreErr) {
        console.error("[AUTH] Failed to create initial scores document:", scoreErr);
      }
    } else {
      await studentRef.set(
        {
          status: "active", // ✅ Ensure active
          updatedAt: FieldValue.serverTimestamp(),
        } as Partial<StudentProfile>,
        { merge: true }
      );
    }

    // 4) Sign backend JWT
    const token = signToken({
      sub: userId,
      role: "student",
    });

    return res.json({
      token,
      isNewUser,
      user: {
        id: userId,
        email,
        displayName,
        photoURL,
        role: "student" as const,
      },
    });
  } catch (err: any) {
    console.error("❌ /auth/student/google error:", err);
    return res.status(401).json({ message: "Invalid Firebase ID token" });
  }
});

/* ----------------------------------------------------------
   INSTRUCTOR REGISTER (admin/dev use)
   POST /api/auth/instructor/register
---------------------------------------------------------- */
router.post("/instructor/register", async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Check if instructor exists
    const snap = await usersCol
      .where("email", "==", email)
      .where("role", "==", "instructor")
      .limit(1)
      .get();

    if (!snap.empty) {
      return res.status(400).json({ message: "Instructor already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user doc
    const userRef = usersCol.doc();
    const userId = userRef.id;

    await userRef.set({
      email,
      name: name || "Instructor",
      role: "instructor",
      firebaseUid: null, // ✅ Instructors don't use Firebase Auth
      status: "active", // ✅ NEW: explicit status
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    } as BaseUser);

    // Create instructor doc (stores password hash only)
    await instructorsCol.doc(userId).set({
      userId,
      passwordHash,
      // createdAt and updatedAt removed - use users doc as source of truth
    } as InstructorCredentials);

    return res.json({ message: "Instructor created successfully", id: userId });
  } catch (err) {
    console.error("❌ /auth/instructor/register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------
   INSTRUCTOR LOGIN
   POST /api/auth/instructor/login
---------------------------------------------------------- */
router.post("/instructor/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Find instructor user entry
    const snap = await usersCol
      .where("email", "==", email)
      .where("role", "==", "instructor")
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userDoc = snap.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data() as BaseUser;

    // Fetch instructor creds
    const instructorDoc = await instructorsCol.doc(userId).get();
    if (!instructorDoc.exists) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { passwordHash } = instructorDoc.data() as { passwordHash: string };

    // Validate password
    const ok = await bcrypt.compare(password, passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Sign JWT
    const token = signToken({
      sub: userId,
      role: "instructor",
    });

    return res.json({
      token,
      instructor: {
        id: userId,
        email: userData.email,
        name: userData.name,
      },
    });
  } catch (err) {
    console.error("❌ /auth/instructor/login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------
   CHANGE PASSWORD (POST /api/auth/change-password)
   Requires auth middleware
---------------------------------------------------------- */
router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  // Get user ID from auth header (assuming passed by middleware)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  // Verify JWT and get user info
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const userId = decoded.sub;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Passwords required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Get instructor credentials
    const instructorDoc = await instructorsCol.doc(userId).get();
    if (!instructorDoc.exists) {
      return res.status(401).json({ message: "Not an instructor" });
    }

    const { passwordHash } = instructorDoc.data() as { passwordHash: string };

    // Verify current password
    const ok = await bcrypt.compare(currentPassword, passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash and update new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await instructorsCol.doc(userId).update({
      passwordHash: newHash,
    });

    return res.json({ message: "Password changed successfully" });
  } catch (err: any) {
    console.error("❌ /auth/change-password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/* ----------------------------------------------------------
   POST /api/auth/instructor/forgot-password
---------------------------------------------------------- */
router.post("/instructor/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  try {
    const snap = await usersCol
      .where("email", "==", email)
      .where("role", "==", "instructor")
      .limit(1)
      .get();

    // Always respond success to avoid email enumeration
    if (snap.empty) {
      return res.json({
        message: "If that email exists, a reset link was sent.",
      });
    }

    const userDoc = snap.docs[0];
    const userId = userDoc.id;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetLink = `https://codesync.app/reset?token=${resetToken}&uid=${userId}`;

    console.log("🔐 Password reset link (stub):", resetLink);

    return res.json({ message: "Password reset link sent (stub)." });
  } catch (err) {
    console.error("❌ /auth/instructor/forgot-password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
