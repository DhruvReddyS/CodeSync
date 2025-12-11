// src/routes/auth.routes.ts

import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { firestore, firebaseAuth, FieldValue } from "../config/firebase";
import { signToken } from "../config/jwt";

const router = Router();

// Firestore collections
const usersCol = firestore.collection("users");
const studentsCol = firestore.collection("students");
const instructorsCol = firestore.collection("instructors");

type UserRole = "student" | "instructor";

/**
 * Base user shape in Firestore.
 * createdAt / updatedAt are stored, but not typed here
 * so we avoid FieldValue vs Timestamp type issues.
 */
interface BaseUser {
  firebaseUid?: string | null;
  email: string;
  name?: string;
  photoURL?: string;
  role: UserRole;
}

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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      userId = existing.id;

      await usersCol.doc(userId).set(
        {
          firebaseUid,
          email,
          name: existing.name || displayName,
          photoURL: existing.photoURL || photoURL,
          role: existing.role || "student",
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
        userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await studentRef.set(
        { updatedAt: FieldValue.serverTimestamp() },
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
      firebaseUid: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create instructor doc
    await instructorsCol.doc(userId).set({
      userId,
      passwordHash,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

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
   INSTRUCTOR FORGOT PASSWORD (stub)
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
