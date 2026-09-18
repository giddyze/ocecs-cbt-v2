import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function requireAdmin() {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}

// Returns exactly what deleting this subject would destroy — every exam,
// assignment, and class link cascades from subjects.id on delete, per the
// schema. This is what the frontend's confirmation dialog shows verbatim,
// rather than a generic "are you sure."
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const supabase = createAdminSupabase();
  const [{ count: examCount }, { count: assignmentCount }, { count: classCount }] = await Promise.all([
    supabase.from("exams").select("id", { count: "exact", head: true }).eq("subject_id", params.id),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("subject_id", params.id),
    supabase.from("class_subjects").select("class_id", { count: "exact", head: true }).eq("subject_id", params.id)
  ]);

  return NextResponse.json({
    examCount: examCount ?? 0,
    assignmentCount: assignmentCount ?? 0,
    classCount: classCount ?? 0
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("subjects").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
