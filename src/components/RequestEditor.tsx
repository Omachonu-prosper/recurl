import { Plus, X, FileText } from "lucide-react";
import type { SavedRequest, RequestTab, Collection, Environment } from "../types";
import { RequestTabContent, methodColor, EnvVarInput } from "./RequestTabContent";

export interface HttpResponseData {
  status: number;
  status_text: string;
  headers: [string, string][];
  body: string;
  time_ms: number;
  size_bytes: number;
  error?: string;
}

export interface RequestEditorProps {
  tabs: RequestTab[];
  activeTabId: string | null;
  requests: Record<string, SavedRequest>;
  collections: Collection[];
  activeEnvironment: Environment | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SavedRequest>) => void;
  onSave: (id: string) => void;
  onNewTab: () => void;
  onUpdateCollectionAuth: (id: string, authType: string, authToken: string) => void;
}

export function RequestEditor({ tabs, activeTabId, requests, collections, activeEnvironment, onTabSelect, onTabClose, onUpdate, onSave, onNewTab, onUpdateCollectionAuth }: RequestEditorProps) {

  // ─── Empty state ───
  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#0f172a] text-center px-8">
        <FileText size={48} className="text-slate-800 mb-4" />
        <h2 className="text-lg font-bold text-slate-500 mb-2">No requests open</h2>
        <p className="text-sm text-slate-600 max-w-sm mb-6">
          Create a new request or select one from the sidebar to get started.
        </p>
        <button onClick={onNewTab}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-orange-600/20">
          <Plus size={16} /> New Request
        </button>
        <p className="mt-4 text-[10px] text-slate-700">
          or press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-mono text-orange-400">Ctrl+N</kbd>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0f172a] overflow-hidden">
      {/* ─── Tab Bar ─── */}
      <div className="flex items-center border-b border-slate-800 bg-[#0f172a] shrink-0 overflow-x-auto">
        {tabs.map((tab) => {
          const isColl = tab.type === "collection";
          const req = !isColl ? requests[tab.id] : null;
          const col = isColl ? collections.find(c => c.id === tab.id) : null;
          if (!req && !col) return null;
          
          const name = isColl ? col!.name : req!.name;
          const method = isColl ? "COLLECTION" : req!.method;
          const isActive = activeTabId === tab.id;
          return (
            <div key={tab.id}
              onClick={() => onTabSelect(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-slate-800 shrink-0 max-w-[180px] group transition-colors
                ${isActive ? "bg-slate-800/60 text-slate-200" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}>
              <span className={`text-[9px] font-bold ${isColl ? "text-blue-400" : methodColor(method)}`}>{isColl ? "COL" : method}</span>
              <span className="truncate">{name}</span>
              {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" title="Unsaved changes" />}
              <button onClick={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
                className="p-0.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto">
                <X size={12} />
              </button>
            </div>
          );
        })}
        <button onClick={onNewTab} className="p-2 hover:bg-slate-800 text-slate-500 hover:text-orange-400 transition-colors shrink-0" title="New Request">
          <Plus size={14} />
        </button>
      </div>

      {/* ─── Request Editor (active tab area containing all tabs to preserve states) ─── */}
      {tabs.map(tab => {
        if (tab.type === "collection") {
          const col = collections.find(c => c.id === tab.id);
          if (!col) return null;
          return (
            <div key={tab.id} className="w-full h-full p-4 overflow-y-auto" style={{ display: tab.id === activeTabId ? "block" : "none" }}>
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span className="text-blue-400 text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border border-blue-400/30 bg-blue-400/10">COLLECTION</span>
                      <span className="text-slate-200">{col.name}</span>
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Configure authentication that child requests can inherit.</p>
                  </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-6">
                  <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Authentication</h3>
                  
                  <div className="flex gap-4 mb-4">
                    <select
                      value={col.auth_type}
                      onChange={(e) => onUpdateCollectionAuth(col.id, e.target.value, col.auth_token)}
                      className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none w-48 appearance-none cursor-pointer hover:bg-slate-700 transition-colors bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat pr-10"
                    >
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                    </select>
                  </div>
                  
                  {col.auth_type === "bearer" && (
                    <div className="relative">
                      <EnvVarInput
                        value={col.auth_token}
                        onChange={(v) => onUpdateCollectionAuth(col.id, "bearer", v)}
                        className="bg-slate-800 border border-slate-600 rounded flex-1 max-w-lg mb-2"
                        placeholder="Enter Bearer Token (e.g. {{API_KEY}})"
                        activeEnvironment={activeEnvironment}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Child requests that use "Inherit from Collection" auth will automatically use this Bearer token.<br/>
                        Environment variables inside curly braces will be automatically evaluated.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        const req = requests[tab.id];
        if (!req) return null;
        return (
          <RequestTabContent
            key={tab.id}
            req={req}
            isActive={activeTabId === tab.id}
            collections={collections}
            activeEnvironment={activeEnvironment}
            onUpdate={onUpdate}
            onSave={onSave}
          />
        );
      })}
    </div>
  );
}
