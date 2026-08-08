"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus, KeyRound, Power, ChevronDown, ChevronUp, Trash2, Link2,
  Crown, ShieldCheck, ArrowUpCircle, ArrowDownCircle, AlertCircle, Camera, User
} from "lucide-react";

interface Teacher {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "teacher";
  active: boolean;
  staff_pin: string | null;
  is_main_admin: boolean;
  password_reset_requested_at: string | null;
  photo_url: string | null;
  created_at: string;
}
interface ClassRow { id: string; name: string; }
interface SubjectRow { id: string; name: string; }
interface AssignmentRow {
  class_id: string;
  subject_id: string;
  classes: { name: string } | null;
  subjects: { name: string } | null;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pinReveal, setPinReveal] = useState<{ id: string; pin: string; label: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [roleActionError, setRoleActionError] = useState<{ id: string; message: string } | null>(null);

  const [staffLoadError, setStaffLoadError] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function loadStaff() {
    setLoading(true);
    setStaffLoadError("");
    fetch("/api/admin/teachers")
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) {
          setStaffLoadError(d.error || "Could not load staff.");
          setStaff([]);
          return;
        }
        setStaff(d.teachers || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadStaff, []);

  async function uploadPhoto(staffId: string, file: File) {
    setUploadingId(staffId);
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/admin/teachers/${staffId}/photo`, { method: "POST", body: formData });
    setUploadingId(null);
    loadStaff();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, tempPassword, role })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not create account."); return; }
    setFullName(""); setEmail(""); setTempPassword(""); setRole("teacher");
    setShowForm(false);
    loadStaff();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/teachers/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active })
    });
    loadStaff();
  }

  async function regeneratePin(id: string) {
    const res = await fetch(`/api/admin/teachers/${id}/pin`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setPinReveal({ id, pin: data.pin, label: "Reference PIN" });
    loadStaff();
  }

  async function changeRole(id: string, newRole: "admin" | "teacher") {
    setRoleActionError(null);
    const res = await fetch(`/api/admin/teachers/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole })
    });
    const data = await res.json();
    if (!res.ok) {
      setRoleActionError({ id, message: data.error || "Could not change role." });
      return;
    }
    loadStaff();
  }

  async function resolvePasswordReset(id: string) {
    const res = await fetch(`/api/admin/teachers/${id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setPinReveal({ id, pin: data.password, label: "New password" });
    loadStaff();
  }

  const pendingResetCount = staff.filter((s) => s.password_reset_requested_at).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Staff</h1>
          <div className="w-10 h-1 bg-brand-teal rounded-full mt-2 mb-2" />
          <p className="text-sm text-slate-500">Admins and teachers who can sign in to this platform.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className={`flex items-center gap-1.5 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity ${
            !loading && staff.length === 0 && !showForm ? "animate-dangle" : ""
          }`}
        >
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Staff Member"}
        </button>
      </div>

      {staffLoadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-2.5 animate-slideDown">
          <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-none mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-medium">Couldn't load the staff list.</p>
            <p className="text-xs text-red-600 mt-0.5">{staffLoadError}</p>
            <p className="text-xs text-red-500 mt-1">
              If this mentions a missing column, a database migration needs to be run before this page will work.
            </p>
          </div>
        </div>
      )}

      {pendingResetCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-2.5 animate-slideDown">
          <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-none" />
          <p className="text-sm text-amber-800">
            {pendingResetCount} password reset request{pendingResetCount === 1 ? "" : "s"} waiting below — look for the amber badge.
          </p>
        </div>
      )}

      {pinReveal && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex justify-between items-center animate-slideDown">
          <p className="text-sm text-amber-800">
            {pinReveal.label}: <span className="font-mono text-lg">{pinReveal.pin}</span>
            <span className="text-xs text-amber-600 ml-2 block sm:inline">
              Write this down now — it won&apos;t be shown again. Share it with the staff member directly; there is no automatic email.
            </span>
          </p>
          <button onClick={() => setPinReveal(null)} className="text-amber-600 text-sm flex-none ml-3">Dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 max-w-md space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 flex-1 cursor-pointer has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5 transition-colors">
                <input type="radio" name="role" checked={role === "teacher"} onChange={() => setRole("teacher")} />
                Teacher
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 flex-1 cursor-pointer has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5 transition-colors">
                <input type="radio" name="role" checked={role === "admin"} onChange={() => setRole("admin")} />
                Admin
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Temporary password</label>
            <input required value={tempPassword} onChange={(e) => setTempPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            <p className="text-xs text-slate-400 mt-1">Share this with them — they can change it after signing in.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50">
            {saving ? "Creating…" : `Create ${role === "admin" ? "Admin" : "Teacher"}`}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>}
            {!loading && staff.length === 0 && (
              <tr className="animate-fadeIn"><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No staff yet.</td></tr>
            )}
            {staff.map((s, i) => (
              <>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {s.full_name}
                      {s.is_main_admin && (
                        <span title="Main admin — cannot be demoted or removed by anyone, including themselves">
                          <Crown className="w-3.5 h-3.5 text-brand-gold" />
                        </span>
                      )}
                      {s.password_reset_requested_at && (
                        <span
                          title="Password reset requested"
                          className="flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full"
                        >
                          <AlertCircle className="w-2.5 h-2.5" /> reset requested
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                        s.role === "admin" ? "bg-brand-navy/10 text-brand-navy" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {s.role === "admin" ? "Admin" : "Teacher"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${s.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {s.password_reset_requested_at && (
                        <button
                          onClick={() => resolvePasswordReset(s.id)}
                          title="Generate and reveal a new password"
                          className="text-amber-600 hover:text-amber-800"
                        >
                          <KeyRound className="w-4 h-4 animate-dangle" />
                        </button>
                      )}
                      {s.role === "teacher" && !s.password_reset_requested_at && (
                        <button onClick={() => regeneratePin(s.id)} title="Regenerate reference PIN" className="text-brand-teal hover:text-brand-navy">
                          <KeyRound className="w-4 h-4 animate-dangle" />
                        </button>
                      )}
                      {s.role === "teacher" ? (
                        <button onClick={() => changeRole(s.id, "admin")} title="Promote to admin" className="text-brand-navy hover:opacity-70">
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                      ) : !s.is_main_admin ? (
                        <button onClick={() => changeRole(s.id, "teacher")} title="Demote to teacher" className="text-amber-600 hover:opacity-70">
                          <ArrowDownCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <span title="The main admin cannot be demoted" className="text-slate-300">
                          <ArrowDownCircle className="w-4 h-4" />
                        </span>
                      )}
                      <button onClick={() => toggleActive(s.id, !s.active)} title={s.active ? "Suspend" : "Activate"} className={s.active ? "text-amber-600 hover:text-amber-800" : "text-emerald-600 hover:text-emerald-800"}>
                        <Power className="w-4 h-4" />
                      </button>
                      {s.role === "teacher" && (
                        <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} title="Manage class/subject assignments" className="text-slate-500 hover:text-brand-navy flex items-center gap-1">
                          <Link2 className="w-4 h-4" />
                          {expandedId === s.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {roleActionError?.id === s.id && (
                  <tr>
                    <td colSpan={6} className="bg-red-50 px-4 py-2 text-xs text-red-600">{roleActionError.message}</td>
                  </tr>
                )}
                {expandedId === s.id && s.role === "teacher" && (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-4">
                      <TeacherAssignmentsEditor teacherId={s.id} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

function TeacherAssignmentsEditor({ teacherId }: { teacherId: string }) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/admin/teachers/${teacherId}/assignments`).then((r) => r.json()).then((d) => setAssignments(d.assignments || [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    fetch("/api/public/classes").then((r) => r.json()).then((d) => setClasses(d.classes || []));
  }, [teacherId]);

  useEffect(() => {
    if (!classId) { setSubjects([]); return; }
    fetch(`/api/public/subjects?classId=${classId}`).then((r) => r.json()).then((d) => setSubjects(d.subjects || []));
  }, [classId]);

  async function addAssignment() {
    if (!classId || !subjectId) return;
    setSaving(true);
    await fetch(`/api/admin/teachers/${teacherId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, subjectId })
    });
    setSaving(false);
    setClassId(""); setSubjectId("");
    load();
  }

  async function removeAssignment(cId: string, sId: string) {
    await fetch(`/api/admin/teachers/${teacherId}/assignments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: cId, subjectId: sId })
    });
    load();
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Assigned classes &amp; subjects</p>
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-slate-400 mb-3">No class/subject assignments yet — this teacher can't create exams or assignments until assigned below.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {assignments.map((a) => (
            <span key={`${a.class_id}-${a.subject_id}`} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 text-xs">
              {a.classes?.name} · {a.subjects?.name}
              <button onClick={() => removeAssignment(a.class_id, a.subject_id)} className="text-slate-400 hover:text-red-600 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(""); }} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">Select</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!classId} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-100">
            <option value="">{classId ? "Select" : "Class first"}</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={addAssignment} disabled={!classId || !subjectId || saving} className="bg-brand-navy text-white rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
          {saving ? "Adding…" : "+ Assign"}
        </button>
      </div>
    </div>
  );
}
