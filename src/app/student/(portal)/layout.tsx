import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FileText, ClipboardList, BarChart3 } from "lucide-react";
import { getAuthenticatedStudent } from "@/lib/auth/getStudent";
import { createAdminSupabase } from "@/lib/supabase/admin";
import SignOutButton from "../SignOutButton";
import Logo from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/student/dashboard", label: "Exams", Icon: FileText },
  { href: "/student/assignments", label: "Assignments", Icon: ClipboardList },
  { href: "/student/term-summary", label: "My Scores", Icon: BarChart3 }
];

export default async function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const student = await getAuthenticatedStudent();
  if (!student) redirect("/student/login");

  const supabase = createAdminSupabase();
  const { data: studentRow } = await supabase
    .from("students")
    .select("full_name, photo_url, classes(name)")
    .eq("id", student.studentId)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-brand-coral text-white px-6 py-3 flex items-center gap-6 shadow-md sticky top-0 z-20">
        <Logo size={34} textClassName="text-white hidden sm:block" />
        <span className="hidden md:inline text-sm text-white/60">|</span>
        <div className="flex items-center gap-2 hidden md:flex">
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/40 bg-white/10 flex items-center justify-center flex-none">
            {studentRow?.photo_url ? (
              <Image src={studentRow.photo_url} alt={studentRow.full_name || "Student"} width={32} height={32} className="object-cover w-full h-full" />
            ) : (
              <span className="text-xs font-extrabold text-white">{(studentRow?.full_name || "S").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="text-sm font-medium">
            {studentRow?.full_name} — {(studentRow?.classes as unknown as { name: string } | null)?.name}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-none"
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
