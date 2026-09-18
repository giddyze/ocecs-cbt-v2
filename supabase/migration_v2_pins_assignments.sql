-- =============================================================================
-- OCECS CBT — Migration v2: Tutor reference PINs + Assignment Module
-- Purely additive. Does not touch, rename, or drop any existing table,
-- column, policy, or auth mechanism. Safe to run on your existing project.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tutor reference PIN
-- NOTE: Teachers still sign in with email + password via Supabase Auth —
-- that login method is unchanged. This PIN is a supplementary, admin-visible
-- reference code (e.g. for verbal ID checks, internal records), not a login
-- credential, so it's stored as plain text and can be viewed/regenerated
-- any time from Admin > Teachers (unlike the student PIN, which is hashed
-- and only ever shown once, because that one IS used to log in).
-- -----------------------------------------------------------------------------
alter table profiles add column if not exists staff_pin text;

-- -----------------------------------------------------------------------------
-- Assignment Module
-- -----------------------------------------------------------------------------
create type assignment_status as enum ('draft', 'published', 'closed');

create table if not exists assignments (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  instructions text default '',
  due_date timestamptz,
  status assignment_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists assignments_class_subject_idx on assignments(class_id, subject_id);

create table if not exists assignment_submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  content_text text default '',
  file_url text,
  submitted_at timestamptz not null default now(),
  grade int,
  feedback text,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);
create index if not exists assignment_submissions_assignment_idx on assignment_submissions(assignment_id);
create index if not exists assignment_submissions_student_idx on assignment_submissions(student_id);

alter table assignments enable row level security;
alter table assignment_submissions enable row level security;

-- Teachers manage only their own assignments; admins manage all.
-- Reuses the is_admin() helper created in the earlier RLS-recursion fix —
-- if you haven't run that fix yet, run it before this migration.
create policy "teacher manages own assignments" on assignments
for all using (teacher_id = auth.uid() or public.is_admin());

-- Submissions: written exclusively via API routes (service-role key), same
-- pattern as students/exam_attempts. No public policy needed for direct access.

-- Storage bucket for assignment file submissions (optional — only needed if
-- students will upload files rather than just typing text answers).
insert into storage.buckets (id, name, public)
values ('assignment-files', 'assignment-files', false)
on conflict (id) do nothing;
