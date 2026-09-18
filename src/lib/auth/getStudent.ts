import { cookies } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { STUDENT_COOKIE_NAME, verifyStudentToken } from "@/lib/auth/studentSession";

// Validates the student's JWT AND checks it matches the current live session
// row (student_sessions). If another login has since replaced it, this
// returns null — that's the single-active-session rule enforced server-side
// on every request, not just at login time.
export async function getAuthenticatedStudent() {
  const token = cookies().get(STUDENT_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyStudentToken(token);
  if (!payload) return null;

  const supabase = createAdminSupabase();
  const { data: session } = await supabase
    .from("student_sessions")
    .select("id, expires_at")
    .eq("student_id", payload.studentId)
    .eq("session_token", payload.sessionToken)
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  return payload;
}
