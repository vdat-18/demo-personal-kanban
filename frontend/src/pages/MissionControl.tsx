import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Plus,
  MoreHorizontal,
  Clock,
  ArrowLeft,
  ArrowRight,
  FileText,
  XCircle,
  Rocket,
  Sparkles,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { useProjectStore } from "@/store";
import { KANBAN_COLUMNS, STATUS_COLORS } from "@/constants/agents";
import type { Task, TaskStatus } from "@/types/domain";

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL DIALOG (inline — reused from TaskChat logic)
// ─────────────────────────────────────────────────────────────────────────────
function CancelDialog({
  taskTitle,
  onConfirm,
  onClose,
}: {
  taskTitle: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-black text-[#0a192f] mb-1">Cancel Task</h2>
        <p className="text-sm text-gray-400 mb-2 font-medium">"{taskTitle}"</p>
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
// SUBTASK PROGRESS BAR (shown on kanban cards)
// ─────────────────────────────────────────────────────────────────────────────
function SubtaskProgress({ task }: { task: Task }) {
  const total = task.subtasks.length;
  if (total === 0) return null;
  const done = task.subtasks.filter(s => s.completed).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{done}/{total} subtasks</span>
        <span className="text-[9px] font-black text-gray-300">{pct}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-400" : "bg-gray-300"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function MissionControl() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, moveTask, cancelTask, restoreTask } = useProjectStore();

  const project = projects.find(p => p.id === id) || projects[0];
  const tasks = project?.tasks ?? [];

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null);

  // Drag-and-drop state
  const dragTaskRef = useRef<{ taskId: string; fromStatus: TaskStatus } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const getNextStatus = (status: TaskStatus): TaskStatus | null => {
    switch (status) {
      case "todo": return "planning";
      case "planning": return "doing";
      case "doing": return "review";
      case "review": return "done";
      default: return null;
    }
  };

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, taskId: string, fromStatus: TaskStatus) => {
    dragTaskRef.current = { taskId, fromStatus };
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!dragTaskRef.current || !project) return;

    const { taskId, fromStatus } = dragTaskRef.current;
    dragTaskRef.current = null;

    if (fromStatus === targetStatus) return;

    if (targetStatus === "cancelled") {
      const task = tasks.find(t => t.id === taskId);
      if (task) setCancelTarget(task);
      return;
    }

    // Perform the move — flagged as "user" drag
    moveTask(project.id, taskId, targetStatus, "user", `Dragged from ${fromStatus} to ${targetStatus}`);
  };

  if (!project) {
    return <div className="p-8 text-center font-bold text-red-500">Project not found.</div>;
  }

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden">

      {/* Cancel Dialog */}
      {cancelTarget && (
        <CancelDialog
          taskTitle={cancelTarget.title}
          onConfirm={(reason) => {
            cancelTask(project.id, cancelTarget.id, reason, "user");
            setCancelTarget(null);
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0a192f] text-white flex items-center justify-center font-bold shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-[#0a192f] text-sm truncate max-w-[120px]">{project.name}</h2>
              <div className="text-xs text-gray-500 font-medium tracking-wide italic">AI-Managed</div>
            </div>
          </div>

          <button className="w-full bg-[#0a192f] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 mb-8 hover:bg-[#112a4f] transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> New Task
          </button>

          <nav className="flex flex-col gap-1">
            {KANBAN_COLUMNS.filter(c => c.id !== "cancelled").map(col => (
              <a key={col.id} href="#" className="flex items-center justify-between px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors group">
                <div className="flex items-center gap-3">
                  <col.Icon className="w-4 h-4 text-gray-400 group-hover:text-[#0a192f]" />
                  <span className="group-hover:text-[#0a192f]">{col.agent.split(" ")[0]}</span>
                </div>
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">
                  {getTasksByStatus(col.id).length}
                </span>
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 flex flex-col gap-1 border-t border-gray-100">
          <button
            onClick={() => navigate(`/planning/${project.id}`)}
            className="flex items-center gap-3 px-4 py-2.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-black transition-colors uppercase tracking-widest text-left"
          >
            <Sparkles className="w-4 h-4 text-blue-400" /> Brainstorm
          </button>
          <button
            onClick={() => navigate("/directory")}
            className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-black transition-colors uppercase tracking-widest text-left"
          >
            <Archive className="w-4 h-4 text-gray-400" /> Directory
          </button>
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-500 hover:bg-red-50">
            <XCircle className="w-4 h-4" /> Close Project
          </a>
        </div>
      </aside>

      {/* Main Board */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="px-8 py-8 bg-[#f8f9fa] shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0a192f] hover:border-[#0a192f] transition-all shadow-sm group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="text-[10px] font-black text-gray-400 mb-1 tracking-[0.2em] flex items-center gap-2 uppercase">
                  Project Board <span className="text-gray-200">/</span>
                  <span className="text-[#0a192f]">{project.name}</span>
                </div>
                <h1 className="text-4xl font-black text-[#0a192f] tracking-tight">Mission Control</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 md:ml-auto">
              <button className="flex items-center gap-2 bg-[#0a192f] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/10 active:scale-95">
                <Plus className="w-4 h-4" /> Add Task
              </button>
              <div className="h-8 w-px bg-gray-200 mx-2" />
              <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-[#0a192f] hover:border-[#0a192f] transition-all">
                <FileText className="w-4 h-4" /> Export Report
              </button>
              <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-[#0a192f] hover:border-[#0a192f] transition-all">
                <Archive className="w-4 h-4" /> View Docs
              </button>
              <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:text-[#0a192f] hover:border-[#0a192f] transition-all">
                <Clock className="w-4 h-4" /> History
              </button>
            </div>
          </div>
        </header>

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-4">
          <div className="flex gap-6 h-full items-start min-w-max">

            {KANBAN_COLUMNS.map(column => (
              <div
                key={column.id}
                className={`w-80 flex flex-col h-full rounded-[2.5rem] border shadow-inner overflow-hidden transition-colors ${
                  dragOverColumn === column.id
                    ? "bg-blue-50/60 border-blue-200"
                    : column.id === "cancelled"
                    ? "bg-red-50/30 border-red-100"
                    : "bg-gray-50/50 border-gray-100"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="p-6 flex justify-between items-center bg-transparent border-b border-gray-100/50">
                  <div className="flex items-center gap-3 font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase">
                    <div className={`p-2 rounded-xl border shadow-sm ${STATUS_COLORS[column.id]}`}>
                      <column.Icon className="w-3.5 h-3.5" />
                    </div>
                    {column.label}
                    <span className="bg-white border border-gray-200 text-[#0a192f] w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm ml-1 font-black">
                      {getTasksByStatus(column.id).length}
                    </span>
                  </div>
                  <button className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-white rounded-xl shadow-sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Drop hint for cancelled column */}
                {column.id === "cancelled" && dragOverColumn === "cancelled" && (
                  <div className="mx-4 mt-2 p-3 bg-red-100 rounded-2xl flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold">Drop to cancel this task</span>
                  </div>
                )}

                <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1 scrollbar-hide">
                  {getTasksByStatus(column.id).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                      onClick={() => task.status !== "cancelled" && navigate(`/chat/${task.id}`)}
                      className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-b-4 transition-all group relative overflow-hidden select-none ${
                        task.status === "cancelled"
                          ? "opacity-60 cursor-default border-red-100"
                          : "hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 cursor-pointer"
                      } ${task.status === "doing" ? "ring-2 ring-blue-100 border-blue-200 shadow-lg" : ""}`}
                    >
                      {/* Doing status indicator (removed Zap as requested) */}
                      {task.status === "doing" && (
                        <div className="absolute top-0 right-0 p-3">
                          {/* Pulse removed */}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.2em] uppercase border ${STATUS_COLORS[task.status]}`}>
                          {task.status}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Restore button for cancelled tasks */}
                          {task.status === "cancelled" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreTask(project.id, task.id);
                              }}
                              className="w-6 h-6 rounded-full bg-green-50 hover:bg-green-600 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-sm z-10"
                              title="Restore task to To Do"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel button */}
                          {task.status !== "done" && task.status !== "cancelled" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCancelTarget(task);
                              }}
                              className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10"
                              title="Cancel task"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Forward move button */}
                          {task.status !== "done" && task.status !== "cancelled" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = getNextStatus(task.status);
                                if (next) moveTask(project.id, task.id, next, "user");
                              }}
                              className="w-6 h-6 rounded-full bg-slate-50 hover:bg-[#0a192f] text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-sm z-10"
                              title="Move to next stage"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className={`font-bold text-sm leading-snug ${
                        task.status === "cancelled"
                          ? "text-gray-400 line-through"
                          : "text-[#0a192f] group-hover:text-blue-600 transition-colors"
                      }`}>
                        {task.title}
                      </h3>

                      {/* Cancel reason */}
                      {task.status === "cancelled" && task.cancelReason && (
                        <p className="text-[10px] text-red-400 font-medium mt-2 italic">
                          Reason: {task.cancelReason}
                        </p>
                      )}

                      {/* Description (hover reveal) */}
                      {task.status !== "cancelled" && (
                        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                          <p className="overflow-hidden text-[11px] text-gray-500 leading-relaxed font-medium text-justify group-hover:mt-3">
                            {task.description}
                          </p>
                        </div>
                      )}

                      {/* Subtask progress bar */}
                      <SubtaskProgress task={task} />
                    </div>
                  ))}

                  {getTasksByStatus(column.id).length === 0 && (
                    <div className={`flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-[2.5rem] bg-white/30 ${
                      dragOverColumn === column.id
                        ? "border-blue-300"
                        : column.id === "cancelled"
                        ? "border-red-100"
                        : "border-gray-100"
                    }`}>
                      <Archive className={`w-12 h-12 mb-4 ${column.id === "cancelled" ? "text-red-100" : "text-gray-100"}`} />
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
                        {dragOverColumn === column.id ? "Drop here" : "Empty Column"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Ghost add column */}
            <div className="w-80 h-full border-2 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center hover:bg-white hover:border-[#0a192f]/20 transition-all cursor-pointer group shrink-0">
              <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 border border-gray-100 flex items-center justify-center group-hover:bg-[#0a192f] group-hover:text-white group-hover:scale-110 group-hover:rotate-90 transition-all shadow-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] group-hover:text-[#0a192f] transition-colors">
                  Add Column
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="h-20 px-10 flex items-center justify-between bg-white border-t border-gray-100 shrink-0 relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-12">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Tasks</span>
              <span className="font-bold text-base text-[#0a192f]">{tasks.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">In Progress</span>
              <span className="font-bold text-base text-blue-600">
                {tasks.filter(t => t.status !== "done" && t.status !== "cancelled").length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest leading-none">Done</span>
              <span className="font-bold text-base text-green-600">{tasks.filter(t => t.status === "done").length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest leading-none">Cancelled</span>
              <span className="font-bold text-base text-red-500">{tasks.filter(t => t.status === "cancelled").length}</span>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-green-500 h-full transition-all duration-1000"
                  style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.status === "done").length / tasks.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                Completion {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0}%
              </span>
            </div>
          </div>

          <button
            disabled={tasks.some(t => t.status !== "done" && t.status !== "cancelled")}
            className={`px-10 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 uppercase tracking-widest border-b-4 ${
              tasks.some(t => t.status !== "done" && t.status !== "cancelled")
                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                : "bg-[#0a192f] text-white border-blue-950 hover:bg-blue-900 shadow-xl shadow-blue-900/20 active:translate-y-1 active:border-b-0"
            }`}
          >
            Close Project <Rocket className="w-4 h-4" />
          </button>
        </footer>
      </main>
    </div>
  );
}
