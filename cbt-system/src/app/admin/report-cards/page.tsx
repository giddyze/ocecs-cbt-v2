"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Award, User, Printer } from "lucide-react";
import TermSelector from "@/components/TermSelector";
import Watermark from "@/components/Watermark";

interface ClassRow { id: string; name: string; }
interface StudentRow { id: string; full_name: string; }
interface SubjectResult {
  subjectId: string;
  subjectName: string;
  examScore: { caWeightedContribution: number; midtermWeightedContribution: number; finalWeightedContribution: number; runningTotal: number; isComplete: boolean };
  project: { title: string | null; score: number | null; notes: string | null } | null;
  flaggedAreas: string[];
  subjectRemark: string | null;
}
interface ReportCard {
  student: { fullName: string; username: string; admissionNo: string | null; photoUrl: string | null };
  className: string;
  term: { sessionName: string; term: string };
  weights: { ca_weight_percent: number; midterm_weight_percent: number; final_weight_percent: number };
  subjects: SubjectResult[];
  attendance: { days_present: number | null; days_total: number | null; notes: string | null } | null;
  remarks: { ht_comment: string | null; tracker_note: string | null } | null;
}

// Grade classification bands — a cosmetic, computed-on-display layer only.
// Doesn't touch stored data or the pass/fail logic used elsewhere (that's
// per-exam and driven by each exam's own passing_score); this is purely
// the term-level letter grade a formal result sheet shows per subject.
function gradeFor(pct: number) {
  if (pct >= 90) return { letter: "A+", label: "Excellent", color: "text-emerald-600 bg-emerald-50" };
  if (pct >= 80) return { letter: "A", label: "Very Good", color: "text-emerald-600 bg-emerald-50" };
  if (pct >= 70) return { letter: "B", label: "Good", color: "text-brand-teal bg-teal-50" };
  if (pct >= 60) return { letter: "C", label: "Fair", color: "text-brand-gold bg-amber-50" };
  if (pct >= 50) return { letter: "D", label: "Pass", color: "text-orange-600 bg-orange-50" };
  return { letter: "F", label: "Needs Improvement", color: "text-red-600 bg-red-50" };
}

export default function AdminReportCardsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [report, setReport] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/classes").then((r) => r.json()).then((d) => setClasses(d.classes || []));
  }, []);

  useEffect(() => {
    if (!classId) { setStudents([]); return; }
    fetch(`/api/admin/students?classId=${classId}`).then((r) => r.json()).then((d) => setStudents(d.students || []));
  }, [classId]);

  async function generate() {
    if (!studentId || !termId) { setError("Select a class, student, and term."); return; }
    setError(""); setLoading(true); setReport(null);
    const res = await fetch(`/api/teacher/students/${studentId}/report-card?termId=${termId}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Could not generate report card."); return; }
    setReport(data);
  }

  const overallTotal = report ? report.subjects.reduce((sum, s) => sum + s.examScore.runningTotal, 0) / (report.subjects.length || 1) : 0;
  const overallGrade = gradeFor(overallTotal);
  const allComplete = report ? report.subjects.every((s) => s.examScore.isComplete) : false;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2 print:hidden">
        <Award className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Report Cards</h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 max-w-2xl flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Class</label>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">Select</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm disabled:bg-slate-100">
            <option value="">Select</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <TermSelector selectedTermId={termId} onChange={(id) => setTermId(id)} />
        <button onClick={generate} disabled={loading} className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50">
          {loading ? "Generating…" : "Generate"}
        </button>
        {report && (
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity">
            <Printer className="w-4 h-4" /> Print
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mb-4 animate-shake print:hidden">{error}</p>}

      {report && (
        <div className="relative bg-white rounded-2xl shadow-lg max-w-4xl mx-auto animate-fadeIn print:shadow-none print:mx-0 overflow-hidden border-2 border-brand-gold/30 print:border-slate-300">
          <Watermark opacity={0.045} />

          {/* Ornamental top border strip — the "official document" cue */}
          <div className="h-2 bg-gradient-to-r from-brand-navy via-brand-gold to-brand-navy" />

          <div className="relative p-8 sm:p-10">
            {/* Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-brand-navy/10 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white shadow-md ring-1 ring-brand-gold/30 p-1 flex-none">
                  <Image src="/logo.png" alt="OCECS logo" width={64} height={64} className="object-contain rounded-full" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-brand-gold uppercase">Okesanjo Continuing Education &amp; Community Support</p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-brand-navy uppercase tracking-wide leading-tight">Official Term Report</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{report.className} · {report.term.term}, {report.term.sessionName}</p>
                </div>
              </div>
              <div className="w-20 h-20 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center flex-none ring-1 ring-slate-200">
                {report.student.photoUrl ? (
                  <Image src={report.student.photoUrl} alt={report.student.fullName} width={80} height={80} className="object-cover w-full h-full" />
                ) : (
                  <User className="w-7 h-7 text-slate-300" />
                )}
              </div>
            </div>

            {/* Student identity block */}
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-8">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Student</p>
                <p className="text-lg font-extrabold text-brand-navy tracking-tight">{report.student.fullName}</p>
                {report.student.admissionNo && <p className="text-xs text-slate-400 mt-0.5">Admission No. {report.student.admissionNo}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Overall Average</p>
                <p className="text-3xl font-black text-brand-navy leading-none">{Math.round(overallTotal)}%</p>
                <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${overallGrade.color}`}>
                  {overallGrade.letter} · {overallGrade.label}
                </span>
                {!allComplete && <p className="text-[10px] text-amber-500 mt-1">Provisional — not all components graded yet</p>}
              </div>
            </div>

            {/* Subject results table */}
            <div className="overflow-x-auto mb-8 rounded-lg ring-1 ring-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-brand-navy/5 text-left text-[11px] font-bold text-brand-navy uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-2 text-center">CA</th>
                    <th className="py-3 px-2 text-center">Mid-Term</th>
                    <th className="py-3 px-2 text-center">Final</th>
                    <th className="py-3 px-2 text-center">Total</th>
                    <th className="py-3 px-2 text-center">Grade</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((s, i) => {
                    const g = gradeFor(s.examScore.runningTotal);
                    return (
                      <tr
                        key={s.subjectId}
                        className={`border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards] ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                        style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{s.subjectName}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{s.examScore.caWeightedContribution}/{report.weights.ca_weight_percent}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{s.examScore.midtermWeightedContribution}/{report.weights.midterm_weight_percent}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{s.examScore.finalWeightedContribution}/{report.weights.final_weight_percent}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-brand-navy">
                          {s.examScore.runningTotal}%{!s.examScore.isComplete && <span className="block text-amber-500 text-[9px] font-normal">in progress</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${g.color}`}>{g.letter}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{s.project?.title ? `${s.project.title} (${s.project.score ?? "—"})` : "—"}</td>
                        <td className="py-2.5 px-3 text-slate-500 max-w-[180px]">
                          {s.subjectRemark || (s.flaggedAreas.length > 0 ? s.flaggedAreas.join(", ") : "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Attendance + remarks */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Attendance</p>
                {report.attendance ? (
                  <p className="text-sm text-slate-700">{report.attendance.days_present ?? "—"} / {report.attendance.days_total ?? "—"} days present</p>
                ) : (
                  <p className="text-sm text-slate-400">Not recorded</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Grade Key</p>
                <p className="text-[11px] text-slate-400">A+/A Excellent–Very Good · B Good · C Fair · D Pass · F Needs Improvement</p>
              </div>
            </div>

            <div className="mb-10">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Head Teacher's Comment</p>
              <p className="text-sm text-slate-700 mb-4 min-h-[1.5em]">{report.remarks?.ht_comment || "—"}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Tracker Note</p>
              <p className="text-sm text-slate-700 min-h-[1.5em]">{report.remarks?.tracker_note || "—"}</p>
            </div>

            {/* Signature footer — physical sign-off lines, since there's
                no e-signature system; this is the formal-document
                convention for a printed result sheet. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-6 border-t-2 border-brand-navy/10">
              <div>
                <div className="border-b border-slate-300 h-10" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Class Teacher</p>
              </div>
              <div>
                <div className="border-b border-slate-300 h-10" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Head Teacher</p>
              </div>
              <div className="hidden sm:block">
                <div className="border-b border-slate-300 h-10" />
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Date</p>
              </div>
            </div>
          </div>

          <div className="h-2 bg-gradient-to-r from-brand-navy via-brand-gold to-brand-navy" />
        </div>
      )}
    </div>
  );
}
