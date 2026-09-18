"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import NavDropdown from "@/components/NavDropdown";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/staff/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setLoading(false);
    // Always the same message, whether or not the email matched an account —
    // the backend intentionally never reveals that either way.
    setMessage(data.message || "If that email belongs to a staff account, your admin has been notified.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 px-4">
      <NavDropdown variant="dark" />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white shadow-lg ring-1 ring-black/5 p-1.5 mb-3">
            <Image src="/logo.png" alt="OCECS logo" width={56} height={56} className="object-contain rounded-full" />
          </div>
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">OCECS CBT Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
          <h1 className="text-xl font-bold text-brand-navy mb-1">Forgot Password?</h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter your staff email. Your admin will be notified and will reset your password for you — there&apos;s no
            automatic email link in this system.
          </p>

          {message ? (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-none mt-0.5" />
              <p className="text-sm text-emerald-800">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative mb-4">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent transition-shadow"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-navy text-white rounded-lg py-2.5 font-semibold hover:bg-brand-navyDeep transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Notify My Admin"}
              </button>
            </form>
          )}

          <Link
            href="/staff/login"
            className="flex items-center gap-1.5 justify-center mt-6 text-xs text-slate-400 hover:text-brand-navy transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
