import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function requireAdmin() {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}

// List a teacher's current class/subject assignments
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("teacher_assignments")
    .select("class_id, subject_id, classes(name), subjects(name)")
    .eq("teacher_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data });
}

// Add one class/subject assignment: { classId, subjectId }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { classId, subjectId } = await req.json();
  if (!classId || !subjectId) {
    return NextResponse.json({ error: "classId and subjectId are required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("teacher_assignments")
    .upsert({ teacher_id: params.id, class_id: classId, subject_id: subjectId }, { onConflict: "teacher_id,class_id,subject_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Remove one assignment (reassign away from a class/subject): { classId, subjectId }
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { classId, subjectId } = await req.json();
  if (!classId || !subjectId) {
    return NextResponse.json({ error: "classId and subjectId are required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("teacher_id", params.id)
    .eq("class_id", classId)
    .eq("subject_id", subjectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
