import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// Activate / deactivate a teacher. Their Supabase Auth login itself still
// succeeds either way (unchanged auth mechanism) — but getAuthenticatedStaff
// already checks profiles.active and blocks inactive staff from every
// admin/teacher page, so this is how a "suspended" account is enforced.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAuthenticatedStaff();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { active } = await req.json();
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "Missing 'active' boolean." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", params.id).eq("role", "teacher");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
