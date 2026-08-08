import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function requireAdmin() {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4-digit PIN
}

// List students, optionally filtered by class
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const classId = req.nextUrl.searchParams.get("classId");
  const supabase = createAdminSupabase();
  let query = supabase
    .from("students")
    .select("id, username, full_name, admission_no, photo_url, class_id, active, created_at, classes(name)")
    .order("created_at", { ascending: false });
  if (classId) query = query.eq("class_id", classId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data });
}

// Create a student — PIN is generated here, hashed for storage, and
// returned ONCE in the response so the admin can hand it to the student.
// It is never retrievable again (only reset, which issues a new one).
// admissionNo is optional — the Assessment Tracker's registration format
// included it, but it isn't required for login/auth.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { username, fullName, classId, admissionNo } = await req.json();
  if (!username || !fullName || !classId) {
    return NextResponse.json({ error: "Username, full name, and class are required." }, { status: 400 });
  }

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("students")
    .insert({
      username: username.trim(),
      full_name: fullName,
      class_id: classId,
      pin_hash: pinHash,
      admission_no: admissionNo?.trim() || null
    })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That username is already taken." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ studentId: data.id, pin });
}
