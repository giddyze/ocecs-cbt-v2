import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Public, read-only: term names/dates aren't sensitive, and the current
// term needs to be known before some pages have finished authenticating
// (e.g. deciding what to show while a session is still loading).
export async function GET() {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("academic_terms")
    .select("id, session_name, term, is_current")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ terms: data });
}
