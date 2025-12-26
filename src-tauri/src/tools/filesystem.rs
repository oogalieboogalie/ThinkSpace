use async_trait::async_trait;
use serde_json::{json, Value};
use crate::minimax_api::{read_markdown_file, search_content};
use super::Tool;

pub struct ReadFileTool;

#[async_trait]
impl Tool for ReadFileTool {
    fn name(&self) -> &str {
        "read_file"
    }

    fn description(&self) -> &str {
        "Read the contents of a markdown file from the knowledge base"
    }

    fn parameters(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "The file path to read (e.g., 'research/AI/agents.md')"
                }
            },
            "required": ["path"]
        })
    }

    async fn execute(&self, args: Value) -> Result<String, String> {
        let path = args["path"].as_str().ok_or("Missing path argument")?;
        read_markdown_file(path.to_string()).await
    }
}

pub struct SearchFilesTool;

#[async_trait]
impl Tool for SearchFilesTool {
    fn name(&self) -> &str {
        "search_files"
    }

    fn description(&self) -> &str {
        "Search for content in markdown files"
    }

    fn parameters(&self) -> Value {
        json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                }
            },
            "required": ["query"]
        })
    }

    async fn execute(&self, args: Value) -> Result<String, String> {
        let query = args["query"].as_str().ok_or("Missing query argument")?;
        match search_content(query.to_string()).await {
            Ok(results) => serde_json::to_string_pretty(&results)
                .map_err(|e| format!("Failed to serialize results: {}", e)),
            Err(e) => Err(format!("Search error: {}", e))
        }
    }
}
