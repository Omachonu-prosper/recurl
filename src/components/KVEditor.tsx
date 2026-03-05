import { memo, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";


export interface KVField {
  name: string;
  value: string;
  enabled: boolean;
  isFile?: boolean;
}

export interface KVEditorProps {
  items: KVField[];
  onChange: (items: KVField[]) => void;
  placeholderName?: string;
  placeholderValue?: string;
  allowFiles?: boolean;
}

export const KVEditor = memo(function KVEditor({ items, onChange, placeholderName = "Key", placeholderValue = "Value", allowFiles = false }: KVEditorProps) {
  
  const handleUpdate = (index: number, updates: Partial<KVField>) => {
    const next = items.map((item, i) => i === index ? { ...item, ...updates } : item);
    onChange(next);
  };

  const handleDelete = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    onChange([...items, { name: "", value: "", enabled: true, isFile: false }]);
  };

  const handlePickFile = async (index: number) => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        if (paths.length > 0) {
          handleUpdate(index, { value: paths.join(";"), isFile: true });
        }
      }
    } catch (err) {
      console.error("Failed to pick file:", err);
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto">
      {/* Table header */}
      <div className="grid shrink-0 border-b border-slate-800" style={{ gridTemplateColumns: allowFiles ? "32px minmax(140px, 1fr) 72px minmax(180px, 1.5fr) 36px" : "32px minmax(140px, 1fr) minmax(180px, 1.5fr) 36px" }}>
        <div className="px-2 py-1.5" />
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-800">{placeholderName}</div>
        {allowFiles && <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-800">Type</div>}
        <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{placeholderValue}</div>
        <div className="px-2 py-1.5" />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, index) => (
          <KVRow
            key={index}
            item={item}
            index={index}
            placeholderName={placeholderName}
            placeholderValue={placeholderValue}
            allowFiles={allowFiles}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onPickFile={handlePickFile}
          />
        ))}
      </div>

      {/* Add button */}
      <button 
        onClick={handleAdd}
        className="mt-1 shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-500 hover:text-orange-400 transition-colors w-fit"
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
});

/** Individual row — memoized to avoid re-rendering siblings */
const KVRow = memo(function KVRow({ item, index, placeholderName, placeholderValue, allowFiles, onUpdate, onDelete, onPickFile }: {
  item: KVField;
  index: number;
  placeholderName: string;
  placeholderValue: string;
  allowFiles: boolean;
  onUpdate: (i: number, u: Partial<KVField>) => void;
  onDelete: (i: number) => void;
  onPickFile: (i: number) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  const fileNames = item.isFile && item.value
    ? item.value.split(";").filter(Boolean).map(p => p.split(/[\\/]/).pop())
    : [];

  return (
    <div
      className={`grid group border-b border-slate-800/60 transition-colors ${item.enabled ? "bg-transparent hover:bg-slate-800/20" : "bg-slate-900/40 opacity-50"}`}
      style={{ gridTemplateColumns: allowFiles ? "32px minmax(140px, 1fr) 72px minmax(180px, 1.5fr) 36px" : "32px minmax(140px, 1fr) minmax(180px, 1.5fr) 36px" }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={item.enabled}
          onChange={() => onUpdate(index, { enabled: !item.enabled })}
          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-orange-500 cursor-pointer"
        />
      </div>

      {/* Key */}
      <div className="border-r border-slate-800/60 min-w-0">
        <input
          ref={nameRef}
          value={item.name}
          onChange={(e) => onUpdate(index, { name: e.target.value })}
          placeholder={placeholderName}
          spellCheck={false}
          className="w-full h-full bg-transparent px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-700 font-mono"
        />
      </div>

      {/* Type selector — only when allowFiles */}
      {allowFiles && (
        <div className="border-r border-slate-800/60 flex items-center px-1">
          <select
            value={item.isFile ? "file" : "text"}
            onChange={(e) => {
              if (e.target.value === "file") {
                onUpdate(index, { isFile: true, value: "" });
              } else {
                onUpdate(index, { isFile: false, value: "" });
              }
            }}
            className="w-full bg-transparent text-[10px] text-slate-400 outline-none cursor-pointer appearance-none text-center hover:text-slate-200 transition-colors"
          >
            <option value="text" className="bg-slate-900 text-slate-300">Text</option>
            <option value="file" className="bg-slate-900 text-slate-300">File</option>
          </select>
        </div>
      )}

      {/* Value */}
      <div className="flex items-center min-w-0">
        {item.isFile ? (
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1 min-w-0">
            {fileNames.length > 0 ? (
              <>
                <span className="text-xs text-slate-400 truncate flex-1 font-mono" title={item.value}>
                  {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files`}
                </span>
                <button
                  onClick={() => onUpdate(index, { value: "" })}
                  className="p-0.5 text-slate-600 hover:text-red-400 shrink-0 transition-colors"
                  title="Clear selection"
                >
                  <X size={10} />
                </button>
              </>
            ) : (
              <span className="text-[11px] text-slate-700 italic">No file selected</span>
            )}
            <button
              onClick={() => onPickFile(index)}
              className="ml-auto shrink-0 px-2 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors border border-slate-700"
            >
              Select
            </button>
          </div>
        ) : (
          <input
            ref={valueRef}
            value={item.value}
            onChange={(e) => onUpdate(index, { value: e.target.value })}
            placeholder={placeholderValue}
            spellCheck={false}
            className="w-full h-full bg-transparent px-3 py-2 text-xs text-slate-300 outline-none placeholder:text-slate-700 font-mono"
          />
        )}
      </div>

      {/* Delete */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => onDelete(index)}
          className="p-1 text-slate-700 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});
