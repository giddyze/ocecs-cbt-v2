import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

// Called every few seconds and on every answer change from the client.
// Re-validates server-side elapsed time on EVERY call — a client can't buy
// extra time by delaying this request, disconnecting, or refreshing.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { answers, flagged } = await req.json();
  const supabase = createAdminSupabase();
  const examId = params.id;

  const { data: exam } = await supabase
    .from("exams")
    .select("duration_minutes")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, started_at, status")
    .eq("exam_id", examId)
    .eq("student_id", student.studentId)
    .maybeSingle();

  if (!attempt || attempt.status !== "active") {
    return NextResponse.json({ error: "No active attempt to save." }, { status: 403 });
  }

  const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();
  const totalMs = exam.duration_minutes * 60 * 1000;

  if (elapsedMs >= totalMs) {
    await supabase
      .from("exam_attempts")
      .update({ status: "expired", submitted_at: new Date().toISOString() })
      .eq("id", attempt.id);
    return NextResponse.json({ error: "Time expired.", expired: true }, { status: 403 });
  }

  await supabase
    .from("exam_attempts")
    .update({
      answers: answers || {},
      flagged: flagged || [],
      last_saved_at: new Date().toISOString()
    })
    .eq("id", attempt.id);

  const remainingSeconds = Math.max(0, Math.round((totalMs - elapsedMs) / 1000));
  return NextResponse.json({ ok: true, remainingSeconds });
}
