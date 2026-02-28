import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FolderPlus, ChevronRight, ChevronDown, Folder, MoreHorizontal,
  Pencil, Trash2, FolderOpen, Inbox, Plus, FileText,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import type { SavedRequest, Collection, WorkspaceData } from "../types";

interface SidebarProps {
  workspaceId: string;
  activeRequestId: string | null;
  onRequestSelect: (req: SavedRequest) => void;
  onRequestCreated: (req: SavedRequest) => void;
  onRequestDeleted: (requestId: string) => void;
  onRequestRenamed: (requestId: string, newName: string) => void;
  refreshKey: number;
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

function ContextMenu({ x, y, items, onClose }: {
  x: number; y: number;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{ top: y, left: x }} className="fixed z-50 min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 text-sm">
      {items.map((item, i) => (
        <button key={i} onClick={() => { item.onClick(); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 transition-colors ${item.danger ? "hover:bg-red-500/20 text-red-400" : "hover:bg-slate-700 text-slate-300"}`}>
          {item.icon} {item.label}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ workspaceId, activeRequestId, onRequestSelect, onRequestCreated, onRequestDeleted, onRequestRenamed, refreshKey }: SidebarProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: "collection" | "request"; id: string } | null>(null);
  const [renaming, setRenaming] = useState<{ type: "collection" | "request"; id: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null); // collection id or "__root__"

  const newColRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [workspaceId, refreshKey]);
  useEffect(() => { if (isCreatingCollection && newColRef.current) newColRef.current.focus(); }, [isCreatingCollection]);
  useEffect(() => { if (renaming && renameRef.current) renameRef.current.focus(); }, [renaming]);

  async function loadData() {
    try {
      const data = await invoke<WorkspaceData>("get_workspace_data", { workspaceId });
      setCollections(data.collections);
      setRequests(data.requests);
    } catch (err) { console.error("Failed to load workspace data:", err); }
  }

  async function handleCreateCollection() {
    const name = newColName.trim();
    if (!name) { setIsCreatingCollection(false); return; }
    try {
      await invoke("create_collection", { workspaceId, name });
      setNewColName(""); setIsCreatingCollection(false); loadData();
    } catch (err) { console.error(err); }
  }

  async function handleRenameCollection(id: string) {
    const name = renameValue.trim();
    if (!name) { setRenaming(null); return; }
    try {
      await invoke("rename_collection", { workspaceId, collectionId: id, name });
      setRenaming(null); loadData();
    } catch (err) { console.error(err); }
  }

  async function handleRenameRequest(id: string) {
    const name = renameValue.trim();
    if (!name) { setRenaming(null); return; }
    try {
      await invoke("rename_request", { workspaceId, requestId: id, name });
      setRenaming(null); 
      onRequestRenamed(id, name);
      loadData();
    } catch (err) { console.error(err); }
  }

  const [confirmDialog, setConfirmDialog] = useState<{ type: "collection" | "request"; id: string; name: string } | null>(null);

  async function handleDeleteCollection(id: string) {
    try {
      await invoke("delete_collection", { workspaceId, collectionId: id });
      // Notify parent about any requests that were in this collection
      const colReqs = requests.filter(r => r.collection_id === id);
      colReqs.forEach(r => onRequestDeleted(r.id));
      loadData();
    } catch (err) { console.error(err); }
  }

  async function handleNewRequest(collectionId: string | null) {
    try {
      const req = await invoke<SavedRequest>("create_request", { workspaceId, collectionId });
      loadData();
      onRequestCreated(req);
    } catch (err) { console.error(err); }
  }

  async function handleDeleteRequest(id: string) {
    try {
      await invoke("delete_request", { workspaceId, requestId: id });
      onRequestDeleted(id);
      loadData();
    } catch (err) { console.error(err); }
  }

  // Drag-and-drop: move request to a collection (or null for root)
  async function handleDrop(e: React.DragEvent, toCollectionId: string | null) {
    e.preventDefault();
    setDropTarget(null);
    const requestId = e.dataTransfer.getData("requestId");
    if (!requestId) return;
    try {
      await invoke("move_request", { workspaceId, requestId, toCollectionId });
      loadData();
    } catch (err) { console.error("Failed to move request:", err); }
  }

  const rootRequests = requests.filter(r => r.collection_id === null);
  const collectionRequests = (colId: string) => requests.filter(r => r.collection_id === colId);

  return (
    <div className="h-full flex flex-col bg-[#0f172a] border-r border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]/20 shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Explorer</span>
        <div className="flex items-center gap-1">
          <button onClick={() => handleNewRequest(null)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-orange-400 transition-colors" title="New Request (Ctrl+N)">
            <Plus size={16} />
          </button>
          <button onClick={() => { setIsCreatingCollection(true); setNewColName(""); }}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-orange-400 transition-colors" title="New Collection">
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1"
        onDragOver={(e) => { e.preventDefault(); setDropTarget("__root__"); }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => handleDrop(e, null)}
      >
        {/* New collection input */}
        {isCreatingCollection && (
          <div className="flex items-center px-3 py-1.5 gap-2">
            <Folder size={16} className="text-blue-400 shrink-0" />
            <input ref={newColRef} value={newColName} onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateCollection(); if (e.key === "Escape") setIsCreatingCollection(false); }}
              onBlur={handleCreateCollection} placeholder="Collection name..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm outline-none focus:border-orange-500/50 min-w-0" />
          </div>
        )}

        {/* Collections */}
        {collections.map((col) => {
          const isCollapsed = collapsed[col.id] ?? false;
          const colReqs = collectionRequests(col.id);

          return (
            <div key={col.id}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTarget(col.id); }}
              onDragLeave={(e) => { e.stopPropagation(); setDropTarget(null); }}
              onDrop={(e) => { e.stopPropagation(); handleDrop(e, col.id); }}
              className={dropTarget === col.id ? "bg-orange-500/10 rounded mx-1" : ""}
            >
              {/* Collection header */}
              <div className="flex items-center px-3 py-1.5 hover:bg-slate-800/50 cursor-pointer text-sm gap-1.5 group"
                onClick={() => setCollapsed(p => ({ ...p, [col.id]: !p[col.id] }))}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "collection", id: col.id }); }}>
                {isCollapsed ? <ChevronRight size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
                {isCollapsed ? <Folder size={16} className="text-blue-400 shrink-0" /> : <FolderOpen size={16} className="text-blue-400 shrink-0" />}

                {renaming?.type === "collection" && renaming.id === col.id ? (
                  <input ref={renameRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameCollection(col.id); if (e.key === "Escape") setRenaming(null); }}
                    onBlur={() => handleRenameCollection(col.id)} onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm outline-none focus:border-orange-500/50 min-w-0" />
                ) : (
                  <span className="flex-1 truncate">{col.name}</span>
                )}

                <button onClick={(e) => { e.stopPropagation(); handleNewRequest(col.id); }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-opacity" title="Add request">
                  <Plus size={12} className="text-slate-400" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: "collection", id: col.id }); }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-opacity">
                  <MoreHorizontal size={14} className="text-slate-400" />
                </button>
              </div>

              {/* Requests in collection */}
              {!isCollapsed && colReqs.map((req) => (
                <div key={req.id} onClick={() => onRequestSelect(req)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "request", id: req.id }); }}
                  draggable onDragStart={(e) => e.dataTransfer.setData("requestId", req.id)}
                  className={`flex items-center pl-11 pr-3 py-1.5 hover:bg-slate-800 cursor-pointer text-sm gap-2 transition-colors group
                    ${activeRequestId === req.id ? "bg-slate-800/60 border-r-2 border-orange-500" : "opacity-80 hover:opacity-100"}`}>
                  <span className={`text-[10px] font-bold w-8 shrink-0 ${methodColor(req.method)}`}>{req.method}</span>
                  {renaming?.type === "request" && renaming.id === req.id ? (
                    <input ref={renameRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRenameRequest(req.id); if (e.key === "Escape") setRenaming(null); }}
                      onBlur={() => handleRenameRequest(req.id)} onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm outline-none focus:border-orange-500/50 min-w-0" />
                  ) : (
                    <span className="flex-1 truncate">{req.name}</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: "request", id: req.id }); }}
                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-opacity ml-auto shrink-0">
                    <MoreHorizontal size={14} className="text-slate-400" />
                  </button>
                </div>
              ))}

              {!isCollapsed && colReqs.length === 0 && (
                <div className="pl-11 pr-3 py-2 text-[10px] text-slate-600 italic">Empty</div>
              )}
            </div>
          );
        })}

        {/* Root-level requests — visually separated from collections */}
        {rootRequests.length > 0 && collections.length > 0 && (
          <div className="mx-3 mt-2 mb-1 border-t border-slate-700/50" />
        )}
        {rootRequests.map((req) => (
          <div key={req.id} onClick={() => onRequestSelect(req)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: "request", id: req.id }); }}
            draggable onDragStart={(e) => e.dataTransfer.setData("requestId", req.id)}
            className={`flex items-center px-4 py-1.5 hover:bg-slate-800 cursor-pointer text-sm gap-2 transition-colors group
              ${activeRequestId === req.id ? "bg-slate-800/60 border-r-2 border-orange-500" : "opacity-80 hover:opacity-100"}`}>
            <FileText size={14} className="text-slate-500 shrink-0" />
            <span className={`text-[10px] font-bold w-8 shrink-0 ${methodColor(req.method)}`}>{req.method}</span>
            {renaming?.type === "request" && renaming.id === req.id ? (
              <input ref={renameRef} value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameRequest(req.id); if (e.key === "Escape") setRenaming(null); }}
                onBlur={() => handleRenameRequest(req.id)} onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm outline-none focus:border-orange-500/50 min-w-0" />
            ) : (
              <span className="flex-1 truncate">{req.name}</span>
            )}
            <button onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type: "request", id: req.id }); }}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-opacity ml-auto shrink-0">
              <MoreHorizontal size={14} className="text-slate-400" />
            </button>
          </div>
        ))}

        {/* Empty state */}
        {collections.length === 0 && rootRequests.length === 0 && !isCreatingCollection && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Inbox size={32} className="text-slate-700 mb-3" />
            <p className="text-xs text-slate-500 font-medium mb-1">No requests yet</p>
            <p className="text-[10px] text-slate-600">Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[9px] font-mono text-orange-400">Ctrl+N</kbd> to create one.</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.type === "collection" && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} items={[
          { label: "Add Request", icon: <Plus size={13} />, onClick: () => handleNewRequest(contextMenu.id) },
          { label: "Rename", icon: <Pencil size={13} />, onClick: () => { const c = collections.find(c => c.id === contextMenu.id); if (c) { setRenaming({ type: "collection", id: c.id }); setRenameValue(c.name); } } },
          { label: "Delete", icon: <Trash2 size={13} />, onClick: () => {
            const c = collections.find(c => c.id === contextMenu.id);
            setConfirmDialog({ type: "collection", id: contextMenu.id, name: c?.name ?? "this collection" });
          }, danger: true },
        ]} />
      )}
      {contextMenu && contextMenu.type === "request" && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} items={[
          { label: "Rename", icon: <Pencil size={13} />, onClick: () => { const r = requests.find(r => r.id === contextMenu.id); if (r) { setRenaming({ type: "request", id: r.id }); setRenameValue(r.name); } } },
          { label: "Delete", icon: <Trash2 size={13} />, onClick: () => {
            const r = requests.find(r => r.id === contextMenu.id);
            setConfirmDialog({ type: "request", id: contextMenu.id, name: r?.name ?? "this request" });
          }, danger: true },
        ]} />
      )}

      {/* Delete Confirmation */}
      {confirmDialog && (
        <ConfirmDialog
          title={`Delete ${confirmDialog.type === "collection" ? "Collection" : "Request"}`}
          message={`Are you sure you want to delete "${confirmDialog.name}"? This action cannot be undone.`}
          onConfirm={() => {
            if (confirmDialog.type === "collection") handleDeleteCollection(confirmDialog.id);
            else handleDeleteRequest(confirmDialog.id);
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
