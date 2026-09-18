import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Returns subjects, optionally filtered to those valid for a given class
// (via class_subjects). Used to populate the subject dropdown after a
// class is chosen when creating an exam.
export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get("classId");
  const supabase = createAdminSupabase();

  if (classId) {
    const { data, error } = await supabase
      .from("class_subjects")
      .select("subjects(id, name)")
      .eq("class_id", classId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const subjects = (data || []).map((r: any) => r.subjects).filter(Boolean);
    return NextResponse.json({ subjects });
  }

  const { data, error } = await supabase.from("subjects").select("id, name").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subjects: data });
}
