import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Public, read-only: class names are needed on the student login screen
// before any authentication happens. No sensitive data is exposed.
export async function GET() {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.from("classes").select("id, name").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ classes: data });
}
