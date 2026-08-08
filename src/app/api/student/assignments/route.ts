import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

export async function GET() {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("id, title, instructions, due_date, status, subjects(name)")
    .eq("class_id", student.classId)
    .eq("status", "published")
    .order("due_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("assignment_id, submitted_at, grade, feedback")
    .eq("student_id", student.studentId);

  const byAssignment = new Map((submissions || []).map((s) => [s.assignment_id, s]));

  const withStatus = (assignments || []).map((a) => ({
    ...a,
    submission: byAssignment.get(a.id) || null
  }));

  return NextResponse.json({ assignments: withStatus });
}
