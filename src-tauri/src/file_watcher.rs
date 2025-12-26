use notify_debouncer_full::{new_debouncer, notify::*, DebounceEventResult};
use std::path::PathBuf;
use std::time::Duration;
use tauri::{App, Manager};

pub fn setup_file_watcher(app: &App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.app_handle();

    // Get repository root
    let current = std::env::current_dir()?;
    let repo_root = if current.file_name().and_then(|n| n.to_str()) == Some("src-tauri") {
        current.parent()
            .and_then(|p| p.parent())
            .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "Could not find repository root"))?
            .to_path_buf()
    } else if current.file_name().and_then(|n| n.to_str()) == Some("startup-strategy-app") {
        current.parent()
            .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "Could not find parent directory"))?
            .to_path_buf()
    } else {
        // Production Mode: Use User Documents
        let user_dirs = directories::UserDirs::new()
            .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "Could not find user directories"))?;
        
        let doc_dir = user_dirs.document_dir()
            .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "Could not find Documents directory"))?;
            
        doc_dir.join("KnowledgeCompanion")
    };

    eprintln!("Setting up file watcher for: {:?}", repo_root);

    // Folders to watch
    let folders = vec!["research", "dumps", "developer-reference", "ai-agents", "collections"];
    let watch_paths: Vec<PathBuf> = folders
        .iter()
        .map(|f| repo_root.join(f))
        .filter(|p| p.exists())
        .collect();

    if watch_paths.is_empty() {
        eprintln!("Warning: No content folders found to watch");
        return Ok(());
    }

    // Clone app_handle for use in the closure
    let app_handle_clone = app_handle.clone();

    // Create debouncer with 2 second delay
    let mut debouncer = new_debouncer(
        Duration::from_secs(2),
        None,
        move |result: DebounceEventResult| {
            match result {
                Ok(events) => {
                    for event in events {
                        // Only emit for markdown files
                        if let Some(path) = event.paths.first() {
                            if path.extension().and_then(|e| e.to_str()) == Some("md") {
                                eprintln!("File change detected: {:?}", path);
                                // Emit event to frontend
                                let _ = app_handle_clone.emit_all("content-changed", ());
                            }
                        }
                    }
                }
                Err(e) => eprintln!("File watcher error: {:?}", e),
            }
        },
    )?;

    // Watch all content directories
    for path in watch_paths {
        eprintln!("Watching: {:?}", path);
        debouncer.watcher().watch(&path, RecursiveMode::Recursive)?;
    }

    // Keep watcher alive by moving it into app state
    app_handle.manage(debouncer);

    Ok(())
}
