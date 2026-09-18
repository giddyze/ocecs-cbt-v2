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
  const { data, error } = await supabase
    .from("academic_terms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { sessionName, term, caWeightPercent, midtermWeightPercent, finalWeightPercent } = await req.json();
  if (!sessionName || !term) {
    return NextResponse.json({ error: "Session name and term are required." }, { status: 400 });
  }

  const ca = caWeightPercent ?? 30;
  const mid = midtermWeightPercent ?? 20;
  const fin = finalWeightPercent ?? 50;
  if (ca + mid + fin !== 100) {
    return NextResponse.json({ error: "Weights must sum to exactly 100%." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.from("academic_terms").insert({
    session_name: sessionName,
    term,
    is_current: false, // new terms are never auto-activated — an explicit
    // "set current" action is required, so a term is never live by accident
    ca_weight_percent: ca,
    midterm_weight_percent: mid,
    final_weight_percent: fin
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
