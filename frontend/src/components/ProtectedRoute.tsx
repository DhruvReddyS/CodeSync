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
};

// allowed: null → still checking
// allowed: false → not allowed
// allowed: true → allowed
// allowed: "onboarding" → student must complete onboarding
export default function ProtectedRoute({
  allowedRoles,
  children,
  requireOnboarding = true,
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

      // ✅ Instructor routes: no onboarding check ever
      if (role === "instructor") {
        setAllowed(true);
        return;
      }

      // ✅ Student routes that don't need onboarding check
      // e.g. /onboarding itself, or explicit requireOnboarding={false}
      const path = location.pathname;
      if (!requireOnboarding || path === "/onboarding") {
        setAllowed(true);
        return;
      }

      // ✅ Student routes that require onboarding → check /student/profile
      try {
        const res = await apiClient.get("/student/profile");

        if (res.data?.onboardingCompleted) {
          setAllowed(true);
        } else {
          setAllowed("onboarding");
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const onboardingRequired =
          err?.response?.data?.onboardingRequired === true;

        if ((status === 404 || status === 403) && onboardingRequired) {
          setAllowed("onboarding");
        } else {
          console.error("[ProtectedRoute] /student/profile error:", err);
          setAllowed(false);
        }
      }
    }

    check();
  }, [allowedRoles, requireOnboarding, location.pathname]);

  // Still checking
  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050509] text-slate-200">
        <p className="text-sm">Checking your access…</p>
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
