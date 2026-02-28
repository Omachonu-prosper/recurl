export function ResponsePanel() {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-[#1e293b]/10 shrink-0">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Response</span>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-green-400 font-mono">STATUS: 200 OK</span>
          <span className="text-[10px] text-slate-500 font-mono">TIME: 42ms</span>
          <span className="text-[10px] text-slate-500 font-mono">SIZE: 1.2 KB</span>
        </div>
      </div>
      <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-[#020617]/50">
        <pre className="text-slate-400 whitespace-pre-wrap">{`{
  "status": "success",
  "data": {
    "user": {
      "id": "12345",
      "name": "Recurl User",
      "role": "Beta Tester"
    }
  }
}`}</pre>
      </div>
    </div>
  );
}
