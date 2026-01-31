/**
 * Firestore Collections - Centralized collection references and type definitions
 * Single source of truth for database schema
 */

import { firestore } from "../config/firebase";

// ====================================
// COLLECTION REFERENCES
// ====================================

export const collections = {
  users: firestore.collection("users"),
  students: firestore.collection("students"),
  studentScores: firestore.collection("studentScores"),
  instructors: firestore.collection("instructors"),
  notifications: firestore.collection("notifications"),
} as const;

// ====================================
// TYPE DEFINITIONS
// ====================================

/**
 * Base user document
 * Shared fields for both students and instructors
 */
export interface BaseUser {
  email: string;
  name: string;
  role: "student" | "instructor";
  photoURL?: string;
  firebaseUid?: string | null; // Only for OAuth users; null for instructors
  status: "active" | "inactive" | "deleted";
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  deletedAt?: FirebaseFirestore.Timestamp | null;
}

/**
 * Coding Platform Handles
 * Maps platform names to user handles
 */
export type CpHandles = {
  leetcode?: string | null;
  codeforces?: string | null;
  codechef?: string | null;
  github?: string | null;
  hackerrank?: string | null;
  atcoder?: string | null;
};

/**
 * Raw Platform Stats Map
 * Maps platform names to scraped profile data
 */
export type RawPlatformStatsMap = Record<
  "leetcode" | "codeforces" | "codechef" | "github" | "hackerrank" | "atcoder",
  any | null
>;

/**
 * Student profile document
 * Path: students/{studentId}
 */
export interface StudentProfile {
  // ========== BASIC INFO ==========
  fullName: string;
  collegeEmail?: string | null;
  personalEmail?: string | null;
  phone?: string | null;

  // ========== ACADEMIC INFO ==========
  branch: string; // CSE, ECE, Mechanical, etc.
  yearOfStudy: string; // 1, 2, 3, 4
  section: string; // A, B, C, etc.
  rollNumber: string;
  graduationYear?: string | null;

  // ========== CUSTOM PROFILE ==========
  profile?: {
    bio?: string;
    skills?: string[];
    [key: string]: any; // Allow custom fields
  };

  // ========== CODING HANDLES ==========
  cpHandles: {
    leetcode?: string | null;
    codeforces?: string | null;
    codechef?: string | null;
    github?: string | null;
    hackerrank?: string | null;
    atcoder?: string | null;
  };

  // ========== METADATA ==========
  onboardingCompleted: boolean;
  lastActiveAt?: FirebaseFirestore.Timestamp | null;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  deletedAt?: FirebaseFirestore.Timestamp | null;
  status: "active" | "inactive" | "deleted";
}

/**
 * Student Scores document (NEW)
 * Path: studentScores/{studentId}
 * 
 * SEPARATE from StudentProfile for:
 * - Faster leaderboard queries
 * - Independent cache invalidation
 * - Better scaling for analytics
 */
export interface StudentScores {
  // ========== MAIN SCORE ==========
  displayScore: number; // 0-100 scale, rounded
  codeSyncScore: number; // Raw sum score

  // ========== PER-PLATFORM SKILLS ==========
  platformSkills: {
    leetcode?: number;
    codeforces?: number;
    codechef?: number;
    github?: number;
    hackerrank?: number;
    atcoder?: number;
  };

  // ========== AGGREGATE STATS ==========
  totalProblemsSolved: number;

  // ========== DETAILED BREAKDOWN (OPTIONAL) ==========
  breakdown?: {
    leetcode?: {
      problemsSolved: number;
      rating: number;
      contests: number;
    };
    codeforces?: {
      problemsSolved: number;
      rating: number;
      contests: number;
    };
    codechef?: {
      problemsSolved: number;
      rating: number;
      contests: number;
    };
    github?: {
      contributions: number;
      repos: number;
      followers: number;
    };
    hackerrank?: {
      problemsSolved: number;
      contests: number;
      badges: number;
    };
    atcoder?: {
      problemsSolved: number;
      rating: number;
      contests: number;
    };
  };

  // ========== TIMESTAMPS ==========
  computedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp; // When last computed
  expiresAt?: FirebaseFirestore.Timestamp; // When recomputation needed (e.g., 7 days)
  version: number; // For cache invalidation

  // ========== METADATA ==========
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

/**
 * Platform profile document (stored as sub-collection)
 * Path: students/{studentId}/cpProfiles/{platform}
 * 
 * Each platform has different fields, but common structure
 */
export interface PlatformProfile {
  platform:
    | "leetcode"
    | "codeforces"
    | "codechef"
    | "github"
    | "hackerrank"
    | "atcoder";
  handle: string;

  // Platform-specific fields (see PlatformStats type in lib/scoringEngine.ts)
  [key: string]: any;

  // ========== TIMESTAMPS ==========
  scrapedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp; // When last scraped
  expiresAt?: FirebaseFirestore.Timestamp; // When next scrape needed (e.g., 24 hours)
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

/**
 * Instructor credentials document
 * Path: instructors/{instructorId}
 * 
 * Links to users/{instructorId} for basic info
 */
export interface InstructorCredentials {
  userId: string; // Foreign key to users/{userId}
  passwordHash: string; // bcryptjs hashed (if custom auth)
  // department?: string;
  // createdAt: Timestamp;
  // updatedAt: Timestamp;
}

// ====================================
// HELPER FUNCTIONS
// ====================================

/**
 * Get student profile with type safety
 */
export async function getStudent(studentId: string): Promise<StudentProfile | null> {
  const doc = await collections.students.doc(studentId).get();
  return doc.exists ? (doc.data() as StudentProfile) : null;
}

/**
 * Get student scores with type safety
 */
export async function getStudentScores(
  studentId: string
): Promise<StudentScores | null> {
  const doc = await collections.studentScores.doc(studentId).get();
  return doc.exists ? (doc.data() as StudentScores) : null;
}

/**
 * Get platform profile with type safety
 */
export async function getPlatformProfile(
  studentId: string,
  platform: string
): Promise<PlatformProfile | null> {
  const doc = await collections.students
    .doc(studentId)
    .collection("cpProfiles")
    .doc(platform)
    .get();
  return doc.exists ? (doc.data() as PlatformProfile) : null;
}

/**
 * Check if user is deleted/inactive
 */
export function isUserActive(user: BaseUser): boolean {
  return user.status === "active";
}

/**
 * Check if student is deleted/inactive
 */
export function isStudentActive(student: StudentProfile): boolean {
  return student.status === "active";
}
