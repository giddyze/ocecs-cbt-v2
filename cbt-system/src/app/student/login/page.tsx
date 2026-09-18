"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KeyRound, User, GraduationCap, Loader2, AlertCircle } from "lucide-react";
import NavDropdown from "@/components/NavDropdown";

interface ClassRow { id: string; name: string; }

export default function StudentLoginPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/public/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/student/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }
    router.push("/student/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-teal/5 via-slate-50 to-brand-teal/5 px-4">
      <NavDropdown variant="dark" />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white shadow-lg ring-1 ring-black/5 p-1.5 mb-3">
            <Image src="/logo.png" alt="OCECS logo" width={56} height={56} className="object-contain rounded-full" />
          </div>
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">OCECS CBT Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
          <div className="flex items-center gap-2 mb-1.5">
            <GraduationCap className="w-6 h-6 text-brand-coral" />
            <h1 className="text-2xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Student Login</h1>
          </div>
          <div className="w-8 h-1 bg-brand-coral rounded-full mb-3" />
          <p className="text-sm text-slate-500 mb-6">Enter your username and PIN</p>

          <div className="animate-fadeIn opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: "80ms" }}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <div className="relative mb-4">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          <div className="animate-fadeIn opacity-0 [animation-fill-mode:forwards]" style={{ animationDelay: "160ms" }}>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN</label>
            <div className="relative mb-4">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                inputMode="numeric"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-shadow"
              />
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600 mb-3 animate-shake">
              <AlertCircle className="w-4 h-4 flex-none" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-teal text-white rounded-lg py-2.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Signing in…" : "Log In"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} OCECS — All rights reserved.
        </p>
      </div>
    </main>
  );
}
