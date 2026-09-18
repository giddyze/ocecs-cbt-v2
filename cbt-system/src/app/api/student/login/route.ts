import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  signStudentToken,
  STUDENT_COOKIE_NAME,
  STUDENT_SESSION_MAX_AGE_SECONDS
} from "@/lib/auth/studentSession";

export async function POST(req: NextRequest) {
  const { username, pin } = await req.json();
  if (!username || !pin) {
    return NextResponse.json({ error: "Username and PIN are required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  const { data: student, error } = await supabase
    .from("students")
    .select("id, username, pin_hash, full_name, class_id, active")
    .eq("username", username.trim())
    .maybeSingle();

  if (error || !student || !student.active) {
    return NextResponse.json({ error: "Invalid username or PIN." }, { status: 401 });
  }

  const pinMatches = await bcrypt.compare(pin, student.pin_hash);
  if (!pinMatches) {
    return NextResponse.json({ error: "Invalid username or PIN." }, { status: 401 });
  }

  // Issue a fresh session token. Writing a new row (and the client only ever
  // trusting the most recent token) is what invalidates any previous session
  // for this student — logging in on a second device logs the first one out.
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + STUDENT_SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  const { error: sessionError } = await supabase.from("student_sessions").insert({
    student_id: student.id,
    session_token: sessionToken,
    expires_at: expiresAt
  });
  if (sessionError) {
    return NextResponse.json({ error: "Could not start a session. Try again." }, { status: 500 });
  }

  const jwt = await signStudentToken({
    studentId: student.id,
    username: student.username,
    fullName: student.full_name,
    classId: student.class_id,
    sessionToken
  });

  const res = NextResponse.json({
    student: { id: student.id, fullName: student.full_name, classId: student.class_id }
  });
  res.cookies.set(STUDENT_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STUDENT_SESSION_MAX_AGE_SECONDS
  });
  return res;
}
