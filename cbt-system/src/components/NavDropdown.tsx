"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, GraduationCap, ArrowLeft, ChevronDown, Menu, Home } from "lucide-react";

interface NavDropdownProps {
  // Pass "dark" on the light-background login pages, "light" on the
  // dark landing page — controls trigger button contrast only.
  variant?: "light" | "dark";
}

export default function NavDropdown({ variant = "dark" }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const triggerClasses =
    variant === "light"
      ? "text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border-white/10"
      : "text-slate-600 hover:text-brand-navy bg-white hover:bg-slate-50 border-slate-200";

  return (
    <div ref={containerRef} className="absolute top-4 left-4 z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Navigation menu"
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors duration-150 ${triggerClasses}`}
      >
        <Menu className="w-4 h-4 animate-dangle" />
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Navigation options"
          className="mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden animate-dropdownOpen origin-top-left"
        >
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-orange transition-colors duration-150"
          >
            <Home className="w-4 h-4 text-brand-navy" />
            Home
          </Link>
          <Link
            href="/staff/login"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-orange transition-colors duration-150 border-t border-slate-100"
          >
            <ShieldCheck className="w-4 h-4 text-brand-teal" />
            Staff Login
          </Link>
          <Link
            href="/student/login"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-orange transition-colors duration-150 border-t border-slate-100"
          >
            <GraduationCap className="w-4 h-4 text-brand-coral" />
            Student Portal
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              router.back();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-orange transition-colors duration-150 border-t border-slate-100"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            Back to Previous Page
          </button>
        </div>
      )}
    </div>
  );
}
