import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// Teachers see only their own exams; admins see all (used by the monitor screen).
// Optional ?termId= filters to a specific term — the UI defaults to the
// current term and lets the user pick past ones to view read-only.
export async function GET(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const termId = req.nextUrl.searchParams.get("termId");

  const supabase = createAdminSupabase();
  let query = supabase
    .from("exams")
    .select("*, classes(name), subjects(name)")
    .order("created_at", { ascending: false });

  if (staff.role !== "admin") query = query.eq("teacher_id", staff.id);
  if (termId) query = query.eq("term_id", termId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ exams: data });
}

export async function POST(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await req.json();
  const {
    moduleType, classId, subjectId, title, instructions,
    durationMinutes, numQuestions, passingScore, randomizeQuestions, scheduledDate, dueDate
  } = body;

  if (!moduleType || !classId || !subjectId || !title || !durationMinutes || !numQuestions) {
    return NextResponse.json({ error: "Missing required exam fields." }, { status: 400 });
  }

  // Teachers may only create exams for classes/subjects they're assigned to.
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

  // Every exam belongs to whichever term is currently active — there is no
  // way to create an exam for a past or future term directly; the term
  // only changes when the current term itself changes.
  const { data: currentTerm } = await supabase
    .from("academic_terms")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();
  if (!currentTerm) {
    return NextResponse.json({ error: "No current term is set. Ask an admin to set one under Terms." }, { status: 400 });
  }

  // Enforce caps: at most 3 Continuous Assessments, 1 Mid-Term, 1 Final
  // Exam per class+subject+term. Checked here, not just in the UI, since
  // the UI can't be trusted to be the only way this endpoint is called.
  const CAPS: Record<string, number> = { CA: 3, MIDTERM: 1, FINAL: 1 };
  const cap = CAPS[moduleType];
  if (cap === undefined) {
    return NextResponse.json({ error: "Unknown exam type." }, { status: 400 });
  }
  const { count: existingCount } = await supabase
    .from("exams")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("term_id", currentTerm.id)
    .eq("module_type", moduleType);

  if ((existingCount ?? 0) >= cap) {
    const label = moduleType === "CA" ? "Continuous Assessments" : moduleType === "MIDTERM" ? "a Mid-Term" : "a Final Exam";
    return NextResponse.json(
      { error: `This class/subject already has the maximum of ${cap} ${label} for the current term.` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({
      module_type: moduleType,
      teacher_id: staff.id,
      class_id: classId,
      subject_id: subjectId,
      term_id: currentTerm.id,
      title,
      instructions: instructions || "",
      duration_minutes: durationMinutes,
      num_questions: numQuestions,
      passing_score: passingScore ?? 50,
      randomize_questions: randomizeQuestions ?? true,
      scheduled_date: scheduledDate || null,
      due_date: dueDate || null,
      status: "draft"
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ examId: data.id });
}
