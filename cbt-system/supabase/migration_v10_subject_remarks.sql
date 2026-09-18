-- =============================================================================
-- OCECS CBT — Migration v10: Subject-specific teacher remark
-- Purely additive. Reuses improvement_areas since it's already scoped
-- exactly right (student + subject + term) rather than creating a new
-- table for what's fundamentally the same record.
-- =============================================================================

alter table improvement_areas add column if not exists remark text;
