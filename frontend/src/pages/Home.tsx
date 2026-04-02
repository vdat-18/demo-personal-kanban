import { useState, useRef } from "react";
import { Plus, Upload, Clock, X, ArrowRight, Sparkles, Layout } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store/useProjectStore";
import type { Project } from "@/store/useProjectStore";

export function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { projects, addProject } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [importMode, setImportMode] = useState(false);

  const handleStartProject = () => {
    if (!projectName.trim()) return;
    
    // Create the project in the store EARLY with planning status
    const newId = Math.random().toString(36).substring(7);
    const newProject: Project = {
        id: newId,
        name: projectName,
        description: `Drafting project vision for ${projectName}...`,
        status: 'planning',
        tasks: []
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
      console.log("Importing context from:", file.name);
      handleStartProject();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-8 py-12">
      <h1 className="text-5xl font-extrabold tracking-tight text-[#0a192f] mb-4">
        Hi! What do you want to<br />work on today?
      </h1>
      <p className="text-lg text-gray-500 mb-12 max-w-xl">
        Let AgentForEveryone help you organize, plan, and execute your most ambitious projects.
      </p>

      <div className="mb-16">
        {/* Start New Project - Expanded Hero Version */}
        <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-xl shadow-blue-900/5 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none"></div>
          
          <div className="flex-1 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center mb-8 shadow-lg shadow-blue-900/20">
              <Plus className="w-7 h-7" />
            </div>
            <h2 className="text-4xl font-extrabold text-[#0a192f] mb-4 tracking-tight">Initiate a new journey</h2>
            <p className="text-xl text-gray-500 mb-0 max-w-md leading-relaxed">
              Start from scratch or import your existing research documents to let AI agents build your execution plan.
            </p>
          </div>
          
          <div className="w-full md:w-[400px] flex flex-col gap-4 relative z-10">
          <div className="w-full md:w-[400px] flex flex-col gap-4 relative z-10">
            <button 
              onClick={handleNewProjectClick}
              className="group/btn w-full flex items-center justify-between px-8 py-6 rounded-2xl bg-[#0a192f] hover:bg-blue-900 transition-all duration-300 font-bold text-white shadow-xl shadow-blue-900/10 hover:-translate-y-1"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-lg">New Blank Project</span>
                <span className="text-xs text-blue-300 font-medium opacity-80">Start brainstorming with AI</span>
              </div>
              <Plus className="w-6 h-6 text-blue-400 group-hover/btn:rotate-90 transition-transform" />
            </button>
            <div className="relative group/upload">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <button 
                  onClick={handleImportClick}
                  className="w-full flex items-center justify-between px-8 py-6 rounded-2xl border-2 border-gray-100 hover:border-[#0a192f] hover:bg-white transition-all duration-300 font-bold text-gray-800 hover:-translate-y-1"
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-lg">Import Context</span>
                    <span className="text-xs text-gray-400 font-medium group-hover/upload:text-gray-600 transition-colors">PDF, DOCX, TXT...</span>
                  </div>
                  <Upload className="w-6 h-6 text-gray-300 group-hover/upload:text-[#0a192f] transition-colors" />
                </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Recent Projects</h2>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{projects.length} Total</span>
        </div>
        <button className="text-sm font-semibold text-gray-500 hover:text-black transition-colors">View All Projects</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/30">
            <Layout className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-sm font-bold text-gray-400">No projects yet. Start your first journey above!</p>
          </div>
        ) : (
          projects.slice(0, 4).map((project) => {
            const completedTasks = project.tasks.filter(t => t.status === 'done').length;
            const totalTasks = project.tasks.length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return (
              <div 
                key={project.id}
                onClick={() => {
                  if (project.status === 'planning') {
                    navigate(`/planning/${project.id}`);
                  } else {
                    navigate(`/mission-control/${project.id}`);
                  }
                }}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 tracking-widest">
                    <span className={`w-2 h-2 rounded-full ${project.status === 'execution' ? 'bg-green-400' : 'bg-blue-400'}`}></span> {project.status.toUpperCase()}
                  </div>
                  {project.status === 'execution' && (
                    <span className="bg-[#0a192f] text-white text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">Active Now</span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-8 group-hover:text-blue-600 transition-colors truncate">{project.name}</h3>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2 tracking-wider">
                  <span>{completedTasks} / {totalTasks} TASKS COMPLETE</span>
                  <span className="text-gray-700">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
                  <div className="bg-[#0a192f] h-full rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600 uppercase">AI</div>
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-800"></div>
                    </div>
                    <span className="text-gray-600">Agents Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="w-3 h-3" /> Updated just now
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Project Name Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a192f]/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowModal(false)}></div>
          
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="p-10 flex flex-col items-center">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-8 p-3 text-gray-400 hover:text-black hover:bg-gray-50 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <Plus className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-black text-[#0a192f] mb-2">Name Your Project</h3>
              <p className="text-gray-500 text-sm mb-8 text-center">Give your journey a title to help the AI agents understand the context.</p>
              
              <div className="w-full space-y-6">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g., Marketing Strategy 2024"
                    autoFocus
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 text-gray-800 font-bold placeholder:text-gray-300 focus:border-[#0a192f] focus:bg-white outline-none transition-all shadow-inner"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (importMode ? triggerFileInput() : handleStartProject())}
                  />
                </div>
                
                <button 
                  onClick={importMode ? triggerFileInput : handleStartProject}
                  disabled={!projectName.trim()}
                  className={`w-full py-5 rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all shadow-xl ${
                    !projectName.trim() 
                    ? "bg-gray-200 cursor-not-allowed" 
                    : "bg-[#0a192f] hover:bg-blue-900 shadow-blue-900/20 active:scale-95"
                  }`}
                >
                  {importMode ? "Upload & Continue" : "Start New Journey"} 
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-6 flex items-center justify-center border-t border-gray-100 italic text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3 mr-2 text-blue-400" fill="currentColor" /> AI-powered Planning Engine
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
