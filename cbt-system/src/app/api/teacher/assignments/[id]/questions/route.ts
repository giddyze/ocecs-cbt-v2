import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";

async function canManage(assignmentId: string, staffId: string, isAdmin: boolean) {
  const supabase = createAdminSupabase();
  const { data } = await supabase.from("assignments").select("teacher_id").eq("id", assignmentId).maybeSingle();
  if (!data) return false;
  return isAdmin || data.teacher_id === staffId;
}

// Generic starter rubric suggestions live in @/lib/scoring/assignmentScore
// (RUBRIC_STARTERS) — a route handler file can't export arbitrary
// constants, only HTTP method handlers and a small set of route configs.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const supabase = createAdminSupabase();
  const { data: questions, error } = await supabase
    .from("assignment_questions")
    .select("*, rubric_criteria(*)")
    .eq("assignment_id", params.id)
    .order("display_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions });
}

// Body: { part: 'A'|'B', questionText, options?, correctAnswer? (Part A),
//         criteria?: [{ name, maxPoints }] (Part B) }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { part, questionText, options, correctAnswer, criteria } = await req.json();
  if (part !== "A" && part !== "B") return NextResponse.json({ error: "part must be 'A' or 'B'." }, { status: 400 });
  if (!questionText?.trim()) return NextResponse.json({ error: "Question text is required." }, { status: 400 });
  if (part === "A" && (!options || options.length < 2 || !correctAnswer)) {
    return NextResponse.json({ error: "Part A questions need at least 2 options and a correct answer." }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  // Rubric criteria are only required for Part B questions when the
  // assignment is actually using rubric grading — a 'simple' mode
  // assignment grades the whole Part B section with one holistic score,
  // so individual questions don't need per-criterion breakdowns at all.
  const { data: assignmentRow } = await supabase.from("assignments").select("part_b_grading_mode").eq("id", params.id).maybeSingle();
  const isRubricMode = (assignmentRow?.part_b_grading_mode || "rubric") === "rubric";
  if (part === "B" && isRubricMode && (!criteria || criteria.length === 0)) {
    return NextResponse.json({ error: "Part B questions need at least one rubric criterion." }, { status: 400 });
  }

  const { count } = await supabase
    .from("assignment_questions")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", params.id);

  const { data: question, error } = await supabase
    .from("assignment_questions")
    .insert({
      assignment_id: params.id,
      part,
      question_text: questionText,
      options: part === "A" ? options : null,
      correct_answer: part === "A" ? correctAnswer : null,
      display_order: count ?? 0
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (part === "B" && isRubricMode && criteria?.length) {
    const rows = criteria.map((c: { name: string; maxPoints: number }, i: number) => ({
      assignment_question_id: question.id,
      criterion_name: c.name,
      max_points: c.maxPoints,
      display_order: i
    }));
    const { error: criteriaError } = await supabase.from("rubric_criteria").insert(rows);
    if (criteriaError) return NextResponse.json({ error: criteriaError.message }, { status: 500 });
  }

  return NextResponse.json({ questionId: question.id });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }
  const { questionId } = await req.json();
  const supabase = createAdminSupabase();
  const { error } = await supabase.from("assignment_questions").delete().eq("id", questionId).eq("assignment_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Bulk upload for Part A (multiple choice) questions — same block format
// already used for exam questions: question text, an "A) / B) / C) / D)"
// options line, then "Correct: <letter>", blocks separated by a blank
// line. Unlike exam questions (which store correct_index, a number),
// assignment Part A stores correct_answer as the actual option TEXT, so
// the letter gets resolved to real text here before insert.
// Body: { questions: [{ questionText, options: string[], correctIndex }] }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (!(await canManage(params.id, staff.id, staff.role === "admin"))) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { questions } = await req.json();
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "No questions to upload." }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { count } = await supabase
    .from("assignment_questions")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", params.id);
  const startOrder = count ?? 0;

  const rows = questions.map((q: { questionText: string; options: string[]; correctIndex: number }, i: number) => ({
    assignment_id: params.id,
    part: "A",
    question_text: q.questionText,
    options: q.options,
    correct_answer: q.options[q.correctIndex],
    display_order: startOrder + i
  }));

  const { error } = await supabase.from("assignment_questions").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length });
}
