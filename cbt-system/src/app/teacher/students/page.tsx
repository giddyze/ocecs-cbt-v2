"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Users, User } from "lucide-react";
import TermSelector from "@/components/TermSelector";

interface Combo { class_id: string; subject_id: string; classes: { name: string } | null; }
interface StudentRow { id: string; full_name: string; username: string; admission_no: string | null; photo_url: string | null; }

export default function TeacherStudentsPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/my-classes").then((r) => r.json()).then((d) => {
      const combos: Combo[] = d.combos || [];
      const uniqueClasses = Array.from(
        new Map(combos.map((c) => [c.class_id, { id: c.class_id, name: c.classes?.name || "" }])).values()
      );
      setClasses(uniqueClasses);
      if (uniqueClasses.length > 0) setClassId(uniqueClasses[0].id);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    fetch(`/api/teacher/students?classId=${classId}`).then((r) => r.json()).then((d) => setStudents(d.students || [])).finally(() => setLoading(false));
  }, [classId]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-7 h-7 text-brand-coral" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Students</h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Attendance, remarks, improvement areas, and projects — everything the CBT doesn't auto-grade.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-2">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
          {classes.length === 0 && <option value="">No classes assigned</option>}
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <TermSelector selectedTermId={termId} onChange={(id) => setTermId(id)} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-4">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr><th className="px-4 py-3"></th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Admission No.</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && students.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No students in this class.</td></tr>
            )}
            {students.map((s, i) => (
              <tr
                key={s.id}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                onClick={() => termId && router.push(`/teacher/students/${s.id}?termId=${termId}`)}
              >
                <td className="px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                    {s.photo_url ? <Image src={s.photo_url} alt={s.full_name} width={32} height={32} className="object-cover w-full h-full" /> : <User className="w-4 h-4 text-slate-400" />}
                  </div>
                </td>
                <td className="px-4 py-3">{s.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{s.admission_no || "—"}</td>
                <td className="px-4 py-3 text-right text-brand-teal text-xs font-semibold">Edit records →</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
