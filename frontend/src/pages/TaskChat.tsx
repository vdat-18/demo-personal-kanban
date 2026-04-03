import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Paperclip, MoreVertical, Zap, CheckCircle2, FileText, Rocket, BookOpen, Search, XCircle, Download, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import type { TaskStatus } from "@/store/useProjectStore";
import { chatWithAgent } from "@/lib/llm";

const AGENT_ICONS: Record<string, any> = {
  'Starter Agent': Rocket,
  'Planner Agent': BookOpen,
  'Doer Agent': Zap,
  'Reviewer Agent': Search,
  'Reporter Agent': FileText
};

interface ChatMsg { role: "user" | "assistant"; content: string; }

export function TaskChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, moveTask, toggleSubtask } = useProjectStore();
  const [inputText, setInputText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [streamingReply, setStreamingReply] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingReply]);

  const project = projects.find(p => p.tasks.some(t => t.id === id));
  const task = project?.tasks.find(t => t.id === id);

  if (!task || !project) {
    return <div className="p-8 text-center font-bold text-red-500">Task or project not found.</div>;
  }

  const AgentIcon = AGENT_ICONS[task.agentType] || Zap;

  const handleNextPhase = () => {
    let nextStatus: TaskStatus = 'done';
    if (task.status === 'todo') nextStatus = 'planning';
    else if (task.status === 'planning') nextStatus = 'doing';
    else if (task.status === 'doing') nextStatus = 'review';
    else if (task.status === 'review') nextStatus = 'done';

    moveTask(project.id, task.id, nextStatus);
    navigate(`/mission-control/${project.id}`);
  };

  const handleReject = () => {
    moveTask(project.id, task.id, 'doing');
    navigate(`/mission-control/${project.id}`);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming || !task) return;
    const userMsg: ChatMsg = { role: "user", content: inputText.trim() };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setInputText("");
    setIsStreaming(true);
    setStreamingReply("");

    let fullReply = "";
    await chatWithAgent(task.agentType, newHistory, (delta) => {
      fullReply += delta;
      setStreamingReply(fullReply);
    });

    setChatMessages((prev) => [...prev, { role: "assistant", content: fullReply }]);
    setStreamingReply("");
    setIsStreaming(false);
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;

  // Screen 7: Done View (Full Report)
  if (task.status === 'done') {
    return (
      <div className="flex flex-col h-screen w-full bg-white overflow-hidden">
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
             <button className="flex items-center gap-2 bg-white border-2 border-gray-100 text-[#0a192f] px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-[#0a192f] transition-all">
                <Download className="w-4 h-4" /> Export Summary
             </button>
             <button className="flex items-center gap-2 bg-[#0a192f] text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/10">
                Next Suggested Task <ArrowLeft className="w-4 h-4 rotate-180" />
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-12 bg-gray-50/30">
          <div className="max-w-4xl mx-auto flex flex-col gap-12">
            
            {/* Reporter Summary Card */}
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-xl shadow-blue-900/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none"></div>
               
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-[#0a192f] uppercase tracking-widest">Reporter Agent Summary</h2>
               </div>

               <div className="space-y-6 text-gray-700">
                  <p className="text-lg leading-relaxed font-medium">
                    The task <strong>"{task.title}"</strong> has been successfully executed and reviewed. 
                    All criteria set during the planning phase were met with 100% compliance.
                  </p>
                  
                  <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Key Results</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <li className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-sm font-bold text-[#0a192f]">Identified 5 direct market competitors</span>
                       </li>
                       <li className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-sm font-bold text-[#0a192f]">Extracted social signals (800k+ reach)</span>
                       </li>
                    </ul>
                  </div>
               </div>

               <div className="mt-12 flex flex-col gap-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Saved Artifacts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-5 border-2 border-gray-100 rounded-2xl flex items-center justify-between group hover:border-[#0a192f] transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                           <div>
                              <div className="text-sm font-black text-[#0a192f]">competition_matrix.xlsx</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase">2.4 MB • spreadsheet</div>
                           </div>
                        </div>
                        <Download className="w-4 h-4 text-gray-300 group-hover:text-[#0a192f]" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Next Steps Prompt */}
            <div className="bg-[#0a192f] rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center gap-10 shadow-2xl">
               <div className="flex-1">
                  <div className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">Next Suggested Step</div>
                  <h2 className="text-3xl font-black mb-4 leading-tight">Analyze content & tone of voice</h2>
                  <p className="text-blue-100/70 font-medium">Reporter Agent suggests digging into the messaging strategies of the top 3 competitors discovered.</p>
               </div>
               <button className="bg-white text-[#0a192f] px-10 py-5 rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                  Initiate Next Task
               </button>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // Phase 1-6 View (Split Panel)
  return (
    <div className="flex flex-col h-screen w-full bg-[#f8f9fa] overflow-hidden">
      {/* Top Header */}
      <header className="h-20 px-8 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(`/mission-control/${project.id}`)} className="p-3 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-black border border-gray-100 bg-white shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-gray-100"></div>
          <div>
            <h1 className="text-xl font-black text-[#0a192f] flex items-center gap-3 tracking-tight">
              {task.title}
            </h1>
            <div className="text-[10px] text-blue-600 font-black tracking-[0.2em] flex items-center gap-2 uppercase">
              Agent: {task.agentType} <span className="w-1 h-1 rounded-full bg-gray-300"></span> Status: {task.status}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {task.status === 'review' && (
             <button 
               onClick={handleReject}
               className="text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-6 py-3 rounded-2xl transition-all flex items-center gap-2"
             >
               <XCircle className="w-4 h-4" /> Back to Doing
             </button>
          )}
          <button 
            onClick={handleNextPhase}
            className={`text-xs font-black uppercase tracking-widest px-8 py-3.5 rounded-2xl transition-all shadow-xl flex items-center gap-3 border-b-4 ${
              task.status === 'review' 
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-900/10 border-green-800' 
                : 'bg-[#0a192f] text-white hover:bg-blue-900 shadow-blue-900/10 border-blue-950'
            }`}
          >
            {task.status === 'review' ? 'Approve & Mark Done' : 'Move to Next Stage'} <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
          <button className="p-3 text-gray-400 hover:text-black rounded-xl hover:bg-gray-50 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Split Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Chat Interface */}
        <div className="w-1/2 flex flex-col border-r border-gray-100 bg-white h-full relative">
          
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scrollbar-hide">
            {/* Initial agent greeting */}
            <div className="flex gap-4 max-w-[90%]">
              <div className="w-9 h-9 rounded-xl bg-[#0a192f] text-white flex-shrink-0 flex items-center justify-center shadow-lg">
                <AgentIcon className="w-4 h-4" />
              </div>
              <div className="bg-[#f8f9fa] p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{task.agentType}</div>
                <p className="text-sm leading-relaxed text-[#0a192f]">
                  I'm your {task.agentType}. Tell me what you need and I'll get started.
                </p>
              </div>
            </div>

            {/* Chat history */}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse ml-auto max-w-[85%]" : "max-w-[90%]"}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  msg.role === "assistant" ? "bg-[#0a192f] text-white" : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}>
                  {msg.role === "assistant" ? "AI" : "Me"}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-[#f8f9fa] border border-gray-100 shadow-sm text-gray-800"
                    : "bg-blue-50 border border-blue-100 text-[#0a192f]"
                }`}>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {isStreaming && (
              <div className="flex gap-4 max-w-[90%]">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-[#0a192f] text-white text-[10px]">AI</div>
                <div className="p-4 rounded-2xl bg-[#f8f9fa] border border-gray-100 shadow-sm text-sm text-gray-800">
                  {streamingReply ? (
                    <div className="prose prose-sm max-w-none"><ReactMarkdown>{streamingReply}</ReactMarkdown></div>
                  ) : (
                    <span className="flex gap-1 items-center text-gray-400 italic">
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-6 bg-white border-t border-gray-100 shrink-0 relative z-10">
            <div className="flex items-center gap-3 bg-[#f8f9fa] border border-gray-200 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#0a192f] transition-colors rounded-xl hover:bg-white">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder={isStreaming ? "AI is thinking..." : `Type your instructions for ${task.agentType}...`}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-[#0a192f] placeholder:text-gray-400 py-2"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
            <div className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] text-center mt-3">Powered by Pi Agent · {task.agentType}</div>
          </div>
        </div>

        {/* Right Panel: Context / Checklist / Output */}
        <div className="w-1/2 flex flex-col bg-gray-50/30 overflow-y-auto h-full scrollbar-hide">
          <div className="p-12 max-w-2xl mx-auto w-full flex flex-col gap-12">
            
            <section>
              <h2 className="text-[10px] font-black tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-3 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div> {task.status === 'review' ? 'Validation Checklist' : 'Active Execution Plan'}
              </h2>
              
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-xl shadow-blue-900/5 transition-all">
                <div className="flex justify-between items-end mb-10">
                  <div>
                    <h3 className="font-extrabold text-2xl mb-1 text-[#0a192f] tracking-tight">{task.status === 'review' ? 'QA Review' : 'Subtasks'}</h3>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{task.status === 'review' ? 'Check quality vs criteria' : 'Step-by-step progression'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-[#0a192f] leading-none">{completedSubtasks}/{task.subtasks.length}</span>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2">{Math.round((completedSubtasks/task.subtasks.length)*100)}% Complete</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {task.subtasks.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => toggleSubtask(project.id, task.id, s.id)}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                        s.completed 
                          ? "bg-gray-50/50 text-gray-300 border-gray-50 line-through grayscale" 
                          : "bg-white text-[#0a192f] border-gray-100 shadow-sm hover:border-[#0a192f] hover:shadow-lg active:scale-95"
                      }`}
                    >
                      <span className="flex items-center gap-4 text-sm font-black">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${s.completed ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-200 group-hover:border-[#0a192f] border'}`}>
                           {s.completed ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-1.5 h-1.5 rounded-full bg-current"></div>}
                        </div>
                        {s.text}
                      </span>
                    </div>
                  ))}
                  
                  {task.status === 'review' && (
                     <div className="mt-8 p-6 bg-orange-50/50 rounded-3xl border border-orange-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                           <Search className="w-5 h-5" />
                        </div>
                        <div>
                           <h4 className="text-xs font-black text-orange-900 uppercase tracking-widest mb-1">QA Notes</h4>
                           <p className="text-xs text-orange-800 font-medium leading-relaxed italic">"Reviewer Agent is checking if all 5 competitors are included in the matrix. Looks consistent so far."</p>
                        </div>
                     </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-[10px] font-black tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-3 uppercase">
                <FileText className="w-4 h-4" /> Generated Artifacts
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white border border-gray-100 rounded-3xl p-6 flex gap-5 items-start hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer group">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                       <h4 className="text-base font-black text-[#0a192f]">market_research_v1.md</h4>
                       <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Context Document • 15 KB</p>
                    <div className="flex gap-2 mt-4">
                       <span className="text-[8px] font-black bg-gray-50 text-gray-500 px-2 py-1 rounded uppercase tracking-widest">Version 1.2</span>
                       <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

      </div>
    </div>
  );
}
