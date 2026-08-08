-- =============================================================================
-- OCECS CBT — Migration v8: Staff photos
-- Purely additive. Mirrors the student photo pattern (migration v7) —
-- same public storage bucket approach, applied to profiles instead of
-- students.
-- =============================================================================

alter table profiles add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('staff-photos', 'staff-photos', true)
on conflict (id) do nothing;
