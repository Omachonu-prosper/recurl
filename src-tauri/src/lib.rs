use tauri::Manager;

mod workspace;

use workspace::{get_last_workspace, create_workspace, list_workspaces, set_active_workspace};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_last_workspace,
            create_workspace,
            list_workspaces,
            set_active_workspace,
        ])
        .setup(|app| {
            // Reset zoom to 100% on startup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_zoom(1.0);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
