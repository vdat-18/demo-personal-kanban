import { 
  Search, 
  Filter, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Download, 
  ArrowLeft, 
  Archive, 
  Trash2, 
  FolderOpen, 
  User, 
  X, 
  File as FileIcon,
  HardDrive,
  Clock,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/store";
import { useState, useMemo } from "react";
import type { AssetType } from "@/types/domain";

export function Directory() {
  const navigate = useNavigate();
  const { assets, deleteAsset } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.agentName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  const getIcon = (type: AssetType | string) => {
    switch (type) {
      case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-violet-500" />;
      case 'pdf': return <FileIcon className="w-5 h-5 text-rose-500" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleDownload = (asset: any) => {
    if (!asset.content) return;
    const blob = new Blob([asset.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden animate-in fade-in duration-700">
      {/* Sidebar - Consistent with Mission Control */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full flex-shrink-0 z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0a192f] to-[#1a3a5f] text-white flex items-center justify-center font-black shadow-lg shadow-blue-900/10">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#0a192f] text-sm tracking-tight leading-tight">Project Assets</h2>
              <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.15em] mt-0.5">Central Hub</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button 
              onClick={() => navigate("/")} 
              className="flex items-center justify-between px-4 py-3 text-gray-500 hover:text-[#0a192f] hover:bg-gray-50 rounded-xl text-xs font-bold transition-all group"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-4 h-4 group-hover:text-blue-500" /> All Projects
              </div>
            </button>
            <button className="flex items-center justify-between px-4 py-3 text-[#0a192f] bg-blue-50/50 border border-blue-100/50 rounded-xl text-xs font-black shadow-sm">
              <div className="flex items-center gap-3">
                <Archive className="w-4 h-4 text-blue-600" /> Storage & Files
              </div>
              <div className="w-5 h-5 rounded-md bg-white border border-blue-100 flex items-center justify-center text-[9px] font-black">{assets.length}</div>
            </button>
            <button className="flex items-center justify-between px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all group">
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 group-hover:text-red-500" /> Trash Bin
              </div>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-50">
           <div className="bg-gray-50/80 rounded-2xl p-4 flex flex-col gap-3 border border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                   <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                   <div className="text-[9px] font-black text-[#0a192f] uppercase tracking-wider">Premium Account</div>
                   <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">12.4 GB / 50 GB</div>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="w-1/4 h-full bg-blue-500 rounded-full" />
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        
        {/* Header */}
        <header className="px-10 py-10 shrink-0 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
               <div className="flex items-center gap-5 mb-3">
                  <button onClick={() => navigate(-1)} className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-[#0a192f] hover:border-blue-400 transition-all shadow-sm group">
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </button>
                  <div>
                    <h1 className="text-4xl font-black text-[#0a192f] tracking-tight">Project Assets</h1>
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">
                        CENTRAL REPOSITORY FOR AI OUTPUTS AND PROJECT CONTEXT
                      </p>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="relative group/search">
                  <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within/search:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search by name, project, or agent..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-[#0a192f] focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all w-full md:w-[320px] shadow-sm"
                  />
               </div>
               <button className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#0a192f] hover:border-blue-400 transition-all shadow-sm active:scale-95">
                  <Filter className="w-4 h-4 text-blue-500" /> Filter
               </button>
            </div>
          </div>
        </header>

        {/* Directory Table Area */}
        <div className="flex-1 px-10 pb-10 overflow-hidden flex flex-col relative z-10">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-blue-900/5 flex flex-col h-full overflow-hidden">
             {/* Table Header */}
             <div className="grid grid-cols-[1fr_200px_180px_150px_80px] px-10 py-6 border-b border-gray-50 bg-gray-50/30">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Name & Info</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-4 shadow-sm py-1.5 rounded-lg bg-white/50 border border-gray-100/50 w-fit">Project Association</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Creator Agent</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Added Date</div>
                <div className="text-right"></div>
             </div>
             
             {/* Table Body */}
             <div className="flex-1 overflow-y-auto scrollbar-hide">
                {filteredAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-20 animate-in fade-in zoom-in duration-1000">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-blue-50/50 flex items-center justify-center text-blue-200 mb-8 border-2 border-dashed border-blue-100">
                      <Archive className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-[#0a192f] tracking-tight mb-2">No assets discovered yet</h3>
                    <p className="text-sm text-gray-400 max-w-sm leading-relaxed font-medium">Assets will automatically appear here as your agents generate reports, spreadsheets, and visuals.</p>
                    <button className="mt-8 px-8 py-3.5 bg-[#0a192f] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20 active:scale-95">
                      Upload Samples
                    </button>
                  </div>
                ) : (
                  filteredAssets.map((asset, idx) => (
                    <div key={asset.id} className={`grid grid-cols-[1fr_200px_180px_150px_80px] px-10 py-5 items-center hover:bg-blue-50/30 transition-all cursor-pointer group ${idx !== filteredAssets.length - 1 ? 'border-b border-gray-50/80' : ''}`}>
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#0a192f] group-hover:bg-white group-hover:border-blue-200 group-hover:scale-105 transition-all shadow-sm">
                              {getIcon(asset.type)}
                          </div>
                          <div className="overflow-hidden">
                              <div className="text-base font-extrabold text-[#0a192f] group-hover:text-blue-600 transition-colors leading-tight truncate">{asset.name}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{asset.type}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{asset.size}</span>
                              </div>
                          </div>
                        </div>
                        
                        <div className="px-4">
                          <div className="text-[11px] font-bold text-gray-600 bg-gray-100/50 border border-gray-200/50 px-3 py-1.5 rounded-xl w-fit truncate max-w-full">
                            {asset.projectName}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-blue-400 font-black text-[10px] group-hover:scale-110 transition-transform">
                            {asset.agentName.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-700 tracking-tight">{asset.agentName}</span>
                        </div>
                        
                        <div>
                          <div className="text-xs font-black text-[#0a192f] tracking-tight">
                            {new Date(asset.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="text-[9px] font-bold text-blue-400/70 uppercase tracking-[0.1em] mt-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> Auto Sync
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                            className="p-3 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-all border border-transparent hover:border-blue-100 shadow-sm"
                            title="Download Asset"
                          >
                              <Download className="w-4.5 h-4.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                            className="p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-white transition-all border border-transparent hover:border-red-100 shadow-sm"
                            title="Delete Asset"
                          >
                              <X className="w-4.5 h-4.5" />
                          </button>
                        </div>
                    </div>
                  ))
                )}
             </div>
             
             {/* Table Footer */}
             <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Total Discovery: <span className="text-[#0a192f] ml-1">{filteredAssets.length} Assets</span>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-3 text-gray-400 hover:text-[#0a192f] transition-all disabled:opacity-30" disabled>
                     <ChevronRight className="w-5 h-5 rotate-180" />
                   </button>
                   <div className="flex items-center gap-1.5">
                      <div className="w-9 h-9 bg-[#0a192f] text-white flex items-center justify-center rounded-xl text-xs font-black shadow-lg shadow-blue-900/20">1</div>
                      <div className="w-9 h-9 bg-white text-gray-400 border border-gray-100 flex items-center justify-center rounded-xl text-xs font-bold hover:text-[#0a192f] cursor-pointer transition-colors">2</div>
                   </div>
                   <button className="p-3 text-gray-400 hover:text-[#0a192f] transition-all">
                     <ChevronRight className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

