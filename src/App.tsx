import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { RequestUrlBar, RequestTabs } from "./components/RequestUrlBar";
import { PayloadEditor } from "./components/PayloadEditor";
import { ResponsePanel } from "./components/ResponsePanel";
import { AIChatPanel } from "./components/AIChatPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useResizable } from "./hooks/useResizable";

// Matches the Rust Workspace struct
interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

type AppView = "loading" | "welcome" | "workspace";

function App() {
  // ── App-level state ──
  const [view, setView] = useState<AppView>("loading");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── Workspace-level state ──
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(true);

  // ── Resizable panels ──
  const sidebar = useResizable(240, 180, 400, "horizontal");
  const aiPanel = useResizable(280, 200, 500, "horizontal");
  const payloadHeight = useResizable(200, 0, 600, "vertical");

  // ── On mount: check for existing workspace ──
  useEffect(() => {
    async function init() {
      try {
        const lastWorkspace = await invoke<Workspace | null>("get_last_workspace");
        if (lastWorkspace) {
          setWorkspace(lastWorkspace);
          setView("workspace");
        } else {
          setView("welcome");
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
        setView("welcome");
      }
    }
    init();
  }, []);

  // ── Create workspace handler ──
  const handleCreateWorkspace = async (name: string) => {
    setIsCreating(true);
    try {
      const newWorkspace = await invoke<Workspace>("create_workspace", { name });
      setWorkspace(newWorkspace);
      setView("workspace");
    } catch (err) {
      console.error("Failed to create workspace:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = () => {
    console.log(`Sending ${method} request to ${url}`);
  };

  const toggleAi = () => setIsAiOpen(!isAiOpen);

  // ── Loading screen ──
  if (view === "loading") {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl font-black tracking-tighter text-orange-500">RECURL</div>
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Welcome / Create Workspace screen ──
  if (view === "welcome") {
    return (
      <WelcomeScreen
        onCreateWorkspace={handleCreateWorkspace}
        isCreating={isCreating}
      />
    );
  }

  // ── Main workspace UI ──
  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      <Navbar projectName={workspace?.name ?? "Workspace"} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div style={{ width: sidebar.size, minWidth: 180, maxWidth: 400 }} className="shrink-0 overflow-hidden">
          <Sidebar />
        </div>
        <ResizeHandle direction="horizontal" onMouseDown={sidebar.startResize} />

        {/* Center work area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <RequestUrlBar
            method={method}
            setMethod={setMethod}
            url={url}
            setUrl={setUrl}
            onSend={handleSend}
          />
          <RequestTabs />

          <div className="flex-1 flex flex-col overflow-hidden">
            <div style={{ height: payloadHeight.size, minHeight: 0, maxHeight: 600 }} className="shrink-0 overflow-hidden">
              <PayloadEditor />
            </div>
            <ResizeHandle direction="vertical" onMouseDown={payloadHeight.startResize} />
            <div className="flex-1 overflow-hidden">
              <ResponsePanel />
            </div>
          </div>
        </div>

        {/* AI Chat */}
        {isAiOpen && (
          <ResizeHandle
            direction="horizontal"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = aiPanel.size;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
              const onMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX;
                const newSize = Math.min(500, Math.max(200, startW + delta));
                aiPanel.setSize(newSize);
              };
              const onUp = () => {
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
        )}
        <div
          style={{ width: isAiOpen ? aiPanel.size : 40, minWidth: isAiOpen ? 200 : 40 }}
          className="shrink-0 overflow-hidden transition-[width] duration-200"
        >
          <AIChatPanel isOpen={isAiOpen} onToggle={toggleAi} />
        </div>
      </div>
    </div>
  );
}

export default App;
