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
  auth_type: string;
  auth_token: string;
  collection_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  auth_type: string;
  auth_token: string;
  created_at: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

export interface WorkspaceData {
  collections: Collection[];
  requests: SavedRequest[];
  environments: Environment[];
  ui_state: UIState;
}

export interface UIState {
  open_tab_ids: string[];
  active_tab_id: string | null;
  active_environment_id: string | null;
}

// Frontend-only tab state
export interface RequestTab {
  id: string; // The ID of the request or collection
  type: "request" | "collection";
  /** True if the tab has unsaved changes */
  dirty: boolean;
}
