import { FileCode } from "lucide-react";

export function PayloadEditor() {
  return (
    <div className="h-full overflow-y-auto p-4 bg-[#0f172a]">
      <div className="h-full border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-slate-900/20">
        <FileCode size={40} className="mb-3 opacity-20" />
        <p className="text-sm font-medium mb-1">Request Payload</p>
        <p className="text-xs opacity-50 italic text-center max-w-[200px]">
          JSON / Form-Data editor will be integrated here.
        </p>
      </div>
    </div>
  );
}
