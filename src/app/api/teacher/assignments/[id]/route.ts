import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function canManage(assignmentId: string, staffId: string, isAdmin: boolean) {
  const supabase = createAdminSupabase();
  const { data } = await supabase.from("assignments").select("teacher_id").eq("id", assignmentId).maybeSingle();
  if (!data) return false;
  return isAdmin || data.teacher_id === staffId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  const supabase = createAdminSupabase();
  const { data: assignment, error } = await supabase.from("assignments").select("*").eq("id", params.id).maybeSingle();
  if (error || !assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  return NextResponse.json({ assignment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.status) update.status = body.status;
  if (body.title) update.title = body.title;
  if (body.instructions !== undefined) update.instructions = body.instructions;
  if (body.dueDate !== undefined) update.due_date = body.dueDate;
  if (body.partBGradingMode) update.part_b_grading_mode = body.partBGradingMode;
  if (body.partBMaxScore !== undefined) update.part_b_max_score = body.partBMaxScore;

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("assignments").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Permanently deletes the assignment along with its questions and every
// student's submission history for it — cascades at the database level.
// This is irreversible and different from unpublishing, which keeps
// history intact. The client is responsible for confirming with the
// teacher before calling this.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("assignments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
