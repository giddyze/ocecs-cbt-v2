import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";
import { computeTermScore, TermExamRow, TermAttemptRow } from "@/lib/scoring/termScore";

export async function GET(req: NextRequest) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();

  let termId = req.nextUrl.searchParams.get("termId");
  const { data: currentTerm } = await supabase.from("academic_terms").select("*").eq("is_current", true).maybeSingle();
  if (!termId) termId = currentTerm?.id || null;
  if (!termId) return NextResponse.json({ error: "No term available." }, { status: 400 });

  const { data: term } = await supabase.from("academic_terms").select("*").eq("id", termId).maybeSingle();
  if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });

  const { data: classSubjects } = await supabase
    .from("class_subjects")
    .select("subject_id, subjects(id, name)")
    .eq("class_id", student.classId);

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, module_type, num_questions, subject_id")
    .eq("class_id", student.classId)
    .eq("term_id", termId);

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("exam_id, status, score")
    .eq("student_id", student.studentId);

  const weights = {
    ca_weight_percent: term.ca_weight_percent,
    midterm_weight_percent: term.midterm_weight_percent,
    final_weight_percent: term.final_weight_percent
  };

  const subjects = (classSubjects || []).map((cs) => {
    const subjectRow = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects;
    const examsForSubject: TermExamRow[] = (exams || []).filter((e) => e.subject_id === cs.subject_id);
    const result = computeTermScore(examsForSubject, (attempts || []) as TermAttemptRow[], weights);
    return {
      subjectId: cs.subject_id,
      subjectName: subjectRow?.name || "Untitled Subject",
      ...result
    };
  });

  return NextResponse.json({
    term: { id: term.id, sessionName: term.session_name, term: term.term, isCurrent: term.is_current },
    weights,
    subjects: subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName))
  });
}
