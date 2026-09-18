"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();
  async function handleSignOut() {
    await fetch("/api/student/logout", { method: "POST" });
    router.push("/student/login");
  }
  return (
    <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors">
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
