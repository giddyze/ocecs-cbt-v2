import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";

// Uploads a photo answer for one Part B question, alongside (not instead
// of) any typed answer for the same question — some theory questions
// inherently need an image regardless of written explanation. Stored in
// the private 'assignment-files' bucket; only the storage PATH is saved
// here, never a permanent URL — teachers and the student view it later via
// a freshly generated signed URL, since the bucket isn't public.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const student = await getAuthenticatedStudent();
  if (!student) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const supabase = createAdminSupabase();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("class_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!assignment || assignment.status !== "published" || assignment.class_id !== student.classId) {
    return NextResponse.json({ error: "Assignment not available." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const questionId = formData.get("questionId") as string | null;
  if (!file || !questionId) return NextResponse.json({ error: "file and questionId are required." }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const path = `assignments/${params.id}/${student.studentId}/${questionId}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("assignment-files").upload(path, file, { upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Merge into whatever's already there — an existing submission row (with
  // typed answers already saved) keeps everything else untouched, and a
  // brand-new row is created if this is the student's first interaction
  // with this assignment.
  const { data: existing } = await supabase
    .from("assignment_submissions")
    .select("answer_photos, grade")
    .eq("assignment_id", params.id)
    .eq("student_id", student.studentId)
    .maybeSingle();

  if (existing?.grade !== null && existing?.grade !== undefined) {
    return NextResponse.json({ error: "This assignment has already been graded and can no longer be changed." }, { status: 403 });
  }

  const mergedPhotos = { ...(existing?.answer_photos || {}), [questionId]: path };

  const { error } = await supabase.from("assignment_submissions").upsert(
    { assignment_id: params.id, student_id: student.studentId, answer_photos: mergedPhotos },
    { onConflict: "assignment_id,student_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: signed } = await supabase.storage.from("assignment-files").createSignedUrl(path, 3600);
  return NextResponse.json({ ok: true, previewUrl: signed?.signedUrl || null });
}
