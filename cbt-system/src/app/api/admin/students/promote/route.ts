import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// Body: { studentIds: string[], toClassId, toTermId, notes? }
// Each student is promoted via the promote_student() Postgres function —
// atomic per student (a single function call is one implicit transaction),
// which is the fix for the Assessment Tracker's original bug of four
// separate, non-transactional client writes. Promoting 30 students is 30
// atomic calls, not one giant transaction — a failure on student #12
// doesn't affect students #1–11, who are already safely promoted.
export async function POST(req: NextRequest) {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { studentIds, toClassId, toTermId, notes } = await req.json();
  if (!Array.isArray(studentIds) || studentIds.length === 0 || !toClassId || !toTermId) {
    return NextResponse.json({ error: "studentIds, toClassId, and toTermId are required." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const results: { studentId: string; ok: boolean; error?: string }[] = [];

  for (const studentId of studentIds) {
    const { error } = await supabase.rpc("promote_student", {
      p_student_id: studentId,
      p_to_class_id: toClassId,
      p_to_term_id: toTermId,
      p_notes: notes || null
    });
    results.push({ studentId, ok: !error, error: error?.message });
  }

  const failures = results.filter((r) => !r.ok);
  return NextResponse.json({ results, succeeded: results.length - failures.length, failed: failures.length });
}
