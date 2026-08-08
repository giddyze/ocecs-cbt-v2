import { createClient } from "@supabase/supabase-js";

// Service-role client — SERVER-SIDE ONLY. Bypasses RLS.
// Used for: student PIN auth, PIN generation, exam attempt timing/grading,
// and any admin/teacher write that needs to be double-checked against
// role/ownership in application code before running.
// Never import this file from a Client Component.
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
