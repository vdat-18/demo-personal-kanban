// ─────────────────────────────────────────────────────────────────────────────
// PlanningScreen — AI-first project planning flow
//
// Architecture:
//   PlanningScreen (container — only routing + composition)
//     ↳ usePlanningChat        (chat state + AI messaging)
//     ↳ useTaskElaboration     (task elaboration state)
//     ↳ PlanningChatPanel      (JSX — left column)
//     ↳ ReportPanel            (JSX — right column)
//     ↳ TasksPanel             (JSX — phase 2)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle2,
  ListTodo,
  Sparkles,
  Play,
  ChevronRight,
  MessageSquare,
  Target,
  Bot,
  Eye,
  EyeOff,
  Lightbulb,
  ChevronDown,
  History,
  Paperclip,
  X,
  Download,
  FolderDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import { useProjectStore } from "@/store";
import { generateProjectReport } from "@/lib/llm";
import { DiffViewer } from "@/components/shared/DiffViewer";
import { newId } from "@/lib/utils";

import { usePlanningChat } from "@/features/planning/hooks/usePlanningChat";
import { useTaskElaboration } from "@/features/planning/hooks/useTaskElaboration";
import { extractFileContent } from "@/lib/fileReader";

import { AGENT_MAPPING } from "@/constants/agents";
import type { Task, SuggestedAction, DetailedTask } from "@/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "planning" | "tasks";

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function PlanningScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const { projects, updateProjectPlanningReport, startExecution, addAsset } = useProjectStore();

  const [sessionId] = useState(newId);
  const currentProjectId = id ?? sessionId;
  const existingProject = id ? projects.find((p) => p.id === id) ?? null : null;
  const projectName =
    existingProject?.name ?? location.state?.projectName ?? "New Project";

  // ── UI state ───────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("planning");
  const [reportContent, setReportContent] = useState(
    existingProject?.planningReport ?? ""
  );
  const [structuredReport, setStructuredReport] = useState(
    existingProject?.planningStructured ?? null
  );
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // File input refs for robust picking
  const topFileInputRef = useRef<HTMLInputElement>(null);
  const bottomFileInputRef = useRef<HTMLInputElement>(null);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const chat = usePlanningChat({
    projectId: currentProjectId,
    projectName,
    reportContent,
    onActionConfirmed: (action: SuggestedAction) => dispatchAction(action),
  });

  const elaboration = useTaskElaboration({
    projectId: currentProjectId,
    reportContent,
    suggestedTaskTitles: structuredReport?.suggested_tasks ?? [],
    onElaborationStart: () => setPhase("tasks"),
  });

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.isTyping]);

  // ── Asset management helper ────────────────────────────────────────────────
  const syncFileToAssets = (file: File, extracted: any[]) => {
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    
    let type: any = "document";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) type = "image";
    else if (["xlsx", "xls", "csv"].includes(ext)) type = "spreadsheet";
    else if (ext === "pdf") type = "pdf";

    const mainContent = extracted[0]?.content || "";

    addAsset({
      id: assetId,
      name: file.name,
      type,
      projectId: currentProjectId,
      projectName,
      agentName: "User Upload",
      createdAt: new Date().toISOString(),
      size: (file.size / 1024).toFixed(1) + " KB",
      content: mainContent.length < 50000 ? mainContent : "[File too large for preview]",
    });
  };

  const handleDownloadMd = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "_")}_strategy.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToDirectory = () => {
    if (!reportContent) return;
    const bytes = new TextEncoder().encode(reportContent).length;
    addAsset({
      id: `report-${Date.now()}`,
      name: `${projectName} Strategy Overview.md`,
      type: "document",
      projectId: currentProjectId,
      projectName,
      agentName: "Architect",
      createdAt: new Date().toISOString(),
      size: (bytes / 1024).toFixed(1) + " KB",
      content: reportContent,
    });
    alert("Report saved to project directory successfully!");
  };

  // ── Report generation ──────────────────────────────────────────────────────
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const history = chat.messages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const data = await generateProjectReport(projectName, history);
      setReportContent(data.report);
      setStructuredReport(data.structured);
      updateProjectPlanningReport(currentProjectId, data.report, "ai");

      const taskCount = data.structured?.suggested_tasks?.length ?? 0;
      const suggestAction: SuggestedAction = {
        type: "suggest_tasks",
        hint: '💡 Say "Yes" or "Go ahead" to let AI elaborate all tasks in detail',
      };

      chat.pushAgentMessage(
        `✅ Your project report is ready! I've identified **${taskCount} key tasks** for this project.\n\nWould you like me to elaborate each task with a **detailed description**, explain *why* it matters, and break it down into concrete subtasks?`,
        suggestAction
      );
      chat.setPendingAction(suggestAction);
    } catch (err) {
      console.error("[PlanningScreen] Report generation failed:", err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // ── Action dispatcher ──────────────────────────────────────────────────────
  const dispatchAction = (action: SuggestedAction) => {
    switch (action.type) {
      case "generate_report":
        handleGenerateReport();
        break;
      case "proceed_to_tasks":
        setPhase("tasks");
        break;
      case "suggest_tasks":
        // Elaborate tasks then notify chat with a short success message
        elaboration.elaborate().then(() => {
          const count = elaboration.detailedTasks.length || (structuredReport?.suggested_tasks?.length ?? 0);
          chat.pushAgentMessage(
            `✅ **${count} tasks** have been elaborated and are ready in the **Execution Plan**.\n\nEach task includes a description, rationale, and subtasks. Switch to the Execution Plan tab to review them, then hit **Start Execution** when you're ready.`
          );
        });
        break;
    }
  };

  // ── Start execution ────────────────────────────────────────────────────────
  const handleStartExecution = () => {
    const source =
      elaboration.detailedTasks.length > 0
        ? elaboration.detailedTasks
        : (structuredReport?.suggested_tasks ?? []).map(
            (title: string): DetailedTask => ({
              title,
              description: "",
              why: "",
              suggested_subtasks: [],
              agent_hint: "Starter Agent",
            })
          );

    const tasks: Task[] = source.map((t, idx) => {
      const existing = existingProject?.tasks?.find(old => old.title === t.title);

      return {
        id: existing ? existing.id : `task-${Date.now()}-${idx}`,
        title: t.title,
        description: t.description,
        why: t.why,
        status: existing ? existing.status : "todo" as const,
        subtasks: existing ? existing.subtasks : t.suggested_subtasks.map((text, sIdx) => ({
          id: `subtask-${Date.now()}-${idx}-${sIdx}`,
          text,
          completed: false,
        })),
        agentType: existing ? existing.agentType : AGENT_MAPPING["todo"],
        updatedAt: new Date().toISOString(),
      };
    });

    startExecution(currentProjectId, tasks);
    navigate(`/mission-control/${currentProjectId}`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full bg-[#f0f4f8] overflow-hidden font-sans text-slate-800">
      {/* ── Sidebar ── */}
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-10 gap-10 flex-shrink-0 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Bot className="w-6 h-6 fill-current text-white" />
        </div>
        <div className="flex flex-col gap-8 text-slate-500">
          <button
            className={`p-3 rounded-2xl transition-all ${
              phase === "planning"
                ? "bg-white/10 text-white shadow-inner"
                : "hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setPhase("planning")}
            aria-label="Planning phase"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          <button
            className={`p-3 rounded-2xl transition-all ${
              phase === "tasks"
                ? "bg-white/10 text-white shadow-inner"
                : "hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setPhase("tasks")}
            aria-label="Tasks phase"
          >
            <ListTodo className="w-6 h-6" />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col h-full bg-white relative rounded-l-[40px] shadow-2xl overflow-hidden border-l border-white/20">
        {/* Header */}
        <div className="flex w-full h-20 shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-md z-30">
          {/* Left header */}
          <div className="w-[45%] h-full px-10 flex items-center border-r border-slate-100 bg-white">
            <button
              onClick={() => {
                if (phase === "tasks") {
                  setPhase("planning");
                } else {
                  navigate("/");
                }
              }}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 group mr-6"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Project Planning
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">{projectName}</h2>
            </div>
          </div>

          {/* Right header */}
          <div className="flex-1 h-full px-10 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0 shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                Strategy Overview
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {reportContent && phase === "planning" && (
                <>
                  <button
                    onClick={handleDownloadMd}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                    title="Download as Markdown"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  <button
                    onClick={handleSaveToDirectory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100"
                    title="Save to Project Directory"
                  >
                    <FolderDown className="w-3.5 h-3.5" /> Save to Directory
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                </>
              )}

              {(existingProject?.planningHistory?.length ?? 0) > 0 && (
                <button
                  onClick={() => setShowDiff((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                    showDiff
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-slate-400 border border-slate-100 hover:border-blue-200"
                  }`}
                >
                  {showDiff ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Skip Diff
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> View Changes
                    </>
                  )}
                </button>
              )}

              {isEditingReport && (
                <button
                  onClick={() => {
                    setIsEditingReport(false);
                    updateProjectPlanningReport(currentProjectId, reportContent, "user");
                  }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-green-500 text-white shadow-xl shadow-green-500/20 active:scale-95 transition-all"
                >
                  Save <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}

              {reportContent && !isEditingReport && phase === "planning" && (
                <button
                  onClick={() => {
                    elaboration.elaborate();
                    setPhase("tasks");
                  }}
                  title="Proceed to Execution Plan"
                  className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-90 transition-all animate-in zoom-in ml-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Phase stepper */}
              <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100 ml-2">
                <div
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    phase === "planning"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-400"
                  }`}
                >
                  1. Brainstorming
                </div>
                <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />
                <div
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    phase === "tasks"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-400"
                  }`}
                >
                  2. Execution Plan
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden bg-[#fafbfc]">
          {phase === "planning" ? (
             <PlanningPhaseView
               chat={chat}
               reportContent={reportContent}
               existingProject={existingProject}
               showDiff={showDiff}
               isEditingReport={isEditingReport}
               isGeneratingReport={isGeneratingReport}
               messagesEndRef={messagesEndRef}
               topFileInputRef={topFileInputRef}
               onEditReport={() => setIsEditingReport(true)}
               onReportChange={setReportContent}
               syncFileToAssets={syncFileToAssets}
            />
          ) : (
            <TasksPhaseView
               projectId={currentProjectId}
               chat={chat}
               elaboration={elaboration}
               structuredReport={structuredReport}
               onStartExecution={handleStartExecution}
               messagesEndRef={messagesEndRef}
               bottomFileInputRef={bottomFileInputRef}
               syncFileToAssets={syncFileToAssets}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT MARKDOWN — rich visual renderer for the Strategy Overview panel
// ─────────────────────────────────────────────────────────────────────────────


function ReportMarkdown({ content }: { content: string }) {
  // We use CSS styling instead of numbers for H2 to ensure clean rendering.
  return (
    <div className="report-markdown-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── H1: large prominent document title ───────────────────────────────
          h1: ({ children }) => (
            <div className="mb-12 pb-8 border-b border-slate-100/60 relative">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-blue-100/50 rounded-full blur-2xl" />
              <div className="absolute -bottom-6 right-10 w-24 h-24 bg-violet-100/40 rounded-full blur-3xl" />
              <h1 className="relative text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 tracking-tight leading-tight">
                {children}
              </h1>
            </div>
          ),

          // ── H2: elegant section header ───────────────────────────────────────
          h2: ({ children }) => (
            <h2 className="group flex items-center gap-3 mt-14 mb-6 relative">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 shadow-sm" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
                {children}
              </span>
            </h2>
          ),

          // ── H3: subtle sub-section label ───────────────────────────────────
          h3: ({ children }) => (
            <h3 className="text-[15px] font-bold text-slate-800 mt-8 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block shrink-0 ring-4 ring-indigo-50" />
              {children}
            </h3>
          ),

          // ── Paragraph ──────────────────────────────────────────────────────
          p: ({ children }) => (
            <p className="text-[15px] text-slate-600 leading-[1.8] mb-5 font-medium">{children}</p>
          ),

          // ── Unordered list ─────────────────────────────────────────────────
          ul: ({ children }) => (
            <ul className="my-5 pl-1 space-y-2.5">{children}</ul>
          ),

          // ── Ordered list ───────────────────────────────────────────────────
          ol: ({ children }) => (
            <ol className="my-5 pl-1 space-y-2.5 list-decimal list-inside text-slate-600 font-medium">{children}</ol>
          ),

          // ── List item ──────────────────────────────────────────────────────
          li: ({ children }) => (
            <li className="flex items-start gap-3 text-[14.5px] text-slate-600 leading-[1.7] relative group">
              <span className="mt-[8.5px] w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors duration-300 shrink-0" />
              <span className="flex-1 font-medium">{children}</span>
            </li>
          ),

          // ── Bold ───────────────────────────────────────────────────────────
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900 bg-slate-100/50 px-1 rounded">
              {children}
            </strong>
          ),

          // ── Blockquote ─────────────────────────────────────────────────────
          blockquote: ({ children }) => (
            <blockquote className="my-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-indigo-100/50 p-6 px-7 text-[14.5px] text-indigo-900/80 italic font-medium shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-blue-500" />
              {children}
            </blockquote>
          ),

          // ── Inline code ────────────────────────────────────────────────────
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <div className="my-6 relative rounded-2xl overflow-hidden shadow-md border border-slate-800 bg-[#0a0f18] group">
                  <div className="absolute top-0 w-full h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                  </div>
                  <code className="block text-slate-300 text-[13px] font-mono p-5 pt-12 overflow-x-auto leading-relaxed">
                    {children}
                  </code>
                </div>
              );
            }
            return (
              <code className="bg-white text-indigo-600 text-[13px] font-mono px-1.5 py-0.5 rounded-md font-semibold border border-slate-200/70 shadow-sm">
                {children}
              </code>
            );
          },

          // ── Horizontal rule ────────────────────────────────────────────────
          hr: () => (
            <div className="my-12 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          ),

          // ── Table ──────────────────────────────────────────────────────────
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto rounded-xl border border-slate-200/60 shadow-sm bg-white">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50/80 text-slate-600 text-[11px] font-black uppercase tracking-wider border-b border-slate-200/60">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-5 py-3.5 text-left">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-5 py-3 border-b border-slate-100/80 text-slate-600 font-medium">{children}</td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/50 transition-colors">{children}</tr>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANNING PHASE VIEW — chat + report side by side
// ─────────────────────────────────────────────────────────────────────────────

interface PlanningPhaseViewProps {
  chat: ReturnType<typeof usePlanningChat>;
  reportContent: string;
  existingProject: any;
  showDiff: boolean;
  isEditingReport: boolean;
  isGeneratingReport: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  topFileInputRef: React.RefObject<HTMLInputElement | null>;
  onEditReport: () => void;
  onReportChange: (v: string) => void;
  syncFileToAssets: (file: File, extracted: any[]) => void;
}

function PlanningPhaseView({
  chat,
  reportContent,
  existingProject,
  showDiff,
  isEditingReport,
  isGeneratingReport,
  messagesEndRef,
  topFileInputRef,
  onEditReport,
  onReportChange,
  syncFileToAssets,
}: PlanningPhaseViewProps) {
  return (
    <div className="flex w-full h-full overflow-hidden animate-in fade-in duration-700">
      {/* ── Chat Column ── */}
      <div className="w-[45%] flex flex-col bg-white border-r border-slate-100 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.03)] z-10">
        <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col gap-8 scrollbar-hide">
          {chat.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 max-w-[92%] transition-all animate-in slide-in-from-bottom-5 duration-500 ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 ${
                  msg.sender === "agent"
                    ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-lg shadow-slate-200"
                    : "bg-white text-slate-600 border-slate-100 shadow-sm"
                }`}
              >
                {msg.sender === "agent" ? (
                  <Sparkles className="w-5 h-5 text-blue-400" />
                ) : (
                  "Me"
                )}
              </div>

              {/* Bubble */}
              <div
                className={`group relative p-5 rounded-[24px] text-sm leading-[1.6] ${
                  msg.sender === "agent"
                    ? "bg-white border border-slate-100 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] text-slate-700 rounded-tl-none"
                    : "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/10 rounded-tr-none text-justify"
                }`}
              >
                <div className="prose prose-sm max-w-none text-current text-justify prose-table:border-collapse prose-th:border prose-th:border-slate-200 prose-th:bg-slate-50 prose-th:p-2 prose-td:border prose-td:border-slate-200 prose-td:p-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {(msg as any).text ?? ""}
                  </ReactMarkdown>
                  {(msg as any).attachments && (msg as any).attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/20">
                      {(() => {
                        const groups = new Map<string, any[]>();
                        (msg as any).attachments.forEach((a: any) => {
                          const key = a.originalFileName ?? a.name;
                          if (!groups.has(key)) groups.set(key, []);
                          groups.get(key)!.push(a);
                        });
                        return [...groups.entries()].map(([groupKey, items], idx) => {
                          const label = groupKey;
                          const pageCount = items.length > 1 ? ` (${items.length} pages)` : "";
                          return (
                            <div key={idx} className="flex items-center gap-1.5 bg-white/10 text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-sm">
                              <Paperclip className="w-3.5 h-3.5 opacity-70" />
                              <span className="font-medium max-w-[180px] truncate">{label}{pageCount}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {msg.suggestedAction && (
                  <div className="mt-5 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 backdrop-blur-sm animate-pulse">
                    <p className="text-[11px] text-blue-600 flex items-center gap-2 italic tracking-wide">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      {msg.suggestedAction.hint}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {chat.isTyping && (
            <div className="flex gap-4 max-w-[90%]">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-slate-300" />
              </div>
              <div className="p-5 rounded-[24px] rounded-tl-none bg-slate-50 text-slate-400 italic text-xs flex items-center gap-3 border border-slate-100/50">
                Assistant is thinking...
              </div>
            </div>
          )}

          {isGeneratingReport && (
            <div className="flex gap-4 max-w-[90%]">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-300" />
              </div>
              <div className="p-5 rounded-[24px] rounded-tl-none bg-blue-50 text-blue-400 italic text-xs flex items-center gap-3 border border-blue-100">
                Generating project report...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="max-w-4xl mx-auto w-full px-8 pb-4">
          {chat.pendingAttachments && chat.pendingAttachments.length > 0 && (() => {
            // Group pages of same PDF into one chip
            const groups = new Map<string, typeof chat.pendingAttachments>();
            for (const a of chat.pendingAttachments) {
              const key = a.originalFileName ?? a.name;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(a);
            }
            return (
              <div className="flex flex-wrap gap-2 mb-3 px-1">
                {[...groups.entries()].map(([groupKey, items]) => {
                  const label = groupKey;
                  const pageCount = items.length > 1 ? ` (${items.length} trang)` : "";
                  return (
                    <div key={groupKey} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[11px] px-3 py-1.5 rounded-full border border-blue-100 shadow-sm animate-in fade-in zoom-in duration-300">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium max-w-[180px] truncate">{label}{pageCount}</span>
                      <button
                        onClick={() => items.forEach(a => chat.removeAttachment(a.name))}
                        className="ml-1 hover:bg-white rounded-full p-0.5 text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="relative group/input flex items-end gap-2 bg-white border border-slate-100 rounded-2xl p-2 shadow-sm hover:shadow-md transition-all focus-within:border-blue-400">
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={topFileInputRef}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const file of files) {
                  try {
                    const extracted = await extractFileContent(file);
                    chat.addAttachments(extracted);
                    syncFileToAssets(file, extracted);
                  } catch (err) {
                    alert("Error reading file: " + file.name + "\nDetails: " + err);
                  }
                }
                e.target.value = ''; // Reset
              }}
            />
            <button
              onClick={() => topFileInputRef.current?.click()}
              className="p-3 mb-0.5 rounded-xl transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
              title="Upload file (images, PDF, DOCX, text...)"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              rows={1}
              placeholder="Share your vision or ask questions..."
              className="flex-1 bg-transparent pl-4 pr-2 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none resize-none max-h-[200px] overflow-y-auto"
              value={chat.inputText}
              onChange={(e) => {
                chat.setInputText(e.target.value);
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  chat.sendMessage();
                  e.currentTarget.style.height = "auto";
                }
              }}
            />
            <button
              onClick={() => chat.sendMessage()}
              className={`absolute right-2 bottom-2 p-4 rounded-2xl transition-all ${
                chat.inputText.trim()
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
                  : "bg-slate-50 text-slate-300"
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-4 font-medium uppercase tracking-[0.2em] opacity-60">
            Tips: Detailed descriptions help the AI plan better! 💡
          </p>
        </div>
      </div>

      {/* ── Report Panel ── */}
      <div className="flex-1 bg-[#fcfdfe] overflow-y-auto px-10 py-10">
        <div className="max-w-5xl mx-auto flex flex-col h-full">
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
            {!reportContent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-50 rounded-3xl m-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Awaiting Wisdom
                </h4>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto scrollbar-hide p-8 md:p-10 animate-in fade-in duration-500">
                {isEditingReport ? (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={reportContent}
                      onChange={(e) => onReportChange(e.target.value)}
                      className="flex-1 w-full bg-slate-50/50 p-6 md:p-8 rounded-2xl outline-none font-mono text-sm leading-relaxed resize-none text-slate-700"
                      placeholder="Refine strategy..."
                      autoFocus
                    />
                    <div className="mt-4 text-center text-[8px] font-black text-slate-300 uppercase tracking-[2px]">
                      Manual Collaborative Mode
                    </div>
                  </div>
                ) : (
                  <div
                    onDoubleClick={onEditReport}
                    title="Double-click to edit"
                    className="relative"
                  >
                    {showDiff &&
                    existingProject?.planningHistory &&
                    existingProject.planningHistory.length > 0 ? (
                      <div className="p-2">
                        <DiffViewer
                          oldText={
                            existingProject.planningHistory[
                              existingProject.planningHistory.length - 1
                            ].content
                          }
                          newText={reportContent}
                          version={existingProject.planningHistory.length}
                        />
                      </div>
                    ) : (
                      <ReportMarkdown content={reportContent} />
                    )}
                    <div className="my-10 w-full h-px bg-gradient-to-r from-blue-100 to-transparent" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASKS PHASE VIEW — AI-elaborated task cards
// ─────────────────────────────────────────────────────────────────────────────

interface TasksPhaseViewProps {
  projectId: string;
  chat: any;
  elaboration: ReturnType<typeof useTaskElaboration>;
  structuredReport: { title?: string; goal?: string; suggested_tasks?: string[] } | null;
  onStartExecution: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  bottomFileInputRef: React.RefObject<HTMLInputElement | null>;
  syncFileToAssets: (file: File, extracted: any[]) => void;
}

function TasksPhaseView({
  projectId,
  chat,
  elaboration,
  structuredReport,
  onStartExecution,
  messagesEndRef,
  bottomFileInputRef,
  syncFileToAssets,
}: TasksPhaseViewProps) {
  const { detailedTasks, isElaborating, expandedTasks, toggleTaskExpand, elaborate } = elaboration;
  const hasTasks = detailedTasks.length > 0;
  const hasSuggestedTitles = (structuredReport?.suggested_tasks?.length ?? 0) > 0;

  return (
    <div className="flex w-full h-full overflow-hidden animate-in fade-in duration-700 bg-white">
      {/* ── Chat Column ── */}
      <div className="w-[45%] flex flex-col bg-white border-r border-slate-100 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.03)] z-10">
        <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col gap-6 scrollbar-hide">

          {chat.messages.map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex gap-4 max-w-[92%] transition-all animate-in slide-in-from-bottom-5 duration-500 ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 ${
                msg.sender === "agent" ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-lg" : "bg-white text-slate-600 border-slate-100 shadow-sm"
              }`}>
                {msg.sender === "agent" ? <Sparkles className="w-5 h-5 text-blue-400" /> : "Me"}
              </div>
              <div className={`group relative p-5 rounded-[24px] text-sm leading-[1.6] ${
                msg.sender === "agent" ? "bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-none" : "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/10 rounded-tr-none text-justify"
              }`}>
                <div className="prose prose-sm max-w-none text-current text-justify prose-table:border-collapse prose-th:border prose-th:border-slate-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text || ""}</ReactMarkdown>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/20">
                      {(() => {
                        const groups = new Map<string, any[]>();
                        msg.attachments.forEach((a: any) => {
                          const key = a.originalFileName ?? a.name;
                          if (!groups.has(key)) groups.set(key, []);
                          groups.get(key)!.push(a);
                        });
                        return [...groups.entries()].map(([groupKey, items], idx) => {
                          const label = groupKey;
                          const pageCount = items.length > 1 ? ` (${items.length} pages)` : "";
                          return (
                            <div key={idx} className="flex items-center gap-1.5 bg-white/10 text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-sm">
                              <Paperclip className="w-3.5 h-3.5 opacity-70" />
                              <span className="font-medium max-w-[180px] truncate">{label}{pageCount}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {chat.isTyping && (
             <div className="flex gap-4 max-w-[90%]">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center"><Sparkles className="w-5 h-5 text-slate-300" /></div>
                <div className="p-5 rounded-[24px] rounded-tl-none bg-slate-50 text-slate-400 italic text-xs animate-pulse">Assistant is thinking...</div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Inside Tasks View */}
        <div className="w-full px-8 pb-6 bg-white border-t border-slate-50 pt-4">
          {chat.pendingAttachments && chat.pendingAttachments.length > 0 && (() => {
            // Group pages of same PDF into one chip
            const groups = new Map<string, typeof chat.pendingAttachments>();
            for (const a of chat.pendingAttachments) {
              const key = a.originalFileName ?? a.name;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(a);
            }
            return (
              <div className="flex flex-wrap gap-2 mb-3 px-1">
                {[...groups.entries()].map(([groupKey, items]) => {
                  const label = groupKey;
                  const pageCount = items.length > 1 ? ` (${items.length} trang)` : "";
                  return (
                    <div key={groupKey} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[11px] px-3 py-1.5 rounded-full border border-blue-100 shadow-sm animate-in fade-in zoom-in duration-300">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium max-w-[180px] truncate">{label}{pageCount}</span>
                      <button
                        onClick={() => items.forEach((a: { name: string }) => chat.removeAttachment(a.name))}
                        className="ml-1 hover:bg-white rounded-full p-0.5 text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="relative group/input flex items-end gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-2 shadow-sm focus-within:border-blue-400">
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={bottomFileInputRef}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const file of files) {
                  try {
                    const extracted = await extractFileContent(file);
                    chat.addAttachments(extracted);
                    syncFileToAssets(file, extracted);
                  } catch (err) {
                    alert("Error reading file: " + file.name + "\nDetails: " + err);
                  }
                }
                e.target.value = ''; // Reset
              }}
            />
            <button
              onClick={() => bottomFileInputRef.current?.click()}
              className="p-3 mb-0.5 rounded-xl transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50 shrink-0"
              title="Upload file (ảnh, PDF, DOCX, text...)"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              rows={1}
              placeholder="Ask AI to refine tasks or add new ones..."
              className="flex-1 bg-transparent pl-4 pr-2 py-2 text-sm text-slate-700 focus:outline-none resize-none max-h-[120px] overflow-y-auto"
              value={chat.inputText}
              onChange={(e) => {
                chat.setInputText(e.target.value);
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  chat.sendMessage();
                  e.currentTarget.style.height = "auto";
                }
              }}
            />
            <button onClick={() => chat.sendMessage()} className={`p-4 rounded-2xl transition-all ${chat.inputText.trim() ? "bg-blue-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — tasks */}
      <div className="flex-1 bg-white p-16 overflow-y-auto scrollbar-hide">
        <div className="w-full px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">
              Execution Plan
            </h2>
            {!isElaborating && (
              <div className="flex items-center gap-3">
                {!hasTasks && hasSuggestedTitles && (
                  <button
                    onClick={elaborate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Sparkles className="w-4 h-4" /> AI Elaborate Tasks
                  </button>
                )}
                {hasTasks && (
                  <button
                    onClick={onStartExecution}
                    className="flex items-center gap-2 px-7 py-3 bg-[#0a192f] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-950 transition-all shadow-xl shadow-blue-900/10"
                  >
                    Begin Execution <Play className="w-4 h-4 fill-current" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Elaborating state */}
          {isElaborating && (
            <div className="flex flex-col items-center justify-center py-20 gap-6 animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-800 mb-2">
                  AI is elaborating tasks...
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  Generating descriptions, subtasks and context for each task
                </p>
              </div>
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {hasTasks
              ? detailedTasks.map((task, idx) => (
                  <TaskCard
                    key={idx}
                    projectId={projectId}
                    task={task}
                    index={idx}
                    isExpanded={expandedTasks.has(idx)}
                    onToggle={() => toggleTaskExpand(idx)}
                  />
                ))
              : !isElaborating &&
                (structuredReport?.suggested_tasks ?? []).map(
                  (title: string, idx: number) => (
                    <BareTitleCard key={idx} title={title} index={idx} />
                  )
                )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK CARD — AI-elaborated, expandable
// ─────────────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  projectId: string;
  task: DetailedTask;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function TaskCard({ projectId, task, index, isExpanded, onToggle }: TaskCardProps) {
  const { updateProjectDetailedTask } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);

  const handleSave = () => {
    updateProjectDetailedTask(projectId, index, { title: editTitle, description: editDesc }, "user");
    setIsEditing(false);
  };

  const hasHistory = (task.history?.length ?? 0) > 0;

  return (
    <div className={`rounded-[28px] bg-white border transition-all overflow-hidden ${isEditing ? "border-blue-400 ring-4 ring-blue-50" : "border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-blue-200"}`}>
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between p-7 cursor-pointer group"
        onClick={() => !isEditing && onToggle()}
        onDoubleClick={() => setIsEditing(true)}
        title="Double-click to edit"
      >
        <div className="flex items-center gap-5 flex-1 mr-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-500 transition-all font-black text-lg flex-shrink-0">
            {index + 1}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input 
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 p-2 rounded-lg font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                autoFocus
              />
            ) : (
              <span className="text-base font-bold text-slate-800 tracking-tight block">
                {task.title}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasHistory && !isEditing && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDiff(!showDiff); }} 
              className={`p-2 rounded-xl transition-all ${showDiff ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
              title="View Changes"
            >
              <History className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-slate-300 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded details */}
      {(isExpanded || isEditing) && (
        <div className="px-7 pb-7 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
          <div className="mt-5">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
              What this involves
            </h5>
            
            {isEditing ? (
              <textarea 
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="w-full bg-slate-50 p-4 rounded-2xl text-sm text-slate-600 leading-relaxed outline-none focus:ring-2 focus:ring-blue-200 min-h-[120px]"
              />
            ) : (
              <div className="relative">
                {showDiff && task.history && task.history.length > 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                     <DiffViewer 
                        oldText={task.history[task.history.length-1].description} 
                        newText={task.description} 
                        version={task.history.length}
                     />
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed text-justify">{task.description}</p>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="mt-8 flex gap-3">
              <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                Save Changes
              </button>
              <button onClick={() => { setIsEditing(false); setEditTitle(task.title); setEditDesc(task.description); }} className="px-6 bg-slate-100 text-slate-500 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200">
                Cancel
              </button>
            </div>
          )}

          {!isEditing && (
            <>
              {task.why && (
                <div className="mt-5 p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3" /> Why this matters
                  </h5>
                  <p className="text-sm text-amber-900 font-medium leading-relaxed text-justify">{task.why}</p>
                </div>
              )}

              {task.suggested_subtasks.length > 0 && (
                <div className="mt-5">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Subtasks
                  </h5>
                  <ul className="space-y-2">
                    {task.suggested_subtasks.map((sub, sIdx) => (
                      <li key={sIdx} className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-md border-2 border-slate-100 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        </div>
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BARE TITLE CARD — fallback before AI elaboration
// ─────────────────────────────────────────────────────────────────────────────

function BareTitleCard({ title, index }: { title: string; index: number }) {
  return (
    <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-blue-200 transition-all flex items-center justify-between group">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-500 transition-all font-black text-lg">
          {index + 1}
        </div>
        <span className="text-lg font-bold text-slate-700 tracking-tight">{title}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Task #{index + 1}
      </div>
    </div>
  );
}
