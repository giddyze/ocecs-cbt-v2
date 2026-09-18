"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ClipboardList, Clock, MessageSquare, Send, CheckCircle2, Camera, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface AssignmentDetail {
  id: string;
  title: string;
  instructions: string;
  due_date: string | null;
  subjects: { name: string } | null;
  part_b_grading_mode: "rubric" | "simple";
  part_b_max_score: number | null;
}
interface QuestionRow {
  id: string;
  part: "A" | "B";
  question_text: string;
  options: string[] | null;
}
interface CriterionRow {
  id: string;
  assignment_question_id: string;
  criterion_name: string;
  max_points: number;
}
interface Submission {
  content_text: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  answers: Record<string, string> | null;
  answer_photos: Record<string, string> | null;
  part_a_score: number | null;
  rubric_scores: Record<string, Record<string, number>> | null;
  simple_part_b_score: number | null;
}

export default function StudentAssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [criteria, setCriteria] = useState<CriterionRow[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function load() {
    fetch(`/api/student/assignments/${id}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not load assignment."); setLoading(false); return; }
      setAssignment(data.assignment);
      setQuestions(data.questions || []);
      setCriteria(data.criteria || []);
      setSubmission(data.submission);
      if (data.submission?.content_text) setContent(data.submission.content_text);
      if (data.submission?.answers) setAnswers(data.submission.answers);
      if (data.photoUrls) setPhotoPreviews(data.photoUrls);
      setLoading(false);
    });
  }
  useEffect(load, [id]);

  const isStructured = questions.length > 0;
  const alreadyGraded = submission?.grade !== null && submission?.grade !== undefined;
  const alreadySubmitted = !!submission;
  const isSimpleMode = assignment?.part_b_grading_mode === "simple";

  async function uploadPhoto(questionId: string, file: File) {
    setUploadingId(questionId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("questionId", questionId);
    const res = await fetch(`/api/student/assignments/${id}/photo`, { method: "POST", body: formData });
    const data = await res.json();
    setUploadingId(null);
    if (res.ok && data.previewUrl) {
      setPhotoPreviews((prev) => ({ ...prev, [questionId]: data.previewUrl }));
    }
  }

  async function handleSubmit() {
    setError("");
    if (isStructured) {
      // A Part B question counts as answered if it has typed text OR a
      // photo — some questions (a diagram, a traced chart) inherently
      // need an image and nothing else.
      const unanswered = questions.filter((q) => {
        if (q.part === "A") return !answers[q.id]?.trim();
        return !answers[q.id]?.trim() && !photoPreviews[q.id];
      });
      if (unanswered.length > 0) { setError(`Answer all questions before submitting — ${unanswered.length} left.`); return; }
      setSaving(true);
      const res = await fetch(`/api/student/assignments/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setError(data.error || "Could not submit."); return; }
      router.push("/student/assignments");
    } else {
      if (!content.trim()) { setError("Write your answer before submitting."); return; }
      setSaving(true);
      const res = await fetch(`/api/student/assignments/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentText: content })
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) { setError(data.error || "Could not submit."); return; }
      router.push("/student/assignments");
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error && !assignment) return <p className="text-red-600">{error}</p>;
  if (!assignment) return null;

  const partAQuestions = questions.filter((q) => q.part === "A");
  const partBQuestions = questions.filter((q) => q.part === "B");
  // Structured answers stay editable until graded — matching legacy
  // free-text mode — since attaching a photo is often an ongoing action,
  // not a one-shot event locked the moment "Submit" is first pressed.
  const inputsLocked = isStructured ? alreadyGraded : alreadyGraded;

  return (
    <div>
      <Breadcrumb items={[{ label: "Assignments", href: "/student/assignments" }, { label: assignment.title }]} />
      <div className="flex items-center gap-2 mb-1">
        <ClipboardList className="w-5 h-5 text-brand-coral" />
        <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight leading-tight">{assignment.title}</h1>
      </div>
      <div className="w-8 h-1 bg-brand-coral rounded-full mb-2" />
      <p className="text-sm text-slate-500 mb-1">{assignment.subjects?.name}</p>
      {assignment.due_date && (
        <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
          <Clock className="w-3 h-3" /> Due {new Date(assignment.due_date).toLocaleString()}
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-1">Instructions</p>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{assignment.instructions}</p>
      </div>

      {/* Graded breakdown — branches on grading mode. Rubric mode shows
          per-criterion points, same as before. Simple mode shows the one
          holistic Part B score the teacher gave after reviewing the work. */}
      {alreadyGraded && isStructured && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3">Grade: {submission?.grade}%</p>
          {partAQuestions.length > 0 && (
            <p className="text-xs text-emerald-700 mb-2">
              Part A (multiple choice): {submission?.part_a_score}/{partAQuestions.length}
            </p>
          )}
          {isSimpleMode ? (
            partBQuestions.length > 0 && (
              <p className="text-xs text-emerald-700">
                Part B (overall): {submission?.simple_part_b_score ?? 0}/{assignment.part_b_max_score ?? "—"}
              </p>
            )
          ) : (
            partBQuestions.map((q) => {
              const scores = submission?.rubric_scores?.[q.id] || {};
              const qCriteria = criteria.filter((c) => c.assignment_question_id === q.id);
              return (
                <div key={q.id} className="mb-3 last:mb-0">
                  <p className="text-xs font-medium text-emerald-800 mb-1">{q.question_text}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {qCriteria.map((c) => (
                      <span key={c.id} className="text-[11px] bg-white border border-emerald-200 rounded-full px-2 py-0.5 text-emerald-700">
                        {c.criterion_name}: {scores[c.id] ?? 0}/{c.max_points}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {submission?.feedback && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5 mb-1">
            <MessageSquare className="w-4 h-4" /> Teacher Feedback {!isStructured && alreadyGraded && `— Grade: ${submission.grade}%`}
          </p>
          <p className="text-sm text-emerald-700 whitespace-pre-wrap">{submission.feedback}</p>
        </div>
      )}

      {/* Structured Part A / Part B form */}
      {isStructured ? (
        <div className="space-y-4">
          {partAQuestions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm font-semibold text-brand-navy mb-3">Part A — Multiple Choice</p>
              <div className="space-y-4">
                {partAQuestions.map((q, i) => (
                  <div key={q.id}>
                    <p className="text-sm text-slate-700 mb-2">{i + 1}. {q.question_text}</p>
                    <div className="space-y-1.5">
                      {q.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="radio"
                            name={q.id}
                            disabled={inputsLocked}
                            checked={answers[q.id] === opt}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {partBQuestions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm font-semibold text-brand-navy mb-3">Part B — Theory</p>
              <p className="text-xs text-slate-400 mb-4">
                Type your answer, attach a photo of handwritten work, or both — whichever fits the question.
              </p>
              <div className="space-y-5">
                {partBQuestions.map((q, i) => (
                  <div key={q.id}>
                    <p className="text-sm text-slate-700 mb-2">{i + 1}. {q.question_text}</p>
                    <textarea
                      rows={5}
                      disabled={inputsLocked}
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      placeholder="Write your answer…"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500 mb-2"
                    />

                    {photoPreviews[q.id] ? (
                      <div className="relative inline-block">
                        <Image
                          src={photoPreviews[q.id]}
                          alt="Uploaded answer"
                          width={140} height={140}
                          className="rounded-lg border border-slate-200 object-cover"
                        />
                        {!inputsLocked && (
                          <button
                            onClick={() => fileInputs.current[q.id]?.click()}
                            className="absolute -bottom-2 -right-2 bg-brand-teal text-white rounded-full p-1.5 shadow"
                            title="Replace photo"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      !inputsLocked && (
                        <button
                          onClick={() => fileInputs.current[q.id]?.click()}
                          disabled={uploadingId === q.id}
                          className="flex items-center gap-1.5 border border-dashed border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-500 hover:border-brand-teal hover:text-brand-teal transition-colors disabled:opacity-50"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {uploadingId === q.id ? "Uploading…" : "Attach a photo (optional)"}
                        </button>
                      )
                    )}
                    <input
                      ref={(el) => { fileInputs.current[q.id] = el; }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(q.id, f); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 animate-shake">{error}</p>}
          {!inputsLocked && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {saving ? "Submitting…" : alreadySubmitted ? "Update Submission" : "Submit Assignment"}
            </button>
          )}
          {alreadySubmitted && !alreadyGraded && (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> Submitted — you can still update this until it's graded.
            </p>
          )}
        </div>
      ) : (
        // Legacy plain free-text mode — unchanged
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-2">
            {submission ? "Your submission" : "Your answer"}
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            disabled={alreadyGraded}
            placeholder="Type your answer here…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500"
          />
          {error && <p className="text-sm text-red-600 mt-2 animate-shake">{error}</p>}
          {!alreadyGraded && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="mt-3 flex items-center gap-2 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {saving ? "Submitting…" : submission ? "Resubmit" : "Submit Assignment"}
            </button>
          )}
          {submission && !alreadyGraded && (
            <p className="text-xs text-slate-400 mt-2">
              Submitted {new Date(submission.submitted_at).toLocaleString()} — you can update this until it's graded.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
