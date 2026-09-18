-- =============================================================================
-- OCECS CBT — Migration v9: Photo answers + simple Part B grading mode
-- Purely additive. Existing rubric-graded assignments are unaffected —
-- part_b_grading_mode defaults to 'rubric', which is exactly today's
-- behavior with no change.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Per-assignment choice: grade Part B via rubric criteria (existing,
-- unchanged default) or via one holistic score the teacher enters after
-- reviewing the student's work — a simpler flow for cases like handwritten
-- photo submissions where per-criterion breakdown isn't wanted. This is a
-- teacher decision made once per assignment, not per question.
-- -----------------------------------------------------------------------------
alter table assignments add column if not exists part_b_grading_mode text not null default 'rubric'
  check (part_b_grading_mode in ('rubric', 'simple'));

-- Total points possible for the whole Part B section, used only in
-- 'simple' mode (rubric mode already derives its total from criteria
-- max_points, so this stays null there).
alter table assignments add column if not exists part_b_max_score int;

-- -----------------------------------------------------------------------------
-- Photo answers, alongside (not instead of) typed text answers — a student
-- can submit both for the same question, since some theory questions
-- inherently need an image (a diagram, a traced chart) regardless of
-- whether there's also written explanation.
-- { question_id: storage_path } — uploaded to the existing private
-- 'assignment-files' bucket (created in migration_v2, not previously wired
-- up to any upload flow).
-- -----------------------------------------------------------------------------
alter table assignment_submissions add column if not exists answer_photos jsonb not null default '{}'::jsonb;

-- One holistic score for the entire Part B section, used only when the
-- assignment's part_b_grading_mode is 'simple'. Null = not yet graded —
-- same "incomplete until graded" rule used everywhere else in this app.
alter table assignment_submissions add column if not exists simple_part_b_score int;
