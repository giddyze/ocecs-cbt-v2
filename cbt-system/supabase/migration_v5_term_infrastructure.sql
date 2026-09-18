-- =============================================================================
-- OCECS CBT — Migration v5: Term infrastructure
-- Run each numbered section IN ORDER, as separate statements. Section 1
-- (the enum addition) must fully commit before anything that could use the
-- new 'FINAL' value runs — do not combine section 1 with later sections in
-- a single multi-statement paste if your SQL editor batches them as one
-- transaction; run it alone first, then continue.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add 'FINAL' as a third exam module type, alongside existing CA/MIDTERM.
--    Run this statement alone, first, and confirm it succeeds before
--    proceeding to section 2.
-- -----------------------------------------------------------------------------
alter type exam_module add value if not exists 'FINAL';


-- -----------------------------------------------------------------------------
-- 2. Term-link assignments the same way exams already are.
-- -----------------------------------------------------------------------------
alter table assignments add column if not exists term_id uuid references academic_terms(id);


-- -----------------------------------------------------------------------------
-- 3. Per-term weighting configuration, used to compute each student's
--    cumulative score out of 100%. Admin-editable — not hardcoded in the
--    app — because grading policy can change term to term.
--    ca_weight_percent is the TOTAL share for all Continuous Assessments
--    combined (split evenly across however many actually exist, up to the
--    cap of 3), not a fixed per-exam number — this keeps scoring correct
--    even if a term ends up with fewer than 3 CAs.
-- -----------------------------------------------------------------------------
alter table academic_terms add column if not exists ca_weight_percent int not null default 30;
alter table academic_terms add column if not exists midterm_weight_percent int not null default 20;
alter table academic_terms add column if not exists final_weight_percent int not null default 50;

-- Sanity constraint: the three weights must sum to 100. Enforced here so a
-- bad admin edit can't silently produce scores that don't add up.
alter table academic_terms add constraint academic_terms_weights_sum_100
  check (ca_weight_percent + midterm_weight_percent + final_weight_percent = 100);


-- -----------------------------------------------------------------------------
-- 4. Backfill — every exam and assignment created before this migration has
--    term_id = null (term-linking was never wired up until now). Without
--    this step, all pre-existing exams/assignments would silently disappear
--    once the app starts filtering by term. Assign them to whichever term
--    is currently marked is_current.
-- -----------------------------------------------------------------------------
update exams
set term_id = (select id from academic_terms where is_current = true limit 1)
where term_id is null;

update assignments
set term_id = (select id from academic_terms where is_current = true limit 1)
where term_id is null;


-- -----------------------------------------------------------------------------
-- 5. Confirm the backfill worked — both counts should be 0.
-- -----------------------------------------------------------------------------
select
  (select count(*) from exams where term_id is null) as exams_still_unlinked,
  (select count(*) from assignments where term_id is null) as assignments_still_unlinked;
