-- =============================================================================
-- OCECS CBT — Migration v4: Exam publish timestamp + due date
-- Purely additive. Does not touch, rename, or drop any existing table,
-- column, policy, or auth mechanism. Safe to run on your existing project.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Publish timestamp
-- Set automatically by the API the first time an exam's status changes to
-- 'published' — never set directly by the client. Distinct from
-- scheduled_date, which already existed and controls when a published exam
-- becomes visible to students; published_at simply records when publishing
-- itself happened, for display on the teacher dashboard.
-- -----------------------------------------------------------------------------
alter table exams add column if not exists published_at timestamptz;

-- -----------------------------------------------------------------------------
-- Due date
-- Optional deadline set by the teacher. When set and passed, the API blocks
-- students from STARTING a new attempt (mirrors the existing overdue logic
-- for assignments). It does not affect an attempt already in progress —
-- that attempt's own duration_minutes timer still governs it independently.
-- -----------------------------------------------------------------------------
alter table exams add column if not exists due_date timestamptz;
