import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import { computeAssignmentScore } from "@/lib/scoring/assignmentScore";

// Body: { submissionId, score }
// For 'simple' grading-mode assignments only — one holistic Part B score
// after the teacher has reviewed the student's work as a whole (typed
// answers and/or photos), rather than per-criterion rubric scoring.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("teacher_id, part_b_grading_mode, part_b_max_score")
    .eq("id", params.id)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (staff.role !== "admin" && assignment.teacher_id !== staff.id) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  if (assignment.part_b_grading_mode !== "simple") {
    return NextResponse.json({ error: "This assignment uses rubric grading, not simple grading." }, { status: 400 });
  }

  const { submissionId, score } = await req.json();
  if (!submissionId || score === undefined || score === null) {
    return NextResponse.json({ error: "submissionId and score are required." }, { status: 400 });
  }
  if (assignment.part_b_max_score !== null && score > assignment.part_b_max_score) {
    return NextResponse.json({ error: `Score cannot exceed the Part B maximum (${assignment.part_b_max_score}).` }, { status: 400 });
  }

  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("part_a_score")
    .eq("id", submissionId)
    .eq("assignment_id", params.id)
    .maybeSingle();
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const { data: questions } = await supabase.from("assignment_questions").select("*").eq("assignment_id", params.id);
  const result = computeAssignmentScore(
    questions || [], [], submission.part_a_score, {}, "simple", score, assignment.part_b_max_score
  );

  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      simple_part_b_score: score,
      grade: result.combinedPercent,
      graded_at: new Date().toISOString()
    })
    .eq("id", submissionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, grade: result.combinedPercent });
}
