import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import { computeTermScore, TermExamRow, TermAttemptRow } from "@/lib/scoring/termScore";

// Determines which class a student was actually in during a given term —
// not just their current class, which may have changed since via
// promotion. Looks for the most recent promotion landing them in a class
// at or before that term; falls back to their current class if none exists
// (covers students who haven't been promoted since being created).
async function resolveClassForTerm(supabase: ReturnType<typeof createAdminSupabase>, studentId: string, termId: string, currentClassId: string) {
  const { data: promotion } = await supabase
    .from("promotions")
    .select("to_class_id")
    .eq("student_id", studentId)
    .eq("to_term_id", termId)
    .order("promoted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return promotion?.to_class_id || currentClassId;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const termId = req.nextUrl.searchParams.get("termId");
  if (!termId) return NextResponse.json({ error: "termId is required." }, { status: 400 });

  const supabase = createAdminSupabase();

  // Report cards (and their print action) are admin-only — teachers can
  // see scores via the gradebook, but generating/printing the formal
  // report card document is restricted.
  if (staff.role !== "admin") {
    return NextResponse.json({ error: "Only admins can generate report cards." }, { status: 403 });
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, username, admission_no, photo_url, class_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const classIdForTerm = await resolveClassForTerm(supabase, student.id, termId, student.class_id);

  const { data: term } = await supabase.from("academic_terms").select("*").eq("id", termId).maybeSingle();
  if (!term) return NextResponse.json({ error: "Term not found." }, { status: 404 });

  const { data: classRow } = await supabase.from("classes").select("name").eq("id", classIdForTerm).maybeSingle();

  const { data: classSubjects } = await supabase
    .from("class_subjects")
    .select("subject_id, subjects(id, name)")
    .eq("class_id", classIdForTerm);

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, module_type, num_questions, subject_id")
    .eq("class_id", classIdForTerm)
    .eq("term_id", termId);

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("exam_id, status, score")
    .eq("student_id", student.id);

  const weights = {
    ca_weight_percent: term.ca_weight_percent,
    midterm_weight_percent: term.midterm_weight_percent,
    final_weight_percent: term.final_weight_percent
  };

  const { data: projects } = await supabase.from("projects").select("*").eq("student_id", student.id).eq("term_id", termId);
  const { data: improvementAreas } = await supabase.from("improvement_areas").select("*").eq("student_id", student.id).eq("term_id", termId);
  const { data: remarks } = await supabase.from("remarks").select("*").eq("student_id", student.id).eq("term_id", termId).maybeSingle();
  const { data: attendance } = await supabase.from("attendance").select("*").eq("student_id", student.id).eq("term_id", termId).maybeSingle();

  const subjects = (classSubjects || []).map((cs) => {
    const subjectRow = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects;
    const examsForSubject: TermExamRow[] = (exams || []).filter((e) => e.subject_id === cs.subject_id);
    const examScore = computeTermScore(examsForSubject, (attempts || []) as TermAttemptRow[], weights);
    const project = (projects || []).find((p) => p.subject_id === cs.subject_id) || null;
    const improvement = (improvementAreas || []).find((a) => a.subject_id === cs.subject_id) || null;

    return {
      subjectId: cs.subject_id,
      subjectName: subjectRow?.name || "Untitled Subject",
      examScore,
      project,
      flaggedAreas: improvement ? Object.entries(improvement.flags || {}).filter(([, v]) => v).map(([k]) => k) : []
    };
  });

  return NextResponse.json({
    student: {
      fullName: student.full_name,
      username: student.username,
      admissionNo: student.admission_no,
      photoUrl: student.photo_url
    },
    className: classRow?.name || "—",
    term: { sessionName: term.session_name, term: term.term },
    weights,
    subjects: subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    attendance: attendance || null,
    remarks: remarks || null
  });
}
