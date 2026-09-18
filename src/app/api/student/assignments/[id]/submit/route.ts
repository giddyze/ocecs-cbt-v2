import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";
import { gradePartA } from "@/lib/scoring/assignmentScore";

// Two modes, both supported:
//  - Plain free-text (assignment has zero Part A/B questions): body is
//    { contentText }, graded manually by the teacher exactly as before —
//    this restructure doesn't remove the simple "write an essay" case.
//  - Structured (assignment has Part A/B questions): body is { answers },
//    Part A auto-graded immediately. If there's no Part B at all, the
//    whole thing is fully auto-graded right here and `grade` is set.
//    Otherwise `grade` stays null until the teacher finishes rubric-scoring.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await req.json();

  const supabase = createAdminSupabase();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("class_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!assignment || assignment.status !== "published") {
    return NextResponse.json({ error: "This assignment is not available." }, { status: 404 });
  }
  if (assignment.class_id !== student.classId) {
    return NextResponse.json({ error: "Not assigned to your class." }, { status: 403 });
  }

  // Editing stays allowed right up until grading happens — but not after.
  // The UI already disables inputs once graded; this is the server-side
  // enforcement of that same rule, since a UI-only restriction can be
  // bypassed by calling this endpoint directly.
  const { data: existingSubmission } = await supabase
    .from("assignment_submissions")
    .select("grade")
    .eq("assignment_id", params.id)
    .eq("student_id", student.studentId)
    .maybeSingle();
  if (existingSubmission?.grade !== null && existingSubmission?.grade !== undefined) {
    return NextResponse.json({ error: "This assignment has already been graded and can no longer be changed." }, { status: 403 });
  }

  const { data: questions } = await supabase
    .from("assignment_questions")
    .select("id, part, correct_answer")
    .eq("assignment_id", params.id);

  if (!questions || questions.length === 0) {
    // Legacy plain-text path — unchanged behavior.
    const { contentText } = body;
    if (!contentText || !contentText.trim()) {
      return NextResponse.json({ error: "Write something before submitting." }, { status: 400 });
    }
    const { error } = await supabase.from("assignment_submissions").upsert(
      { assignment_id: params.id, student_id: student.studentId, content_text: contentText, submitted_at: new Date().toISOString() },
      { onConflict: "assignment_id,student_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, autoGraded: false });
  }

  const { answers } = body;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "Answer something before submitting." }, { status: 400 });
  }

  const { score: partAScore, total: partATotal } = gradePartA(questions, answers);
  const hasPartB = questions.some((q) => q.part === "B");
  const finalGrade = !hasPartB && partATotal > 0 ? Math.round((partAScore / partATotal) * 100) : null;

  const { error } = await supabase.from("assignment_submissions").upsert(
    {
      assignment_id: params.id,
      student_id: student.studentId,
      answers,
      part_a_score: partAScore,
      submitted_at: new Date().toISOString(),
      grade: finalGrade
    },
    { onConflict: "assignment_id,student_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, autoGraded: finalGrade !== null, grade: finalGrade });
}
