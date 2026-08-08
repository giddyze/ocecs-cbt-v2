-- =============================================================================
-- OCECS CBT — Migration v6: Part A (MCQ) / Part B (rubric-graded theory)
-- assignment restructure. Purely additive — existing columns on
-- assignment_submissions (content_text, grade, feedback) are left in place
-- untouched. Old submissions made before this migration keep whatever they
-- have; there is no automatic conversion into the new per-question format,
-- since there is no way to infer question structure retroactively from
-- free text. New assignments use the new flow described below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Assignment questions — either Part A (MCQ) or Part B (theory).
--    Part A uses options/correct_answer, same shape as exam questions.
--    Part B has neither — it's graded via rubric_criteria instead of a
--    single stored answer key.
-- -----------------------------------------------------------------------------
create table if not exists assignment_questions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  part text not null check (part in ('A', 'B')),
  question_text text not null,
  options jsonb,           -- Part A only: array of option strings
  correct_answer text,     -- Part A only: exact-match correct option
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_assignment_questions_assignment on assignment_questions(assignment_id);

-- -----------------------------------------------------------------------------
-- 2. Rubric criteria — one row per scoring criterion, belongs to a single
--    Part B question. A Part B question with 3 criteria is graded across
--    all 3, not with one combined number.
-- -----------------------------------------------------------------------------
create table if not exists rubric_criteria (
  id uuid primary key default uuid_generate_v4(),
  assignment_question_id uuid not null references assignment_questions(id) on delete cascade,
  criterion_name text not null,
  max_points int not null check (max_points > 0),
  display_order int not null default 0
);
create index if not exists idx_rubric_criteria_question on rubric_criteria(assignment_question_id);

-- -----------------------------------------------------------------------------
-- 3. Structured answers and scores on submissions, additive alongside the
--    existing content_text/grade/feedback columns.
--    answers: { question_id: answer } — Part A selected option text, Part B
--             free-text response. Mirrors exam_attempts.answers.
--    part_a_score: auto-computed at submission time, immutable after that.
--    rubric_scores: { question_id: { criterion_id: points_awarded } },
--                    filled in by the teacher during grading, can be saved
--                    incrementally as they go.
-- -----------------------------------------------------------------------------
alter table assignment_submissions add column if not exists answers jsonb not null default '{}'::jsonb;
alter table assignment_submissions add column if not exists part_a_score int;
alter table assignment_submissions add column if not exists rubric_scores jsonb not null default '{}'::jsonb;
