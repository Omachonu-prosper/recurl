import { Sparkles, ChevronRight, ChevronLeft, Send } from "lucide-react";

interface AIChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function AIChatPanel({ isOpen, onToggle }: AIChatPanelProps) {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] border-l border-slate-800 overflow-hidden">
      {/* Header */}
      <div className={`h-12 border-b border-slate-800 flex items-center shrink-0 bg-[#0f172a] ${isOpen ? 'px-3' : 'justify-center'}`}>
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-orange-400 transition-colors"
          title={isOpen ? "Collapse AI" : "Expand AI"}
        >
          {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
        {isOpen && (
          <div className="ml-3 flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-widest">
            <Sparkles size={14} />
            Recurl AI
          </div>
        )}
      </div>

      {isOpen ? (
        /* Expanded state */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 text-sm">
              <p className="text-slate-300 leading-relaxed">
                Hi! I'm Recurl AI. How can I help you with your API requests today?
              </p>
            </div>
            <div className="mt-auto py-4 opacity-50 text-[10px] text-center uppercase tracking-[0.15em] text-slate-500 font-semibold select-none">
              AI generated responses may be inaccurate
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 bg-[#0f172a] shrink-0">
            <div className="relative">
              <textarea
                placeholder="Ask AI..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pr-12 text-sm resize-none h-20 outline-none focus:border-orange-500/50 transition-all placeholder:text-slate-600"
              />
              <button
                className="absolute bottom-2.5 right-2.5 p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-all active:scale-90"
                title="Send to AI"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed state: just a vertical label */
        <div
          className="flex-1 flex flex-col items-center py-6 gap-4 cursor-pointer hover:bg-slate-800/20 transition-colors"
          onClick={onToggle}
        >
          <Sparkles size={20} className="text-orange-500" />
          <div className="[writing-mode:vertical-lr] text-[10px] uppercase tracking-[0.3em] font-black text-slate-600 rotate-180 select-none">
            RECURL AI
          </div>
        </div>
      )}
    </div>
  );
}
