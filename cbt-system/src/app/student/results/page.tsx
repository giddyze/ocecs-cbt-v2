"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function StudentResultsPage() {
  return (
    <Suspense fallback={null}>
      <StudentResultsContent />
    </Suspense>
  );
}

function StudentResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const score = Number(params.get("score") || 0);
  const total = Number(params.get("total") || 0);
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passingScore = Number(params.get("passingScore") || 50);
  const passed = pct >= passingScore;

  const name = params.get("name") || "";
  const photo = params.get("photo") || "";
  const studentClass = params.get("class") || "";
  const subject = params.get("subject") || "";
  const term = params.get("term") || "";

  // Score reveal counts up from 0 rather than appearing instantly — a
  // deliberate "moment" for the result, not just a printed number.
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (score === 0) return;
    const durationMs = 700;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplayScore(Math.round(progress * score));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fadeIn">
        {/* Identity header — same bold-photo pattern as the exam-taking screen */}
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="relative flex-none">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-brand-coral shadow-sm bg-slate-100 flex items-center justify-center">
              {photo ? (
                <Image src={photo} alt={name || "Student"} width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <span className="text-xl font-extrabold text-brand-coral">{(name || "S").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white shadow ring-1 ring-black/5 p-0.5">
              <Image src="/logo.png" alt="OCECS" width={16} height={16} className="object-contain rounded-full" />
            </div>
          </div>
          <div className="min-w-0">
            {name && (
              <p className="font-extrabold text-brand-navy text-lg sm:text-xl uppercase tracking-wide truncate leading-tight">
                {name}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {studentClass && (
                <span className="text-[11px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {studentClass}
                </span>
              )}
              {subject && (
                <span className="text-[11px] font-bold uppercase tracking-wide bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full">
                  {subject}
                </span>
              )}
              {term && (
                <span className="text-[11px] font-bold uppercase tracking-wide bg-brand-gold/15 text-brand-navy px-2 py-0.5 rounded-full">
                  {term}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div
            className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 animate-springIn ${
              passed ? "bg-emerald-100" : "bg-red-100"
            }`}
          >
            {passed ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            ) : (
              <XCircle className="w-7 h-7 text-red-500" />
            )}
          </div>

          <p className="text-sm text-slate-500 mb-1">Exam submitted</p>
          <p className="text-5xl font-black text-brand-navy mb-2 tabular-nums">
            {displayScore}/{total}
          </p>
          <p className={`font-semibold mb-1 ${passed ? "text-emerald-600" : "text-red-500"}`}>
            {pct}% {passed ? "— Passed" : "— Below passing score"}
          </p>
          <p className="text-xs text-slate-400 mb-6">Passing score: {passingScore}%</p>

          <button
            onClick={() => router.push("/student/dashboard")}
            className="w-full flex items-center justify-center gap-1.5 bg-brand-navy text-white rounded-lg py-2.5 font-semibold hover:bg-brand-navyDeep transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Exams
          </button>
        </div>
      </div>
    </main>
  );
}
