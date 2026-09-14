// RagsMC Launcher - backend Tauri
mod minecraft;

use tauri::Manager;
use minecraft::{
    add_account, backup_instance, cancel_install, check_for_updates, delete_account,
    delete_content, delete_installation, detect_java_versions, get_accounts, get_installations,
    get_installation_summary, get_launch_log, get_minecraft_versions, get_recommended_java,
    get_service_status, get_total_memory_gb,
    install_mod, launch_minecraft, list_backups, list_mods, list_resource_packs, list_shaders,
    microsoft_login, open_game_folder, read_instance_log, restore_backup, save_installation,
    search_mods, select_account, start_log_stream, toggle_content,
};

/// Show the main window (called after splash screen finishes loading).
/// This replaces the invisible window with the visible one.
#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_minecraft_versions,
            get_installations,
            save_installation,
            delete_installation,
            launch_minecraft,
            cancel_install,
            get_total_memory_gb,
            get_service_status,
            search_mods,
            install_mod,
            backup_instance,
            list_backups,
            restore_backup,
            read_instance_log,
            microsoft_login,
            list_mods,
            list_shaders,
            list_resource_packs,
            toggle_content,
            delete_content,
            open_game_folder,
            get_accounts,
            add_account,
            select_account,
            delete_account,
            start_log_stream,
            get_installation_summary,
            get_launch_log,
            detect_java_versions,
            get_recommended_java,
            check_for_updates,
            show_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
