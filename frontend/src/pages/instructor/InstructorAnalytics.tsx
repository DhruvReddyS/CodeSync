// src/pages/instructor/InstructorAnalytics.tsx

export default function InstructorAnalytics() {
  return (
    <div className="w-full min-h-screen px-6 py-10 text-slate-100">
      <h1 className="text-3xl font-black mb-6">
        Student{" "}
        <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
          Analytics
        </span>
      </h1>

      <p className="text-slate-400 mb-6">
        Visual insights into student performance, contest ratings, and growth.
      </p>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-lg">
        <div className="h-48 flex items-center justify-center text-slate-500">
          Charts will appear here (coming soon…)
        </div>
      </div>
    </div>
  );
}
