import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// Distinct from /api/teacher/assignments (student homework) — this is
// "which class+subject combinations can this staff member manage",
// sourced from teacher_assignments. Teachers see only their own; admins
// see every combination that exists.
export async function GET() {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();

  if (staff.role === "admin") {
    const { data, error } = await supabase.from("class_subjects").select("class_id, subject_id, classes(name), subjects(name)");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ combos: data });
  }

  const { data, error } = await supabase
    .from("teacher_assignments")
    .select("class_id, subject_id, classes(name), subjects(name)")
    .eq("teacher_id", staff.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ combos: data });
}
