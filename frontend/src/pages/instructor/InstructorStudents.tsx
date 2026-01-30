import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../../lib/apiClient";
import {
  RiSearch2Line,
  RiRefreshLine,
  RiTrophyLine,
  RiArrowRightUpLine,
  RiShieldCheckLine,
  RiInformationLine,
  RiAddLine,
  RiDeleteBin6Line,
  RiCloseLine,
  RiSendPlaneLine,
  RiBellLine,
  RiCheckboxCircleLine,
  RiCheckDoubleLine,
  RiTimeLine,
} from "react-icons/ri";
import {
  SiLeetcode,
  SiCodechef,
  SiCodeforces,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";

type PlatformKey =
  | "leetcode"
  | "codeforces"
  | "codechef"
  | "hackerrank"
  | "github"
  | "atcoder";

type Student = {
  id?: string;
  studentId?: string;
  fullName?: string;
  username?: string;
  email?: string;
  collegeEmail?: string;
  personalEmail?: string;
  branch?: string;
  yearOfStudy?: string | number;
  year?: string | number;
  section?: string;
  rollNumber?: string;
  codesyncScore?: number;
  displayScore?: number;
  cpScores?: { displayScore?: number; platformSkills?: Record<string, number> };
  totalProblemsSolved?: number;
  cpHandles?: Partial<Record<PlatformKey, string>>;
  onboardingCompleted?: boolean;
  status?: string;
  updatedAt?: any;
  lastActiveAt?: any;
};

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function scoreBadge(score: number | undefined) {
  const s = score ?? 0;
  if (s >= 85) return { label: "Elite", ring: "ring-emerald-400/30", bg: "bg-emerald-400/10", text: "text-emerald-200" };
  if (s >= 70) return { label: "Strong", ring: "ring-sky-400/30", bg: "bg-sky-400/10", text: "text-sky-200" };
  if (s >= 50) return { label: "Growing", ring: "ring-amber-400/30", bg: "bg-amber-400/10", text: "text-amber-200" };
  return { label: "Starter", ring: "ring-slate-400/20", bg: "bg-slate-400/10", text: "text-slate-200" };
}

function PlatformIcons({ handles }: { handles?: Student["cpHandles"] }) {
  const has = (k: PlatformKey) => !!handles?.[k];

  return (
    <div className="flex items-center gap-2 text-slate-300">
      <div className={`p-2 rounded-xl border transition ${has("leetcode") ? "border-amber-500/40 bg-amber-500/10" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiLeetcode />
      </div>
      <div className={`p-2 rounded-xl border transition ${has("codeforces") ? "border-sky-500/40 bg-sky-500/10" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiCodeforces />
      </div>
      <div className={`p-2 rounded-xl border transition ${has("codechef") ? "border-stone-500/40 bg-stone-500/10" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiCodechef />
      </div>
      <div className={`p-2 rounded-xl border transition ${has("hackerrank") ? "border-emerald-500/40 bg-emerald-500/10" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiHackerrank />
      </div>
      <div className={`p-2 rounded-xl border transition ${has("github") ? "border-slate-400/40 bg-slate-400/10" : "border-slate-800/60 bg-slate-950/30 opacity-40"}`}>
        <SiGithub />
      </div>
    </div>
  );
}

export default function InstructorStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Student[]>([]);
  const [allData, setAllData] = useState<Student[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"score" | "name" | "solved">("score");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [onboardingFilter, setOnboardingFilter] = useState<"ALL" | "onboarded" | "pending">("ALL");
  const [branches, setBranches] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sendNotifModal, setSendNotifModal] = useState(false);
  const [notifyData, setNotifyData] = useState({
    title: "",
    message: "",
    recipientIds: [] as string[],
  });
  const [sendingNotif, setSendingNotif] = useState(false);

  const [newStudent, setNewStudent] = useState({
    fullName: "",
    rollNumber: "",
    branch: "",
    section: "",
    yearOfStudy: "",
    collegeEmail: "",
    personalEmail: "",
  });

  const extractFilters = (data: Student[]) => {
    const branchSet = new Set<string>();
    const sectionSet = new Set<string>();
    const yearSet = new Set<string>();

    data.forEach((s) => {
      if (s.branch) branchSet.add(s.branch);
      if (s.section) sectionSet.add(s.section);
      if (s.year) yearSet.add(String(s.year));
    });

    setBranches(Array.from(branchSet).sort());
    setSections(Array.from(sectionSet).sort());
    setYears(Array.from(yearSet).sort());
  };

  const fetchStudents = async () => {
    setLoading(true);
    setErr(null);
    try {
      const response = await apiClient.get("/instructor/students");
      const data = (response.data?.students || response.data || []).map((s: any) => ({
        id: s.id || s._id || s.uid,
        fullName: s.fullName || s.fullname || s.name,
        email: s.email || s.collegeEmail || s.personalEmail,
        collegeEmail: s.collegeEmail || s.email,
        personalEmail: s.personalEmail,
        branch: s.branch,
        yearOfStudy: s.yearOfStudy || s.year,
        year: s.yearOfStudy || s.year,
        section: s.section,
        rollNumber: s.rollNumber,
        codesyncScore: clamp(Number(s.codesyncScore || s.displayScore || 0)),
        displayScore: clamp(Number(s.displayScore || s.codesyncScore || 0)),
        cpScores: s.cpScores || {},
        totalProblemsSolved: Number(s.totalProblemsSolved || s.totalSolved || 0),
        cpHandles: s.cpHandles || {},
        onboardingCompleted: !!s.onboardingCompleted,
        status: s.status || "active",
        updatedAt: s.updatedAt,
      }));

      setAllData(data);
      setRows(data);
      extractFilters(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = useMemo(() => {
    let list = allData.slice();

    if (selectedBranch !== "ALL") {
      list = list.filter((s) => s.branch === selectedBranch);
    }
    if (selectedSection !== "ALL") {
      list = list.filter((s) => s.section === selectedSection);
    }
    if (selectedYear !== "ALL") {
      list = list.filter((s) => String(s.year || "") === selectedYear);
    }
    if (onboardingFilter === "onboarded") {
      list = list.filter((s) => s.onboardingCompleted);
    } else if (onboardingFilter === "pending") {
      list = list.filter((s) => !s.onboardingCompleted);
    }

    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((s) => {
        const name = (s.fullName || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const rollNo = (s.rollNumber || "").toLowerCase();
        return name.includes(query) || email.includes(query) || rollNo.includes(query);
      });
    }

    list.sort((a, b) => {
      if (sort === "name") return (a.fullName || "").localeCompare(b.fullName || "");
      if (sort === "solved") return (b.totalProblemsSolved || 0) - (a.totalProblemsSolved || 0);
      return (b.codesyncScore || 0) - (a.codesyncScore || 0);
    });

    return list;
  }, [allData, q, sort, selectedBranch, selectedSection, selectedYear, onboardingFilter]);

  const handleAddStudent = async () => {
    if (!newStudent.fullName.trim()) return;
    setAddingStudent(true);
    try {
      await apiClient.post("/instructor/students", newStudent);
      setShowAddModal(false);
      setNewStudent({
        fullName: "",
        rollNumber: "",
        branch: "",
        section: "",
        yearOfStudy: "",
        collegeEmail: "",
        personalEmail: "",
      });
      await fetchStudents();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setDeleting(studentId);
    try {
      await apiClient.delete(`/instructor/students/${studentId}`);
      setDeleteConfirm(null);
      await fetchStudents();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to delete student");
    } finally {
      setDeleting(null);
    }
  };

  const handleSendNotification = async () => {
    if (!notifyData.title.trim() || !notifyData.message.trim()) {
      alert("Please fill in title and message");
      return;
    }

    setSendingNotif(true);
    try {
      await apiClient.post("/instructor/send-notification", {
        title: notifyData.title,
        message: notifyData.message,
        recipientIds: notifyData.recipientIds.length > 0 ? notifyData.recipientIds : filtered.map((s) => s.id),
      });
      setSendNotifModal(false);
      setNotifyData({ title: "", message: "", recipientIds: [] });
      alert("Notification sent successfully!");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to send notification");
    } finally {
      setSendingNotif(false);
    }
  };

  const onboardedCount = filtered.filter((s) => s.onboardingCompleted).length;
  const pendingCount = filtered.filter((s) => !s.onboardingCompleted).length;

  return (
    <div className="w-full px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-7xl"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900/40 px-3 py-1 text-xs text-slate-200">
              <RiShieldCheckLine className="text-slate-300" />
              Students Management
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Students
              <span className="ml-3 text-slate-300/80 font-normal text-lg">
                ({filtered.length})
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {onboardedCount} onboarded • {pendingCount} pending
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchStudents}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2 text-sm text-slate-100 hover:bg-slate-900/70 active:scale-95 transition"
            >
              <RiRefreshLine />
              Refresh
            </button>
            <button
              onClick={() => setSendNotifModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-800/70 bg-purple-900/50 px-4 py-2 text-sm text-purple-100 hover:bg-purple-900/70 active:scale-95 transition"
            >
              <RiBellLine />
              Send Notification
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-800/70 bg-blue-900/50 px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/70 active:scale-95 transition"
            >
              <RiAddLine />
              Add Student
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
              <RiSearch2Line className="text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, email, roll..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 text-sm outline-none text-slate-100"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 text-sm outline-none text-slate-100"
          >
            <option value="ALL">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 text-sm outline-none text-slate-100"
          >
            <option value="ALL">All Sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={onboardingFilter}
            onChange={(e) => setOnboardingFilter(e.target.value as any)}
            className="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 text-sm outline-none text-slate-100"
          >
            <option value="ALL">All Status</option>
            <option value="onboarded">✅ Onboarded</option>
            <option value="pending">⏳ Pending</option>
          </select>
        </div>

        {/* Sort */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-400">Sort:</span>
          <button
            onClick={() => setSort("score")}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              sort === "score"
                ? "bg-sky-900/50 text-sky-100 border border-sky-800/50"
                : "bg-slate-900/30 text-slate-300 border border-slate-800/30 hover:bg-slate-900/40"
            }`}
          >
            Score
          </button>
          <button
            onClick={() => setSort("solved")}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              sort === "solved"
                ? "bg-sky-900/50 text-sky-100 border border-sky-800/50"
                : "bg-slate-900/30 text-slate-300 border border-slate-800/30 hover:bg-slate-900/40"
            }`}
          >
            Solved
          </button>
          <button
            onClick={() => setSort("name")}
            className={`px-3 py-1 rounded-lg text-sm transition ${
              sort === "name"
                ? "bg-sky-900/50 text-sky-100 border border-sky-800/50"
                : "bg-slate-900/30 text-slate-300 border border-slate-800/30 hover:bg-slate-900/40"
            }`}
          >
            Name
          </button>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-3xl border border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-slate-950/30 overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-4 border-b border-slate-800/60 text-xs text-slate-400 font-medium bg-slate-950/50">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Student</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Platforms</div>
            <div className="col-span-2">Actions</div>
          </div>

          <AnimatePresence>
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-10 text-slate-300 flex items-center gap-2"
              >
                <RiRefreshLine className="animate-spin" />
                Loading students…
              </motion.div>
            ) : err ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-6 py-8"
              >
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-100">
                  <RiInformationLine className="mt-0.5" />
                  <div>
                    <div className="font-medium">Couldn't load students</div>
                    <div className="text-sm opacity-90 mt-1">{err}</div>
                  </div>
                </div>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-10 text-slate-300"
              >
                No students found.
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filtered.map((s, idx) => {
                  const rank = idx + 1;
                  const score = s.codesyncScore || 0;
                  const badge = scoreBadge(score);
                  const name = s.fullName || "Unknown";
                  const isOnboarded = s.onboardingCompleted;

                  return (
                    <motion.div
                      key={s.id}
                      whileHover={{ y: -1 }}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-900/40 transition"
                    >
                      <div className="md:col-span-1 flex items-center gap-2">
                        <div className="text-sm text-slate-300 font-medium">
                          {rank <= 3 ? (
                            <span className="inline-flex items-center gap-1">
                              <RiTrophyLine className="text-amber-400" />
                              {rank}
                            </span>
                          ) : (
                            <span className="text-slate-400">{rank}</span>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl border border-slate-800/70 bg-gradient-to-br from-sky-500/40 to-blue-600/40 grid place-items-center text-sm text-slate-100 flex-shrink-0 font-semibold">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-100 truncate">{name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 truncate">
                            {s.rollNumber || "—"} • {s.branch || "—"} • {s.section || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center gap-2">
                        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${badge.ring} ${badge.bg} ${badge.text}`}>
                          <RiArrowRightUpLine className="text-lg" />
                          {score.toFixed(0)}
                        </div>
                      </div>

                      <div className="md:col-span-1 flex items-center">
                        {isOnboarded ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-200 text-xs border border-emerald-500/30">
                            <RiCheckboxCircleLine />
                            Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-200 text-xs border border-amber-500/30">
                            <RiTimeLine />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="md:col-span-2 flex items-center">
                        <PlatformIcons handles={s.cpHandles} />
                      </div>

                      <div className="md:col-span-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => setNotifyData({ ...notifyData, recipientIds: [s.id || ""] })}
                          className="p-2 rounded-lg hover:bg-purple-900/30 text-purple-400 transition"
                          title="Send notification"
                        >
                          <RiBellLine />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(s.id || "")}
                          className="p-2 rounded-lg hover:bg-red-900/30 text-red-400 transition"
                          title="Delete student"
                        >
                          <RiDeleteBin6Line />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-3xl border border-slate-800/60 bg-slate-950 p-6 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">Add New Student</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-900/60 rounded-lg transition">
                  <RiCloseLine />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500/50"
                />
                <input
                  type="text"
                  placeholder="Roll Number"
                  value={newStudent.rollNumber}
                  onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
                />
                <input
                  type="email"
                  placeholder="College Email"
                  value={newStudent.collegeEmail}
                  onChange={(e) => setNewStudent({ ...newStudent, collegeEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Branch"
                  value={newStudent.branch}
                  onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
                />
                <input
                  type="text"
                  placeholder="Section"
                  value={newStudent.section}
                  onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
                />
                <input
                  type="number"
                  placeholder="Year of Study"
                  value={newStudent.yearOfStudy}
                  onChange={(e) => setNewStudent({ ...newStudent, yearOfStudy: e.target.value })}
                  className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2 text-sm hover:bg-slate-900/70 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={addingStudent || !newStudent.fullName.trim()}
                  className="flex-1 rounded-xl border border-blue-800/70 bg-blue-900/50 px-4 py-2 text-sm text-blue-100 hover:bg-blue-900/70 transition disabled:opacity-50"
                >
                  {addingStudent ? "Adding..." : "Add Student"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Send Notification Modal */}
      <AnimatePresence>
        {sendNotifModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSendNotifModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-3xl border border-purple-800/60 bg-slate-950 p-6 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100">Send Notification</h2>
                <button onClick={() => setSendNotifModal(false)} className="p-1 hover:bg-slate-900/60 rounded-lg transition">
                  <RiCloseLine />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Title</label>
                  <input
                    type="text"
                    placeholder="Notification title"
                    value={notifyData.title}
                    onChange={(e) => setNotifyData({ ...notifyData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Message</label>
                  <textarea
                    placeholder="Notification message"
                    value={notifyData.message}
                    onChange={(e) => setNotifyData({ ...notifyData, message: e.target.value })}
                    className="w-full rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-2 text-sm outline-none placeholder:text-slate-500 h-28 resize-none"
                  />
                </div>
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <p className="text-xs text-slate-400">
                    Sending to: <span className="text-purple-300 font-medium">{notifyData.recipientIds.length > 0 ? notifyData.recipientIds.length : "All"} student(s)</span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setSendNotifModal(false)}
                  className="flex-1 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2 text-sm hover:bg-slate-900/70 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendNotification}
                  disabled={sendingNotif || !notifyData.title.trim() || !notifyData.message.trim()}
                  className="flex-1 rounded-xl border border-purple-800/70 bg-purple-900/50 px-4 py-2 text-sm text-purple-100 hover:bg-purple-900/70 transition disabled:opacity-50"
                >
                  {sendingNotif ? "Sending..." : "Send"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-3xl border border-rose-800/60 bg-slate-950 p-6 z-50"
            >
              <h2 className="text-lg font-bold text-rose-100">Delete Student?</h2>
              <p className="mt-2 text-sm text-slate-300">This action cannot be undone. The student will be permanently removed.</p>

              <div className="mt-6 flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-2 text-sm hover:bg-slate-900/70 transition">
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStudent(deleteConfirm)}
                  disabled={deleting === deleteConfirm}
                  className="flex-1 rounded-xl border border-rose-800/70 bg-rose-900/50 px-4 py-2 text-sm text-rose-100 hover:bg-rose-900/70 transition disabled:opacity-50"
                >
                  {deleting === deleteConfirm ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
