import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import { computeAssignmentScore } from "@/lib/scoring/assignmentScore";

// List submissions for grading, with Part A/B questions, rubric criteria,
// and a pre-computed score breakdown per submission — everything the
// grading UI needs in one call.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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

  const { data: questions } = await supabase
    .from("assignment_questions")
    .select("*")
    .eq("assignment_id", params.id)
    .order("display_order");

  const partBQuestionIds = (questions || []).filter((q) => q.part === "B").map((q) => q.id);
  const { data: criteria } = partBQuestionIds.length
    ? await supabase.from("rubric_criteria").select("*").in("assignment_question_id", partBQuestionIds)
    : { data: [] };

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select("*, students(full_name, username)")
    .eq("assignment_id", params.id)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const gradingMode = assignment.part_b_grading_mode as "rubric" | "simple";
  const submissions = await Promise.all(
    (data || []).map(async (s) => {
      const photoUrls: Record<string, string> = {};
      if (s.answer_photos) {
        for (const [questionId, path] of Object.entries(s.answer_photos as Record<string, string>)) {
          const { data: signed } = await supabase.storage.from("assignment-files").createSignedUrl(path as string, 3600);
          if (signed?.signedUrl) photoUrls[questionId] = signed.signedUrl;
        }
      }
      return {
        ...s,
        photoUrls,
        breakdown: computeAssignmentScore(
          questions || [], criteria || [], s.part_a_score, s.rubric_scores || {},
          gradingMode, s.simple_part_b_score, assignment.part_b_max_score
        )
      };
    })
  );

  return NextResponse.json({
    questions: questions || [],
    criteria: criteria || [],
    submissions,
    gradingMode,
    partBMaxScore: assignment.part_b_max_score
  });
}

// Grade a submission: { submissionId, grade, feedback }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: assignment } = await supabase.from("assignments").select("teacher_id").eq("id", params.id).maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (staff.role !== "admin" && assignment.teacher_id !== staff.id) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { submissionId, grade, feedback } = await req.json();
  if (!submissionId) return NextResponse.json({ error: "submissionId required." }, { status: 400 });

  const { error } = await supabase
    .from("assignment_submissions")
    .update({ grade, feedback, graded_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("assignment_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
