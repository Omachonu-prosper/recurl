use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::Utc;
use uuid::Uuid;
use tauri::Manager;
use std::collections::HashMap;

// ─── Data Structures ───

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedRequest {
    pub id: String,
    pub name: String,
    pub method: String,
    pub url: String,
    pub body: String,
    pub headers: String,
    #[serde(default)]
    pub auth_type: String, // "none", "bearer", "inherit"
    #[serde(default)]
    pub auth_token: String,
    pub collection_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub auth_type: String, // "none", "bearer"
    #[serde(default)]
    pub auth_token: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub variables: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UIState {
    pub open_tab_ids: Vec<String>,
    pub active_tab_id: Option<String>,
    #[serde(default)]
    pub active_environment_id: Option<String>,
}

/// Workspace data stored per-workspace on disk.
/// Requests reference their collection by collection_id (or None for root).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkspaceData {
    #[serde(default)]
    pub collections: Vec<Collection>,
    #[serde(default)]
    pub requests: Vec<SavedRequest>,
    #[serde(default)]
    pub environments: Vec<Environment>,
    #[serde(default)]
    pub ui_state: UIState,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppState {
    pub workspaces: Vec<Workspace>,
    pub last_workspace_id: Option<String>,
}

// ─── File Helpers ───

fn get_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    Ok(dir)
}

fn state_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_data_dir(app_handle)?.join("state.json"))
}

fn workspace_data_path(app_handle: &tauri::AppHandle, workspace_id: &str) -> Result<PathBuf, String> {
    let dir = get_data_dir(app_handle)?.join("workspaces").join(workspace_id);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create workspace dir: {}", e))?;
    }
    Ok(dir.join("data.json"))
}

fn load_state(app_handle: &tauri::AppHandle) -> Result<AppState, String> {
    let path = state_file_path(app_handle)?;
    if !path.exists() { return Ok(AppState::default()); }
    let data = fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&data).map_err(|e| format!("Parse error: {}", e))
}

fn save_state(app_handle: &tauri::AppHandle, state: &AppState) -> Result<(), String> {
    let path = state_file_path(app_handle)?;
    let data = serde_json::to_string_pretty(state).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&path, data).map_err(|e| format!("Write error: {}", e))
}

fn load_workspace_data(app_handle: &tauri::AppHandle, workspace_id: &str) -> Result<WorkspaceData, String> {
    let path = workspace_data_path(app_handle, workspace_id)?;
    if !path.exists() { return Ok(WorkspaceData::default()); }
    let data = fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
    serde_json::from_str(&data).map_err(|e| format!("Parse error: {}", e))
}

fn save_workspace_data(app_handle: &tauri::AppHandle, workspace_id: &str, data: &WorkspaceData) -> Result<(), String> {
    let path = workspace_data_path(app_handle, workspace_id)?;
    let json = serde_json::to_string_pretty(data).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Write error: {}", e))
}

// ─── Workspace Commands ───

#[tauri::command]
pub fn get_last_workspace(app_handle: tauri::AppHandle) -> Result<Option<Workspace>, String> {
    let state = load_state(&app_handle)?;
    if let Some(last_id) = &state.last_workspace_id {
        return Ok(state.workspaces.iter().find(|w| &w.id == last_id).cloned());
    }
    Ok(None)
}

#[tauri::command]
pub fn create_workspace(app_handle: tauri::AppHandle, name: String) -> Result<Workspace, String> {
    let mut state = load_state(&app_handle)?;
    let now = Utc::now().to_rfc3339();
    let workspace = Workspace { id: Uuid::new_v4().to_string(), name, created_at: now.clone(), updated_at: now };
    state.last_workspace_id = Some(workspace.id.clone());
    state.workspaces.push(workspace.clone());
    save_state(&app_handle, &state)?;
    save_workspace_data(&app_handle, &workspace.id, &WorkspaceData::default())?;
    Ok(workspace)
}

#[tauri::command]
pub fn list_workspaces(app_handle: tauri::AppHandle) -> Result<Vec<Workspace>, String> {
    Ok(load_state(&app_handle)?.workspaces)
}

#[tauri::command]
pub fn set_active_workspace(app_handle: tauri::AppHandle, workspace_id: String) -> Result<Workspace, String> {
    let mut state = load_state(&app_handle)?;
    let workspace = state.workspaces.iter().find(|w| w.id == workspace_id).cloned()
        .ok_or_else(|| "Workspace not found".to_string())?;
    state.last_workspace_id = Some(workspace_id);
    save_state(&app_handle, &state)?;
    Ok(workspace)
}

// ─── Collection Commands ───

#[tauri::command]
pub fn get_collections(app_handle: tauri::AppHandle, workspace_id: String) -> Result<Vec<Collection>, String> {
    Ok(load_workspace_data(&app_handle, &workspace_id)?.collections)
}

#[tauri::command]
pub fn create_collection(app_handle: tauri::AppHandle, workspace_id: String, name: String) -> Result<Collection, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let collection = Collection { 
        id: Uuid::new_v4().to_string(), 
        name, 
        auth_type: "none".to_string(),
        auth_token: String::new(),
        created_at: Utc::now().to_rfc3339() 
    };
    data.collections.push(collection.clone());
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(collection)
}

#[tauri::command]
pub fn rename_collection(app_handle: tauri::AppHandle, workspace_id: String, collection_id: String, name: String) -> Result<Collection, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let col = data.collections.iter_mut().find(|c| c.id == collection_id)
        .ok_or_else(|| "Collection not found".to_string())?;
    col.name = name;
    let updated = col.clone();
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(updated)
}

#[tauri::command]
pub fn update_collection_auth(app_handle: tauri::AppHandle, workspace_id: String, collection_id: String, auth_type: String, auth_token: String) -> Result<Collection, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let col = data.collections.iter_mut().find(|c| c.id == collection_id)
        .ok_or_else(|| "Collection not found".to_string())?;
    col.auth_type = auth_type;
    col.auth_token = auth_token;
    let updated = col.clone();
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(updated)
}

#[tauri::command]
pub fn delete_collection(app_handle: tauri::AppHandle, workspace_id: String, collection_id: String) -> Result<(), String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    data.collections.retain(|c| c.id != collection_id);
    // Move orphaned requests to root
    for req in data.requests.iter_mut() {
        if req.collection_id.as_deref() == Some(&collection_id) {
            req.collection_id = None;
        }
    }
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(())
}

// ─── Request Commands ───

#[tauri::command]
pub fn get_workspace_data(app_handle: tauri::AppHandle, workspace_id: String) -> Result<WorkspaceData, String> {
    load_workspace_data(&app_handle, &workspace_id)
}

/// Create a new request (optionally in a collection).
#[tauri::command]
pub fn create_request(
    app_handle: tauri::AppHandle,
    workspace_id: String,
    collection_id: Option<String>,
) -> Result<SavedRequest, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let now = Utc::now().to_rfc3339();
    let request = SavedRequest {
        id: Uuid::new_v4().to_string(),
        name: "Untitled Request".to_string(),
        method: "GET".to_string(),
        url: String::new(),
        body: String::new(),
        headers: String::new(),
        auth_type: if collection_id.is_some() { "inherit".to_string() } else { "none".to_string() },
        auth_token: String::new(),
        collection_id,
        created_at: now.clone(),
        updated_at: now,
    };
    data.requests.push(request.clone());
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(request)
}

/// Save/update a request's data.
#[tauri::command]
pub fn save_request(
    app_handle: tauri::AppHandle,
    workspace_id: String,
    request_id: String,
    name: String,
    method: String,
    url: String,
    body: String,
    headers: String,
    auth_type: String,
    auth_token: String,
) -> Result<SavedRequest, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let req = data.requests.iter_mut().find(|r| r.id == request_id)
        .ok_or_else(|| "Request not found".to_string())?;
    req.name = name;
    req.method = method;
    req.url = url;
    req.body = body;
    req.headers = headers;
    req.auth_type = auth_type;
    req.auth_token = auth_token;
    req.updated_at = Utc::now().to_rfc3339();
    let updated = req.clone();
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(updated)
}

/// Rename a request.
#[tauri::command]
pub fn rename_request(
    app_handle: tauri::AppHandle,
    workspace_id: String,
    request_id: String,
    name: String,
) -> Result<SavedRequest, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let req = data.requests.iter_mut().find(|r| r.id == request_id)
        .ok_or_else(|| "Request not found".to_string())?;
    req.name = name;
    req.updated_at = Utc::now().to_rfc3339();
    let updated = req.clone();
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(updated)
}

/// Delete a request.
#[tauri::command]
pub fn delete_request(app_handle: tauri::AppHandle, workspace_id: String, request_id: String) -> Result<(), String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    data.requests.retain(|r| r.id != request_id);
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(())
}

/// Move a request to a different collection (or to root if collection_id is None).
#[tauri::command]
pub fn move_request(
    app_handle: tauri::AppHandle,
    workspace_id: String,
    request_id: String,
    to_collection_id: Option<String>,
) -> Result<(), String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let req = data.requests.iter_mut().find(|r| r.id == request_id)
        .ok_or_else(|| "Request not found".to_string())?;
    req.collection_id = to_collection_id;
    req.updated_at = Utc::now().to_rfc3339();
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(())
}

/// Save open tab state for a workspace.
#[tauri::command]
pub fn save_ui_state(
    app_handle: tauri::AppHandle,
    workspace_id: String,
    open_tab_ids: Vec<String>,
    active_tab_id: Option<String>,
    active_environment_id: Option<String>,
) -> Result<(), String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    data.ui_state = UIState { open_tab_ids, active_tab_id, active_environment_id };
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(())
}

// ─── Environment Commands ───

#[tauri::command]
pub fn create_environment(app_handle: tauri::AppHandle, workspace_id: String, name: String) -> Result<Environment, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let env = Environment { id: Uuid::new_v4().to_string(), name, variables: HashMap::new() };
    data.environments.push(env.clone());
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(env)
}

#[tauri::command]
pub fn update_environment(app_handle: tauri::AppHandle, workspace_id: String, env_id: String, name: String, variables: HashMap<String, String>) -> Result<Environment, String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    let env = data.environments.iter_mut().find(|e| e.id == env_id)
        .ok_or_else(|| "Environment not found".to_string())?;
    env.name = name;
    env.variables = variables;
    let updated = env.clone();
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(updated)
}

#[tauri::command]
pub fn delete_environment(app_handle: tauri::AppHandle, workspace_id: String, env_id: String) -> Result<(), String> {
    let mut data = load_workspace_data(&app_handle, &workspace_id)?;
    data.environments.retain(|e| e.id != env_id);
    if data.ui_state.active_environment_id.as_deref() == Some(&env_id) {
        data.ui_state.active_environment_id = None;
    }
    save_workspace_data(&app_handle, &workspace_id, &data)?;
    Ok(())
}
