// src/pages/AuthPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  RiGoogleFill,
  RiShieldUserLine,
  RiKey2Line,
  RiEyeLine,
  RiEyeOffLine,
} from "react-icons/ri";

import { auth } from "../lib/firebaseClient";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import apiClient from "../lib/apiClient";

// Images
import slide1 from "../assets/images/slide-1.svg";
import slide2 from "../assets/images/slide-2.svg";
import slide3 from "../assets/images/slide-3.svg";

type Slide = {
  image: string;
  title: React.ReactNode;
  description: React.ReactNode;
};

const slides: Slide[] = [
  {
    image: slide1,
    title: (
      <>
        Connect with peers and access{" "}
        <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent font-semibold">
          learning resources
        </span>
        .
      </>
    ),
    description: (
      <>
        Join a focused, distraction-free{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent font-semibold">
          coding community
        </span>
        .
      </>
    ),
  },
  {
    image: slide2,
    title: (
      <>
        Track your progress across{" "}
        <span className="bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent font-semibold">
          multiple platforms
        </span>
        .
      </>
    ),
    description: (
      <>
        One simple dashboard for{" "}
        <span className="font-semibold text-slate-100">LeetCode</span>,{" "}
        <span className="font-semibold text-slate-100">Codeforces</span>,{" "}
        <span className="font-semibold text-slate-100">CodeChef</span> and more.
      </>
    ),
  },
  {
    image: slide3,
    title: (
      <>
        Showcase your{" "}
        <span className="bg-gradient-to-r from-emerald-400 to-lime-300 bg-clip-text text-transparent font-semibold">
          DSA progress
        </span>{" "}
        and{" "}
        <span className="bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent font-semibold">
          contest performance
        </span>
        .
      </>
    ),
    description: (
      <>
        Build a clear,{" "}
        <span className="font-semibold text-slate-100">data-backed profile</span>{" "}
        for recruiters and mentors.
      </>
    ),
  },
  {
    image: slide2,
    title: (
      <>
        Get{" "}
        <span className="bg-gradient-to-r from-rose-400 to-orange-300 bg-clip-text text-transparent font-semibold">
          simple insights
        </span>{" "}
        to plan your next step.
      </>
    ),
    description: (
      <>
        Understand where you stand and what to{" "}
        <span className="font-semibold text-slate-100">practice next</span>.
      </>
    ),
  },
];

type AuthPageProps = {
  onLogin: () => void;
};

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialMode =
    searchParams.get("mode") === "instructor" ? "instructor" : "student";

  const [authMode, setAuthMode] = useState<"student" | "instructor">(initialMode);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // error / info states
  const [studentError, setStudentError] = useState<string | null>(null);
  const [instructorError, setInstructorError] = useState<string | null>(null);
  const [instructorInfo, setInstructorInfo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ---------------- SYNC MODE WITH QUERY PARAM ----------------
  useEffect(() => {
    const mode =
      searchParams.get("mode") === "instructor" ? "instructor" : "student";
    setAuthMode(mode as "student" | "instructor");
  }, [searchParams]);

  // ---------------- SLIDES AUTO-CHANGE ----------------
  useEffect(() => {
    const id = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % slides.length),
      4500
    );
    return () => clearInterval(id);
  }, []);

  // ---------------- REHYDRATE AUTH HEADER ON MOUNT ----------------
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (token) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  // ---------------- STUDENT: GOOGLE LOGIN ----------------
  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setStudentError(null);

    try {
      const provider = new GoogleAuthProvider();
      // optional: always show account chooser
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const idToken = await user.getIdToken();

      const res = await apiClient.post("/auth/student/google", { idToken });

      const data = res.data as {
        token?: string;
        isNewUser?: boolean;
      };

      if (data.token) {
        // Save backend JWT
        sessionStorage.setItem("token", data.token);
        // 🔐 Attach to all future API requests
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      }

      sessionStorage.setItem("role", "student");

      // store basic identity for Navbar
      if (user.email) {
        sessionStorage.setItem("userEmail", user.email);
      }
      if (user.displayName) {
        sessionStorage.setItem("userName", user.displayName);
      }

      const isNew = data.isNewUser ?? false;

      // keep a simple onboarding flag in frontend
      sessionStorage.setItem(
        "onboardingCompleted",
        isNew ? "false" : "true"
      );

      onLogin();

      if (isNew) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      console.error("[AuthPage] Google sign-in failed:", err);
      setStudentError(
        err?.response?.data?.message ||
          err?.message ||
          "Google sign-in failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- INSTRUCTOR: LOGIN ----------------
  const handleInstructorLogin = async () => {
    // reset previous errors
    setEmailError(null);
    setPasswordError(null);
    setInstructorError(null);
    setInstructorInfo(null);

    let hasError = false;

    if (!email) {
      setEmailError("Email is required.");
      hasError = true;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      const res = await apiClient.post("/auth/instructor/login", {
        email,
        password,
      });

      const data = res.data as {
        token?: string;
        instructor?: { email?: string; name?: string };
      };

      if (data.token) {
        sessionStorage.setItem("token", data.token);
        // 🔐 Attach to all future API requests
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      }
      sessionStorage.setItem("role", "instructor");
      // instructors don’t have onboarding, but set flag anyway
      sessionStorage.setItem("onboardingCompleted", "true");

      // store for Navbar
      const instructorEmail = data.instructor?.email || email;
      const instructorName = data.instructor?.name || "Instructor";

      sessionStorage.setItem("userEmail", instructorEmail);
      sessionStorage.setItem("userName", instructorName);

      onLogin();
      navigate("/instructor/dashboard", { replace: true });
    } catch (err: any) {
      console.error("[AuthPage] Instructor login error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid instructor credentials.";
      setInstructorError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- INSTRUCTOR: RESET PASSWORD ----------------
  const handleForgotPassword = async () => {
    setEmailError(null);
    setInstructorError(null);
    setInstructorInfo(null);

    if (!email) {
      setEmailError("Enter your email to reset password.");
      return;
    }

    try {
      await apiClient.post("/auth/instructor/forgot-password", { email });
      setInstructorInfo("Password reset link sent if the email is registered.");
    } catch (err: any) {
      console.error("[AuthPage] Forgot password error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Error sending reset link.";
      setInstructorError(msg);
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-[#050509] text-slate-100 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row gap-10">
        {/* ---------------- LEFT PANEL ---------------- */}
        <section className="md:w-1/2 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <img
              src={slides[currentSlide].image}
              alt=""
              className="w-full max-w-sm md:max-w-md object-contain"
            />

            <div className="max-w-md text-center space-y-2">
              <h3 className="text-xl font-semibold">
                {slides[currentSlide].title}
              </h3>
              <p className="text-sm text-slate-400">
                {slides[currentSlide].description}
              </p>
            </div>

            <div className="flex justify-center gap-2 mt-2">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentSlide ? "w-6 bg-slate-100" : "w-2 bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- RIGHT PANEL ---------------- */}
        <section className="md:w-1/2 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-7 shadow-lg">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-slate-700 text-[0.7rem] uppercase tracking-[0.16em] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Auth
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              Sign in to{" "}
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                CodeSync
              </span>
            </h1>
            <p className="text-xs text-slate-400 mb-6">
              Use your student account for progress tracking or instructor
              account for batch dashboards.
            </p>

            {/* Mode Switch */}
            <div className="flex gap-2 mb-6">
              {["student", "instructor"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setAuthMode(m as "student" | "instructor");
                    // clear errors when switching modes
                    setStudentError(null);
                    setInstructorError(null);
                    setInstructorInfo(null);
                    setEmailError(null);
                    setPasswordError(null);
                  }}
                  className={`flex-1 py-2 rounded-full border text-xs font-semibold uppercase tracking-[0.14em] transition
                    ${
                      authMode === m
                        ? "bg-slate-200 text-black border-slate-200"
                        : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500"
                    }
                  `}
                >
                  {m === "student" ? "Student" : "Instructor"}
                </button>
              ))}
            </div>

            {/* ---------------- STUDENT VIEW ---------------- */}
            {authMode === "student" && (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  Continue with Google to sync your progress from{" "}
                  <span className="font-semibold text-slate-100">
                    LeetCode, Codeforces, CodeChef, GFG
                  </span>{" "}
                  and more.
                </p>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-slate-500 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RiGoogleFill className="text-lg" />
                  {submitting ? "Signing in..." : "Continue with Google"}
                </button>

                {studentError && (
                  <p className="mt-2 text-xs text-red-400">{studentError}</p>
                )}

                <p className="mt-3 text-[0.7rem] text-slate-500">
                  OAuth only · We never store your coding platform passwords.
                </p>
              </>
            )}

            {/* ---------------- INSTRUCTOR VIEW ---------------- */}
            {authMode === "instructor" && (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  Instructor access for{" "}
                  <span className="font-semibold text-slate-100">
                    batch dashboards
                  </span>{" "}
                  and{" "}
                  <span className="font-semibold text-slate-100">
                    performance analytics
                  </span>
                  .
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400">Email</label>
                    <input
                      type="email"
                      className={`w-full px-3 py-2 mt-1 rounded-lg border bg-slate-950 text-sm focus:outline-none ${
                        emailError
                          ? "border-red-500 focus:border-red-400"
                          : "border-slate-700 focus:border-sky-400"
                      }`}
                      placeholder="name@mvsrec.edu.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {emailError && (
                      <p className="mt-1 text-xs text-red-400">{emailError}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">Password</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-2 pr-10 rounded-lg border bg-slate-950 text-sm focus:outline-none ${
                          passwordError
                            ? "border-red-500 focus:border-red-400"
                            : "border-slate-700 focus:border-sky-400"
                        }`}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? (
                          <RiEyeOffLine className="text-lg" />
                        ) : (
                          <RiEyeLine className="text-lg" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-xs text-red-400">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {instructorError && (
                    <p className="text-xs text-red-400">{instructorError}</p>
                  )}
                  {instructorInfo && (
                    <p className="text-xs text-emerald-400">{instructorInfo}</p>
                  )}

                  <button
                    onClick={handleInstructorLogin}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-sky-500 text-black font-semibold text-sm hover:bg-sky-400 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RiShieldUserLine className="text-lg" />
                    {submitting ? "Logging in..." : "Login as Instructor"}
                  </button>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-slate-400 hover:text-sky-400 flex items-center gap-2"
                  >
                    <RiKey2Line /> Forgot password?
                  </button>

                  <p className="text-[0.7rem] text-slate-500">
                    Use your registered instructor email to access analytics.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
