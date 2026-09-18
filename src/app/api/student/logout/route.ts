import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { STUDENT_COOKIE_NAME, verifyStudentToken } from "@/lib/auth/studentSession";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(STUDENT_COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyStudentToken(token);
    if (payload) {
      const supabase = createAdminSupabase();
      await supabase
        .from("student_sessions")
        .delete()
        .eq("student_id", payload.studentId)
        .eq("session_token", payload.sessionToken);
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(STUDENT_COOKIE_NAME);
  return res;
}
