import { 
  Search, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Download, 
  ArrowLeft, 
  Archive, 
  FolderOpen, 
  User, 
  X, 
  File as FileIcon,
  HardDrive,
  Sparkles,
  ChevronRight,
  Folder,
  BrainCircuit,
  ClipboardList,
  LayoutGrid,
  List as ListIcon,
  Maximize2,
  Trash
} from "lucide-react";
import { useProjectStore } from "@/store";
import { useState, useMemo } from "react";
import type { Asset, AssetType } from "@/types/domain";
import { ReportMarkdown } from "./PlanningScreen";

type ViewMode = "grid" | "list";

export function Directory() {
  const { assets, deleteAsset, projects } = useProjectStore();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | "all">("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | "global" | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  // ── Logic: Hierarchical Grouping ───────────────────────────────────────────
  
  // Filter Assets by Project and Folder
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.projectName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchProject = selectedProjectId === "all" || a.projectId === selectedProjectId;
      
      let matchFolder = true;
      if (selectedFolderId === "global") {
        matchFolder = a.scope === "global";
      } else if (selectedFolderId !== "all") {
        matchFolder = a.taskId === selectedFolderId;
      }

      return matchSearch && matchProject && matchFolder;
    });
  }, [assets, searchQuery, selectedProjectId, selectedFolderId]);

  // Helpers
  const getIcon = (type: AssetType | string) => {
    switch (type) {
      case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-violet-500" />;
      case 'pdf': return <FileIcon className="w-5 h-5 text-rose-500" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleDownload = (asset: Asset) => {
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
    <div className="flex h-full w-full bg-[#f8f9fa] overflow-hidden animate-in fade-in duration-700 font-['Inter','sans-serif']">
      
      {/* ── Left Sidebar: Hierarchical Navigation ── */}
      <aside className="w-80 bg-white border-r border-slate-100 flex flex-col h-full flex-shrink-0 z-20 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.02)]">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white flex items-center justify-center font-black shadow-xl shadow-indigo-900/10">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight leading-tight">Directory</h2>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Project Knowledge</div>
            </div>
          </div>

          <nav className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 mb-3 block">Navigation</label>
              <button 
                onClick={() => {
                  setSelectedProjectId("all");
                  setSelectedFolderId("all");
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                  selectedProjectId === "all" && selectedFolderId === "all" 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <FolderOpen className="w-4 h-4" /> All Assets
              </button>
            </div>

            {/* Global Brain Folders */}
            <div>
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 mb-3 block">Memory Hub</label>
              <div className="space-y-1">
                <button 
                  onClick={() => setSelectedFolderId("global")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                    selectedFolderId === "global" 
                    ? "bg-blue-50 text-blue-600 shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" /> Project Brain
                </button>
                <button 
                  onClick={() => setSelectedFolderId("all")} // Reset folder but keep project
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                    selectedFolderId === "all" && selectedProjectId !== "all"
                    ? "bg-slate-50 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <ClipboardList className="w-4 h-4" /> Task Specifics
                </button>
              </div>
            </div>

            {/* Project List */}
            <div className="pt-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 mb-3 block">Projects</label>
              <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide px-1">
                {projects.map(project => (
                  <div key={project.id} className="space-y-0.5">
                    <button 
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setSelectedFolderId("all");
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all group ${
                        selectedProjectId === project.id 
                        ? "text-indigo-600 font-extrabold" 
                        : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedProjectId === project.id ? "bg-indigo-500 scale-125" : "bg-slate-200"}`} />
                        <span className="truncate max-w-[140px]">{project.name}</span>
                      </div>
                      {selectedProjectId === project.id && <ChevronRight className="w-3 h-3" />}
                    </button>
                    
                    {/* Sub-tasks of Active Project */}
                    {selectedProjectId === project.id && project.tasks.length > 0 && (
                      <div className="ml-7 pl-3 border-l border-slate-100 py-1 space-y-1">
                        {project.tasks.map(task => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedFolderId(task.id)}
                            className={`w-full flex items-center gap-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                              selectedFolderId === task.id
                              ? "text-blue-600 font-bold"
                              : "text-slate-400 hover:text-slate-700"
                            }`}
                          >
                            <Folder className={`w-3 h-3 ${selectedFolderId === task.id ? "fill-blue-500/10" : ""}`} />
                            <span className="truncate">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-50 bg-slate-50/30">
           <div className="bg-white rounded-3xl p-5 flex flex-col gap-4 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                   <User className="w-5 h-5 text-white" />
                </div>
                <div>
                   <div className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Shared Brain</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">85% Optimization</div>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
              </div>
           </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/20 rounded-full -mr-64 -mt-64 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/20 rounded-full -ml-40 -mb-40 blur-[120px] pointer-events-none" />
        
        {/* Header */}
        <header className="px-12 py-10 shrink-0 relative z-10 flex items-end justify-between border-b border-white/40">
          <div>
             <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[.25em]">
                  {selectedProjectId === "all" ? "Organization Library" : projects.find(p => p.id === selectedProjectId)?.name}
                </span>
             </div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                {selectedFolderId === "all" ? "Project Assets" : 
                 selectedFolderId === "global" ? "Project Brain" : 
                 "Task Artifacts"}
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Search */}
             <div className="relative group/search bg-white rounded-2xl border border-slate-100 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within/search:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none pl-12 pr-6 py-3.5 text-sm font-bold text-slate-700 focus:outline-none w-64 lg:w-80"
                />
             </div>
             
             {/* View Toggle */}
             <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-xl transition-all ${viewMode === "grid" ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-900"}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-xl transition-all ${viewMode === "list" ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-900"}`}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
             </div>
          </div>
        </header>

        {/* ── Asset Content Grid/List ── */}
        <div className="flex-1 overflow-y-auto px-12 py-12 scrollbar-hide relative z-10">
          {filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-1000">
               <div className="w-28 h-28 rounded-[2.5rem] bg-white border border-slate-100 flex items-center justify-center text-slate-200 mb-8 shadow-xl shadow-slate-900/[0.02]">
                  <Archive className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3 italic">Clean Desk Policy</h3>
               <p className="text-sm text-slate-400 max-w-sm leading-relaxed font-bold uppercase tracking-wider">No assets found in this folder</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
               {filteredAssets.map(asset => (
                 <div 
                   key={asset.id} 
                   onClick={() => setPreviewAsset(asset)}
                   className="group relative bg-white border border-slate-100 rounded-[32px] p-2 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer animate-in fade-in duration-500"
                 >
                    {/* Thumbnail/Icon Area */}
                    <div className="aspect-square rounded-[24px] bg-slate-50 flex items-center justify-center transition-all group-hover:scale-95">
                       <div className="p-6 transition-transform group-hover:scale-125 duration-500">
                          {getIcon(asset.type)}
                       </div>
                    </div>
                    
                    {/* Info Area */}
                    <div className="p-5">
                       <h4 className="font-extrabold text-slate-800 tracking-tight truncate group-hover:text-blue-700 transition-colors">{asset.name}</h4>
                       <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-lg bg-slate-900 text-blue-400 text-[8px] flex items-center justify-center font-black">
                                {asset.agentName.charAt(0)}
                             </div>
                             <span className="text-[10px] font-bold text-slate-400">{asset.agentName}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-300 uppercase">{asset.size}</span>
                       </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                         className="p-2.5 rounded-2xl bg-white/90 backdrop-blur-md text-slate-500 hover:text-blue-600 shadow-xl border border-slate-200"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            /* List Mode */
            <div className="space-y-3">
               {filteredAssets.map(asset => (
                 <div 
                   key={asset.id}
                   onClick={() => setPreviewAsset(asset)}
                   className="group flex items-center gap-6 p-4 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-lg transition-all cursor-pointer"
                 >
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                       {getIcon(asset.type)}
                    </div>
                    <div className="flex-1">
                       <div className="font-extrabold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">{asset.name}</div>
                       <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{asset.type} • {asset.size} • {new Date(asset.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3 px-6 border-x border-slate-100">
                       <div className="w-6 h-6 rounded-lg bg-slate-900 text-blue-400 text-[8px] flex items-center justify-center font-black">
                          {asset.agentName.charAt(0)}
                       </div>
                       <span className="text-[11px] font-bold text-slate-600">{asset.agentName}</span>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDownload(asset); }}
                         className="p-3 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                       >
                         <Download className="w-4.5 h-4.5" />
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                         className="p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                       >
                         <Trash className="w-4.5 h-4.5" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <footer className="px-12 py-6 bg-white/50 border-t border-white/40 flex items-center justify-between z-10 backdrop-blur-sm">
           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
              Live Collective Memory • Synchronized with Artificial Intelligence
           </p>
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Agents Online</span>
           </div>
        </footer>
      </main>

      {/* ── Fullscreen Preview Modal ── */}
      {previewAsset && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden animate-in fade-in zoom-in-105 duration-300">
          <header className="h-20 flex items-center justify-between px-10 border-b border-slate-100 shrink-0">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPreviewAsset(null)}
                  className="p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all group"
                >
                   <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tight">{previewAsset.name}</h2>
                   <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{previewAsset.projectName} • {previewAsset.agentName}</span>
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleDownload(previewAsset)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-950/20"
                >
                  <Download className="w-4 h-4" /> Download File
                </button>
                <button 
                  onClick={() => setPreviewAsset(null)}
                  className="p-3 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-white">
             {previewAsset.content ? (
               <div className="max-w-4xl mx-auto py-20 px-8">
                 {/* Metadata Card */}
                 <div className="mb-12 p-8 rounded-[40px] bg-slate-50/50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-[28px] bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                          {getIcon(previewAsset.type)}
                       </div>
                       <div>
                          <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Generated Asset</div>
                          <div className="text-xl font-black text-slate-800 tracking-tight">{previewAsset.name}</div>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata</div>
                       <div className="text-sm font-bold text-slate-800 mt-1">{previewAsset.size} • JSON Optimized</div>
                    </div>
                 </div>

                 {/* Markdown Content */}
                 <div className="animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-200">
                    <ReportMarkdown content={previewAsset.content} />
                 </div>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <Maximize2 className="w-20 h-20 mb-6 opacity-20" />
                  <p className="font-black uppercase tracking-widest text-sm">No preview content available</p>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
