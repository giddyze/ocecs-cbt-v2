import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function requireAdmin() {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}

// Promote a teacher to admin, or demote an admin to teacher.
// Two hard rules enforced here, not just in the UI:
//   1. The main admin (is_main_admin = true) can never be demoted by
//      anyone — including themselves. There is no "self" exception.
//   2. No action may leave zero active admins in the system.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { role } = await req.json();
  if (role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "Role must be 'admin' or 'teacher'." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, is_main_admin, active")
    .eq("id", params.id)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  // Promoting a teacher to admin is always safe — no protection needed.
  if (role === "admin") {
    if (target.role === "admin") {
      return NextResponse.json({ error: "This account is already an admin." }, { status: 400 });
    }
    const { error } = await supabase.from("profiles").update({ role: "admin" }).eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Demoting to teacher — this is the protected path.
  if (target.role !== "admin") {
    return NextResponse.json({ error: "This account is already a teacher." }, { status: 400 });
  }
  if (target.is_main_admin) {
    return NextResponse.json(
      { error: "The main admin cannot be demoted or removed — including by themselves." },
      { status: 403 }
    );
  }

  const { count: activeAdminCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("active", true);

  if ((activeAdminCount ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Cannot demote the last remaining active admin." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("profiles").update({ role: "teacher" }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
