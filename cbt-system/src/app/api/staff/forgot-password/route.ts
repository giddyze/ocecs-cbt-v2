import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Public route — the teacher can't be logged in if they've forgotten their
// password. Always returns the same generic success message regardless of
// whether the email matches an account, to avoid leaking which emails are
// registered (account enumeration).
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim())
    .in("role", ["admin", "teacher"])
    .maybeSingle();

  if (staff) {
    await supabase
      .from("profiles")
      .update({ password_reset_requested_at: new Date().toISOString() })
      .eq("id", staff.id);
  }

  // Same response either way — the person on the other end only ever sees
  // this generic message, whether or not their email was found.
  return NextResponse.json({
    ok: true,
    message: "If that email belongs to a staff account, your admin has been notified and will reset your password."
  });
}
