import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FileText, ClipboardList, BarChart3, ShieldCheck, Users } from "lucide-react";
import { getAuthenticatedStaff } from "@/lib/auth/getStaff";
import SignOutButton from "./SignOutButton";
import Logo from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/teacher/exams", label: "Exams", Icon: FileText },
  { href: "/teacher/assignments", label: "Assignments", Icon: ClipboardList },
  { href: "/teacher/students", label: "Students", Icon: Users },
  { href: "/teacher/gradebook", label: "Gradebook", Icon: BarChart3 }
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const staff = await getAuthenticatedStaff();
  if (!staff) redirect("/staff/login");

  return (
    <div className="min-h-screen bg-slate-50">
      {staff.role === "admin" && (
        <div className="bg-brand-navyDeep text-white/90 text-xs px-6 py-1.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-gold flex-none" />
          Viewing as admin —
          <Link href="/admin" className="underline hover:text-white">
            back to Admin Overview
          </Link>
        </div>
      )}
      <nav className="bg-brand-teal text-white px-6 py-3 flex items-center gap-6 shadow-md sticky top-0 z-20">
        <Logo size={34} textClassName="text-white hidden sm:block" />
        <span className="hidden md:inline text-sm text-white/60">|</span>
        <div className="hidden md:flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/40 bg-white/10 flex items-center justify-center flex-none">
            {staff.photo_url ? (
              <Image src={staff.photo_url} alt={staff.full_name} width={32} height={32} className="object-cover w-full h-full" />
            ) : (
              <span className="text-xs font-extrabold text-white">{staff.full_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="text-sm font-medium">{staff.full_name}</span>
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
      <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
