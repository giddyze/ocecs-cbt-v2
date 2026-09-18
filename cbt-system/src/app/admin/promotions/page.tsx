"use client";
import { useEffect, useState } from "react";
import { ArrowUpCircle, CheckCircle2, AlertCircle } from "lucide-react";

interface ClassRow { id: string; name: string; }
interface TermRow { id: string; session_name: string; term: string; is_current: boolean; }
interface StudentRow { id: string; full_name: string; username: string; admission_no: string | null; }

export default function AdminPromotionsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [toTermId, setToTermId] = useState("");
  const [notes, setNotes] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/classes").then((r) => r.json()).then((d) => setClasses(d.classes || []));
    fetch("/api/public/terms").then((r) => r.json()).then((d) => setTerms(d.terms || []));
  }, []);

  useEffect(() => {
    if (!fromClassId) { setStudents([]); return; }
    setLoading(true);
    fetch(`/api/admin/students?classId=${fromClassId}`).then((r) => r.json()).then((d) => {
      setStudents(d.students || []);
      setExcluded(new Set());
    }).finally(() => setLoading(false));
  }, [fromClassId]);

  function toggleExclude(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handlePromote() {
    setError(""); setResult(null);
    if (!toClassId || !toTermId) { setError("Select the destination class and term."); return; }
    const studentIds = students.filter((s) => !excluded.has(s.id)).map((s) => s.id);
    if (studentIds.length === 0) { setError("No students selected — everyone is excluded."); return; }

    const confirmed = window.confirm(
      `Promote ${studentIds.length} student${studentIds.length === 1 ? "" : "s"} to the selected class/term? This updates their current class immediately — full history is preserved either way.`
    );
    if (!confirmed) return;

    setSaving(true);
    const res = await fetch("/api/admin/students/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds, toClassId, toTermId, notes })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not promote students."); return; }
    setResult({ succeeded: data.succeeded, failed: data.failed });
    if (data.failed === 0 && fromClassId) {
      fetch(`/api/admin/students?classId=${fromClassId}`).then((r) => r.json()).then((d) => setStudents(d.students || []));
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <ArrowUpCircle className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Promotions</h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-6">
        Moves students from one class to another. No historical exam or assignment records are affected —
        everything stays correctly tagged to whichever class/term it actually happened in.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 max-w-2xl space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From class</label>
            <select value={fromClassId} onChange={(e) => setFromClassId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To class</label>
            <select value={toClassId} onChange={(e) => setToClassId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">To term</label>
          <select value={toTermId} onChange={(e) => setToTermId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.session_name} — {t.term}{t.is_current ? " (Current)" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {fromClassId && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-2xl">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
            Uncheck any student who should NOT be promoted (e.g. repeating this class).
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr><th className="px-4 py-3 w-10"></th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Admission No.</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
              {!loading && students.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No students in this class.</td></tr>
              )}
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={!excluded.has(s.id)} onChange={() => toggleExclude(s.id)} />
                  </td>
                  <td className="px-4 py-3">{s.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.admission_no || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 mt-4 animate-shake">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
      {result && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600 mt-4 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" /> Promoted {result.succeeded} student{result.succeeded === 1 ? "" : "s"}.
          {result.failed > 0 && ` ${result.failed} failed — check the browser console for details.`}
        </p>
      )}

      {fromClassId && (
        <button
          onClick={handlePromote}
          disabled={saving}
          className="mt-4 bg-brand-navy text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50"
        >
          {saving ? "Promoting…" : "Promote Selected Students"}
        </button>
      )}
    </div>
  );
}
