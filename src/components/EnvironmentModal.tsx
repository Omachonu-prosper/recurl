import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Trash2, Save } from "lucide-react";
import type { Environment } from "../types";

interface EnvironmentModalProps {
  environment: Environment;
  workspaceId: string;
  onClose: () => void;
  onUpdate: (env: Environment) => void;
}

export function EnvironmentModal({ environment, workspaceId, onClose, onUpdate }: EnvironmentModalProps) {
  const [name, setName] = useState(environment.name);
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    const list = Object.entries(environment.variables).map(([k, v]) => ({ key: k, value: v }));
    list.push({ key: "", value: "" });
    setVariables(list);
  }, [environment]);

  const updateVariable = (idx: number, field: "key" | "value", val: string) => {
    const newVars = [...variables];
    newVars[idx][field] = val;
    if (idx === newVars.length - 1 && (newVars[idx].key || newVars[idx].value)) {
      newVars.push({ key: "", value: "" });
    }
    setVariables(newVars);
  };

  async function handleSave() {
    const varMap: Record<string, string> = {};
    for (const { key, value } of variables) {
      if (key.trim()) {
        varMap[key.trim()] = value;
      }
    }
    try {
      const updated = await invoke<Environment>("update_environment", {
        workspaceId,
        envId: environment.id,
        name,
        variables: varMap,
      });
      onUpdate(updated);
      onClose();
    } catch (err) {
      console.error("Failed to update environment:", err);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#1e293b]/30">
          <h2 className="text-lg font-bold text-slate-200">Manage Environment</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700/50 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Environment Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
              placeholder="e.g. Production"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Variables</label>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-0 border-b border-slate-800 bg-slate-800/50 text-xs font-bold text-slate-400">
                <div className="col-span-4 p-3 border-r border-slate-800">Variable Key</div>
                <div className="col-span-7 p-3 border-r border-slate-800">Value</div>
                <div className="col-span-1 p-3 flex justify-center"></div>
              </div>
              <div className="flex flex-col">
                {variables.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-0 border-b border-slate-800/50 last:border-0 group">
                    <div className="col-span-4 border-r border-slate-800/50 bg-transparent">
                      <input
                        value={v.key}
                        onChange={(e) => updateVariable(i, "key", e.target.value)}
                        placeholder="API_URL"
                        className="w-full bg-transparent px-3 py-2 text-sm text-slate-300 outline-none font-mono focus:bg-slate-800/50"
                      />
                    </div>
                    <div className="col-span-7 border-r border-slate-800/50 bg-transparent">
                      <input
                        value={v.value}
                        onChange={(e) => updateVariable(i, "value", e.target.value)}
                        placeholder="https://api.example.com"
                        className="w-full bg-transparent px-3 py-2 text-sm text-slate-300 outline-none focus:bg-slate-800/50"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => {
                          if (variables.length > 1) {
                            setVariables(variables.filter((_, idx) => idx !== i));
                          }
                        }}
                        className={`p-1.5 rounded transition-colors ${variables.length > 1 ? 'text-slate-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100' : 'text-slate-700 cursor-default visibility-hidden'}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-[#1e293b]/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all active:scale-95">
            <Save size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
