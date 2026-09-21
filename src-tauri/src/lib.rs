// RagsMC Launcher - backend Tauri
mod minecraft;
mod skin_manager;
mod skin_server;

use tauri::Manager;
use minecraft::{
    add_account, backup_instance, cancel_install, check_connectivity, check_for_updates, delete_account,
    delete_content, delete_installation, detect_java_versions, download_java_runtime, get_accounts, get_installations,
    get_installation_summary, get_launch_log, get_minecraft_versions, get_recommended_java,
    get_service_status, get_total_memory_gb,
    install_curseforge_mod, install_mod, launch_minecraft, list_backups, list_mods, list_resource_packs, list_runtimes, list_shaders,
    open_backups_folder, open_game_folder, read_instance_log, restore_backup, save_installation,
    search_curseforge_mods, search_mods, select_account, setup_mesa, start_log_stream, toggle_content,
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

// ---------------------------------------------------------------------------
// Skins offline: comandos Tauri (delegan en skin_manager / skin_server)
// ---------------------------------------------------------------------------

fn decode_data_url(s: &str) -> Result<Vec<u8>, String> {
    let b64 = s.split_once(',').map(|(_, rest)| rest).unwrap_or(s);
    use base64::Engine as _;
    base64::engine::general_purpose::STANDARD
        .decode(b64.trim())
        .map_err(|e| format!("Base64 inválido: {}", e))
}

/// game_dir vacío => raíz .minecraft (mismo criterio que el motor Java).
fn skin_game_dir(game_dir: &str) -> Result<std::path::PathBuf, String> {
    if game_dir.trim().is_empty() {
        minecraft::data_root()
    } else {
        Ok(std::path::PathBuf::from(game_dir))
    }
}

#[tauri::command]
fn skin_list(game_dir: String) -> Result<Vec<skin_manager::SkinEntry>, String> {
    Ok(skin_manager::list_skins(&skin_game_dir(&game_dir)?))
}

#[tauri::command]
fn skin_upload(
    game_dir: String,
    name: String,
    model: String,
    data_url: String,
) -> Result<skin_manager::SkinEntry, String> {
    let bytes = decode_data_url(&data_url)?;
    skin_manager::upload_skin_bytes(&skin_game_dir(&game_dir)?, &name, &model, &bytes)
}

#[tauri::command]
fn skin_delete(game_dir: String, uuid: String) -> Result<(), String> {
    skin_manager::delete_skin(&skin_game_dir(&game_dir)?, &uuid)
}

#[tauri::command]
fn skin_set_active(game_dir: String, uuid: String) -> Result<(), String> {
    skin_manager::set_active_skin(&skin_game_dir(&game_dir)?, &uuid)
}

#[tauri::command]
fn skin_get_active(game_dir: String) -> Result<Option<skin_manager::SkinEntry>, String> {
    Ok(skin_manager::get_active_skin(&skin_game_dir(&game_dir)?))
}

#[tauri::command]
fn skin_server_port(state: tauri::State<'_, skin_server::SkinServerState>) -> Result<u16, String> {
    if state.port == 0 {
        return Err("OfflineSkinServer no disponible.".to_string());
    }
    Ok(state.port)
}

#[tauri::command]
fn skin_get_url(
    state: tauri::State<'_, skin_server::SkinServerState>,
    game_dir: String,
    uuid: String,
) -> Result<String, String> {
    if state.port == 0 {
        return Err("OfflineSkinServer no disponible.".to_string());
    }
    if !skin_manager::is_safe_uuid(&uuid) {
        return Err("UUID de skin inválido.".to_string());
    }
    let dir = skin_game_dir(&game_dir)?;
    if !skin_manager::skin_png_path(&dir, &uuid).is_file() {
        return Err("Esa skin no existe en disco.".to_string());
    }
    Ok(format!("http://localhost:{}/skins/{}.png", state.port, uuid))
}

/// Devuelve el PNG como data URL (evita CORS en el webview para thumbs/visor).
#[tauri::command]
fn skin_get_data_url(game_dir: String, uuid: String) -> Result<String, String> {
    if !skin_manager::is_safe_uuid(&uuid) {
        return Err("UUID de skin inválido.".to_string());
    }
    let dir = skin_game_dir(&game_dir)?;
    let bytes = std::fs::read(skin_manager::skin_png_path(&dir, &uuid))
        .map_err(|_| "Esa skin no existe en disco.".to_string())?;
    use base64::Engine as _;
    Ok(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&bytes)
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // OfflineSkinServer: puerto aleatorio, hilo separado, muere con el proceso.
            let game_dir = minecraft::data_root()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let port = skin_server::start_offline_skin_server(game_dir).unwrap_or_else(|e| {
                eprintln!("[RagsMC] OfflineSkinServer no disponible: {}", e);
                0
            });
            app.manage(skin_server::SkinServerState { port });
            Ok(())
        })
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
            search_curseforge_mods,
            install_mod,
            install_curseforge_mod,
            check_connectivity,
            backup_instance,
            list_backups,
            restore_backup,
            read_instance_log,
            list_mods,
            list_shaders,
            list_resource_packs,
            toggle_content,
            delete_content,
            open_game_folder,
            open_backups_folder,
            get_accounts,
            add_account,
            select_account,
            delete_account,
            start_log_stream,
            get_installation_summary,
            get_launch_log,
            detect_java_versions,
            download_java_runtime,
            list_runtimes,
            setup_mesa,
            get_recommended_java,
            check_for_updates,
            show_main_window,
            skin_list,
            skin_upload,
            skin_delete,
            skin_set_active,
            skin_get_active,
            skin_server_port,
            skin_get_url,
            skin_get_data_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}