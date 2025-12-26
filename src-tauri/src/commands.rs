// Tauri commands for repository exploration and AI integration

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

use crate::repo_indexer::{RepoIndex, FileInfo};
use crate::ai_provider::{AIService, AIProvider, ChatContext, select_relevant_files};

pub mod orchestrate_agents;

// Global state for the current repository index
pub struct AppState {
    pub repo_index: Mutex<Option<RepoIndex>>,
    pub ai_service: Mutex<Option<AIService>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            repo_index: Mutex::new(None),
            ai_service: Mutex::new(None),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IndexProgress {
    pub total_files: usize,
    pub total_size: u64,
    pub indexed: bool,
}

// Initialize AI provider with API key
#[tauri::command]
pub async fn init_ai_provider(
    provider: AIProvider,
    api_key: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let service = AIService::new(provider.clone(), api_key)
        .await
        .map_err(|e| e.to_string())?;

    let mut ai_service = state.ai_service.lock().unwrap();
    *ai_service = Some(service);

    Ok(format!("AI provider {:?} initialized successfully", provider))
}

// Index a repository directory
#[tauri::command]
pub async fn index_repository(
    repo_path: String,
    state: State<'_, AppState>,
) -> Result<IndexProgress, String> {
    let path = PathBuf::from(&repo_path);

    if !path.exists() || !path.is_dir() {
        return Err(format!("Invalid repository path: {}", repo_path));
    }

    // Index the repository
    let index = RepoIndex::index_directory(&path)
        .map_err(|e| format!("Failed to index repository: {}", e))?;

    let progress = IndexProgress {
        total_files: index.total_files,
        total_size: index.total_size,
        indexed: true,
    };

    // Store the index in state
    let mut repo_index = state.repo_index.lock().unwrap();
    *repo_index = Some(index);

    Ok(progress)
}

// Get the list of files in the current repository
#[tauri::command]
pub async fn get_repo_files(
    state: State<'_, AppState>,
) -> Result<Vec<FileInfo>, String> {
    let repo_index = state.repo_index.lock().unwrap();

    match &*repo_index {
        Some(index) => Ok(index.files.clone()),
        None => Err("No repository indexed".to_string()),
    }
}

// Search for files matching a query
#[tauri::command]
pub async fn search_files(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileInfo>, String> {
    let repo_index = state.repo_index.lock().unwrap();

    match &*repo_index {
        Some(index) => {
            let results = index.search_files(&query)
                .into_iter()
                .cloned()
                .collect();
            Ok(results)
        },
        None => Err("No repository indexed".to_string()),
    }
}

// Read file content
#[tauri::command]
pub async fn read_file(
    file_path: String,
) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    RepoIndex::read_file_content(&path)
        .map_err(|e| e.to_string())
}

// Ask AI a question about the repository
#[tauri::command]
pub async fn ask_ai_question(
    question: String,
    max_context_files: Option<usize>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let max_files = max_context_files.unwrap_or(5);

    // Build context with locks held briefly
    let context = {
        // Get repo index
        let repo_index_guard = state.repo_index.lock().unwrap();
        let repo_index = repo_index_guard.as_ref()
            .ok_or("No repository indexed. Please select a repository first.")?;

        // Select relevant files based on the question
        let relevant_file_paths = select_relevant_files(
            &question,
            &repo_index.files,
            max_files,
        );

        // Read contents of relevant files
        let mut file_contents = Vec::new();
        for path_str in &relevant_file_paths {
            if let Some(file_info) = repo_index.files.iter().find(|f| &f.relative_path == path_str) {
                if let Ok(content) = RepoIndex::read_file_content(&file_info.path) {
                    // Limit content size to avoid huge context
                    let limited_content = if content.len() > 50_000 {
                        format!("{}...\n[Content truncated - file too large]", &content[..50_000])
                    } else {
                        content
                    };
                    file_contents.push((path_str.clone(), limited_content));
                }
            }
        }

        // Build context
        ChatContext {
            repo_files: repo_index.files.iter()
                .take(100)  // Just show first 100 files in file list
                .map(|f| f.relative_path.clone())
                .collect(),
            file_contents,
        }
    }; // Drop repo_index_guard here

    // Clone the AI service for async call
    let ai_service = {
        let ai_service_guard = state.ai_service.lock().unwrap();
        ai_service_guard.as_ref()
            .ok_or("AI provider not initialized. Please set up your API key first.")?
            .clone()
    }; // Drop ai_service_guard here

    // Ask the question (no locks held during await)
    let response = ai_service.ask_question(&question, &context)
        .await
        .map_err(|e| format!("AI request failed: {}", e))?;

    Ok(response)
}
