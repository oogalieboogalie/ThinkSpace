use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub file_type: String, // "file" or "directory"
    pub children: Option<Vec<FileNode>>,
    pub size: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectMap {
    pub root_path: String,
    pub structure: FileNode,
    pub file_count: usize,
    pub total_size: u64,
}

const IGNORE_DIRS: &[&str] = &[
    "target", "node_modules", ".git", ".vscode", "dist", "build", ".gemini"
];

const IGNORE_EXTENSIONS: &[&str] = &[
    "lock", "log", "png", "jpg", "jpeg", "gif", "ico", "svg", "woff", "woff2", "ttf", "eot", "mp4", "webm", "mp3", "wav", "ogg", "db", "sqlite", "sqlite3"
];

fn is_ignored(entry: &walkdir::DirEntry) -> bool {
    let path = entry.path();
    
    // Check directories
    if entry.file_type().is_dir() {
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if IGNORE_DIRS.contains(&name) {
                return true;
            }
        }
    }

    // Check extensions
    if entry.file_type().is_file() {
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if IGNORE_EXTENSIONS.contains(&ext) {
                return true;
            }
        }
    }

    false
}

fn build_file_tree(path: &Path, depth: usize, max_depth: usize) -> Option<FileNode> {
    if depth > max_depth {
        return None;
    }

    let name = path.file_name()?.to_string_lossy().to_string();
    let path_str = path.to_string_lossy().to_string();
    let is_dir = path.is_dir();

    if is_dir {
        // Check if ignored directory
        if IGNORE_DIRS.iter().any(|&d| name == d) {
            return None;
        }

        let mut children = Vec::new();
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let child_path = entry.path();
                
                // Skip hidden files/dirs starting with . (except specific ones if needed, but general rule is good)
                if child_path.file_name().and_then(|n| n.to_str()).map(|s| s.starts_with('.') && s != ".env").unwrap_or(false) {
                    continue;
                }

                if let Some(node) = build_file_tree(&child_path, depth + 1, max_depth) {
                    children.push(node);
                }
            }
        }

        // Sort children: directories first, then files
        children.sort_by(|a, b| {
            let a_is_dir = a.file_type == "directory";
            let b_is_dir = b.file_type == "directory";
            if a_is_dir == b_is_dir {
                a.name.cmp(&b.name)
            } else {
                b_is_dir.cmp(&a_is_dir)
            }
        });

        Some(FileNode {
            name,
            path: path_str,
            file_type: "directory".to_string(),
            children: Some(children),
            size: None,
        })
    } else {
        // Check extension
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            if IGNORE_EXTENSIONS.contains(&ext) {
                return None;
            }
        }

        let size = fs::metadata(path).ok().map(|m| m.len());

        Some(FileNode {
            name,
            path: path_str,
            file_type: "file".to_string(),
            children: None,
            size,
        })
    }
}

#[tauri::command]
pub async fn scan_codebase(app_handle: tauri::AppHandle, max_depth: Option<usize>) -> Result<ProjectMap, String> {
    let app_dir = app_handle.path_resolver().app_dir().ok_or("Failed to resolve app dir")?;
    // We want the project root, which is likely up a few levels from app_dir in dev, 
    // but for this specific app structure, let's assume we scan the current working directory or a specific target.
    // For safety and relevance, let's scan the current directory where the app is running (project root).
    
    let root_path = std::env::current_dir().map_err(|e| e.to_string())?;
    let depth = max_depth.unwrap_or(5);

    eprintln!("🔍 Scanning codebase at: {:?} (depth: {})", root_path, depth);

    let structure = build_file_tree(&root_path, 0, depth)
        .ok_or("Failed to build file tree")?;

    // Calculate stats
    let mut file_count = 0;
    let mut total_size = 0;

    // Simple recursive closure to count
    fn count_stats(node: &FileNode, count: &mut usize, size: &mut u64) {
        if node.file_type == "file" {
            *count += 1;
            *size += node.size.unwrap_or(0);
        }
        if let Some(children) = &node.children {
            for child in children {
                count_stats(child, count, size);
            }
        }
    }

    count_stats(&structure, &mut file_count, &mut total_size);

    Ok(ProjectMap {
        root_path: root_path.to_string_lossy().to_string(),
        structure,
        file_count,
        total_size,
    })
}
