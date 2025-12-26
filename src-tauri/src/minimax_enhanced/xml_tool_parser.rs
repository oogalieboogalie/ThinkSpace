/// XML Tool Call Parser for MiniMax M2
/// Parses <minimax:tool_call> XML tags from model responses

use regex::Regex;
use serde_json::{json, Value};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ParsedToolCall {
    pub name: String,
    pub arguments: String, // JSON string
}

/// Parse MiniMax M2 XML tool calls
/// Format: <minimax:tool_call><invoke name="func"><parameter name="arg">val</parameter></invoke></minimax:tool_call>
pub fn parse_tool_calls_from_xml(content: &str) -> Vec<ParsedToolCall> {
    let mut tool_calls = Vec::new();

    // Extract tool call blocks: <minimax:tool_call>...</minimax:tool_call>
    let tool_call_regex = Regex::new(r"(?s)<minimax:tool_call>(.*?)</minimax:tool_call>").unwrap();

    for tool_call_cap in tool_call_regex.captures_iter(content) {
        if let Some(inner_content) = tool_call_cap.get(1) {
            let inner = inner_content.as_str();
            eprintln!("🔧 Found XML tool call block: {}", inner.trim());

            // Extract invoke blocks: <invoke name="function_name">...</invoke>
            let invoke_regex = Regex::new(r#"(?s)<invoke name="([^"]+)">(.*?)</invoke>"#).unwrap();

            for invoke_cap in invoke_regex.captures_iter(inner) {
                if let (Some(func_name), Some(params_text)) = (invoke_cap.get(1), invoke_cap.get(2)) {
                    let function_name = func_name.as_str();
                    let params = params_text.as_str();

                    eprintln!("  📝 Function: {}", function_name);

                    // Extract parameters: <parameter name="param_name">value</parameter>
                    let param_regex = Regex::new(r#"(?s)<parameter name="([^"]+)">(.*?)</parameter>"#).unwrap();

                    let mut arguments: HashMap<String, Value> = HashMap::new();

                    for param_cap in param_regex.captures_iter(params) {
                        if let (Some(param_name), Some(param_value)) = (param_cap.get(1), param_cap.get(2)) {
                            let name = param_name.as_str();
                            let value = param_value.as_str().trim();

                            eprintln!("    🔹 Parameter: {} = {}", name, value);

                            // Try to parse as JSON (for arrays/objects), otherwise keep as string
                            let parsed_value = match serde_json::from_str::<Value>(value) {
                                Ok(v) => v,
                                Err(_) => Value::String(value.to_string()),
                            };

                            arguments.insert(name.to_string(), parsed_value);
                        }
                    }

                    // Convert to JSON string
                    if let Ok(json_args) = serde_json::to_string(&arguments) {
                        eprintln!("  ✅ Arguments JSON: {}", json_args);
                        tool_calls.push(ParsedToolCall {
                            name: function_name.to_string(),
                            arguments: json_args,
                        });
                    }
                }
            }
        }
    }

    tool_calls
}