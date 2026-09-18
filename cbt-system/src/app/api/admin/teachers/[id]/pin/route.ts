import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Generates or regenerates a tutor's reference PIN. This does NOT affect
// their email+password login — it's a separate, admin-visible identifier.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAuthenticatedStaff();
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const pin = generatePin();
  const { error } = await supabase.from("profiles").update({ staff_pin: pin }).eq("id", params.id).eq("role", "teacher");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pin });
}
