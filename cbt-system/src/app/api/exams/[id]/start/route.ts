import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Starts a NEW attempt, or resumes an existing one — either way, started_at
// is only ever set the first time. Every later call (including this one on
// resume) recomputes remaining time from that original server timestamp.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const examId = params.id;

  const { data: exam } = await supabase
    .from("exams")
    .select("*, subjects(name), classes(name), academic_terms(session_name, term)")
    .eq("id", examId)
    .maybeSingle();
  if (!exam || exam.status !== "published") {
    return NextResponse.json({ error: "This exam is not available." }, { status: 404 });
  }
  if (exam.class_id !== student.classId) {
    return NextResponse.json({ error: "This exam is not assigned to your class." }, { status: 403 });
  }

  let { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", student.studentId)
    .maybeSingle();

  if (attempt && attempt.status !== "active") {
    return NextResponse.json({ error: "You have already completed this exam." }, { status: 403 });
  }

  // due_date only gates starting a NEW attempt — an attempt already in
  // progress keeps running on its own duration_minutes timer regardless.
  if (!attempt && exam.due_date && new Date(exam.due_date) < new Date()) {
    return NextResponse.json({ error: "The deadline for this exam has passed." }, { status: 403 });
  }

  if (!attempt) {
    const { data: allQuestions } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_id", examId)
      .order("sort_order");

    const ids = (allQuestions || []).map((q) => q.id);
    const ordered = exam.randomize_questions ? shuffle(ids) : ids;

    const { data: created, error } = await supabase
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        student_id: student.studentId,
        question_order: ordered,
        started_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error || !created) {
      return NextResponse.json({ error: "Could not start the exam." }, { status: 500 });
    }
    attempt = created;
  }

  // Server-computed remaining time — this is the only number the client
  // should ever trust for the countdown.
  const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();
  const totalMs = exam.duration_minutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.round((totalMs - elapsedMs) / 1000));

  if (remainingSeconds === 0 && attempt.status === "active") {
    await supabase
      .from("exam_attempts")
      .update({ status: "expired", submitted_at: new Date().toISOString() })
      .eq("id", attempt.id);
    return NextResponse.json({ error: "Time for this exam has already expired." }, { status: 403 });
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, options, sort_order")
    .in("id", attempt.question_order);

  const byId = new Map((questions || []).map((q) => [q.id, q]));
  const orderedQuestions = attempt.question_order
    .map((id: string) => byId.get(id))
    .filter(Boolean);

  // Fetched live, not JWT-embedded — a photo uploaded after the student
  // logged in should show up immediately, not only after their next login.
  const { data: studentExtra } = await supabase
    .from("students")
    .select("photo_url, admission_no")
    .eq("id", student.studentId)
    .maybeSingle();

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      instructions: exam.instructions,
      durationMinutes: exam.duration_minutes,
      module: exam.module_type,
      passingScore: exam.passing_score,
      subject: exam.subjects?.name ?? null,
      class: exam.classes?.name ?? null,
      term: exam.academic_terms?.term ?? null,
      session: exam.academic_terms?.session_name ?? null
    },
    student: {
      // fullName is undefined for sessions issued before this field was
      // added to the token — the header falls back to username in that case.
      fullName: student.fullName ?? null,
      username: student.username,
      photoUrl: studentExtra?.photo_url ?? null,
      admissionNo: studentExtra?.admission_no ?? null
    },
    attemptId: attempt.id,
    remainingSeconds,
    savedAnswers: attempt.answers || {},
    savedFlags: attempt.flagged || [],
    questions: orderedQuestions
  });
}
