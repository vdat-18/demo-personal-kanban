import { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Send, FileText, CheckCircle2, ListTodo, Sparkles, Play, ChevronRight, MessageSquare, Target, Zap, Clock, History, Eye, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import * as Diff from 'diff';
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
  const { projects, addProject, startExecution, updateProjectPlanning, updateProjectPlanningReport } = useProjectStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const currentProjectId = id || sessionId;
  const existingProject = id ? projects.find((p) => p.id === id) : null;
  const initialProjectName =
    existingProject?.name || location.state?.projectName || "New Project";

  const [phase, setPhase] = useState<Phase>("planning");
  const [inputText, setInputText] = useState("");
  
  // Initialize from existing project history if available
  const [messages, setMessages] = useState<Message[]>(() => {
    if (existingProject?.planningMessages) return existingProject.planningMessages;
    return [
      {
        sender: "agent",
        text: `Hi there! 👋 I'm your Intelligent Planning Assistant. We're starting on the project **"${initialProjectName}"**. Could you share your vision or ideas for this project? Feel free to explain it in your own words!`,
      },
    ];
  });
  
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  const [reportContent, setReportContent] = useState(existingProject?.planningReport || "");
  const [structuredReport, setStructuredReport] = useState<any>(existingProject?.planningStructured || null);

  const [pendingAction, setPendingAction] = useState<SuggestedAction | null>(null);

  const DiffViewer = ({ oldText, newText, version }: { oldText: string, newText: string, version: number }) => {
    const diffs = useMemo(() => Diff.diffWords(oldText, newText), [oldText, newText]);
    
    return (
      <div className="bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200 animate-in fade-in duration-500">
        <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
          <Zap className="w-3 h-3 text-blue-500" /> Comparison: v{version} vs Current
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
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Essential: Sync to store whenever chat or report changes
  useEffect(() => {
     if (existingProject) {
        updateProjectPlanning(currentProjectId, messages, reportContent, structuredReport);
     } else if (messages.length > 1) {
        // Create initial project stub to host history
        const initialProj: Project = {
           id: currentProjectId,
           name: initialProjectName,
           description: "",
           status: "planning",
           tasks: [],
           planningMessages: messages,
           createdAt: new Date().toISOString()
        };
        addProject(initialProj);
     }
  }, [messages, reportContent, structuredReport]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    setIsTyping(true);
    try {
      const data = await generateProjectReport(initialProjectName, messages);
      setReportContent(data.report);
      setStructuredReport(data.structured);
      updateProjectPlanningReport(currentProjectId, data.report, "ai");
    } catch (err) {
      console.error("Report generation failed:", err);
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

    const generatedTasks: Task[] = structuredReport.suggested_tasks.map((title: string, idx: number) => ({
      id: `task-${Date.now()}-${idx}`,
      title,
      description: "",
      status: "todo",
      subtasks: [],
      agentType: "Starter Agent",
      updatedAt: new Date().toISOString()
    }));

    // If project was a temporary stub, it will be updated here to execution status
    startExecution(currentProjectId, generatedTasks);
    navigate(`/project/${currentProjectId}`);
  };

  const handleSendMessage = async (manualText?: string) => {
    const textToSend = manualText || inputText;
    if (!textToSend.trim()) return;

    if (isSending) {
      setMessageQueue(prev => [...prev, textToSend]);
      if (!manualText) setInputText("");
      return;
    }

    setIsSending(true);
    if (!manualText) setInputText("");

    const userMsg: Message = { sender: "user", text: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    setIsTyping(true);

    try {
      const history = updatedMessages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const response = await chatWithAgenticAI(history, pendingAction?.type, reportContent);

      // If user confirmed a pending action OR explicitly commanded it → dispatch it
      if (response.userIntent === "confirm") {
        if (response.suggestedAction?.type === "generate_report" && response.report) {
          setReportContent(response.report);
          updateProjectPlanningReport(currentProjectId, response.report, "ai");
        }
        const actionToDispatch = pendingAction || { type: "generate_report", hint: "Generating based on your request..." };
        setPendingAction(null);
        setMessages((prev: Message[]) => [
          ...prev,
          { sender: "agent", text: response.reply, suggestedAction: null },
        ]);
        setTimeout(() => dispatchAction(actionToDispatch), 600);
      } else {
        // Normal reply — attach new suggestedAction if any
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
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  // Queue Handler Effect
  useEffect(() => {
    if (!isSending && messageQueue.length > 0) {
      const nextMessage = messageQueue[0];
      setMessageQueue(prev => prev.slice(1));
      handleSendMessage(nextMessage);
    }
  }, [isSending, messageQueue]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full bg-[#f0f4f8] overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-10 gap-10 flex-shrink-0 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Zap className="w-6 h-6 fill-current text-white" />
        </div>
        <div className="flex flex-col gap-8 text-slate-500">
          <div
            className={`p-3 rounded-2xl transition-all cursor-pointer ${phase === "planning" ? "bg-white/10 text-white shadow-inner" : "hover:text-white hover:bg-white/5"}`}
            onClick={() => setPhase("planning")}
          >
            <MessageSquare className="w-6 h-6" />
          </div>
          <div
            className={`p-3 rounded-2xl transition-all cursor-pointer ${phase === "tasks" ? "bg-white/10 text-white shadow-inner" : "hover:text-white hover:bg-white/5"}`}
            onClick={() => setPhase("tasks")}
          >
            <ListTodo className="w-6 h-6" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative rounded-l-[40px] shadow-2xl overflow-hidden border-l border-white/20">
        {/* Header */}
        <header className="h-20 px-10 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 shrink-0 z-30">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                 <Target className="w-3.5 h-3.5 text-blue-500" />
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Planning</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">{initialProjectName}</h2>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <div className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${phase === "planning" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>
              1. Brainstorming
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 mx-1" />
            <div className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${phase === "tasks" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>
              2. Execution Plan
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden bg-[#fafbfc]">
          {phase === "planning" ? (
            <div className="flex w-full h-full overflow-hidden animate-in fade-in duration-700">
              {/* Chat Column */}
              <div className="w-[45%] flex flex-col bg-white border-r border-slate-100 relative shadow-[10px_0_30px_-15px_rgba(0,0,0,0.03)] z-10">
                <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col gap-8 scrollbar-hide">
                  {messages.map((msg: Message, i: number) => (
                    <div
                      key={i}
                      className={`flex gap-4 max-w-[92%] transition-all animate-in slide-in-from-bottom-5 duration-500 ${
                        msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 ${
                        msg.sender === "agent"
                          ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-800 shadow-lg shadow-slate-200"
                          : "bg-white text-slate-600 border-slate-100 shadow-sm"
                      }`}>
                        {msg.sender === "agent" ? <Sparkles className="w-5 h-5 text-blue-400" /> : "Me"}
                      </div>

                      {/* Bubble */}
                      <div className={`group relative p-5 rounded-[24px] text-sm leading-[1.6] ${
                        msg.sender === "agent"
                          ? "bg-white border border-slate-100 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)] text-slate-700 rounded-tl-none"
                          : "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-500/10 rounded-tr-none text-justify"
                      }`}>
                        <div className="prose prose-sm max-w-none text-current text-justify">
                          <ReactMarkdown>{msg.text || ""}</ReactMarkdown>
                        </div>

                        {msg.suggestedAction && (
                          <div className="mt-5 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 backdrop-blur-sm animate-pulse">
                            <p className="text-[11px] text-blue-600 flex items-center gap-2 italic tracking-wide">
                              {msg.suggestedAction.hint}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-4 max-w-[90%]">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="p-5 rounded-[24px] rounded-tl-none bg-slate-50 text-slate-400 italic text-xs flex items-center gap-3 border border-slate-100/50">
                        <span className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:200ms]" />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:400ms]" />
                        </span>
                        Assistant is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-8 bg-gradient-to-t from-white via-white to-transparent">
                  <div className="relative group p-1 bg-white rounded-[28px] shadow-2xl shadow-slate-200 border border-slate-100 focus-within:border-blue-300 transition-all">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Share your vision or ask questions..."
                      className="w-full bg-transparent border-none rounded-[24px] p-4 pr-20 text-base focus:ring-0 resize-none min-h-[60px] max-h-40 placeholder:text-slate-300 text-slate-700 font-medium"
                      rows={1}
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      className={`absolute right-2 bottom-2 p-4 rounded-2xl transition-all ${
                        inputText.trim()
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

              {/* Report Preview */}
              <div className="flex-1 bg-[#fcfdfe] overflow-y-auto px-10 py-10">
                <div className="max-w-5xl mx-auto flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[1.5px] bg-blue-500 rounded-full" />
                        <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest">SYNTHESIS</h3>
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Strategy Overview</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button
                          disabled={(existingProject?.planningHistory?.length || 0) === 0}
                          onClick={() => setShowDiff(!showDiff)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all ${
                            showDiff ? "bg-blue-600 text-white shadow-md" : "hover:bg-white text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                          }`}
                        >
                          {showDiff ? <><EyeOff className="w-3 h-3" /> Hide Diff</> : <><Eye className="w-3 h-3" /> View Diff</>}
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <div className="flex items-center gap-2 pr-2 ml-1">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            v{(existingProject?.planningHistory?.length || 0) + 1}
                          </span>
                        </div>
                      </div>
                      
                      {isEditingReport && (
                        <button 
                          onClick={() => {
                            setIsEditingReport(false);
                            (updateProjectPlanningReport as any)(currentProjectId, reportContent, "user");
                          }}
                          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-green-500 text-white shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                        >
                          Save Changes <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                    {!reportContent ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-50 rounded-3xl m-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                          <FileText className="w-8 h-8" />
                        </div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Awaiting Wisdom</h4>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-y-auto scrollbar-hide p-8 md:p-10 animate-in fade-in duration-500">
                        {isEditingReport ? (
                          <div className="h-full flex flex-col">
                            <textarea
                               value={reportContent}
                               onChange={(e) => setReportContent(e.target.value)}
                               className="flex-1 w-full bg-slate-50/50 p-6 md:p-8 rounded-2xl outline-none font-mono text-sm leading-relaxed resize-none text-slate-700 border-none placeholder:text-slate-200"
                               placeholder="Refine strategy..."
                               autoFocus
                            />
                            <div className="mt-4 text-center text-[8px] font-black text-slate-300 uppercase tracking-[2px]">
                               Manual Collaborative Mode
                            </div>
                          </div>
                        ) : (
                          <div 
                            onDoubleClick={() => setIsEditingReport(true)}
                            title="Double-click to edit"
                            className="relative"
                          >
                             <div className="prose prose-slate prose-sm max-w-none 
                               prose-h1:text-2xl prose-h1:font-black prose-h1:tracking-tight prose-h1:mb-6 prose-h1:text-slate-900
                               prose-h2:text-lg prose-h2:font-bold prose-h2:tracking-tight prose-h2:text-slate-800 prose-h2:mt-8 prose-h2:mb-4
                               prose-p:text-slate-600 prose-p:leading-6 prose-p:mb-4
                               prose-li:text-slate-600 prose-li:my-1 prose-strong:text-slate-900 prose-strong:font-bold
                               text-justify
                             ">
                              {showDiff && existingProject?.planningHistory && existingProject.planningHistory.length > 0 ? (
                                <DiffViewer 
                                  oldText={existingProject.planningHistory[existingProject.planningHistory.length - 1].content} 
                                  newText={reportContent} 
                                  version={existingProject.planningHistory.length}
                                />
                              ) : (
                                <ReactMarkdown>{reportContent}</ReactMarkdown>
                              )}
                            </div>

                            {/* Decorative divider */}
                            <div className="my-10 w-full h-px bg-gradient-to-r from-blue-100 to-transparent"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Phase 2: Tasks List */
            <div className="flex w-full h-full overflow-hidden animate-in fade-in duration-700 bg-white">
              <div className="w-1/3 bg-slate-50/50 border-r border-slate-100 p-12 flex flex-col overflow-y-auto">
                 <div className="mb-10">
                   <button
                    onClick={() => setPhase("planning")}
                    className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:gap-3 transition-all underline underline-offset-8"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Planning
                  </button>
                 </div>
                
                {/* Queue Messages - Pending State */}
                {messageQueue.map((text, idx) => (
                  <div key={`queued-${idx}`} className="flex justify-end gap-3 mb-6 animate-in fade-in slide-in-from-right-4 duration-300 opacity-40">
                    <div className="max-w-[85%] px-5 py-3 rounded-2xl text-[14px] leading-relaxed bg-slate-100 text-slate-500 rounded-br-none shadow-sm relative group border border-slate-200">
                      <p className="font-medium text-justify">{text}</p>
                      <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                         <Clock className="w-3 h-3" /> Queued
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 flex-shrink-0 shadow-sm self-end">
                      Me
                    </div>
                  </div>
                ))}

                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-black text-slate-400 tracking-[3px] mb-4 uppercase">PROJECT VISION</h3>
                  <h4 className="text-xl font-black text-slate-900 mb-4">{structuredReport?.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed italic">
                    "{structuredReport?.goal}"
                  </p>
                  
                  <div className="mt-8 space-y-4">
                     <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Optimized Roadmap
                     </div>
                     <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        AI-Powered Assistance
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white p-20 overflow-y-auto scrollbar-hide">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-12">Step-by-Step Plan</h2>
                  
                  <div className="space-y-6">
                    {(structuredReport?.suggested_tasks || []).map((task: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-blue-200 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-500 transition-all font-black text-lg">
                            {idx + 1}
                          </div>
                          <span className="text-lg font-bold text-slate-700 tracking-tight">{task}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Task #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-16 p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[45px] text-white flex items-center justify-between shadow-2xl shadow-blue-500/30">
                    <div>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-[3px] mb-2 text-center">FINAL STEP</p>
                      <h3 className="text-2xl font-black">Start implementation!</h3>
                    </div>
                    <button
                      onClick={handleStartExecution}
                      className="bg-white text-blue-600 px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-50 active:scale-95 transition-all shadow-xl flex items-center gap-2"
                    >
                      Begin Execution <Play className="w-5 h-5 fill-current" />
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
