import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { RequestUrlBar, RequestTabs } from "./components/RequestUrlBar";
import { PayloadEditor } from "./components/PayloadEditor";
import { ResponsePanel } from "./components/ResponsePanel";
import { AIChatPanel } from "./components/AIChatPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { useResizable } from "./hooks/useResizable";

function App() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [projectName] = useState("My Workspace");
  const [isAiOpen, setIsAiOpen] = useState(true);

  // Horizontal resizable panels (pixel-based, reliable)
  const sidebar = useResizable(240, 180, 400, "horizontal");
  const aiPanel = useResizable(280, 200, 500, "horizontal");

  // Vertical split between payload and response
  const payloadHeight = useResizable(200, 0, 600, "vertical");

  const handleSend = () => {
    console.log(`Sending ${method} request to ${url}`);
  };

  const toggleAi = () => setIsAiOpen(!isAiOpen);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      {/* Navbar */}
      <Navbar projectName={projectName} />

      {/* Main layout: Sidebar | Work Area | AI Chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div style={{ width: sidebar.size, minWidth: 180, maxWidth: 400 }} className="shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        <ResizeHandle direction="horizontal" onMouseDown={sidebar.startResize} />

        {/* Center work area: takes all remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* URL bar + Tabs (static) */}
          <RequestUrlBar
            method={method}
            setMethod={setMethod}
            url={url}
            setUrl={setUrl}
            onSend={handleSend}
          />
          <RequestTabs />

          {/* Payload / Response vertical split */}
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

        {/* AI Chat Panel */}
        {isAiOpen && (
          <ResizeHandle
            direction="horizontal"
            onMouseDown={(e) => {
              // For the AI panel, dragging LEFT should increase its size
              e.preventDefault();
              const startX = e.clientX;
              const startW = aiPanel.size;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";

              const onMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX; // reversed: left = bigger
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
