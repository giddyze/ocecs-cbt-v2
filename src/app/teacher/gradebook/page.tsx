"use client";
import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface Combo { class_id: string; subject_id: string; classes: { name: string } | null; subjects: { name: string } | null; }
interface StudentScore {
  studentId: string;
  fullName: string;
  username: string;
  caWeightedContribution: number;
  midtermWeightedContribution: number;
  finalWeightedContribution: number;
  runningTotal: number;
  isComplete: boolean;
  caExamCount: number;
  ca: unknown[];
  midterm: unknown | null;
  final: unknown | null;
}

export default function TeacherGradebookPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboKey, setComboKey] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [weights, setWeights] = useState({ ca_weight_percent: 30, midterm_weight_percent: 20, final_weight_percent: 50 });
  const [students, setStudents] = useState<StudentScore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/my-classes").then((r) => r.json()).then((d) => {
      const list: Combo[] = d.combos || [];
      setCombos(list);
      if (list.length > 0) setComboKey(`${list[0].class_id}:${list[0].subject_id}`);
    });
  }, []);

  useEffect(() => {
    if (!comboKey || !termId) return;
    const [classId, subjectId] = comboKey.split(":");
    setLoading(true);
    fetch(`/api/teacher/gradebook?classId=${classId}&subjectId=${subjectId}&termId=${termId}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students || []);
        if (d.weights) setWeights(d.weights);
      })
      .finally(() => setLoading(false));
  }, [comboKey, termId]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Gradebook</h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-2">
        <select
          value={comboKey}
          onChange={(e) => setComboKey(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
        >
          {combos.length === 0 && <option value="">No class/subject assignments yet</option>}
          {combos.map((c) => (
            <option key={`${c.class_id}:${c.subject_id}`} value={`${c.class_id}:${c.subject_id}`}>
              {c.classes?.name} — {c.subjects?.name}
            </option>
          ))}
        </select>
        <TermSelector selectedTermId={termId} onChange={(id) => setTermId(id)} />
      </div>

      <p className="text-xs text-slate-400 mb-6">
        Weighting: CA {weights.ca_weight_percent}% · Mid-Term {weights.midterm_weight_percent}% · Final Exam {weights.final_weight_percent}%
      </p>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">CA</th>
              <th className="px-4 py-3">Mid-Term</th>
              <th className="px-4 py-3">Final</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && students.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No students found for this class.</td></tr>
            )}
            {students.map((s, i) => (
              <tr
                key={s.studentId}
                className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <td className="px-4 py-3">{s.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{s.caWeightedContribution}/{weights.ca_weight_percent}%</td>
                <td className="px-4 py-3 text-slate-500">{s.midtermWeightedContribution}/{weights.midterm_weight_percent}%</td>
                <td className="px-4 py-3 text-slate-500">{s.finalWeightedContribution}/{weights.final_weight_percent}%</td>
                <td className="px-4 py-3 font-bold text-brand-navy">{s.runningTotal}%</td>
                <td className="px-4 py-3">
                  {s.isComplete ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Final
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5" /> In progress
                    </span>
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
