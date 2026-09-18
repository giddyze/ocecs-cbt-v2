"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/staff/login");
  }
  return (
    <button onClick={handleSignOut} className="text-sm text-slate-300 hover:text-white transition-colors">
      Sign out
    </button>
  );
}
