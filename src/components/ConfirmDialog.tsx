import { useRef, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 animate-in">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-lg shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button ref={cancelRef} onClick={onCancel}
            className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
