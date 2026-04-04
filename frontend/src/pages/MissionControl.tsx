import { useNavigate, useParams } from "react-router-dom";
import { Archive, Plus, MoreHorizontal, MessageSquare, Clock, ArrowLeft, FileText, Zap, XCircle, Rocket } from "lucide-react";
import { useProjectStore } from "@/store";
import { KANBAN_COLUMNS } from "@/constants/agents";
import type { TaskStatus } from "@/types/domain";

export function MissionControl() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  
  const project = projects.find(p => p.id === id) || projects[0];
  const tasks = project.tasks;

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0a192f] text-white flex items-center justify-center font-bold shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
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
            {KANBAN_COLUMNS.filter(c => c.id !== 'cancelled').map(col => (
              <a key={col.id} href="#" className="flex items-center justify-between px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors group">
                <div className="flex items-center gap-3">
                  <col.Icon className="w-4 h-4 text-gray-400 group-hover:text-[#0a192f]" />
                  <span className="group-hover:text-[#0a192f]">{col.agent.split(' ')[0]}</span>
                </div>
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">{getTasksByStatus(col.id).length}</span>
              </a>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 flex flex-col gap-1 border-t border-gray-100">
          <button onClick={() => navigate("/directory")} className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-black transition-colors uppercase tracking-widest text-left">
            <Archive className="w-4 h-4 text-gray-400" /> Directory
          </button>
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors text-red-500">
            <XCircle className="w-4 h-4" /> Close Project
          </a>
        </div>
      </aside>

      {/* Main Board Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
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
                  Project Board <span className="text-gray-200">/</span> <span className="text-[#0a192f]">{project.name}</span>
                </div>
                <h1 className="text-4xl font-black text-[#0a192f] tracking-tight">Mission Control</h1>
              </div>
            </div>
            
            {/* Project Toolbar */}
            <div className="flex items-center gap-2 md:ml-auto">
              <button className="flex items-center gap-2 bg-[#0a192f] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/10 active:scale-95">
                <Plus className="w-4 h-4" /> Add Task
              </button>
              <div className="h-8 w-px bg-gray-200 mx-2"></div>
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

        {/* Board Columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-4">
          <div className="flex gap-6 h-full items-start min-w-max">
            
            {KANBAN_COLUMNS.map(column => (
              <div key={column.id} className="w-80 flex flex-col h-full rounded-[2.5rem] bg-gray-50/50 border border-gray-100 shadow-inner overflow-hidden">
                <div className="p-6 flex justify-between items-center bg-transparent border-b border-gray-100/50">
                  <div className="flex items-center gap-3 font-bold text-[10px] text-gray-400 tracking-[0.2em] uppercase">
                    <div className={`p-2 rounded-xl ${column.id === 'doing' ? 'bg-blue-100/50 text-blue-600' : 'bg-gray-100 text-gray-400 border border-gray-200 shadow-sm'}`}>
                      <column.Icon className="w-3.5 h-3.5" />
                    </div>
                    {column.label} 
                    <span className="bg-white border border-gray-200 text-[#0a192f] w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm ml-1 font-black">{getTasksByStatus(column.id).length}</span>
                  </div>
                  <button className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-white rounded-xl shadow-sm"><MoreHorizontal className="w-4 h-4" /></button>
                </div>
                
                <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1 scrollbar-hide">
                  {getTasksByStatus(column.id).map(task => (
                    <div 
                      key={task.id}
                      onClick={() => navigate(`/chat/${task.id}`)}
                      className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-b-4 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer group relative overflow-hidden ${task.status === 'doing' ? 'ring-2 ring-blue-100 border-blue-200 shadow-lg' : ''}`}
                    >
                      {task.status === 'doing' && (
                        <div className="absolute top-0 right-0 p-3">
                           <Zap className="w-4 h-4 text-blue-400 animate-pulse" fill="currentColor" />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-4">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.2em] uppercase border ${
                            task.status === 'done' ? 'bg-green-50 text-green-600 border-green-100' :
                            task.status === 'doing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                         }`}>
                           {task.status}
                         </span>
                      </div>

                      <h3 className="font-bold text-lg mb-2 text-[#0a192f] group-hover:text-blue-600 transition-colors leading-tight">{task.title}</h3>
                      <p className="text-xs text-gray-500 mb-6 line-clamp-2 leading-relaxed font-medium">{task.description}</p>
                      
                      <div className="flex justify-between items-center text-gray-400 border-t border-gray-50 pt-5 mt-auto">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                           <MessageSquare className="w-3.5 h-3.5" /> {task.subtasks.length} subtasks
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                           task.status === 'doing' ? 'bg-blue-50 text-blue-600' :
                           task.status === 'done' ? 'bg-green-50 text-green-600' :
                           'bg-gray-100 text-gray-400'
                        }`}>
                           <Clock className="w-3 h-3" /> {task.updatedAt}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {getTasksByStatus(column.id).length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-white/30">
                       <Archive className="w-12 h-12 text-gray-100 mb-4" />
                       <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Empty Column</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Ghost Column for Adding */}
            <div className="w-80 h-full border-2 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center hover:bg-white hover:border-[#0a192f]/20 transition-all cursor-pointer group shrink-0">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 border border-gray-100 flex items-center justify-center group-hover:bg-[#0a192f] group-hover:text-white group-hover:scale-110 group-hover:rotate-90 transition-all shadow-sm">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] group-hover:text-[#0a192f] transition-colors">Add Column</span>
               </div>
            </div>

          </div>
        </div>

        {/* Board Footer */}
        <footer className="h-20 px-10 flex items-center justify-between bg-white border-t border-gray-100 shrink-0 relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-12">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Tasks</span>
              <span className="font-bold text-base text-[#0a192f]">{tasks.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">In Progress</span>
              <span className="font-bold text-base text-blue-600">{tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length}</span>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                 <div 
                  className="bg-green-500 h-full transition-all duration-1000" 
                  style={{ width: `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` }}
                 ></div>
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Completion {Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest leading-none">Done</span>
              <span className="font-bold text-base text-green-600">{tasks.filter(t => t.status === 'done').length}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-red-400 uppercase tracking-widest leading-none">Cancelled</span>
              <span className="font-bold text-base text-red-500">{tasks.filter(t => t.status === 'cancelled').length}</span>
            </div>
          </div>
          
          <button 
            disabled={tasks.some(t => t.status !== 'done' && t.status !== 'cancelled')}
            className={`px-10 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 uppercase tracking-widest border-b-4 ${
              tasks.some(t => t.status !== 'done' && t.status !== 'cancelled')
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
