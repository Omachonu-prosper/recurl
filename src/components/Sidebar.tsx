import { FolderPlus, ChevronRight, Folder } from "lucide-react";

export function Sidebar() {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] border-r border-slate-800 overflow-hidden">
      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]/20 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Collections</span>
        <button className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-orange-400 transition-colors" title="New Folder">
          <FolderPlus size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        <div className="group">
          <div className="flex items-center px-3 py-1.5 hover:bg-slate-800/50 cursor-pointer text-sm gap-2">
            <ChevronRight size={14} className="text-slate-500" />
            <Folder size={16} className="text-blue-400" />
            <span className="flex-1 truncate">Auth Services</span>
          </div>
          
          <div className="flex items-center pl-9 pr-3 py-1.5 hover:bg-slate-800 cursor-pointer text-sm gap-2 bg-slate-800/20 border-r-2 border-orange-500">
            <span className="text-[10px] font-bold text-green-500 w-6">GET</span>
            <span className="flex-1 truncate font-medium">Login Verification</span>
          </div>
          <div className="flex items-center pl-9 pr-3 py-1.5 hover:bg-slate-800 cursor-pointer text-sm gap-2 opacity-70">
            <span className="text-[10px] font-bold text-orange-400 w-6">POST</span>
            <span className="flex-1 truncate">Refresh Token</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center px-3 py-1.5 hover:bg-slate-800/50 cursor-pointer text-sm gap-2">
          <ChevronRight size={14} className="text-slate-500" />
          <Folder size={16} className="text-blue-400" />
          <span className="flex-1 truncate">User Profile API</span>
        </div>
      </div>
    </div>
  );
}
