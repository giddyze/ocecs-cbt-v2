import Link from "next/link";
import Image from "next/image";
import { GraduationCap, ShieldCheck, Timer, ClipboardList, ArrowRight, KeyRound, BookOpen, BarChart3 } from "lucide-react";
import NavDropdown from "@/components/NavDropdown";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-navyDeep via-brand-navy to-[#0d2444] text-white overflow-hidden relative">
      <NavDropdown variant="light" />

      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-96 h-96 bg-brand-teal/10 rounded-full blur-3xl" />

      {/* Hero illustration — original, code-built vector motifs (not stock
          photography, which we don't have rights or generation tooling
          for here). Each shape floats independently on its own timing so
          the composition reads as organic rather than mechanically synced.
          transform/opacity only, per the app's motion performance rules. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <BookOpen className="absolute top-[14%] left-[8%] w-16 h-16 text-brand-gold/20 animate-floatSlow" />
        <GraduationCap className="absolute top-[22%] right-[10%] w-20 h-20 text-brand-teal/20 animate-floatSlowReverse" />
        <BarChart3 className="absolute bottom-[18%] left-[14%] w-14 h-14 text-brand-coral/20 animate-floatSlow" style={{ animationDelay: "1.2s" }} />
        <ShieldCheck className="absolute bottom-[26%] right-[16%] w-12 h-12 text-brand-gold/15 animate-floatSlowReverse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[40%] left-[45%] w-2 h-2 rounded-full bg-brand-gold/30 animate-floatSlow" style={{ animationDelay: "0.5s" }} />
        <div className="absolute top-[60%] right-[38%] w-1.5 h-1.5 rounded-full bg-brand-teal/30 animate-floatSlowReverse" style={{ animationDelay: "1.8s" }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 relative">
        <header className="text-center mb-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-xl ring-4 ring-white/10 mb-5 p-2">
            <Image src="/logo.png" alt="OCECS logo" width={88} height={88} className="object-contain rounded-full" priority />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase">CBT Examination Platform</h1>
          <div className="w-14 h-1.5 bg-brand-gold rounded-full mx-auto mt-4 mb-4" />
          <p className="text-slate-300 max-w-xl mx-auto">
            Okesanjo Continuing Education &amp; Community Support — secure, timed computer-based
            testing for staff and students.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          <PortalCard
            href="/staff/login"
            title="Staff Portal"
            description="Admins manage the school; teachers build exams, assignments, and question banks."
            Icon={ShieldCheck}
            delayMs={0}
          />
          <PortalCard
            href="/student/login"
            title="Student Portal"
            description="Log in with your username and PIN to view and take exams and assignments."
            Icon={GraduationCap}
            delayMs={120}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          <Feature Icon={Timer} label="Server-timed exams" color="teal" />
          <Feature Icon={ClipboardList} label="Auto-graded & saved" color="coral" />
          <Feature Icon={KeyRound} label="Secure PIN login" color="gold" />
          <Feature Icon={GraduationCap} label="Assignments & feedback" color="navy" />
        </div>

        <footer className="text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Okesanjo Continuing Education &amp; Community Support. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

function PortalCard({
  href,
  title,
  description,
  Icon,
  delayMs
}: {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
  delayMs: number;
}) {
  return (
    <Link
      href={href}
      style={{ animationDelay: `${delayMs}ms` }}
      className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-gold/10 animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
    >
      <div className="w-12 h-12 rounded-xl bg-brand-gold/15 flex items-center justify-center mb-5 group-hover:bg-brand-gold/25 transition-colors">
        <Icon className="w-6 h-6 text-brand-gold" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-1 mt-4 text-brand-gold text-sm font-medium">
        Enter <ArrowRight className="w-4 h-4 animate-nudge transition-[margin-left] duration-150 group-hover:ml-1" />
      </span>
    </Link>
  );
}

const FEATURE_COLORS = {
  teal: "text-brand-teal bg-brand-teal/10",
  coral: "text-brand-coral bg-brand-coral/10",
  gold: "text-brand-gold bg-brand-gold/10",
  navy: "text-white bg-white/10"
} as const;

function Feature({
  Icon,
  label,
  color
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: keyof typeof FEATURE_COLORS;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 bg-white/[0.03] border border-white/5 rounded-xl py-6 px-3 hover:bg-white/[0.06] transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${FEATURE_COLORS[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs text-slate-300 font-medium">{label}</span>
    </div>
  );
}
