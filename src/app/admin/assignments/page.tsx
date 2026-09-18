"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

interface AssignmentRow {
  id: string;
  title: string;
  status: "draft" | "published" | "closed";
  due_date: string | null;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-red-100 text-red-700"
};

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/assignments").then((r) => r.json()).then((d) => setAssignments(d.assignments || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-7 h-7 text-brand-navy" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">All Assignments</h1>
          <div className="w-10 h-1 bg-brand-teal rounded-full mt-2" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Class / Subject</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && assignments.length === 0 && (
              <tr className="animate-fadeIn"><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No assignments yet.</td></tr>
            )}
            {assignments.map((a, i) => (
              <tr
                key={a.id}
                className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <td className="px-4 py-3">{a.title}</td>
                <td className="px-4 py-3">{a.classes?.name} · {a.subjects?.name}</td>
                <td className="px-4 py-3">{a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/teacher/assignments/${a.id}/submissions`} className="text-brand-teal text-xs font-semibold hover:underline">Submissions</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
