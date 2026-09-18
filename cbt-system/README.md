# CBT Examination System

A standalone Computer-Based Test platform: three portals (Staff, Student, CBT),
role-based dashboards for Admins and Teachers, custom Username+PIN login for
students, server-authoritative timed exams with autosave, and a
Continuous-Assessment / Mid-Term module split that's designed to grow (End of
Term, Mock, Entrance exams can be added as new `module_type` values later —
no schema changes needed).

This is intentionally **separate** from the OCECS Assessment Tracker. The
only thing carried over is the Classes and Subjects list, seeded directly
into this project's own database.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase**: Postgres database, Auth (Admin/Teacher), Storage
- Custom Username + PIN auth for students (bcrypt-hashed PINs, signed
  session cookie, one active session per student enforced server-side)

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new free-tier project.
2. In the SQL Editor, paste and run the entire contents of `supabase/schema.sql`.
   This creates every table, sets up Row Level Security, and seeds your
   Classes and Subjects (Year 1, Year 2, Pod 5, Pod 6, Secondary Pod, with
   the correct subjects for each).
3. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (⚠️ keep this private — never expose it to the browser)

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STUDENT_SESSION_SECRET=any-long-random-string
```

Generate a random string for `STUDENT_SESSION_SECRET` with, for example:
`openssl rand -base64 32`

## 2b. If upgrading an existing project: run migration v2

If you already had this system running before this update, run
`supabase/migration_v2_pins_assignments.sql` in the SQL Editor too. It's
purely additive — adds a `staff_pin` column to `profiles` and two new
tables (`assignments`, `assignment_submissions`) for the Assignment Module.
It does not touch, rename, or drop anything that already exists, so it's
safe to run on a live project. If you haven't run the earlier RLS-recursion
fix (the `public.is_admin()` policy fix), run that first — migration v2's
policies depend on it.

## 3. Create your first Admin account

The schema doesn't seed an admin user (Supabase Auth users can't be created
via SQL). Do this once, from the Supabase dashboard:

1. **Authentication → Users → Add user** — create a user with your email
   and a password.
2. Copy the new user's UUID.
3. In the **SQL Editor**, run:
   ```sql
   insert into profiles (id, role, full_name, email)
   values ('PASTE-THE-UUID-HERE', 'admin', 'Your Name', 'your@email.com');
   ```
4. You can now sign in at `/staff/login` as an Admin, and create Teacher
   accounts from the Admin → Teachers page (no more manual SQL needed after this).

## 4. Install & run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 5. Deploy

### Netlify
1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import from Git**, pick the repo.
3. Build command: `npm run build` — Publish directory: `.next`
   (Netlify's Next.js plugin handles this automatically if detected).
4. Add the four environment variables from step 2 under
   **Site settings → Environment variables**.

### Vercel
1. Push to GitHub, then **Import Project** in Vercel.
2. Framework preset: Next.js (auto-detected).
3. Add the same four environment variables.
4. Deploy.

Either platform's free tier is sufficient for this project.

## How the pieces fit together

- **Admin** (`/admin`): manage teachers, manage students + generate/reset
  PINs, monitor and publish/hide/reset any exam, see system-wide stats.
- **Teacher** (`/teacher`): only sees classes/subjects they're assigned to
  (via `teacher_assignments`); creates exams, uploads questions one at a time
  or in bulk (paste format described on the page), publishes when ready,
  views results only for exams they created.
- **Student** (`/student`): logs in with Username + PIN, sees published
  exams for their class, takes them with a live countdown, can flag
  questions and jump between them, and gets an instant score on submission.

### Server-authoritative timing (the part that matters most)

`exam_attempts.started_at` is set once, by the server, the first time a
student starts an exam. Every subsequent request — autosave (every 5s and on
every answer change) and submit — recomputes `remaining = duration -
(now - started_at)` **on the server**. The countdown shown to the student is
just a local display; it can't be used to gain time, and refreshing or
losing connection doesn't reset the clock, because `started_at` never moves.
If the server-computed remaining time hits zero, the attempt is marked
`expired` and the exam is auto-submitted with whatever answers were last saved.

### Single active session per student

Each login writes a new row to `student_sessions` and issues a JWT that
references it. Every authenticated request checks that the JWT's session
token still matches a live row. Logging in from a second device doesn't
delete the old row automatically in this version — to fully block
concurrent logins, add a step in `/api/student/login` that deletes any
existing `student_sessions` rows for that student before inserting the new
one (a one-line addition, left as a config choice since some schools want
"most recent login wins" rather than "only one device ever").

## Extending

- **New exam module** (e.g. "End of Term"): add a value to the `exam_module`
  Postgres enum, then it appears anywhere `module_type` is used.
- **Short-answer / essay questions**: add a `question_type` column to
  `questions`, and branch the grading logic in `/api/exams/[id]/submit` for
  non-MCQ types (manual grading UI would be a new teacher page).
- **CSV/Excel bulk import**: the bulk question upload already accepts an
  array of `{questionText, options, correctIndex}` — swap the paste-box
  parser for a CSV/XLSX parser (e.g. `papaparse` or `xlsx`) feeding the same
  `PUT /api/teacher/exams/[id]/questions` endpoint.
- **Parent Portal / Report Cards / Attendance**: new tables + new route
  groups; nothing here needs to change to support them.

## What's new in this update

### Branding
The OCECS logo now appears as the favicon, on both login screens, on the
landing page, in every portal's navigation bar, and in the branded loading
spinner shown during page transitions (`src/app/loading.tsx`).

### Redesigned interface
Every screen was rebuilt with `lucide-react` icons, smoother transitions,
and a more premium visual language — this includes the exam-taking screen,
which now has clearer "Mark for review" flagging, a highlighted question
navigator (current question, answered questions, and flagged questions are
each visually distinct), and icon-based Back/Next/Submit controls.

### Admin Console additions
- **Student PINs**: generate on creation, regenerate any time (unchanged
  from before — just confirming it's preserved).
- **Tutor reference PINs**: Admin → Teachers → the key icon on any teacher's
  row generates/regenerates a 4-digit reference PIN, shown once at a time.
  **This does not replace how teachers log in** — teachers still sign in
  with email + password via Supabase Auth. The PIN is a supplementary,
  admin-visible identifier (e.g. for verbal ID checks or internal records).
- **Activate/deactivate teacher accounts**: the power icon on any teacher's
  row toggles `profiles.active`. A deactivated teacher's login credentials
  still work at the Supabase Auth level (unchanged), but every admin/teacher
  page checks `active` and redirects them out — so deactivating effectively
  suspends their access without deleting their account or history.
- **Assign / reassign teachers to classes and subjects**: click the link
  icon on any teacher's row to expand an inline editor. Add a class+subject
  pair, or remove one — this writes directly to the existing
  `teacher_assignments` table, the same one that already gated exam/question
  creation, so permissions take effect immediately with no other changes.

### Assignment Module
A new, independent module alongside Exams:
- **Teachers** (`/teacher/assignments`): create an assignment for a
  class+subject with instructions and an optional due date, publish it when
  ready, and grade submissions with a score and written feedback
  (`/teacher/assignments/[id]/submissions`).
- **Students** (`/student/assignments`): see published assignments for
  their class, open one to read instructions, type and submit an answer
  (can revise until graded), and see the teacher's grade/feedback once
  available.
- **Admin** (`/admin/assignments`): read-only monitor of every assignment
  across all teachers.
- Submissions are currently text-based. A Supabase Storage bucket
  (`assignment-files`) is already created by migration v2 for future file
  upload support — wiring that in is a frontend-only addition (an `<input
  type="file">` plus a Storage upload call before the existing submit
  request), no schema changes needed.

None of this changes how Exams, student PIN login, or teacher email/password
login work — every existing workflow, table, and permission from the
original build is untouched.
