// src/components/PublicRoute.tsx

import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

type Role = "student" | "instructor";

type PublicRouteProps = {
  children: ReactNode;
};

export default function PublicRoute({ children }: PublicRouteProps) {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role") as Role | null;

  // Not logged in → can see public routes
  if (!token || !role) {
    return <>{children}</>;
  }

  // Logged in student → send to onboarding if not completed
  if (role === "student") {
    const onboarding = sessionStorage.getItem("onboardingCompleted");
    if (onboarding === "false") {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Logged in instructor → send to instructor dashboard
  if (role === "instructor") {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  // Fallback (shouldn't really hit)
  return <>{children}</>;
}
