"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Award, User, Printer } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface ClassRow { id: string; name: string; }
interface StudentRow { id: string; full_name: string; }
interface SubjectResult {
  subjectId: string;
  subjectName: string;
  examScore: { caWeightedContribution: number; midtermWeightedContribution: number; finalWeightedContribution: number; runningTotal: number; isComplete: boolean };
  project: { title: string | null; score: number | null; notes: string | null } | null;
  flaggedAreas: string[];
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
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-3xl animate-fadeIn print:shadow-none print:border-0">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">OCECS Report Card</p>
              <h2 className="text-xl font-extrabold text-brand-navy uppercase tracking-wide">{report.student.fullName}</h2>
              <p className="text-sm text-slate-500">{report.className} · {report.term.term}, {report.term.sessionName}</p>
              {report.student.admissionNo && <p className="text-xs text-slate-400">Admission No: {report.student.admissionNo}</p>}
            </div>
            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center flex-none">
              {report.student.photoUrl ? (
                <Image src={report.student.photoUrl} alt={report.student.fullName} width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                <User className="w-6 h-6 text-slate-400" />
              )}
            </div>
          </div>

          <div className="overflow-x-auto"><table className="w-full text-sm mb-6">
            <thead className="text-left text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2">Subject</th>
                <th className="py-2 text-center">CA</th>
                <th className="py-2 text-center">Mid-Term</th>
                <th className="py-2 text-center">Final</th>
                <th className="py-2 text-center">Total</th>
                <th className="py-2">Project</th>
                <th className="py-2">Areas to Improve</th>
              </tr>
            </thead>
            <tbody>
              {report.subjects.map((s) => (
                <tr key={s.subjectId} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{s.subjectName}</td>
                  <td className="py-2 text-center text-slate-500">{s.examScore.caWeightedContribution}/{report.weights.ca_weight_percent}</td>
                  <td className="py-2 text-center text-slate-500">{s.examScore.midtermWeightedContribution}/{report.weights.midterm_weight_percent}</td>
                  <td className="py-2 text-center text-slate-500">{s.examScore.finalWeightedContribution}/{report.weights.final_weight_percent}</td>
                  <td className="py-2 text-center font-bold text-brand-navy">
                    {s.examScore.runningTotal}% {!s.examScore.isComplete && <span className="text-amber-500 text-[10px]">(in progress)</span>}
                  </td>
                  <td className="py-2 text-slate-500">{s.project?.title ? `${s.project.title} (${s.project.score ?? "—"})` : "—"}</td>
                  <td className="py-2 text-slate-500">{s.flaggedAreas.length > 0 ? s.flaggedAreas.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Attendance</p>
              {report.attendance ? (
                <p className="text-sm text-slate-700">{report.attendance.days_present ?? "—"} / {report.attendance.days_total ?? "—"} days</p>
              ) : (
                <p className="text-sm text-slate-400">Not recorded</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Overall Average</p>
              <p className="text-2xl font-black text-brand-navy">{Math.round(overallTotal)}%</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Head Teacher's Comment</p>
            <p className="text-sm text-slate-700 mb-3">{report.remarks?.ht_comment || "—"}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tracker Note</p>
            <p className="text-sm text-slate-700">{report.remarks?.tracker_note || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
