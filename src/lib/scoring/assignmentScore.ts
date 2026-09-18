// Single source of truth for combining Part A (auto-graded MCQ) and Part B
// (rubric-graded theory) into one score. Used by the submit route (to
// auto-grade Part A immediately) and by both the teacher grading view and
// the student breakdown view (so the numbers can't disagree).

// Generic starter rubric suggestions — a starting point the teacher renames
// or deletes, never auto-applied based on the subject.
export const RUBRIC_STARTERS = ["Content Accuracy", "Clarity & Structure", "Use of Subject Vocabulary"];

export interface AssignmentQuestionRow {
  id: string;
  part: "A" | "B";
  question_text: string;
  options: string[] | null;
  correct_answer: string | null;
}

export interface RubricCriterionRow {
  id: string;
  assignment_question_id: string;
  criterion_name: string;
  max_points: number;
}

export interface PartBQuestionBreakdown {
  questionId: string;
  questionText: string;
  criteria: { criterionId: string; name: string; maxPoints: number; pointsAwarded: number | null }[];
  earned: number;
  possible: number;
  isGraded: boolean; // every criterion for this question has a saved score
}

export interface AssignmentScoreResult {
  partATotal: number;
  partAScore: number;
  gradingMode: "rubric" | "simple";
  partBQuestions: PartBQuestionBreakdown[]; // empty in simple mode
  partBEarned: number;
  partBPossible: number;
  simplePartBScore: number | null; // only meaningful in simple mode
  combinedEarned: number;
  combinedPossible: number;
  combinedPercent: number | null; // null until fully graded — never show a partial as final
  isFullyGraded: boolean;
}

// Part A: exact-match against correct_answer, one point each. Same rule
// exam questions already use — no partial credit, no fuzzy matching.
export function gradePartA(
  questions: Pick<AssignmentQuestionRow, "id" | "part" | "correct_answer">[],
  answers: Record<string, string>
) {
  const partAQuestions = questions.filter((q) => q.part === "A");
  let score = 0;
  for (const q of partAQuestions) {
    if (answers[q.id] !== undefined && answers[q.id] === q.correct_answer) score += 1;
  }
  return { score, total: partAQuestions.length };
}

export function computeAssignmentScore(
  questions: AssignmentQuestionRow[],
  criteria: RubricCriterionRow[],
  storedPartAScore: number | null,
  rubricScores: Record<string, Record<string, number>>,
  gradingMode: "rubric" | "simple" = "rubric",
  simplePartBScore: number | null = null,
  partBMaxScore: number | null = null
): AssignmentScoreResult {
  const partAQuestions = questions.filter((q) => q.part === "A");
  const partBQuestions = questions.filter((q) => q.part === "B");
  const partATotal = partAQuestions.length;
  const partAScore = storedPartAScore ?? 0;

  // Simple mode: one holistic Part B score the teacher enters after
  // reviewing the student's work as a whole — no per-criterion breakdown.
  if (gradingMode === "simple") {
    const partBPossible = partBQuestions.length > 0 ? partBMaxScore ?? 0 : 0;
    const partBEarned = simplePartBScore ?? 0;
    const combinedEarned = partAScore + partBEarned;
    const combinedPossible = partATotal + partBPossible;
    // Fully graded: no Part B questions at all, or a score has actually
    // been entered. Same "incomplete until graded" rule as rubric mode.
    const isFullyGraded = partBQuestions.length === 0 || simplePartBScore !== null;

    return {
      partATotal,
      partAScore,
      gradingMode,
      partBQuestions: [],
      partBEarned,
      partBPossible,
      simplePartBScore,
      combinedEarned,
      combinedPossible,
      combinedPercent: isFullyGraded && combinedPossible > 0 ? Math.round((combinedEarned / combinedPossible) * 100) : null,
      isFullyGraded
    };
  }

  const criteriaByQuestion = new Map<string, RubricCriterionRow[]>();
  for (const c of criteria) {
    const list = criteriaByQuestion.get(c.assignment_question_id) || [];
    list.push(c);
    criteriaByQuestion.set(c.assignment_question_id, list);
  }

  const partBBreakdown: PartBQuestionBreakdown[] = partBQuestions.map((q) => {
    const qCriteria = criteriaByQuestion.get(q.id) || [];
    const savedForQuestion = rubricScores[q.id] || {};
    const criteriaResults = qCriteria.map((c) => ({
      criterionId: c.id,
      name: c.criterion_name,
      maxPoints: c.max_points,
      pointsAwarded: savedForQuestion[c.id] ?? null
    }));
    const isGraded = qCriteria.length > 0 && criteriaResults.every((c) => c.pointsAwarded !== null);
    const earned = criteriaResults.reduce((sum, c) => sum + (c.pointsAwarded ?? 0), 0);
    const possible = qCriteria.reduce((sum, c) => sum + c.max_points, 0);
    return { questionId: q.id, questionText: q.question_text, criteria: criteriaResults, earned, possible, isGraded };
  });

  const partBEarned = partBBreakdown.reduce((sum, q) => sum + q.earned, 0);
  const partBPossible = partBBreakdown.reduce((sum, q) => sum + q.possible, 0);

  const combinedEarned = partAScore + partBEarned;
  const combinedPossible = partATotal + partBPossible;

  // Fully graded means: Part A has already been auto-scored (always true
  // once submitted) AND every Part B question has every one of its
  // criteria scored. A partially-graded submission never gets a percent —
  // same "incomplete until everything's in" rule used for term scores.
  const isFullyGraded = partBBreakdown.every((q) => q.isGraded);

  return {
    partATotal,
    partAScore,
    gradingMode,
    partBQuestions: partBBreakdown,
    partBEarned,
    partBPossible,
    simplePartBScore: null,
    combinedEarned,
    combinedPossible,
    combinedPercent: isFullyGraded && combinedPossible > 0 ? Math.round((combinedEarned / combinedPossible) * 100) : null,
    isFullyGraded
  };
}
