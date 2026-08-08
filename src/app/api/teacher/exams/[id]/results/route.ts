import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// "Teachers view results only for exams they created" — enforced here.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: exam } = await supabase.from("exams").select("teacher_id, num_questions, passing_score").eq("id", params.id).maybeSingle();
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  if (staff.role !== "admin" && exam.teacher_id !== staff.id) {
    return NextResponse.json({ error: "You can only view results for exams you created." }, { status: 403 });
  }

  const { data: attempts, error } = await supabase
    .from("exam_attempts")
    .select("id, status, score, started_at, submitted_at, students(full_name, username)")
    .eq("exam_id", params.id)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    numQuestions: exam.num_questions,
    passingScore: exam.passing_score,
    attempts
  });
}
