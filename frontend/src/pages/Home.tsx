import { useState, useRef } from "react";
import { Plus, Upload, Clock, X, ArrowRight, Sparkles, Layout, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store";
import type { Project } from "@/types/domain";

export function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { projects, addProject, deleteProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [importMode, setImportMode] = useState(false);

  const handleStartProject = () => {
    if (!projectName.trim()) return;
    
    const newId = Math.random().toString(36).substring(7);
    const newProject: Project = {
        id: newId,
        name: projectName,
        description: `Drafting project vision for ${projectName}...`,
        status: 'planning',
        tasks: [],
        createdAt: new Date().toISOString()
    };
    
    addProject(newProject);
    setShowModal(false);
    navigate(`/planning/${newId}`);
    setProjectName("");
  };

  const handleImportClick = () => {
    setImportMode(true);
    setShowModal(true);
  };

  const handleNewProjectClick = () => {
    setImportMode(false);
    setShowModal(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleStartProject();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-screen w-full bg-[#f8fbfe] flex flex-col overflow-hidden font-sans text-slate-900">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
          
          {/* Hero Header */}
          <header className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-[#0a192f] leading-[1.1] mb-6">
              Hi! What do you want to<br />work on today?
            </h1>
            <p className="text-lg md:text-xl text-slate-400 font-medium max-w-xl leading-relaxed">
              Let AgentForEveryone help you organize, plan, and execute your most ambitious projects in real-time.
            </p>
          </header>

          {/* Action Cards Section */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
            {/* Main Creative Card */}
            <div className="lg:col-span-8 bg-white rounded-[40px] p-10 md:p-14 border border-white shadow-2xl shadow-blue-900/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/40 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 rounded-[24px] bg-[#0a192f] text-white flex items-center justify-center mb-10 shadow-xl shadow-blue-900/20 group-hover:scale-110 transition-transform duration-500">
                    <Plus className="w-8 h-8" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-[#0a192f] mb-6 tracking-tighter">Initiate a new journey</h2>
                  <p className="text-lg md:text-xl text-slate-400 font-medium max-w-md leading-relaxed mb-8">
                    Start from scratch or import documents to let AI build your execution plan.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                   <button 
                    onClick={handleNewProjectClick}
                    className="flex-1 flex items-center justify-between px-8 py-6 rounded-3xl bg-[#0a192f] hover:bg-blue-900 transition-all duration-300 font-black text-white shadow-xl shadow-blue-900/10 hover:-translate-y-1 active:scale-95"
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg uppercase tracking-wider text-xs opacity-60 mb-1">Method 01</span>
                      <span className="text-xl">New Project</span>
                    </div>
                    <ArrowRight className="w-6 h-6 text-blue-400" />
                  </button>

                  <button 
                    onClick={handleImportClick}
                    className="flex-1 flex items-center justify-between px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-[#0a192f] hover:bg-white transition-all duration-300 font-black text-slate-700 hover:-translate-y-1 active:scale-95"
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-lg uppercase tracking-wider text-xs opacity-40 mb-1">Method 02</span>
                      <span className="text-xl">Import Data</span>
                    </div>
                    <Upload className="w-6 h-6 text-slate-300 group-hover:text-[#0a192f]" />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>
              </div>
            </div>

            {/* Quick Stats / Sidebar Info */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden h-full flex flex-col justify-center">
                    <Sparkles className="absolute -top-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                    <h3 className="text-2xl font-black mb-4">AI Ready</h3>
                    <p className="text-blue-100 text-sm font-medium leading-relaxed opacity-80">
                      Our advanced agents are standing by to help you strategize and automate your workflow.
                    </p>
                    <div className="mt-8 flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/60">System Operational</span>
                    </div>
                </div>
            </div>
          </section>

          {/* Recent Projects Selection */}
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
            <div className="flex justify-between items-end mb-8 px-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <Clock className="w-4 h-4 text-blue-500" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recent Projects</h2>
              </div>
              <button className="text-xs font-black text-blue-600 uppercase tracking-widest hover:text-indigo-700 transition-colors underline underline-offset-8">
                View All {projects.length > 0 && `(${projects.length})`}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {projects.length === 0 ? (
                <div className="col-span-full py-24 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[50px] bg-white/50 group hover:bg-white hover:border-blue-50 transition-all duration-500">
                  <div className="w-24 h-24 rounded-[40px] bg-slate-50 flex items-center justify-center text-slate-200 mb-6 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-200 transition-all">
                    <Layout className="w-10 h-10" />
                  </div>
                  <p className="text-lg font-black text-slate-300 uppercase tracking-widest text-center max-w-xs">
                    Your journeys will appear here
                  </p>
                </div>
              ) : (
                projects.slice(0, 6).map((project) => {
                  const completedTasks = project.tasks?.filter(t => t.status === 'done').length || 0;
                  const totalTasks = project.tasks?.length || 0;
                  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                  
                  return (
                    <div 
                      key={project.id}
                      onClick={() => navigate(project.status === 'planning' ? `/planning/${project.id}` : `/project/${project.id}`)}
                      className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-500 cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          project.status === 'execution' 
                            ? 'bg-green-50 text-green-600 border-green-100' 
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {project.status}
                        </div>
                        <div className="flex -space-x-2 group-hover:scale-105 transition-transform">
                           <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white"></div>
                           <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">AI</div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to delete this project?")) {
                              deleteProject(project.id);
                            }
                          }}
                          className="p-2 ml-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-2xl font-black mb-10 text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>

                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Progress</span>
                          <span className="text-slate-900">{progress}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modal - Redesigned */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pb-20">
          <div className="absolute inset-0 bg-[#0a192f]/80 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setShowModal(false)}></div>
          
          <div className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-12 flex flex-col items-center">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-8 right-10 p-4 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="w-20 h-20 rounded-[32px] bg-blue-50 text-blue-600 flex items-center justify-center mb-8 shadow-inner">
                <Plus className="w-10 h-10" />
              </div>
              
              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Project Identity</h3>
              <p className="text-slate-400 font-medium mb-10 text-center text-lg">Give your project a clear name to help our AI agents align with your vision.</p>
              
              <div className="w-full space-y-6">
                <input 
                  type="text" 
                  placeholder="e.g., Marketing Strategy 2024"
                  autoFocus
                  className="w-full bg-slate-50 border-4 border-slate-50 rounded-3xl px-8 py-6 text-xl text-slate-800 font-bold placeholder:text-slate-300 focus:border-blue-500/20 focus:bg-white outline-none transition-all shadow-inner"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && projectName.trim() && (importMode ? triggerFileInput() : handleStartProject())}
                />
                
                <button 
                  onClick={importMode ? triggerFileInput : handleStartProject}
                  disabled={!projectName.trim()}
                  className={`w-full py-6 rounded-[30px] font-black text-lg uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all ${
                    !projectName.trim() 
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {importMode ? "Upload & Start" : "Begin Journey"} 
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 flex items-center justify-center border-t border-slate-100 italic text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
              <Sparkles className="w-4 h-4 mr-3 text-blue-400" fill="currentColor" /> AI-powered Planning Engine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
