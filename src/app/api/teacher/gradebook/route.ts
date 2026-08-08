import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import { computeTermScore, TermExamRow, TermAttemptRow } from "@/lib/scoring/termScore";

export async function GET(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("classId");
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  let termId = req.nextUrl.searchParams.get("termId");
  if (!classId || !subjectId) {
    return NextResponse.json({ error: "classId and subjectId are required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  // Teachers may only view the gradebook for class+subject combinations
  // they're actually assigned to — same ownership model used everywhere
  // else in this app. Admins can view any combination.
  if (staff.role !== "admin") {
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("teacher_id", staff.id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: "Not assigned to this class/subject." }, { status: 403 });
  }

  const { data: currentTerm } = await supabase.from("academic_terms").select("*").eq("is_current", true).maybeSingle();
  if (!termId) termId = currentTerm?.id || null;
  if (!termId) return NextResponse.json({ error: "No term available." }, { status: 400 });

  const { data: term } = await supabase.from("academic_terms").select("*").eq("id", termId).maybeSingle();
  if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, username")
    .eq("class_id", classId)
    .order("full_name");

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, module_type, num_questions")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .eq("term_id", termId);

  const examIds = (exams || []).map((e) => e.id);
  const { data: allAttempts } = examIds.length
    ? await supabase.from("exam_attempts").select("exam_id, student_id, status, score").in("exam_id", examIds)
    : { data: [] };

  const weights = {
    ca_weight_percent: term.ca_weight_percent,
    midterm_weight_percent: term.midterm_weight_percent,
    final_weight_percent: term.final_weight_percent
  };

  const rows = (students || []).map((s) => {
    const studentAttempts: TermAttemptRow[] = (allAttempts || [])
      .filter((a) => a.student_id === s.id)
      .map((a) => ({ exam_id: a.exam_id, status: a.status, score: a.score }));
    const result = computeTermScore((exams || []) as TermExamRow[], studentAttempts, weights);
    return { studentId: s.id, fullName: s.full_name, username: s.username, ...result };
  });

  return NextResponse.json({
    term: { id: term.id, sessionName: term.session_name, term: term.term, isCurrent: term.is_current },
    weights,
    exams: exams || [],
    students: rows
  });
}
