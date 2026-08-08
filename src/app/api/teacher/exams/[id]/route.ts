import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function canManage(examId: string, staffId: string, isAdmin: boolean) {
  const supabase = createAdminSupabase();
  const { data: exam } = await supabase.from("exams").select("teacher_id").eq("id", examId).maybeSingle();
  if (!exam) return false;
  return isAdmin || exam.teacher_id === staffId;
}

// Fetch this exam's own metadata — used by the question-entry page to
// check the entered question count against the target before allowing
// publish, and to know its current status/title for display.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  const supabase = createAdminSupabase();
  const { data: exam, error } = await supabase.from("exams").select("*").eq("id", params.id).maybeSingle();
  if (error || !exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  return NextResponse.json({ exam });
}

// Update status (publish/hide/close) or core settings. Admins can act on any
// exam; teachers only on their own — this is how "Admin can publish, hide,
// reset, or reopen examinations" and "Teacher can publish/edit their own"
// share one endpoint safely.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await req.json();
  const supabase = createAdminSupabase();
  const update: Record<string, unknown> = {};

  if (body.status) {
    update.status = body.status; // draft | published | hidden | closed
    // published_at is set once, server-side, the first time this exam is
    // published — never trust a client-supplied timestamp for this.
    if (body.status === "published") {
      const { data: current } = await supabase.from("exams").select("published_at").eq("id", params.id).maybeSingle();
      if (!current?.published_at) update.published_at = new Date().toISOString();
    }
  }
  if (body.title) update.title = body.title;
  if (body.instructions !== undefined) update.instructions = body.instructions;
  if (body.durationMinutes) update.duration_minutes = body.durationMinutes;
  if (body.numQuestions) update.num_questions = body.numQuestions;
  if (body.passingScore !== undefined) update.passing_score = body.passingScore;
  if (body.randomizeQuestions !== undefined) update.randomize_questions = body.randomizeQuestions;
  if (body.scheduledDate !== undefined) update.scheduled_date = body.scheduledDate;
  if (body.dueDate !== undefined) update.due_date = body.dueDate;

  // Resetting/reopening: wipe existing attempts so students can retake.
  // Admin-only, since this discards any in-progress or submitted scores.
  if (body.resetAttempts) {
    if (staff.role !== "admin") {
      return NextResponse.json({ error: "Only an admin can reset an exam's attempts." }, { status: 403 });
    }
    await supabase.from("exam_attempts").delete().eq("exam_id", params.id);
  }

  const { error } = await supabase.from("exams").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("exams").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
