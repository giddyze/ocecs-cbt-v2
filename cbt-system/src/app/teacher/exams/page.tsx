"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface ClassRow { id: string; name: string; }
interface SubjectRow { id: string; name: string; }
interface ExamRow {
  id: string;
  title: string;
  module_type: "CA" | "MIDTERM" | "FINAL";
  status: "draft" | "published" | "hidden" | "closed";
  duration_minutes: number;
  num_questions: number;
  published_at: string | null;
  due_date: string | null;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-emerald-100 text-emerald-700",
  hidden: "bg-amber-100 text-amber-700",
  closed: "bg-red-100 text-red-700"
};

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [moduleType, setModuleType] = useState<"CA" | "MIDTERM" | "FINAL">("CA");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [numQuestions, setNumQuestions] = useState(10);
  const [passingScore, setPassingScore] = useState(50);
  const [randomize, setRandomize] = useState(true);
  const [dueDate, setDueDate] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [isCurrentTerm, setIsCurrentTerm] = useState(true);

  function loadExams(currentTermId: string | null) {
    if (!currentTermId) return;
    setLoading(true);
    fetch(`/api/teacher/exams?termId=${currentTermId}`).then((r) => r.json()).then((d) => setExams(d.exams || [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadExams(termId);
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
    const res = await fetch("/api/teacher/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleType, classId, subjectId, title, instructions,
        durationMinutes, numQuestions, passingScore, randomizeQuestions: randomize,
        dueDate: dueDate || null
      })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not create exam."); return; }
    setShowForm(false);
    setTitle(""); setInstructions(""); setDueDate("");
    loadExams(termId);
  }

  async function togglePublish(examId: string, publish: boolean) {
    await fetch(`/api/teacher/exams/${examId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: publish ? "published" : "draft" })
    });
    loadExams(termId);
  }

  async function deleteExam(examId: string, title: string) {
    const confirmed = window.confirm(
      `Delete "${title}"? This permanently removes it along with every student's questions and attempt history. This cannot be undone.`
    );
    if (!confirmed) return;
    await fetch(`/api/teacher/exams/${examId}`, { method: "DELETE" });
    loadExams(termId);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">My Exams</h1>
          <div className="w-10 h-1 bg-brand-teal rounded-full mt-2" />
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          disabled={!isCurrentTerm}
          title={!isCurrentTerm ? "Switch to the current term to create exams" : undefined}
          className={`bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            !loading && exams.length === 0 && !showForm && isCurrentTerm ? "animate-dangle" : ""
          }`}
        >
          {showForm ? "Cancel" : "+ Create Exam"}
        </button>
      </div>

      <TermSelector
        selectedTermId={termId}
        onChange={(id, isCurrent) => { setTermId(id); setIsCurrentTerm(isCurrent); }}
      />
      {!isCurrentTerm && (
        <p className="text-xs text-slate-400 mb-4 -mt-2">
          Viewing a past term — read-only. New exams are always created in the current term.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-3 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Module</label>
              <select value={moduleType} onChange={(e) => setModuleType(e.target.value as "CA" | "MIDTERM" | "FINAL")} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                <option value="CA">Continuous Assessment</option>
                <option value="MIDTERM">Mid-Term Examination</option>
                <option value="FINAL">Final Exam</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select required value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); }} className="w-full border border-slate-300 rounded-lg px-3 py-2">
                <option value="">Select</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId} className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-100">
              <option value="">{classId ? "Select" : "Choose a class first"}</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Third Term Mid-Term Test" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Instructions (shown to students before starting)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
              <input type="number" min={1} required value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1"># Questions</label>
              <input type="number" min={1} required value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Passing %</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />
            Randomize question order per student
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date &amp; time (optional)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
            <p className="text-xs text-slate-400 mt-1">
              After this passes, students can no longer start the exam — attempts already in progress finish normally.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Creating…" : "Create Exam (Draft)"}
          </button>
          <p className="text-xs text-slate-400">You&apos;ll add questions to the bank next, then publish when ready.</p>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Class / Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published / Due</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && exams.length === 0 && (
              <tr className="animate-fadeIn"><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No exams yet — create one above.</td></tr>
            )}
            {exams.map((e, i) => {
              const dueLabel = formatDateTime(e.due_date);
              const isOverdue = e.due_date && new Date(e.due_date) < new Date();
              return (
                <tr
                  key={e.id}
                  className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                >
                  <td className="px-4 py-3">{e.title}</td>
                  <td className="px-4 py-3">{e.classes?.name} · {e.subjects?.name}</td>
                  <td className="px-4 py-3">
                    {/* key={e.status} forces a remount when status changes,
                        replaying colorSweep as a one-off flash exactly at
                        the moment of toggling, on top of the ongoing
                        color transition — not just an instant swap. */}
                    <span
                      key={e.status}
                      className={`inline-block text-xs font-semibold px-2 py-1 rounded transition-colors duration-500 ${STATUS_STYLES[e.status]} ${
                        e.status === "draft" ? "animate-breathe" : "animate-colorSweep"
                      }`}
                    >
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {e.published_at && <p>Published {formatDateTime(e.published_at)}</p>}
                    {dueLabel && (
                      <p className={isOverdue ? "text-red-500 font-medium" : ""}>
                        Due {dueLabel}{isOverdue ? " (passed)" : ""}
                      </p>
                    )}
                    {!e.published_at && !dueLabel && <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <Link href={`/teacher/exams/${e.id}/questions`} className="text-brand-teal text-xs font-semibold hover:underline">Questions</Link>
                    <Link href={`/teacher/results?examId=${e.id}`} className="text-brand-teal text-xs font-semibold hover:underline">Results</Link>
                    {isCurrentTerm && (
                      <>
                        {e.status === "published" ? (
                          <button onClick={() => togglePublish(e.id, false)} className="text-amber-600 text-xs font-semibold hover:underline">Unpublish</button>
                        ) : (
                          <button onClick={() => togglePublish(e.id, true)} className="text-emerald-600 text-xs font-semibold hover:underline">Publish</button>
                        )}
                        <button
                          onClick={() => deleteExam(e.id, e.title)}
                          title="Delete exam permanently"
                          className="text-red-500 hover:text-red-700 inline-flex align-middle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
