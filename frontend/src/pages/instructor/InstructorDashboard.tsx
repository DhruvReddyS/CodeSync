// src/pages/instructor/InstructorDashboard.tsx

export default function InstructorDashboard() {
  return (
    <div className="w-full min-h-screen px-6 py-10 text-slate-100">
      <h1 className="text-3xl font-black mb-6">
        Instructor{" "}
        <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
          Dashboard
        </span>
      </h1>

      <p className="text-slate-400 mb-6">
        Overview of batches, leaderboards, analytics, and student performance.
      </p>

      {/* Placeholder Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {["Total Students", "Active Batches", "Reports Generated"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-[0_0_25px_rgba(0,0,0,0.6)]"
          >
            <h2 className="text-lg font-semibold">{label}</h2>
            <p className="mt-2 text-slate-400 text-sm">Coming soon…</p>
          </div>
        ))}
      </div>
    </div>
  );
}
