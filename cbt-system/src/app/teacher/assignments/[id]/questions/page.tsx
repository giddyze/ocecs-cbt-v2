"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, ListChecks, PenLine, X, UploadCloud } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

const RUBRIC_STARTERS = ["Content Accuracy", "Clarity & Structure", "Use of Subject Vocabulary"];

interface CriterionRow { id: string; criterion_name: string; max_points: number; }
interface QuestionRow {
  id: string;
  part: "A" | "B";
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
  rubric_criteria: CriterionRow[];
}

export default function TeacherAssignmentQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gradingMode, setGradingMode] = useState<"rubric" | "simple">("rubric");
  const [partBMaxScore, setPartBMaxScore] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [part, setPart] = useState<"A" | "B">("A");
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [criteria, setCriteria] = useState<{ name: string; maxPoints: number }[]>(
    RUBRIC_STARTERS.map((name) => ({ name, maxPoints: 10 }))
  );
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/teacher/assignments/${id}/questions`).then((r) => r.json()),
      fetch(`/api/teacher/assignments/${id}`).then((r) => r.json())
    ]).then(([q, a]) => {
      setQuestions(q.questions || []);
      if (a.assignment) {
        setAssignmentTitle(a.assignment.title);
        setGradingMode(a.assignment.part_b_grading_mode || "rubric");
        setPartBMaxScore(a.assignment.part_b_max_score?.toString() || "");
      }
    }).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function saveGradingSettings() {
    setSavingSettings(true);
    await fetch(`/api/teacher/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partBGradingMode: gradingMode,
        partBMaxScore: gradingMode === "simple" && partBMaxScore ? Number(partBMaxScore) : null
      })
    });
    setSavingSettings(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }

  async function addQuestion() {
    setError("");
    if (!questionText.trim()) { setError("Question text is required."); return; }
    if (part === "A") {
      const filledOptions = options.filter((o) => o.trim());
      if (filledOptions.length < 2) { setError("Add at least 2 options."); return; }
      if (!correctAnswer) { setError("Select the correct answer."); return; }
    } else if (gradingMode === "rubric") {
      if (criteria.some((c) => !c.name.trim() || c.maxPoints <= 0)) {
        setError("Every rubric criterion needs a name and a max points value above 0.");
        return;
      }
    }
    setSaving(true);
    const res = await fetch(`/api/teacher/assignments/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        part === "A"
          ? { part, questionText, options: options.filter((o) => o.trim()), correctAnswer }
          : { part, questionText, criteria: gradingMode === "rubric" ? criteria : undefined }
      )
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not add question."); return; }
    setQuestionText(""); setOptions(["", "", "", ""]); setCorrectAnswer("");
    setCriteria(RUBRIC_STARTERS.map((name) => ({ name, maxPoints: 10 })));
    load();
  }

  // Same block format as exam bulk upload: question text, then an
  // "A) x / B) y / C) z / D) w" options line, then "Correct: <letter>",
  // blocks separated by a blank line.
  function parseBulkBlock(block: string) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;
    const questionText = lines[0];
    const optionsLine = lines[1];
    const correctLine = lines[2];

    const optionMatches = [...optionsLine.matchAll(/[A-D]\)\s*([^/]+)/g)].map((m) => m[1].trim());
    if (optionMatches.length < 2) return null;

    const correctMatch = correctLine.match(/Correct:\s*([A-D])/i);
    if (!correctMatch) return null;
    const correctIndex = correctMatch[1].toUpperCase().charCodeAt(0) - 65;
    if (correctIndex < 0 || correctIndex >= optionMatches.length) return null;

    return { questionText, options: optionMatches, correctIndex };
  }

  async function saveBulk() {
    const blocks = bulkText.trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const parsed = blocks.map(parseBulkBlock).filter(Boolean);
    if (parsed.length === 0) { setError("Couldn't parse any questions — check the format matches the example."); return; }

    setBulkSaving(true);
    setError("");
    const res = await fetch(`/api/teacher/assignments/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: parsed })
    });
    const data = await res.json();
    setBulkSaving(false);
    if (!res.ok) { setError(data.error || "Bulk upload failed."); return; }
    setBulkText("");
    load();
  }

  async function deleteQuestion(questionId: string) {
    await fetch(`/api/teacher/assignments/${id}/questions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId })
    });
    load();
  }

  const partA = questions.filter((q) => q.part === "A");
  const partB = questions.filter((q) => q.part === "B");

  return (
    <div>
      <Breadcrumb items={[{ label: "Assignments", href: "/teacher/assignments" }, { label: assignmentTitle || "Questions" }]} />
      <h1 className="text-2xl font-extrabold text-brand-navy uppercase tracking-wide leading-none mb-1">
        {assignmentTitle || "Assignment Questions"}
      </h1>
      <div className="w-10 h-1 bg-brand-teal rounded-full mt-2 mb-6" />
      <p className="text-xs text-slate-400 mb-4">
        Use only Part A, only Part B, or both — a student sees whichever parts have questions.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 max-w-xl">
        <p className="text-sm font-semibold text-brand-navy mb-3">Part B grading style</p>
        <div className="flex gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 flex-1 cursor-pointer has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5 transition-colors">
            <input type="radio" checked={gradingMode === "rubric"} onChange={() => setGradingMode("rubric")} />
            <span>Rubric — score each criterion separately</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 flex-1 cursor-pointer has-[:checked]:border-brand-coral has-[:checked]:bg-brand-coral/5 transition-colors">
            <input type="radio" checked={gradingMode === "simple"} onChange={() => setGradingMode("simple")} />
            <span>Simple — one overall score after review</span>
          </label>
        </div>
        {gradingMode === "simple" && (
          <div className="mb-3">
            <label className="block text-xs text-slate-500 mb-1">Part B total points (e.g. 30)</label>
            <input
              type="number" min={1}
              value={partBMaxScore}
              onChange={(e) => setPartBMaxScore(e.target.value)}
              className="w-32 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">
              Simple mode suits handwritten or photo-submitted work — you review it as a whole and give one mark,
              rather than scoring each rubric criterion individually.
            </p>
          </div>
        )}
        <button
          onClick={saveGradingSettings}
          disabled={savingSettings}
          className="bg-brand-navy text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50"
        >
          {savingSettings ? "Saving…" : settingsSaved ? "Saved" : "Save Setting"}
        </button>
      </div>

      {/* Existing questions */}
      <div className="space-y-4 mb-8">
        {loading && <p className="text-slate-400 text-sm">Loading…</p>}

        {partA.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-brand-navy mb-3 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-brand-teal" /> Part A — Multiple Choice ({partA.length})
            </p>
            <div className="space-y-3">
              {partA.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <div>
                    <p className="text-sm text-slate-700">{i + 1}. {q.question_text}</p>
                    <p className="text-xs text-emerald-600 mt-1">Correct: {q.correct_answer}</p>
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600 flex-none">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {partB.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm font-semibold text-brand-navy mb-3 flex items-center gap-1.5">
              <PenLine className="w-4 h-4 text-brand-coral" /> Part B — Theory ({partB.length})
            </p>
            <div className="space-y-3">
              {partB.map((q, i) => (
                <div key={q.id} className="flex items-start justify-between gap-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <div>
                    <p className="text-sm text-slate-700">{i + 1}. {q.question_text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {q.rubric_criteria.map((c) => (
                        <span key={c.id} className="text-[11px] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                          {c.criterion_name} ({c.max_points}pt)
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600 flex-none">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add question form */}
      <div className="bg-white rounded-xl shadow-sm p-5 max-w-xl">
        <p className="text-sm font-semibold text-brand-navy mb-3">Add a question</p>
        <div className="flex gap-3 mb-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 flex-1 cursor-pointer has-[:checked]:border-brand-teal has-[:checked]:bg-brand-teal/5 transition-colors">
            <input type="radio" checked={part === "A"} onChange={() => setPart("A")} /> Part A (MCQ)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 border border-slate-300 rounded-lg px-3 py-2 flex-1 cursor-pointer has-[:checked]:border-brand-coral has-[:checked]:bg-brand-coral/5 transition-colors">
            <input type="radio" checked={part === "B"} onChange={() => setPart("B")} /> Part B (Theory)
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={2}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4"
        />

        {part === "A" ? (
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium text-slate-700">Options (select the correct one)</label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={correctAnswer === opt && !!opt}
                  onChange={() => setCorrectAnswer(opt)}
                  disabled={!opt.trim()}
                />
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                    if (correctAnswer === opt) setCorrectAnswer(e.target.value);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
        ) : gradingMode === "rubric" ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rubric criteria — starter suggestions below, rename or remove freely
            </label>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => {
                      const next = [...criteria];
                      next[i] = { ...next[i], name: e.target.value };
                      setCriteria(next);
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={c.maxPoints}
                    onChange={(e) => {
                      const next = [...criteria];
                      next[i] = { ...next[i], maxPoints: Number(e.target.value) };
                      setCriteria(next);
                    }}
                    className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <span className="text-xs text-slate-400">pts</span>
                  <button onClick={() => setCriteria(criteria.filter((_, ci) => ci !== i))} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCriteria([...criteria, { name: "", maxPoints: 10 }])}
              className="text-xs text-brand-teal font-semibold mt-2 hover:underline"
            >
              + Add another criterion
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-4">
            This assignment uses simple grading — no rubric needed here. You'll give one overall score for the
            whole Part B section when grading submissions.
          </p>
        )}

        {error && <p className="text-sm text-red-600 mb-3 animate-shake">{error}</p>}
        <button
          onClick={addQuestion}
          disabled={saving}
          className="flex items-center gap-1.5 bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {saving ? "Adding…" : "Add Question"}
        </button>
      </div>

      {part === "A" && (
        <div className="bg-white rounded-xl shadow-sm p-5 max-w-xl mt-4">
          <p className="text-sm font-semibold text-brand-navy mb-2 flex items-center gap-1.5">
            <UploadCloud className="w-4 h-4 text-brand-teal" /> Bulk upload multiple choice questions
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Same format as CA/Mid-Term/Final exams — paste multiple questions at once, separated by a blank line:
          </p>
          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 mb-3 whitespace-pre-wrap">
{`What is the capital of Nigeria?
A) Lagos / B) Abuja / C) Kano / D) Ibadan
Correct: B

2 + 2 = ?
A) 3 / B) 4 / C) 5 / D) 6
Correct: B`}
          </pre>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            placeholder="Paste your questions here…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 font-mono"
          />
          <button
            onClick={saveBulk}
            disabled={bulkSaving}
            className="bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {bulkSaving ? "Uploading…" : "Upload All"}
          </button>
        </div>
      )}
    </div>
  );
}
