"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ClipboardCheck, CheckCircle2, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface CriterionRow { id: string; assignment_question_id: string; criterion_name: string; max_points: number; }
interface QuestionRow { id: string; part: "A" | "B"; question_text: string; correct_answer: string | null; }
interface ComponentBreakdownQuestion {
  questionId: string;
  questionText: string;
  criteria: { criterionId: string; name: string; maxPoints: number; pointsAwarded: number | null }[];
  earned: number;
  possible: number;
  isGraded: boolean;
}
interface Breakdown {
  partATotal: number;
  partAScore: number;
  partBQuestions: ComponentBreakdownQuestion[];
  isFullyGraded: boolean;
  combinedPercent: number | null;
}
interface SubmissionRow {
  id: string;
  content_text: string | null;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  answers: Record<string, string> | null;
  photoUrls: Record<string, string>;
  simple_part_b_score: number | null;
  students: { full_name: string; username: string } | null;
  breakdown: Breakdown;
}

export default function TeacherSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [gradingMode, setGradingMode] = useState<"rubric" | "simple">("rubric");
  const [partBMaxScore, setPartBMaxScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [rubricDrafts, setRubricDrafts] = useState<Record<string, string>>({});
  const [simpleDrafts, setSimpleDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/teacher/assignments/${id}/submissions`).then((r) => r.json()),
      fetch(`/api/teacher/assignments/${id}`).then((r) => r.json())
    ]).then(([subs, a]) => {
      setSubmissions(subs.submissions || []);
      setQuestions(subs.questions || []);
      setGradingMode(subs.gradingMode || "rubric");
      setPartBMaxScore(subs.partBMaxScore ?? null);
      if (a.assignment) setAssignmentTitle(a.assignment.title);
      const initial: Record<string, { grade: string; feedback: string }> = {};
      const rubricInit: Record<string, string> = {};
      const simpleInit: Record<string, string> = {};
      (subs.submissions || []).forEach((s: SubmissionRow) => {
        initial[s.id] = { grade: s.grade?.toString() || "", feedback: s.feedback || "" };
        simpleInit[s.id] = s.simple_part_b_score?.toString() || "";
        s.breakdown?.partBQuestions?.forEach((q) => {
          q.criteria.forEach((c) => {
            rubricInit[`${s.id}:${q.questionId}:${c.criterionId}`] = c.pointsAwarded?.toString() || "";
          });
        });
      });
      setDrafts(initial);
      setRubricDrafts(rubricInit);
      setSimpleDrafts(simpleInit);
    }).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  const isStructured = questions.length > 0;
  const partBQuestions = questions.filter((q) => q.part === "B");

  async function saveGrade(submissionId: string) {
    setSavingId(submissionId);
    const draft = drafts[submissionId];
    await fetch(`/api/teacher/assignments/${id}/submissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, grade: draft.grade ? Number(draft.grade) : null, feedback: draft.feedback })
    });
    setSavingId(null);
    load();
  }

  async function saveRubric(submissionId: string, questionId: string, questionCriteria: { criterionId: string; maxPoints: number }[]) {
    setSavingId(`${submissionId}:${questionId}`);
    const scores: Record<string, number> = {};
    for (const c of questionCriteria) {
      const raw = rubricDrafts[`${submissionId}:${questionId}:${c.criterionId}`];
      const val = raw ? Math.min(Number(raw), c.maxPoints) : 0;
      scores[c.criterionId] = val;
    }
    await fetch(`/api/teacher/assignments/${id}/submissions/rubric`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, questionId, scores })
    });
    setSavingId(null);
    load();
  }

  async function saveSimpleScore(submissionId: string) {
    setSavingId(`simple:${submissionId}`);
    const raw = simpleDrafts[submissionId];
    const score = raw ? Math.min(Number(raw), partBMaxScore ?? Number(raw)) : 0;
    await fetch(`/api/teacher/assignments/${id}/submissions/simple-score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, score })
    });
    setSavingId(null);
    load();
  }

  async function saveFeedbackOnly(submissionId: string) {
    setSavingId(submissionId);
    const draft = drafts[submissionId];
    await fetch(`/api/teacher/assignments/${id}/submissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, grade: submissions.find((s) => s.id === submissionId)?.grade ?? null, feedback: draft.feedback })
    });
    setSavingId(null);
    load();
  }

  return (
    <div>
      <Breadcrumb items={[{ label: "Assignments", href: "/teacher/assignments" }, { label: assignmentTitle || "Submissions" }]} />
      <div className="flex items-center gap-3 mb-2">
        <ClipboardCheck className="w-7 h-7 text-brand-teal" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Submissions</h1>
          <div className="w-10 h-1 bg-brand-coral rounded-full mt-2" />
        </div>
      </div>
      {isStructured && partBQuestions.length > 0 && (
        <p className="text-xs text-slate-400 mb-6">
          Part B grading: {gradingMode === "simple" ? `Simple — one overall score out of ${partBMaxScore ?? "—"}` : "Rubric — per-criterion scoring"}
        </p>
      )}

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && submissions.length === 0 && <p className="text-slate-400 text-sm">No submissions yet.</p>}

      <div className="space-y-4">
        {submissions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-slate-800">{s.students?.full_name}</p>
                <p className="text-xs text-slate-400">{s.students?.username} · Submitted {new Date(s.submitted_at).toLocaleString()}</p>
              </div>
              {s.grade !== null ? (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Graded: {s.grade}%
                </span>
              ) : isStructured ? (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" /> Grading in progress
                </span>
              ) : null}
            </div>

            {isStructured ? (
              <div className="space-y-4">
                {s.breakdown.partATotal > 0 && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    Part A (auto-graded): {s.breakdown.partAScore}/{s.breakdown.partATotal}
                  </p>
                )}

                {gradingMode === "rubric" ? (
                  s.breakdown.partBQuestions.map((q) => (
                    <div key={q.questionId} className="border border-slate-100 rounded-lg p-3">
                      <p className="text-sm text-slate-700 mb-1">{q.questionText}</p>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap mb-2">
                        {s.answers?.[q.questionId] || <span className="text-slate-400">No typed answer given</span>}
                      </p>
                      {s.photoUrls?.[q.questionId] && (
                        <a href={s.photoUrls[q.questionId]} target="_blank" rel="noreferrer" className="inline-block mb-2">
                          <Image src={s.photoUrls[q.questionId]} alt="Student's photo answer" width={120} height={120} className="rounded-lg border border-slate-200 object-cover" />
                        </a>
                      )}
                      <div className="flex flex-wrap items-end gap-2">
                        {q.criteria.map((c) => (
                          <div key={c.criterionId}>
                            <label className="block text-[11px] text-slate-500 mb-0.5">{c.name} (/{c.maxPoints})</label>
                            <input
                              type="number" min={0} max={c.maxPoints}
                              value={rubricDrafts[`${s.id}:${q.questionId}:${c.criterionId}`] || ""}
                              onChange={(e) =>
                                setRubricDrafts((prev) => ({ ...prev, [`${s.id}:${q.questionId}:${c.criterionId}`]: e.target.value }))
                              }
                              className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => saveRubric(s.id, q.questionId, q.criteria.map((c) => ({ criterionId: c.criterionId, maxPoints: c.maxPoints })))}
                          disabled={savingId === `${s.id}:${q.questionId}`}
                          className="bg-brand-teal text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {savingId === `${s.id}:${q.questionId}` ? "Saving…" : q.isGraded ? "Update Score" : "Save Score"}
                        </button>
                        {q.isGraded && <span className="text-xs text-emerald-600">{q.earned}/{q.possible} pts</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  // Simple mode: show each Part B question's answer (text
                  // and/or photo) for review, then one holistic score for
                  // the whole section — not per-question.
                  partBQuestions.length > 0 && (
                    <div className="border border-slate-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Part B — review all, then score once</p>
                      <div className="space-y-3 mb-3">
                        {partBQuestions.map((q) => (
                          <div key={q.id}>
                            <p className="text-sm text-slate-700 mb-1">{q.question_text}</p>
                            {s.answers?.[q.id] && (
                              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap mb-1.5">{s.answers[q.id]}</p>
                            )}
                            {s.photoUrls?.[q.id] && (
                              <a href={s.photoUrls[q.id]} target="_blank" rel="noreferrer" className="inline-block">
                                <Image src={s.photoUrls[q.id]} alt="Student's photo answer" width={140} height={140} className="rounded-lg border border-slate-200 object-cover" />
                              </a>
                            )}
                            {!s.answers?.[q.id] && !s.photoUrls?.[q.id] && (
                              <p className="text-xs text-slate-400">No answer given</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">Part B score (/{partBMaxScore ?? "—"})</label>
                          <input
                            type="number" min={0} max={partBMaxScore ?? undefined}
                            value={simpleDrafts[s.id] || ""}
                            onChange={(e) => setSimpleDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                            className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => saveSimpleScore(s.id)}
                          disabled={savingId === `simple:${s.id}`}
                          className="bg-brand-teal text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {savingId === `simple:${s.id}` ? "Saving…" : s.simple_part_b_score !== null ? "Update Score" : "Mark Done & Score"}
                        </button>
                      </div>
                    </div>
                  )
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Feedback (optional)</label>
                  <div className="flex gap-2">
                    <input
                      value={drafts[s.id]?.feedback || ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], feedback: e.target.value } }))}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => saveFeedbackOnly(s.id)}
                      disabled={savingId === s.id}
                      className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap mb-3">{s.content_text}</p>
                <div className="grid grid-cols-4 gap-3 items-start">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Grade (%)</label>
                    <input
                      type="number" min={0} max={100}
                      value={drafts[s.id]?.grade || ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], grade: e.target.value } }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Feedback</label>
                    <input
                      value={drafts[s.id]?.feedback || ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...prev[s.id], feedback: e.target.value } }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="pt-5">
                    <button
                      onClick={() => saveGrade(s.id)}
                      disabled={savingId === s.id}
                      className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50 w-full"
                    >
                      {savingId === s.id ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
