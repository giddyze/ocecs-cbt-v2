-- =============================================================================
-- OCECS CBT — Migration v3: Main-admin protection + Teacher password reset
-- Purely additive. Does not touch, rename, or drop any existing table,
-- column, policy, or auth mechanism. Safe to run on your existing project.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Main admin protection
-- Distinguishes one admin as un-demotable/un-removable by any other admin,
-- including themselves. Defaults to false for everyone — see the manual
-- step at the bottom of this file, which must be run once, separately,
-- after this migration to actually designate a main admin.
-- -----------------------------------------------------------------------------
alter table profiles add column if not exists is_main_admin boolean not null default false;

-- -----------------------------------------------------------------------------
-- Teacher password reset requests
-- Set when a teacher submits "Forgot Password?" on the staff login page.
-- Cleared by an admin when they resolve the request via Admin > Teachers.
-- Null = no pending request.
-- -----------------------------------------------------------------------------
alter table profiles add column if not exists password_reset_requested_at timestamptz;


-- =============================================================================
-- MANUAL STEP — run this separately, AFTER the migration above has completed.
-- This is intentionally not automated: the app must never guess who the
-- main admin is. Replace the email below with your actual admin email,
-- then run just this one statement on its own.
-- =============================================================================

-- update profiles
-- set is_main_admin = true
-- where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL@example.com'
--   and role = 'admin';

-- After running it, confirm exactly one row was updated:
-- select id, full_name, email, is_main_admin from profiles where role = 'admin';
