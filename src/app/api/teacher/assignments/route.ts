import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

export async function GET(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const termId = req.nextUrl.searchParams.get("termId");

  const supabase = createAdminSupabase();
  let query = supabase
    .from("assignments")
    .select("*, classes(name), subjects(name)")
    .order("created_at", { ascending: false });
  if (staff.role !== "admin") query = query.eq("teacher_id", staff.id);
  if (termId) query = query.eq("term_id", termId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data });
}

export async function POST(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { classId, subjectId, title, instructions, dueDate } = await req.json();
  if (!classId || !subjectId || !title) {
    return NextResponse.json({ error: "Class, subject, and title are required." }, { status: 400 });
  }

  if (staff.role !== "admin") {
    const supabaseCheck = createAdminSupabase();
    const { data: assignment } = await supabaseCheck
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("teacher_id", staff.id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (!assignment) {
      return NextResponse.json({ error: "You are not assigned to this class/subject." }, { status: 403 });
    }
  }

  const supabase = createAdminSupabase();

  // Assignments link to the current term too (for term-based filtering),
  // but unlike exams there is no cap — assignments are formative/practice
  // work, and a teacher can create as many as they need.
  const { data: currentTerm } = await supabase
    .from("academic_terms")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (!currentTerm) {
    return NextResponse.json({ error: "No current term is set. Ask an admin to set one under Terms." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      teacher_id: staff.id,
      class_id: classId,
      subject_id: subjectId,
      term_id: currentTerm.id,
      title,
      instructions: instructions || "",
      due_date: dueDate || null,
      status: "draft"
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignmentId: data.id });
}
