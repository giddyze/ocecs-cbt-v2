import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function requireAdmin() {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}

// List all staff — both admins and teachers, so admin management (item 7)
// and password-reset resolution (item 11) live on one page. Admins first,
// then by creation order.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, active, staff_pin, is_main_admin, password_reset_requested_at, photo_url, created_at")
    .order("role", { ascending: true }) // 'admin' < 'teacher' alphabetically — puts admins first
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teachers: data });
}

// Create a staff account — teacher by default, or admin if explicitly
// requested. Makes a Supabase Auth user + profile row.
// The teacher resets their own password via Supabase's password-reset email
// on first login (kept simple here — see README for the invite flow).
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { email, fullName, tempPassword, assignments, role } = await req.json();
  if (!email || !fullName || !tempPassword) {
    return NextResponse.json({ error: "Email, full name, and a temporary password are required." }, { status: 400 });
  }
  const assignedRole = role === "admin" ? "admin" : "teacher";

  const supabase = createAdminSupabase();
  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true
  });
  if (authError || !created.user) {
    return NextResponse.json({ error: authError?.message || "Could not create teacher account." }, { status: 500 });
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    role: assignedRole,
    full_name: fullName,
    email
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (Array.isArray(assignments) && assignments.length > 0) {
    const rows = assignments.map((a: { classId: string; subjectId: string }) => ({
      teacher_id: created.user.id,
      class_id: a.classId,
      subject_id: a.subjectId
    }));
    await supabase.from("teacher_assignments").insert(rows);
  }

  return NextResponse.json({ ok: true, teacherId: created.user.id });
}
