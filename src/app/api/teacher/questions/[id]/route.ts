import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// Deletes a single question, after checking the requester owns (or admins)
// the exam it belongs to.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: question } = await supabase
    .from("questions")
    .select("exam_id, exams(teacher_id)")
    .eq("id", params.id)
    .maybeSingle();

  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const examTeacherId = (question as any).exams?.teacher_id;
  if (staff.role !== "admin" && examTeacherId !== staff.id) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { error } = await supabase.from("questions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
