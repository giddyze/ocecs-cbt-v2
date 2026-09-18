import { createServerSupabase } from "@/lib/supabase/server";

// Reads the logged-in Supabase Auth user and their role/profile row.
// Use in Server Components/route handlers for admin & teacher pages.
export async function getAuthenticatedStaff() {
  const supabase = createServerSupabase();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, active, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) return null;
  return profile;
}
