import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function requireAdmin() {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") return null;
  return staff;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const supabase = createAdminSupabase();
  const { data, error } = await supabase.from("subjects").select("id, name").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subjects: data });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Subject name is required." }, { status: 400 });

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("subjects").insert({ name: name.trim() });
  if (error) {
    const message = error.code === "23505" ? "A subject with that name already exists." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
