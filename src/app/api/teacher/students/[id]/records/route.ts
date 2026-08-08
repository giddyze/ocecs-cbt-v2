import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// A teacher can view/edit a student's records if they're assigned to the
// student's class for at least one subject (remarks/attendance are
// class-wide, not subject-specific). Admins always pass.
async function canAccessStudent(studentClassId: string, staffId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from("teacher_assignments")
    .select("teacher_id")
    .eq("teacher_id", staffId)
    .eq("class_id", studentClassId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const termId = req.nextUrl.searchParams.get("termId");
  if (!termId) return NextResponse.json({ error: "termId is required." }, { status: 400 });

  const supabase = createAdminSupabase();
  const { data: student } = await supabase.from("students").select("id, class_id").eq("id", params.id).maybeSingle();
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  if (!(await canAccessStudent(student.class_id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const [{ data: remarks }, { data: attendance }, { data: improvementAreas }, { data: projects }, { data: subjects }] =
    await Promise.all([
      supabase.from("remarks").select("*").eq("student_id", params.id).eq("term_id", termId).maybeSingle(),
      supabase.from("attendance").select("*").eq("student_id", params.id).eq("term_id", termId).maybeSingle(),
      supabase.from("improvement_areas").select("*").eq("student_id", params.id).eq("term_id", termId),
      supabase.from("projects").select("*").eq("student_id", params.id).eq("term_id", termId),
      supabase.from("class_subjects").select("subject_id, subjects(id, name)").eq("class_id", student.class_id)
    ]);

  return NextResponse.json({
    remarks: remarks || null,
    attendance: attendance || null,
    improvementAreas: improvementAreas || [],
    projects: projects || [],
    subjects: subjects || []
  });
}

// Body: { termId, remarks？: {htComment, trackerNote}, attendance?: {daysPresent, daysTotal, notes},
//         improvementArea?: {subjectId, flags}, project?: {subjectId, title, score, notes} }
// Each section is optional and independent — saving one doesn't require the others.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: student } = await supabase.from("students").select("id, class_id").eq("id", params.id).maybeSingle();
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  if (!(await canAccessStudent(student.class_id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await req.json();
  const { termId, remarks, attendance, improvementArea, project } = body;
  if (!termId) return NextResponse.json({ error: "termId is required." }, { status: 400 });

  if (remarks) {
    const { error } = await supabase.from("remarks").upsert(
      { student_id: params.id, term_id: termId, ht_comment: remarks.htComment ?? null, tracker_note: remarks.trackerNote ?? null, updated_at: new Date().toISOString() },
      { onConflict: "student_id,term_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (attendance) {
    const { error } = await supabase.from("attendance").upsert(
      { student_id: params.id, term_id: termId, days_present: attendance.daysPresent ?? null, days_total: attendance.daysTotal ?? null, notes: attendance.notes ?? null, updated_at: new Date().toISOString() },
      { onConflict: "student_id,term_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (improvementArea) {
    const { error } = await supabase.from("improvement_areas").upsert(
      { student_id: params.id, term_id: termId, subject_id: improvementArea.subjectId, flags: improvementArea.flags ?? {}, updated_at: new Date().toISOString() },
      { onConflict: "student_id,subject_id,term_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (project) {
    const { error } = await supabase.from("projects").upsert(
      { student_id: params.id, term_id: termId, subject_id: project.subjectId, title: project.title ?? null, score: project.score ?? null, notes: project.notes ?? null, updated_at: new Date().toISOString() },
      { onConflict: "student_id,subject_id,term_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
