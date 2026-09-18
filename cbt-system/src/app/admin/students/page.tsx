"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GraduationCap, Plus, KeyRound, AlertCircle, Camera, User } from "lucide-react";

interface ClassRow { id: string; name: string; }
interface StudentRow {
  id: string;
  username: string;
  full_name: string;
  admission_no: string | null;
  photo_url: string | null;
  class_id: string;
  active: boolean;
  classes: { name: string } | null;
}

export default function AdminStudentsPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [classId, setClassId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPin, setNewPin] = useState<{ username: string; pin: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function loadStudents(cid?: string) {
    setLoading(true);
    setLoadError("");
    const url = cid ? `/api/admin/students?classId=${cid}` : "/api/admin/students";
    fetch(url)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) {
          setLoadError(d.error || "Could not load students.");
          setStudents([]);
          return;
        }
        setStudents(d.students || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetch("/api/public/classes").then((r) => r.json()).then((d) => setClasses(d.classes || []));
    loadStudents();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, fullName, classId, admissionNo })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not create student."); return; }
    setNewPin({ username, pin: data.pin });
    setUsername(""); setFullName(""); setClassId(""); setAdmissionNo("");
    setShowForm(false);
    loadStudents(filterClass || undefined);
  }

  async function resetPin(studentId: string, uname: string) {
    const res = await fetch(`/api/admin/students/${studentId}/reset-pin`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setNewPin({ username: uname, pin: data.pin });
  }

  async function uploadPhoto(studentId: string, file: File) {
    setUploadingId(studentId);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/admin/students/${studentId}/photo`, { method: "POST", body: formData });
    setUploadingId(null);
    loadStudents(filterClass || undefined);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-brand-coral" /> Students
          </h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-1.5 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus className={`w-4 h-4 ${!loading && students.length === 0 && !showForm ? "animate-dangle" : ""}`} /> {showForm ? "Cancel" : "Add Student"}
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-2.5 animate-slideDown">
          <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-none mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-medium">Couldn't load the student list.</p>
            <p className="text-xs text-red-600 mt-0.5">{loadError}</p>
          </div>
        </div>
      )}

      {newPin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex justify-between items-center animate-slideDown">
          <p className="text-sm text-amber-800">
            PIN for <strong>{newPin.username}</strong>: <span className="font-mono text-lg">{newPin.pin}</span> — write this down now, it won&apos;t be shown again.
          </p>
          <button onClick={() => setNewPin(null)} className="text-amber-600 text-sm">Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 max-w-md space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admission number (optional)</label>
            <input value={admissionNo} onChange={(e) => setAdmissionNo(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="">Select a class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-slate-400">A photo can be added after creation, from the student's row below.</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50">
            {saving ? "Creating…" : "Create Student (generates PIN)"}
          </button>
        </form>
      )}

      <div className="mb-4">
        <select
          value={filterClass}
          onChange={(e) => { setFilterClass(e.target.value); loadStudents(e.target.value || undefined); }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Admission No.</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && students.length === 0 && (
              <tr className="animate-fadeIn"><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No students yet.</td></tr>
            )}
            {students.map((s, i) => (
              <tr
                key={s.id}
                className="border-t border-slate-100 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => fileInputs.current[s.id]?.click()}
                    disabled={uploadingId === s.id}
                    title="Upload photo"
                    className="relative w-9 h-9 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-brand-teal transition-all disabled:opacity-50"
                  >
                    {s.photo_url ? (
                      <Image src={s.photo_url} alt={s.full_name} width={36} height={36} className="object-cover w-full h-full" />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="absolute bottom-0 right-0 bg-brand-teal rounded-full p-0.5">
                      <Camera className="w-2.5 h-2.5 text-white" />
                    </span>
                  </button>
                  <input
                    ref={(el) => { fileInputs.current[s.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(s.id, f); }}
                  />
                </td>
                <td className="px-4 py-3">{s.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{s.admission_no || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.username}</td>
                <td className="px-4 py-3">{s.classes?.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${s.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => resetPin(s.id, s.username)} className="flex items-center gap-1 text-brand-teal text-xs font-semibold hover:underline">
                    <KeyRound className="w-3 h-3 animate-dangle" /> Reset PIN
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
