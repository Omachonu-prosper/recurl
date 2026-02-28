import { useState } from "react";
import { Sparkles, ArrowRight, Zap } from "lucide-react";

interface WelcomeScreenProps {
  onCreateWorkspace: (name: string) => void;
  isCreating: boolean;
}

export function WelcomeScreen({ onCreateWorkspace, isCreating }: WelcomeScreenProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onCreateWorkspace(trimmed);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="text-5xl font-black tracking-tighter text-orange-500 mb-2">
            RECURL
          </div>
          <p className="text-slate-500 text-sm tracking-wide">
            A modern API client built with Rust
          </p>
        </div>

        {/* Card */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Zap size={20} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">Create a Workspace</h2>
              <p className="text-xs text-slate-500">
                Workspaces organize your collections, requests, and environments.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Project"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-slate-600 mb-6"
            />
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20 disabled:shadow-none"
            >
              {isCreating ? (
                <span>Creating...</span>
              ) : (
                <>
                  <span>Get Started</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest">
          <Sparkles size={10} />
          <span>Powered by Tauri + Rust</span>
        </div>
      </div>
    </div>
  );
}
