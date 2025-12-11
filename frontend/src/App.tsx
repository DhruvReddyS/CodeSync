// src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

// PUBLIC PAGES
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";

// STUDENT PAGES
import DashboardPage from "./pages/DashboardPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import CodePadPage from "./pages/CodePadPage";
import ContestsPage from "./pages/ContestsPage";
import ResourcesPage from "./pages/ResourcesPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

// CAREER SUITE
import ResumeBuilderPage from "./pages/ResumeBuilderPage";
import ATSAnalyzerPage from "./pages/ATSAnalyzerPage";

// INSTRUCTOR PAGES
import InstructorDashboard from "./pages/instructor/InstructorDashboard";

export default function App() {
  // 🔁 Bump this whenever login happens so Navbar re-reads sessionStorage
  const [authVersion, setAuthVersion] = React.useState(0);

  const handleAuthChange = () => {
    setAuthVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar authVersion={authVersion} />

      <main className="w-full">
        <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />

          {/* AuthPage handles both student + instructor modes */}
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <AuthPage onLogin={handleAuthChange} />
              </PublicRoute>
            }
          />

          {/* Student onboarding after Google sign-in */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowedRoles={["student"]} requireOnboarding={false}>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- STUDENT ROUTES (Protected) ---------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/codepad"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <CodePadPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contests"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ContestsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resources"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ResourcesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- CAREER SUITE ---------- */}
          <Route
            path="/career/resume"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ResumeBuilderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/career/ats"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ATSAnalyzerPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- INSTRUCTOR ROUTES ---------- */}
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
