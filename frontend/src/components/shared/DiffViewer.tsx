// ─────────────────────────────────────────────────────────────────────────────
// DiffViewer — shows word-level diff between two text versions
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import * as Diff from "diff";
import { Sparkles } from "lucide-react";

interface Props {
  oldText: string;
  newText: string;
  version: number;
}

export function DiffViewer({ oldText, newText, version }: Props) {
  const diffs = useMemo(() => Diff.diffWords(oldText, newText), [oldText, newText]);

  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
        <Sparkles className="w-3 h-3 text-blue-500" />
        Comparison: v{version} vs Current
      </div>
      <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-600 font-medium text-justify">
        {diffs.map((part, index) => (
          <span
            key={index}
            className={
              part.added
                ? "bg-green-100/80 text-green-700 px-0.5 rounded-sm font-bold border-b-2 border-green-400/30"
                : part.removed
                ? "bg-red-50 text-red-500/60 line-through decoration-red-300 text-[12px] opacity-60 px-0.5"
                : ""
            }
          >
            {part.value}
          </span>
        ))}
      </div>
    </div>
  );
}
