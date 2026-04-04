// ─────────────────────────────────────────────────────────────────────────────
// ChatBubble — shared presentational component for chat messages
// Used in: PlanningScreen, TaskChat
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Props {
  sender: "agent" | "user";
  text: string;
  /** Optional action hint label displayed below the message */
  actionHint?: string | null;
  className?: string;
}

export function ChatBubble({ sender, text, actionHint, className }: Props) {
  const isAgent = sender === "agent";

  return (
    <div
      className={cn(
        "flex",
        isAgent ? "justify-start" : "justify-end",
        "mb-4 group",
        className
      )}
    >
      {isAgent && (
        <div className="w-8 h-8 rounded-xl bg-[#0a192f] text-white flex items-center justify-center text-[10px] font-black mr-3 flex-shrink-0 mt-1 shadow-lg shadow-blue-900/20">
          AI
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm",
          isAgent
            ? "bg-white border border-slate-100 text-slate-700 rounded-tl-sm"
            : "bg-[#0a192f] text-white rounded-tr-sm"
        )}
      >
        {isAgent ? (
          <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-headings:text-slate-800 prose-strong:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600 prose-p:my-1 prose-headings:my-2">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{text}</p>
        )}

        {isAgent && actionHint && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
              💡 {actionHint}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TypingIndicator — three-dot animation
// ─────────────────────────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="w-8 h-8 rounded-xl bg-[#0a192f] text-white flex items-center justify-center text-[10px] font-black mr-3 flex-shrink-0 mt-1 shadow-lg shadow-blue-900/20">
        AI
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
