// Types matching the Rust backend structs

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  body: string;
  headers: string;
  collection_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  created_at: string;
}

export interface WorkspaceData {
  collections: Collection[];
  requests: SavedRequest[];
  ui_state: UIState;
}

export interface UIState {
  open_tab_ids: string[];
  active_tab_id: string | null;
}

// Frontend-only tab state
export interface RequestTab {
  requestId: string;
  /** True if the tab has unsaved changes */
  dirty: boolean;
}
