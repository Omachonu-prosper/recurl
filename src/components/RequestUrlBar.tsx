interface RequestUrlBarProps {
  method: string;
  setMethod: (method: string) => void;
  url: string;
  setUrl: (url: string) => void;
  onSend: () => void;
}

export function RequestUrlBar({ method, setMethod, url, setUrl, onSend }: RequestUrlBarProps) {
  return (
    <div className="p-4 border-b border-slate-800 flex gap-2 bg-[#1e293b]/10 shrink-0">
      <div className="flex items-center gap-0 border border-slate-700 rounded-lg overflow-hidden flex-1 shadow-lg bg-slate-900/50">
        <select 
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-slate-800 text-sm font-bold px-4 h-10 border-r border-slate-700 outline-none hover:bg-slate-700 transition-colors cursor-pointer text-orange-400 appearance-none"
        >
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
          <option>PATCH</option>
        </select>
        <input 
          type="text"
          placeholder="https://api.example.com/v1/auth"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-slate-600"
        />
      </div>
      <button 
        onClick={onSend}
        className="bg-orange-600 hover:bg-orange-500 text-white px-6 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 group"
      >
        <span>Send</span>
      </button>
    </div>
  );
}

export function RequestTabs() {
  return (
    <div className="flex border-b border-slate-800 px-4 gap-6 bg-[#0f172a] shrink-0">
      {["Params", "Auth", "Headers", "Body", "Scripts"].map((tab) => (
        <button 
          key={tab}
          className={`py-2 text-xs font-medium border-b-2 transition-all ${
            tab === "Body" ? "border-orange-500 text-orange-400" : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
