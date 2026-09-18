"use client";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, AlertCircle } from "lucide-react";

interface SubjectRow { id: string; name: string; }

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setLoadError("");
    fetch("/api/admin/subjects")
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) { setLoadError(d.error || "Could not load subjects."); setSubjects([]); return; }
        setSubjects(d.subjects || []);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not create subject."); return; }
    setName("");
    setShowForm(false);
    load();
  }

  async function handleDelete(subject: SubjectRow) {
    setDeletingId(subject.id);
    // Fetch exactly what this deletion would destroy before asking —
    // a generic "are you sure" isn't a real warning.
    const res = await fetch(`/api/admin/subjects/${subject.id}`);
    const deps = await res.json();
    setDeletingId(null);

    if (!res.ok) { alert(deps.error || "Could not check what's linked to this subject."); return; }

    const total = deps.examCount + deps.assignmentCount;
    const message = total > 0
      ? `WARNING: Deleting "${subject.name}" is PERMANENT and cannot be undone.\n\n` +
        `This will immediately and permanently delete:\n` +
        `• ${deps.examCount} exam${deps.examCount === 1 ? "" : "s"}, including every student's attempt history\n` +
        `• ${deps.assignmentCount} assignment${deps.assignmentCount === 1 ? "" : "s"}, including every student's submissions and grades\n` +
        `• Its link to ${deps.classCount} class${deps.classCount === 1 ? "" : "es"}\n\n` +
        `There is no way to recover this data afterward. Type OK only if you are certain.`
      : `Delete "${subject.name}"? It currently has no exams or assignments attached, so this is safe, but it will still remove it from ${deps.classCount} class${deps.classCount === 1 ? "" : "es"} it's linked to. This cannot be undone.`;

    if (!window.confirm(message)) return;

    setDeletingId(subject.id);
    const delRes = await fetch(`/api/admin/subjects/${subject.id}`, { method: "DELETE" });
    const delData = await delRes.json();
    setDeletingId(null);
    if (!delRes.ok) { alert(delData.error || "Could not delete subject."); return; }
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-brand-coral" /> Subjects
          </h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className={`flex items-center gap-1.5 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity ${
            !loading && subjects.length === 0 && !showForm ? "animate-dangle" : ""
          }`}
        >
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Subject"}
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-2.5 animate-slideDown">
          <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-none mt-0.5" />
          <p className="text-sm text-red-800">{loadError}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 max-w-md space-y-3 animate-slideDown">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600 animate-shake">{error}</p>}
          <button disabled={saving} className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50">
            {saving ? "Creating…" : "Create Subject"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
              {!loading && subjects.length === 0 && (
                <tr className="animate-fadeIn"><td colSpan={2} className="px-4 py-6 text-center text-slate-400">No subjects yet.</td></tr>
              )}
              {subjects.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                >
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s)}
                      disabled={deletingId === s.id}
                      title="Delete subject"
                      className="text-red-500 hover:text-red-700 inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {deletingId === s.id ? "Checking…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
