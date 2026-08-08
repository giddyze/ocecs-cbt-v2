-- =============================================================================
-- OCECS CBT — Migration v7: Assessment Tracker integration
-- Purely additive. Retires the standalone Assessment Tracker app; its
-- unique functionality (remarks, promotion, attendance, projects, report
-- cards) moves into this schema and the main CBT application.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Richer student fields, matching what the Tracker's registration form
--    captured that this schema didn't.
-- -----------------------------------------------------------------------------
alter table students add column if not exists admission_no text;
alter table students add column if not exists photo_url text;

-- -----------------------------------------------------------------------------
-- 2. Public storage bucket for student photos. Public (unlike
--    assignment-files) because photos need to display in report cards and
--    student lists without a signed URL — same pattern the Tracker used.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Remarks — one per student, per term. Head-teacher comment plus a
--    general tracker note. Written exclusively via API routes (service-role
--    key), same pattern as every other staff-only table in this schema.
-- -----------------------------------------------------------------------------
create table if not exists remarks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  term_id uuid not null references academic_terms(id) on delete cascade,
  ht_comment text,
  tracker_note text,
  updated_at timestamptz not null default now(),
  unique (student_id, term_id)
);

-- -----------------------------------------------------------------------------
-- 4. Improvement areas — per student, per subject, per term. Mirrors the
--    Tracker's perf_flags: a flexible set of flagged areas rather than a
--    fixed schema, since the specific areas differ per subject.
-- -----------------------------------------------------------------------------
create table if not exists improvement_areas (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  term_id uuid not null references academic_terms(id) on delete cascade,
  flags jsonb not null default '{}'::jsonb, -- { area_key: true }
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, term_id)
);

-- -----------------------------------------------------------------------------
-- 5. Attendance — per student, per term. Manual entry, not derived from
--    any exam/login activity.
-- -----------------------------------------------------------------------------
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  term_id uuid not null references academic_terms(id) on delete cascade,
  days_present int,
  days_total int,
  notes text,
  updated_at timestamptz not null default now(),
  unique (student_id, term_id)
);

-- -----------------------------------------------------------------------------
-- 6. Projects — per student, per subject, per term. Manual score/notes,
--    separate from CBT exam scoring entirely.
-- -----------------------------------------------------------------------------
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  term_id uuid not null references academic_terms(id) on delete cascade,
  title text,
  score int,
  notes text,
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id, term_id)
);

-- -----------------------------------------------------------------------------
-- 7. Promotions — the enrollment/history log. Answers "which class was
--    this student in during term X" for report cards generated after a
--    later promotion, and is the audit trail for every class change.
-- -----------------------------------------------------------------------------
create table if not exists promotions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  from_class_id uuid references classes(id),
  from_term_id uuid references academic_terms(id),
  to_class_id uuid not null references classes(id),
  to_term_id uuid not null references academic_terms(id),
  notes text,
  promoted_at timestamptz not null default now()
);
create index if not exists idx_promotions_student on promotions(student_id);

-- -----------------------------------------------------------------------------
-- 8. Atomic promotion function — replaces the Tracker's 4 sequential,
--    non-transactional client writes (a real correctness bug: a failure
--    partway through could leave a student promoted in one table but not
--    another). A single plpgsql function call is one implicit transaction —
--    if any statement fails, the whole thing rolls back automatically.
-- -----------------------------------------------------------------------------
create or replace function promote_student(
  p_student_id uuid,
  p_to_class_id uuid,
  p_to_term_id uuid,
  p_notes text default null
) returns void
language plpgsql
security definer
as $$
declare
  v_from_class_id uuid;
  v_from_term_id uuid;
begin
  select class_id into v_from_class_id from students where id = p_student_id;
  select id into v_from_term_id from academic_terms where is_current = true;

  update students set class_id = p_to_class_id where id = p_student_id;

  insert into promotions (student_id, from_class_id, from_term_id, to_class_id, to_term_id, notes)
  values (p_student_id, v_from_class_id, v_from_term_id, p_to_class_id, p_to_term_id, p_notes);
end;
$$;
