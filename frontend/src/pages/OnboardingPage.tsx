// src/pages/OnboardingPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { auth } from "../lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";

type Errors = {
  [key: string]: string | undefined;
};

type ProjectForm = {
  name: string;
  techStack: string;
  description: string;
  deploymentUrl: string;
};

const TOTAL_STEPS = 4;

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();



  const [loadingUser, setLoadingUser] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);

  // --------- FORM STATE ---------
  const [fullName, setFullName] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [branch, setBranch] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  // 6 coding platforms (all optional – only ones we actually use)
  const [leetcode, setLeetcode] = useState("");
  const [codeforces, setCodeforces] = useState("");
  const [codechef, setCodechef] = useState("");
  const [githubHandle, setGithubHandle] = useState("");
  const [hackerrank, setHackerrank] = useState("");
  const [atcoder, setAtcoder] = useState("");

  // Profile / About / Skills / Interests
  const [about, setAbout] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");

  // Social links
  const [linkedin, setLinkedin] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [otherSocials, setOtherSocials] = useState("");

  // Projects
  const [projects, setProjects] = useState<ProjectForm[]>([
    { name: "", techStack: "", description: "", deploymentUrl: "" },
  ]);

  // Internships & Certificates
  const [internships, setInternships] = useState("");
  const [certificates, setCertificates] = useState("");

  // --------- AUTH CHECK + PREFILL ---------
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "student") {
      navigate("/auth?mode=student", { replace: true });
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        if (!fullName) setFullName(u.displayName || "");
        if (!collegeEmail) setCollegeEmail(u.email || "");
        if (!personalEmail) setPersonalEmail(u.email || "");
      }
      setLoadingUser(false);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // --------- VALIDATION ---------
  const validate = () => {
    const newErrors: Errors = {};

    // Basic
    if (!fullName.trim()) newErrors.fullName = "Full name is required.";

    if (!collegeEmail.trim()) {
      newErrors.collegeEmail = "College email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(collegeEmail)) {
      newErrors.collegeEmail = "Enter a valid college email.";
    }

    if (!personalEmail.trim()) {
      newErrors.personalEmail = "Personal email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(personalEmail)) {
      newErrors.personalEmail = "Enter a valid personal email.";
    }

    // Academic
    if (!branch.trim()) newErrors.branch = "Branch is required.";
    if (!yearOfStudy.trim())
      newErrors.yearOfStudy = "Year of study is required.";
    if (!section.trim()) newErrors.section = "Section is required.";
    if (!rollNumber.trim()) newErrors.rollNumber = "Roll number is required.";
    if (!graduationYear.trim())
      newErrors.graduationYear = "Graduation year is required.";

    // Phone optional but if present must be valid
    if (phone && !/^\d{10}$/.test(phone)) {
      newErrors.phone = "Enter a valid 10-digit phone number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      return validate();
    }
    return true;
  };

  // --------- STEP NAVIGATION ---------
  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  // --------- SUBMIT ---------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "student") {
      setServerError("Session expired. Please sign in again.");
      navigate("/auth?mode=student", { replace: true });
      return;
    }

    setSubmitting(true);

    try {
      const cleanedProjects = projects
        .map((p) => ({
          name: p.name.trim(),
          techStack: p.techStack.trim(),
          description: p.description.trim(),
          deploymentUrl: p.deploymentUrl.trim(),
        }))
        .filter(
          (p) =>
            p.name ||
            p.techStack ||
            p.description ||
            p.deploymentUrl
        );

      const payload = {
        fullName,
        collegeEmail,
        personalEmail,
        phone,
        branch,
        yearOfStudy,
        section,
        rollNumber,
        graduationYear,

        // ✅ Only 6 platforms (aligned with backend)
        codingHandles: {
          leetcode,
          codeforces,
          codechef,
          github: githubHandle,
          hackerrank,
          atcoder,
        },

        profile: {
          about,
          skills,
          interests,
          linkedin,
          github: githubLink,
          portfolio,
          otherSocials,
          projects: cleanedProjects,
          internships,
          certificates,
        },
      };

      // API REQUEST (authorization auto-injected by interceptor)
      await apiClient.post("/student/onboarding", payload);

      // ✅ mark in frontend that onboarding is done (optional but handy)
      sessionStorage.setItem("onboardingCompleted", "true");

      // ✅ hard redirect to dashboard in history (no back to onboarding)
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      console.error("[Onboarding] submit error:", err);
      setServerError(
        err?.response?.data?.message || "Failed to save onboarding details."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------- PROJECT HANDLERS ---------
  const updateProject = (
    index: number,
    field: keyof ProjectForm,
    value: string
  ) => {
    setProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addProject = () => {
    setProjects((prev) => [
      ...prev,
      { name: "", techStack: "", description: "", deploymentUrl: "" },
    ]);
  };

  const removeProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  // --------- RENDER ---------
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050509] text-slate-200">
        <p className="text-sm">Loading your profile…</p>
      </div>
    );
  }

  const progressPercent = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-[#050509] text-slate-100">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* HEADER */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">
                Onboarding · Step {step} of {TOTAL_STEPS}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                Let&apos;s set up your{" "}
                <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                  CodeSync profile
                </span>
                .
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Fill in a few quick sections. This powers dashboards, batch
                leaderboards, and your profile card. You can update everything later.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-[0.7rem] text-slate-300 max-w-xs">
              <p className="font-medium">What we&apos;re collecting</p>
              <p className="text-[0.65rem] text-slate-500">
                Academic info to group you, coding handles to fetch stats, and a
                short portfolio snapshot (projects, socials, certificates).
              </p>
            </div>
          </div>

          {/* STEP INDICATOR + PROGRESS BAR */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[0.7rem]">
              {[
                "Basic & Academic",
                "Coding Handles",
                "Profile & Socials",
                "Projects & Proof",
              ].map((label, idx) => {
                const s = idx + 1;
                const isActive = s === step;
                const isDone = s < step;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`flex items-center gap-2 rounded-full px-3 py-1 border transition ${
                      isActive
                        ? "border-sky-400 bg-sky-400/10 text-sky-200"
                        : isDone
                        ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-200"
                        : "border-slate-700 bg-slate-900 text-slate-400"
                    }`}
                    onClick={() => {
                      if (s <= step) setStep(s);
                    }}
                  >
                    <span
                      className={`h-5 w-5 flex items-center justify-center rounded-full text-[0.6rem] font-semibold ${
                        isDone
                          ? "bg-emerald-500 text-black"
                          : isActive
                          ? "bg-sky-400 text-black"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {s}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* ERROR BANNER */}
        {serverError && (
          <div className="mb-4 rounded-xl border border-red-500/70 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {serverError}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 pb-10"
          autoComplete="off"
        >
          {/* STEP CONTENT */}
          {step === 1 && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
              <BasicDetailsCard
                fullName={fullName}
                setFullName={setFullName}
                collegeEmail={collegeEmail}
                setCollegeEmail={setCollegeEmail}
                personalEmail={personalEmail}
                setPersonalEmail={setPersonalEmail}
                phone={phone}
                setPhone={setPhone}
                errors={errors}
              />

              <AcademicCard
                branch={branch}
                setBranch={setBranch}
                yearOfStudy={yearOfStudy}
                setYearOfStudy={setYearOfStudy}
                section={section}
                setSection={setSection}
                rollNumber={rollNumber}
                setRollNumber={setRollNumber}
                graduationYear={graduationYear}
                setGraduationYear={setGraduationYear}
                errors={errors}
              />
            </div>
          )}

          {step === 2 && (
            <CodingHandlesCard
              leetcode={leetcode}
              setLeetcode={setLeetcode}
              codeforces={codeforces}
              setCodeforces={setCodeforces}
              codechef={codechef}
              setCodechef={setCodechef}
              github={githubHandle}
              setGithub={setGithubHandle}
              hackerrank={hackerrank}
              setHackerrank={setHackerrank}
              atcoder={atcoder}
              setAtcoder={setAtcoder}
            />
          )}

          {step === 3 && (
            <ProfileSocialCard
              about={about}
              setAbout={setAbout}
              skills={skills}
              setSkills={setSkills}
              interests={interests}
              setInterests={setInterests}
              linkedin={linkedin}
              setLinkedin={setLinkedin}
              githubLink={githubLink}
              setGithubLink={setGithubLink}
              portfolio={portfolio}
              setPortfolio={setPortfolio}
              otherSocials={otherSocials}
              setOtherSocials={setOtherSocials}
            />
          )}

          {step === 4 && (
            <ProjectsProofCard
              projects={projects}
              updateProject={updateProject}
              addProject={addProject}
              removeProject={removeProject}
              internships={internships}
              setInternships={setInternships}
              certificates={certificates}
              setCertificates={setCertificates}
            />
          )}

          {/* ACTIONS */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
            <div className="flex items-center gap-2 text-[0.7rem] text-slate-500 max-w-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                You can edit everything later from Settings. Onboarding just helps
                us build the right dashboards from day one.
              </span>
            </div>

            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400 hover:bg-slate-900 transition"
                >
                  Back
                </button>
              )}

              {step < TOTAL_STEPS && (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-xs font-semibold text-slate-950 shadow-[0_0_16px_rgba(56,189,248,0.7)] hover:bg-sky-400 active:scale-95 transition"
                >
                  Next
                </button>
              )}

              {step === TOTAL_STEPS && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.7)] hover:bg-sky-400 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving…" : "Save & continue to dashboard"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;

/* ---------- SMALL REUSABLE INPUT FOR HANDLES ---------- */

type HandleInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
};

function HandleInput({ label, placeholder, value, onChange }: HandleInputProps) {
  return (
    <div>
      <label className="text-[0.7rem] text-slate-400">{label} (optional)</label>
      <input
        type="text"
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/* ---------- SUBCARDS ---------- */

type BasicDetailsCardProps = {
  fullName: string;
  setFullName: (v: string) => void;
  collegeEmail: string;
  setCollegeEmail: (v: string) => void;
  personalEmail: string;
  setPersonalEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  errors: Errors;
};

function BasicDetailsCard({
  fullName,
  setFullName,
  collegeEmail,
  setCollegeEmail,
  personalEmail,
  setPersonalEmail,
  phone,
  setPhone,
  errors,
}: BasicDetailsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4">
      <h2 className="text-sm sm:text-base font-semibold">Basic details</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[0.7rem] text-slate-400">
            Full name<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.fullName
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Manish Beesa"
          />
          {errors.fullName && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.fullName}
            </p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            College email<span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.collegeEmail
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={collegeEmail}
            onChange={(e) => setCollegeEmail(e.target.value)}
            placeholder="23r21a05cr@mlrit.ac.in"
          />
          {errors.collegeEmail && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.collegeEmail}
            </p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            Personal email<span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.personalEmail
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={personalEmail}
            onChange={(e) => setPersonalEmail(e.target.value)}
            placeholder="yourname@gmail.com"
          />
          {errors.personalEmail && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.personalEmail}
            </p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            Phone (optional)
          </label>
          <input
            type="tel"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.phone
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit number"
          />
          {errors.phone && (
            <p className="mt-1 text-[0.7rem] text-red-400">{errors.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}

type AcademicCardProps = {
  branch: string;
  setBranch: (v: string) => void;
  yearOfStudy: string;
  setYearOfStudy: (v: string) => void;
  section: string;
  setSection: (v: string) => void;
  rollNumber: string;
  setRollNumber: (v: string) => void;
  graduationYear: string;
  setGraduationYear: (v: string) => void;
  errors: Errors;
};

function AcademicCard({
  branch,
  setBranch,
  yearOfStudy,
  setYearOfStudy,
  section,
  setSection,
  rollNumber,
  setRollNumber,
  graduationYear,
  setGraduationYear,
  errors,
}: AcademicCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4">
      <h2 className="text-sm sm:text-base font-semibold">Academic grouping</h2>
      <p className="text-[0.7rem] text-slate-400">
        Used to generate branch / year / section-wise leaderboards and analytics.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[0.7rem] text-slate-400">
            Branch<span className="text-red-500">*</span>
          </label>
          <select
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.branch
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Select branch</option>
            <option value="CSE">CSE</option>
            <option value="CSIT">CSIT</option>
            <option value="IT">IT</option>
            <option value="CSE-AIML">CSE (AIML)</option>
            <option value="CSE-DS">CSE (DS)</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">MECHANICAL</option>
            <option value="CIVIL">CIVIL</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.branch && (
            <p className="mt-1 text-[0.7rem] text-red-400">{errors.branch}</p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            Year<span className="text-red-500">*</span>
          </label>
          <select
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.yearOfStudy
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(e.target.value)}
          >
            <option value="">Select year</option>
            <option value="1">1st year</option>
            <option value="2">2nd year</option>
            <option value="3">3rd year</option>
            <option value="4">4th year</option>
          </select>
          {errors.yearOfStudy && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.yearOfStudy}
            </p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            Section<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.section
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={section}
            onChange={(e) => setSection(e.target.value.toUpperCase())}
            placeholder="A / B / C..."
          />
          {errors.section && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.section}
            </p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            Roll number<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.rollNumber
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="23R21A05CR"
          />
          {errors.rollNumber && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.rollNumber}
            </p>
          )}
        </div>

        <div>
          <label className="text-[0.7rem] text-slate-400">
            Graduation year<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`mt-1 w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm focus:outline-none ${
              errors.graduationYear
                ? "border-red-500 focus:border-red-400"
                : "border-slate-700 focus:border-sky-400"
            }`}
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value)}
            placeholder="2027"
          />
          {errors.graduationYear && (
            <p className="mt-1 text-[0.7rem] text-red-400">
              {errors.graduationYear}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type CodingHandlesCardProps = {
  leetcode: string;
  setLeetcode: (v: string) => void;
  codeforces: string;
  setCodeforces: (v: string) => void;
  codechef: string;
  setCodechef: (v: string) => void;
  github: string;
  setGithub: (v: string) => void;
  hackerrank: string;
  setHackerrank: (v: string) => void;
  atcoder: string;
  setAtcoder: (v: string) => void;
};

function CodingHandlesCard({
  leetcode,
  setLeetcode,
  codeforces,
  setCodeforces,
  codechef,
  setCodechef,
  github,
  setGithub,
  hackerrank,
  setHackerrank,
  atcoder,
  setAtcoder,
}: CodingHandlesCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold">
            Coding profiles (all optional)
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Add anything you actively use. CodeSync will pull stats and stitch them
            into one dashboard.
          </p>
        </div>
        <p className="text-[0.65rem] text-slate-500">
          You can update these anytime from Settings.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <HandleInput
          label="LeetCode"
          placeholder="leetcode_username"
          value={leetcode}
          onChange={setLeetcode}
        />
        <HandleInput
          label="Codeforces"
          placeholder="codeforces_handle"
          value={codeforces}
          onChange={setCodeforces}
        />
        <HandleInput
          label="CodeChef"
          placeholder="codechef_id"
          value={codechef}
          onChange={setCodechef}
        />
        <HandleInput
          label="GitHub (handle)"
          placeholder="github_username"
          value={github}
          onChange={setGithub}
        />
        <HandleInput
          label="HackerRank"
          placeholder="hackerrank_id"
          value={hackerrank}
          onChange={setHackerrank}
        />
        <HandleInput
          label="AtCoder"
          placeholder="atcoder_id"
          value={atcoder}
          onChange={setAtcoder}
        />
      </div>
    </div>
  );
}

type ProfileSocialCardProps = {
  about: string;
  setAbout: (v: string) => void;
  skills: string;
  setSkills: (v: string) => void;
  interests: string;
  setInterests: (v: string) => void;
  linkedin: string;
  setLinkedin: (v: string) => void;
  githubLink: string;
  setGithubLink: (v: string) => void;
  portfolio: string;
  setPortfolio: (v: string) => void;
  otherSocials: string;
  setOtherSocials: (v: string) => void;
};

function ProfileSocialCard({
  about,
  setAbout,
  skills,
  setSkills,
  interests,
  setInterests,
  linkedin,
  setLinkedin,
  githubLink,
  setGithubLink,
  portfolio,
  setPortfolio,
  otherSocials,
  setOtherSocials,
}: ProfileSocialCardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold">
          About & skills (optional)
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-[0.7rem] text-slate-400">
              About you (short intro)
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400 min-h-[96px]"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="My name is Manish Beesa, I’m a CS undergrad at MLRIT (2027 batch). I like building real-world projects, working with JS/React and exploring ML…"
            />
          </div>

          <div>
            <label className="text-[0.7rem] text-slate-400">
              Skills (comma separated)
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="JavaScript, React, Node.js, Express, MongoDB, Python, Java, C++, MySQL..."
            />
          </div>

          <div>
            <label className="text-[0.7rem] text-slate-400">
              Interests (comma separated)
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Full Stack Development, Machine Learning, Startups, Open Source..."
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold">
          Social links (optional)
        </h2>
        <p className="text-[0.7rem] text-slate-400">
          These will be used to show clickable icons on your profile card.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[0.7rem] text-slate-400">LinkedIn</label>
            <input
              type="url"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://www.linkedin.com/in/your-id"
            />
          </div>
          <div>
            <label className="text-[0.7rem] text-slate-400">GitHub</label>
            <input
              type="url"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
              placeholder="https://github.com/your-username"
            />
          </div>
          <div>
            <label className="text-[0.7rem] text-slate-400">Portfolio</label>
            <input
              type="url"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              placeholder="https://your-portfolio-site.com"
            />
          </div>
          <div>
            <label className="text-[0.7rem] text-slate-400">
              Other socials (optional)
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              value={otherSocials}
              onChange={(e) => setOtherSocials(e.target.value)}
              placeholder="X / Twitter, Instagram, etc."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type ProjectsProofCardProps = {
  projects: ProjectForm[];
  updateProject: (
    index: number,
    field: keyof ProjectForm,
    value: string
  ) => void;
  addProject: () => void;
  removeProject: (index: number) => void;
  internships: string;
  setInternships: (v: string) => void;
  certificates: string;
  setCertificates: (v: string) => void;
};

function ProjectsProofCard({
  projects,
  updateProject,
  addProject,
  removeProject,
  internships,
  setInternships,
  certificates,
  setCertificates,
}: ProjectsProofCardProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold">Projects</h2>
            <p className="text-[0.7rem] text-slate-400">
              Add 1–3 key projects. We&apos;ll show them on your profile and dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={addProject}
            className="text-[0.7rem] rounded-full border border-slate-600 px-3 py-1 hover:border-sky-400 hover:bg-slate-900 transition"
          >
            + Add project
          </button>
        </div>

        <div className="space-y-4">
          {projects.map((project, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-300">
                  Project {idx + 1}
                </p>
                {projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProject(idx)}
                    className="text-[0.65rem] text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[0.7rem] text-slate-400">
                    Project name
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                    value={project.name}
                    onChange={(e) => updateProject(idx, "name", e.target.value)}
                    placeholder="CodeSync"
                  />
                </div>
                <div>
                  <label className="text-[0.7rem] text-slate-400">
                    Tech stack
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                    value={project.techStack}
                    onChange={(e) =>
                      updateProject(idx, "techStack", e.target.value)
                    }
                    placeholder="React, Node.js, Express, MongoDB"
                  />
                </div>
              </div>

              <div>
                <label className="text-[0.7rem] text-slate-400">
                  Short description (2–3 lines)
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400 min-h-[72px]"
                  value={project.description}
                  onChange={(e) =>
                    updateProject(idx, "description", e.target.value)
                  }
                  placeholder="What problem does it solve? What did you specifically build or own?"
                />
              </div>

              <div>
                <label className="text-[0.7rem] text-slate-400">
                  Deployment / GitHub link (optional)
                </label>
                <input
                  type="url"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                  value={project.deploymentUrl}
                  onChange={(e) =>
                    updateProject(idx, "deploymentUrl", e.target.value)
                  }
                  placeholder="https://your-app.vercel.app / GitHub repo"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-3">
          <h2 className="text-sm sm:text-base font-semibold">
            Internships / experience (optional)
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            You can keep this simple: one line per internship. Example:{" "}
            <span className="text-slate-300">
              &quot;Osmania TBI – AI R&amp;D Intern – Jun 2025 – Worked on borewell
              prediction model&quot;
            </span>
          </p>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400 min-h-[96px]"
            value={internships}
            onChange={(e) => setInternships(e.target.value)}
            placeholder="Company – Role – Duration – What you did&#10;Company – Role – Duration – What you did"
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 space-y-3">
          <h2 className="text-sm sm:text-base font-semibold">
            Certificates (links)
          </h2>
          <p className="text-[0.7rem] text-slate-400">
            Paste certificate links (Coursera, NPTEL, etc.). One per line or with
            short labels.
          </p>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-sky-400 min-h-[96px]"
            value={certificates}
            onChange={(e) => setCertificates(e.target.value)}
            placeholder="DSA in Java – Coding Ninjas – https://...&#10;Machine Learning – Coursera – https://..."
          />
        </div>
      </div>
    </div>
  );
}
