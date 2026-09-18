import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Resets a student's PIN (new random PIN, old sessions invalidated by
// deleting their student_sessions rows so they must log in fresh).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  const { error } = await supabase.from("students").update({ pin_hash: pinHash }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("student_sessions").delete().eq("student_id", params.id);

  return NextResponse.json({ pin });
}
