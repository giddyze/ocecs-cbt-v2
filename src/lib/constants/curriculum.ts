// Mirrors the Classes/Subjects registered in the Assessment Tracker.
// The database is the source of truth once seeded (supabase/schema.sql);
// this constant is only used for client-side dropdown fallbacks.
export const CLASS_SUBJECTS: Record<string, string[]> = {
  "Year 1": ["English Language", "Mathematics", "Basic Science", "ICT"],
  "Year 2": ["English Language", "Mathematics", "Basic Science", "ICT"],
  "Pod 5": ["English Language", "Mathematics", "ICT"],
  "Pod 6": ["English Language", "Mathematics", "ICT"],
  "Secondary Pod": ["English Language", "ICT"]
};
export const CLASSES = Object.keys(CLASS_SUBJECTS);
