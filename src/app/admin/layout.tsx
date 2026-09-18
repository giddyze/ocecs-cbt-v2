import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, GraduationCap, ClipboardList, FileText, Calendar, BarChart3, ArrowUpCircle, Award } from "lucide-react";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import SignOutButton from "./SignOutButton";
import Logo from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/teachers", label: "Staff", Icon: Users },
  { href: "/admin/students", label: "Students", Icon: GraduationCap },
  { href: "/admin/exams", label: "Exams", Icon: FileText },
  { href: "/admin/assignments", label: "Assignments", Icon: ClipboardList },
  { href: "/admin/terms", label: "Terms", Icon: Calendar },
  { href: "/admin/promotions", label: "Promotions", Icon: ArrowUpCircle },
  { href: "/admin/report-cards", label: "Report Cards", Icon: Award },
  { href: "/teacher/gradebook", label: "Gradebook", Icon: BarChart3 }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) redirect("/staff/login");
  if (staff.role !== "admin") redirect("/teacher");

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-brand-navy text-white px-6 py-3 flex items-center gap-6 shadow-md sticky top-0 z-20">
        <Logo size={34} textClassName="text-white hidden sm:block" />
        <span className="hidden md:inline text-sm text-white/60">|</span>
        <span className="text-sm font-medium hidden md:inline">Welcome, Admin</span>
        <div className="flex items-center gap-1 ml-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-none"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
        </div>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
