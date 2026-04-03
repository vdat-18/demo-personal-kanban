import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Paperclip, FileText, CheckCircle2, ListTodo, Sparkles, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import type { Task, Project } from "@/store/useProjectStore";
import { chatWithAgenticAI, generateProjectReport } from "@/lib/llm";
import type { SuggestedAction } from "@/lib/llm";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "planning" | "tasks";

interface Message {
  sender: "agent" | "user";
  text: string;
  suggestedAction?: SuggestedAction | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function PlanningScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { projects, addProject, startExecution } = useProjectStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const currentProjectId = id || sessionId;
  const existingProject = id ? projects.find((p) => p.id === id) : null;
  const initialProjectName =
    existingProject?.name || location.state?.projectName || "New Project";

  const [phase, setPhase] = useState<Phase>("planning");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "agent",
      text: `Hi! I'm your AI Planner. I see we're starting on **"${initialProjectName}"**. What do you want to work on today? Tell me more about your vision.`,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [structuredReport, setStructuredReport] = useState<{
    title: string;
    goal: string;
    scope: string[];
    constraints: string[];
    suggested_tasks: string[];
  } | null>(null);

  const [pendingAction, setPendingAction] = useState<SuggestedAction | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    setIsTyping(true);
    try {
      const data = await generateProjectReport(initialProjectName, messages);
      setReportContent(data.report);
      setStructuredReport(data.structured);
      // STAY in planning phase to show split view
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const dispatchAction = (action: SuggestedAction) => {
    if (action.type === "generate_report") {
      handleGenerateReport();
    } else if (action.type === "proceed_to_tasks") {
      setPhase("tasks");
    }
  };

  const handleStartExecution = () => {
    if (!structuredReport) return;

    const newProject: Project = {
      id: currentProjectId,
      name: structuredReport.title,
      goal: structuredReport.goal,
      status: "planning", // Match Store type
      tasks: structuredReport.suggested_tasks.map((title: string, idx: number) => ({
        id: `task-${Date.now()}-${idx}`,
        title,
        status: "todo",
        priority: "medium" as any,
        effort: "medium" as any,
        assignee: "AI Agent",
        description: "",
        subtasks: [],
        agentType: "doer",
        updatedAt: new Date().toISOString()
      })),
      createdAt: new Date().toISOString(),
    };

    if (!id) {
       addProject(newProject);
    }
    
    startExecution(currentProjectId);
    navigate(`/project/${currentProjectId}`);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const userText = inputText;
    setInputText("");
    setIsSending(true);

    const userMsg: Message = { sender: "user", text: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    setIsTyping(true);

    try {
      const history = updatedMessages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const response = await chatWithAgenticAI(history, pendingAction?.type);

      if (pendingAction && response.userIntent === "confirm") {
        const confirmedAction = pendingAction;
        setPendingAction(null);
        setMessages((prev: Message[]) => [
          ...prev,
          { sender: "agent", text: response.reply, suggestedAction: null },
        ]);
        setTimeout(() => dispatchAction(confirmedAction), 600);
      } else {
        setPendingAction(response.suggestedAction);
        setMessages((prev: Message[]) => [
          ...prev,
          {
            sender: "agent",
            text: response.reply,
            suggestedAction: response.suggestedAction,
          },
        ]);
      }
    } catch (error) {
      console.error("AI call failed:", error);
      setMessages((prev: Message[]) => [
        ...prev,
        {
          sender: "agent",
          text: "I'm sorry, I encountered an error. Please try again.",
          suggestedAction: null,
        },
      ]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden font-sans">
      {/* Left Sidebar */}
      <aside className="w-16 bg-[#0a192f] flex flex-col items-center py-8 gap-8 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
          <Sparkles className="w-5 h-5 text-blue-400" fill="currentColor" />
        </div>
        <div className="flex flex-col gap-6 text-gray-400">
          <div
            className={`p-2 rounded-lg transition-colors cursor-pointer ${phase === "planning" ? "bg-white/10 text-white" : "hover:text-white"}`}
            onClick={() => setPhase("planning")}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div
            className={`p-2 rounded-lg transition-colors cursor-pointer ${phase === "tasks" ? "bg-white/10 text-white" : "hover:text-white"}`}
            onClick={() => setPhase("tasks")}
          >
            <ListTodo className="w-5 h-5" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {/* Header */}
        <header className="h-16 px-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-black"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-100" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Planning Context
              </span>
              <h2 className="text-sm font-bold text-[#0a192f]">{initialProjectName}</h2>
            </div>
            <div className="h-6 w-px bg-gray-100" />
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                  phase === "planning"
                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                Phase 1: Planning & Synthesis
              </span>
              <span className="text-gray-200">→</span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                  phase === "tasks"
                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                Phase 2: Task Execution
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400" />
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {phase === "planning" ? (
            <div className="flex w-full h-full overflow-hidden">
              {/* Chat Panel */}
              <div className="w-1/2 flex flex-col border-r border-gray-100 bg-white shadow-sm z-10">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 pt-12">
                  {messages.map((msg: Message, i: number) => (
                    <div
                      key={i}
                      className={`flex gap-4 max-w-[90%] ${
                        msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border ${
                          msg.sender === "agent"
                            ? "bg-[#0a192f] text-white border-[#0a192f]"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {msg.sender === "agent" ? "AI" : "Me"}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`p-4 rounded-2xl leading-relaxed text-sm ${
                          msg.sender === "agent"
                            ? "bg-white border border-gray-100 shadow-sm text-gray-800"
                            : "bg-blue-50 border border-blue-100 text-[#0a192f]"
                        }`}
                      >
                        <div className="markdown-content prose-sm max-w-none prose-p:leading-relaxed text-justify">
                          <ReactMarkdown>{msg.text || ""}</ReactMarkdown>
                        </div>

                        {/* Suggested Action Hint (USER MUST PROMPT) */}
                        {msg.suggestedAction && (
                          <div className="mt-4 pt-4 border-t border-dotted border-gray-200">
                            <p className="text-[11px] text-blue-600 font-bold flex items-center justify-center gap-2 italic animate-in fade-in duration-700">
                              <Sparkles className="w-3 h-3" />
                              {msg.suggestedAction.hint}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex gap-4 max-w-[90%]">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-[#0a192f] text-white text-[10px]">
                        AI
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 italic text-sm flex items-center gap-2">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                        AI is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-gray-50">
                  <div className="flex flex-col gap-3">
                    {/* Pending suggestion indicator */}
                    {pendingAction && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 rounded-xl animate-in slide-in-from-top-2 duration-500">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest">
                          AI Suggestion: {pendingAction.hint}
                        </span>
                      </div>
                    )}
                    <div className="relative group">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type to brainstorm or confirm AI suggestions..."
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-16 text-sm focus:ring-2 focus:ring-blue-100 transition-all resize-none min-h-[56px] max-h-32 shadow-inner"
                        rows={1}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || isSending}
                        className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${
                          inputText.trim() && !isSending
                            ? "bg-[#0a192f] text-white shadow-lg shadow-blue-900/20"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REPORT PREVIEW (Live Synthesis) */}
              <div className="w-1/2 bg-[#fdfdfd] overflow-y-auto p-12">
                <div className="max-w-xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">
                        Live Synthesis
                      </h3>
                      <h2 className="text-2xl font-black text-[#0a192f]">Project Report</h2>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    {!reportContent ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-gray-100 rounded-[2rem] bg-white">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-400">No report generated yet</p>
                          <p className="text-xs text-gray-300 max-w-[200px] mx-auto mt-1 italic">
                            Brainstorm with AI. It will suggest a full report when enough details are gathered.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-700 prose prose-sm max-w-none text-gray-700 leading-relaxed text-justify">
                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {reportContent && (
                    <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                          <ListTodo className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-900">Vision Confirmed?</p>
                          <p className="text-[10px] text-blue-600 font-medium">Ready to break this down into tasks.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPhase("tasks")}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md group"
                      >
                        Build Task Plan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* PHASE 2: TASK EXECUTION LIST */
            <div className="flex w-full h-full overflow-hidden animate-in fade-in duration-500">
              <div className="w-1/3 bg-[#f8f9fa] border-r border-gray-100 flex flex-col p-8 overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">Source Report</h3>
                <div className="flex flex-col gap-4 opacity-70">
                  <h4 className="font-bold text-sm text-[#0a192f]">{structuredReport?.title}</h4>
                  <div className="text-xs text-gray-500 italic leading-relaxed line-clamp-4">
                    "{structuredReport?.goal}"
                  </div>
                </div>
                <button
                  onClick={() => setPhase("planning")}
                  className="mt-8 flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Planning
                </button>
              </div>

              <div className="flex-1 bg-white p-12 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-3xl font-extrabold text-[#0a192f] mb-10">Proposed Execution Plan</h2>
                  <div className="space-y-4">
                    {(structuredReport?.suggested_tasks || []).map((task: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-blue-200 transition-all flex items-center justify-between group animate-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-200 group-hover:border-blue-400 group-hover:text-blue-400 transition-colors">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{task}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 p-8 bg-[#0a192f] rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Final Step</p>
                      <h3 className="text-xl font-black">Begin Deployment</h3>
                      <p className="text-white/60 text-xs mt-1">Populate the kanban board with these tasks.</p>
                    </div>
                    <button
                      onClick={handleStartExecution}
                      className="relative z-10 bg-white text-[#0a192f] px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-3 shadow-xl"
                    >
                      Start Execution <Play className="w-4 h-4 ml-1" fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
