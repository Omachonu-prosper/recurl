import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { json } from "@codemirror/lang-json";
import { X, Plus, Save, Send, FileText } from "lucide-react";
import { ResizeHandle } from "./ResizeHandle";
import { useResizable } from "../hooks/useResizable";
import type { SavedRequest, RequestTab } from "../types";

interface RequestEditorProps {
  tabs: RequestTab[];
  activeTabId: string | null;
  requests: Record<string, SavedRequest>;
  activeRequest: SavedRequest | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SavedRequest>) => void;
  onSave: (id: string) => void;
  onNewTab: () => void;
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return "text-green-500";
    case "POST": return "text-orange-400";
    case "PUT": return "text-blue-400";
    case "DELETE": return "text-red-400";
    case "PATCH": return "text-yellow-400";
    default: return "text-slate-400";
  }
}

export interface HttpResponseData {
  status: number;
  status_text: string;
  headers: [string, string][];
  body: string;
  time_ms: number;
  size_bytes: number;
  error?: string;
}

export function RequestEditor({ tabs, activeTabId, requests, activeRequest, onTabSelect, onTabClose, onUpdate, onSave, onNewTab }: RequestEditorProps) {
  const [activePayloadTab, setActivePayloadTab] = useState("Body");
  const payloadTabs = ["Params", "Auth", "Headers", "Body", "Scripts"];

  const [responses, setResponses] = useState<Record<string, HttpResponseData>>({});
  const [isSending, setIsSending] = useState<Record<string, boolean>>({});

  async function handleSend() {
    if (!activeRequest) return;
    const reqId = activeRequest.id;
    setIsSending(prev => ({ ...prev, [reqId]: true }));
    try {
      const res = await invoke<HttpResponseData>("send_http_request", {
        reqId: activeRequest.id,
        method: activeRequest.method,
        url: activeRequest.url,
        body: activeRequest.body,
        headers: activeRequest.headers,
      });
      
      try {
        if (res.body) {
          const parsed = JSON.parse(res.body);
          res.body = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        // Ignore JSON parse errors, leave body as is
      }
      
      setResponses(prev => ({ ...prev, [reqId]: res }));
    } catch (err: any) {
      setResponses(prev => ({
        ...prev,
        [reqId]: {
          status: 0,
          status_text: "Error",
          headers: [],
          body: "",
          time_ms: 0,
          size_bytes: 0,
          error: String(err),
        }
      }));
    } finally {
      setIsSending(prev => ({ ...prev, [reqId]: false }));
    }
  }

  // Dynamically cap payload height so response always gets ≥10% of space
  // Dynamically cap payload height so response always gets ≥10% of space
  const [maxPayload, setMaxPayload] = useState(400);

  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (el) {
      const observer = new ResizeObserver(([entry]) => {
        const h = entry.contentRect.height;
        if (h > 0) setMaxPayload(Math.floor(h * 0.9));
      });
      observer.observe(el);
      observerRef.current = observer;
    }
  }, []);

  // Pass maxPayload as the dynamic max — the hook reads it via a ref on each drag frame
  // Min is 0 so response can expand up to just below the tabs row
  const payloadHeight = useResizable(250, 0, maxPayload, "vertical");

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
          const req = requests[tab.requestId];
          if (!req) return null;
          const isActive = activeTabId === tab.requestId;
          return (
            <div key={tab.requestId}
              onClick={() => onTabSelect(tab.requestId)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-slate-800 shrink-0 max-w-[180px] group transition-colors
                ${isActive ? "bg-slate-800/60 text-slate-200" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"}`}>
              <span className={`text-[9px] font-bold ${methodColor(req.method)}`}>{req.method}</span>
              <span className="truncate">{req.name}</span>
              {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" title="Unsaved changes" />}
              <button onClick={(e) => { e.stopPropagation(); onTabClose(tab.requestId); }}
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

      {/* ─── Request Editor (active tab) ─── */}
      {activeRequest && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Request name + Save */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/50 bg-[#1e293b]/10 shrink-0">
            <input
              value={activeRequest.name}
              onChange={(e) => onUpdate(activeRequest.id, { name: e.target.value })}
              className="bg-transparent text-sm font-medium outline-none flex-1 min-w-0 text-slate-300 placeholder:text-slate-600"
              placeholder="Request name..."
            />
            <button onClick={() => onSave(activeRequest.id)}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-orange-400 rounded-lg text-xs font-medium transition-colors"
              title="Save (Ctrl+S)">
              <Save size={12} /> Save
            </button>
          </div>

          {/* URL Bar */}
          <div className="p-3 border-b border-slate-800 flex gap-2 bg-[#1e293b]/10 shrink-0">
            <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden flex-1 bg-slate-900/50">
              <select value={activeRequest.method}
                onChange={(e) => onUpdate(activeRequest.id, { method: e.target.value })}
                className={`bg-slate-800 text-sm font-bold px-3 h-10 border-r border-slate-700 outline-none hover:bg-slate-700 transition-colors cursor-pointer appearance-none ${methodColor(activeRequest.method)}`}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
                <option value="HEAD">HEAD</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
              <input type="text" value={activeRequest.url}
                onChange={(e) => onUpdate(activeRequest.id, { url: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                placeholder="https://api.example.com/v1/resource"
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-slate-600 min-w-0" />
            </div>
            {isSending[activeRequest.id] ? (
              <button onClick={() => invoke("cancel_http_request", { reqId: activeRequest.id }).catch(console.error)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-slate-600">
                <X size={14} className="text-red-400" /> 
                Cancel
              </button>
            ) : (
              <button onClick={handleSend}
                className="bg-orange-600 hover:bg-orange-500 text-white px-5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2">
                <Send size={14} /> 
                Send
              </button>
            )}
          </div>

          {/* Payload/Response tabs */}
          <div className="flex border-b border-slate-800 px-4 gap-5 bg-[#0f172a] shrink-0">
            {payloadTabs.map((tab) => (
              <button key={tab} onClick={() => setActivePayloadTab(tab)}
                className={`py-2 text-xs font-medium border-b-2 transition-all ${activePayloadTab === tab ? "border-orange-500 text-orange-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Payload + Response with draggable divider */}
          <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
            {/* Payload area */}
            <div style={{ height: Math.min(payloadHeight.size, maxPayload), minHeight: 0, maxHeight: maxPayload }} className="shrink-0 overflow-hidden p-4">
              {activePayloadTab === "Body" ? (
                <div 
                  className="w-full h-full border border-slate-800 rounded-xl overflow-hidden focus-within:border-orange-500/30 bg-slate-900/50"
                  onKeyDownCapture={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSend();
                    }
                  }}
                >
                  <CodeMirror
                    value={activeRequest.body}
                    extensions={[json()]}
                    theme={vscodeDark}
                    onChange={(value) => onUpdate(activeRequest.id, { body: value })}
                    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
                    className="w-full h-full text-sm [&>.cm-editor]:h-full [&>.cm-editor]:bg-transparent"
                  />
                </div>
              ) : activePayloadTab === "Headers" ? (
                <textarea
                  value={activeRequest.headers}
                  onChange={(e) => onUpdate(activeRequest.id, { headers: e.target.value })}
                  placeholder="Content-Type: application/json"
                  className="w-full h-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 outline-none resize-none focus:border-orange-500/30 placeholder:text-slate-700"
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              ) : (
                <div className="h-full border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 bg-slate-900/20">
                  <p className="text-sm">{activePayloadTab} — coming soon</p>
                </div>
              )}
            </div>

            {/* Draggable resize handle */}
            <ResizeHandle direction="vertical" onMouseDown={payloadHeight.startResize} />

            {/* Response area - fills remaining space */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 flex items-center justify-between bg-[#1e293b]/10 shrink-0 border-b border-slate-800/50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Response</span>
                {responses[activeRequest.id] && (
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold ${responses[activeRequest.id].status >= 200 && responses[activeRequest.id].status < 300 ? "text-green-500" : "text-red-500"}`}>
                      {responses[activeRequest.id].status > 0 ? `${responses[activeRequest.id].status} ${responses[activeRequest.id].status_text}` : "ERROR"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{responses[activeRequest.id].time_ms} ms</span>
                    <span className="text-[10px] text-slate-500 font-mono">{(responses[activeRequest.id].size_bytes / 1024).toFixed(2)} KB</span>
                  </div>
                )}
                {!responses[activeRequest.id] && (
                  <span className="text-[10px] text-slate-600 font-mono">Waiting for request...</span>
                )}
              </div>
              <div className="flex-1 overflow-hidden font-mono text-sm bg-[#020617]/50 text-slate-500">
                {responses[activeRequest.id] ? (
                  responses[activeRequest.id].error ? (
                    <div className="p-4"><span className="text-red-400">{responses[activeRequest.id].error}</span></div>
                  ) : (
                    <CodeMirror
                      value={responses[activeRequest.id].body}
                      extensions={[json()]}
                      theme={vscodeDark}
                      readOnly={true}
                      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
                      className="w-full h-full text-sm [&>.cm-editor]:h-full [&>.cm-editor]:bg-transparent"
                    />
                  )
                ) : (
                  <div className="p-4"><pre>Send a request to see the response here.</pre></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
