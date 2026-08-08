"use client";
import { useEffect, useState } from "react";
import { Calendar, Plus, CheckCircle2, Star } from "lucide-react";

interface Term {
  id: string;
  session_name: string;
  term: string;
  is_current: boolean;
  ca_weight_percent: number;
  midterm_weight_percent: number;
  final_weight_percent: number;
}

export default function AdminTermsPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [term, setTerm] = useState("First Term");
  const [caWeight, setCaWeight] = useState(30);
  const [midtermWeight, setMidtermWeight] = useState(20);
  const [finalWeight, setFinalWeight] = useState(50);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/terms").then((r) => r.json()).then((d) => setTerms(d.terms || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const weightTotal = caWeight + midtermWeight + finalWeight;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (weightTotal !== 100) { setError(`Weights must sum to 100% — currently ${weightTotal}%.`); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionName, term,
        caWeightPercent: caWeight, midtermWeightPercent: midtermWeight, finalWeightPercent: finalWeight
      })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not create term."); return; }
    setSessionName(""); setTerm("First Term"); setCaWeight(30); setMidtermWeight(20); setFinalWeight(50);
    setShowForm(false);
    load();
  }

  async function setCurrent(id: string) {
    setSettingCurrentId(id);
    await fetch(`/api/admin/terms/${id}/set-current`, { method: "POST" });
    setSettingCurrentId(null);
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-7 h-7 text-brand-coral" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Terms</h1>
            <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
          </div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className={`flex items-center gap-1.5 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity ${
            !loading && terms.length === 0 && !showForm ? "animate-dangle" : ""
          }`}
        >
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Term"}
        </button>
      </div>

      <p className="text-sm text-slate-500 bg-white rounded-xl shadow-sm p-4 mb-6">
        Only one term can be current at a time — students and teachers see whichever term is marked current by default,
        with past terms available read-only. Switching the current term does not delete or affect any existing records.
      </p>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 max-w-lg space-y-3 animate-slideDown">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Session (e.g. 2026/2027)</label>
            <input required value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option>First Term</option>
              <option>Second Term</option>
              <option>Third Term</option>
            </select>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              Scoring weights — must total 100% ({weightTotal}% currently)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">CA (all combined)</label>
                <input type="number" min={0} max={100} value={caWeight} onChange={(e) => setCaWeight(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mid-Term</label>
                <input type="number" min={0} max={100} value={midtermWeight} onChange={(e) => setMidtermWeight(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Final Exam</label>
                <input type="number" min={0} max={100} value={finalWeight} onChange={(e) => setFinalWeight(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 animate-shake">{error}</p>}
          <button disabled={saving} className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50">
            {saving ? "Creating…" : "Create Term"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Weights (CA / Mid / Final)</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && terms.length === 0 && (
              <tr className="animate-fadeIn"><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No terms yet — create one above.</td></tr>
            )}
            {terms.map((t, i) => (
              <tr
                key={t.id}
                className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <td className="px-4 py-3">{t.session_name}</td>
                <td className="px-4 py-3">{t.term}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {t.ca_weight_percent}% / {t.midterm_weight_percent}% / {t.final_weight_percent}%
                </td>
                <td className="px-4 py-3">
                  {t.is_current ? (
                    <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full w-fit">
                      <Star className="w-3 h-3" /> Current
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Archived</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!t.is_current && (
                    <button
                      onClick={() => setCurrent(t.id)}
                      disabled={settingCurrentId === t.id}
                      className="flex items-center gap-1 text-brand-teal text-xs font-semibold hover:underline ml-auto disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {settingCurrentId === t.id ? "Setting…" : "Set as Current"}
                    </button>
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
