import { Users, GraduationCap, FileText, CheckCircle2 } from "lucide-react";
import { createAdminSupabase } from "@/lib/supabase/admin";

export default async function AdminOverview() {
  const supabase = createAdminSupabase();
  const [{ count: teacherCount }, { count: studentCount }, { count: examCount }, { count: publishedCount }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher").eq("active", true),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("exams").select("id", { count: "exact", head: true }),
      supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "published")
    ]);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy uppercase tracking-wide leading-none">Overview</h1>
      <div className="w-10 h-1 bg-brand-gold rounded-full mt-2 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Teachers" value={teacherCount || 0} Icon={Users} color="text-brand-teal" delayMs={0} />
        <StatCard label="Active Students" value={studentCount || 0} Icon={GraduationCap} color="text-brand-coral" delayMs={70} />
        <StatCard label="Total Exams" value={examCount || 0} Icon={FileText} color="text-brand-navy" delayMs={140} />
        <StatCard label="Published Now" value={publishedCount || 0} Icon={CheckCircle2} color="text-emerald-500" delayMs={210} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
  color,
  delayMs
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  delayMs: number;
}) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow animate-fadeIn opacity-0 [animation-fill-mode:forwards]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <p className="text-3xl font-black text-brand-navy">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}
