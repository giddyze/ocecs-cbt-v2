"use client";
import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface ComponentResult {
  examId: string;
  examTitle: string;
  score: number;
  total: number;
  percent: number;
}
interface SubjectScore {
  subjectId: string;
  subjectName: string;
  ca: ComponentResult[];
  midterm: ComponentResult | null;
  final: ComponentResult | null;
  caWeightedContribution: number;
  midtermWeightedContribution: number;
  finalWeightedContribution: number;
  runningTotal: number;
  isComplete: boolean;
  caExamCount: number;
  hasMidtermExam: boolean;
  hasFinalExam: boolean;
}

export default function TermSummaryPage() {
  const [termId, setTermId] = useState<string | null>(null);
  const [weights, setWeights] = useState({ ca_weight_percent: 30, midterm_weight_percent: 20, final_weight_percent: 50 });
  const [subjects, setSubjects] = useState<SubjectScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!termId) return;
    setLoading(true);
    fetch(`/api/student/term-summary?termId=${termId}`)
      .then((r) => r.json())
      .then((d) => {
        setSubjects(d.subjects || []);
        if (d.weights) setWeights(d.weights);
      })
      .finally(() => setLoading(false));
  }, [termId]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">My Scores</h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>

      <TermSelector selectedTermId={termId} onChange={(id) => setTermId(id)} />

      <p className="text-xs text-slate-400 mb-6">
        Weighting this term: CA {weights.ca_weight_percent}% · Mid-Term {weights.midterm_weight_percent}% · Final Exam {weights.final_weight_percent}%
      </p>

      {loading && <p className="text-slate-500">Loading…</p>}
      {!loading && subjects.length === 0 && (
        <p className="text-slate-500 bg-white rounded-xl p-6 text-center shadow-sm">No subjects assigned to your class yet.</p>
      )}

      <div className="space-y-4">
        {subjects.map((s, i) => (
          <div
            key={s.subjectId}
            className="bg-white rounded-xl shadow-sm p-5 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-brand-navy">{s.subjectName}</h2>
              <div className="flex items-center gap-2">
                {!s.isComplete && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> In progress
                  </span>
                )}
                <span className={`text-lg font-black ${s.isComplete ? "text-emerald-600" : "text-slate-400"}`}>
                  {s.runningTotal}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <ComponentCell label="CA" done={s.ca.length} total={s.caExamCount || 3} contribution={s.caWeightedContribution} max={weights.ca_weight_percent} />
              <ComponentCell label="Mid-Term" done={s.midterm ? 1 : 0} total={s.hasMidtermExam ? 1 : 1} contribution={s.midtermWeightedContribution} max={weights.midterm_weight_percent} />
              <ComponentCell label="Final Exam" done={s.final ? 1 : 0} total={s.hasFinalExam ? 1 : 1} contribution={s.finalWeightedContribution} max={weights.final_weight_percent} />
            </div>

            {s.isComplete && (
              <p className="flex items-center gap-1 text-xs text-emerald-600 mt-3">
                <CheckCircle2 className="w-3.5 h-3.5" /> Final for this term
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentCell({
  label, done, total, contribution, max
}: { label: string; done: number; total: number; contribution: number; max: number }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-slate-500 font-medium mb-1">{label}</p>
      <p className="text-slate-400 mb-1">{done}/{total} graded</p>
      <p className="font-bold text-brand-navy">{contribution}<span className="text-slate-400 font-normal">/{max}%</span></p>
    </div>
  );
}
