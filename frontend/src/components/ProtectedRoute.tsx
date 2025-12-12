// src/components/ProtectedRoute.tsx

import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import apiClient from "../lib/apiClient";

type Role = "student" | "instructor";

type ProtectedRouteProps = {
  allowedRoles: Role[];
  children: ReactNode;
  /**
   * For student routes – should we enforce onboarding check?
   * Example:
   *   - /dashboard → requireOnboarding = true (default)
   *   - /onboarding → requireOnboarding = false
   */
  requireOnboarding?: boolean;
  /** 🔁 bump this when auth state changes to force re-check */
  authVersion?: number;
};

// allowed: null → still checking
// allowed: false → not allowed
// allowed: true → allowed
// allowed: "onboarding" → student must complete onboarding
export default function ProtectedRoute({
  allowedRoles,
  children,
  requireOnboarding = true,
  authVersion,
}: ProtectedRouteProps) {
  const [allowed, setAllowed] = useState<boolean | "onboarding" | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function check() {
      const token = sessionStorage.getItem("token");
      const role = sessionStorage.getItem("role") as Role | null;

      // No token / no role / role not in allowedRoles → blocked
      if (!token || !role || !allowedRoles.includes(role)) {
        setAllowed(false);
        return;
      }

      const path = location.pathname;

      // ✅ Instructor routes: no onboarding check ever
      if (role === "instructor") {
        setAllowed(true);
        return;
      }

      // ✅ Student routes that don't need onboarding check
      // e.g. /onboarding itself, or explicit requireOnboarding={false}
      if (!requireOnboarding || path === "/onboarding") {
        setAllowed(true);
        return;
      }

      // 🧠 Fast-path: if we already know onboarding is done from frontend flag,
      // skip hitting the backend.
      const localOnboarding = sessionStorage.getItem("onboardingCompleted");
      if (localOnboarding === "true") {
        setAllowed(true);
        return;
      }

      // ✅ Student routes that require onboarding → check /student/profile
      try {
        const res = await apiClient.get("/student/profile");

        const completed = !!res.data?.onboardingCompleted;
        if (completed) {
          // keep frontend flag in sync
          sessionStorage.setItem("onboardingCompleted", "true");
          setAllowed(true);
        } else {
          sessionStorage.setItem("onboardingCompleted", "false");
          setAllowed("onboarding");
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const onboardingRequired =
          err?.response?.data?.onboardingRequired === true;

        // If backend explicitly says onboardingRequired OR
        // profile not found/forbidden, treat it as "go to onboarding"
        if (
          onboardingRequired ||
          status === 404 ||
          status === 403
        ) {
          sessionStorage.setItem("onboardingCompleted", "false");
          setAllowed("onboarding");
        } else {
          console.error("[ProtectedRoute] /student/profile error:", err);
          setAllowed(false);
        }
      }
    }

    // reset state while re-checking
    setAllowed(null);
    void check();
  }, [
    allowedRoles,
    requireOnboarding,
    location.pathname,
    authVersion, // 🔥 re-run when authVersion changes
  ]);

  // Still checking
  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050509] text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">
            Syncing your CodeSync access…
          </p>
        </div>
      </div>
    );
  }

  // Student but onboarding not done → go to onboarding
  if (allowed === "onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Not allowed at all → send to appropriate auth mode
  if (!allowed) {
    const primaryRole = allowedRoles[0] ?? "student";
    const mode = primaryRole === "instructor" ? "instructor" : "student";
    return <Navigate to={`/auth?mode=${mode}`} replace />;
  }

  // Allowed → render children
  return <>{children}</>;
}
