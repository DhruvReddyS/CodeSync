// src/pages/instructor/InstructorStudents.tsx

export default function InstructorStudents() {
  const sampleStudents = [
    { name: "Aarav Reddy", platform: "LeetCode", solved: 320 },
    { name: "Sai Kalyan", platform: "Codeforces", solved: 150 },
    { name: "Meghana S", platform: "GFG", solved: 210 },
  ];

  return (
    <div className="w-full min-h-screen px-6 py-10 text-slate-100">
      <h1 className="text-3xl font-black mb-6">
        Manage{" "}
        <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
          Students
        </span>
      </h1>

      <p className="text-slate-400 mb-6">
        View performance and coding statistics of your students.
      </p>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="pb-3">Name</th>
              <th className="pb-3">Platform</th>
              <th className="pb-3">Problems Solved</th>
            </tr>
          </thead>
          <tbody>
            {sampleStudents.map((s) => (
              <tr key={s.name} className="border-b border-slate-900/60">
                <td className="py-3">{s.name}</td>
                <td className="py-3 text-slate-400">{s.platform}</td>
                <td className="py-3 font-semibold">{s.solved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
