import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function assertOwnership(examId: string, staffId: string, isAdmin: boolean) {
  const supabase = createAdminSupabase();
  const { data: exam } = await supabase.from("exams").select("teacher_id").eq("id", examId).maybeSingle();
  if (!exam) return false;
  return isAdmin || exam.teacher_id === staffId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await assertOwnership(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not your exam." }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", params.id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data });
}

// Single question upload
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await assertOwnership(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not your exam." }, { status: 403 });
  }

  const { questionText, options, correctIndex } = await req.json();
  if (!questionText || !Array.isArray(options) || options.length !== 4 || correctIndex === undefined) {
    return NextResponse.json({ error: "A question needs text, 4 options, and a correct option." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", params.id);

  const { error } = await supabase.from("questions").insert({
    exam_id: params.id,
    question_text: questionText,
    options,
    correct_index: correctIndex,
    sort_order: count || 0
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Bulk upload: [{ questionText, options: [4], correctIndex }, ...]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await assertOwnership(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not your exam." }, { status: 403 });
  }

  const { questions } = await req.json();
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "No questions provided." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", params.id);

  const startOrder = count || 0;
  const rows = questions
    .filter((q) => q.questionText && Array.isArray(q.options) && q.options.length === 4 && q.correctIndex !== undefined)
    .map((q, i) => ({
      exam_id: params.id,
      question_text: q.questionText,
      options: q.options,
      correct_index: q.correctIndex,
      sort_order: startOrder + i
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "None of the questions matched the required format." }, { status: 400 });
  }

  const { error } = await supabase.from("questions").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, saved: rows.length, skipped: questions.length - rows.length });
}
