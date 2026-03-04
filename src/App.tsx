import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Navbar } from "./components/Navbar";
import { Sidebar } from "./components/Sidebar";
import { RequestEditor } from "./components/RequestEditor";
import { AIChatPanel } from "./components/AIChatPanel";
import { ResizeHandle } from "./components/ResizeHandle";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EnvironmentModal } from "./components/EnvironmentModal";
import { useResizable } from "./hooks/useResizable";
import type { Workspace, SavedRequest, RequestTab, WorkspaceData, Collection, Environment } from "./types";

type AppView = "loading" | "welcome" | "workspace";

function App() {
  const [view, setView] = useState<AppView>("loading");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [tabs, setTabs] = useState<RequestTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Record<string, SavedRequest>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(null);
  const [editingEnvironmentId, setEditingEnvironmentId] = useState<string | null>(null);
  
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);

  const [isAiOpen, setIsAiOpen] = useState(true);
  const sidebar = useResizable(240, 180, 400, "horizontal");
  const aiPanel = useResizable(280, 200, 500, "horizontal");

  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  // ─── Persist tabs whenever they change ───
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabRef = useRef(activeTabId);
  activeTabRef.current = activeTabId;

  const activeEnvRef = useRef(activeEnvironmentId);
  activeEnvRef.current = activeEnvironmentId;

  const saveTabState = useCallback(() => {
    if (!workspace) return;
    const openTabIds = tabsRef.current.map(t => t.id);
    invoke("save_ui_state", {
      workspaceId: workspace.id,
      openTabIds,
      activeTabId: activeTabRef.current,
      activeEnvironmentId: activeEnvRef.current,
    }).catch(err => console.error("Failed to save tab state:", err));
  }, [workspace]);

  // Save tab state whenever tabs or activeTabId or activeEnv change
  useEffect(() => {
    if (view !== "workspace" || !workspace) return;
    const timer = setTimeout(saveTabState, 300); // debounce
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, activeEnvironmentId, view, workspace, saveTabState]);

  // ─── Init ───
  useEffect(() => {
    async function init() {
      try {
        const ws = await invoke<Workspace | null>("get_last_workspace");
        if (ws) {
          setWorkspace(ws);
          await loadTabState(ws.id);
          setView("workspace");
        } else {
          setView("welcome");
        }
      } catch { setView("welcome"); }
    }
    init();
  }, []);

  async function loadTabState(workspaceId: string) {
    try {
      const data = await invoke<WorkspaceData>("get_workspace_data", { workspaceId });
      const { ui_state } = data;
      setCollections(data.collections || []);
      setEnvironments(data.environments || []);
      setActiveEnvironmentId(ui_state.active_environment_id || null);
      if (ui_state.open_tab_ids.length > 0) {
        // Build requests map from the saved tab IDs
        const reqMap: Record<string, SavedRequest> = {};
        const validTabs: RequestTab[] = [];
        for (const tabId of ui_state.open_tab_ids) {
          const req = data.requests.find(r => r.id === tabId);
          if (req) {
            reqMap[req.id] = req;
            validTabs.push({ id: req.id, type: "request", dirty: false });
          } else {
            const col = data.collections.find(c => c.id === tabId);
            if (col) validTabs.push({ id: col.id, type: "collection", dirty: false });
          }
        }
        setRequests(reqMap);
        setTabs(validTabs);
        // Restore active tab (or fall back to first)
        const activeId = ui_state.active_tab_id && (reqMap[ui_state.active_tab_id] || data.collections.find(c => c.id === ui_state.active_tab_id))
          ? ui_state.active_tab_id
          : validTabs.length > 0 ? validTabs[0].id : null;
        setActiveTabId(activeId);
      }
    } catch (err) { console.error("Failed to load tab state:", err); }
  }

  // ─── Ctrl+N shortcut ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        handleNewRequest(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ─── Ctrl+S save shortcut ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (activeTabId) handleSaveRequest(activeTabId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ─── Request actions ───
  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
    setConfirmCloseTabId(null);
  }, [activeTabId]);

  const attemptCloseTab = useCallback((id: string) => {
    const tabItem = tabs.find(t => t.id === id);
    if (tabItem && tabItem.dirty) {
      setConfirmCloseTabId(id);
    } else {
      closeTab(id);
    }
  }, [tabs, closeTab]);

  // ─── Ctrl+W close tab shortcut ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        if (activeTabId) attemptCloseTab(activeTabId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTabId, attemptCloseTab]);

  // ─── Request actions ───
  const handleNewRequest = useCallback(async (collectionId: string | null) => {
    if (!workspace) return;
    try {
      const req = await invoke<SavedRequest>("create_request", {
        workspaceId: workspace.id,
        collectionId,
      });
      setRequests((prev) => ({ ...prev, [req.id]: req }));
      setTabs((prev) => [...prev, { id: req.id, type: "request", dirty: false }]);
      setActiveTabId(req.id);
      setSidebarRefreshKey((k) => k + 1);
    } catch (err) { console.error("Failed to create request:", err); }
  }, [workspace]);

  const openRequestTab = useCallback((req: SavedRequest) => {
    setRequests((prev) => ({ ...prev, [req.id]: req }));
    if (!tabs.find((t) => t.id === req.id)) {
      setTabs((prev) => [...prev, { id: req.id, type: "request", dirty: false }]);
    }
    setActiveTabId(req.id);
  }, [tabs]);

  const openCollectionTab = useCallback((col: Collection) => {
    if (!tabs.find((t) => t.id === col.id)) {
      setTabs((prev) => [...prev, { id: col.id, type: "collection", dirty: false }]);
    }
    setActiveTabId(col.id);
  }, [tabs]);

  const handleRequestDeleted = useCallback((requestId: string) => {
    closeTab(requestId);
    setRequests((prev) => {
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
  }, [closeTab]);

  const updateRequestLocal = useCallback((id: string, updates: Partial<SavedRequest>) => {
    setRequests((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
    setTabs((prev) => prev.map((t) => t.id === id ? { ...t, dirty: true } : t));
  }, []);

  const handleSaveRequest = useCallback(async (requestId: string) => {
    if (!workspace) return;
    const req = requestsRef.current[requestId];
    if (!req) return;
    try {
      const saved = await invoke<SavedRequest>("save_request", {
        workspaceId: workspace.id,
        requestId: req.id,
        name: req.name,
        method: req.method,
        url: req.url,
        body: req.body,
        headers: req.headers,
        authType: req.auth_type,
        authToken: req.auth_token,
      });
      setRequests((prev) => {
        const next = { ...prev };
        next[saved.id] = saved;
        return next;
      });
      setTabs((prev) => prev.map((t) => t.id === requestId ? { ...t, dirty: false } : t));
      setSidebarRefreshKey((k) => k + 1);
    } catch (err) { console.error("Failed to save request:", err); }
  }, [workspace]);

  const handleCreateWorkspace = async (name: string) => {
    setIsCreating(true);
    try {
      const ws = await invoke<Workspace>("create_workspace", { name });
      setWorkspace(ws); setView("workspace");
    } catch (err) { console.error(err); }
    finally { setIsCreating(false); }
  };

  const handleWorkspaceChange = async (ws: Workspace) => {
    setWorkspace(ws);
    setTabs([]); setActiveTabId(null); setRequests({});
    setSidebarRefreshKey((k) => k + 1);
    await loadTabState(ws.id);
  };

  const handleRequestRenamed = useCallback((id: string, name: string) => {
    updateRequestLocal(id, { name });
  }, [updateRequestLocal]);

  const handleCreateEnvironment = useCallback(async (name: string) => {
    if (!workspace) return;
    const newEnv = await invoke<Environment>("create_environment", { workspaceId: workspace.id, name });
    setEnvironments(prev => [...prev, newEnv]);
    setActiveEnvironmentId(newEnv.id);
  }, [workspace]);

  const handleNewTab = useCallback(() => handleNewRequest(null), [handleNewRequest]);

  const handleUpdateCollectionAuth = useCallback(async (colId: string, authType: string, authToken: string) => {
    if (!workspace) return;
    try {
      await invoke("update_collection_auth", { workspaceId: workspace.id, collectionId: colId, authType, authToken });
      setCollections(prev => prev.map(c => c.id === colId ? { ...c, auth_type: authType, auth_token: authToken } : c));
    } catch (err) { console.error(err); }
  }, [workspace]);

  if (view === "loading") {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex flex-col pt-12">
        <div className="flex px-4 gap-4 mb-8">
          <div className="w-[200px] h-9 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="flex-1 h-9 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>
        <div className="flex flex-1 px-4 gap-4 pb-4">
          <div className="w-[200px] h-full bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="flex-1 h-full bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="w-[280px] h-full bg-slate-800/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (view === "welcome") {
    return <WelcomeScreen onCreateWorkspace={handleCreateWorkspace} isCreating={isCreating} />;
  }

  const activeEnvironment = environments.find(e => e.id === activeEnvironmentId) || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0f172a] text-slate-200 overflow-hidden">
      <Navbar 
        workspace={workspace!} 
        onWorkspaceChange={handleWorkspaceChange} 
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        onEnvironmentSelect={setActiveEnvironmentId}
        onCreateEnvironment={handleCreateEnvironment}
        onEditEnvironment={setEditingEnvironmentId}
      />

      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: sidebar.size, minWidth: 180, maxWidth: 400 }} className="shrink-0 overflow-hidden">
          <Sidebar
            workspaceId={workspace!.id}
            activeRequestId={activeTabId}
            activeCollectionId={activeTabId}
            onRequestSelect={openRequestTab}
            onRequestCreated={openRequestTab}
            onRequestDeleted={handleRequestDeleted}
            onRequestRenamed={handleRequestRenamed}
            onCollectionSelect={openCollectionTab}
            refreshKey={sidebarRefreshKey}
            key={workspace!.id}
          />
        </div>
        <ResizeHandle direction="horizontal" onMouseDown={sidebar.startResize} />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <RequestEditor
            key={workspace!.id}
            tabs={tabs}
            activeTabId={activeTabId}
            requests={requests}
            collections={collections}
            activeEnvironment={activeEnvironment}
            onTabSelect={setActiveTabId}
            onTabClose={attemptCloseTab}
            onUpdate={updateRequestLocal}
            onSave={handleSaveRequest}
            onNewTab={handleNewTab}
            onUpdateCollectionAuth={handleUpdateCollectionAuth}
          />
        </div>

        {isAiOpen && (
          <ResizeHandle direction="horizontal"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startW = aiPanel.size;
              document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
              const onMove = (ev: MouseEvent) => aiPanel.setSize(Math.min(500, Math.max(200, startW + (startX - ev.clientX))));
              const onUp = () => { document.body.style.cursor = ""; document.body.style.userSelect = ""; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
              window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
            }} />
        )}
        <div style={{ width: isAiOpen ? aiPanel.size : 40, minWidth: isAiOpen ? 200 : 40 }} className="shrink-0 overflow-hidden transition-[width] duration-200">
          <AIChatPanel isOpen={isAiOpen} onToggle={() => setIsAiOpen(!isAiOpen)} />
        </div>
      </div>
      
      {confirmCloseTabId && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes in this request. Are you sure you want to close it?"
          confirmLabel="Close without saving"
          onConfirm={() => closeTab(confirmCloseTabId)}
          onCancel={() => setConfirmCloseTabId(null)}
        />
      )}

      {editingEnvironmentId && workspace && (() => {
        const env = environments.find(e => e.id === editingEnvironmentId);
        if (!env) return null;
        return (
          <EnvironmentModal
            environment={env}
            workspaceId={workspace.id}
            onClose={() => setEditingEnvironmentId(null)}
            onUpdate={(updatedEnv) => setEnvironments(prev => prev.map(e => e.id === updatedEnv.id ? updatedEnv : e))}
          />
        );
      })()}
    </div>
  );
}

export default App;
