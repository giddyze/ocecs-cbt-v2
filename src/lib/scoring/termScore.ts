// Weighted cumulative term score — the single source of truth for this
// calculation. Both the student-facing summary and the teacher/admin
// gradebook call this same function, so the numbers can never disagree
// between the two views.

export interface TermExamRow {
  id: string;
  title: string;
  module_type: "CA" | "MIDTERM" | "FINAL";
  num_questions: number;
}

export interface TermAttemptRow {
  exam_id: string;
  status: "active" | "submitted" | "expired";
  score: number | null;
}

export interface TermWeights {
  ca_weight_percent: number;
  midterm_weight_percent: number;
  final_weight_percent: number;
}

export interface ComponentResult {
  examId: string;
  examTitle: string;
  score: number;
  total: number;
  percent: number;
}

export interface TermScoreResult {
  ca: ComponentResult[];
  midterm: ComponentResult | null;
  final: ComponentResult | null;
  caWeightedContribution: number;
  midtermWeightedContribution: number;
  finalWeightedContribution: number;
  runningTotal: number;
  // True only when the required exams (up to 3 CA + 1 Mid-Term + 1 Final)
  // exist for this class+subject+term AND every one of them has a
  // submitted, graded score for this student. A missing exam and an
  // un-submitted attempt are treated the same way here — both make the
  // total incomplete — since neither actually contributes a real score.
  isComplete: boolean;
  caExamCount: number;
  hasMidtermExam: boolean;
  hasFinalExam: boolean;
}

const CA_CAP = 3;

export function computeTermScore(
  examsForSubjectTerm: TermExamRow[],
  attempts: TermAttemptRow[],
  weights: TermWeights
): TermScoreResult {
  const attemptByExam = new Map(attempts.map((a) => [a.exam_id, a]));

  function toComponent(exam: TermExamRow): ComponentResult | null {
    const attempt = attemptByExam.get(exam.id);
    if (!attempt || attempt.status !== "submitted" || attempt.score === null) return null;
    const total = exam.num_questions || 1;
    return {
      examId: exam.id,
      examTitle: exam.title,
      score: attempt.score,
      total,
      percent: (attempt.score / total) * 100
    };
  }

  const caExams = examsForSubjectTerm.filter((e) => e.module_type === "CA").slice(0, CA_CAP);
  const midtermExam = examsForSubjectTerm.find((e) => e.module_type === "MIDTERM") || null;
  const finalExam = examsForSubjectTerm.find((e) => e.module_type === "FINAL") || null;

  const caComponents = caExams.map(toComponent).filter((c): c is ComponentResult => c !== null);
  const midtermComponent = midtermExam ? toComponent(midtermExam) : null;
  const finalComponent = finalExam ? toComponent(finalExam) : null;

  // CA's total weight is split evenly across however many CA exams exist
  // for this subject/term (not always 3) — a term with only 2 CAs doesn't
  // shortchange the student, it just splits the same total differently.
  const caShareCount = caExams.length || 1;
  const caAvgPercent =
    caComponents.length > 0 ? caComponents.reduce((sum, c) => sum + c.percent, 0) / caShareCount : 0;

  const caWeightedContribution = (caAvgPercent / 100) * weights.ca_weight_percent;
  const midtermWeightedContribution = midtermComponent
    ? (midtermComponent.percent / 100) * weights.midterm_weight_percent
    : 0;
  const finalWeightedContribution = finalComponent
    ? (finalComponent.percent / 100) * weights.final_weight_percent
    : 0;

  const runningTotal = caWeightedContribution + midtermWeightedContribution + finalWeightedContribution;

  const isComplete =
    caExams.length > 0 &&
    caComponents.length === caExams.length &&
    !!midtermExam &&
    !!midtermComponent &&
    !!finalExam &&
    !!finalComponent;

  return {
    ca: caComponents,
    midterm: midtermComponent,
    final: finalComponent,
    caWeightedContribution: round1(caWeightedContribution),
    midtermWeightedContribution: round1(midtermWeightedContribution),
    finalWeightedContribution: round1(finalWeightedContribution),
    runningTotal: round1(runningTotal),
    isComplete,
    caExamCount: caExams.length,
    hasMidtermExam: !!midtermExam,
    hasFinalExam: !!finalExam
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
