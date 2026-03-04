import { useState, useRef, useCallback, useMemo, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { json } from "@codemirror/lang-json";
import { keymap, ViewPlugin, Decoration, type DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { linter, type Diagnostic } from "@codemirror/lint";
import { parse as jsoncParse, printParseErrorCode, type ParseError } from "jsonc-parser";
import { X, Save, Send } from "lucide-react";
import { ResizeHandle } from "./ResizeHandle";
import { useResizable } from "../hooks/useResizable";
import type { SavedRequest, Collection, Environment } from "../types";
import { HttpResponseData } from "./RequestEditor";

export function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return "text-green-500";
    case "POST": return "text-orange-400";
    case "PUT": return "text-blue-400";
    case "DELETE": return "text-red-400";
    case "PATCH": return "text-yellow-400";
    default: return "text-slate-400";
  }
}


// ── Comment highlighting (matches VS Code dark theme comment color) ──
const commentMark = Decoration.mark({ class: "cm-jsonc-comment" });

const commentHighlightTheme = EditorView.baseTheme({
  ".cm-jsonc-comment, .cm-jsonc-comment span": {
    color: "#6A9955 !important",
    fontStyle: "italic",
  },
});

// JSONC-aware linter: parses body with jsonc-parser (which understands // comments)
// and reports actual JSON syntax errors as diagnostics.
const jsoncLinter = linter((view) => {
  const doc = view.state.doc.toString();
  if (!doc.trim()) return []; // Skip empty documents

  const errors: ParseError[] = [];
  jsoncParse(doc, errors, { allowTrailingComma: true });

  const diagnostics: Diagnostic[] = [];
  for (const err of errors) {
    const from = Math.min(err.offset, doc.length);
    const to = Math.min(err.offset + err.length, doc.length);
    diagnostics.push({
      from,
      to,
      severity: "error",
      message: printParseErrorCode(err.error),
    });
  }
  return diagnostics;
});

// ViewPlugin that scans visible lines and decorates // comments
const commentHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          const trimmed = line.text.trimStart();
          if (trimmed.startsWith("//")) {
            const commentStart = line.from + line.text.indexOf("//");
            builder.add(commentStart, line.to, commentMark);
          }
          pos = line.to + 1;
        }
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

// Custom Ctrl+/ toggle comment keymap for the request body editor.
// Uses // line comments (JSONC style) since the body editor supports JSONC.
const toggleCommentKeymap = keymap.of([
  {
    key: "Ctrl-/",
    run(view) {
      const { state } = view;
      const changes: { from: number; to: number; insert: string }[] = [];

      // Gather all lines touched by selections
      const lineSet = new Set<number>();
      for (const range of state.selection.ranges) {
        const startLine = state.doc.lineAt(range.from).number;
        const endLine = state.doc.lineAt(range.to).number;
        for (let ln = startLine; ln <= endLine; ln++) {
          lineSet.add(ln);
        }
      }
      const lineNumbers = Array.from(lineSet).sort((a, b) => a - b);

      // Determine if we are commenting or uncommenting:
      // If ALL non-empty lines already start with "//", uncomment; otherwise comment.
      const lines = lineNumbers.map((ln) => state.doc.line(ln));
      const nonEmptyLines = lines.filter((l) => l.text.trimStart().length > 0);
      const allCommented =
        nonEmptyLines.length > 0 &&
        nonEmptyLines.every((l) => l.text.trimStart().startsWith("//"));

      if (allCommented) {
        // Uncomment: remove the first occurrence of "// " or "//" from each line
        for (const line of lines) {
          const idx = line.text.indexOf("//");
          if (idx === -1) continue;
          // Remove "// " (with trailing space) or just "//"
          const hasSpace = line.text[idx + 2] === " ";
          changes.push({
            from: line.from + idx,
            to: line.from + idx + 2 + (hasSpace ? 1 : 0),
            insert: "",
          });
        }
      } else {
        // Comment: find the minimum indentation among non-empty lines
        let minIndent = Infinity;
        for (const line of nonEmptyLines) {
          const indent = line.text.length - line.text.trimStart().length;
          if (indent < minIndent) minIndent = indent;
        }
        if (!isFinite(minIndent)) minIndent = 0;

        for (const line of lines) {
          // Insert "// " at the min-indent position for all lines
          changes.push({
            from: line.from + Math.min(minIndent, line.text.length),
            to: line.from + Math.min(minIndent, line.text.length),
            insert: "// ",
          });
        }
      }

      if (changes.length > 0) {
        view.dispatch({ changes });
      }
      return true;
    },
  },
]);

function resolveEnvVars(text: string, env: Environment | null): string {
  if (!text || !env) return text;
  return text.replace(/\{\{([\w\-]+)\}\}/g, (match, key) => {
    return env.variables[key] !== undefined ? env.variables[key] : match;
  });
}

export const EnvVarInput = memo(function EnvVarInput({ value, onChange, placeholder, onEnter, activeEnvironment, type = "text", className }: { value: string, onChange: (v: string) => void, placeholder?: string, onEnter?: () => void, activeEnvironment: Environment | null, type?: string, className?: string }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const variables = activeEnvironment ? Object.keys(activeEnvironment.variables) : [];
  
  // Find if we are typing a variable right now
  const textBeforeCursor = value.slice(0, cursorPos);
  const match = textBeforeCursor.match(/\{\{([^{}]*)$/);
  const searchStr = match ? match[1].toLowerCase() : "";
  
  const filteredVars = showDropdown ? variables.filter(v => v.toLowerCase().includes(searchStr)) : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredVars.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredVars.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredVars.length) % filteredVars.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertVariable(filteredVars[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    } else if (e.key === "Enter" && onEnter) {
      onEnter();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    
    // Check if we should show dropdown
    const beforeCursor = val.slice(0, pos);
    if (beforeCursor.match(/\{\{([^{}]*)$/) && variables.length > 0) {
      setShowDropdown(true);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  };

  const insertVariable = (varName: string) => {
    if (!match) return;
    const startIdx = cursorPos - match[0].length;
    const endIdx = cursorPos;
    const newValue = value.slice(0, startIdx) + "{{" + varName + "}}" + value.slice(endIdx);
    onChange(newValue);
    setShowDropdown(false);
    
    // Restore focus and cursor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = startIdx + varName.length + 4;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // Colorize logic: We render the input completely transparent over a colored div, identical to how you simulate syntax highlighting in inputs
  // But actually, the user wants colored variables. A fast way is an overlaid div.
  const renderValue = () => {
    if (type === "password") return null;
    if (!value && placeholder) return <span className="text-slate-600">{placeholder}</span>;
    
    const parts = value.split(/(\{\{[\w\-]+\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        const varName = part.slice(2, -2);
        const resolved = activeEnvironment?.variables[varName];
        return (
          <span key={i} className="text-blue-400 font-bold group relative cursor-help pointer-events-auto">
            {part}
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap z-50 font-normal">
              {resolved !== undefined ? (
                <>Value: <span className="font-bold text-slate-100">{resolved}</span></>
              ) : (
                <span className="text-slate-400 italic">Unresolved variable</span>
              )}
            </div>
          </span>
        );
      }
      return <span key={i} className="text-slate-300">{part}</span>;
    });
  };

  return (
    <div className={`relative ${className || "flex-1 min-w-0"}`}>
      <div className="relative w-full h-full flex items-center">
        {/* Underlay with colors */}
        <div className="absolute inset-0 pointer-events-none px-4 py-2 text-sm font-mono whitespace-pre overflow-hidden flex items-center">
          {renderValue()}
        </div>
        {/* Actual input */}
        <input 
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
          placeholder={type === "password" ? placeholder : undefined}
          spellCheck={false}
          className={`w-full h-full bg-transparent px-4 py-2 text-sm outline-none font-mono relative z-10 ${type === 'password' ? 'text-slate-300 placeholder:text-slate-600' : 'text-transparent caret-slate-300'}`}
        />
      </div>
      
      {showDropdown && filteredVars.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
          {filteredVars.map((v, i) => (
            <div 
              key={v} 
              className={`px-3 py-2 text-sm cursor-pointer border-b border-slate-700/50 last:border-0 ${i === selectedIndex ? "bg-slate-700 text-orange-400" : "text-slate-300 hover:bg-slate-700 hover:text-orange-300"}`}
              onClick={() => insertVariable(v)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="font-mono">{"{{" + v + "}}"}</span>
              <div className="text-[10px] text-slate-500 truncate">{activeEnvironment?.variables[v]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

interface RequestTabContentProps {
  req: SavedRequest;
  isActive: boolean;
  collections: Collection[];
  activeEnvironment: Environment | null;
  onUpdate: (id: string, updates: Partial<SavedRequest>) => void;
  onSave: (id: string) => void;
}

export const RequestTabContent = memo(function RequestTabContent({ req, isActive, collections, activeEnvironment, onUpdate, onSave }: RequestTabContentProps) {
  const [activePayloadTab, setActivePayloadTab] = useState("Body");
  const payloadTabs = ["Params", "Auth", "Headers", "Body", "Scripts"];
  const [wrapResponse, setWrapResponse] = useState(false);
  const [response, setResponse] = useState<HttpResponseData | null>(null);
  const [isSending, setIsSending] = useState(false);

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

  const payloadHeight = useResizable(250, 0, maxPayload, "vertical");

  // Memoize the CodeMirror extensions array so it stays referentially stable
  const bodyEditorExtensions = useMemo(
    () => [json(), toggleCommentKeymap, commentHighlighter, commentHighlightTheme, jsoncLinter],
    []
  );

  async function handleSend() {
    setIsSending(true);
    setResponse({
      status: 0,
      status_text: "Loading...",
      headers: [],
      body: "",
      time_ms: 0,
      size_bytes: 0,
    });

    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<string>(`chunk-${req.id}`, (event) => {
        setResponse(prev => {
          if (!prev) return prev;
          return { ...prev, body: prev.body + event.payload };
        });
      });

      // Parse final URL, body, headers with injected variables
      const finalUrl = resolveEnvVars(req.url, activeEnvironment);
      // Strip // comment lines from body before sending
      const strippedBody = req.body
        .split("\n")
        .filter(line => !line.trimStart().startsWith("//"))
        .join("\n");
      const finalBody = resolveEnvVars(strippedBody, activeEnvironment);
      const finalHeaders = resolveEnvVars(req.headers, activeEnvironment);

      // Resolve Auth
      let finalAuthType = req.auth_type;
      let finalAuthToken = req.auth_token;
      if (finalAuthType === "inherit" && req.collection_id) {
        const col = collections.find(c => c.id === req.collection_id);
        if (col) {
          finalAuthType = col.auth_type;
          finalAuthToken = col.auth_token;
        }
      }
      finalAuthToken = resolveEnvVars(finalAuthToken, activeEnvironment);

      const res = await invoke<HttpResponseData>("send_http_request", {
        reqId: req.id,
        method: req.method,
        url: finalUrl,
        body: finalBody,
        headers: finalHeaders,
        authType: finalAuthType,
        authToken: finalAuthToken,
      });

      try {
        if (res.body) {
          const parsed = JSON.parse(res.body);
          res.body = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {}

      setResponse(res);
    } catch (err: any) {
      setResponse({
        status: 0,
        status_text: "Error",
        headers: [],
        body: "",
        time_ms: 0,
        size_bytes: 0,
        error: String(err),
      });
    } finally {
      if (unlisten) unlisten();
      setIsSending(false);
    }
  }

  return (
    <div style={{ display: isActive ? "flex" : "none" }} className="flex-1 flex-col overflow-hidden">
      {/* Request name + Save */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/50 bg-[#1e293b]/10 shrink-0">
        <input
          value={req.name}
          onChange={(e) => onUpdate(req.id, { name: e.target.value })}
          className="bg-transparent text-sm font-medium outline-none flex-1 min-w-0 text-slate-300 placeholder:text-slate-600"
          placeholder="Request name..."
        />
        <button onClick={() => onSave(req.id)}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-orange-400 rounded-lg text-xs font-medium transition-colors"
          title="Save (Ctrl+S)">
          <Save size={12} /> Save
        </button>
      </div>

      {/* URL Bar */}
      <div className="p-3 border-b border-slate-800 flex gap-2 bg-[#1e293b]/10 shrink-0">
        <div className="flex items-center border border-slate-700 rounded-lg flex-1 bg-slate-900/50">
          <select value={req.method}
            onChange={(e) => onUpdate(req.id, { method: e.target.value })}
            className={`bg-slate-800 text-sm font-bold px-3 h-10 border-r border-slate-700 rounded-l-lg outline-none hover:bg-slate-700 transition-colors cursor-pointer appearance-none ${methodColor(req.method)}`}>
            {["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <EnvVarInput 
            value={req.url}
            onChange={(v) => onUpdate(req.id, { url: v })}
            onEnter={handleSend}
            placeholder="https://api.example.com/v1/resource"
            activeEnvironment={activeEnvironment}
            className="flex-1"
          />
        </div>
        {isSending ? (
          <button onClick={() => invoke("cancel_http_request", { reqId: req.id }).catch(console.error)}
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-slate-600">
            <X size={14} className="text-red-400" /> Cancel
          </button>
        ) : (
          <button onClick={handleSend}
            className="bg-orange-600 hover:bg-orange-500 text-white px-5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2">
            <Send size={14} /> Send
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
          
          {activePayloadTab === "Body" && (
            <div 
              className="w-full h-full border border-slate-800 rounded-xl overflow-hidden focus-within:border-orange-500/30 bg-slate-900/50"
              onKeyDownCapture={(e) => {
                if (e.ctrlKey && e.key === "Enter") {
                  e.preventDefault(); e.stopPropagation(); handleSend();
                }
              }}>
              <CodeMirror
                value={req.body}
                extensions={bodyEditorExtensions}
                theme={vscodeDark}
                onChange={(value) => onUpdate(req.id, { body: value })}
                basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
                className="w-full h-full text-sm [&>.cm-editor]:h-full [&>.cm-editor]:bg-transparent"
              />
            </div>
          )}

          {activePayloadTab === "Headers" && (
            <textarea
              value={req.headers}
              onChange={(e) => onUpdate(req.id, { headers: e.target.value })}
              placeholder="Content-Type: application/json"
              className="w-full h-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 outline-none resize-none focus:border-orange-500/30 placeholder:text-slate-700"
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleSend(); }
              }}
            />
          )}

          {activePayloadTab === "Auth" && (
            <div className="w-full h-full bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500">Auth Type</label>
                <select 
                  value={req.auth_type} 
                  onChange={(e) => onUpdate(req.id, { auth_type: e.target.value })}
                  className="bg-slate-800 text-sm font-medium px-3 py-2 border border-slate-700 rounded outline-none hover:bg-slate-700 w-48 appearance-none cursor-pointer">
                  {req.collection_id && <option value="inherit">Inherit from Collection</option>}
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                </select>
              </div>

              {req.auth_type === "bearer" && (
                <div className="flex flex-col gap-2 relative">
                  <label className="text-xs font-bold text-slate-500">Token</label>
                  <EnvVarInput
                    value={req.auth_token}
                    onChange={(v) => onUpdate(req.id, { auth_token: v })}
                    className="bg-slate-800 border border-slate-700 rounded flex-1 max-w-md placeholder:text-slate-600"
                    placeholder="Enter bearer token (or {{variable}})"
                    activeEnvironment={activeEnvironment}
                  />
                </div>
              )}

              {req.auth_type === "inherit" && req.collection_id && (() => {
                const col = collections.find(c => c.id === req.collection_id);
                return (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mt-2">
                    <p className="text-xs text-slate-400 font-medium">This request is inheriting authentication from the <span className="text-slate-200">{col?.name || 'Collection'}</span> collection.</p>
                  </div>
                );
              })()}
            </div>
          )}

          {["Params", "Scripts"].includes(activePayloadTab) && (
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
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Response</span>
              <button 
                onClick={() => setWrapResponse(!wrapResponse)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${wrapResponse ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-transparent text-slate-500 hover:text-slate-300 border-slate-700 hover:border-slate-500'}`}
                title="Toggle Text Wrap"
              >
                Wrap
              </button>
            </div>
            {response && (
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-bold ${response.status >= 200 && response.status < 300 ? "text-green-500" : (response.status === 0 && !response.error ? "text-orange-400" : "text-red-500")}`}>
                  {response.status > 0 ? `${response.status} ${response.status_text}` : (response.error ? "ERROR" : "LOADING...")}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {response.time_ms >= 1000 ? (response.time_ms / 1000).toFixed(2) + " s" : response.time_ms + " ms"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{(response.size_bytes / 1024).toFixed(2)} KB</span>
              </div>
            )}
            {!response && (
              <span className="text-[10px] text-slate-600 font-mono">Waiting for request...</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden font-mono text-sm bg-[#020617]/50 text-slate-500">
            {response ? (
              response.error ? (
                <div className="p-4"><span className="text-red-400">{response.error}</span></div>
              ) : (
                <CodeMirror
                  value={response.body}
                  extensions={[
                    json(),
                    ...(wrapResponse ? [EditorView.lineWrapping] : [])
                  ]}
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
  );
});
