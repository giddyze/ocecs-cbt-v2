"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Users, Save, Plus, Calendar, MessageSquare, ListChecks, FolderKanban } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface SubjectRow { subject_id: string; subjects: { id: string; name: string } | null; }
interface ImprovementRow { subject_id: string; flags: Record<string, boolean>; }
interface ProjectRow { subject_id: string; title: string | null; score: number | null; notes: string | null; }

const GENERIC_AREA_STARTERS = ["Class Participation", "Homework Completion", "Practical Application", "Written Expression"];

export default function TeacherStudentRecordsPage() {
  return (
    <Suspense fallback={<p className="text-slate-400 text-sm">Loading…</p>}>
      <TeacherStudentRecordsContent />
    </Suspense>
  );
}

function TeacherStudentRecordsContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const termId = searchParams.get("termId") || "";

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [htComment, setHtComment] = useState("");
  const [trackerNote, setTrackerNote] = useState("");
  const [daysPresent, setDaysPresent] = useState("");
  const [daysTotal, setDaysTotal] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [improvementAreas, setImprovementAreas] = useState<Record<string, Record<string, boolean>>>({});
  const [newAreaName, setNewAreaName] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Record<string, { title: string; score: string; notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function load() {
    if (!termId) return;
    setLoading(true);
    fetch(`/api/teacher/students/${id}/records?termId=${termId}`).then((r) => r.json()).then((d) => {
      setSubjects(d.subjects || []);
      setHtComment(d.remarks?.ht_comment || "");
      setTrackerNote(d.remarks?.tracker_note || "");
      setDaysPresent(d.attendance?.days_present?.toString() || "");
      setDaysTotal(d.attendance?.days_total?.toString() || "");
      setAttendanceNotes(d.attendance?.notes || "");
      const areaMap: Record<string, Record<string, boolean>> = {};
      (d.improvementAreas || []).forEach((row: ImprovementRow) => { areaMap[row.subject_id] = row.flags || {}; });
      setImprovementAreas(areaMap);
      const projMap: Record<string, { title: string; score: string; notes: string }> = {};
      (d.projects || []).forEach((row: ProjectRow) => {
        projMap[row.subject_id] = { title: row.title || "", score: row.score?.toString() || "", notes: row.notes || "" };
      });
      setProjects(projMap);
    }).finally(() => setLoading(false));
  }
  useEffect(load, [id, termId]);

  async function saveSection(key: string, body: object) {
    setSaving(key);
    await fetch(`/api/teacher/students/${id}/records`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId, ...body })
    });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  }

  function toggleArea(subjectId: string, area: string) {
    setImprovementAreas((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [area]: !prev[subjectId]?.[area] }
    }));
  }

  if (!termId) return <p className="text-red-600">No term selected — go back and pick a term first.</p>;

  return (
    <div>
      <Breadcrumb items={[{ label: "Students", href: "/teacher/students" }, { label: "Records" }]} />
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-brand-coral" />
        <h1 className="text-2xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Student Records</h1>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && (
        <div className="space-y-4">
          {/* Attendance */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-brand-navy mb-3 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-brand-teal" /> Attendance</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Days present</label>
                <input type="number" min={0} value={daysPresent} onChange={(e) => setDaysPresent(e.target.value)} className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Days total</label>
                <input type="number" min={0} value={daysTotal} onChange={(e) => setDaysTotal(e.target.value)} className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-slate-500 mb-1">Notes</label>
                <input value={attendanceNotes} onChange={(e) => setAttendanceNotes(e.target.value)} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button
                onClick={() => saveSection("attendance", { attendance: { daysPresent: daysPresent ? Number(daysPresent) : null, daysTotal: daysTotal ? Number(daysTotal) : null, notes: attendanceNotes } })}
                disabled={saving === "attendance"}
                className="bg-brand-teal text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> {saving === "attendance" ? "Saving…" : saved === "attendance" ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-brand-navy mb-3 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-brand-coral" /> Remarks</p>
            <label className="block text-xs text-slate-500 mb-1">Head Teacher comment</label>
            <textarea value={htComment} onChange={(e) => setHtComment(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
            <label className="block text-xs text-slate-500 mb-1">General tracker note</label>
            <textarea value={trackerNote} onChange={(e) => setTrackerNote(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3" />
            <button
              onClick={() => saveSection("remarks", { remarks: { htComment, trackerNote } })}
              disabled={saving === "remarks"}
              className="bg-brand-navy text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> {saving === "remarks" ? "Saving…" : saved === "remarks" ? "Saved" : "Save"}
            </button>
          </div>

          {/* Per-subject: improvement areas + project */}
          {subjects.map((s) => {
            const subjectId = s.subject_id;
            const subjectName = s.subjects?.name || "Subject";
            const areas = improvementAreas[subjectId] || {};
            const allAreaKeys = Array.from(new Set([...GENERIC_AREA_STARTERS, ...Object.keys(areas)]));
            const proj = projects[subjectId] || { title: "", score: "", notes: "" };

            return (
              <div key={subjectId} className="bg-white rounded-xl shadow-sm p-5">
                <p className="text-sm font-semibold text-brand-navy mb-3">{subjectName}</p>

                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2"><ListChecks className="w-3.5 h-3.5" /> Areas for improvement</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {allAreaKeys.map((area) => (
                      <button
                        key={area}
                        onClick={() => toggleArea(subjectId, area)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          areas[area] ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-500"
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={newAreaName[subjectId] || ""}
                      onChange={(e) => setNewAreaName((prev) => ({ ...prev, [subjectId]: e.target.value }))}
                      placeholder="Add a custom area…"
                      className="border border-slate-300 rounded-lg px-2 py-1 text-xs flex-1 max-w-[200px]"
                    />
                    <button
                      onClick={() => {
                        const name = newAreaName[subjectId]?.trim();
                        if (!name) return;
                        toggleArea(subjectId, name);
                        setNewAreaName((prev) => ({ ...prev, [subjectId]: "" }));
                      }}
                      className="text-brand-teal text-xs font-semibold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                    <button
                      onClick={() => saveSection(`area-${subjectId}`, { improvementArea: { subjectId, flags: areas } })}
                      disabled={saving === `area-${subjectId}`}
                      className="ml-auto bg-brand-teal text-white rounded-lg px-3 py-1 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving === `area-${subjectId}` ? "Saving…" : saved === `area-${subjectId}` ? "Saved" : "Save Areas"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-2"><FolderKanban className="w-3.5 h-3.5" /> Project</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      placeholder="Title"
                      value={proj.title}
                      onChange={(e) => setProjects((prev) => ({ ...prev, [subjectId]: { ...proj, title: e.target.value } }))}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]"
                    />
                    <input
                      type="number" min={0} max={100} placeholder="Score"
                      value={proj.score}
                      onChange={(e) => setProjects((prev) => ({ ...prev, [subjectId]: { ...proj, score: e.target.value } }))}
                      className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <input
                      placeholder="Notes"
                      value={proj.notes}
                      onChange={(e) => setProjects((prev) => ({ ...prev, [subjectId]: { ...proj, notes: e.target.value } }))}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]"
                    />
                    <button
                      onClick={() => saveSection(`project-${subjectId}`, { project: { subjectId, title: proj.title, score: proj.score ? Number(proj.score) : null, notes: proj.notes } })}
                      disabled={saving === `project-${subjectId}`}
                      className="bg-brand-navy text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50"
                    >
                      {saving === `project-${subjectId}` ? "Saving…" : saved === `project-${subjectId}` ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
