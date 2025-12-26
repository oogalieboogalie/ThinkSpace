/// Enhanced MiniMax M2 API Integration with Agent Loop
///
/// This module implements the COMPLETE chat agent pattern from minimax-m2-complete-chat-example.py
/// with proper thinking preservation, tool calling, and agent loop.
///
/// CRITICAL: This preserves <think> tags in conversation history.
/// Removing thinking content causes 3-40% performance degradation!

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::tkg;
use crate::commands::orchestrate_agents;
use crate::deep_research::DeepResearchAgent;
use std::path::PathBuf;
use walkdir::WalkDir;
use regex::Regex;
use tauri::Manager;
use futures_util::stream::StreamExt;
use chrono::TimeZone;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AppMode {
    Developer,
    Student,
}

impl AppMode {
    fn current() -> Self {
        #[cfg(feature = "student")]
        {
            return AppMode::Student;
        }

        #[cfg(not(feature = "student"))]
        {
            match std::env::var("KNOWLEDGE_COMPANION_MODE").ok().as_deref() {
                Some("student") => AppMode::Student,
                _ => AppMode::Developer,
            }
        }
    }

    fn allowed_write_prefixes(self) -> &'static [&'static str] {
        match self {
            AppMode::Student => &["research", "generated-guides"],
            AppMode::Developer => &[],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AIProvider {
    Minimax,
    Grok,
    Gemini,
}

impl AIProvider {
    pub fn base_url(&self) -> &'static str {
        match self {
            AIProvider::Minimax => "https://api.minimax.io/v1",
            AIProvider::Grok => "https://api.x.ai/v1",
            AIProvider::Gemini => "https://generativelanguage.googleapis.com/v1beta",
        }
    }

    pub fn model_name(&self) -> &'static str {
        match self {
            AIProvider::Minimax => "MiniMax-M2",
            AIProvider::Grok => "grok-4-1-fast",
            AIProvider::Gemini => "gemini-1.5-flash",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            AIProvider::Minimax => "MiniMax M2",
            AIProvider::Grok => "Grok 4.1",
            AIProvider::Gemini => "Gemini 1.5 Flash",
        }
    }
}

// ==================== Data Structures ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub tool_type: String,
    pub function: FunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    #[serde(rename = "type")]
    pub tool_type: String,
    pub function: ToolFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolFunction {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub thinking: Vec<String>,
    pub tool_calls_made: usize,
    pub iterations: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub content: String,
    pub is_thinking: bool,
    pub done: bool,
    pub tool_calls: Option<Vec<ToolCall>>,
}

// ==================== Agent Loop Implementation ====================

pub struct MinimaxAgent {
    api_key: String,
    base_url: String,
    model: String,
    conversation_history: Vec<Message>,
    system_prompt: String,
    tools: Vec<Tool>,
    tavily_api_key: Option<String>,
    grok_api_key: Option<String>,
    gemini_api_key: Option<String>,
    app_handle: Option<tauri::AppHandle>,
    provider: AIProvider,
    enabled_tools: std::collections::HashMap<String, bool>,
    safe_mode: bool,
    app_mode: AppMode,
    user_id: String,
    user_name: Option<String>,
}

impl MinimaxAgent {
    pub fn new(api_key: String, tavily_api_key: Option<String>, grok_api_key: Option<String>, gemini_api_key: Option<String>) -> Self {
        let app_mode = AppMode::current();
        Self {
            api_key,
            base_url: "https://api.minimax.io/v1".to_string(),
            model: "MiniMax-M2".to_string(),
            conversation_history: Vec::new(),
            system_prompt: Self::default_system_prompt(None),
            tools: Self::register_tools(),
            tavily_api_key,
            grok_api_key,
            gemini_api_key,
            app_handle: None,
            provider: AIProvider::Minimax,
            enabled_tools: std::collections::HashMap::new(),
            safe_mode: app_mode == AppMode::Student, // Student builds default to safe mode
            app_mode,
            user_id: "guest".to_string(),
            user_name: None,
        }
    }

    fn resolve_agents_registry_path(&self) -> Option<PathBuf> {
        if let Some(handle) = &self.app_handle {
            if let Some(app_dir) = handle.path_resolver().app_data_dir() {
                return Some(app_dir.join("startup-strategy").join("agents.json"));
            }
        }

        dirs::config_dir()
            .or_else(|| dirs::data_dir())
            .map(|dir| dir.join("startup-strategy").join("agents.json"))
    }

    fn find_fallback_agents_path(&self) -> Option<PathBuf> {
        let mut candidates = Vec::new();

        if let Some(handle) = &self.app_handle {
            if let Some(resource_path) = handle.path_resolver().resolve_resource("agents.json") {
                candidates.push(resource_path);
            }
            if let Some(resource_dir) = handle.path_resolver().resource_dir() {
                candidates.push(resource_dir.join("agents.json"));
                candidates.push(resource_dir.join("public").join("agents.json"));
                candidates.push(resource_dir.join("dist").join("agents.json"));
            }
        }

        if let Ok(cwd) = std::env::current_dir() {
            candidates.push(cwd.join("public").join("agents.json"));
            candidates.push(cwd.join("src-tauri").join("agents.json"));
            candidates.push(cwd.join("agents.json"));

            if let Some(parent) = cwd.parent() {
                candidates.push(parent.join("public").join("agents.json"));
                candidates.push(parent.join("src-tauri").join("agents.json"));
                candidates.push(parent.join("agents.json"));
            }
        }

        candidates.into_iter().find(|path| path.exists())
    }

    fn load_agents_registry(&self) -> Result<serde_json::Value, String> {
        let agents_path = self
            .resolve_agents_registry_path()
            .ok_or_else(|| "Could not resolve app data directory".to_string())?;

        if agents_path.exists() {
            let content = std::fs::read_to_string(&agents_path)
                .map_err(|e| format!("Failed to read agents.json: {}", e))?;
            return serde_json::from_str::<serde_json::Value>(&content)
                .map_err(|e| format!("Parse error: {}", e));
        }

        let fallback_path = self
            .find_fallback_agents_path()
            .ok_or_else(|| format!("agents.json not found at {:?}", agents_path))?;

        let content = std::fs::read_to_string(&fallback_path)
            .map_err(|e| format!("Failed to read fallback agents file: {}", e))?;
        let data: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse fallback agents file: {}", e))?;

        if let Some(parent) = agents_path.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                eprintln!("WARN: could not create agents dir: {}", e);
            }
        }

        if let Ok(serialized) = serde_json::to_string_pretty(&data) {
            if let Err(e) = std::fs::write(&agents_path, serialized) {
                eprintln!("WARN: could not seed agents registry: {}", e);
            }
        }

        Ok(data)
    }

    fn tool_list_registered_agents(&self, _arguments: &str) -> serde_json::Value {
        let data = match self.load_agents_registry() {
            Ok(data) => data,
            Err(e) => {
                return serde_json::json!({ "success": false, "error": e });
            }
        };

        if let Some(agents) = data.get("agents").and_then(|v| v.as_array()) {
            let simplified: Vec<serde_json::Value> = agents
                .iter()
                .map(|a| {
                    serde_json::json!({
                        "id": a.get("id"),
                        "name": a.get("name"),
                        "role": a.get("role"),
                        "description": a.get("description")
                    })
                })
                .collect();
            serde_json::json!({ "success": true, "agents": simplified })
        } else {
            serde_json::json!({ "success": false, "error": "No agents array in registry" })
        }
    }

    fn tool_invoke_agent(&self, arguments: &str) -> serde_json::Value {
        let args: serde_json::Value = match serde_json::from_str(arguments) {
            Ok(v) => v,
            Err(e) => return serde_json::json!({ "success": false, "error": format!("Invalid arguments: {}", e) }),
        };

        let agent_id = match args.get("agent_id").and_then(|v| v.as_str()) {
            Some(id) => id,
            None => return serde_json::json!({ "success": false, "error": "Missing agent_id" }),
        };

        let data = match self.load_agents_registry() {
            Ok(data) => data,
            Err(e) => return serde_json::json!({ "success": false, "error": e }),
        };

        if let Some(agents) = data.get("agents").and_then(|v| v.as_array()) {
            if let Some(agent) = agents.iter().find(|a| a.get("id").and_then(|v| v.as_str()) == Some(agent_id)) {
                return serde_json::json!({
                    "success": true,
                    "agent_id": agent_id,
                    "system_prompt": agent.get("systemPrompt"),
                    "instructions": "You should now adopt the persona and guidelines of this agent for the next part of the conversation."
                });
            }
        }

        serde_json::json!({ "success": false, "error": format!("Agent with ID '{}' not found", agent_id) })
    }

    pub fn with_user_id(mut self, user_id: String) -> Self {
        self.user_id = user_id;
        self
    }

    pub fn with_user_name(mut self, user_name: Option<String>) -> Self {
        self.user_name = user_name.clone();
        // Regenerate system prompt with user name if available
        if self.provider == AIProvider::Minimax {
             self.system_prompt = Self::default_system_prompt(user_name.clone());
        } else if self.provider == AIProvider::Grok {
             self.system_prompt = Self::grok_dash_system_prompt(user_name);
        }
        self
    }

    pub fn with_safe_mode(mut self, safe_mode: bool) -> Self {
        self.safe_mode = safe_mode;
        self
    }

    pub fn with_provider(mut self, provider: AIProvider) -> Self {
        self.provider = provider.clone();
        self.base_url = provider.base_url().to_string();
        self.model = provider.model_name().to_string();
        
        // Switch system prompt based on provider
        if let AIProvider::Grok = provider {
            self.system_prompt = Self::grok_dash_system_prompt(self.user_name.clone());
        }
        
        self
    }

    pub fn with_app_handle(mut self, app_handle: tauri::AppHandle) -> Self {
        self.app_handle = Some(app_handle);
        self
    }

    pub fn with_enabled_tools(mut self, enabled_tools: std::collections::HashMap<String, bool>) -> Self {
        self.enabled_tools = enabled_tools;
        self
    }

    pub fn with_system_prompt(mut self, system_prompt: String) -> Self {
        self.system_prompt = system_prompt;
        self
    }

    fn get_current_timestamp() -> String {
        chrono::Utc::now()
            .with_timezone(&chrono::FixedOffset::west_opt(5 * 3600).unwrap())
            .format("%Y-%m-%d %H:%M:%S")
            .to_string()
    }

    /// Convert various timestamp formats to the standard string format
    fn convert_timestamp(timestamp: &serde_json::Value) -> Option<String> {
        match timestamp {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Number(n) => {
                // Convert Unix timestamp (milliseconds) to formatted string
                if let Some(ts) = n.as_f64() {
                    let seconds = (ts / 1000.0) as i64;
                    if let Some(datetime) = chrono::Utc.timestamp_opt(seconds, 0).single() {
                        let est = datetime.with_timezone(&chrono::FixedOffset::west_opt(5 * 3600).unwrap());
                        Some(est.format("%Y-%m-%d %H:%M:%S").to_string())
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    fn default_system_prompt(user_name: Option<String>) -> String {
        let current_time = chrono::Utc::now()
            .with_timezone(&chrono::FixedOffset::west_opt(5 * 3600).unwrap())
            .format("%Y-%m-%d %H:%M:%S %Z")
            .to_string();

        let greeting = match user_name {
            Some(name) => format!("You are a helpful AI study guide assistant for {}.", name),
            None => "You are a helpful AI study guide assistant with access to tools.".to_string(),
        };

        format!(r#"{}

CURRENT DATE & TIME: {} (Use this for temporal awareness only. DO NOT output this timestamp in your response.)
1. Use your thinking process (<think> tags) to reason through problems
2. Call tools when you need real-time information or to perform actions
3. Always verify tool results before reporting to the user
4. If a tool fails, try an alternative approach or ask for clarification
5. Be concise but thorough in your responses
6. When creating study guides, be structured and comprehensive
7. Be aware of the current date - provide relevant, up-to-date information
8. Reference dates and times when discussing events or trends
9. **CONSTRUCT COLLABORATION**: You have access to specialized AI agents ("Constructs"). Use the tools to list, consult, or invoke them.
10. **CANVAS CONTROL**: You can control the user's dashboard canvas to display media, 3D visualizations, and content. Use the canvas_update tool—the tool schema shows you the available parameters.

## AI OPERATING MANUAL
{}

Remember: Your internal reasoning is preserved and helps maintain context across the conversation."#, greeting, current_time, include_str!("ai_manual.md"))
    }

    fn grok_dash_system_prompt(user_name: Option<String>) -> String {
        let current_time = chrono::Utc::now()
            .with_timezone(&chrono::FixedOffset::west_opt(5 * 3600).unwrap())
            .format("%Y-%m-%d %H:%M:%S %Z")
            .to_string();

        let name_str = user_name.unwrap_or_else(|| "Alex".to_string());

        format!(r#"You are Genesis, an expert AI assistant integrated into {}'s Dashboard. You MUST write in complete, natural English sentences. NEVER use telegram-style broken English like 'Canvas bug fix: F12 errors - paste.' Instead, write like a native speaker: 'To fix the canvas bug, please open DevTools with F12 and paste any console errors you see.'

CURRENT DATE: {}

## WRITING STYLE (CRITICAL - READ THIS CAREFULLY)

BAD - Never write like this:
- 'Canvas bug. F12 check. Errors?'
- 'Understood. Fix coming.'
- 'Help? Guide/calc/search?'
- 'Calm. Debug. Solve.'

GOOD - Always write like this:
- 'I understand you are having a canvas bug. Could you open DevTools with F12 and let me know what errors you see?'
- 'I understand, and I will work on a fix for you.'
- 'How can I help you? I can create a study guide, perform calculations, or search for information.'
- 'Let us work through this calmly and debug the issue together.'

## INSTRUCTIONS
1. **Complete Sentences Only**: Every response must use full sentences with subjects, verbs, and proper grammar. No fragments.
2. **Be Helpful and Clear**: Provide accurate, high-quality answers with concrete steps.
3. **Construct Collaboration**: You have access to specialized AI agents (Constructs). Use the available tools to list, consult, or invoke them.
4. **Canvas Tools**: Use canvas_update to visualize concepts. The tool schema shows you the available parameters and types.
5. **Tone**: If the user is frustrated, acknowledge it with empathy and then provide clear, actionable help. Do not use profanity or performative hype.
6. **Reasoning**: If the problem is complex, explain your logic step-by-step.

## AI OPERATING MANUAL
{}
"#, name_str, current_time, include_str!("ai_manual.md"))
}

    fn is_forced_disabled_tool(&self, tool_name: &str) -> bool {
        self.app_mode == AppMode::Student
            && matches!(tool_name, "run_terminal_command" | "write_file_batch")
    }

    fn is_allowed_write_path(&self, rel_path: &str) -> bool {
        if self.app_mode != AppMode::Student {
            return true;
        }

        let normalized = rel_path.replace('\\', "/");
        let trimmed = normalized.trim_start_matches("./");

        self.app_mode.allowed_write_prefixes().iter().any(|prefix| {
            trimmed == *prefix
                || (trimmed.starts_with(prefix)
                    && trimmed.as_bytes().get(prefix.len()) == Some(&b'/'))
        })
    }

    /// Filter tools based on enabled_tools configuration
    fn get_enabled_tools(&self) -> Vec<Tool> {
        let base_tools: Vec<Tool> = self.tools
            .iter()
            .filter(|tool| !self.is_forced_disabled_tool(&tool.function.name))
            .cloned()
            .collect();

        if self.enabled_tools.is_empty() {
            return base_tools;
        }

        base_tools
            .into_iter()
            .filter(|tool| {
                let tool_name = &tool.function.name;
                self.enabled_tools
                    .get(tool_name)
                    .copied()
                    .unwrap_or(true) // Default to enabled if not in map
            })
            .collect()
    }

    fn register_tools() -> Vec<Tool> {
        vec![
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "canvas_update".to_string(),
                    description: "Update the dashboard canvas. Use this to show previews, add content blocks, or clear the canvas.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "action": {
                                "type": "string",
                                "enum": ["preview", "add_block", "clear"],
                                "description": "The action to perform"
                            },
                            "target": {
                                "type": "string",
                                "enum": ["main", "left"],
                                "description": "Target canvas (default: main)"
                            },
                            "type": {
                                "type": "string",
                                "description": "Content type (e.g., 'youtube', 'threejs', 'md', 'manifold')"
                            },
                            "content": {
                                "type": "string",
                                "description": "Text content or block content"
                            },
                            "url": {
                                "type": "string",
                                "description": "URL for previews or media"
                            },
                            "code": {
                                "type": "string",
                                "description": "Code for Three.js or Manifold visualizations"
                            },
                            "popup": {
                                "type": "boolean",
                                "description": "Whether to show as a popup"
                            }
                        },
                        "required": ["action"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "calculate".to_string(),
                    description: "Perform mathematical calculations. Supports +, -, *, /, parentheses.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "Mathematical expression to evaluate, e.g., '(15 + 25) * 2'"
                            }
                        },
                        "required": ["expression"]
                    }),

                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "scan_codebase".to_string(),
                    description: "Scan the codebase structure. Lists files and directories to understand project layout. Respects .gitignore patterns.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative path to start scanning from (default: root)"
                            },
                            "max_depth": {
                                "type": "integer",
                                "description": "Maximum depth to traverse (default: 3)"
                            }
                        }
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "read_file".to_string(),
                    description: "Read the complete contents of a markdown file from the knowledge base. Use the path from search_knowledge or list_markdown_files.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative path to the markdown file (e.g., 'research/adhd-database.md')"
                            }
                        },
                        "required": ["path"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "search_knowledge".to_string(),
                    description: "Search the loaded markdown knowledge base for information on a topic. Returns matching files with snippets.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            }
                        },
                        "required": ["query"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "create_study_guide".to_string(),
                    description: "Create a structured study guide from a topic using Grok. Returns a markdown formatted study guide.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string",
                                "description": "The topic to create a study guide for"
                            },
                            "difficulty": {
                                "type": "string",
                                "enum": ["beginner", "intermediate", "advanced"],
                                "description": "Difficulty level"
                            },
                            "include_resources": {
                                "type": "boolean",
                                "description": "Include specific resources and practice exercises (default: true)"
                            }
                        },
                        "required": ["topic", "difficulty"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "list_markdown_files".to_string(),
                    description: "List available markdown files in the knowledge base".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "folder": {
                                "type": "string",
                                "description": "Optional folder to search in (e.g., 'research', 'dumps')"
                            }
                        }
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "web_search".to_string(),
                    description: "Search the web for current information using Tavily search API. Returns top search results with title, snippet, and URL.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query (e.g., 'latest AI news 2025', 'Tauri desktop app tutorial')"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results to return (1-10, default: 5)"
                            }
                        },
                        "required": ["query"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "deep_research".to_string(),
                    description: "Delegates a complex research task to a specialized Deep Research Agent. Use this for broad topics requiring synthesis of multiple sources.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string",
                                "description": "The main research topic or question"
                            },
                            "sub_topics": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                },
                                "description": "Optional list of sub-topics to research in parallel. If provided, multiple agents will be spawned."
                            }
                        },
                        "required": ["topic"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "write_file".to_string(),
                    description: "Write/create a markdown file in the knowledge base. Can create new files or overwrite existing ones.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "Relative path for the file (e.g., 'research/new-guide.md', 'dumps/notes.md')"
                            },
                            "content": {
                                "type": "string",
                                "description": "Content to write to the file"
                            },
                            "append": {
                                "type": "boolean",
                                "description": "If true, append to existing file. If false, overwrite. Default: false"
                            }
                        },
                        "required": ["path", "content"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "display_media".to_string(),
                    description: "Display media (video, image, or website) directly on the user's canvas. Use this after finding a relevant URL via web_search.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "url": {
                                "type": "string",
                                "description": "The URL of the media to display (e.g., YouTube link, image URL)"
                            },
                            "type": {
                                "type": "string",
                                "enum": ["youtube", "image", "url", "html"],
                                "description": "The type of media. Use 'youtube' for videos, 'image' for direct image links, 'url' for websites."
                            }
                        },
                        "required": ["url", "type"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "harvest_wiki".to_string(),
                    description: "Harvests content from the RuneScape (RS3) or Old School RuneScape (OSRS) Wiki. Saves the article as a markdown file in the research folder.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The topic to search for (e.g., 'Herblore', 'Zulrah')"
                            },
                            "wiki": {
                                "type": "string",
                                "enum": ["rs3", "osrs"],
                                "description": "Which Wiki to search (default: 'rs3')"
                            },
                            "mode": {
                                "type": "string",
                                "enum": ["summary", "full"],
                                "description": "Harvest mode: 'summary' (intro only) or 'full' (entire page). Default: 'full'"
                            }
                        },
                        "required": ["query"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "harvest_wiki_category".to_string(),
                    description: "Mass harvest all pages in a specific Wiki category (e.g., 'Quests', 'Herblore'). Saves each page as a separate markdown file.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "category": {
                                "type": "string",
                                "description": "The category name (e.g., 'Quests', 'Farming_training')"
                            },
                            "wiki": {
                                "type": "string",
                                "enum": ["rs3", "osrs"],
                                "description": "Which Wiki to search (default: 'rs3')"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Max pages to harvest (default: 10, max: 50)"
                            }
                        },
                        "required": ["category"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "brainstorm_with_grok".to_string(),
                    description: "Get a second perspective from Grok-4 for brainstorming, creative ideas, or alternative viewpoints. Returns Grok's response to enhance your thinking.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Question or topic to get a second perspective on from Grok"
                            },
                            "context": {
                                "type": "string",
                                "description": "Additional context or background information"
                            }
                        },
                        "required": ["query"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "tkg_search".to_string(),
                    description: "Search the Temporal Knowledge Graph for semantically similar knowledge and memories. Uses vector embeddings to find related information from past conversations and learning.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query to find semantically related knowledge"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results to return (1-20, default: 5)"
                            },
                            "trust_threshold": {
                                "type": "number",
                                "description": "Minimum trust score for results (0.0-1.0, default: 0.5)"
                            }
                        },
                        "required": ["query"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "tkg_store".to_string(),
                    description: "Store important knowledge in the Temporal Knowledge Graph for future semantic search. Preserves memories with embeddings for context-aware retrieval.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The knowledge or memory to store"
                            },
                            "node_type": {
                                "type": "string",
                                "enum": ["FACT", "CONCEPT", "MEMORY", "LEARNING", "INSIGHT", "USER_INPUT", "AI_RESPONSE"],
                                "description": "Type of knowledge node"
                            },
                            "importance": {
                                "type": "number",
                                "description": "Importance score (0.0-1.0)"
                            }
                        },
                        "required": ["content", "node_type"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "claim_legacy_data".to_string(),
                    description: "Migrate past memories/knowledge from 'guest' sessions to the current user. Defaults to dry-run unless explicitly confirmed to prevent accidental destructive migrations.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "dry_run": {
                                "type": "boolean",
                                "description": "If true, only reports how many legacy points would be migrated (default: true)."
                            },
                            "confirm": {
                                "type": "boolean",
                                "description": "Set true to actually perform the migration. If omitted/false, the tool will not modify any data."
                            }
                        },
                        "required": []
                    }),
                },
            },

            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "start_debate".to_string(),
                    description: "Starts a multi-agent debate on a topic. Spawns an Architect and a Critic to discuss and refine a solution. Returns the transcript and final consensus.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string",
                                "description": "The topic or problem to debate"
                            },
                            "turns": {
                                "type": "integer",
                                "description": "Number of debate turns (default: 3)"
                            }
                        },
                        "required": ["topic"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "write_file_batch".to_string(),
                    description: "Writes multiple files to the codebase at once. Use this for creating components, refactoring, or applying multi-file changes.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "path": { "type": "string", "description": "Relative path to file" },
                                        "content": { "type": "string", "description": "File content" }
                                    },
                                    "required": ["path", "content"]
                                },
                                "description": "List of files to write"
                            }
                        },
                        "required": ["files"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "run_terminal_command".to_string(),
                    description: "Executes a terminal command in the repository root. Use for running tests, builds, or git commands.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "command": {
                                "type": "string",
                                "description": "The command to execute (e.g., 'npm test', 'cargo build')"
                            }
                        },
                        "required": ["command"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "list_registered_agents".to_string(),
                    description: "Lists all AI agents (Constructs) registered in the system. Returns their names, roles, and descriptions.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {}
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "invoke_agent".to_string(),
                    description: "Retrieves the specialized system prompt and instructions for a specific registered agent. Use this to adopt the persona or expertise of a Construct.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "agent_id": {
                                "type": "string",
                                "description": "The unique ID of the agent to invoke (e.g., 'curriculum-architect-v1')"
                            }
                        },
                        "required": ["agent_id"]
                    }),
                },
            },
            Tool {
                tool_type: "function".to_string(),
                function: ToolFunction {
                    name: "consult_agent".to_string(),
                    description: "Consult a specialized AI agent for expert input on a problem. Makes a separate API call to the agent and returns their analysis. Use this to get expert perspectives from registered Constructs.".to_string(),
                    parameters: serde_json::json!({
                        "type": "object",
                        "properties": {
                            "agent_id": {
                                "type": "string",
                                "description": "The unique ID of the agent to consult (from list_registered_agents)"
                            },
                            "agent_name": {
                                "type": "string",
                                "description": "The display name of the agent to consult (from list_registered_agents)"
                            },
                            "query": {
                                "type": "string",
                                "description": "The question or problem to consult them about"
                            }
                        },
                        "required": ["query"]
                    }),
                },
            },
        ]
    }


    /// Parse tool calls that are embedded in the assistant message text using
    /// [TOOL]...[/TOOL] or [TOOL_CALL]...[/TOOL_CALL] blocks. Supports both the
    /// legacy MiniMax arrow format and JSON-style payloads (objects, arrays, or concatenated).
    fn parse_text_tool_calls(text: &str, base_call_index: usize) -> Vec<ToolCall> {
        let mut parsed_calls: Vec<ToolCall> = Vec::new();

        // Capture the inner content of any tool block (case-insensitive, multiline)
        let block_regex =
            Regex::new(r"(?is)\[(?:TOOL_CALL|TOOL)\]\s*(.*?)\s*\[/(?:TOOL_CALL|TOOL)\]").unwrap();

        for cap in block_regex.captures_iter(text) {
            let block = cap.get(1).map(|m| m.as_str().trim()).unwrap_or("");
            
            // Try to parse as JSON (supports multiple concatenated objects like "{} {}")
            let mut json_parsed = false;
            let deserializer = serde_json::Deserializer::from_str(block);
            
            for value_result in deserializer.into_iter::<serde_json::Value>() {
                if let Ok(json_value) = value_result {
                    json_parsed = true;
                    
                    // Helper to process a single tool call object
                    let mut process_tool_obj = |obj: &serde_json::Value| {
                        if let Some(name) = obj
                            .get("tool")
                            .or_else(|| obj.get("name"))
                            .or_else(|| obj.get("function").and_then(|f| f.get("name")))
                            .and_then(|n| n.as_str())
                        {
                            let args_val = obj
                                .get("args")
                                .or_else(|| obj.get("arguments"))
                                .or_else(|| obj.get("function").and_then(|f| f.get("arguments")));

                            let arguments = match args_val {
                                Some(val) if val.is_object() || val.is_array() => {
                                    serde_json::to_string(val).unwrap_or_else(|_| "{}".to_string())
                                }
                                Some(serde_json::Value::String(s)) => s.to_string(),
                                Some(val) => val.to_string(),
                                None => "{}".to_string(),
                            };

                            parsed_calls.push(ToolCall {
                                id: format!("call_{}", base_call_index + parsed_calls.len()),
                                tool_type: "function".to_string(),
                                function: FunctionCall {
                                    name: name.to_string(),
                                    arguments,
                                },
                            });
                        }
                    };

                    // Handle both Array of calls and Single call object
                    if let Some(array) = json_value.as_array() {
                        for item in array {
                            process_tool_obj(item);
                        }
                    } else {
                        process_tool_obj(&json_value);
                    }
                } else {
                    // Stop if we hit invalid JSON
                    break;
                }
            }

            // If we successfully parsed at least one JSON object, we assume this block was JSON
            // and don't try legacy parsing.
            if json_parsed {
                continue;
            }

            // Legacy MiniMax format: tool => "name", args => { key => "value" }
            let name_regex =
                Regex::new(r#"(?i)(?:tool|name)\s*(?:=>|:)\s*"([^"]+)""#).unwrap();
            let args_block_regex =
                Regex::new(r#"(?is)(?:args|arguments)\s*(?:=>|:)\s*(\{.*?\})"#).unwrap();

            if let Some(name_caps) = name_regex.captures(block) {
                let tool_name = name_caps.get(1).map(|m| m.as_str()).unwrap_or_default();
                let args_text = args_block_regex
                    .captures(block)
                    .and_then(|c| c.get(1))
                    .map(|m| m.as_str())
                    .unwrap_or("{}");

                let arguments = if let Ok(json_args) =
                    serde_json::from_str::<serde_json::Value>(args_text)
                {
                    serde_json::to_string(&json_args).unwrap_or_else(|_| "{}".to_string())
                } else {
                    // Parse key => "value" pairs into a JSON object string
                    let mut args_map: HashMap<String, String> = HashMap::new();
                    let arg_regex = Regex::new(r#"(\w+)\s*(?:=>|:)\s*"([^"]*)""#).unwrap();
                    for arg_cap in arg_regex.captures_iter(args_text) {
                        if let (Some(key), Some(value)) = (arg_cap.get(1), arg_cap.get(2)) {
                            args_map.insert(key.as_str().to_string(), value.as_str().to_string());
                        }
                    }
                    serde_json::to_string(&args_map).unwrap_or_else(|_| "{}".to_string())
                };

                parsed_calls.push(ToolCall {
                    id: format!("call_{}", base_call_index + parsed_calls.len()),
                    tool_type: "function".to_string(),
                    function: FunctionCall {
                        name: tool_name.to_string(),
                        arguments,
                    },
                });
            }
        }

        // If we found calls using tags, return them
        if !parsed_calls.is_empty() {
            return parsed_calls;
        }

        // FALLBACK: Try to find raw JSON tool calls without tags
        // Look for JSON objects that contain "tool": "name"
        // Since regex is bad at nested braces, we'll use a manual brace counter
        let tool_key_regex = Regex::new(r#""tool"\s*:\s*""#).unwrap();
        
        // Find all potential start positions of JSON objects containing "tool":
        for mat in tool_key_regex.find_iter(text) {
            // Search backwards for the opening brace '{'
            let mut start_index = mat.start();
            let mut found_start = false;
            while start_index > 0 {
                start_index -= 1;
                if text.as_bytes()[start_index] == b'{' {
                    found_start = true;
                    break;
                }
                // Stop if we hit a closing brace or another object end, to avoid over-reaching
                if text.as_bytes()[start_index] == b'}' {
                    break;
                }
            }

            if found_start {
                // Now scan forward to find the matching closing brace
                let mut brace_count = 0;
                let mut in_string = false;
                let mut escape = false;
                let mut end_index = 0;
                let mut found_end = false;

                for (i, c) in text[start_index..].char_indices() {
                    if escape {
                        escape = false;
                        continue;
                    }
                    
                    match c {
                        '\\' => escape = true,
                        '"' => in_string = !in_string,
                        '{' if !in_string => brace_count += 1,
                        '}' if !in_string => {
                            brace_count -= 1;
                            if brace_count == 0 {
                                end_index = start_index + i + 1;
                                found_end = true;
                                break;
                            }
                        }
                        _ => {}
                    }
                }

                if found_end {
                    let block_str = &text[start_index..end_index];
                    
                    // Try to parse this block as JSON
                    if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(block_str) {
                        // Check if it looks like a tool call
                        if let Some(name) = json_value.get("tool").and_then(|n| n.as_str()) {
                            // Avoid duplicates if we already parsed this one (simple check)
                            if parsed_calls.iter().any(|c| c.function.name == name && c.function.arguments.contains(&name)) {
                                continue;
                            }

                            let args_val = json_value.get("arguments").or_else(|| json_value.get("args"));
                            
                            let arguments = match args_val {
                                Some(val) if val.is_object() || val.is_array() => {
                                    serde_json::to_string(val).unwrap_or_else(|_| "{}".to_string())
                                }
                                Some(serde_json::Value::String(s)) => s.to_string(),
                                Some(val) => val.to_string(),
                                None => "{}".to_string(),
                            };

                            parsed_calls.push(ToolCall {
                                id: format!("call_{}", base_call_index + parsed_calls.len()),
                                tool_type: "function".to_string(),
                                function: FunctionCall {
                                    name: name.to_string(),
                                    arguments,
                                },
                            });
                        }
                    }
                }
            }
        }

        parsed_calls
    }

    /// Parse Grok's XML-style tool calls (e.g. <tool_code>...</tool_code>)
    fn parse_grok_xml_tools(text: &str, base_call_index: usize) -> Vec<ToolCall> {
        let mut parsed_calls: Vec<ToolCall> = Vec::new();
        
        // Regex for <tool_code>...</tool_code> (dot matches newline)
        let xml_regex = Regex::new(r"(?is)<tool_code>\s*(.*?)\s*</tool_code>").unwrap();

        for cap in xml_regex.captures_iter(text) {
            if let Some(content) = cap.get(1).map(|m| m.as_str().trim()) {
                eprintln!("🔍 Found potential XML tool block: {}", content);
                // Try to parse the content as JSON
                if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(content) {
                    // Helper to extract tool info from JSON object
                    let process_obj = |obj: &serde_json::Value, index: usize| -> Option<ToolCall> {
                        let name = obj.get("name")
                            .or_else(|| obj.get("tool_name"))
                            .or_else(|| obj.get("function").and_then(|f| f.get("name")))?
                            .as_str()?;
                        
                        let args = obj.get("arguments")
                            .or_else(|| obj.get("args"))
                            .or_else(|| obj.get("parameters"))
                            .or_else(|| obj.get("function").and_then(|f| f.get("arguments")));

                        let arguments_str = match args {
                            Some(val) if val.is_object() || val.is_array() => serde_json::to_string(val).unwrap_or_default(),
                            Some(serde_json::Value::String(s)) => s.to_string(),
                            _ => "{}".to_string()
                        };

                        Some(ToolCall {
                            id: format!("call_{}_{}", base_call_index, index),
                            tool_type: "function".to_string(),
                            function: FunctionCall {
                                name: name.to_string(),
                                arguments: arguments_str,
                            },
                        })
                    };

                    if let Some(array) = json_val.as_array() {
                        for item in array {
                            let current_len = parsed_calls.len();
                            if let Some(call) = process_obj(item, current_len) {
                                parsed_calls.push(call);
                            }
                        }
                    } else {
                        let current_len = parsed_calls.len();
                        if let Some(call) = process_obj(&json_val, current_len) {
                            parsed_calls.push(call);
                        }
                    }
                }
            }
        }
        
        parsed_calls
    }

    pub fn add_user_message(&mut self, content: String) {
        self.conversation_history.push(Message {
            role: "user".to_string(),
            content,
            tool_calls: None,
            tool_call_id: None,
            timestamp: Some(Self::get_current_timestamp()),
        });
    }

    pub fn get_conversation_history(&self) -> &Vec<Message> {
        &self.conversation_history
    }

    pub fn clear_history(&mut self) {
        self.conversation_history.clear();
    }

    /// Estimate token count (rough heuristic: 4 chars = 1 token)
    fn estimate_tokens(&self) -> usize {
        let mut chars = 0;
        for msg in &self.conversation_history {
            chars += msg.content.len();
            if let Some(tools) = &msg.tool_calls {
                for tool in tools {
                    chars += tool.function.arguments.len();
                }
            }
        }
        chars / 4
    }

    /// Prune history if it exceeds token limit
    fn prune_history(&mut self) {
        const MAX_TOKENS: usize = 90_000; // Leave buffer for response
        const MIN_MESSAGES: usize = 10;   // Always keep last N messages

        let current_tokens = self.estimate_tokens();
        if current_tokens > MAX_TOKENS {
            eprintln!("✂️ Context too large ({} tokens), pruning...", current_tokens);
            
            let mut removed_count = 0;
            while self.estimate_tokens() > MAX_TOKENS && self.conversation_history.len() > MIN_MESSAGES {
                // Remove from front (oldest), but be careful not to break tool chains if possible
                // For simplicity, just remove oldest
                self.conversation_history.remove(0);
                removed_count += 1;
            }
            eprintln!("✂️ Pruned {} messages. New token count: {}", removed_count, self.estimate_tokens());
        }
    }

    /// Get the knowledge base root directory
    /// Dev Mode: Repository root
    /// Prod Mode: User Documents/KnowledgeCompanion
    pub fn get_knowledge_base_path() -> Result<PathBuf, String> {
        let current = std::env::current_dir().map_err(|e| e.to_string())?;

        // 1. Check for Dev Environment (src-tauri or project root)
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

    /// Execute a tool and return result as JSON string
    fn execute_tool(&self, tool_name: &str, arguments: &str) -> String {
        if self.is_forced_disabled_tool(tool_name) {
            return serde_json::json!({
                "success": false,
                "error": format!("Tool '{}' is not available in student mode", tool_name)
            }).to_string();
        }

        if !self.enabled_tools.is_empty() {
            let enabled = self.enabled_tools.get(tool_name).copied().unwrap_or(true);
            if !enabled {
                return serde_json::json!({
                    "success": false,
                    "error": format!("Tool '{}' is disabled in this session", tool_name)
                }).to_string();
            }
        }
        eprintln!("🔧 Executing tool: {}", tool_name);
        eprintln!("📝 Arguments: {}", arguments);

        let result = match tool_name {
            "scan_codebase" => self.tool_scan_codebase(arguments),
            "start_debate" => self.tool_start_debate(arguments),
            "write_file_batch" => self.tool_write_file_batch(arguments),
            "run_terminal_command" => self.tool_run_terminal_command(arguments),
            "calculate" => self.tool_calculate(arguments),
            "read_file" => self.tool_read_file(arguments),
            "search_knowledge" => self.tool_search_knowledge(arguments),
            "canvas_update" => serde_json::Value::String(self.tool_canvas_update(arguments)),
            "list_registered_agents" => self.tool_list_registered_agents(arguments),
            "invoke_agent" => self.tool_invoke_agent(arguments),
            "create_study_guide" => {
                let grok_api_key = self.grok_api_key.clone();
                let args_str = arguments.to_string();
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(self.tool_create_study_guide_async(args_str, grok_api_key))
                })
            }
            "list_markdown_files" => self.tool_list_markdown_files(arguments),
            "web_search" => {
                // For async tools, we need to use a blocking call in a runtime
                let tavily_api_key = self.tavily_api_key.clone();
                let args_str = arguments.to_string();
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(self.tool_web_search_async(args_str, tavily_api_key))
                })
            }
            "write_file" => self.tool_write_file(arguments),
            "display_media" => self.tool_display_media(arguments),
            "brainstorm_with_grok" => {
                // For async Grok calls
                let grok_api_key = self.grok_api_key.clone();
                let args_str = arguments.to_string();
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(self.tool_brainstorm_with_grok_async(args_str, grok_api_key))
                })
            }
            "harvest_wiki" => {
                // Async Wiki Harvest
                let args_str = arguments.to_string();
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(self.tool_harvest_wiki_async(args_str))
                })
            }
            "harvest_wiki_category" => {
                // Async Wiki Category Harvest
                let args_str = arguments.to_string();
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(self.tool_harvest_wiki_category_async(args_str))
                })
            }

            "tkg_search" => {
                // Search the Temporal Knowledge Graph
                let args_str = arguments.to_string();
                let user_id = self.user_id.clone();
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(self.tool_tkg_search_async(args_str, user_id))
                })
            }
            "tkg_store" => {
                // Store knowledge in the Temporal Knowledge Graph
                let args = arguments.to_string();
                let user_id = self.user_id.clone();
                let result = tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(async move {
                            self.tool_tkg_store_async(args, user_id).await
                        })
                });
                result
            }
            "deep_research" => {
                // Spawn a sub-agent for deep research
                let api_key = self.api_key.clone();
                let tavily_api_key = self.tavily_api_key.clone();
                let grok_api_key = self.grok_api_key.clone();
                let gemini_api_key = self.gemini_api_key.clone();
                let app_handle = self.app_handle.clone();
                let provider = self.provider.clone();
                let enabled_tools = self.enabled_tools.clone();
                let safe_mode = self.safe_mode;
                let user_id = self.user_id.clone();
                let user_name = self.user_name.clone();
                let args_str = arguments.to_string();
                
                tokio::task::block_in_place(|| {
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(async move {
                            let args: Result<serde_json::Value, _> = serde_json::from_str(&args_str);
                            match args {
                                Ok(args) => {
                                    if let Some(topic) = args.get("topic").and_then(|v| v.as_str()) {
                                        let topic = topic.to_string();
                                        
                                        // Check for sub_topics for parallel execution
                                        let sub_topics: Vec<String> = args.get("sub_topics")
                                            .and_then(|v| v.as_array())
                                            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                                            .unwrap_or_default();

                                        if !sub_topics.is_empty() {
                                            eprintln!("🚀 Spawning {} Parallel Deep Research Agents for: {}", sub_topics.len(), topic);
                                            
                                            let mut handles = vec![];

                                            for sub_topic in sub_topics {
                                                let tavily_key = tavily_api_key.clone().unwrap_or_default();
                                                let app_handle_clone = app_handle.clone();
                                                let sub_topic_clone = sub_topic.clone();

                                                let handle = tokio::spawn(async move {
                                                    eprintln!("🤖 Agent starting research on: {}", sub_topic_clone);
                                                    let agent = DeepResearchAgent::new(tavily_key);
                                                    
                                                    let result = agent.research_topic(&sub_topic_clone, 1, move |step| {
                                                        if let Some(h) = &app_handle_clone {
                                                            let _ = h.emit_all("research-progress", step);
                                                        }
                                                    }).await;

                                                    match result {
                                                        Ok(context) => (sub_topic_clone, Ok(context)),
                                                        Err(e) => (sub_topic_clone, Err(e))
                                                    }
                                                });
                                                handles.push(handle);
                                            }

                                            // Wait for all agents
                                            let mut reports = Vec::new();
                                            for handle in handles {
                                                if let Ok((sub_topic, result)) = handle.await {
                                                    match result {
                                                        Ok(context) => {
                                                            eprintln!("✅ Agent finished: {}", sub_topic);
                                                            reports.push(format!("# Research Data on {}\n\n{}", sub_topic, context));
                                                        }
                                                        Err(e) => {
                                                            eprintln!("❌ Agent failed on {}: {}", sub_topic, e);
                                                            reports.push(format!("# Research Data on {}\n\nFAILED: {}", sub_topic, e));
                                                        }
                                                    }
                                                }
                                            }

                                            // Synthesize results
                                            eprintln!("🧠 Synthesizing {} research contexts...", reports.len());
                                            let mut synthesizer = MinimaxAgent::new(
                                                api_key.clone(),
                                                tavily_api_key.clone(),
                                                grok_api_key.clone(),
                                                gemini_api_key.clone()
                                            )
                                            .with_provider(provider.clone())
                                            .with_enabled_tools(enabled_tools.clone())
                                            .with_safe_mode(safe_mode)
                                            .with_user_id(user_id.clone())
                                            .with_user_name(user_name.clone());

                                            if let Some(handle) = &app_handle {
                                                synthesizer = synthesizer.with_app_handle(handle.clone());
                                            }
                                            
                                            let synthesis_prompt = r#"You are a Lead Research Synthesizer.
Your goal is to combine multiple research contexts into one cohesive, comprehensive master report.
1. Read all the provided research data.
2. Identify key themes, facts, and insights.
3. Synthesize them into a single, well-structured markdown document.
4. Ensure the flow is logical and the tone is professional.
Always use the <think> tag to explain your synthesis process."#.to_string();

                                            synthesizer = synthesizer.with_system_prompt(synthesis_prompt);

                                            let combined_input = format!("Here is the raw research data for the topic '{}':\n\n{}", 
                                                topic, 
                                                reports.join("\n\n---\n\n")
                                            );

                                            match synthesizer.run_autonomous_task(combined_input).await {
                                                Ok(final_report) => serde_json::json!({
                                                    "success": true,
                                                    "report": final_report,
                                                    "mode": "parallel",
                                                    "agents_count": reports.len()
                                                }),
                                                Err(e) => serde_json::json!({
                                                    "success": false,
                                                    "error": format!("Synthesis failed: {}", e)
                                                })
                                            }

                                        } else {
                                            // Single agent mode
                                            let tavily_key = tavily_api_key.clone().unwrap_or_default();
                                            let app_handle_clone = app_handle.clone();
                                            let agent = DeepResearchAgent::new(tavily_key);
                                            
                                            eprintln!("🔍 Starting deep research on: {}", topic);

                                            match agent.research_topic(&topic, 1, move |step| {
                                                if let Some(h) = &app_handle_clone {
                                                    let _ = h.emit_all("research-progress", step);
                                                }
                                            }).await {
                                                Ok(context) => {
                                                    // Synthesize
                                                    eprintln!("🧠 Synthesizing research...");
                                                    let mut synthesizer = MinimaxAgent::new(
                                                        api_key.clone(),
                                                        tavily_api_key.clone(),
                                                        grok_api_key.clone(),
                                                        gemini_api_key.clone()
                                                    )
                                                    .with_provider(provider.clone())
                                                    .with_enabled_tools(enabled_tools.clone())
                                                    .with_safe_mode(safe_mode)
                                                    .with_user_id(user_id.clone())
                                                    .with_user_name(user_name.clone());

                                                    if let Some(handle) = &app_handle {
                                                        synthesizer = synthesizer.with_app_handle(handle.clone());
                                                    }
                                                    
                                                    let synthesis_prompt = r#"You are a Deep Research Specialist.
Your goal is to write a comprehensive report based on the provided research data.
1. Analyze the research data.
2. Structure a detailed markdown report.
3. Include citations where possible (URLs are provided in the data).
Always use the <think> tag to explain your reasoning."#.to_string();

                                                    synthesizer = synthesizer.with_system_prompt(synthesis_prompt);
                                                    
                                                    let input = format!("Here is the research data for '{}':\n\n{}", topic, context);

                                                    match synthesizer.run_autonomous_task(input).await {
                                                        Ok(report) => serde_json::json!({
                                                            "success": true,
                                                            "report": report
                                                        }),
                                                        Err(e) => serde_json::json!({
                                                            "success": false,
                                                            "error": format!("Synthesis failed: {}", e)
                                                        })
                                                    }
                                                },
                                                Err(e) => serde_json::json!({
                                                    "success": false,
                                                    "error": format!("Research failed: {}", e)
                                                })
                                            }
                                        }
                                    } else {
                                        serde_json::json!({
                                            "success": false,
                                            "error": "Missing 'topic' argument"
                                        })
                                    }
                                },
                                Err(e) => serde_json::json!({
                                    "success": false,
                                    "error": format!("Invalid arguments: {}", e)
                                })
                            }
                        })
                })
            }
            "consult_agent" => {
                // Consult a specialized agent and get their expert response
                let api_key = self.api_key.clone();
                let grok_api_key = self.grok_api_key.clone();
                let gemini_api_key = self.gemini_api_key.clone();
                let default_provider = match self.provider {
                    AIProvider::Grok => "grok",
                    AIProvider::Gemini => "gemini",
                    AIProvider::Minimax => "minimax",
                }
                .to_string();
                let args_str = arguments.to_string();
                let registry_data = self.load_agents_registry();

                tokio::task::block_in_place(|| {
                    let registry_data = registry_data.clone();
                    let default_provider = default_provider.clone();
                    tokio::runtime::Runtime::new()
                        .unwrap()
                        .block_on(async move {
                            let args: Result<serde_json::Value, _> = serde_json::from_str(&args_str);
                            match args {
                                Ok(args) => {
                                    let agent_id_arg = args.get("agent_id").and_then(|v| v.as_str()).map(|id| id.to_string());
                                    let agent_name_arg = args.get("agent_name").and_then(|v| v.as_str()).map(|name| name.to_string());

                                    if agent_id_arg.is_none() && agent_name_arg.is_none() {
                                        return serde_json::json!({
                                            "success": false,
                                            "error": "Missing 'agent_id' or 'agent_name' argument"
                                        });
                                    }

                                    let query = match args.get("query").and_then(|v| v.as_str()) {
                                        Some(q) => q.to_string(),
                                        None => return serde_json::json!({
                                            "success": false,
                                            "error": "Missing 'query' argument"
                                        })
                                    };

                                    let agent_label = agent_id_arg.clone().or_else(|| agent_name_arg.clone()).unwrap_or_else(|| "unknown".to_string());
                                    eprintln!("🤖 Consulting agent: {}", agent_label);

                                    let data = match registry_data {
                                        Ok(data) => data,
                                        Err(e) => {
                                            return serde_json::json!({
                                                "success": false,
                                                "error": e
                                            });
                                        }
                                    };

                                    let agents = match data.get("agents").and_then(|v| v.as_array()) {
                                        Some(agents) => agents,
                                        None => {
                                            return serde_json::json!({
                                                "success": false,
                                                "error": "No agents array in registry"
                                            });
                                        }
                                    };

                                    let mut agent = None;
                                    if let Some(agent_id) = agent_id_arg.as_deref() {
                                        agent = agents.iter().find(|a| a.get("id").and_then(|v| v.as_str()) == Some(agent_id));
                                    }
                                    if agent.is_none() {
                                        if let Some(agent_name) = agent_name_arg.as_deref() {
                                            agent = agents.iter().find(|a| {
                                                a.get("name")
                                                    .and_then(|v| v.as_str())
                                                    .map(|name| name.eq_ignore_ascii_case(agent_name))
                                                    .unwrap_or(false)
                                            });
                                        }
                                    }

                                    let agent = match agent {
                                        Some(agent) => agent,
                                        None => {
                                            return serde_json::json!({
                                                "success": false,
                                                "error": format!("Agent '{}' not found in registry", agent_label)
                                            });
                                        }
                                    };

                                    let agent_id = agent.get("id").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                                    let agent_name = agent.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string();
                                    let provider = agent
                                        .get("preferredProvider")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or(&default_provider)
                                        .to_string();
                                    let system_prompt = agent.get("systemPrompt").and_then(|v| v.as_str()).unwrap_or("You are a helpful assistant.").to_string();

                                    eprintln!("📋 Agent: {} | Provider: {}", agent_name, provider);

                                    // Make API call based on provider
                                    let client = reqwest::Client::new();

                                    let (url, auth_header, payload) = if provider == "grok" {
                                        let key = grok_api_key.clone().unwrap_or_default();
                                        (
                                            "https://api.x.ai/v1/chat/completions".to_string(),
                                            format!("Bearer {}", key),
                                            serde_json::json!({
                                                "model": "grok-4-1-fast",
                                                "messages": [
                                                    {"role": "system", "content": system_prompt},
                                                    {"role": "user", "content": query}
                                                ],
                                                "max_tokens": 4096,
                                                "temperature": 0.7
                                            })
                                        )
                                    } else if provider == "gemini" {
                                        let key = gemini_api_key.clone().unwrap_or_default();
                                        (
                                            format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}", key),
                                            "".to_string(),
                                            serde_json::json!({
                                                "contents": [
                                                    {"role": "user", "parts": [{"text": format!("{}\n\nUser Query: {}", system_prompt, query)}]}
                                                ]
                                            })
                                        )
                                    } else {
                                        // Default to MiniMax
                                        (
                                            "https://api.minimax.io/v1/chat/completions".to_string(),
                                            format!("Bearer {}", api_key),
                                            serde_json::json!({
                                                "model": "MiniMax-M2",
                                                "messages": [
                                                    {"role": "system", "content": system_prompt},
                                                    {"role": "user", "content": query}
                                                ],
                                                "max_tokens": 4096,
                                                "temperature": 0.7
                                            })
                                        )
                                    };

                                    let mut request = client.post(&url)
                                        .header("Content-Type", "application/json")
                                        .json(&payload);

                                    if !auth_header.is_empty() {
                                        request = request.header("Authorization", auth_header);
                                    }

                                    match request.send().await {
                                        Ok(response) => {
                                            if response.status().is_success() {
                                                match response.json::<serde_json::Value>().await {
                                                    Ok(result) => {
                                                        // Extract response based on provider format
                                                        let content = if provider == "gemini" {
                                                            result.get("candidates")
                                                                .and_then(|c| c.as_array())
                                                                .and_then(|c| c.first())
                                                                .and_then(|c| c.get("content"))
                                                                .and_then(|c| c.get("parts"))
                                                                .and_then(|p| p.as_array())
                                                                .and_then(|p| p.first())
                                                                .and_then(|p| p.get("text"))
                                                                .and_then(|t| t.as_str())
                                                                .unwrap_or("No response")
                                                                .to_string()
                                                        } else {
                                                            result.get("choices")
                                                                .and_then(|c| c.as_array())
                                                                .and_then(|c| c.first())
                                                                .and_then(|c| c.get("message"))
                                                                .and_then(|m| m.get("content"))
                                                                .and_then(|c| c.as_str())
                                                                .unwrap_or("No response")
                                                                .to_string()
                                                        };

                                                        eprintln!("✅ Agent consultation complete");

                                                        serde_json::json!({
                                                            "success": true,
                                                            "agent_id": agent_id,
                                                            "agent_name": agent_name,
                                                            "provider": provider,
                                                            "response": content
                                                        })
                                                    }
                                                    Err(e) => serde_json::json!({
                                                        "success": false,
                                                        "error": format!("Failed to parse response: {}", e)
                                                    })
                                                }
                                            } else {
                                                let error_text = response.text().await.unwrap_or_default();
                                                serde_json::json!({
                                                    "success": false,
                                                    "error": format!("API error: {}", error_text)
                                                })
                                            }
                                        }
                                        Err(e) => serde_json::json!({
                                            "success": false,
                                            "error": format!("Request failed: {}", e)
                                        })
                                    }
                                }
                                Err(e) => serde_json::json!({
                                    "success": false,
                                    "error": format!("Invalid arguments: {}", e)
                                })
                            }
                        })
                })
            }
            _ => serde_json::json!({
                "error": format!("Unknown tool: {}", tool_name)
            }),
        };

        eprintln!("✅ Result: {}", result);
        result.to_string()
    }

    /// Async version of tool_web_search
    async fn tool_web_search_async(&self, arguments: String, tavily_api_key: Option<String>) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                if let Some(query_val) = args.get("query") {
                    let query = query_val.as_str().unwrap_or("");
                    let max_results = args.get("max_results")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(5)
                        .min(10); // Cap at 10 results

                    // Get Tavily API key from agent
                    let tavily_key = match tavily_api_key {
                        Some(key) => key,
                        None => {
                            eprintln!("⚠️ Tavily API key not provided");
                            return serde_json::json!({
                                "success": false,
                                "error": "Tavily API key not configured. Please set your Tavily API key in settings."
                            });
                        }
                    };

                    if tavily_key.is_empty() {
                        return serde_json::json!({
                            "success": false,
                            "error": "Tavily API key is empty. Please check your settings."
                        });
                    }

                    // Call Tavily Search API
                    let client = reqwest::Client::new();
                    let search_url = "https://api.tavily.com/search";

                    let payload = serde_json::json!({
                        "api_key": tavily_key,
                        "query": query,
                        "max_results": max_results,
                        "include_answer": true,
                        "include_images": false,
                        "include_raw_content": false
                    });

                    eprintln!("🔍 Searching web for: {}", query);

                    match client.post(search_url)
                        .header("Content-Type", "application/json")
                        .json(&payload)
                        .send()
                        .await
                    {
                        Ok(response) => {
                            if response.status().is_success() {
                                match response.json::<serde_json::Value>().await {
                                    Ok(search_result) => {
                                        eprintln!("✅ Web search successful");

                                        // Parse and format results
                                        let results = search_result.get("results")
                                            .and_then(|r| r.as_array())
                                            .unwrap_or(&vec![])
                                            .iter()
                                            .filter_map(|r| {
                                                serde_json::to_string(&serde_json::json!({
                                                    "title": r.get("title")?.as_str()?,
                                                    "url": r.get("url")?.as_str()?,
                                                    "snippet": r.get("content")?.as_str()?,
                                                    "published_date": r.get("published_date").and_then(|d| d.as_str())
                                                })).ok()
                                            })
                                            .collect::<Vec<String>>();

                                        let answer = search_result.get("answer")
                                            .and_then(|a| a.as_str())
                                            .unwrap_or("");

                                        serde_json::json!({
                                            "success": true,
                                            "query": query,
                                            "answer": answer,
                                            "results": results,
                                            "count": results.len()
                                        })
                                    }
                                    Err(e) => serde_json::json!({
                                        "success": false,
                                        "error": format!("Failed to parse search results: {}", e)
                                    })
                                }
                            } else {
                                let error_text = response.text().await.unwrap_or_else(|_| "Unknown API error".to_string());
                                serde_json::json!({
                                    "success": false,
                                    "error": format!("Tavily API error: {}", error_text)
                                })
                            }
                        }
                        Err(e) => serde_json::json!({
                            "success": false,
                            "error": format!("Failed to connect to Tavily API: {}", e)
                        })
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'query' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    /// TKG Search - Search semantic memory in Temporal Knowledge Graph
    async fn tool_tkg_search_async(&self, arguments: String, user_id: String) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                if let Some(query_val) = args.get("query") {
                    let query = query_val.as_str().unwrap_or("");
                    let limit = args.get("limit")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(5)
                        .min(20);
                    let _trust_threshold = args.get("trust_threshold")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.5);

                    // Call TKG search
                    match tkg::tkg_search_similar(query.to_string(), limit, user_id).await {
                        Ok(result_str) => {
                            match serde_json::from_str(&result_str) {
                                Ok(result_json) => result_json,
                                Err(_) => serde_json::json!({
                                    "success": false,
                                    "error": "Failed to parse TKG search results"
                                })
                            }
                        }
                        Err(e) => serde_json::json!({
                            "success": false,
                            "error": format!("TKG search failed: {}", e)
                        })
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'query' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    /// TKG Store - Store knowledge in Temporal Knowledge Graph
    async fn tool_tkg_store_async(&self, arguments: String, user_id: String) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                if let (Some(content_val), Some(node_type_val)) = (args.get("content"), args.get("node_type")) {
                    let content = content_val.as_str().unwrap_or("");
                    let node_type = node_type_val.as_str().unwrap_or("CONCEPT");
                    let importance = args.get("importance")
                        .and_then(|v| v.as_f64())
                        .unwrap_or(0.5);

                    // Call TKG store
                    match tkg::tkg_store_knowledge(content.to_string(), node_type.to_string(), importance as f32, user_id).await {
                        Ok(result_str) => {
                            match serde_json::from_str(&result_str) {
                                Ok(result_json) => result_json,
                                Err(_) => serde_json::json!({
                                    "success": false,
                                    "error": "Failed to parse TKG store results"
                                })
                            }
                        }
                        Err(e) => serde_json::json!({
                            "success": false,
                            "error": format!("TKG store failed: {}", e)
                        })
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'content' or 'node_type' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    /// Claim Legacy Data - Migrate guest data to current user
    async fn tool_claim_legacy_data_async(&self, arguments: String, user_id: String) -> serde_json::Value {
        if user_id == "guest" {
             return serde_json::json!({
                "success": false,
                "error": "Cannot claim data while logged in as guest. Please log in first."
            });
        }

        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);
        let dry_run = args
            .as_ref()
            .ok()
            .and_then(|a| a.get("dry_run").and_then(|v| v.as_bool()))
            .unwrap_or(true);
        let confirm = args
            .as_ref()
            .ok()
            .and_then(|a| a.get("confirm").and_then(|v| v.as_bool()))
            .unwrap_or(false);

        if !dry_run && !confirm {
            return serde_json::json!({
                "success": false,
                "error": "Refusing to migrate without explicit confirmation. Re-run with {\"confirm\": true} (or use {\"dry_run\": true} first)."
            });
        }

        // Call TKG claim legacy data (dry-run by default)
        match tkg::tkg_claim_legacy_data(user_id, Some(dry_run)).await {
            Ok(result_str) => serde_json::json!({
                "success": true,
                "dry_run": dry_run,
                "message": result_str
            }),
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Migration failed: {}", e)
            })
        }
    }

    /// Brainstorm with Grok - Get a second perspective from Grok-4
    async fn tool_brainstorm_with_grok_async(&self, arguments: String, grok_api_key: Option<String>) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                if let Some(query_val) = args.get("query") {
                    let query = query_val.as_str().unwrap_or("");
                    let context = args.get("context")
                        .and_then(|c| c.as_str())
                        .unwrap_or("");

                    // Get Grok API key from agent
                    let grok_key = match grok_api_key {
                        Some(key) => key,
                        None => {
                            eprintln!("⚠️ Grok API key not provided");
                            return serde_json::json!({
                                "success": false,
                                "error": "Grok API key not configured. Please set your Grok API key in settings."
                            });
                        }
                    };

                    if grok_key.is_empty() {
                        return serde_json::json!({
                            "success": false,
                            "error": "Grok API key is empty. Please check your settings."
                        });
                    }

                    // Call Grok API
                    let client = reqwest::Client::new();
                    let grok_url = "https://api.x.ai/v1/chat/completions";

                    // Build the prompt for Grok
                    let full_prompt = if !context.is_empty() {
                        format!("Context: {}\n\nQuestion: {}\n\nPlease provide a creative, insightful response or alternative perspective.", context, query)
                    } else {
                        format!("{}\n\nPlease provide a creative, insightful response or alternative perspective.", query)
                    };

                    let payload = serde_json::json!({
                        "model": "grok-4-1-fast-non-reasoning",
                        "messages": [
                            {
                                "role": "system",
                                "content": "Write in clear, native-level English with complete sentences. Avoid broken/fragmented phrasing, translation-like wording, and excessive slang. Be concise, professional, and actionable. If the user is frustrated, acknowledge it briefly and then give concrete next steps."
                            },
                            {
                                "role": "user",
                                "content": full_prompt
                            }
                        ],
                        "max_tokens": 1000,
                        "temperature": 0.8
                    });

                    eprintln!("🧠 Brainstorming with Grok: {}", query);

                    match client.post(grok_url)
                        .header("Authorization", format!("Bearer {}", grok_key))
                        .header("Content-Type", "application/json")
                        .json(&payload)
                        .send()
                        .await
                    {
                        Ok(response) => {
                            if response.status().is_success() {
                                match response.json::<serde_json::Value>().await {
                                    Ok(grok_result) => {
                                        eprintln!("✅ Grok brainstorming successful");

                                        let grok_response = grok_result.get("choices")
                                            .and_then(|c| c.as_array())
                                            .and_then(|arr| arr.get(0))
                                            .and_then(|choice| choice.get("message"))
                                            .and_then(|msg| msg.get("content"))
                                            .and_then(|content| content.as_str())
                                            .unwrap_or("No response from Grok");

                                        serde_json::json!({
                                            "success": true,
                                            "query": query,
                                            "context": context,
                                            "grok_perspective": grok_response,
                                            "note": "This perspective is from Grok-4, providing a second viewpoint to enhance your thinking."
                                        })
                                    }
                                    Err(e) => serde_json::json!({
                                        "success": false,
                                        "error": format!("Failed to parse Grok response: {}", e)
                                    })
                                }
                            } else {
                                let error_text = response.text().await.unwrap_or_else(|_| "Unknown Grok API error".to_string());
                                serde_json::json!({
                                    "success": false,
                                    "error": format!("Grok API error: {}", error_text)
                                })
                            }
                        }
                        Err(e) => serde_json::json!({
                            "success": false,
                            "error": format!("Failed to connect to Grok API: {}", e)
                        })
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'query' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }







    fn tool_start_debate(&self, arguments: &str) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(arguments);
        let topic = args.as_ref().ok()
            .and_then(|a| a.get("topic").and_then(|t| t.as_str()))
            .unwrap_or("")
            .to_string();
        
        let turns = args.as_ref().ok()
            .and_then(|a| a.get("turns").and_then(|t| t.as_u64()))
            .map(|t| t as usize);

        if topic.is_empty() {
            return serde_json::json!({
                "success": false,
                "error": "Missing 'topic' argument"
            });
        }

        let api_key = self.api_key.clone();
        
        // Determine provider string
        let provider_str = match self.provider {
            AIProvider::Grok => Some("grok".to_string()),
            _ => Some("minimax".to_string()),
        };
        
        // Call the debate logic synchronously (blocking)
        let result = tokio::task::block_in_place(|| {
            tokio::runtime::Runtime::new()
                .unwrap()
                .block_on(async move {
                    let req = orchestrate_agents::DebateRequest {
                        topic,
                        api_key,
                        turns,
                        provider: provider_str,
                    };
                    orchestrate_agents::start_agent_debate(req).await
                })
        });

        match result {
            Ok(response) => serde_json::json!({
                "success": true,
                "transcript": response.transcript,
                "final_consensus": response.final_consensus
            }),
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Debate failed: {}", e)
            })
        }
    }

    /// Scan codebase structure
    fn tool_scan_codebase(&self, arguments: &str) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(arguments);
        let (start_path, max_depth) = match args {
            Ok(a) => (
                a.get("path").and_then(|v| v.as_str()).unwrap_or(".").to_string(),
                a.get("max_depth").and_then(|v| v.as_u64()).unwrap_or(3) as usize
            ),
            Err(_) => (".".to_string(), 3)
        };

        let repo_root = Self::get_knowledge_base_path().unwrap_or_else(|_| PathBuf::from("."));
        let target_path = repo_root.join(&start_path);

        if !target_path.exists() {
             return serde_json::json!({
                "success": false,
                "error": format!("Path does not exist: {}", start_path)
            });
        }

        let mut files = Vec::new();
        let mut directories = Vec::new();

        let walker = WalkDir::new(&target_path)
            .max_depth(max_depth)
            .into_iter();

        for entry in walker.filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            // Basic filtering of common ignore patterns
            !name.starts_with('.') && // Hidden files
            name != "node_modules" && 
            name != "target" && 
            name != "dist" && 
            name != "build" &&
            name != "coverage"
        }) {
            if let Ok(entry) = entry {
                let path = entry.path();
                if let Ok(rel_path) = path.strip_prefix(&repo_root) {
                    let path_str = rel_path.to_string_lossy().replace("\\", "/");
                    if path.is_dir() {
                        directories.push(path_str);
                    } else {
                        files.push(path_str);
                    }
                }
            }
        }

        // Sort for consistent output
        files.sort();
        directories.sort();

        serde_json::json!({
            "success": true,
            "root": start_path,
            "directories": directories,
            "files": files,
            "total_files": files.len(),
            "total_directories": directories.len()
        })
    }

    /// Helper to validate if a path is safe to write to
    fn validate_write_scope(&self, path_str: &str) -> Result<std::path::PathBuf, String> {
        let path = std::path::Path::new(path_str);
        
        // 1. Prevent absolute paths outside the project (basic check)
        // In a real app, we'd resolve against the project root. 
        // For now, we assume the CWD is the project root or we allow relative paths.
        
        // 2. Hardcoded allowlist of directories
        let allowed_prefixes = [
            "src/",
            "src-tauri/",
            "public/",
            "docs/",
            "generated-guides/", // Allow guides
            "KnowledgeCompanion/", // Allow agent data
        ];

        // Normalize separators for Windows
        let normalized_path = path_str.replace("\\", "/");
        
        let is_allowed = allowed_prefixes.iter().any(|prefix| normalized_path.starts_with(prefix)) 
            || normalized_path == "README.md" 
            || normalized_path == "package.json"; // Allow root config updates if needed

        if !is_allowed {
            return Err(format!(
                "Security Error: Writing to '{}' is not allowed. Allowed directories: {:?}", 
                path_str, allowed_prefixes
            ));
        }

        // 3. Prevent traversal (../)
        if normalized_path.contains("../") || normalized_path.contains("..\\") {
             return Err("Security Error: Path traversal (../) is forbidden.".to_string());
        }

        Ok(path.to_path_buf())
    }

    fn tool_write_file_batch(&self, arguments: &str) -> serde_json::Value {
        if self.safe_mode {
            return serde_json::json!({
                "success": false,
                "error": "Safe Mode is enabled. File writing is disabled."
            });
        }
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(arguments);
        let files = args.as_ref().ok()
            .and_then(|a| a.get("files").and_then(|f| f.as_array()));

        if let Some(file_list) = files {
            let mut results = Vec::new();
            let repo_root = Self::get_knowledge_base_path().unwrap_or_else(|_| PathBuf::from("."));

            for file_obj in file_list {
                if let (Some(path_str), Some(content)) = (
                    file_obj.get("path").and_then(|p| p.as_str()),
                    file_obj.get("content").and_then(|c| c.as_str())
                ) {
                    // Validate Scope
                    if let Err(e) = self.validate_write_scope(path_str) {
                        results.push(serde_json::json!({
                            "path": path_str,
                            "success": false,
                            "error": e
                        }));
                        continue;
                    }

                    let full_path = repo_root.join(path_str);
                    
                    // Security check: ensure path is within repo (redundant but safe)
                    if !full_path.starts_with(&repo_root) {
                        results.push(serde_json::json!({
                            "path": path_str,
                            "success": false,
                            "error": "Path traversal detected"
                        }));
                        continue;
                    }

                    // Create parent dirs
                    if let Some(parent) = full_path.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }

                    match std::fs::write(&full_path, content) {
                        Ok(_) => results.push(serde_json::json!({
                            "path": path_str,
                            "success": true
                        })),
                        Err(e) => results.push(serde_json::json!({
                            "path": path_str,
                            "success": false,
                            "error": e.to_string()
                        }))
                    }
                }
            }

            serde_json::json!({
                "success": true,
                "results": results
            })
        } else {
            serde_json::json!({
                "success": false,
                "error": "Missing 'files' argument"
            })
        }
    }

    fn tool_run_terminal_command(&self, arguments: &str) -> serde_json::Value {
        if self.safe_mode {
            return serde_json::json!({
                "success": false,
                "error": "Safe Mode is enabled. Terminal commands are disabled."
            });
        }
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(arguments);
        let command = args.as_ref().ok()
            .and_then(|a| a.get("command").and_then(|c| c.as_str()))
            .unwrap_or("");

        if command.is_empty() {
            return serde_json::json!({
                "success": false,
                "error": "Missing 'command' argument"
            });
        }

        let repo_root = Self::get_knowledge_base_path().unwrap_or_else(|_| PathBuf::from("."));

        eprintln!("💻 Executing command: {}", command);

        // Execute command (Windows)
        let output = std::process::Command::new("cmd")
            .args(&["/C", command])
            .current_dir(&repo_root)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                
                serde_json::json!({
                    "success": out.status.success(),
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": out.status.code()
                })
            },
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Failed to execute command: {}", e)
            })
        }
    }

    fn tool_canvas_update(&self, arguments: &str) -> String {
        let args: Result<serde_json::Value, _> = serde_json::from_str(arguments);
        match args {
            Ok(args) => {
                let action = args.get("action").and_then(|v| v.as_str()).unwrap_or("");
                let target = args.get("target").and_then(|v| v.as_str());
                
                let mut payload = serde_json::Map::new();

                match action {
                    "preview" => {
                        let mut preview_data = serde_json::Map::new();
                        if let Some(t) = target { preview_data.insert("target".to_string(), serde_json::json!(t)); }
                        if let Some(u) = args.get("url") { preview_data.insert("url".to_string(), u.clone()); }
                        if let Some(c) = args.get("code").and_then(|v| v.as_str()) { 
                            // Fix Grok double-escaping newlines safely
                            let sanitized = c.replace("\\n", "\n");
                            preview_data.insert("code".to_string(), serde_json::json!(sanitized)); 
                        }
                        if let Some(t) = args.get("type") { preview_data.insert("type".to_string(), t.clone()); }
                        if let Some(p) = args.get("popup") { preview_data.insert("popup".to_string(), p.clone()); }
                        
                        payload.insert("preview".to_string(), serde_json::Value::Object(preview_data));
                    },
                    "add_block" => {
                        let mut block_data = serde_json::Map::new();
                        if let Some(t) = target { block_data.insert("target".to_string(), serde_json::json!(t)); }
                        if let Some(c) = args.get("content").and_then(|v| v.as_str()) { 
                             // Fix Grok double-escaping newlines safely
                            let sanitized = c.replace("\\n", "\n");
                            block_data.insert("content".to_string(), serde_json::json!(sanitized)); 
                        }
                        if let Some(t) = args.get("type") { block_data.insert("type".to_string(), t.clone()); }
                        
                        payload.insert("add_block".to_string(), serde_json::Value::Object(block_data));
                    },
                    "clear" => {
                        let mut clear_data = serde_json::Map::new();
                        if let Some(t) = target { clear_data.insert("target".to_string(), serde_json::json!(t)); }
                        
                        payload.insert("clear_canvas".to_string(), serde_json::Value::Object(clear_data));
                    },
                    _ => {
                        return serde_json::json!({
                            "success": false,
                            "error": format!("Unknown action: {}", action)
                        }).to_string();
                    }
                }

                // Emit event to frontend
                if let Some(app_handle) = &self.app_handle {
                    let _ = app_handle.emit_all("native-canvas-update", serde_json::Value::Object(payload));
                    serde_json::json!({
                        "success": true,
                        "message": "Canvas update sent to frontend"
                    }).to_string()
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "App handle not available"
                    }).to_string()
                }
            },
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid JSON arguments: {}", e)
            }).to_string()
        }
    }

    fn tool_calculate(&self, arguments: &str) -> serde_json::Value {
        let args: Result<HashMap<String, String>, _> = serde_json::from_str(arguments);

        match args {
            Ok(args) => {
                if let Some(expression) = args.get("expression") {
                    // Security: only allow safe characters
                    let allowed_chars: Vec<char> = "0123456789+-*/(). ".chars().collect();
                    if expression.chars().all(|c| allowed_chars.contains(&c)) {
                        match meval::eval_str(expression) {
                            Ok(result) => serde_json::json!({
                                "success": true,
                                "expression": expression,
                                "result": result
                            }),
                            Err(e) => serde_json::json!({
                                "success": false,
                                "error": format!("Calculation error: {}", e)
                            }),
                        }
                    } else {
                        serde_json::json!({
                            "success": false,
                            "error": "Expression contains invalid characters"
                        })
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'expression' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    fn tool_display_media(&self, arguments: &str) -> serde_json::Value {
        eprintln!("📺 tool_display_media called with: {}", arguments);
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(arguments);

        match args {
            Ok(args) => {
                if let (Some(url_val), Some(type_val)) = (args.get("url"), args.get("type")) {
                    let url = url_val.as_str().unwrap_or("");
                    let media_type = type_val.as_str().unwrap_or("url");

                    eprintln!("📺 Displaying media: {} (type: {})", url, media_type);

                    if let Some(app_handle) = &self.app_handle {
                         let payload = serde_json::json!({
                            "url": url,
                            "type": media_type,
                            "targetId": "main" // Default to main canvas
                        });
                        
                        if let Err(e) = app_handle.emit_all("canvas-split", payload) {
                             eprintln!("❌ Failed to emit canvas-split: {}", e);
                             return serde_json::json!({
                                "success": false,
                                "error": format!("Failed to emit event: {}", e)
                             });
                        }
                    } else {
                         eprintln!("❌ No app_handle available");
                         return serde_json::json!({
                            "success": false,
                            "error": "Internal error: app_handle not available"
                         });
                    }

                    serde_json::json!({
                        "success": true,
                        "message": format!("Displayed {} on canvas", media_type)
                    })
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing url or type argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Failed to parse arguments: {}", e)
            })
        }
    }


    async fn harvest_single_page(&self, query: &str, wiki: &str, mode: &str, folder_suffix: Option<&str>) -> Result<serde_json::Value, String> {
        let api_base = if wiki == "osrs" {
            "https://oldschool.runescape.wiki/api.php"
        } else {
            "https://runescape.wiki/api.php"
        };

        eprintln!("🚜 Harvesting '{}' from {} ({})", query, wiki, mode);

        let client = reqwest::Client::builder()
            .user_agent("InformationHordehole/1.0 (internal-research-agent; contact: admin@localhost)")
            .build()
            .map_err(|e| e.to_string())?;

        // Step 1: OpenSearch to get exact title
        let search_url = format!("{}?action=opensearch&search={}&limit=1&format=json", api_base, urlencoding::encode(query));
        
        let title = match client.get(&search_url).send().await {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(array) = json.as_array() {
                        if let Some(titles) = array.get(1).and_then(|v| v.as_array()) {
                            if let Some(first_title) = titles.get(0).and_then(|v| v.as_str()) {
                                first_title.to_string()
                            } else {
                                query.to_string() // Fallback to query
                            }
                        } else { query.to_string() }
                    } else { query.to_string() }
                } else { query.to_string() }
            }
            Err(_) => query.to_string()
        };

        eprintln!("📍 Resolved title: {}", title);

        // Step 2: Fetch Content
        let content_url = format!("{}?action=query&prop=extracts&explaintext=1&titles={}&format=json&redirects=1", 
            api_base, 
            urlencoding::encode(&title)
        );

        let content = match client.get(&content_url).send().await {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    let mut extracted_text = String::new();
                    if let Some(query_obj) = json.get("query") {
                        if let Some(pages) = query_obj.get("pages").and_then(|v| v.as_object()) {
                            for (_, page) in pages {
                                if let Some(extract) = page.get("extract").and_then(|v| v.as_str()) {
                                    extracted_text = extract.to_string();
                                    break; 
                                }
                            }
                        }
                    }
                    extracted_text
                } else {
                    String::new()
                }
            }
            Err(e) => return Err(format!("Failed to fetch content: {}", e))
        };

        if content.is_empty() {
             return Err(format!("No content found for '{}' on {}", title, wiki));
        }

        // Step 3: Save to File
        let safe_title = title.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-', "").replace(" ", "_");
        let base_folder = if wiki == "osrs" { "research/osrs" } else { "research/rs3" };
        let folder = if let Some(suffix) = folder_suffix {
            format!("{}/{}", base_folder, suffix)
        } else {
            base_folder.to_string()
        };
        
        let filename = format!("{}/{}.md", folder, safe_title);
        let file_content = format!("# {}\n\nSource: {}/w/{}\n\n{}\n", title, api_base.replace("/api.php", ""), urlencoding::encode(&title), content);

        if let Ok(root) = Self::get_knowledge_base_path() {
            let full_path = root.join(&filename);
            if let Some(parent) = full_path.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            
            if let Err(e) = std::fs::write(&full_path, &file_content) {
                 return Err(format!("Failed to save file: {}", e));
            }

            // Step 4: Auto-Display in Canvas
            if let Some(app_handle) = &self.app_handle {
                 // Wrap in styled HTML for "cool" display
                 // Since HtmlPreview uses an iframe, we need self-contained styles.
                 let html_content = format!(r#"
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            :root {{
                                --bg-color: #09090b;
                                --card-bg: rgba(24, 24, 27, 0.6);
                                --text-primary: #e4e4e7;
                                --text-secondary: #a1a1aa;
                                --accent: #8b5cf6;
                                --accent-glow: rgba(139, 92, 246, 0.3);
                                --border: rgba(255, 255, 255, 0.1);
                            }}
                            body {{
                                background-color: var(--bg-color);
                                color: var(--text-primary);
                                font-family: 'Inter', system-ui, -apple-system, sans-serif;
                                margin: 0;
                                padding: 2rem;
                                line-height: 1.6;
                            }}
                            .container {{
                                max-width: 800px;
                                margin: 0 auto;
                                background: var(--card-bg);
                                border: 1px solid var(--border);
                                border-radius: 16px;
                                padding: 2rem;
                                box-shadow: 0 0 40px -10px rgba(0,0,0,0.5);
                                backdrop-filter: blur(12px);
                                -webkit-backdrop-filter: blur(12px);
                            }}
                            h1 {{
                                font-size: 2.5rem;
                                font-weight: 800;
                                margin-bottom: 0.5rem;
                                background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
                                -webkit-background-clip: text;
                                -webkit-text-fill-color: transparent;
                                letter-spacing: -0.02em;
                            }}
                            .meta {{
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                                color: var(--text-secondary);
                                font-size: 0.875rem;
                                margin-bottom: 2rem;
                                padding-bottom: 1rem;
                                border-bottom: 1px solid var(--border);
                            }}
                            .badge {{
                                background: var(--accent-glow);
                                color: var(--accent);
                                padding: 0.25rem 0.75rem;
                                border-radius: 9999px;
                                font-size: 0.75rem;
                                font-weight: 600;
                                border: 1px solid rgba(139, 92, 246, 0.2);
                            }}
                            .content {{
                                white-space: pre-wrap;
                                color: var(--text-primary);
                            }}
                            /* Markdown-like styling for the raw text */
                            .content h2 {{ margin-top: 2rem; color: #fff; font-size: 1.5rem; }}
                            .content h3 {{ margin-top: 1.5rem; color: #e4e4e7; font-size: 1.25rem; }}
                            a {{ color: var(--accent); text-decoration: none; }}
                            a:hover {{ text-decoration: underline; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>{}</h1>
                            <div class="meta">
                                <span class="badge">WIKI HARVEST</span>
                                <span>Source: {}</span>
                            </div>
                            <div class="content">{}</div>
                        </div>
                    </body>
                    </html>
                 "#, 
                    title, 
                    api_base.replace("/api.php", ""),
                    content
                        .replace("== ", "<h2>").replace(" ==", "</h2>") // Basic header parsing
                        .replace("=== ", "<h3>").replace(" ===", "</h3>")
                 );
                 
                 let payload = serde_json::json!({
                    "code": html_content,
                    "type": "html",
                    "targetId": "main"
                });
                let _ = app_handle.emit_all("canvas-split", payload);
            }

            Ok(serde_json::json!({
                "success": true,
                "message": format!("Harvested '{}' to {}", title, filename),
                "path": filename,
                "preview": content.chars().take(200).collect::<String>()
            }))
        } else {
             Err("Could not find knowledge base root".to_string())
        }
    }

    async fn tool_harvest_wiki_async(&self, arguments: String) -> serde_json::Value {
        eprintln!("🚜 tool_harvest_wiki called with: {}", arguments);
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                if let Some(query_val) = args.get("query") {
                    let query = query_val.as_str().unwrap_or("");
                    let wiki = args.get("wiki").and_then(|v| v.as_str()).unwrap_or("rs3");
                    let mode = args.get("mode").and_then(|v| v.as_str()).unwrap_or("full");

                    match self.harvest_single_page(query, wiki, mode, None).await {
                        Ok(json) => json,
                        Err(e) => serde_json::json!({ "success": false, "error": e })
                    }
                } else {
                    serde_json::json!({ "success": false, "error": "Missing 'query' argument" })
                }
            }
            Err(e) => serde_json::json!({ "success": false, "error": format!("Invalid arguments: {}", e) })
        }
    }

    async fn tool_harvest_wiki_category_async(&self, arguments: String) -> serde_json::Value {
        eprintln!("🚜 tool_harvest_wiki_category called with: {}", arguments);
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                if let Some(category_val) = args.get("category") {
                    let category = category_val.as_str().unwrap_or("");
                    let wiki = args.get("wiki").and_then(|v| v.as_str()).unwrap_or("rs3");
                    let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(10).min(50);

                    let api_base = if wiki == "osrs" {
                        "https://oldschool.runescape.wiki/api.php"
                    } else {
                        "https://runescape.wiki/api.php"
                    };

                    let client = reqwest::Client::builder()
                        .user_agent("InformationHordehole/1.0 (internal-research-agent; contact: admin@localhost)")
                        .build()
                        .unwrap_or_default();

                    // Step 1: Get Category Members
                    let cat_url = format!("{}?action=query&list=categorymembers&cmtitle=Category:{}&cmlimit={}&format=json", 
                        api_base, 
                        urlencoding::encode(category),
                        limit
                    );

                    let mut pages_to_harvest = Vec::new();
                    if let Ok(resp) = client.get(&cat_url).send().await {
                        if let Ok(json) = resp.json::<serde_json::Value>().await {
                            if let Some(query) = json.get("query") {
                                if let Some(members) = query.get("categorymembers").and_then(|v| v.as_array()) {
                                    for member in members {
                                        if let Some(title) = member.get("title").and_then(|v| v.as_str()) {
                                            pages_to_harvest.push(title.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if pages_to_harvest.is_empty() {
                         return serde_json::json!({
                            "success": false,
                            "error": format!("No pages found in category '{}' on {}", category, wiki)
                        });
                    }

                    eprintln!("🚜 Found {} pages in category '{}'. Starting harvest...", pages_to_harvest.len(), category);

                    let mut results = Vec::new();
                    let safe_cat = category.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-', "").replace(" ", "_");

                    for page_title in pages_to_harvest {
                        // Add delay to respect rate limits
                        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                        
                        match self.harvest_single_page(&page_title, wiki, "full", Some(&safe_cat)).await {
                            Ok(_) => results.push(format!("✅ {}", page_title)),
                            Err(e) => results.push(format!("❌ {}: {}", page_title, e))
                        }
                    }

                    serde_json::json!({
                        "success": true,
                        "message": format!("Harvested {} pages from category '{}'", results.len(), category),
                        "details": results
                    })

                } else {
                    serde_json::json!({ "success": false, "error": "Missing 'category' argument" })
                }
            }
            Err(e) => serde_json::json!({ "success": false, "error": format!("Invalid arguments: {}", e) })
        }
    }





    fn tool_read_file(&self, arguments: &str) -> serde_json::Value {
        let args: Result<HashMap<String, String>, _> = serde_json::from_str(arguments);

        match args {
            Ok(args) => {
                if let Some(path) = args.get("path") {
                    // Get repository root
                    let repo_root = match Self::get_knowledge_base_path() {
                        Ok(root) => root,
                        Err(e) => return serde_json::json!({
                            "success": false,
                            "error": format!("Could not find repository root: {}", e)
                        }),
                    };

                    // Construct full path
                    let full_path = repo_root.join(path);

                    // Security: ensure the path is within repo root and is a markdown file
                    if !full_path.starts_with(&repo_root) {
                        return serde_json::json!({
                            "success": false,
                            "error": "Path must be within repository root"
                        });
                    }

                    if !full_path.extension().map(|e| e == "md").unwrap_or(false) {
                        return serde_json::json!({
                            "success": false,
                            "error": "Only markdown (.md) files can be read"
                        });
                    }

                    // Read the file
                    match std::fs::read_to_string(&full_path) {
                        Ok(content) => serde_json::json!({
                            "success": true,
                            "path": path,
                            "content": content,
                            "size": content.len()
                        }),
                        Err(e) => serde_json::json!({
                            "success": false,
                            "error": format!("Failed to read file: {}", e)
                        }),
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'path' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    fn tool_search_knowledge(&self, arguments: &str) -> serde_json::Value {
        let args: Result<HashMap<String, String>, _> = serde_json::from_str(arguments);

        match args {
            Ok(args) => {
                if let Some(query) = args.get("query") {
                    // Get repository root
                    let repo_root = match Self::get_knowledge_base_path() {
                        Ok(root) => root,
                        Err(e) => return serde_json::json!({
                            "success": false,
                            "error": format!("Could not find repository root: {}", e)
                        }),
                    };

                    // Search for query in markdown files
                    let mut results = Vec::new();
                    let query_lower = query.to_lowercase();
                    let query_tokens: Vec<&str> = query_lower.split_whitespace().collect();

                    // Define specific folders to search in (matching get_content_structure)
                    let search_folders = vec![
                        "research",
                        "dumps",
                        "developer-reference",
                        "ai-agents",
                        "collections",
                        "generated-guides"
                    ];

                    for folder in search_folders {
                        let folder_path = repo_root.join(folder);
                        if !folder_path.exists() {
                            continue;
                        }

                        for entry in WalkDir::new(&folder_path)
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
                                let filename = path.file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("Unknown")
                                    .to_lowercase();

                                // Scoring system:
                                // - Exact phrase match in content: +10
                                // - Exact phrase match in filename: +20
                                // - Each token match in content: +1
                                // - Each token match in filename: +2
                                
                                let mut score = 0;
                                let mut matched_tokens = 0;

                                // Check exact phrase
                                if content_lower.contains(&query_lower) {
                                    score += 10;
                                }
                                if filename.contains(&query_lower) {
                                    score += 20;
                                }

                                // Check tokens
                                for token in &query_tokens {
                                    if content_lower.contains(token) {
                                        score += 1;
                                        matched_tokens += 1;
                                    }
                                    if filename.contains(token) {
                                        score += 2;
                                    }
                                }

                                // Require at least one token match or exact match
                                if score > 0 {
                                    let title = path.file_name()
                                        .and_then(|n| n.to_str())
                                        .unwrap_or("Unknown")
                                        .to_string();

                                    // Extract snippet
                                    // Prefer exact match snippet, otherwise first token match
                                    let snippet_pos = if let Some(pos) = content_lower.find(&query_lower) {
                                        pos
                                    } else {
                                        // Find first matching token
                                        let mut first_pos = 0;
                                        for token in &query_tokens {
                                            if let Some(pos) = content_lower.find(token) {
                                                first_pos = pos;
                                                break;
                                            }
                                        }
                                        first_pos
                                    };

                                    let start = snippet_pos.saturating_sub(50);
                                    let end = (snippet_pos + 150).min(content.len());
                                    let snippet = content.get(start..end).unwrap_or("").to_string();

                                    // Calculate relative path for cleaner output and easier file reading
                                    let relative_path = path.strip_prefix(&repo_root)
                                        .unwrap_or(path)
                                        .to_string_lossy()
                                        .to_string()
                                        .replace("\\", "/"); // Normalize to forward slashes

                                    results.push(serde_json::json!({
                                        "path": relative_path,
                                        "title": title,
                                        "snippet": snippet,
                                        "score": score,
                                        "matches": matched_tokens
                                    }));
                                }
                            }
                        }
                    }

                    // Sort by score descending
                    results.sort_by(|a, b| {
                        let a_score = a["score"].as_i64().unwrap_or(0);
                        let b_score = b["score"].as_i64().unwrap_or(0);
                        b_score.cmp(&a_score)
                    });

                    // Limit to top 10 results
                    if results.len() > 10 {
                        results.truncate(10);
                    }

                    if results.is_empty() {
                        serde_json::json!({
                            "success": true,
                            "query": query,
                            "results": [],
                            "count": 0,
                            "message": "No matches found in markdown files"
                        })
                    } else {
                        serde_json::json!({
                            "success": true,
                            "query": query,
                            "results": results,
                            "count": results.len()
                        })
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'query' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    async fn tool_create_study_guide_async(&self, arguments: String, grok_api_key: Option<String>) -> serde_json::Value {
        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(&arguments);

        match args {
            Ok(args) => {
                let topic = match args.get("topic").and_then(|v| v.as_str()) {
                    Some(t) => t.to_string(),
                    None => {
                        return serde_json::json!({
                            "success": false,
                            "error": "Missing 'topic' argument"
                        })
                    }
                };

                let difficulty = match args.get("difficulty").and_then(|v| v.as_str()) {
                    Some(d) => d.to_string(),
                    None => {
                        return serde_json::json!({
                            "success": false,
                            "error": "Missing 'difficulty' argument"
                        })
                    }
                };

                let include_resources = args
                    .get("include_resources")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);

                let grok_key = match grok_api_key {
                    Some(key) => key,
                    None => {
                        eprintln!("⚠️ Grok API key not provided");
                        return serde_json::json!({
                            "success": false,
                            "error": "Grok API key not configured. Please set your Grok API key in settings."
                        });
                    }
                };

                if grok_key.is_empty() {
                    return serde_json::json!({
                        "success": false,
                        "error": "Grok API key is empty. Please check your settings."
                    });
                }

                let prompt = format!(
                    "Create a comprehensive study guide for '{}' at {} level. {}Provide structured markdown with sections, resources, and practice exercises.",
                    topic,
                    difficulty,
                    if include_resources { "Include specific resources and practice exercises. " } else { "" }
                );

                let client = reqwest::Client::new();
                let grok_url = "https://api.x.ai/v1/chat/completions";

                let payload = serde_json::json!({
                    "model": "grok-4-1-fast-non-reasoning",
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "max_tokens": 8000,
                    "temperature": 0.6
                });

                eprintln!("🧠 Generating study guide with Grok: {} [{}]", topic, difficulty);

                match client.post(grok_url)
                    .header("Authorization", format!("Bearer {}", grok_key))
                    .header("Content-Type", "application/json")
                    .json(&payload)
                    .send()
                    .await
                {
                    Ok(response) => {
                        if response.status().is_success() {
                            match response.json::<serde_json::Value>().await {
                                Ok(grok_result) => {
                                    let grok_response = grok_result.get("choices")
                                        .and_then(|c| c.as_array())
                                        .and_then(|arr| arr.get(0))
                                        .and_then(|choice| choice.get("message"))
                                        .and_then(|msg| msg.get("content"))
                                        .and_then(|content| content.as_str())
                                        .unwrap_or("No response from Grok");

                                    serde_json::json!({
                                        "success": true,
                                        "topic": topic,
                                        "difficulty": difficulty,
                                        "include_resources": include_resources,
                                        "guide": grok_response
                                    })
                                }
                                Err(e) => serde_json::json!({
                                    "success": false,
                                    "error": format!("Failed to parse Grok response: {}", e)
                                })
                            }
                        } else {
                            let error_text = response.text().await.unwrap_or_else(|_| "Unknown Grok API error".to_string());
                            serde_json::json!({
                                "success": false,
                                "error": format!("Grok API error: {}", error_text)
                            })
                        }
                    }
                    Err(e) => serde_json::json!({
                        "success": false,
                        "error": format!("Request failed: {}", e)
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    fn tool_list_markdown_files(&self, arguments: &str) -> serde_json::Value {
        let args: Result<HashMap<String, String>, _> = serde_json::from_str(arguments);

        let folder_filter = args.ok().and_then(|a| a.get("folder").cloned());

        // Get repository root
        let repo_root = match Self::get_knowledge_base_path() {
            Ok(root) => root,
            Err(e) => return serde_json::json!({
                "success": false,
                "error": format!("Could not find repository root: {}", e)
            }),
        };

        let search_path = if let Some(folder) = &folder_filter {
            repo_root.join(folder)
        } else {
            repo_root.clone()
        };

        if !search_path.exists() {
            return serde_json::json!({
                "success": false,
                "error": format!("Folder not found: {}", search_path.display())
            });
        }

        let mut files = Vec::new();

    // Define ignored directories
    let ignored_dirs = ["node_modules", "target", ".git", ".vscode", "dist", "build", "coverage"];

    for entry in WalkDir::new(&search_path)
        .follow_links(false) // Disable following links to prevent loops/external walks
        .into_iter()
        .filter_entry(|e| {
            let file_name = e.file_name().to_string_lossy();
            // Skip hidden files/dirs (starting with .) but allow the search path itself
            if file_name.starts_with('.') && e.depth() > 0 {
                return false;
            }
            // Skip ignored directories
            if e.file_type().is_dir() && ignored_dirs.contains(&file_name.as_ref()) {
                return false;
            }
            true
        })
        .filter_map(|e| e.ok())
    {
        let path = entry.path();

        if path.is_file() && path.extension().map(|e| e == "md").unwrap_or(false) {
            if let Ok(relative_path) = path.strip_prefix(&repo_root) {
                // Normalize path separators to forward slashes
                let path_str = relative_path.to_string_lossy().replace('\\', "/");
                files.push(path_str);
            }
        }
    }

    // Sort alphabetically
    files.sort();

    // Limit results to prevent context overflow (e.g., max 500 files)
    let total_count = files.len();
    if total_count > 500 {
        files.truncate(500);
    }

    serde_json::json!({
        "success": true,
        "files": files,
        "count": files.len(),
        "total_found": total_count,
        "folder": folder_filter.unwrap_or_else(|| "root".to_string()),
        "message": if total_count > 500 { "Result truncated to first 500 files" } else { "Success" }
    })
}

    fn tool_write_file(&self, arguments: &str) -> serde_json::Value {
        eprintln!("🔧 write_file tool called with arguments: {}", arguments);

        let args: Result<HashMap<String, serde_json::Value>, _> = serde_json::from_str(arguments);

        match args {
            Ok(args) => {
                eprintln!("✅ Parsed arguments successfully");
                if let (Some(path_val), Some(content_val)) = (args.get("path"), args.get("content")) {
                    let path = path_val.as_str().unwrap_or("");
                    let content = content_val.as_str().unwrap_or("");
                    let append = args.get("append").and_then(|v| v.as_bool()).unwrap_or(false);

                    // Validate Scope
                    if let Err(e) = self.validate_write_scope(path) {
                        return serde_json::json!({
                            "success": false,
                            "error": e
                        });
                    }

                    if self.app_mode == AppMode::Student && !self.is_allowed_write_path(path) {
                        return serde_json::json!({
                            "success": false,
                            "error": "Student mode: AI may only write to 'research/' or 'generated-guides/'"
                        });
                    }
                    eprintln!("📝 Path: {}, Content length: {}, Append: {}", path, content.len(), append);

                    // Get repository root
                    let repo_root = match Self::get_knowledge_base_path() {
                        Ok(root) => root,
                        Err(e) => return serde_json::json!({
                            "success": false,
                            "error": format!("Could not find repository root: {}", e)
                        }),
                    };

                    // Construct full path
                    let full_path = repo_root.join(path);

                    // Security: ensure the path is within repo root
                    if !full_path.starts_with(&repo_root) {
                        return serde_json::json!({
                            "success": false,
                            "error": "Path must be within repository root"
                        });
                    }

                    // Check if file extension is allowed (support multiple types)
                    let allowed_extensions = ["md", "txt", "json", "csv", "html", "js", "css", "tsx", "jsx", "rs", "toml", "yaml", "yml"];
                    let file_ext = full_path.extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("");

                    if !allowed_extensions.contains(&file_ext) {
                        eprintln!("⚠️ Warning: Writing file with extension '{}'. Allowed: {:?}", file_ext, allowed_extensions);
                        // Don't block - just warn in logs
                    }

                    // Create parent directories if they don't exist
                    if let Some(parent) = full_path.parent() {
                        if let Err(e) = std::fs::create_dir_all(parent) {
                            return serde_json::json!({
                                "success": false,
                                "error": format!("Failed to create directory: {}", e)
                            });
                        }
                    }

                    // Write the file
                    let write_result = if append {
                        std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .write(true)
                            .open(&full_path)
                            .and_then(|mut file| std::io::Write::write_all(&mut file, content.as_bytes()))
                    } else {
                        std::fs::write(&full_path, content)
                    };

                    match write_result {
                        Ok(_) => {
                            let file_size = content.len();

                            // Emit event to refresh UI
                            if let Some(ref handle) = self.app_handle {
                                let _ = handle.emit_all("content-changed", ());
                            }

                            serde_json::json!({
                                "success": true,
                                "path": path,
                                "size": file_size,
                                "operation": if append { "append" } else { "write" },
                                "message": format!("Successfully {} file at {}", if append { "appended to" } else { "wrote" }, path)
                            })
                        }
                        Err(e) => serde_json::json!({
                            "success": false,
                            "error": format!("Failed to write file: {}", e)
                        }),
                    }
                } else {
                    serde_json::json!({
                        "success": false,
                        "error": "Missing 'path' or 'content' argument"
                    })
                }
            }
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Invalid arguments: {}", e)
            }),
        }
    }

    /// Helper for single agent research (used by deep_research tool)
    async fn run_single_agent_research(api_key: String, tavily_api_key: Option<String>, grok_api_key: Option<String>, gemini_api_key: Option<String>, topic: String) -> serde_json::Value {
        eprintln!("🚀 Spawning Single Deep Research Agent for: {}", topic);
        
        let mut agent = MinimaxAgent::new(
            api_key,
            tavily_api_key,
            grok_api_key,
            gemini_api_key
        );

        // Enable Web Search tool
        let mut enabled_tools = std::collections::HashMap::new();
        enabled_tools.insert("web_search".to_string(), true);
        agent = agent.with_enabled_tools(enabled_tools);

        // Set System Prompt for Deep Research
        let system_prompt = r#"You are a Deep Research Agent.
Your goal is to thoroughly research the user's topic using the 'web_search' tool.
1. Plan your research: Break the topic into sub-questions.
2. Execute search: Use 'web_search' to find information.
3. Analyze results: Read the snippets and synthesize the information.
4. Iterate: If you need more info, search again with refined queries.
5. Final Report: Produce a comprehensive markdown report citing your sources.
Always use the <think> tag to explain your reasoning before taking actions."#.to_string();
        
        agent = agent.with_system_prompt(system_prompt);

        // Run the task
        match agent.run_autonomous_task(topic).await {
            Ok(report) => serde_json::json!({
                "success": true,
                "report": report
            }),
            Err(e) => serde_json::json!({
                "success": false,
                "error": format!("Deep Research Agent failed: {}", e)
            })
        }
    }

    /// Run an autonomous task using the agent loop
    pub async fn run_autonomous_task(&mut self, task: String) -> Result<String, String> {
        eprintln!("🤖 Starting autonomous task: {}", task);

        // Add user task to history
        self.conversation_history.push(Message {
            role: "user".to_string(),
            content: task,
            tool_calls: None,
            tool_call_id: None,
            timestamp: Some(Self::get_current_timestamp()),
        });

        // Run chat loop with max 30 iterations
        match self.chat(30).await {
            Ok(response) => {
                eprintln!("✅ Autonomous task complete");
                Ok(response.content)
            }
            Err(e) => {
                eprintln!("❌ Autonomous task failed: {}", e);
                Err(e)
            }
        }
    }

    /// Main agent loop - processes user message through multiple iterations with tool calling
    pub async fn chat(&mut self, max_iterations: usize) -> Result<ChatResponse, String> {
        let mut total_tool_calls = 0;
        let _thinking_parts = Vec::<String>::new();

        for iteration in 0..max_iterations {
            eprintln!("\n🔄 Iteration {}/{}", iteration + 1, max_iterations);

            // Build messages with system prompt
            let mut messages = vec![Message {
                role: "system".to_string(),
                content: self.system_prompt.clone(),
                tool_calls: None,
                tool_call_id: None,
                timestamp: None,
            }];
            messages.extend(self.conversation_history.clone());

            // Transform messages to include timestamp in content for temporal awareness
            let messages_with_timestamps = messages.iter().map(|msg| {
                if let Some(timestamp) = &msg.timestamp {
                    // Add timestamp to content so MiniMax can see it
                    let timestamped_content = format!("[{}] {}\n\n{}",
                        timestamp,
                        msg.content,
                        if msg.role == "user" { "\n(Please consider the timestamp above when responding)" } else { "" });
                    Message {
                        role: msg.role.clone(),
                        content: timestamped_content,
                        tool_calls: msg.tool_calls.clone(),
                        tool_call_id: msg.tool_call_id.clone(),
                        timestamp: msg.timestamp.clone(),
                    }
                } else {
                    msg.clone()
                }
            }).collect::<Vec<_>>();

            // Call AI API
            let (text_content, mut tool_calls) = if let AIProvider::Gemini = self.provider {
                // ==================== GEMINI IMPLEMENTATION ====================
                let api_key = self.gemini_api_key.clone().unwrap_or_default();
                let url = format!("{}/models/{}:generateContent?key={}", self.base_url, self.model, api_key);

                // Convert messages to Gemini format
                let mut contents = Vec::new();
                let mut system_part = None;

                for msg in &messages_with_timestamps {
                    if msg.role == "system" {
                        system_part = Some(msg.content.clone());
                    } else if msg.role == "tool" {
                        // Gemini handles tool outputs differently, for now we skip or merge into user
                        // Merging into user message for simplicity in text-only mode
                        contents.push(serde_json::json!({
                            "role": "user",
                            "parts": [{ "text": format!("Tool Output ({}): {}", msg.tool_call_id.clone().unwrap_or_default(), msg.content) }]
                        }));
                    } else {
                        let role = if msg.role == "assistant" { "model" } else { "user" };
                        contents.push(serde_json::json!({
                            "role": role,
                            "parts": [{ "text": msg.content }]
                        }));
                    }
                }

                // Inject system prompt and tools into the first user message or system_instruction
                // Gemini 1.5 supports system_instruction
                let system_instruction = if let Some(sys) = system_part {
                    // Append tool definitions to system prompt for Gemini since we aren't using native tools yet
                    let tools_json = serde_json::to_string_pretty(&self.get_enabled_tools()).unwrap_or_default();
                    let enhanced_sys = format!("{}\n\nAVAILABLE TOOLS (Use [TOOL] format):\n{}", sys, tools_json);
                    Some(serde_json::json!({
                        "parts": [{ "text": enhanced_sys }]
                    }))
                } else {
                    None
                };

                let payload = serde_json::json!({
                    "contents": contents,
                    "system_instruction": system_instruction,
                    "generationConfig": {
                        "temperature": 1.0,
                        "maxOutputTokens": 8192
                    }
                });

                let client = reqwest::Client::new();
                let response = client.post(&url)
                    .json(&payload)
                    .send()
                    .await
                    .map_err(|e| format!("Gemini Request failed: {}", e))?;

                if !response.status().is_success() {
                    let error_text = response.text().await.unwrap_or_default();
                    return Err(format!("Gemini API error: {}", error_text));
                }

                let result: serde_json::Value = response.json().await
                    .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

                let content = result.get("candidates")
                    .and_then(|c| c.as_array())
                    .and_then(|c| c.first())
                    .and_then(|c| c.get("content"))
                    .and_then(|c| c.get("parts"))
                    .and_then(|p| p.as_array())
                    .and_then(|p| p.first())
                    .and_then(|p| p.get("text"))
                    .and_then(|t| t.as_str())
                    .unwrap_or("")
                    .to_string();

                (content, Vec::new()) // No native tool calls for Gemini yet
            } else {
                // ==================== OPENAI-COMPATIBLE IMPLEMENTATION (Minimax/Grok) ====================
                let client = reqwest::Client::builder()
                    .timeout(std::time::Duration::from_secs(120))
                    .build()
                    .unwrap_or_else(|_| reqwest::Client::new());

                let payload = serde_json::json!({
                    "model": self.model,
                    "messages": messages_with_timestamps,
                    "tools": self.get_enabled_tools(),
                    "max_tokens": 8192,
                    "temperature": 1.0,
                    "top_p": 0.95,
                });

                let response = client
                    .post(format!("{}/chat/completions", self.base_url))
                    .header("Authorization", format!("Bearer {}", &self.api_key))
                    .header("Content-Type", "application/json")
                    .json(&payload)
                    .send()
                    .await
                    .map_err(|e| {
                        eprintln!("❌ Error details: {}", e);
                        format!("Request failed: {}", e)
                    })?;

                if !response.status().is_success() {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(format!("API error: {}", error_text));
                }

                let result: serde_json::Value = response.json().await
                    .map_err(|e| format!("Failed to parse response: {}", e))?;

                // Parse OpenAI-format response
                let message = result["choices"][0]["message"].as_object()
                    .ok_or("Invalid response format: missing choices[0].message")?;

                let text_content = message.get("content")
                    .and_then(|c| c.as_str())
                    .unwrap_or("")
                    .to_string();

                // Parse tool calls (OpenAI format)
                let mut tool_calls: Vec<ToolCall> = Vec::new();

                if let Some(calls) = message.get("tool_calls").and_then(|tc| tc.as_array()) {
                    for call in calls {
                        if let (Some(id), Some(func)) = (
                            call["id"].as_str(),
                            call["function"].as_object()
                        ) {
                            let name = func.get("name").and_then(|n| n.as_str());
                            let args_val = func.get("arguments");

                            if let (Some(name), Some(args_val)) = (name, args_val) {
                                let arguments = match args_val {
                                    serde_json::Value::String(s) => s.to_string(),
                                    _ => serde_json::to_string(args_val)
                                        .unwrap_or_else(|_| "{}".to_string()),
                                };

                                tool_calls.push(ToolCall {
                                    id: id.to_string(),
                                    tool_type: "function".to_string(),
                                    function: FunctionCall {
                                        name: name.to_string(),
                                        arguments,
                                    },
                                });
                            }
                        }
                    }
                }
                (text_content, tool_calls)
            };

            // Common processing for both providers
            let text_content = text_content; // Re-bind to avoid mutability confusion if needed

            // Extract and preserve thinking tags
            let clean_content = if text_content.contains("<think>") && text_content.contains("</think>") {
                let re = Regex::new(r"<think>(.*?)</think>").unwrap();
                for cap in re.captures_iter(&text_content) {
                    if let Some(thinking) = cap.get(1) {
                        eprintln!("💭 THINKING: {}", thinking.as_str());
                    }
                }
                // Remove <think> tags from content for cleaner display
                re.replace_all(&text_content, "").trim().to_string()
            } else {
                text_content.clone()
            };

            // Also check for [TOOL]/[TOOL_CALL] text formats in the content (FALLBACK FOR GEMINI)
            if tool_calls.is_empty() {
                let text_tool_calls = Self::parse_text_tool_calls(&text_content, total_tool_calls);
                if !text_tool_calls.is_empty() {
                    eprintln!("Parsed {} tool call(s) from text markers", text_tool_calls.len());
                    tool_calls.extend(text_tool_calls);
                }
            }
            // ================================================================
            // CRITICAL: PRESERVE COMPLETE ASSISTANT MESSAGE INCLUDING THINKING
            // ================================================================
            let assistant_message = Message {
                role: "assistant".to_string(),
                content: text_content.clone(),
                tool_calls: if tool_calls.is_empty() { None } else { Some(tool_calls.clone()) },
                tool_call_id: None,
                timestamp: Some(Self::get_current_timestamp()),
            };

            self.conversation_history.push(assistant_message);

            // Check if we're done (no tool calls)
            if tool_calls.is_empty() {
                eprintln!("✅ Conversation complete (no tool calls)");
                return Ok(ChatResponse {
                    content: clean_content,
                    thinking: vec![],
                    tool_calls_made: total_tool_calls,
                    iterations: iteration + 1,
                });
            }

            // Execute tool calls
            eprintln!("🔧 Tool calls requested: {}", tool_calls.len());
            total_tool_calls += tool_calls.len();

            for tool_call in tool_calls {
                let result = self.execute_tool(&tool_call.function.name, &tool_call.function.arguments);

                if tool_call.function.name == "create_study_guide" {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
                        if let Some(guide) = parsed.get("guide").and_then(|g| g.as_str()) {
                            if let Some(handle) = &self.app_handle {
                                let _ = handle.emit_all("study-guide-generated", guide.to_string());
                            }
                        }
                    }
                }

                if tool_call.function.name == "brainstorm_with_grok" {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
                        if let Some(output) = parsed.get("response").and_then(|g| g.as_str()) {
                            if let Some(handle) = &self.app_handle {
                                let _ = handle.emit_all("brainstorm-generated", output.to_string());
                            }
                        }
                    }
                }

                if tool_call.function.name == "consult_agent" {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
                        if let Some(response) = parsed.get("response").and_then(|g| g.as_str()) {
                            let agent_name = parsed.get("agent_name").and_then(|g| g.as_str()).unwrap_or("Agent");
                            let output = format!("{}:\n\n{}", agent_name, response);
                            if let Some(handle) = &self.app_handle {
                                let _ = handle.emit_all("agent-consulted", output);
                            }
                        }
                    }
                }

                // Add tool result to conversation history
                self.conversation_history.push(Message {
                    role: "tool".to_string(),
                    content: result,
                    tool_calls: None,
                    tool_call_id: Some(tool_call.id),
                    timestamp: Some(Self::get_current_timestamp()),
                });
            }
        }

        // Max iterations reached
        eprintln!("⚠️  Maximum iterations ({}) reached", max_iterations);
        Err(format!("Maximum iterations ({}) reached. The task may be too complex.", max_iterations))
    }

    /// Streaming version of chat - emits events as tokens arrive
    pub async fn chat_stream(&mut self, app_handle: &tauri::AppHandle, max_iterations: usize) -> Result<(), String> {
        let mut total_tool_calls = 0;
        
        // Cancellation flag
        let should_stop = Arc::new(AtomicBool::new(false));
        let should_stop_clone = should_stop.clone();
        
        // Listen for stop event
        let handler_id = app_handle.listen_global("stop-generation", move |_| {
            eprintln!("🛑 Stop signal received!");
            should_stop_clone.store(true, Ordering::Relaxed);
        });

        let mut last_tool_call_signature: Option<String> = None;
        let mut consecutive_repeats = 0;

        for iteration in 0..max_iterations {
            // Check cancellation at start of iteration
            if should_stop.load(Ordering::Relaxed) {
                eprintln!("🛑 Agent loop cancelled by user");
                app_handle.unlisten(handler_id);
                
                // Emit done event
                let _ = app_handle.emit_all("chat-stream", StreamChunk {
                    content: "\n\n*[Generation stopped by user]*".to_string(),
                    is_thinking: false,
                    done: true,
                    tool_calls: None,
                });
                return Ok(());
            }

            eprintln!("\n🔄 Iteration {}/{}", iteration + 1, max_iterations);

            // Prune history if needed
            self.prune_history();

            // Build messages with system prompt
            let mut messages = vec![Message {
                role: "system".to_string(),
                content: self.system_prompt.clone(),
                tool_calls: None,
                tool_call_id: None,
                timestamp: None,
            }];
            messages.extend(self.conversation_history.clone());

            // Transform messages to include timestamp in content for temporal awareness
            let messages_with_timestamps = messages.iter().map(|msg| {
                // Only inject timestamp for Minimax, Grok gets it via system prompt
                if self.provider == AIProvider::Minimax {
                    if let Some(timestamp) = &msg.timestamp {
                        // Add timestamp to content so MiniMax can see it
                        let timestamped_content = format!("[{}] {}\n\n{}",
                            timestamp,
                            msg.content,
                            if msg.role == "user" { "\n(Please consider the timestamp above when responding)" } else { "" });
                        Message {
                            role: msg.role.clone(),
                            content: timestamped_content,
                            tool_calls: msg.tool_calls.clone(),
                            tool_call_id: msg.tool_call_id.clone(),
                            timestamp: msg.timestamp.clone(),
                        }
                    } else {
                        msg.clone()
                    }
                } else {
                    msg.clone()
                }
            }).collect::<Vec<_>>();

            // Call AI API
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(300))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new());

            let payload = serde_json::json!({
                "model": self.model,
                "messages": messages_with_timestamps,
                "tools": self.get_enabled_tools(),
                "max_tokens": 32768,
                "temperature": 1.0,
                "top_p": 0.95,
                "stream": true
            });

            let response = client
                .post(format!("{}/chat/completions", self.base_url))
                .header("Authorization", format!("Bearer {}", &self.api_key))
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await
                .map_err(|e| {
                    eprintln!("❌ Error details: {}", e);
                    format!("Request failed: {}", e)
                })?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(format!("API error: {}", error_text));
            }

            let mut full_content = String::new();
            let mut tool_calls: Vec<ToolCall> = Vec::new();
            let mut chunks_received = 0;

            let mut stream = response.bytes_stream();
            let mut buffer: Vec<u8> = Vec::new();

            while let Some(chunk_result) = stream.next().await {
                let chunk = match chunk_result {
                    Ok(chunk) => chunk,
                    Err(e) => {
                        eprintln!("❌ Stream error: {}", e);
                        return Err(format!("Stream error: {}", e));
                    }
                };

                chunks_received += 1;
                // eprintln!("📦 Chunk {} received ({} bytes)", chunks_received, chunk.len());

                buffer.extend_from_slice(&chunk);
                
                // Process complete lines
                let mut start_index = 0;
                while start_index < buffer.len() {
                    let newline_pos = buffer[start_index..].iter().position(|&b| b == b'\n');
                    if let Some(newline_index) = newline_pos {
                    let line_end = start_index + newline_index;
                    // Extract line bytes (excluding newline)
                    let line_bytes = &buffer[start_index..line_end];
                    
                    if let Ok(line) = String::from_utf8(line_bytes.to_vec()) {
                        if line.starts_with("data: ") {
                            let data = &line[6..];

                            if data == "[DONE]" {
                                eprintln!("🎉 [DONE] received - total chunks: {}", chunks_received);
                                eprintln!("📝 Full content length: {} chars", full_content.len());
                                // Stream complete - consume all remaining chunks and exit
                                let mut remaining_count = 0;
                                while let Some(_) = stream.next().await {
                                    remaining_count += 1;
                                }
                                if remaining_count > 0 {
                                    eprintln!("⚠️  Discarded {} remaining chunks", remaining_count);
                                }
                                break;
                            }

                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                                if let Some(delta) = parsed["choices"][0]["delta"].as_object() {
                                    if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                        full_content.push_str(content);

                                        let _ = app_handle.emit_all("chat-stream", StreamChunk {
                                            content: content.to_string(),
                                            is_thinking: false,
                                            done: false,
                                            tool_calls: None,
                                        });
                                    }

                                    if let Some(calls) = delta.get("tool_calls").and_then(|tc| tc.as_array()) {
                                        for call in calls {
                                            let index = call["index"].as_u64().unwrap_or(0) as usize;
                                            
                                            // Resize vector if needed
                                            if index >= tool_calls.len() {
                                                tool_calls.resize(index + 1, ToolCall {
                                                    id: String::new(),
                                                    tool_type: "function".to_string(),
                                                    function: FunctionCall {
                                                        name: String::new(),
                                                        arguments: String::new(),
                                                    },
                                                });
                                            }

                                            if let Some(id) = call["id"].as_str() {
                                                tool_calls[index].id = id.to_string();
                                            }

                                            if let Some(func) = call["function"].as_object() {
                                                if let Some(name) = func.get("name").and_then(|n| n.as_str()) {
                                                    tool_calls[index].function.name = name.to_string();
                                                }
                                                if let Some(args) = func.get("arguments").and_then(|a| a.as_str()) {
                                                    tool_calls[index].function.arguments.push_str(args);
                                                }
                                            }
                                        }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Move to next line
                        start_index = line_end + 1;
                    } else {
                        break;
                    }
                }

                // Remove processed lines from buffer
                if start_index > 0 {
                    buffer.drain(..start_index);
                }
            }

            eprintln!("📤 Stream processing complete - {} chunks processed", chunks_received);

            // Check for [TOOL]/[TOOL_CALL] text format if no structured tool calls were found
            if tool_calls.is_empty() {
                let text_tool_calls = Self::parse_text_tool_calls(&full_content, total_tool_calls);
                if !text_tool_calls.is_empty() {
                    eprintln!("Parsed {} tool call(s) from text markers in stream", text_tool_calls.len());
                    tool_calls.extend(text_tool_calls);
                } else {
                    // Fallback: Check for XML-style <tool_code> blocks (Grok specific)
                    let xml_tool_calls = Self::parse_grok_xml_tools(&full_content, total_tool_calls);
                    if !xml_tool_calls.is_empty() {
                        eprintln!("Parsed {} tool call(s) from XML markers in stream", xml_tool_calls.len());
                        tool_calls.extend(xml_tool_calls);
                    }
                }
            }
            // CRITICAL: Save the assistant message to history BEFORE tool execution
            // This preserves the complete message including thinking and tool calls
            let assistant_message = Message {
                role: "assistant".to_string(),
                content: full_content.clone(),
                tool_calls: if tool_calls.is_empty() { None } else { Some(tool_calls.clone()) },
                tool_call_id: None,
                timestamp: Some(Self::get_current_timestamp()),
            };
            self.conversation_history.push(assistant_message);

            // Handle tool calls if any
            if !tool_calls.is_empty() {
                eprintln!("🔧 Tool calls requested: {}", tool_calls.len());
                total_tool_calls += tool_calls.len();

                // Emit tool calls to UI
                let _ = app_handle.emit_all("chat-stream", StreamChunk {
                    content: String::new(),
                    is_thinking: false,
                    done: false,
                    tool_calls: Some(tool_calls.clone()),
                });

                // Execute tool calls
                // Execute tool calls
                let mut break_outer = false;
                for tool_call in tool_calls.clone() {
                    // Loop Detection: Check if this tool call is identical to the last one
                    let signature = format!("{}:{}", tool_call.function.name, tool_call.function.arguments);
                    if let Some(last) = &last_tool_call_signature {
                        if last == &signature {
                            consecutive_repeats += 1;
                            if consecutive_repeats >= 2 {
                                eprintln!("🛑 Loop detected: Same tool call repeated {} times. Breaking loop.", consecutive_repeats);
                                // Break the outer loop
                                break_outer = true; 
                                break;
                            }
                        } else {
                            consecutive_repeats = 0;
                        }
                    } else {
                        consecutive_repeats = 0;
                    }
                    last_tool_call_signature = Some(signature);

                    let result = self.execute_tool(&tool_call.function.name, &tool_call.function.arguments);

                    // Emit study guide content to UI as soon as the tool returns it
                    if tool_call.function.name == "create_study_guide" {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
                            if let Some(guide) = parsed.get("guide").and_then(|g| g.as_str()) {
                                let _ = app_handle.emit_all("study-guide-generated", guide.to_string());
                            }
                        }
                    }

                    // Emit brainstorm content as well
                    if tool_call.function.name == "brainstorm_with_grok" {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
                            if let Some(output) = parsed.get("response").and_then(|g| g.as_str()) {
                                let _ = app_handle.emit_all("brainstorm-generated", output.to_string());
                            }
                        }
                    }

                    if tool_call.function.name == "consult_agent" {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result) {
                            if let Some(response) = parsed.get("response").and_then(|g| g.as_str()) {
                                let agent_name = parsed.get("agent_name").and_then(|g| g.as_str()).unwrap_or("Agent");
                                let output = format!("{}:\n\n{}", agent_name, response);
                                let _ = app_handle.emit_all("agent-consulted", output);
                            }
                        }
                    }

                    // Add tool result to conversation history
                    self.conversation_history.push(Message {
                        role: "tool".to_string(),
                        content: result,
                        tool_calls: None,
                        tool_call_id: Some(tool_call.id),
                        timestamp: Some(Self::get_current_timestamp()),
                    });
                }
                
                if break_outer {
                    break;
                }

                eprintln!("✅ Tool execution complete, continuing to next iteration");

                // CRITICAL: After tool execution, the loop continues automatically to next iteration
                // to get the final response from the AI
            } else {
                // No tool calls, we're done
                eprintln!("✅ No tool calls, finishing iteration");

                // Emit final done event
                let _ = app_handle.emit_all("chat-stream", StreamChunk {
                    content: String::new(),
                    is_thinking: false,
                    done: true,
                    tool_calls: None,
                });

                app_handle.unlisten(handler_id);
                return Ok(());
            }
        }

        eprintln!("⚠️  Loop ended, max iterations reached");

        // Emit final done event on error
        let _ = app_handle.emit_all("chat-stream", StreamChunk {
            content: String::new(),
            is_thinking: false,
            done: true,
            tool_calls: None,
        });

        app_handle.unlisten(handler_id);
        Err(format!("Maximum iterations ({}) reached", max_iterations))
    }
}

// ==================== Tauri Commands ====================

#[tauri::command]
pub async fn chat_with_agent_stream(
    app_handle: tauri::AppHandle,
    provider: AIProvider,
    api_key: String,
    tavily_key: Option<String>,
    grok_key: Option<String>,
    gemini_key: Option<String>,
    messages: Vec<Message>,
    max_iterations: Option<usize>,
    enabled_tools: Option<std::collections::HashMap<String, bool>>,
    user_id: Option<String>,
    user_name: Option<String>,
) -> Result<(), String> {
    let mut agent = MinimaxAgent::new(api_key, tavily_key, grok_key, gemini_key)
        .with_provider(provider)
        .with_app_handle(app_handle.clone())
        .with_enabled_tools(enabled_tools.unwrap_or_default())
        .with_user_id(user_id.unwrap_or_else(|| "guest".to_string()))
        .with_user_name(user_name);

    // Load conversation history
    for msg in messages {
        agent.conversation_history.push(msg);
    }

    agent.chat_stream(&app_handle, max_iterations.unwrap_or(30)).await
}

#[tauri::command]
pub async fn chat_with_agent(
    app_handle: tauri::AppHandle,
    provider: AIProvider,
    api_key: String,
    tavily_key: Option<String>,
    grok_key: Option<String>,
    gemini_key: Option<String>,
    messages: Vec<Message>,
    max_iterations: Option<usize>,
    enabled_tools: Option<std::collections::HashMap<String, bool>>,
    user_id: Option<String>,
    user_name: Option<String>,
) -> Result<ChatResponse, String> {
    let mut agent = MinimaxAgent::new(api_key, tavily_key, grok_key, gemini_key)
        .with_provider(provider)
        .with_app_handle(app_handle)
        .with_enabled_tools(enabled_tools.unwrap_or_default())
        .with_user_id(user_id.unwrap_or_else(|| "guest".to_string()))
        .with_user_name(user_name);

    // Load conversation history
    for msg in messages {
        agent.conversation_history.push(msg);
    }

    agent.chat(max_iterations.unwrap_or(30)).await
}

#[tauri::command]
pub async fn create_study_guide_enhanced(
    app_handle: tauri::AppHandle,
    api_key: String,
    tavily_key: Option<String>,
    grok_key: Option<String>,
    gemini_key: Option<String>,
    topic: String,
    difficulty: String,
    include_resources: bool,
    user_id: Option<String>,
) -> Result<String, String> {
    let mut agent = MinimaxAgent::new(api_key, tavily_key, grok_key, gemini_key)
        .with_provider(AIProvider::Grok)
        .with_app_handle(app_handle)
        .with_user_id(user_id.unwrap_or_else(|| "guest".to_string()));

    let prompt = format!(
        "Create a comprehensive study guide for '{}' at {} level. {}",
        topic,
        difficulty,
        if include_resources { "Include specific resources and practice exercises." } else { "" }
    );

    agent.add_user_message(prompt);
    let response = agent.chat(5).await?;

    Ok(response.content)
}

#[tauri::command]
pub fn get_app_mode() -> serde_json::Value {
    let mode = AppMode::current();
    serde_json::json!({
        "mode": match mode {
            AppMode::Student => "student",
            AppMode::Developer => "developer"
        },
        "allowed_write_prefixes": mode.allowed_write_prefixes()
    })
}



#[derive(Debug, Serialize, Deserialize)]
pub struct BlueprintFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

#[tauri::command]
pub async fn list_blueprint_files(path: Option<String>) -> Result<Vec<BlueprintFile>, String> {
    let root = MinimaxAgent::get_knowledge_base_path()?;
    let target_path = if let Some(p) = path {
        // Prevent directory traversal
        if p.contains("..") {
            return Err("Invalid path".to_string());
        }
        root.join(p)
    } else {
        root.join("blueprints")
    };

    // Security check
    if !target_path.starts_with(&root) {
        return Err("Access denied: Path outside knowledge base".to_string());
    }

    if !target_path.exists() {
        // Create if root blueprints folder doesn't exist and we are asking for root
        if target_path.ends_with("blueprints") {
            std::fs::create_dir_all(&target_path).map_err(|e| e.to_string())?;
        } else {
             return Ok(Vec::new()); // Return empty if path doesn't exist
        }
    }

    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(target_path).map_err(|e| e.to_string())?;

    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();

        // Filter hidden files
        if name.starts_with('.') { continue; }

        // For files, filter allowed extensions
        if !is_dir {
            let allowed = ["md", "txt", "json", "csv", "html", "js", "css", "tsx", "jsx", "rs", "toml", "yaml", "yml"];
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !allowed.contains(&ext) { continue; }
        }

        // Get relative path from root for the frontend
        let rel_path = path.strip_prefix(&root).unwrap_or(&path).to_string_lossy().to_string();
        // Normalize slashes for frontend
        let rel_path = rel_path.replace("\\", "/");

        entries.push(BlueprintFile {
            name,
            path: rel_path,
            is_dir,
            size: if is_dir { None } else { Some(metadata.len()) },
        });
    }

    // Sort: directories first, then files
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.cmp(&b.name)
        } else {
            b.is_dir.cmp(&a.is_dir)
        }
    });

    Ok(entries)
}

#[tauri::command]
pub async fn read_blueprint_file(path: String) -> Result<String, String> {
    let root = MinimaxAgent::get_knowledge_base_path()?;
    // Prevent traversal
    if path.contains("..") { return Err("Invalid path".to_string()); }
    
    let full_path = root.join(path);
    if !full_path.starts_with(&root) {
        return Err("Access denied".to_string());
    }
    
    std::fs::read_to_string(full_path).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_legacy_tool_call() {
        let text = "Some text\n[TOOL]tool => \"calculate\"\nargs => {\n  \"expression\": \"1+1\"\n}[/TOOL]";
        let calls = MinimaxAgent::parse_text_tool_calls(text, 0);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].function.name, "calculate");
        assert_eq!(calls[0].function.arguments, "{\"expression\":\"1+1\"}");
    }

    #[test]
    fn test_parse_json_tool_call() {
        let text = "Some text\n[TOOL]{\"tool\": \"calculate\", \"args\": {\"expression\": \"2+2\"}}[/TOOL]";
        let calls = MinimaxAgent::parse_text_tool_calls(text, 0);
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].function.name, "calculate");
        assert_eq!(calls[0].function.arguments, "{\"expression\":\"2+2\"}");
    }

    #[test]
    fn test_parse_multiple_tool_calls_array() {
        // This is the case that might be failing - a JSON array of calls
        let text = "Here are the tools:\n[TOOL][{\"tool\": \"calculate\", \"args\": {\"expression\": \"1+1\"}}, {\"tool\": \"read_file\", \"args\": {\"path\": \"test.md\"}}][/TOOL]";
        let calls = MinimaxAgent::parse_text_tool_calls(text, 0);
        
        // Current implementation might fail here if it expects a single object
        assert_eq!(calls.len(), 2, "Should parse 2 calls from JSON array");
        assert_eq!(calls[0].function.name, "calculate");
        assert_eq!(calls[1].function.name, "read_file");
    }

    #[test]
    fn test_parse_concatenated_json_objects() {
        // Another possible failure case - multiple JSON objects in one block
        let text = "[TOOL]{\"tool\": \"a\", \"args\": {}} {\"tool\": \"b\", \"args\": {}}[/TOOL]";
        let calls = MinimaxAgent::parse_text_tool_calls(text, 0);
        
        assert_eq!(calls.len(), 2, "Should parse 2 calls from concatenated objects");
    }

    #[test]
    fn test_parse_raw_json_tool_call_no_tags() {
        // The case the user is seeing: raw JSON without [TOOL] tags
        let text = "Sure, I can calculate that.\n\n{\n  \"tool\": \"calculate\",\n  \"arguments\": {\n    \"expression\": \"25 * 4\"\n  }\n}";
        let calls = MinimaxAgent::parse_text_tool_calls(text, 0);
        
        assert_eq!(calls.len(), 1, "Should parse raw JSON tool call without tags");
        assert_eq!(calls[0].function.name, "calculate");
    }
}
