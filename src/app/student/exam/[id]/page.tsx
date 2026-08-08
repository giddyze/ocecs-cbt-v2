"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Flag, Timer, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  options: string[];
}
interface ExamMeta {
  id: string;
  title: string;
  instructions: string;
  durationMinutes: number;
  module: "CA" | "MIDTERM" | "FINAL";
  passingScore: number;
  subject: string | null;
  class: string | null;
  term: string | null;
  session: string | null;
}
interface StudentInfo {
  fullName: string | null;
  username: string;
  photoUrl: string | null;
  admissionNo: string | null;
}

const MODULE_LABELS: Record<ExamMeta["module"], string> = {
  CA: "Continuous Assessment",
  MIDTERM: "Mid-Term Exam",
  FINAL: "Final Exam"
};

// Color-coded chip — each category gets its own consistent color so the
// card reads as scannable categories, not a wall of identical gray pills.
const CHIP_COLORS = {
  slate: "bg-slate-100 text-slate-600",
  teal: "bg-brand-teal/10 text-brand-teal",
  coral: "bg-brand-coral/10 text-brand-coral",
  gold: "bg-brand-gold/15 text-brand-navy",
  navy: "bg-brand-navy/10 text-brand-navy",
  orange: "bg-brand-orange/10 text-brand-orange",
  emerald: "bg-emerald-100 text-emerald-700"
} as const;

function Chip({ label, value, color }: { label: string; value: string; color: keyof typeof CHIP_COLORS }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${CHIP_COLORS[color]}`}>
      <span className="opacity-60 font-semibold">{label}:</span> {value}
    </span>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamTakingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [exam, setExam] = useState<ExamMeta | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const answersRef = useRef(answers);
  const flaggedRef = useRef(flagged);
  answersRef.current = answers;
  flaggedRef.current = flagged;

  const submitExam = useCallback(async () => {
    setSubmitting(true);
    const res = await fetch(`/api/exams/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersRef.current })
    });
    const data = await res.json();
    if (res.ok) {
      const params = new URLSearchParams({
        examId: id,
        score: String(data.score),
        total: String(data.totalQuestions),
        name: student?.fullName || student?.username || "",
        photo: student?.photoUrl || "",
        class: exam?.class || "",
        subject: exam?.subject || "",
        term: exam?.term || "",
        passingScore: String(exam?.passingScore ?? 50)
      });
      router.push(`/student/results?${params.toString()}`);
    } else {
      setError(data.error || "Could not submit.");
      setSubmitting(false);
    }
  }, [id, router, student, exam]);

  // Load / resume the attempt
  useEffect(() => {
    fetch(`/api/exams/${id}/start`, { method: "POST" }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load this exam.");
        setLoading(false);
        return;
      }
      setExam(data.exam);
      setStudent(data.student);
      setQuestions(data.questions);
      setAnswers(data.savedAnswers || {});
      setFlagged(new Set(data.savedFlags || []));
      setRemaining(data.remainingSeconds);
      setLoading(false);
    });
  }, [id]);

  // Countdown — purely visual; the server re-derives the real remaining time
  // on every autosave call, so a paused tab or slow client can't gain time.
  useEffect(() => {
    if (loading || !exam) return;
    if (remaining <= 0) { submitExam(); return; }
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [loading, exam, remaining, submitExam]);

  // Autosave every 5s and whenever answers change
  useEffect(() => {
    if (loading || !exam) return;
    const save = () => {
      fetch(`/api/exams/${id}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current, flagged: Array.from(flaggedRef.current) })
      }).then(async (res) => {
        if (res.status === 403) {
          const data = await res.json();
          if (data.expired) submitExam();
        } else if (res.ok) {
          const data = await res.json();
          setRemaining(data.remainingSeconds);
        }
      });
    };
    const interval = setInterval(save, 5000);
    return () => clearInterval(interval);
  }, [id, loading, exam, submitExam]);

  function selectAnswer(qId: string, optIndex: number) {
    setAnswers((prev) => ({ ...prev, [qId]: optIndex }));
  }
  function toggleFlag(qId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(qId) ? next.delete(qId) : next.add(qId);
      return next;
    });
  }

  if (loading) return <CenteredMessage text="Loading exam…" />;
  if (error) return <CenteredMessage text={error} isError />;
  if (!exam || questions.length === 0) return <CenteredMessage text="No questions available." />;

  const q = questions[index];
  const isLow = remaining <= 60;
  const unansweredCount = questions.filter((qq) => answers[qq.id] === undefined).length;

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Exam Information Card — scrolls with the page; the timer bar below
          stays pinned on its own via `sticky top-0`, completely untouched
          by this redesign: same position, width, and red/pulse low-time
          behavior as before. This card is static reference info; the
          timer's live countdown is a distinct, deliberately separate
          element so its behavior can never be accidentally affected by
          changes here. */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 px-5 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-none">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-brand-coral shadow-sm bg-slate-100 flex items-center justify-center">
                {student?.photoUrl ? (
                  <Image src={student.photoUrl} alt={student.fullName || "Student"} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-2xl font-extrabold text-brand-coral">
                    {(student?.fullName || student?.username || "S").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white shadow ring-1 ring-black/5 p-0.5">
                <Image src="/logo.png" alt="OCECS" width={20} height={20} className="object-contain rounded-full" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-brand-navy text-lg sm:text-xl uppercase tracking-wide truncate leading-tight">
                {student?.fullName || student?.username || "Student"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{exam.title}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip label="Student ID" value={student?.admissionNo || student?.username || "—"} color="slate" />
            {exam.class && <Chip label="Class" value={exam.class} color="navy" />}
            {exam.subject && <Chip label="Subject" value={exam.subject} color="teal" />}
            {exam.session && <Chip label="Session" value={exam.session} color="gold" />}
            {exam.term && <Chip label="Term" value={exam.term} color="orange" />}
            <Chip label="Type" value={MODULE_LABELS[exam.module]} color="coral" />
            <Chip label="Duration" value={`${exam.durationMinutes} min`} color="slate" />
            <Chip label="Status" value="In Progress" color="emerald" />
          </div>
        </div>
      </div>

      <div
        className={`sticky top-0 z-10 text-white py-3 font-bold text-lg flex items-center justify-center gap-2 relative mt-4 ${isLow ? "bg-red-600" : "bg-brand-navy"}`}
      >
        <Timer className={`w-5 h-5 ${isLow ? "animate-pulse" : ""}`} /> {formatTime(remaining)} remaining

        {/* Unanswered-question indicator — overlaid, does not affect the
            timer's own centering, width, or low-time color/pulse state. */}
        {unansweredCount > 0 && (
          <span
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-amber-400 text-brand-navyDeep text-xs font-extrabold px-2 sm:px-2.5 py-1 rounded-full shadow-sm"
            aria-label={`${unansweredCount} question${unansweredCount === 1 ? "" : "s"} not yet answered`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            {unansweredCount}
            <span className="hidden sm:inline">&nbsp;unanswered</span>
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-6">
          <div
            className="bg-brand-gold h-1.5 rounded-full transition-all"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-500">
              Question {index + 1} of {questions.length}
            </p>
            <button
              onClick={() => toggleFlag(q.id)}
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors ${
                flagged.has(q.id) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${flagged.has(q.id) ? "fill-amber-500" : ""}`} />
              {flagged.has(q.id) ? "Marked for review" : "Mark for review"}
            </button>
          </div>
          <h2 className="text-lg font-semibold text-brand-navy mb-4">{q.question_text}</h2>

          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label
                key={oi}
                className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                  answers[q.id] === oi ? "border-brand-gold bg-amber-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.id}`}
                  checked={answers[q.id] === oi}
                  onChange={() => selectAnswer(q.id, oi)}
                />
                <span>
                  {String.fromCharCode(65 + oi)}. {opt}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex gap-2 items-center">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-125 ${
                  i === index
                    ? "bg-brand-navy ring-2 ring-offset-2 ring-brand-navy/30"
                    : answers[qq.id] !== undefined
                    ? "bg-brand-teal"
                    : "bg-slate-300"
                } ${flagged.has(qq.id) ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
                aria-label={`Question ${i + 1}`}
              />
            ))}
          </div>
          {index === questions.length - 1 ? (
            <button
              onClick={submitExam}
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand-navy text-white font-semibold disabled:opacity-50 hover:bg-brand-navyDeep transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Submitting…" : "Submit Exam"}
            </button>
          ) : (
            <button
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="flex items-center gap-1 px-5 py-2 rounded-lg bg-brand-teal text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function CenteredMessage({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <p className={`text-center ${isError ? "text-red-600" : "text-slate-500"}`}>{text}</p>
    </main>
  );
}
