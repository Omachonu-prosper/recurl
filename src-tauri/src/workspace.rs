use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::Utc;
use uuid::Uuid;
use tauri::Manager;

/// A workspace groups collections, environments, and settings together.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Top-level app state persisted to disk.
/// Tracks all workspaces and which one was last active.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppState {
    pub workspaces: Vec<Workspace>,
    pub last_workspace_id: Option<String>,
}

/// Returns the path to the app's data directory (e.g. ~/.local/share/com.recurl.app/).
/// Creates the directory if it doesn't exist.
fn get_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    Ok(dir)
}

/// Path to the state JSON file.
fn state_file_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_data_dir(app_handle)?.join("state.json"))
}

/// Load the persisted app state from disk.
fn load_state(app_handle: &tauri::AppHandle) -> Result<AppState, String> {
    let path = state_file_path(app_handle)?;
    if !path.exists() {
        return Ok(AppState::default());
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read state file: {}", e))?;
    serde_json::from_str(&data)
        .map_err(|e| format!("Failed to parse state file: {}", e))
}

/// Save the app state to disk.
fn save_state(app_handle: &tauri::AppHandle, state: &AppState) -> Result<(), String> {
    let path = state_file_path(app_handle)?;
    let data = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;
    fs::write(&path, data)
        .map_err(|e| format!("Failed to write state file: {}", e))
}

// ─── Tauri Commands ───

/// Called on app startup. Returns the last active workspace, or None.
#[tauri::command]
pub fn get_last_workspace(app_handle: tauri::AppHandle) -> Result<Option<Workspace>, String> {
    let state = load_state(&app_handle)?;
    
    if let Some(last_id) = &state.last_workspace_id {
        let workspace = state.workspaces.iter().find(|w| &w.id == last_id).cloned();
        return Ok(workspace);
    }
    
    Ok(None)
}

/// Create a new workspace and set it as the active one.
#[tauri::command]
pub fn create_workspace(app_handle: tauri::AppHandle, name: String) -> Result<Workspace, String> {
    let mut state = load_state(&app_handle)?;
    
    let now = Utc::now().to_rfc3339();
    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name,
        created_at: now.clone(),
        updated_at: now,
    };
    
    state.last_workspace_id = Some(workspace.id.clone());
    state.workspaces.push(workspace.clone());
    save_state(&app_handle, &state)?;
    
    // Create a directory for this workspace's data
    let ws_dir = get_data_dir(&app_handle)?.join("workspaces").join(&workspace.id);
    fs::create_dir_all(&ws_dir)
        .map_err(|e| format!("Failed to create workspace dir: {}", e))?;
    
    Ok(workspace)
}

/// List all available workspaces.
#[tauri::command]
pub fn list_workspaces(app_handle: tauri::AppHandle) -> Result<Vec<Workspace>, String> {
    let state = load_state(&app_handle)?;
    Ok(state.workspaces)
}

/// Switch the active workspace.
#[tauri::command]
pub fn set_active_workspace(app_handle: tauri::AppHandle, workspace_id: String) -> Result<Workspace, String> {
    let mut state = load_state(&app_handle)?;
    
    let workspace = state.workspaces
        .iter()
        .find(|w| w.id == workspace_id)
        .cloned()
        .ok_or_else(|| "Workspace not found".to_string())?;
    
    state.last_workspace_id = Some(workspace_id);
    save_state(&app_handle, &state)?;
    
    Ok(workspace)
}
