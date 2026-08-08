"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList, Trash2 } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface ClassRow { id: string; name: string; }
interface SubjectRow { id: string; name: string; }
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

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [isCurrentTerm, setIsCurrentTerm] = useState(true);

  function load(currentTermId: string | null) {
    if (!currentTermId) return;
    setLoading(true);
    fetch(`/api/teacher/assignments?termId=${currentTermId}`).then((r) => r.json()).then((d) => setAssignments(d.assignments || [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load(termId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId]);

  useEffect(() => {
    fetch("/api/public/classes").then((r) => r.json()).then((d) => setClasses(d.classes || []));
  }, []);

  useEffect(() => {
    if (!classId) { setSubjects([]); return; }
    fetch(`/api/public/subjects?classId=${classId}`).then((r) => r.json()).then((d) => setSubjects(d.subjects || []));
  }, [classId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/teacher/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, subjectId, title, instructions, dueDate: dueDate || null })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not create assignment."); return; }
    setShowForm(false);
    setTitle(""); setInstructions(""); setDueDate("");
    load(termId);
  }

  async function togglePublish(id: string, publish: boolean) {
    await fetch(`/api/teacher/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: publish ? "published" : "draft" })
    });
    load(termId);
  }

  async function deleteAssignment(id: string, title: string) {
    const confirmed = window.confirm(
      `Delete "${title}"? This permanently removes it along with every student's submission history. This cannot be undone.`
    );
    if (!confirmed) return;
    await fetch(`/api/teacher/assignments/${id}`, { method: "DELETE" });
    load(termId);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-brand-teal" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Assignments</h1>
            <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
          </div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          disabled={!isCurrentTerm}
          title={!isCurrentTerm ? "Switch to the current term to create assignments" : undefined}
          className="flex items-center gap-1.5 bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "New Assignment"}
        </button>
      </div>

      <TermSelector
        selectedTermId={termId}
        onChange={(id, isCurrent) => { setTermId(id); setIsCurrentTerm(isCurrent); }}
      />
      {!isCurrentTerm && (
        <p className="text-xs text-slate-400 mb-4 -mt-2">
          Viewing a past term — read-only. New assignments are always created in the current term.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-3 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select required value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); }} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                <option value="">Select</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId} className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-100">
                <option value="">{classId ? "Select" : "Choose a class first"}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Essay: My Community" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
            <textarea required value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date (optional)</label>
            <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {saving ? "Creating…" : "Create Assignment (Draft)"}
          </button>
        </form>
      )}

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
                  <span key={a.status} className={`inline-block text-xs font-semibold px-2 py-1 rounded transition-colors duration-500 animate-colorSweep ${STATUS_STYLES[a.status]}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <Link href={`/teacher/assignments/${a.id}/questions`} className="text-brand-teal text-xs font-semibold hover:underline">Questions</Link>
                  <Link href={`/teacher/assignments/${a.id}/submissions`} className="text-brand-teal text-xs font-semibold hover:underline">Submissions</Link>
                  {isCurrentTerm && (
                    <>
                      {a.status === "published" ? (
                        <button onClick={() => togglePublish(a.id, false)} className="text-amber-600 text-xs font-semibold hover:underline">Unpublish</button>
                      ) : (
                        <button onClick={() => togglePublish(a.id, true)} className="text-emerald-600 text-xs font-semibold hover:underline">Publish</button>
                      )}
                      <button
                        onClick={() => deleteAssignment(a.id, a.title)}
                        title="Delete assignment permanently"
                        className="text-red-500 hover:text-red-700 inline-flex align-middle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
