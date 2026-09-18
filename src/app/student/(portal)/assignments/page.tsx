"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Clock, CheckCircle2, MessageSquare } from "lucide-react";

interface AssignmentRow {
  id: string;
  title: string;
  instructions: string;
  due_date: string | null;
  subjects: { name: string } | null;
  submission: { submitted_at: string; grade: number | null; feedback: string | null } | null;
}

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/assignments").then((r) => r.json()).then((d) => setAssignments(d.assignments || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">
            Your Assignments
          </h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {!loading && assignments.length === 0 && (
        <p className="text-slate-500 bg-white rounded-xl p-6 text-center shadow-sm">
          No assignments for your class right now.
        </p>
      )}

      <div className="space-y-4">
        {assignments.map((a, i) => {
          const overdue = a.due_date && !a.submission && new Date(a.due_date) < new Date();
          return (
            <Link
              key={a.id}
              href={`/student/assignments/${a.id}`}
              style={{ animationDelay: `${i * 70}ms` }}
              className="block bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-brand-navy">{a.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{a.subjects?.name}</p>
                  {a.due_date && (
                    <p className={`text-xs mt-1 flex items-center gap-1 transition-colors duration-300 ${overdue ? "text-red-500" : "text-slate-400"}`}>
                      <Clock className="w-3 h-3" /> Due {new Date(a.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {a.submission ? (
                    a.submission.grade !== null ? (
                      <span className="flex items-center gap-1 text-sm font-semibold text-emerald-600 transition-colors duration-300 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4" /> Graded: {a.submission.grade}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-slate-500 transition-colors duration-300 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-brand-teal" /> Submitted
                      </span>
                    )
                  ) : (
                    <span className={`text-sm font-semibold transition-colors duration-300 ${overdue ? "text-red-500" : "text-brand-gold animate-breathe"}`}>
                      {overdue ? "Overdue" : "Pending"}
                    </span>
                  )}
                  {a.submission?.feedback && (
                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-1 justify-end">
                      <MessageSquare className="w-3 h-3" /> Feedback available
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
