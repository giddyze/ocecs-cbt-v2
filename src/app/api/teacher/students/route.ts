import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

export async function GET(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const classId = req.nextUrl.searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required." }, { status: 400 });

  const supabase = createAdminSupabase();

  if (staff.role !== "admin") {
    const { data: assignment } = await supabase
      .from("teacher_assignments")
      .select("teacher_id")
      .eq("teacher_id", staff.id)
      .eq("class_id", classId)
      .limit(1)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: "Not assigned to this class." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, username, admission_no, photo_url")
    .eq("class_id", classId)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data });
}
