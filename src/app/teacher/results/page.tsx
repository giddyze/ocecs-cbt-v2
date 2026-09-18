"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";

interface Attempt {
  id: string;
  status: "active" | "submitted" | "expired";
  score: number | null;
  submitted_at: string | null;
  students: { full_name: string; username: string } | null;
}

export default function TeacherResultsPage() {
  return (
    <Suspense fallback={null}>
      <TeacherResultsContent />
    </Suspense>
  );
}

function TeacherResultsContent() {
  const params = useSearchParams();
  const examId = params.get("examId");
  const [examTitle, setExamTitle] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [numQuestions, setNumQuestions] = useState(0);
  const [passingScore, setPassingScore] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!examId) return;
    fetch(`/api/teacher/exams/${examId}`).then((r) => r.json()).then((d) => {
      if (d.exam) setExamTitle(d.exam.title);
    });
    fetch(`/api/teacher/exams/${examId}/results`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not load results."); setLoading(false); return; }
      setAttempts(data.attempts || []);
      setNumQuestions(data.numQuestions);
      setPassingScore(data.passingScore);
      setLoading(false);
    });
  }, [examId]);

  if (!examId) return <p className="text-slate-500">No exam selected.</p>;

  return (
    <div>
      <Breadcrumb items={[{ label: "Exams", href: "/teacher/exams" }, { label: examTitle || "Results" }]} />
      <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Results</h1>
      <div className="w-10 h-1 bg-brand-teal rounded-full mt-2 mb-6" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {attempts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No attempts yet.</td></tr>
              )}
              {attempts.map((a) => {
                const pct = a.score !== null && numQuestions > 0 ? Math.round((a.score / numQuestions) * 100) : null;
                return (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{a.students?.full_name} <span className="text-slate-400">({a.students?.username})</span></td>
                    <td className="px-4 py-3">{a.score !== null ? `${a.score}/${numQuestions}` : "—"}</td>
                    <td className="px-4 py-3">{pct !== null ? `${pct}%` : "—"}</td>
                    <td className="px-4 py-3">
                      {pct !== null && (
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${pct >= passingScore ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {pct >= passingScore ? "Pass" : "Fail"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{a.status}</td>
                    <td className="px-4 py-3">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
