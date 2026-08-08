import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

function generateTempPassword(): string {
  // Readable-but-random temp password — the admin reads it aloud/writes it
  // down once, same handoff pattern as the student PIN and teacher
  // reference PIN elsewhere in this app.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Admin resolves a pending "Forgot Password?" request: generates a new
// password, sets it directly via the Supabase Auth admin API, clears the
// pending flag, and returns the plaintext password ONCE. There is no email
// delivery in this system — the admin communicates it to the teacher
// manually (in person, phone, etc.).
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", params.id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });

  const newPassword = generateTempPassword();
  const { error: authError } = await supabase.auth.admin.updateUserById(params.id, { password: newPassword });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  await supabase.from("profiles").update({ password_reset_requested_at: null }).eq("id", params.id);

  return NextResponse.json({ password: newPassword });
}
