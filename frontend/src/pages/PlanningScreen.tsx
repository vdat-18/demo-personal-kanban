import { useState } from "react";
import { ArrowLeft, Send, Paperclip, FileText, CheckCircle2, ListTodo, Sparkles, Edit3, Play } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import type { Task, Project } from "@/store/useProjectStore";

type Phase = "chat" | "report" | "tasks";

export function PlanningScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { projects, addProject, startExecution } = useProjectStore();
  
  // Generate a stable ID for the planning session if one wasn't provided
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const currentProjectId = id || sessionId;

  // Find existing project if ID is provided
  const existingProject = id ? projects.find(p => p.id === id) : null;
  const initialProjectName = existingProject?.name || location.state?.projectName || "New Project";
  
  const [phase, setPhase] = useState<Phase>("chat");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([
    { sender: "agent", text: `Hi! I'm your AI Planner. I see we're starting on **"${initialProjectName}"**. What do you want to work on today? Tell me more about your vision.` },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [structuredReport, setStructuredReport] = useState<{
    title: string;
    goal: string;
    scope: string[];
    constraints: string[];
    suggested_tasks: string[];
  } | null>(null);

  const handleStartExecution = () => {
    const taskTitles = structuredReport?.suggested_tasks || [
        "Research and Discovery", 
        "Implementation Planning", 
        "Core Development", 
        "Testing and QA", 
        "Review and Finalization"
    ];

    const initialTasks: Task[] = taskTitles.map((title, idx) => ({
      id: `task-${idx}-${currentProjectId}`,
      title,
      description: `AI-generated task based on project vision for ${title}.`,
      status: idx === 0 ? 'doing' : 'todo',
      agentType: idx === 0 ? 'Doer Agent' : 'Starter Agent',
      updatedAt: 'Just now',
      subtasks: [
        { id: `s1-${idx}`, text: 'Initial research and discovery', completed: false },
        { id: `s2-${idx}`, text: 'Data collection/Implementation', completed: false },
        { id: `s3-${idx}`, text: 'Final verification', completed: false }
      ]
    }));

    if (id && existingProject) {
        startExecution(id, initialTasks);
    } else {
        const newProject: Project = {
          id: currentProjectId,
          name: initialProjectName,
          description: `AI-generated execution plan for ${initialProjectName}.`,
          status: 'execution',
          tasks: initialTasks
        };
        addProject(newProject);
    }

    navigate(`/mission-control/${currentProjectId}`);
  };

  const [isSending, setIsSending] = useState(false); // Strict guard

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending || isTyping) return;

    setIsSending(true);
    const currentInput = inputText;
    const userMessage = { sender: "user" as const, text: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${currentProjectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.text }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { sender: "agent", text: data.reply }]);
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      // Optional: Add a system message error for the user
      setMessages(prev => [...prev, { sender: "agent", text: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleGenerateReport = async () => {
    setPhase("report");
    try {
      const response = await fetch(`http://localhost:8000/api/v1/projects/${currentProjectId}/generate-report`, {
        method: "POST",
      });
      const data = await response.json();
      setReportContent(data.report);
      setStructuredReport(data.structured);
    } catch (error) {
      console.error("Failed to generate report:", error);
    }
  };

  // chatMessages removed, now using messages state

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden">
      {/* Left Sidebar - Navigation / Status */}
      <aside className="w-16 bg-[#0a192f] flex flex-col items-center py-8 gap-8 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
          <Sparkles className="w-5 h-5 text-blue-400" fill="currentColor" />
        </div>
        <div className="flex flex-col gap-6 text-gray-400">
           <div className={`p-2 rounded-lg transition-colors cursor-pointer ${phase === "chat" ? "bg-white/10 text-white" : "hover:text-white"}`} onClick={() => setPhase("chat")}><Sparkles className="w-5 h-5" /></div>
           <div className={`p-2 rounded-lg transition-colors cursor-pointer ${phase === "report" ? "bg-white/10 text-white" : "hover:text-white"}`} onClick={() => setPhase("report")}><FileText className="w-5 h-5" /></div>
           <div className={`p-2 rounded-lg transition-colors cursor-pointer ${phase === "tasks" ? "bg-white/10 text-white" : "hover:text-white"}`} onClick={() => setPhase("tasks")}><ListTodo className="w-5 h-5" /></div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {/* Header */}
        <header className="h-16 px-8 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-black">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-100"></div>
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planning Context</span>
               <h2 className="text-sm font-bold text-[#0a192f]">{initialProjectName}</h2>
            </div>
            <div className="h-6 w-px bg-gray-100"></div>
            <div className="flex items-center gap-2">
               <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${phase === "chat" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-gray-100 text-gray-400"}`}>Phase 1: Brainstorming</span>
               <span className="text-gray-200">→</span>
               <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${phase === "tasks" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-gray-100 text-gray-400"}`}>Phase 2: Task Execution</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {phase === "chat" && (
                <button 
                    onClick={handleGenerateReport}
                    className="bg-white border border-[#0a192f] text-[#0a192f] px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    Update Report <FileText className="w-4 h-4" />
                </button>
            )}
            {phase === "tasks" && (
                <button 
                    onClick={handleStartExecution}
                    className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg"
                >
                    Start Execution <Play className="w-4 h-4" fill="currentColor" />
                </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Layout changes based on phase */}
          {phase === "chat" ? (
             <div className="flex w-full h-full overflow-hidden">
                {/* Left side: Chat with AI */}
                <div className="w-1/2 flex flex-col border-r border-gray-100 bg-white">
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 pt-12">
                       {messages.map((msg, i) => (
                           <div key={i} className={`flex gap-4 max-w-[90%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border ${msg.sender === "agent" ? "bg-[#0a192f] text-white border-[#0a192f]" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                 {msg.sender === "agent" ? "AI" : "Me"}
                              </div>
                              <div className={`p-4 rounded-2xl leading-relaxed text-sm ${msg.sender === "agent" ? "bg-white border border-gray-100 shadow-sm text-gray-800" : "bg-blue-50 border border-blue-100 text-[#0a192f]"}`}>
                                 <div className="markdown-content prose-sm max-w-none prose-p:leading-relaxed">
                                    <ReactMarkdown>
                                      {msg.text || ""}
                                    </ReactMarkdown>
                                 </div>
                              </div>
                           </div>
                       ))}
                       {isTyping && (
                           <div className="flex gap-4 max-w-[90%]">
                              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-[#0a192f] text-white text-[10px]">
                                 AI
                              </div>
                              <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 italic text-sm">
                                 AI is thinking...
                              </div>
                           </div>
                       )}
                    </div>
                    
                    {/* Input Area */}
                    <div className="p-6 bg-white border-t border-gray-50">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 bg-[#f8f9fa] border border-gray-200 p-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                <input 
                                    type="text" 
                                    placeholder="Keep brainstorming or refine details..." 
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 font-medium px-2 py-2"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    disabled={isSending || isTyping}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSending || isTyping ? "bg-gray-400" : "bg-[#0a192f] hover:bg-blue-900"} text-white`}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Brainstorming Mode</span>
                                <button className="text-[9px] text-blue-600 font-bold uppercase tracking-widest flex items-center gap-1 hover:text-blue-800"><Paperclip className="w-3 h-3" /> Attach Context</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Live Report / Synthesis */}
                <div className="w-1/2 bg-[#fdfdfd] overflow-y-auto p-12">
                   <div className="max-w-xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Live Synthesis</h3>
                                <h2 className="text-2xl font-black text-[#0a192f]">Project Report</h2>
                            </div>
                            {!reportContent ? (
                                <button 
                                    onClick={handleGenerateReport}
                                    className="bg-white border-2 border-[#0a192f] text-[#0a192f] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    Generate Draft
                                </button>
                            ) : (
                                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                            )}
                        </div>

                        <div className="prose prose-sm max-w-none text-gray-600">
                           {!reportContent ? (
                               <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-gray-100 rounded-[2rem]">
                                   <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                                       <FileText className="w-6 h-6" />
                                   </div>
                                   <div>
                                       <p className="text-sm font-bold text-gray-400">No report generated yet</p>
                                       <p className="text-xs text-gray-300 max-w-[200px] mx-auto mt-1">Brainstorm with AI or click generate to see the structured vision.</p>
                                   </div>
                               </div>
                           ) : (
                               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                   <ReactMarkdown>{reportContent}</ReactMarkdown>
                               </div>
                           )}
                        </div>

                        {reportContent && (
                            <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                        <ListTodo className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-900">Ready for Execution?</p>
                                        <p className="text-[10px] text-blue-600 font-medium">Click next to generate specific tasks.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setPhase("tasks")}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all"
                                >
                                    Proceed to Tasks
                                </button>
                            </div>
                        )}
                   </div>
                </div>
             </div>
          ) : (
             <div className="flex w-full h-full overflow-hidden">
                {/* Left side: Report View */}
                <div className="w-1/3 bg-[#f8f9fa] border-r border-gray-100 flex flex-col p-8 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">Source Report</h3>
                    <div className="flex flex-col gap-4 opacity-70">
                       <h4 className="font-bold text-sm text-[#0a192f]">{structuredReport?.title || "Project Vision & Scope"}</h4>
                       <div className="text-xs text-gray-500 line-clamp-3 italic leading-relaxed">
                          "{structuredReport?.goal || "Analyzing user requirements and defining execution path..."}"
                       </div>
                    </div>
                </div>
                {/* Right side: Task Generation */}
                <div className="flex-1 bg-white p-12 overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-10">
                           <h2 className="text-3xl font-extrabold text-[#0a192f]">Proposed Execution Plan</h2>
                           <button className="p-2 text-gray-400 hover:text-blue-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Edit3 className="w-4 h-4" /> Edit Tasks</button>
                        </div>
                        
                        <div className="space-y-4">
                           {(structuredReport?.suggested_tasks || []).map((task, idx) => (
                              <div key={idx} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all flex items-start justify-between group">
                                 <div className="flex gap-4">
                                    <div className="w-6 h-6 rounded bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300 group-hover:border-blue-500 group-hover:text-blue-500"><CheckCircle2 className="w-4 h-4" /></div>
                                    <div>
                                       <h4 className="font-bold text-[#0a192f] text-sm">{task}</h4>
                                       <p className="text-xs text-gray-400 mt-1">Automatic subtasks defined by AI Planner.</p>
                                    </div>
                                 </div>
                              </div>
                           ))}
                           {(!structuredReport?.suggested_tasks) && (
                               <div className="py-20 text-center text-gray-300 italic text-sm">
                                   Wait for AI to generate the execution plan...
                               </div>
                           )}
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
