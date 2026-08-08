"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

interface ExamRow {
  id: string;
  title: string;
  module_type: "CA" | "MIDTERM" | "FINAL";
  status: "draft" | "published" | "hidden" | "closed";
  duration_minutes: number;
  num_questions: number;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

const MODULE_LABELS: Record<ExamRow["module_type"], string> = {
  CA: "CA",
  MIDTERM: "Mid-Term",
  FINAL: "Final Exam"
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  hidden: "bg-amber-100 text-amber-700",
  closed: "bg-red-100 text-red-700"
};

export default function AdminExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/teacher/exams").then((r) => r.json()).then((d) => setExams(d.exams || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(examId: string, status: string) {
    await fetch(`/api/teacher/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    load();
  }

  async function resetExam(examId: string) {
    if (!confirm("This deletes every student's attempt and score for this exam so it can be retaken. Continue?")) return;
    await fetch(`/api/teacher/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetAttempts: true, status: "published" })
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-brand-navy" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">All Exams</h1>
          <div className="w-10 h-1 bg-brand-teal rounded-full mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Class / Subject</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && exams.length === 0 && (
              <tr className="animate-fadeIn"><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No exams yet.</td></tr>
            )}
            {exams.map((e, i) => (
              <tr
                key={e.id}
                className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <td className="px-4 py-3">{e.title}</td>
                <td className="px-4 py-3">{e.classes?.name} · {e.subjects?.name}</td>
                <td className="px-4 py-3">{MODULE_LABELS[e.module_type]}</td>
                <td className="px-4 py-3">
                  <span key={e.status} className={`inline-block text-xs font-semibold px-2 py-1 rounded transition-colors duration-500 animate-colorSweep ${STATUS_STYLES[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link href={`/teacher/results?examId=${e.id}`} className="text-brand-teal text-xs font-semibold hover:underline">Results</Link>
                  {e.status === "published" ? (
                    <button onClick={() => setStatus(e.id, "hidden")} className="text-amber-600 text-xs font-semibold hover:underline">Hide</button>
                  ) : (
                    <button onClick={() => setStatus(e.id, "published")} className="text-emerald-600 text-xs font-semibold hover:underline">Publish</button>
                  )}
                  <button onClick={() => resetExam(e.id)} className="text-red-600 text-xs font-semibold hover:underline">Reset attempts</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
