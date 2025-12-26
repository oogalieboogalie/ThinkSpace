use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;
use rusqlite::{params, Connection, Result as SqlResult};

// ==================== Data Structures ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct ContentItem {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub item_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<ContentItem>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub snippet: String,
    pub matches: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Progress {
    pub guides_read: i32,
    pub total_guides: i32,
    pub questions_asked: i32,
    pub images_generated: i32,
    pub hours_learned: f64,
    pub streak: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

// ==================== Database Functions ====================

pub fn init_kc_database(db_path: &Path) -> SqlResult<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY,
            guides_read INTEGER DEFAULT 0,
            questions_asked INTEGER DEFAULT 0,
            images_generated INTEGER DEFAULT 0,
            hours_learned REAL DEFAULT 0.0,
            streak INTEGER DEFAULT 0,
            last_active TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS read_guides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            read_at TEXT NOT NULL
        )",
        [],
    )?;

    // Initialize progress row if it doesn't exist
    conn.execute(
        "INSERT OR IGNORE INTO progress (id, guides_read) VALUES (1, 0)",
        [],
    )?;

    Ok(conn)
}

fn get_db_connection() -> SqlResult<Connection> {
    let app_data = tauri::api::path::data_dir()
        .ok_or_else(|| rusqlite::Error::InvalidPath("Could not find app data dir".into()))?;

    let db_path = app_data.join("knowledge_companion.db");
    Connection::open(db_path)
}

// ==================== Content Management ====================

fn get_knowledge_base_path() -> Result<std::path::PathBuf, String> {
    let current = std::env::current_dir().map_err(|e| e.to_string())?;

    // 1. Check for Dev Environment
    if current.file_name().and_then(|n| n.to_str()) == Some("src-tauri") {
        return current.parent()
            .and_then(|p| p.parent())
            .ok_or("Could not find repository root from src-tauri".to_string())
            .map(|p| p.to_path_buf());
    } else if current.file_name().and_then(|n| n.to_str()) == Some("startup-strategy-app") {
        return current.parent()
            .ok_or("Could not find parent directory".to_string())
            .map(|p| p.to_path_buf());
    }

    // 2. Production Mode: Use User Documents
    let user_dirs = directories::UserDirs::new()
        .ok_or("Could not find user directories".to_string())?;
    
    let doc_dir = user_dirs.document_dir()
        .ok_or("Could not find Documents directory".to_string())?;
        
    let kb_root = doc_dir.join("KnowledgeCompanion");

    // 3. Ensure structure exists
    let folders = vec!["research", "dumps", "developer-reference", "ai-agents", "collections", "generated-guides"];
    for folder in folders {
        let p = kb_root.join(folder);
        if !p.exists() {
            let _ = std::fs::create_dir_all(&p);
        }
    }

    Ok(kb_root)
}

#[tauri::command]
pub async fn get_content_structure() -> Result<Vec<ContentItem>, String> {
    // Get the knowledge base root
    let repo_root = get_knowledge_base_path()?;

    eprintln!("Repo root: {:?}", repo_root);
    eprintln!("Research exists: {}", repo_root.join("research").exists());

    let mut structure = Vec::new();

    // Add main content folders
    let folders = vec!["research", "dumps", "developer-reference", "ai-agents", "collections", "generated-guides"];

    for folder in folders {
        let folder_path = repo_root.join(folder);
        if folder_path.exists() {
            let item = build_content_tree(&folder_path, folder)?;
            structure.push(item);
        }
    }

    Ok(structure)
}

fn build_content_tree(path: &Path, name: &str) -> Result<ContentItem, String> {
    if path.is_file() {
        return Ok(ContentItem {
            name: name.to_string(),
            path: path.to_string_lossy().to_string(),
            item_type: "file".to_string(),
            children: None,
        });
    }

    let mut children = Vec::new();

    for entry in std::fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let entry_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and directories
        if entry_name.starts_with('.') {
            continue;
        }

        // Only include markdown files
        if entry_path.is_file() && !entry_name.ends_with(".md") {
            continue;
        }

        children.push(build_content_tree(&entry_path, &entry_name)?);
    }

    // Sort: directories first, then files
    children.sort_by(|a, b| {
        match (&a.item_type == "directory", &b.item_type == "directory") {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });

    Ok(ContentItem {
        name: name.to_string(),
        path: path.to_string_lossy().to_string(),
        item_type: "directory".to_string(),
        children: Some(children),
    })
}

#[tauri::command]
pub async fn read_markdown_file(path: String) -> Result<String, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(content)
}

#[tauri::command]
pub async fn save_markdown_file(path: String, content: String) -> Result<(), String> {
    // Get the knowledge base root
    let repo_root = get_knowledge_base_path()?;

    let full_path = repo_root.join(&path);

    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(full_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn search_content(query: String) -> Result<Vec<SearchResult>, String> {
    let mut repo_root = get_knowledge_base_path()?;

    if !repo_root.join("research").exists() {
        // Fallback or just log warning
        eprintln!("Warning: research folder not found in {:?}", repo_root);
    }

    let mut results = Vec::new();
    let query_lower = query.to_lowercase();

    for entry in WalkDir::new(&repo_root)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        if !path.is_file() || !path.extension().map(|e| e == "md").unwrap_or(false) {
            continue;
        }

        if let Ok(content) = std::fs::read_to_string(path) {
            let content_lower = content.to_lowercase();

            if content_lower.contains(&query_lower) {
                let title = path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("Unknown")
                    .to_string();

                // Extract snippet around first match
                let match_pos = content_lower.find(&query_lower).unwrap_or(0);
                let snippet_start = match_pos.saturating_sub(50);
                let snippet_end = (match_pos + query.len() + 100).min(content.len());
                let snippet = content[snippet_start..snippet_end].to_string();

                // Count matches
                let matches = content_lower.matches(&query_lower).count();

                results.push(SearchResult {
                    path: path.to_string_lossy().to_string(),
                    title,
                    snippet,
                    matches,
                });
            }
        }
    }

    // Sort by number of matches
    results.sort_by(|a, b| b.matches.cmp(&a.matches));

    // Limit to top 20 results
    results.truncate(20);

    Ok(results)
}

// ==================== MiniMax API Integration ====================

#[tauri::command]
pub async fn chat_with_minimax(
    api_key: String,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // Define tools for filesystem access
    let tools = serde_json::json!([
        {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read the contents of a markdown file from the knowledge base",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "The file path to read (e.g., 'research/AI/agents.md')"
                        }
                    },
                    "required": ["path"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_files",
                "description": "Search for content in markdown files",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query"
                        }
                    },
                    "required": ["query"]
                }
            }
        }
    ]);

    let mut payload = serde_json::json!({
        "model": "MiniMax-M2",
        "messages": messages,
        "tools": tools,
        "max_tokens": 4096,
    });

    eprintln!("Sending request to MiniMax API (OpenAI format)");

    let response = client
        .post("https://api.minimax.io/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API error: {}", error_text));
    }

    let result: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    eprintln!("MiniMax response: {}", serde_json::to_string_pretty(&result).unwrap_or_default());

    // Parse OpenAI-format response
    let message = result["choices"][0]["message"].as_object()
        .ok_or("Invalid response format: missing choices[0].message")?;

    // Check for tool calls
    if let Some(tool_calls) = message.get("tool_calls").and_then(|tc| tc.as_array()) {
        if !tool_calls.is_empty() {
            eprintln!("AI wants to call {} tool(s)", tool_calls.len());

            // Execute tools and collect results
            let mut tool_messages: Vec<ChatMessage> = messages.clone();

            // Add assistant message with tool calls
            tool_messages.push(ChatMessage {
                role: "assistant".to_string(),
                content: message.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string(),
            });

            // Execute each tool
            for call in tool_calls {
                let func = call["function"].as_object()
                    .ok_or("Invalid tool call format")?;
                let name = func.get("name").and_then(|n| n.as_str())
                    .ok_or("Missing function name")?;
                let args_str = func.get("arguments").and_then(|a| a.as_str())
                    .ok_or("Missing function arguments")?;
                let args: serde_json::Value = serde_json::from_str(args_str)
                    .map_err(|e| format!("Failed to parse tool arguments: {}", e))?;

                eprintln!("Executing tool: {} with args: {}", name, args);

                let result = match name {
                    "read_file" => {
                        let path = args["path"].as_str().ok_or("Missing path argument")?;
                        read_markdown_file(path.to_string()).await
                            .unwrap_or_else(|e| format!("Error reading file: {}", e))
                    },
                    "search_files" => {
                        let query = args["query"].as_str().ok_or("Missing query argument")?;
                        match search_content(query.to_string()).await {
                            Ok(results) => serde_json::to_string_pretty(&results)
                                .unwrap_or_else(|_| "Failed to serialize results".to_string()),
                            Err(e) => format!("Search error: {}", e)
                        }
                    },
                    _ => format!("Unknown tool: {}", name)
                };

                tool_messages.push(ChatMessage {
                    role: "tool".to_string(),
                    content: format!("Tool '{}' result:\n{}", name, result),
                });
            }

            // Make another API call with tool results
            payload["messages"] = serde_json::to_value(&tool_messages)
                .map_err(|e| format!("Failed to serialize messages: {}", e))?;
            // Remove tools from second call
            payload.as_object_mut().unwrap().remove("tools");

            let response2 = client
                .post("https://api.minimax.io/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let result2: serde_json::Value = response2.json().await
                .map_err(|e| format!("Failed to parse response: {}", e))?;

            let content = result2["choices"][0]["message"]["content"]
                .as_str()
                .ok_or("Missing content in response")?;

            // Update progress
            if let Ok(conn) = get_db_connection() {
                let _ = conn.execute(
                    "UPDATE progress SET questions_asked = questions_asked + 1 WHERE id = 1",
                    [],
                );
            }

            return Ok(content.to_string());
        }
    }

    // No tool calls - just return the content
    let content = message.get("content")
        .and_then(|c| c.as_str())
        .ok_or("Missing content in response")?;

    // Update progress
    if let Ok(conn) = get_db_connection() {
        let _ = conn.execute(
            "UPDATE progress SET questions_asked = questions_asked + 1 WHERE id = 1",
            [],
        );
    }

    Ok(content.to_string())
}

#[tauri::command]
pub async fn generate_image_minimax(
    api_key: String,
    prompt: String,
    aspect_ratio: Option<String>,
    n: Option<u32>,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    // Build payload with optional parameters
    let mut payload = serde_json::json!({
        "model": "image-01",
        "prompt": prompt,
        "response_format": "url",
    });

    // Add aspect_ratio if provided
    if let Some(ar) = aspect_ratio {
        payload["aspect_ratio"] = serde_json::Value::String(ar);
    }

    // Add n (number of images) if provided
    if let Some(count) = n {
        payload["n"] = serde_json::Value::Number(serde_json::Number::from(count));
    }

    let payload = payload;

    eprintln!("Sending image generation request to MiniMax API");
    eprintln!("Payload: {}", serde_json::to_string_pretty(&payload).unwrap_or_default());

    // Try .io domain first (same as chat), fall back to .com if needed
    let endpoints = vec![
        "https://api.minimax.io/v1/image_generation",
        "https://api.minimaxi.com/v1/image_generation",
    ];

    let mut last_error = String::new();
    let mut response = None;

    for endpoint in &endpoints {
        eprintln!("Trying endpoint: {}", endpoint);
        match client
            .post(*endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
        {
            Ok(resp) => {
                response = Some(resp);
                break;
            }
            Err(e) => {
                last_error = format!("Endpoint {} failed: {}", endpoint, e);
                eprintln!("{}", last_error);
                continue;
            }
        }
    }

    let response = response.ok_or(format!("All endpoints failed. Last error: {}", last_error))?;

    let status = response.status();
    eprintln!("Response status: {}", status);

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        eprintln!("API error response: {}", error_text);
        return Err(format!("API error ({}): {}", status, error_text));
    }

    let result: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    eprintln!("Image generation response: {}", serde_json::to_string_pretty(&result).unwrap_or_default());

    // Parse new response format: { "data": { "image_urls": ["url1", "url2"] }, ... }
    let image_urls = result["data"]["image_urls"]
        .as_array()
        .ok_or_else(|| format!("Failed to extract image URLs from response: {}",
            serde_json::to_string(&result).unwrap_or_default()))?;

    eprintln!("Successfully generated {} images", image_urls.len());

    // Update progress
    if let Ok(conn) = get_db_connection() {
        let _ = conn.execute(
            "UPDATE progress SET images_generated = images_generated + ? WHERE id = 1",
            params![image_urls.len() as i32],
        );
    }

    // Return single URL or array of URLs based on count
    if image_urls.len() == 1 {
        Ok(image_urls[0].as_str().unwrap_or("").to_string())
    } else {
        serde_json::to_string(&image_urls)
            .map_err(|e| format!("Failed to serialize image URLs: {}", e))
    }
}

// ==================== Progress Tracking ====================

#[tauri::command]
pub async fn get_progress() -> Result<Progress, String> {
    let conn = get_db_connection().map_err(|e| e.to_string())?;

    let progress: Progress = conn.query_row(
        "SELECT guides_read, questions_asked, images_generated, hours_learned, streak FROM progress WHERE id = 1",
        [],
        |row| {
            Ok(Progress {
                guides_read: row.get(0)?,
                total_guides: 259,
                questions_asked: row.get(1)?,
                images_generated: row.get(2)?,
                hours_learned: row.get(3)?,
                streak: row.get(4)?,
            })
        },
    ).map_err(|e| e.to_string())?;

    Ok(progress)
}

#[tauri::command]
pub async fn mark_guide_read(path: String) -> Result<(), String> {
    let conn = get_db_connection().map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT OR IGNORE INTO read_guides (path, read_at) VALUES (?1, ?2)",
        params![path, now],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE progress SET guides_read = (SELECT COUNT(*) FROM read_guides) WHERE id = 1",
        [],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== Utilities ====================

#[tauri::command]
pub async fn download_image(url: String, filename: String) -> Result<(), String> {
    let client = reqwest::Client::new();

    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download image: {}", e))?;

    let bytes = response.bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {}", e))?;

    let downloads_dir = tauri::api::path::download_dir()
        .ok_or("Could not find downloads directory")?;

    let file_path = downloads_dir.join(filename);

    std::fs::write(file_path, bytes).map_err(|e| e.to_string())?;

    Ok(())
}
