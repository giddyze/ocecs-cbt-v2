-- =============================================================================
-- OCECS / Scholars CBT Examination System — Supabase Schema
-- Standalone system. Run this in the Supabase SQL editor on a NEW project.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Roles & profiles (Admin / Teacher — both authenticate via Supabase Auth)
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'teacher');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'teacher',
  full_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Curriculum structure (reused from the Assessment Tracker — classes/subjects only)
-- ---------------------------------------------------------------------------
create table classes (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  sort_order int not null default 0
);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table class_subjects (
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  primary key (class_id, subject_id)
);

-- ---------------------------------------------------------------------------
-- Academic sessions / terms
-- ---------------------------------------------------------------------------
create table academic_terms (
  id uuid primary key default uuid_generate_v4(),
  session_name text not null,      -- e.g. "2026/2027"
  term text not null,               -- "First Term" | "Second Term" | "Third Term"
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Teacher assignments (which class+subject combinations a teacher can manage)
-- ---------------------------------------------------------------------------
create table teacher_assignments (
  teacher_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  primary key (teacher_id, class_id, subject_id)
);

-- ---------------------------------------------------------------------------
-- Students (custom Username + PIN auth, NOT Supabase Auth)
-- ---------------------------------------------------------------------------
create table students (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  pin_hash text not null,
  full_name text not null,
  class_id uuid references classes(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per active login; a new login invalidates the previous token,
-- which is how we block multiple simultaneous sessions for the same student.
create table student_sessions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  session_token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index on student_sessions(student_id);

-- ---------------------------------------------------------------------------
-- Exams — CA and Mid-Term are both rows here, distinguished by module_type.
-- Adding "End of Term" / "Mock" / "Entrance" later = new enum value only.
-- ---------------------------------------------------------------------------
create type exam_module as enum ('CA', 'MIDTERM');
create type exam_status as enum ('draft', 'published', 'hidden', 'closed');

create table exams (
  id uuid primary key default uuid_generate_v4(),
  module_type exam_module not null,
  teacher_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  term_id uuid references academic_terms(id),
  title text not null,
  instructions text default '',
  duration_minutes int not null check (duration_minutes > 0),
  num_questions int not null check (num_questions > 0),
  passing_score int not null default 50 check (passing_score between 0 and 100),
  randomize_questions boolean not null default true,
  scheduled_date timestamptz,
  status exam_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index on exams(class_id, subject_id, module_type);

create table questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  question_text text not null,
  options jsonb not null,        -- ["Option A", "Option B", "Option C", "Option D"]
  correct_index int not null check (correct_index between 0 and 3),
  sort_order int not null default 0
);
create index on questions(exam_id);

-- ---------------------------------------------------------------------------
-- Exam attempts — the server-authoritative timing record.
-- started_at is set ONCE by the server and never trusted from the client.
-- ---------------------------------------------------------------------------
create type attempt_status as enum ('active', 'submitted', 'expired');

create table exam_attempts (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  question_order jsonb not null,     -- ordered list of question ids shown to this student
  answers jsonb not null default '{}'::jsonb,   -- { question_id: selected_index }
  flagged jsonb not null default '[]'::jsonb,   -- [question_id, ...]
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  status attempt_status not null default 'active',
  score int,
  unique (exam_id, student_id)
);
create index on exam_attempts(exam_id);
create index on exam_attempts(student_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All writes from the client go through Next.js API routes using the
-- service-role key, so RLS here is a hard backstop, not the only gate.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table class_subjects enable row level security;
alter table academic_terms enable row level security;
alter table teacher_assignments enable row level security;
alter table students enable row level security;
alter table student_sessions enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table exam_attempts enable row level security;

-- Classes/subjects are readable by any authenticated staff member (needed for dropdowns).
create policy "staff can read classes" on classes for select using (auth.role() = 'authenticated');
create policy "staff can read subjects" on subjects for select using (auth.role() = 'authenticated');
create policy "staff can read class_subjects" on class_subjects for select using (auth.role() = 'authenticated');

-- Profiles: a user can read their own profile; admins can read all.
create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "admin reads all profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Teachers can see and manage only their own exams/questions; admins see everything.
create policy "teacher reads own exams" on exams for select using (
  teacher_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "teacher writes own exams" on exams for all using (
  teacher_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "teacher manages own questions" on questions for all using (
  exists (select 1 from exams e where e.id = exam_id and (e.teacher_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')))
);

-- Everything else (students, student_sessions, exam_attempts, teacher_assignments,
-- academic_terms) is written exclusively via API routes using the service-role
-- key, which bypasses RLS by design. No public policy is defined for them, so
-- direct anon/client access is denied.

-- ---------------------------------------------------------------------------
-- Seed: Classes & Subjects (reused as-is from the Assessment Tracker)
-- ---------------------------------------------------------------------------
insert into classes (name, sort_order) values
  ('Year 1', 1), ('Year 2', 2), ('Pod 5', 3), ('Pod 6', 4), ('Secondary Pod', 5);

insert into subjects (name) values
  ('English Language'), ('Mathematics'), ('Basic Science'), ('ICT');

-- Map subjects to classes exactly as registered:
-- Year 1 / Year 2: English, Maths, Basic Science, ICT
-- Pod 5 / Pod 6: English, Maths, ICT
-- Secondary Pod: English, ICT
insert into class_subjects (class_id, subject_id)
select c.id, s.id from classes c, subjects s
where (c.name in ('Year 1','Year 2') and s.name in ('English Language','Mathematics','Basic Science','ICT'))
   or (c.name in ('Pod 5','Pod 6') and s.name in ('English Language','Mathematics','ICT'))
   or (c.name = 'Secondary Pod' and s.name in ('English Language','ICT'));

insert into academic_terms (session_name, term, is_current) values
  ('2026/2027', 'Third Term', true);
