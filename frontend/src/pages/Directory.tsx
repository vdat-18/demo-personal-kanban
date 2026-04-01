import { Search, Filter, FileText, FileSpreadsheet, Image as ImageIcon, Download, MoreHorizontal, ArrowLeft, Archive, Trash2, FolderOpen, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Directory() {
  const navigate = useNavigate();

  const files = [
    { id: 1, name: "competition_matrix_final.xlsx", type: "spreadsheet", project: "Competitor Research Veclam24h", agent: "Reporter Agent", date: "Oct 12, 2026", size: "2.4 MB" },
    { id: 2, name: "landing_page_audit.md", type: "document", project: "Competitor Research Veclam24h", agent: "Doer Agent", date: "Oct 10, 2026", size: "15 KB" },
    { id: 3, name: "facebook_marketing_plan.docx", type: "document", project: "New Product Launch", agent: "Planner Agent", date: "Oct 08, 2026", size: "1.2 MB" },
    { id: 4, name: "logo_redesign_concept.png", type: "image", project: "Brand Identity Refresh", agent: "Creative Agent", date: "Oct 05, 2026", size: "4.8 MB" },
    { id: 5, name: "swot_analysis_report.pdf", type: "document", project: "Market Entry Strategy", agent: "Reporter Agent", date: "Sep 28, 2026", size: "3.1 MB" },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] overflow-hidden">
      {/* Sidebar (Shared Style) */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-full flex-shrink-0 relative z-30">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center font-black shadow-xl shadow-blue-900/10">
              A
            </div>
            <div>
              <h2 className="font-black text-[#0a192f] text-sm uppercase tracking-widest leading-tight">AgentForEveryone</h2>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 italic">File Directory</div>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button onClick={() => navigate("/")} className="flex items-center gap-4 px-5 py-4 text-gray-400 hover:text-[#0a192f] hover:bg-gray-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
              <FolderOpen className="w-5 h-5" /> All Projects
            </button>
            <button className="flex items-center gap-4 px-5 py-4 text-[#0a192f] bg-gray-50 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm border border-gray-100">
              <Archive className="w-5 h-5" /> Storage & Assets
            </button>
            <button className="flex items-center gap-4 px-5 py-4 text-gray-400 hover:text-[#0a192f] hover:bg-gray-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all mt-2">
              <Trash2 className="w-5 h-5" /> Trash
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-gray-50">
           <div className="bg-[#f8f9fa] rounded-2xl p-4 flex items-center gap-3 border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                 <User className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                 <div className="text-[10px] font-black text-[#0a192f] uppercase tracking-widest">Premium Plan</div>
                 <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">12.4 GB / 50 GB</div>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="px-10 py-8 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <div className="flex items-center gap-4 mb-2">
                  <button onClick={() => navigate("/")} className="p-2.5 rounded-xl hover:bg-white text-gray-400 hover:text-[#0a192f] transition-all border border-transparent hover:border-gray-200 flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-4xl font-black text-[#0a192f] tracking-tight">Project Assets</h1>
               </div>
               <p className="text-sm font-medium text-gray-400 ml-15 leading-relaxed uppercase tracking-widest">
                 Central repository for all AI-generated outputs and user context files.
               </p>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="relative group/search">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within/search:text-[#0a192f] transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search your assets..." 
                    className="bg-white border-2 border-gray-100 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-[#0a192f] focus:outline-none focus:border-[#0a192f] transition-all w-[300px] shadow-sm"
                  />
               </div>
               <button className="flex items-center gap-2 bg-white border-2 border-gray-100 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-gray-600 hover:text-[#0a192f] hover:border-[#0a192f] transition-all shadow-sm">
                  <Filter className="w-4 h-4" /> Filter
               </button>
            </div>
          </div>
        </header>

        {/* Directory Table Area */}
        <div className="flex-1 px-10 pb-10 overflow-hidden flex flex-col">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-blue-900/5 flex flex-col h-full overflow-hidden">
             {/* Table Header */}
             <div className="grid grid-cols-[1fr_200px_180px_150px_80px] px-10 py-6 border-b border-gray-50 bg-gray-50/50">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Name & Info</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Project Association</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Creator Agent</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage & Date</div>
                <div className="text-right"></div>
             </div>
             
             {/* Table Body */}
             <div className="flex-1 overflow-y-auto scrollbar-hide">
                {files.map((file, idx) => (
                   <div key={file.id} className={`grid grid-cols-[1fr_200px_180px_150px_80px] px-10 py-6 items-center hover:bg-gray-50/50 transition-all cursor-pointer group ${idx !== files.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-2xl bg-[#f8f9fa] border border-gray-100 flex items-center justify-center text-[#0a192f] group-hover:bg-[#0a192f] group-hover:text-white transition-all shadow-sm">
                            {getIcon(file.type)}
                         </div>
                         <div>
                            <div className="text-base font-black text-[#0a192f] group-hover:text-blue-600 transition-colors leading-tight">{file.name}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{file.type} • {file.size}</div>
                         </div>
                      </div>
                      
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pr-4 line-clamp-1">{file.project}</div>
                      
                      <div className="flex items-center gap-2">
                         <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all font-black text-[9px] border border-gray-200">
                           {file.agent.charAt(0)}
                         </div>
                         <span className="text-xs font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">{file.agent}</span>
                      </div>
                      
                      <div>
                         <div className="text-xs font-black text-[#0a192f] uppercase tracking-widest">{file.date}</div>
                         <div className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.3em] mt-1 italic">Automated Sync</div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pr-2">
                         <button className="p-2.5 rounded-xl text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100">
                            <Download className="w-4 h-4" />
                         </button>
                         <button className="p-2.5 rounded-xl text-gray-300 hover:text-black hover:bg-gray-100 transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                ))}
             </div>
             
             {/* Table Footer */}
             <div className="px-10 py-5 bg-[#f8f9fa] border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <div>Total Assets: {files.length}</div>
                <div className="flex items-center gap-4">
                   <button className="p-2 hover:text-[#0a192f] transition-all">Previous</button>
                   <div className="bg-white border border-gray-200 text-[#0a192f] px-3 py-1.5 rounded-lg shadow-sm">1</div>
                   <button className="p-2 hover:text-[#0a192f] transition-all">Next</button>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
