import { useState, useRef, useEffect, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Search, Settings, ChevronDown, Check, FolderOpen } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface NavbarProps {
  workspace: Workspace;
  onWorkspaceChange: (ws: Workspace) => void;
  environments: Array<{ id: string; name: string }>;
  activeEnvironmentId: string | null;
  onEnvironmentSelect: (id: string | null) => void;
  onCreateEnvironment: (name: string) => void;
  onEditEnvironment: (envId: string) => void;
}

export const Navbar = memo(function Navbar({ workspace, onWorkspaceChange, environments, activeEnvironmentId, onEnvironmentSelect, onCreateEnvironment, onEditEnvironment }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingEnv, setIsCreatingEnv] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEnvName, setNewEnvName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const envDropdownRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const createEnvInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setIsCreating(false);
      }
      if (envDropdownRef.current && !envDropdownRef.current.contains(e.target as Node)) {
        setEnvDropdownOpen(false);
        setIsCreatingEnv(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (isCreating && createInputRef.current) createInputRef.current.focus();
    if (isCreatingEnv && createEnvInputRef.current) createEnvInputRef.current.focus();
  }, [isCreating, isCreatingEnv]);

  async function openDropdown() {
    try {
      const list = await invoke<Workspace[]>("list_workspaces");
      setWorkspaces(list);
    } catch (err) {
      console.error("Failed to list workspaces:", err);
    }
    setDropdownOpen(true);
  }

  async function switchWorkspace(ws: Workspace) {
    try {
      await invoke("set_active_workspace", { workspaceId: ws.id });
      onWorkspaceChange(ws);
    } catch (err) {
      console.error("Failed to switch workspace:", err);
    }
    setDropdownOpen(false);
  }

  async function handleCreateWorkspace() {
    const trimmed = newName.trim();
    if (!trimmed) { setIsCreating(false); return; }
    try {
      const ws = await invoke<Workspace>("create_workspace", { name: trimmed });
      onWorkspaceChange(ws);
      setNewName("");
      setIsCreating(false);
      setDropdownOpen(false);
    } catch (err) {
      console.error("Failed to create workspace:", err);
    }
  }

  async function handleCreateEnvironment() {
    const trimmed = newEnvName.trim();
    if (!trimmed) { setIsCreatingEnv(false); return; }
    try {
      onCreateEnvironment(trimmed);
      setNewEnvName("");
      setIsCreatingEnv(false);
      setEnvDropdownOpen(false);
    } catch (err) {
      console.error("Failed to create environment:", err);
    }
  }

  const activeEnv = environments.find(e => e.id === activeEnvironmentId);

  return (
    <header className="h-12 border-b border-slate-800 flex items-center justify-between px-4 bg-[#1e293b]/50 backdrop-blur-sm z-50 shrink-0">
      <div className="flex items-center gap-4">
        <div className="text-orange-500 font-extrabold tracking-tighter text-xl mr-2">RECURL</div>

        {/* Workspace Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => dropdownOpen ? setDropdownOpen(false) : openDropdown()}
            className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1 rounded-md transition-colors border border-slate-700/50 bg-slate-800/30"
          >
            <span className="text-sm font-medium max-w-[180px] truncate">{workspace.name}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Workspaces
              </div>

              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => switchWorkspace(ws)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-sm transition-colors"
                >
                  <FolderOpen size={14} className="text-blue-400 shrink-0" />
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  {ws.id === workspace.id && <Check size={14} className="text-green-400 shrink-0" />}
                </button>
              ))}

              <div className="border-t border-slate-700 mt-1 pt-1">
                {isCreating ? (
                  <div className="px-3 py-1.5">
                    <input
                      ref={createInputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateWorkspace();
                        if (e.key === "Escape") setIsCreating(false);
                      }}
                      onBlur={handleCreateWorkspace}
                      placeholder="Workspace name..."
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-orange-500/50"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsCreating(true); setNewName(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-sm text-orange-400 transition-colors"
                  >
                    <Plus size={14} />
                    New Workspace
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Environment Dropdown */}
        <div className="relative" ref={envDropdownRef}>
          <button
            onClick={() => envDropdownOpen ? setEnvDropdownOpen(false) : setEnvDropdownOpen(true)}
            className="flex items-center gap-2 hover:bg-slate-800 px-3 py-1 rounded-md transition-colors border border-slate-700/50 bg-slate-800/30 ml-2 text-slate-400 hover:text-slate-200"
          >
            <span className="text-sm font-medium max-w-[150px] truncate">
              {activeEnv ? activeEnv.name : "No Environment"}
            </span>
            <ChevronDown size={14} className={`transition-transform ${envDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {envDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Environments
              </div>

              <button
                onClick={() => { onEnvironmentSelect(null); setEnvDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-sm transition-colors"
              >
                <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0" />
                <span className="flex-1 text-left truncate text-slate-400">No Environment</span>
                {!activeEnvironmentId && <Check size={14} className="text-green-400 shrink-0" />}
              </button>

              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => { onEnvironmentSelect(env.id); setEnvDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-sm transition-colors text-slate-200"
                >
                  <div className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500 shrink-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  </div>
                  <span className="flex-1 text-left truncate">{env.name}</span>
                  {env.id === activeEnvironmentId && <Check size={14} className="text-green-400 shrink-0" />}
                </button>
              ))}

              <div className="border-t border-slate-700 mt-1 pt-1">
                {activeEnvironmentId && (
                  <button
                    onClick={() => { onEditEnvironment(activeEnvironmentId); setEnvDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-sm text-blue-400 transition-colors"
                  >
                    Edit Environment
                  </button>
                )}
                {isCreatingEnv ? (
                  <div className="px-3 py-1.5">
                    <input
                      ref={createEnvInputRef}
                      value={newEnvName}
                      onChange={(e) => setNewEnvName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateEnvironment();
                        if (e.key === "Escape") setIsCreatingEnv(false);
                      }}
                      onBlur={handleCreateEnvironment}
                      placeholder="Environment name..."
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm outline-none focus:border-orange-500/50"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsCreatingEnv(true); setNewEnvName(""); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-sm text-orange-400 transition-colors"
                  >
                    <Plus size={14} />
                    New Environment
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
});
