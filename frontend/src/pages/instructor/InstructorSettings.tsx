// src/pages/instructor/InstructorSettings.tsx

export default function InstructorSettings() {
  return (
    <div className="w-full min-h-screen px-6 py-10 text-slate-100">
      <h1 className="text-3xl font-black mb-6">
        Instructor{" "}
        <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
          Settings
        </span>
      </h1>

      <p className="text-slate-400 mb-6">Manage your account and preferences.</p>

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="font-semibold mb-2">Account Details</h2>
          <p className="text-sm text-slate-400">Email, password & profile settings will be added here.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="font-semibold mb-2">Batch Preferences</h2>
          <p className="text-sm text-slate-400">Instructor batch & access controls coming soon.</p>
        </div>
      </div>
    </div>
  );
}
