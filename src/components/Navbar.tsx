import { Plus, Search, Settings, ChevronDown } from "lucide-react";

interface NavbarProps {
  projectName: string;
}

export function Navbar({ projectName }: NavbarProps) {
  return (
    <header className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-[#1e293b]/50 backdrop-blur-sm z-50">
      <div className="flex items-center gap-4">
        <div className="text-orange-500 font-extrabold tracking-tighter text-xl mr-2">RECURL</div>
        
        {/* Project Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1 rounded-md transition-colors border border-slate-700/50 bg-slate-800/30">
            <span className="text-sm font-medium">{projectName}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
        </div>

        <button className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-md transition-all" title="New Project">
          <Plus size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50 focus-within:border-orange-500/50 transition-all">
          <Search size={14} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-transparent border-none outline-none text-sm w-40"
          />
        </div>
        <button className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-md">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
