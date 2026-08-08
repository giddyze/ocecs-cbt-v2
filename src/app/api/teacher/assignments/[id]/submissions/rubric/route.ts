import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import { computeAssignmentScore } from "@/lib/scoring/assignmentScore";

// Body: { submissionId, questionId, scores: { criterionId: pointsAwarded } }
// Merges into the submission's existing rubric_scores (so grading one
// question doesn't wipe out scores already saved for another), then
// recomputes the combined score. `grade` is only set once every Part B
// question is fully scored — a partial save keeps it null, same
// "incomplete until everything's in" rule used everywhere else in this app.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: assignment } = await supabase.from("assignments").select("teacher_id").eq("id", params.id).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (staff.role !== "admin" && assignment.teacher_id !== staff.id) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { submissionId, questionId, scores } = await req.json();
  if (!submissionId || !questionId || !scores) {
    return NextResponse.json({ error: "submissionId, questionId, and scores are required." }, { status: 400 });
  }

  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("rubric_scores, part_a_score")
    .eq("id", submissionId)
    .eq("assignment_id", params.id)
    .maybeSingle();
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  const mergedRubricScores = { ...submission.rubric_scores, [questionId]: scores };

  const { data: questions } = await supabase.from("assignment_questions").select("*").eq("assignment_id", params.id);
  const { data: criteria } = await supabase
    .from("rubric_criteria")
    .select("*")
    .in("assignment_question_id", (questions || []).filter((q) => q.part === "B").map((q) => q.id));

  const result = computeAssignmentScore(questions || [], criteria || [], submission.part_a_score, mergedRubricScores);

  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      rubric_scores: mergedRubricScores,
      grade: result.combinedPercent, // null unless fully graded — never a partial value
      graded_at: result.isFullyGraded ? new Date().toISOString() : null
    })
    .eq("id", submissionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, isFullyGraded: result.isFullyGraded, grade: result.combinedPercent });
}
