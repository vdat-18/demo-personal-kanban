import { useState } from "react";
import { ArrowLeft, Send, Paperclip, FileText, CheckCircle2, ListTodo, Sparkles, Edit3, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import type { Task, Project } from "@/store/useProjectStore";

type Phase = "chat" | "report" | "tasks";

export function PlanningScreen() {
  const navigate = useNavigate();
  const { addProject } = useProjectStore();
  const [phase, setPhase] = useState<Phase>("chat");
  const [inputText, setInputText] = useState("");

  const handleStartExecution = () => {
    const newProjectId = Math.random().toString(36).substring(7);
    const initialTasks: Task[] = [
      "Identify top 5 competitors", 
      "Collect social media data", 
      "Analyze landing pages & UX", 
      "Analyze content & tone of voice", 
      "Compare pricing & packages"
    ].map((title, idx) => ({
      id: `task-${idx}-${newProjectId}`,
      title,
      description: `AI-generated task based on project vision for ${title}.`,
      status: idx === 0 ? 'doing' : 'todo', // First task starts in doing
      agentType: idx === 0 ? 'Doer Agent' : 'Starter Agent',
      updatedAt: 'Just now',
      subtasks: [
        { id: `s1-${idx}`, text: 'Initial research and discovery', completed: false },
        { id: `s2-${idx}`, text: 'Data collection', completed: false },
        { id: `s3-${idx}`, text: 'Drafting report', completed: false }
      ]
    }));

    const newProject: Project = {
      id: newProjectId,
      name: "Strategy Review - New Market Entry",
      description: "Research and analysis of competitor marketing strategies.",
      status: 'execution',
      tasks: initialTasks
    };

    addProject(newProject);
    navigate(`/mission-control/${newProjectId}`);
  };

  const chatMessages = [
    { sender: "agent", text: "Hi! I'm your AI Planner. What do you want to work on today? Tell me about your project or idea." },
  ];

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden">
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
            <div className="flex items-center gap-2">
               <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${phase === "chat" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-gray-100 text-gray-400"}`}>Phase 1: Chat</span>
               <span className="text-gray-200">→</span>
               <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${phase === "report" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-gray-100 text-gray-400"}`}>Phase 2: Report</span>
               <span className="text-gray-200">→</span>
               <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${phase === "tasks" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-gray-100 text-gray-400"}`}>Phase 3: Tasks</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {phase === "chat" && (
                <button 
                    onClick={() => setPhase("report")}
                    className="bg-[#0a192f] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-sm"
                >
                    Write the Report <FileText className="w-4 h-4" />
                </button>
            )}
            {phase === "report" && (
                <button 
                    onClick={() => setPhase("tasks")}
                    className="bg-[#0a192f] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-sm"
                >
                    Create Task List <ListTodo className="w-4 h-4" />
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
             <div className="flex flex-col w-full max-w-4xl mx-auto h-full">
                <div className="flex-1 overflow-y-auto p-12 flex flex-col gap-8">
                   {chatMessages.map((msg, i) => (
                       <div key={i} className={`flex gap-5 max-w-[80%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold border ${msg.sender === "agent" ? "bg-[#0a192f] text-white border-[#0a192f] shadow-sm" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                             {msg.sender === "agent" ? "AI" : "Me"}
                          </div>
                          <div className={`p-5 rounded-2xl leading-relaxed text-sm ${msg.sender === "agent" ? "bg-white border border-gray-100 shadow-sm text-gray-800" : "bg-blue-50 border border-blue-100 text-[#0a192f]"}`}>
                             {msg.text}
                          </div>
                       </div>
                   ))}
                </div>
                
                {/* Input Area */}
                <div className="p-8 bg-white border-t border-gray-50">
                    <div className="max-w-4xl mx-auto flex items-center gap-4 bg-[#f8f9fa] border border-gray-200 p-2.5 rounded-2xl focus-within:ring-4 focus-within:ring-blue-100/50 transition-all">
                        <button className="p-3 text-gray-400 hover:text-blue-600 transition-colors rounded-xl"><Paperclip className="w-5 h-5" /></button>
                        <input 
                            type="text" 
                            placeholder="Describe your idea or upload a project brief..." 
                            className="flex-1 bg-transparent border-none outline-none text-gray-700 font-medium px-2 py-3"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                        <button className="w-12 h-12 bg-[#0a192f] text-white rounded-xl flex items-center justify-center hover:bg-blue-900 transition-colors shadow-md">
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    </div>
                    <div className="text-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Context-aware AI session</div>
                </div>
             </div>
          ) : phase === "report" ? (
             <div className="flex w-full h-full overflow-hidden">
                {/* Left side: Recap Chat */}
                <div className="w-1/3 bg-[#f8f9fa] border-r border-gray-100 flex flex-col p-8 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">Conversational Context</h3>
                    <div className="flex flex-col gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 text-xs text-gray-500 leading-relaxed shadow-sm italic">
                           "User wants to research competitors for VecLam24h focusing on online marketing and website UX."
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 text-xs text-gray-500 leading-relaxed shadow-sm italic">
                           "Target audience is the Marketing Director. Goal is a new strategy proposal."
                        </div>
                    </div>
                    <button className="mt-8 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2" onClick={() => setPhase("chat")}>
                       <Sparkles className="w-4 h-4" /> Go back to chat
                    </button>
                </div>
                {/* Right side: The Report Content */}
                <div className="flex-1 bg-white p-12 overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-10">
                           <h2 className="text-3xl font-extrabold text-[#0a192f]">Project Vision & Scope</h2>
                           <button className="p-2 text-gray-400 hover:text-blue-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Edit3 className="w-4 h-4" /> Edit Report</button>
                        </div>
                        
                        <div className="space-y-10 text-gray-700">
                           <section>
                              <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-3">Goal</label>
                              <p className="text-lg font-medium leading-relaxed">Understand marketing strategy & UX of 5 main competitors of Veclam24h to propose a new direction.</p>
                           </section>
                           <section>
                              <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-3">Scope of Work</label>
                              <ul className="list-disc list-inside space-y-2 font-medium">
                                 <li>Detailed analysis of Website UX (Mobile & Desktop)</li>
                                 <li>Social media presence audit (FB, LinkedIn, Twitter)</li>
                                 <li>Pricing and recruitment package comparison</li>
                              </ul>
                           </section>
                           <section>
                              <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-3">Target Audience</label>
                              <p className="text-lg font-medium">Internal Marketing Director & Stakeholders.</p>
                           </section>
                        </div>
                    </div>
                </div>
             </div>
          ) : (
             <div className="flex w-full h-full overflow-hidden">
                {/* Left side: Report View */}
                <div className="w-1/3 bg-[#f8f9fa] border-r border-gray-100 flex flex-col p-8 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 tracking-[0.2em] mb-6 uppercase">Source Report</h3>
                    <div className="flex flex-col gap-4 opacity-70">
                       <h4 className="font-bold text-sm text-[#0a192f]">Project Vision & Scope</h4>
                       <div className="text-xs text-gray-500 line-clamp-3">Understand marketing strategy & UX of 5 main competitors of Veclam24h...</div>
                       <button className="text-[10px] font-bold text-blue-600 text-left" onClick={() => setPhase("report")}>VIEW FULL REPORT</button>
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
                           {["Identify top 5 competitors", "Collect social media data", "Analyze landing pages & UX", "Analyze content & tone of voice", "Compare pricing & packages"].map((task, idx) => (
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
