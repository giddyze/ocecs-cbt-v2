"use client";
import { useEffect, useState } from "react";
import { Calendar, Lock } from "lucide-react";

interface Term {
  id: string;
  session_name: string;
  term: string;
  is_current: boolean;
}

export default function TermSelector({
  selectedTermId,
  onChange
}: {
  selectedTermId: string | null;
  onChange: (termId: string | null, isCurrent: boolean) => void;
}) {
  const [terms, setTerms] = useState<Term[]>([]);

  useEffect(() => {
    fetch("/api/public/terms").then((r) => r.json()).then((d) => {
      const list: Term[] = d.terms || [];
      setTerms(list);
      // On first load, if nothing's selected yet, default to whichever
      // term is current — the parent page doesn't need to know that logic.
      if (!selectedTermId) {
        const current = list.find((t) => t.is_current);
        if (current) onChange(current.id, true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
  }, []);

  if (terms.length === 0) return null;

  const selected = terms.find((t) => t.id === selectedTermId);
  const isPast = selected && !selected.is_current;

  return (
    <div className="flex items-center gap-2 mb-4">
      <Calendar className="w-4 h-4 text-slate-400" />
      <select
        value={selectedTermId || ""}
        onChange={(e) => {
          const t = terms.find((tt) => tt.id === e.target.value);
          onChange(e.target.value, !!t?.is_current);
        }}
        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
      >
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.session_name} — {t.term}{t.is_current ? " (Current)" : ""}
          </option>
        ))}
      </select>
      {isPast && (
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Lock className="w-3 h-3" /> Read-only — past term
        </span>
      )}
    </div>
  );
}
