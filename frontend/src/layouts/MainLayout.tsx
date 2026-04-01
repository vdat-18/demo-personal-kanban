import { Outlet, Link } from "react-router-dom";
import { Bell, Settings, User } from "lucide-react";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0a192f] font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-8 h-full">
          <Link to="/" className="font-bold text-xl tracking-tight hidden sm:block">AgentForEveryone</Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-500 h-full">
            <Link to="/" className="text-black border-b-2 border-black flex items-center h-full pt-0.5">Projects</Link>
            <Link to="/directory" className="hover:text-black flex items-center h-full pt-0.5 transition-colors">Directory</Link>
            <Link to="#" className="hover:text-black flex items-center h-full pt-0.5">Timeline</Link>
            <Link to="#" className="hover:text-black flex items-center h-full pt-0.5">Insights</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <button className="hover:text-black transition-colors"><Bell className="w-5 h-5" /></button>
          <button className="hover:text-black transition-colors"><Settings className="w-5 h-5" /></button>
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex w-full">
        <Outlet />
      </main>
    </div>
  );
}
