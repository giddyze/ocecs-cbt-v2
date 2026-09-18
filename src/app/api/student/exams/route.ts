import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

// Published exams for the student's class, grouped by subject so the
// dashboard can show "what's available / done" per subject rather than
// one flat list. Every subject assigned to the class appears, even if it
// currently has zero published exams — that's a legitimate empty state,
// not an error, and the dashboard should say so rather than hide the subject.
// Defaults to the current term; ?termId= lets the student look back at a
// past term, read-only (the frontend disables actions when viewing one).
export async function GET(req: NextRequest) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();

  let termId = req.nextUrl.searchParams.get("termId");
  if (!termId) {
    const { data: currentTerm } = await supabase.from("academic_terms").select("id").eq("is_current", true).maybeSingle();
    termId = currentTerm?.id || null;
  }

  const { data: classSubjects, error: subjectsError } = await supabase
    .from("class_subjects")
    .select("subject_id, subjects(id, name)")
    .eq("class_id", student.classId);

  if (subjectsError) return NextResponse.json({ error: subjectsError.message }, { status: 500 });

  let examsQuery = supabase
    .from("exams")
    .select("id, title, module_type, duration_minutes, num_questions, subject_id")
    .eq("class_id", student.classId)
    .eq("status", "published")
    .order("scheduled_date", { ascending: true });
  if (termId) examsQuery = examsQuery.eq("term_id", termId);

  const { data: exams, error } = await examsQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("exam_id, status, score")
    .eq("student_id", student.studentId);

  const attemptByExam = new Map((attempts || []).map((a) => [a.exam_id, a]));

  const examsWithStatus = (exams || []).map((e) => ({
    id: e.id,
    title: e.title,
    module_type: e.module_type,
    duration_minutes: e.duration_minutes,
    num_questions: e.num_questions,
    subjectId: e.subject_id,
    attemptStatus: attemptByExam.get(e.id)?.status || "not_started",
    score: attemptByExam.get(e.id)?.score ?? null
  }));

  const subjects = (classSubjects || [])
    .map((cs) => {
      const subjectRow = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects;
      return {
        subjectId: cs.subject_id,
        subjectName: subjectRow?.name || "Untitled Subject",
        exams: examsWithStatus.filter((e) => e.subjectId === cs.subject_id)
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const { data: currentTermRow } = await supabase.from("academic_terms").select("id").eq("is_current", true).maybeSingle();

  return NextResponse.json({ subjects, termId, isCurrentTerm: termId === currentTermRow?.id });
}
