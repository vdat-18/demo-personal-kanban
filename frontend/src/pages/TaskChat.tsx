import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Send,
  Paperclip,
  MoreVertical,
  Activity,
  CheckCircle2,
  FileText,
  Rocket,
  Search,
  XCircle,
  Download,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  History,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/store";
import { chatWithAgent, buildKickoffUserMessage, getAgentSystemPrompt } from "@/lib/llm";
import { AGENT_ICONS } from "@/constants/agents";
import type { TaskStatus } from "@/types/domain";

interface ChatMsg { role: "user" | "assistant"; content: string; }

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWER VERDICT DETECTOR
// Parse agent reply to detect if Reviewer says APPROVED, NEEDS REVISION,
// and whether to go back to DOING or PLANNING
// ─────────────────────────────────────────────────────────────────────────────
type ReviewVerdict = "approved" | "needs_doing" | "needs_todo" | null;

function detectReviewerVerdict(text: string): ReviewVerdict {
  const upper = text.toUpperCase();
  if (upper.includes("APPROVED")) return "approved";
  if (upper.includes("NEEDS REVISION") || upper.includes("REVISE") || upper.includes("FAIL")) {
    // Check if it suggests going back to Todo vs Doing
    if (
      upper.includes("PLANNING") ||
      upper.includes("REPLAN") ||
      upper.includes("STRATEGY") ||
      upper.includes("TODO")
    ) {
      return "needs_todo";
    }
    return "needs_doing";
  }
  return null;
}

function detectSubtaskCommand(text: string): any[] | null {
  try {
    const data = JSON.parse(text.trim());
    if (data && data.action === "SET_SUBTASKS" && Array.isArray(data.subtasks)) {
      return data.subtasks;
    }
  } catch {
    // ignore
  }
  return null;
}

function detectCompleteSubtask(text: string): string | null {
  try {
    const data = JSON.parse(text.trim());
    if (data && data.action === "COMPLETE_SUBTASK" && data.subtask_text) {
      return data.subtask_text as string;
    }
  } catch {
    // ignore
  }
  return null;
}

function detectSuggestMove(text: string): { target: string; message: string } | null {
  try {
    const data = JSON.parse(text.trim());
    if (data && data.action === "SUGGEST_MOVE" && data.target) {
      return { target: data.target, message: data.message ?? "Ready to move to the next stage." };
    }
  } catch {
    // ignore
  }
  return null;
}

function detectVerdictCommand(text: string): { result: "needs_doing" | "needs_todo"; issues: string[] } | null {
  try {
    const data = JSON.parse(text.trim());
    if (data && data.action === "VERDICT" && (data.result === "needs_doing" || data.result === "needs_todo")) {
      return { result: data.result, issues: Array.isArray(data.issues) ? data.issues : [] };
    }
  } catch {
    // ignore
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function CancelDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-black text-[#0a192f] mb-2">Cancel This Task</h2>
        <p className="text-sm text-gray-500 mb-6">
          Optionally leave a reason. The task will be archived and can be restored later.
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 text-[#0a192f] placeholder:text-gray-300"
          rows={3}
          placeholder="Reason for cancelling... (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Keep Task
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors"
          >
            Cancel Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVE WARNING DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function MoveWarningDialog({
  incompletedCount,
  targetLabel,
  onConfirm,
  onClose,
}: {
  incompletedCount: number;
  targetLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#0a192f]">Subtasks Not Done</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          There are still <strong className="text-[#0a192f]">{incompletedCount} subtask(s)</strong> not yet completed.
          Are you sure you want to move this task to <strong className="text-[#0a192f]">{targetLabel}</strong>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Stay Here
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-amber-500 text-white text-sm font-black hover:bg-amber-600 transition-colors"
          >
            Move Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWER VERDICT DIALOG
// ─────────────────────────────────────────────────────────────────────────────
function ReviewerVerdictDialog({
  verdict,
  onConfirm,
  onClose,
}: {
  verdict: ReviewVerdict;
  onConfirm: (target: TaskStatus) => void;
  onClose: () => void;
}) {
  if (!verdict || verdict === "approved") return null;

  const isPlanning = verdict === "needs_todo";
  const targetStatus: TaskStatus = isPlanning ? "todo" : "doing";
  const targetLabel = isPlanning ? "To Do" : "Doing";
  const reason = isPlanning
    ? "The Reviewer detected a fundamental issue with the plan. The task needs to be re-planned in the To Do stage."
    : "Reviewer found issues with the output. Please fix the reported problems.";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-[#0a192f]">Reviewer Verdict</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">{reason}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Keep in Review
          </button>
          <button
            onClick={() => onConfirm(targetStatus)}
            className="flex-1 py-3 rounded-2xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600 transition-colors"
          >
            Send to {targetLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function TaskChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, moveTask, cancelTask, toggleSubtask, addAsset, assets, markKickoffDone, addSubtask, deleteSubtask, updateSubtask, setSubtasks } = useProjectStore();

  const [inputText, setInputText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [streamingReply, setStreamingReply] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingMoveStatus, setPendingMoveStatus] = useState<TaskStatus | null>(null);
  const [reviewerVerdict, setReviewerVerdict] = useState<ReviewVerdict>(null);

  // Planner Agent (TODO phase): AI-suggested move to doing
  const [suggestMove, setSuggestMove] = useState<{ target: string; message: string } | null>(null);

  // Manual subtask edit state
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showSubtaskHistory, setShowSubtaskHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const project = projects.find(p => p.tasks.some(t => t.id === id));
  const task = project?.tasks.find(t => t.id === id);
  const projectAssets = assets.filter(a => a.projectId === project?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingReply]);

  // ── Auto-kickoff: fire once per (taskId + status) combination ──────────────
  const kickoffFired = useRef(false);

  const fireKickoff = useCallback(async () => {
    if (!task || !project || isStreaming) return;
    if (task.kickoffDone) return;
    if (kickoffFired.current) return;
    kickoffFired.current = true;

    const systemPrompt = getAgentSystemPrompt(task.status);
    const kickoffMsg: ChatMsg = { role: "user", content: buildKickoffUserMessage(task) };

    setChatMessages([kickoffMsg]);
    setIsStreaming(true);
    setStreamingReply("");

    let fullReply = "";
    try {
      await chatWithAgent(
        task.agentType,
        [kickoffMsg],
        (delta) => {
          fullReply += delta;
          setStreamingReply(fullReply);
        },
        systemPrompt
      );
    } catch (e) {
      fullReply = `I'm your ${task.agentType}. Ready to help with: **${task.title}**. What would you like to do first?`;
    }

    setChatMessages([kickoffMsg, { role: "assistant", content: fullReply }]);
    setStreamingReply("");
    setIsStreaming(false);

    // Mark kickoff done in store to prevent duplicate calls
    markKickoffDone(project.id, task.id);

    // Auto-detect subtask updates
    const aiSubtasks = detectSubtaskCommand(fullReply);
    if (aiSubtasks && project && task) {
      setSubtasks(project.id, task.id, aiSubtasks, "ai");
    }

    // Auto-detect SUGGEST_MOVE from all agents (including Reviewer → done)
    if (task.status === "todo" || task.status === "doing" || task.status === "review") {
      const move = detectSuggestMove(fullReply);
      if (move) setSuggestMove(move);
    }

    // Reviewer: detect VERDICT JSON (primary) with keyword fallback
    if (task.status === "review") {
      const verdict = detectVerdictCommand(fullReply);
      if (verdict) {
        setReviewerVerdict(verdict.result as "needs_doing" | "needs_todo");
      } else {
        // Fallback: keyword detection
        const kwVerdict = detectReviewerVerdict(fullReply);
        if (kwVerdict && kwVerdict !== "approved") setReviewerVerdict(kwVerdict as "needs_doing" | "needs_todo");
      }
    }
  }, [task?.id, task?.status, task?.kickoffDone, project?.id, isStreaming]);

  // Reset kickoffFired ref when task or status changes (new column entry)
  useEffect(() => {
    kickoffFired.current = false;
  }, [task?.id, task?.status]);

  useEffect(() => {
    if (task && !task.kickoffDone && task.status !== "cancelled") {
      fireKickoff();
    }
  }, [task?.id, task?.status]);

  // ── Subtask derived state ──────────────────────────────────────────────────
  const completedSubtasks = task?.subtasks.filter(s => s.completed).length ?? 0;
  const totalSubtasks = task?.subtasks.length ?? 0;
  const incompleteSubtasks = totalSubtasks - completedSubtasks;

  if (!task || !project) {
    return <div className="p-8 text-center font-bold text-red-500">Task or project not found.</div>;
  }

  const AgentIcon = AGENT_ICONS[task.agentType] ?? Activity;

  // ── Move helpers ───────────────────────────────────────────────────────────
  const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "To Do",
    planning: "To Do", // Map planning to To Do label
    doing: "Doing",
    review: "Review",
    done: "Done",
    cancelled: "Cancelled",
  };

  const doMove = (targetStatus: TaskStatus) => {
    moveTask(project.id, task.id, targetStatus, "user");
    navigate(`/mission-control/${project.id}`);
  };

  const handleNextPhase = () => {
    let nextStatus: TaskStatus = "done";
    if (task.status === "todo") nextStatus = "doing"; // Skip planning
    else if (task.status === "doing") nextStatus = "review";
    else if (task.status === "review") nextStatus = "done";

    // Soft-warn if there are incomplete subtasks (except for done transition)
    if (nextStatus !== "done" && incompleteSubtasks > 0) {
      setPendingMoveStatus(nextStatus);
      return;
    }

    doMove(nextStatus);
  };

  // Review: Approve → Done
  const handleApprove = () => {
    doMove("done");
  };

  // Review: Reject → Doing or Planning (agent decides via verdict dialog)
  const handleReviewReject = () => {
    // Show manual choice if no auto-verdict yet
    if (!reviewerVerdict) {
      // Default to todo if no auto verdict
      setReviewerVerdict("needs_todo");
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || isStreaming || !task) return;
    const userMsg: ChatMsg = { role: "user", content: inputText.trim() };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setInputText("");
    setIsStreaming(true);
    setStreamingReply("");

    let fullReply = "";
    try {
      await chatWithAgent(
        task.agentType,
        newHistory,
        (delta) => {
          fullReply += delta;
          setStreamingReply(fullReply);
        },
        getAgentSystemPrompt(task.status)
      );
    } catch {
      fullReply = "Sorry, I encountered an error. Please try again.";
    }

    setChatMessages(prev => [...prev, { role: "assistant", content: fullReply }]);
    setStreamingReply("");
    setIsStreaming(false);

    // Auto-detect subtask updates in regular chat too
    const aiSubtasks = detectSubtaskCommand(fullReply);
    if (aiSubtasks && project && task) {
      setSubtasks(project.id, task.id, aiSubtasks, "ai");
    }

    // Auto-detect SUGGEST_MOVE in regular chat (all stages)
    if (task.status === "todo" || task.status === "doing" || task.status === "review") {
      const move = detectSuggestMove(fullReply);
      if (move) setSuggestMove(move);
    }

    // Reviewer: detect VERDICT JSON (primary) with keyword fallback
    if (task.status === "review") {
      const verdict = detectVerdictCommand(fullReply);
      if (verdict) {
        setReviewerVerdict(verdict.result as "needs_doing" | "needs_todo");
      } else {
        // Fallback: keyword detection
        const kwVerdict = detectReviewerVerdict(fullReply);
        if (kwVerdict && kwVerdict !== "approved") setReviewerVerdict(kwVerdict as "needs_doing" | "needs_todo");
        else if (kwVerdict === "approved") setReviewerVerdict("approved");
      }
    }
  };

  const handleExecuteSubtask = async (subtaskText: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isStreaming || !task) return;

    const prompt = `Please work on this subtask:\n"${subtaskText}"`;
    const userMsg: ChatMsg = { role: "user", content: prompt };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setIsStreaming(true);
    setStreamingReply("");

    let fullReply = "";
    try {
      await chatWithAgent(
        task.agentType,
        newHistory,
        (delta) => {
          fullReply += delta;
          setStreamingReply(fullReply);
        },
        getAgentSystemPrompt(task.status)
      );
    } catch {
      fullReply = "Sorry, I encountered an error. Please try again.";
    }

    setChatMessages(prev => [...prev, { role: "assistant", content: fullReply }]);
    setStreamingReply("");
    setIsStreaming(false);

    // Doer Agent: auto-tick completed subtask
    if (task.status === "doing") {
      const completedTitle = detectCompleteSubtask(fullReply);
      if (completedTitle && project && task) {
        const match = task.subtasks.find(
          s => !s.completed && s.text.toLowerCase().includes(completedTitle.toLowerCase().slice(0, 20))
        );
        if (match) {
          toggleSubtask(project.id, task.id, match.id);
        }
      }
      // Check if all subtasks now done → auto SUGGEST_MOVE to review
      const move = detectSuggestMove(fullReply);
      if (move) setSuggestMove(move);
    }
  };


  const handleExportSummary = () => {
    if (!task || !project) return;
    const summary = `# ${task.title}\n\n## Status: ${task.status}\n\n## Subtasks:\n${task.subtasks.map(s => `- [${s.completed ? "x" : " "}] ${s.text}`).join("\n")}\n\n## Chat History:\n${chatMessages.filter(m => m.role !== "user" || !m.content.startsWith("NEW TASK CONTEXT")).map(m => `### ${m.role === "user" ? "User" : task.agentType}\n${m.content}`).join("\n\n")}`;

    addAsset({
      id: `asset-summary-${Date.now()}`,
      name: `Summary - ${task.title}.md`,
      type: "document",
      projectId: project.id,
      projectName: project.name,
      agentName: "Reporter Agent",
      createdAt: new Date().toISOString(),
      size: `${(summary.length / 1024).toFixed(1)} KB`,
      content: summary,
      scope: "task",
      taskId: task.id,
    });

    const blob = new Blob([summary], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Summary_${task.title.replace(/\s+/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Summary exported and saved to Directory!");
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim() || !project || !task) return;
    // Save snapshot before manually adding
    if (task.subtasks.length > 0) {
      setSubtasks(
        project.id,
        task.id,
        task.subtasks.map(s => ({ text: s.text, description: s.description })),
        "user"
      );
    }
    addSubtask(project.id, task.id, newSubtaskText.trim());
    setNewSubtaskText("");
  };

  const handleDeleteSubtask = (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project || !task) return;
    deleteSubtask(project.id, task.id, subtaskId);
  };

  const handleStartEdit = (subtaskId: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubtaskId(subtaskId);
    setEditText(text);
  };

  const handleSaveEdit = (subtaskId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!project || !task || !editText.trim()) return;
    updateSubtask(project.id, task.id, subtaskId, editText.trim());
    setEditingSubtaskId(null);
    setEditText("");
  };

  // ── Visible messages: filter out the hidden kickoff user prompt ────────────
  const visibleMessages = chatMessages.filter(
    m => !(m.role === "user" && m.content.startsWith("NEW TASK CONTEXT:"))
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DONE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (task.status === "done") {
    return (
      <div className="flex flex-col flex-1 h-full w-full bg-white overflow-hidden">
        <header className="h-20 px-10 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(`/mission-control/${project.id}`)} className="p-3 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-black shadow-sm border border-gray-100 bg-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] font-black text-green-600 tracking-[0.2em] uppercase flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Task Completed
              </div>
              <h1 className="text-2xl font-black text-[#0a192f] tracking-tight">{task.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportSummary}
              className="flex items-center gap-2 bg-white border-2 border-gray-100 text-[#0a192f] px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-[#0a192f] transition-all"
            >
              <Download className="w-4 h-4" /> Export Summary
            </button>
            <button onClick={() => navigate(`/mission-control/${project.id}`)} className="flex items-center gap-2 bg-[#0a192f] text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/10">
              Back to Board <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 bg-gray-50/30">
          <div className="max-w-4xl mx-auto flex flex-col gap-12">
            {/* Reporter Summary Card */}
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl shadow-blue-900/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none" />
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-[#0a192f] uppercase tracking-widest">Reporter Agent Summary</h2>
              </div>
              <div className="space-y-6 text-gray-700">
                <p className="text-lg leading-relaxed font-medium">
                  Task <strong>"{task.title}"</strong> has been completed and approved by the Reviewer.
                </p>
                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Subtask Results</h3>
                  <ul className="flex flex-col gap-2">
                    {task.subtasks.map(s => (
                      <li key={s.id} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${s.completed ? "text-green-500" : "text-gray-300"}`} />
                        <div className="flex flex-col">
                          <span className={`${s.completed ? "" : "text-gray-400 line-through"}`}>{s.text}</span>
                          {s.description && (
                            <span className="text-[10px] text-gray-400 font-medium italic">{s.description}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Move history timeline */}
              {(task.moveHistory ?? []).length > 0 && (
                <div className="mt-10">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Task Journey</h3>
                  <div className="flex flex-col gap-2">
                    {(task.moveHistory ?? []).map((m, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-black text-gray-300">{m.from}</span>
                        <ArrowLeft className="w-3 h-3 rotate-180 text-gray-300" />
                        <span className="font-black text-[#0a192f]">{m.to}</span>
                        <span className="text-gray-300">·</span>
                        <span>{new Date(m.timestamp).toLocaleString()}</span>
                        {m.note && <span className="italic text-gray-400">— {m.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 flex flex-col gap-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Saved Artifacts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projectAssets.length > 0 ? projectAssets.map((asset) => (
                    <div key={asset.id} onClick={() => {
                      const blob = new Blob([asset.content ?? ""], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = asset.name;
                      a.click();
                    }} className="p-5 border-2 border-gray-100 rounded-2xl flex items-center justify-between group hover:border-[#0a192f] transition-all cursor-pointer bg-white shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-[#0a192f] line-clamp-1">{asset.name}</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase">{asset.size} · {asset.type}</div>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-gray-300 group-hover:text-[#0a192f]" />
                    </div>
                  )) : (
                    <div className="col-span-2 py-8 text-center border-2 border-dashed border-gray-50 rounded-3xl text-gray-300 font-bold uppercase text-[10px] tracking-widest">
                      No artifacts saved for this project yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-[#0a192f] rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center gap-10 shadow-2xl">
              <div className="flex-1">
                <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">Next Suggested Step</div>
                <h2 className="text-3xl font-black mb-4 leading-tight">View all tasks on the board</h2>
                <p className="text-blue-100/70 font-medium">Check which tasks are still in progress and pick the next one to work on.</p>
              </div>
              <button onClick={() => navigate(`/mission-control/${project.id}`)} className="bg-white text-[#0a192f] px-10 py-5 rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                Go to Board
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVE TASK VIEW (todo / planning / doing / review)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#f8f9fa] overflow-hidden">

      {/* Dialogs */}
      {showCancelDialog && (
        <CancelDialog
          onConfirm={(reason) => {
            cancelTask(project.id, task.id, reason, "user");
            setShowCancelDialog(false);
            navigate(`/mission-control/${project.id}`);
          }}
          onClose={() => setShowCancelDialog(false)}
        />
      )}

      {pendingMoveStatus && (
        <MoveWarningDialog
          incompletedCount={incompleteSubtasks}
          targetLabel={STATUS_LABELS[pendingMoveStatus]}
          onConfirm={() => {
            const target = pendingMoveStatus;
            setPendingMoveStatus(null);
            doMove(target);
          }}
          onClose={() => setPendingMoveStatus(null)}
        />
      )}

      {reviewerVerdict && reviewerVerdict !== "approved" && (
        <ReviewerVerdictDialog
          verdict={reviewerVerdict}
          onConfirm={(target) => {
            setReviewerVerdict(null);
            moveTask(project.id, task.id, target, "agent", `Reviewer sent back to ${target}`);
            navigate(`/mission-control/${project.id}`);
          }}
          onClose={() => setReviewerVerdict(null)}
        />
      )}

      {/* Top Header */}
      <header className="h-20 px-8 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(`/mission-control/${project.id}`)} className="p-3 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-black border border-gray-100 bg-white shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-gray-100" />
          <div>
            <h1 className="text-xl font-black text-[#0a192f] tracking-tight">{task.title}</h1>
            <div className="text-[10px] text-blue-600 font-black tracking-[0.2em] flex items-center gap-2 uppercase">
              Agent: {task.agentType} <span className="w-1 h-1 rounded-full bg-gray-300" /> Status: {task.status}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cancel button — always visible except on done/cancelled */}
          <button
            onClick={() => setShowCancelDialog(true)}
            className="text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-50 px-5 py-2.5 rounded-2xl transition-all flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>

          {/* Review: Reject */}
          {task.status === "review" && (
            <button
              onClick={handleReviewReject}
              className="text-xs font-black uppercase tracking-widest text-orange-500 hover:bg-orange-50 px-6 py-3 rounded-2xl transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Needs Revision
            </button>
          )}

          {/* Review: Approve */}
          {task.status === "review" ? (
            <button
              onClick={handleApprove}
              className="text-xs font-black uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-xl flex items-center gap-3 border-b-4 bg-green-600 text-white hover:bg-green-700 shadow-green-900/10 border-green-800"
            >
              Approve & Done <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNextPhase}
              className="text-xs font-black uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-xl flex items-center gap-3 border-b-4 bg-[#0a192f] text-white hover:bg-blue-900 shadow-blue-900/10 border-blue-950"
            >
              {task.status === "todo" ? (
                <>Start Doing <ArrowLeft className="w-4 h-4 rotate-180" /></>
              ) : (
                <>Move to Next Stage <ArrowLeft className="w-4 h-4 rotate-180" /></>
              )}
            </button>
          )}

          <button className="p-3 text-gray-400 hover:text-black rounded-xl hover:bg-gray-50 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Split Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Panel: Chat */}
        <div className="w-1/2 flex flex-col border-r border-gray-100 bg-white h-full relative">
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scrollbar-hide">

            {/* Streaming indicator when kickoff is loading */}
            {isStreaming && visibleMessages.length === 0 && (
              <div className="flex gap-4 max-w-[90%]">
                <div className="w-9 h-9 rounded-xl bg-[#0a192f] text-white flex-shrink-0 flex items-center justify-center shadow-lg">
                  <AgentIcon className="w-4 h-4" />
                </div>
                <div className="bg-[#f8f9fa] p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{task.agentType}</div>
                  <span className="flex gap-1 items-center text-gray-400 italic text-sm">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            {/* Visible chat history (kickoff prompt hidden) */}
            {visibleMessages.map((msg, i) => {
              const isAI = msg.role === "assistant";
              return (
                <div key={i} className={`flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300 ${isAI ? "max-w-[92%]" : "flex-row-reverse ml-auto max-w-[85%]"}`}>
                  {/* Avatar/Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm transition-all group-hover:scale-105 ${
                    isAI ? "bg-[#0a192f] text-white rotate-[-2deg]" : "bg-white text-blue-600 border border-slate-100 rotate-[2deg]"
                  }`}>
                    {isAI ? <AgentIcon className="w-5 h-5" /> : <div className="text-[10px] font-black uppercase tracking-widest leading-none">Me</div>}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {/* Header: Agent Name / Timestamp (Optional) */}
                    <div className={`flex items-center gap-2 px-1 ${!isAI ? "flex-row-reverse" : ""}`}>
                      {isAI && (
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          {task.agentType}
                        </span>
                      )}
                    </div>

                    {/* Bubble Content */}
                    <div className={`p-6 rounded-[2rem] text-[15px] leading-[1.8] text-justify tracking-normal transition-all duration-300 ${
                      isAI 
                        ? "bg-white border border-slate-100 shadow-xl shadow-slate-200/20 text-slate-700 rounded-tl-none group-hover:border-blue-100 group-hover:shadow-blue-500/5 group-hover:-translate-y-0.5" 
                        : "bg-[#0a192f] text-white rounded-tr-none shadow-2xl shadow-blue-900/10 group-hover:-translate-y-0.5"
                    }`}>
                      {isAI ? (
                        <div className="ai-prose text-justify">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none prose-invert prose-p:text-blue-50/90 prose-headings:text-white prose-strong:text-white prose-code:text-blue-200 prose-li:text-blue-50/80 text-justify">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming reply */}
            {isStreaming && (
              <div className="flex gap-4 max-w-[92%] animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center bg-[#0a192f] text-white rotate-[-2deg] shadow-lg">
                  {streamingReply ? <AgentIcon className="w-5 h-5" /> : <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] animate-pulse">
                      {streamingReply ? `${task.agentType} Typing...` : "AI Thinking..."}
                    </span>
                  </div>
                  <div className="p-6 rounded-[2rem] rounded-tl-none bg-white border border-blue-50 shadow-2xl shadow-blue-500/5 text-[15px] leading-[1.8] text-slate-700">
                    {streamingReply ? (
                      <div className="ai-prose text-justify">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingReply}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 items-center py-2 h-6">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-blue-200 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Agentic SUGGEST_MOVE banner — Starter/Planner/Doer/Reviewer */}
            {suggestMove && (task.status === "todo" || task.status === "planning" || task.status === "doing" || task.status === "review") && !isStreaming && (() => {
              const isTodo = task.status === "todo";
              const isDoing = task.status === "doing";
              const isReview = task.status === "review";
              const targetLabel = isTodo ? "Doing" : isDoing ? "Review" : isReview ? "Done ✅" : "Doing";
              const targetStatus: TaskStatus = isTodo ? "doing" : isDoing ? "review" : isReview ? "done" : "doing";
              const agentLabel = isTodo
                ? "Planner Agent · Plan Ready"
                : isDoing
                ? "Doer Agent · Execution Complete"
                : isReview
                ? "Reviewer Agent · Approved"
                : "Planner Agent · Plan Complete";
              const gradient = isTodo
                ? "from-[#0a192f] to-blue-900"
                : isDoing
                ? "from-violet-900 to-purple-800"
                : isReview
                ? "from-orange-600 to-amber-500"
                : "from-emerald-900 to-teal-800";
              const accentColor = isTodo ? "text-blue-400" : isDoing ? "text-violet-300" : isReview ? "text-orange-100" : "text-emerald-400";
              const iconColor = isTodo ? "text-blue-300" : isDoing ? "text-violet-300" : isReview ? "text-white" : "text-emerald-300";
              const iconBg = isTodo
                ? "bg-blue-500/20 border-blue-400/30"
                : isDoing
                ? "bg-violet-500/20 border-violet-400/30"
                : isReview
                ? "bg-white/20 border-white/30"
                : "bg-emerald-500/20 border-emerald-400/30";
              return (
                <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 mx-2">
                  <div className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 shadow-xl border border-white/10`}>
                    <div className="flex items-start gap-4 mb-5">
                      <div className={`w-10 h-10 rounded-2xl ${iconBg} border flex items-center justify-center shrink-0 mt-0.5`}>
                        <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />
                      </div>
                      <div>
                        <p className={`text-[10px] font-black ${accentColor} uppercase tracking-widest mb-1`}>{agentLabel}</p>
                        <p className="text-white text-sm font-medium leading-relaxed">{suggestMove.message}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSuggestMove(null);
                          doMove(targetStatus);
                        }}
                        className="flex-1 bg-white text-[#0a192f] rounded-2xl py-3 text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Move to {targetLabel}
                      </button>
                      <button
                        onClick={() => setSuggestMove(null)}
                        className="px-5 py-3 bg-white/10 text-white/70 hover:bg-white/20 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        Not yet
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          {task.status !== "doing" ? (
            <div className="p-6 bg-white border-t border-gray-100 shrink-0 relative z-10">
              <div className="flex items-center gap-3 bg-[#f8f9fa] border border-gray-200 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0a192f] transition-colors rounded-xl hover:bg-white">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder={isStreaming ? "AI is thinking..." : `Message ${task.agentType}...`}
                  className="flex-1 bg-transparent outline-none text-sm font-medium text-[#0a192f] placeholder:text-gray-400 py-2"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  disabled={isStreaming}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || isStreaming}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                    !inputText.trim() || isStreaming ? "bg-gray-300" : "bg-[#0a192f] hover:bg-blue-900 active:scale-95"
                  } text-white`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] text-center mt-3">
                Powered by Pi Agent · {task.agentType}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-blue-50/30 border-t border-blue-100 shrink-0 relative z-10 flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-[#0a192f]">Execution Mode Active</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const next = task.subtasks.find(s => !s.completed);
                    if (next) handleExecuteSubtask(next.text);
                  }}
                  disabled={isStreaming || completedSubtasks === totalSubtasks}
                  className="bg-[#0a192f] text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" /> Run Next Subtask
                </button>
                <div className="flex items-center gap-3 bg-[#f8f9fa] border border-gray-200 p-2 rounded-2xl flex-1 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <input
                    type="text"
                    placeholder={isStreaming ? "AI is working..." : "Or type a message..."}
                    className="flex-1 bg-transparent outline-none text-sm font-medium text-[#0a192f] placeholder:text-gray-400 py-1 px-2"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    disabled={isStreaming}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isStreaming}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      !inputText.trim() || isStreaming ? "bg-gray-200 text-gray-400" : "bg-[#0a192f] text-white hover:bg-blue-900"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Subtasks + Artifacts */}
        <div className="w-1/2 flex flex-col bg-gray-50/30 overflow-y-auto h-full scrollbar-hide">
          <div className="p-12 max-w-2xl mx-auto w-full flex flex-col gap-12">

            {/* Subtask section */}
            <section>
              <h2 className="text-[10px] font-black tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-3 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                {task.status === "review" ? "Validation Checklist" : "Execution Plan"}
                {/* View Changes toggle — only in TODO and if history exists */}
                {task.status === "todo" && (task.subtaskHistory?.length ?? 0) > 0 && (
                  <button
                    onClick={() => setShowSubtaskHistory(v => !v)}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      showSubtaskHistory
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    <History className="w-3 h-3" />
                    View Changes
                  </button>
                )}
              </h2>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-xl shadow-blue-900/5">
                <div className="flex justify-between items-end mb-10">
                  <div>
                    <h3 className="font-extrabold text-2xl mb-1 text-[#0a192f] tracking-tight">
                      {task.status === "review" ? "QA Review" : "Subtasks"}
                    </h3>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                      {task.status === "review" ? "Check quality vs criteria" : "Step-by-step progression"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-[#0a192f] leading-none">{completedSubtasks}/{totalSubtasks}</span>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">
                      {totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0}% Complete
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {totalSubtasks > 0 && (
                  <div className="mb-8">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-500"
                        style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Add Subtask Input */}
                  {(task.status === "todo" || task.status === "planning") && (
                    <div className="flex gap-2 mb-6">
                      <input
                        type="text"
                        placeholder="Add a subtask manually..."
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                      />
                      <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskText.trim()}
                        className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {task.subtasks.map(s => (
                    <div
                      key={s.id}
                      onClick={() => !editingSubtaskId && toggleSubtask(project.id, task.id, s.id)}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                        s.completed
                          ? "bg-gray-50/50 text-gray-300 border-gray-50 line-through grayscale"
                          : "bg-white text-[#0a192f] border-gray-100 shadow-sm hover:border-[#0a192f] hover:shadow-lg"
                      }`}
                    >
                      <div className="flex-1 flex items-center gap-4 text-sm font-black pr-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                          s.completed ? "bg-green-50 text-green-500" : "bg-gray-50 text-gray-200 group-hover:border-[#0a192f] border"
                        }`}>
                          {s.completed ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                        </div>
                        
                        {editingSubtaskId === s.id ? (
                          <input
                            autoFocus
                            className="flex-1 bg-blue-50 border-none outline-none text-[#0a192f] py-1 px-2 rounded"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => handleSaveEdit(s.id, {} as any)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(s.id, e)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                        <div className="flex-1">
                          <span className="block">{s.text}</span>
                          {s.description && (
                            <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                              <p className="overflow-hidden text-[10px] text-gray-400 font-medium italic mt-0 group-hover:mt-1 opacity-0 group-hover:opacity-100 transition-all">
                                {s.description}
                              </p>
                            </div>
                          )}
                        </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {!s.completed && (
                          <button
                            onClick={(e) => handleExecuteSubtask(s.text, e)}
                            disabled={isStreaming}
                            className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 shrink-0 flex items-center justify-center"
                            title="Execute with AI"
                          >
                            <Activity className="w-4 h-4" />
                          </button>
                        )}
                        {!s.completed && (task.status === "todo" || task.status === "planning") && (
                          <>
                            <button
                              onClick={(e) => handleStartEdit(s.id, s.text, e)}
                              className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all opacity-0 group-hover:opacity-100 shrink-0 flex items-center justify-center"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSubtask(s.id, e)}
                              className="w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0 flex items-center justify-center"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {task.subtasks.length === 0 && (
                    <div className="py-8 text-center text-gray-300 text-xs font-bold uppercase tracking-widest">
                      No subtasks defined. Ask the agent to create some.
                    </div>
                  )}

                  {task.status === "review" && (
                    <div className="mt-8 p-6 bg-orange-50/50 rounded-3xl border border-orange-100 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1">Reviewer Notes</h4>
                        <p className="text-xs text-orange-800 font-medium leading-relaxed italic">
                          The Reviewer Agent will assess the output and recommend Approve, send back to Doing, or send back to Planning.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtask history / diff view */}
              {task.status === "todo" && showSubtaskHistory && (task.subtaskHistory?.length ?? 0) > 0 && (() => {
                const history = task.subtaskHistory!;
                const prev = history[history.length - 1];
                const currentTexts = task.subtasks.map(s => s.text);
                const prevTexts = prev.items.map(s => s.text);
                const added = currentTexts.filter(t => !prevTexts.includes(t));
                const removed = prevTexts.filter(t => !currentTexts.includes(t));
                const unchanged = currentTexts.filter(t => prevTexts.includes(t));
                const byLabel = prev.by === "ai" ? "AI" : "You";
                const timeLabel = new Date(prev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div className="mt-6 bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 mb-5">
                      <History className="w-4 h-4 text-blue-500" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Last change by {byLabel} · {timeLabel}
                      </h4>
                      <span className="ml-auto text-[9px] font-black bg-gray-50 border border-gray-100 text-gray-400 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                        {history.length} revision{history.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs">
                      {removed.map((t, i) => (
                        <div key={`r-${i}`} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-red-600">
                          <span className="font-black text-red-400 shrink-0">&minus;</span>
                          <span className="line-through opacity-70">{t}</span>
                        </div>
                      ))}
                      {added.map((t, i) => (
                        <div key={`a-${i}`} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-green-700">
                          <span className="font-black text-green-500 shrink-0">+</span>
                          <span>{t}</span>
                        </div>
                      ))}
                      {unchanged.map((t, i) => (
                        <div key={`u-${i}`} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-500">
                          <span className="font-black text-gray-300 shrink-0">&nbsp;&nbsp;</span>
                          <span>{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Artifacts section */}
            <section>
              <h2 className="text-[10px] font-black tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-3 uppercase">
                <FileText className="w-4 h-4" /> Generated Artifacts
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {projectAssets.length > 0 ? projectAssets.map((asset) => (
                  <div key={asset.id} onClick={() => {
                    const blob = new Blob([asset.content ?? ""], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = asset.name;
                    a.click();
                  }} className="bg-white border border-gray-100 rounded-3xl p-6 flex gap-5 items-start hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer group shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-base font-black text-[#0a192f] line-clamp-1">{asset.name}</h4>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.type} · {asset.size}</p>
                      <div className="flex gap-2 mt-4">
                        <span className="text-[8px] font-black bg-gray-50 text-gray-500 px-2 py-1 rounded uppercase tracking-widest">{asset.agentName}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-white/30 text-gray-300 font-bold uppercase text-[10px] tracking-widest">
                    No artifacts yet. Ask the agent to generate something.
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
