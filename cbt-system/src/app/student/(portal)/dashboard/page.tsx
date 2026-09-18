"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Clock, CheckCircle2, BookOpen, ChevronDown } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface ExamRow {
  id: string;
  title: string;
  module_type: "CA" | "MIDTERM" | "FINAL";
  duration_minutes: number;
  num_questions: number;
  attemptStatus: "not_started" | "active" | "submitted" | "expired";
  score: number | null;
}
interface SubjectGroup {
  subjectId: string;
  subjectName: string;
  exams: ExamRow[];
}

const MODULE_LABELS: Record<ExamRow["module_type"], string> = {
  CA: "Continuous Assessment",
  MIDTERM: "Mid-Term",
  FINAL: "Final Exam"
};

export default function StudentDashboard() {
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [termId, setTermId] = useState<string | null>(null);
  const [isCurrentTerm, setIsCurrentTerm] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!termId) return; // wait for TermSelector to resolve the default term first
    setLoading(true);
    fetch(`/api/student/exams?termId=${termId}`).then(async (res) => {
      if (res.status === 401) { router.push("/student/login"); return; }
      const data = await res.json();
      setSubjects(data.subjects || []);
      setIsCurrentTerm(data.isCurrentTerm ?? true);
      setLoading(false);
    });
  }, [termId, router]);

  function toggleCollapsed(subjectId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(subjectId) ? next.delete(subjectId) : next.add(subjectId);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">
            Your Exams
          </h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>

      <TermSelector selectedTermId={termId} onChange={(id) => setTermId(id)} />

      {loading && <p className="text-slate-500">Loading…</p>}

      {!loading && subjects.length === 0 && (
        <p className="text-slate-500 bg-white rounded-xl p-6 text-center shadow-sm">
          No subjects assigned to your class yet.
        </p>
      )}

      <div className="space-y-4">
        {subjects.map((subject, i) => {
          const isCollapsed = collapsed.has(subject.subjectId);
          const pendingCount = subject.exams.filter(
            (e) => e.attemptStatus === "not_started" || e.attemptStatus === "active"
          ).length;

          return (
            <div
              key={subject.subjectId}
              className="bg-white rounded-xl shadow-sm overflow-hidden animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <button
                onClick={() => toggleCollapsed(subject.subjectId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4.5 h-4.5 text-brand-teal" />
                  <span className="font-semibold text-brand-navy">{subject.subjectName}</span>
                  {pendingCount > 0 && (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-springIn">
                      {pendingCount} to take
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${isCollapsed ? "" : "rotate-180"}`}
                />
              </button>

              {!isCollapsed && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {subject.exams.length === 0 && (
                    <p className="px-5 py-4 text-sm text-slate-400">No exams published for this subject yet.</p>
                  )}
                  {subject.exams.map((e) => (
                    <div key={e.id} className="px-5 py-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-navy text-sm truncate">{e.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {MODULE_LABELS[e.module_type]} · {e.num_questions} questions
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {e.duration_minutes} min
                          </span>
                        </p>
                      </div>
                      {e.attemptStatus === "submitted" || e.attemptStatus === "expired" ? (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500 flex-none">
                          {e.attemptStatus === "submitted" ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              {e.score}/{e.num_questions}
                            </>
                          ) : (
                            "Expired"
                          )}
                        </span>
                      ) : isCurrentTerm ? (
                        <button
                          onClick={() => router.push(`/student/exam/${e.id}`)}
                          className="bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity flex-none animate-breathe"
                        >
                          {e.attemptStatus === "active" ? "Resume" : "Take Exam"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 flex-none">Not attempted</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
