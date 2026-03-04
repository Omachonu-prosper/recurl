use tauri::Manager;

mod workspace;
mod http_client;

use http_client::{send_http_request, cancel_http_request, RequestState};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;

use workspace::{
    get_last_workspace, create_workspace, list_workspaces, set_active_workspace,
    get_collections, create_collection, rename_collection, delete_collection,
    get_workspace_data, create_request, save_request, rename_request, delete_request, move_request,
    save_ui_state, create_environment, update_environment, delete_environment,
    update_collection_auth,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_last_workspace,
            create_workspace,
            list_workspaces,
            set_active_workspace,
            get_collections,
            create_collection,
            rename_collection,
            delete_collection,
            update_collection_auth,
            get_workspace_data,
            create_request,
            save_request,
            rename_request,
            delete_request,
            move_request,
            save_ui_state,
            create_environment,
            update_environment,
            delete_environment,
            send_http_request,
            cancel_http_request,
        ])
        .setup(|app| {
            app.manage(RequestState(Arc::new(Mutex::new(HashMap::new()))));
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_zoom(1.0);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
