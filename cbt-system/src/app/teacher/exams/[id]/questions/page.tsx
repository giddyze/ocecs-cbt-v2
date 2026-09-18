"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
}
interface ExamMeta {
  id: string;
  title: string;
  num_questions: number;
  status: "draft" | "published" | "hidden" | "closed";
}

export default function TeacherQuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<ExamMeta | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Single question form
  const [qText, setQText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Bulk upload
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/teacher/exams/${id}/questions`).then((r) => r.json()),
      fetch(`/api/teacher/exams/${id}`).then((r) => r.json())
    ])
      .then(([q, e]) => {
        setQuestions(q.questions || []);
        if (e.exam) setExam(e.exam);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function saveAsDraft() {
    setSavingDraft(true);
    setError(""); setInfo("");
    const res = await fetch(`/api/teacher/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" })
    });
    setSavingDraft(false);
    if (!res.ok) { setError("Could not save draft."); return; }
    setInfo("Saved as draft. Your questions are safe — come back anytime to finish.");
    load();
  }

  async function completeAndPublish() {
    if (!exam) return;
    setError(""); setInfo("");
    const shortfall = exam.num_questions - questions.length;
    if (shortfall > 0) {
      setError(
        `This exam needs ${exam.num_questions} questions but only ${questions.length} ${questions.length === 1 ? "has" : "have"} been added — add ${shortfall} more before publishing.`
      );
      return;
    }
    if (shortfall < 0) {
      setError(
        `This exam has ${questions.length} questions but was set up for ${exam.num_questions} — remove ${-shortfall} before publishing, or ask an admin to adjust the target.`
      );
      return;
    }
    setPublishing(true);
    const res = await fetch(`/api/teacher/exams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" })
    });
    setPublishing(false);
    if (!res.ok) { setError("Could not publish."); return; }
    setInfo("Published! Students in the assigned class can now see this exam.");
    load();
  }

  async function saveOne(e: React.FormEvent) {
    e.preventDefault();
    if (options.some((o) => !o.trim())) { setError("Fill in all four options."); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/teacher/exams/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionText: qText, options, correctIndex })
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Could not save question."); return; }
    setQText(""); setOptions(["", "", "", ""]); setCorrectIndex(0);
    load();
  }

  function parseBulkBlock(block: string) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;
    const questionText = lines[0];
    const optLine = lines[1];
    const correctLine = lines.find((l) => /^correct\s*:/i.test(l));
    if (!correctLine) return null;
    const matches = [...optLine.matchAll(/[A-D]\)\s*([^/]+?)(?=\s*\/\s*[A-D]\)|$)/g)].map((m) => m[1].trim());
    if (matches.length !== 4) return null;
    const letter = correctLine.split(":")[1].trim().toUpperCase();
    const idx = ["A", "B", "C", "D"].indexOf(letter);
    if (idx === -1) return null;
    return { questionText, options: matches, correctIndex: idx };
  }

  async function saveBulk() {
    const blocks = bulkText.trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const parsed = blocks.map(parseBulkBlock).filter(Boolean);
    if (parsed.length === 0) { setError("Could not read any questions — check the format shown below."); return; }
    setBulkSaving(true);
    setError("");
    const res = await fetch(`/api/teacher/exams/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: parsed })
    });
    const data = await res.json();
    setBulkSaving(false);
    if (!res.ok) { setError(data.error || "Bulk upload failed."); return; }
    setInfo(`Uploaded ${data.saved} question${data.saved === 1 ? "" : "s"}${data.skipped ? `, skipped ${data.skipped}` : ""}.`);
    setBulkText("");
    load();
  }

  async function deleteQuestion(qId: string) {
    // No dedicated DELETE route yet for a single question by id at this path;
    // reuse questions endpoint filtering isn't wired for delete-by-id here,
    // so this calls a generic delete route.
    await fetch(`/api/teacher/questions/${qId}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Exams", href: "/teacher/exams" },
          { label: exam?.title || "Questions" }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">
            {exam?.title || "Question Bank"}
          </h1>
          <div className="w-10 h-1 bg-brand-teal rounded-full mt-2" />
        </div>
        {exam && (
          <div className="flex items-center gap-2">
            <button
              onClick={saveAsDraft}
              disabled={savingDraft || publishing}
              className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save as Draft
            </button>
            <button
              onClick={completeAndPublish}
              disabled={savingDraft || publishing}
              className="flex items-center gap-1.5 bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete &amp; Publish
            </button>
          </div>
        )}
      </div>
      {exam && (
        <p className="text-xs text-slate-400 mb-6">
          {questions.length} of {exam.num_questions} questions added
          {exam.status === "published" && <span className="text-emerald-600 font-semibold"> · Published</span>}
        </p>
      )}

      {error && <p className="text-sm text-red-600 mb-3 animate-shake">{error}</p>}
      {info && <p className="text-sm text-emerald-600 mb-3 animate-fadeIn">{info}</p>}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <form onSubmit={saveOne} className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-brand-navy">Upload a question</h2>
          <textarea required value={qText} onChange={(e) => setQText(e.target.value)} rows={2} placeholder="Question text" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                required
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((o, oi) => (oi === i ? e.target.value : o)))}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
              />
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                Correct
              </label>
            </div>
          ))}
          <button disabled={saving} className="bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving…" : "Save Question"}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-brand-navy">Upload several at once</h2>
          <p className="text-xs text-slate-500">
            One question per block, separated by a blank line:<br />
            Question text<br />
            A) option / B) option / C) option / D) option<br />
            Correct: B
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            placeholder={"What is the capital of Nigeria?\nA) Lagos / B) Abuja / C) Kano / D) Ibadan\nCorrect: B"}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs"
          />
          <button onClick={saveBulk} disabled={bulkSaving} className="bg-brand-teal text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {bulkSaving ? "Uploading…" : "Upload All"}
          </button>
        </div>
      </div>

      <h2 className="font-semibold text-brand-navy mb-3">Saved Questions ({questions.length})</h2>
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex justify-between">
              <p className="font-medium text-slate-800">{i + 1}. {q.question_text}</p>
              <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
            <div className="mt-2 space-y-1">
              {q.options.map((o, oi) => (
                <p key={oi} className={`text-sm ${oi === q.correct_index ? "text-emerald-600 font-semibold" : "text-slate-500"}`}>
                  {String.fromCharCode(65 + oi)}. {o} {oi === q.correct_index && "✓"}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
