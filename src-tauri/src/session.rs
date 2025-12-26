use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct VisualData {
    pub type_: String, // "threejs", "url", etc.
    pub content: String, // Code or URL
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionData {
    pub name: String,
    pub timestamp: String,
    pub chat: Option<serde_json::Value>, // Store raw JSON of messages
    pub main_canvas: Option<String>,
    pub left_canvas: Option<String>,
    pub visuals: Option<VisualData>,
}

#[command]
pub fn save_session(app_handle: tauri::AppHandle, data: SessionData) -> Result<String, String> {
    let app_dir = app_handle.path_resolver().app_data_dir().ok_or("Failed to get app data dir")?;
    let sessions_dir = app_dir.join("sessions");

    if !sessions_dir.exists() {
        fs::create_dir_all(&sessions_dir).map_err(|e| e.to_string())?;
    }

    // Sanitize filename
    let safe_name = data.name.replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
    let filename = format!("{}.json", safe_name);
    let file_path = sessions_dir.join(&filename);

    let json = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    fs::write(&file_path, json).map_err(|e| e.to_string())?;

    Ok(format!("Session saved to {}", file_path.display()))
}

#[command]
pub fn load_session(app_handle: tauri::AppHandle, name: String) -> Result<SessionData, String> {
    let app_dir = app_handle.path_resolver().app_data_dir().ok_or("Failed to get app data dir")?;
    let sessions_dir = app_dir.join("sessions");
    
    // Sanitize filename just in case, though usually we'd pass the full filename or safe name
    let safe_name = name.replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
    // Try with and without extension
    let mut file_path = sessions_dir.join(&safe_name);
    if !file_path.exists() {
        file_path = sessions_dir.join(format!("{}.json", safe_name));
    }

    if !file_path.exists() {
        return Err(format!("Session file not found: {}", name));
    }

    let json = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let data: SessionData = serde_json::from_str(&json).map_err(|e| e.to_string())?;

    Ok(data)
}

#[command]
pub fn list_sessions(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_dir = app_handle.path_resolver().app_data_dir().ok_or("Failed to get app data dir")?;
    let sessions_dir = app_dir.join("sessions");

    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }

    let mut sessions = Vec::new();
    for entry in fs::read_dir(sessions_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                sessions.push(stem.to_string());
            }
        }
    }

    Ok(sessions)
}
