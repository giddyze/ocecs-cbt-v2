import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // omit on the current/last item
}

// Deterministic navigation — always a known fixed route, never
// router.back(), so it works the same regardless of how the person
// actually arrived on this page (bookmark, refresh, direct link, etc).
// Styled small and secondary so it never competes with the page's own
// heading treatment established elsewhere in this app.
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-xs text-slate-400 mb-3">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-brand-teal transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-slate-500 font-medium" : ""}>{item.label}</span>
            )}
            {!isLast && <ChevronRight className="w-3 h-3 text-slate-300" />}
          </span>
        );
      })}
    </nav>
  );
}
