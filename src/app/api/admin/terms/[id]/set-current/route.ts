import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

// The only place is_current is ever changed. Runs as two writes rather than
// relying on a UI toggle per row, so it's impossible to end up with zero or
// two current terms through this endpoint — every other term is explicitly
// unset before the chosen one is set.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const supabase = createAdminSupabase();

  const { data: target } = await supabase.from("academic_terms").select("id").eq("id", params.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Term not found." }, { status: 404 });

  const { error: clearError } = await supabase
    .from("academic_terms")
    .update({ is_current: false })
    .neq("id", params.id);
  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

  const { error: setError } = await supabase
    .from("academic_terms")
    .update({ is_current: true })
    .eq("id", params.id);
  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
