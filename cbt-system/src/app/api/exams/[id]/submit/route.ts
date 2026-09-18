import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

// Final submission — grades against correct_index server-side (never trust
// a score computed on the client). Works whether the student clicked
// "Submit" early or the client's local timer hit zero and auto-called this.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { answers } = await req.json().catch(() => ({ answers: undefined }));
  const supabase = createAdminSupabase();
  const examId = params.id;

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", student.studentId)
    .maybeSingle();

  if (!attempt) return NextResponse.json({ error: "No attempt found." }, { status: 404 });
  if (attempt.status !== "active") {
    // Already submitted/expired — return the existing result idempotently.
    return NextResponse.json({ score: attempt.score, alreadySubmitted: true });
  }

  const finalAnswers = answers ?? attempt.answers ?? {};

  const { data: questions } = await supabase
    .from("questions")
    .select("id, correct_index")
    .eq("exam_id", examId);

  let score = 0;
  (questions || []).forEach((q) => {
    if (finalAnswers[q.id] === q.correct_index) score += 1;
  });

  await supabase
    .from("exam_attempts")
    .update({
      answers: finalAnswers,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      score
    })
    .eq("id", attempt.id);

  return NextResponse.json({
    score,
    totalQuestions: (questions || []).length
  });
}
