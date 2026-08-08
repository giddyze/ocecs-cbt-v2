"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client — used only in Client Components for read-only,
// already-authorized data (e.g. re-fetching after a mutation).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
