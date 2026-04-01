import { useNavigate } from "react-router-dom";
import { Plus, Upload, Play, Clock } from "lucide-react";
import { useRef } from "react";

export function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate "AI reading documents" then navigate to chat
      // In a real app, you'd upload to a server here
      console.log("Importing context from:", file.name);
      navigate("/planning");
    }
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
            <button 
              onClick={() => navigate("/planning")}
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

      {/* Recent Projects */}
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Recent Projects</h2>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">4 Recent</span>
        </div>
        <button className="text-sm font-semibold text-gray-500 hover:text-black transition-colors">View All Projects</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sample Card 1 */}
        <div 
          onClick={() => navigate("/mission-control/1")}
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 tracking-widest">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span> DOING
            </div>
            <span className="bg-[#0a192f] text-white text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider">Active Now</span>
          </div>
          <h3 className="text-xl font-bold mb-8 group-hover:text-blue-600 transition-colors">Competitor research Veclam24h</h3>
          <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2 tracking-wider">
            <span>4 / 6 TASKS COMPLETE</span>
            <span className="text-gray-700">66%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div className="bg-[#0a192f] h-full rounded-full" style={{ width: '66%' }}></div>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300"></div>
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-800"></div>
              </div>
              <span className="text-gray-600">Creative Agent</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3 h-3" /> Updated 2h ago
            </div>
          </div>
        </div>
        
         {/* Sample Card 2 */}
         <div 
          onClick={() => navigate("/mission-control/2")}
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 tracking-widest">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> PLANNING
            </div>
            <div className="w-7 h-7 rounded-full bg-[#0a192f] text-white flex items-center justify-center shadow-sm">
              <Plus className="w-4 h-4"/>
            </div>
          </div>
          <h3 className="text-xl font-bold mb-8 group-hover:text-blue-600 transition-colors">New product launch plan</h3>
          <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2 tracking-wider">
            <span>1 / 8 TASKS COMPLETE</span>
            <span className="text-gray-700">12%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div className="bg-gray-300 h-full rounded-full group-hover:bg-[#0a192f] transition-colors" style={{ width: '12%' }}></div>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300"></div>
                <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-800"></div>
              </div>
              <span className="text-gray-600">Strategy Agent</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock className="w-3 h-3" /> Updated 1d ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
