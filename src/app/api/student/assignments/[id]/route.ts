import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, instructions, due_date, status, class_id, subjects(name), part_b_grading_mode, part_b_max_score")
    .eq("id", params.id)
    .maybeSingle();

  if (!assignment || assignment.status !== "published" || assignment.class_id !== student.classId) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  // Student-safe: no correct_answer, no rubric criteria (grading-side only,
  // never shown while answering — even after grading, criteria NAMES are
  // fine to show as a breakdown, but that comes from the submission's own
  // saved rubric_scores, not this question list).
  const { data: questionRows } = await supabase
    .from("assignment_questions")
    .select("id, part, question_text, options")
    .eq("assignment_id", params.id)
    .order("display_order");

  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("content_text, submitted_at, grade, feedback, answers, answer_photos, part_a_score, rubric_scores, simple_part_b_score")
    .eq("assignment_id", params.id)
    .eq("student_id", student.studentId)
    .maybeSingle();

  // Photo paths are private storage paths, not URLs — generate fresh
  // signed URLs (1 hour) each time this page loads, rather than storing a
  // permanent link that would bypass the bucket's access control.
  const photoUrls: Record<string, string> = {};
  if (submission?.answer_photos) {
    for (const [questionId, path] of Object.entries(submission.answer_photos as Record<string, string>)) {
      const { data: signed } = await supabase.storage.from("assignment-files").createSignedUrl(path, 3600);
      if (signed?.signedUrl) photoUrls[questionId] = signed.signedUrl;
    }
  }

  // If graded (grade is set), also send back the rubric criteria names/max
  // so the student can see a per-criterion breakdown — this is the one
  // point where criteria become visible, and only for questions that are
  // actually part of their own graded submission.
  let criteriaForBreakdown: { id: string; assignment_question_id: string; criterion_name: string; max_points: number }[] = [];
  if (submission?.grade !== null && submission?.grade !== undefined) {
    const { data: criteria } = await supabase
      .from("rubric_criteria")
      .select("id, assignment_question_id, criterion_name, max_points")
      .in("assignment_question_id", (questionRows || []).filter((q) => q.part === "B").map((q) => q.id));
    criteriaForBreakdown = criteria || [];
  }

  return NextResponse.json({
    assignment,
    questions: questionRows || [],
    criteria: criteriaForBreakdown,
    submission: submission || null,
    photoUrls
  });
}
