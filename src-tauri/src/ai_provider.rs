use serde::{Deserialize, Serialize};
use genai::chat::{ChatMessage, ChatRequest};
use genai::Client;
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AIProvider {
    Grok,
    Minimax,
}

impl AIProvider {
    /// Get the model name for this provider
    pub fn model_name(&self) -> &str {
        match self {
            AIProvider::Grok => "grok-beta",  // or "grok-2-latest"
            AIProvider::Minimax => "abab6.5s-chat",  // Minimax M2 model
        }
    }

    /// Get the environment variable name for the API key
    pub fn api_key_env_var(&self) -> &str {
        match self {
            AIProvider::Grok => "XAI_API_KEY",
            AIProvider::Minimax => "MINIMAX_API_KEY",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatContext {
    pub repo_files: Vec<String>,  // Relevant file paths
    pub file_contents: Vec<(String, String)>,  // (path, content)
}

#[derive(Clone)]
pub struct AIService {
    client: Client,
    provider: AIProvider,
}

impl AIService {
    /// Create a new AI service with the specified provider
    pub async fn new(provider: AIProvider, api_key: String) -> Result<Self> {
        // Set the API key as environment variable for genai client
        std::env::set_var(provider.api_key_env_var(), &api_key);

        let client = Client::default();

        Ok(Self { client, provider })
    }

    /// Ask a question about the repository with context
    pub async fn ask_question(
        &self,
        question: &str,
        context: &ChatContext,
    ) -> Result<String> {
        // Build the context message
        let context_msg = self.build_context_message(context);

        // Create chat messages
        let messages = vec![
            ChatMessage::system(&context_msg),
            ChatMessage::user(question),
        ];

        // Create chat request
        let chat_req = ChatRequest::new(messages);

        // Make the request
        let chat_res = self.client
            .exec_chat(self.provider.model_name(), chat_req, None)
            .await
            .context("Failed to get AI response")?;

        // Extract the response text
        let response = chat_res
            .content_text_as_str()
            .context("No response content")?
            .to_string();

        Ok(response)
    }

    /// Build a context message from the repository files
    fn build_context_message(&self, context: &ChatContext) -> String {
        let mut msg = String::new();

        msg.push_str("You are an AI assistant helping analyze a code repository. ");
        msg.push_str("Answer questions about the code based on the following context.\n\n");

        if !context.file_contents.is_empty() {
            msg.push_str("Here are the relevant files:\n\n");

            for (path, content) in &context.file_contents {
                msg.push_str(&format!("=== File: {} ===\n", path));
                msg.push_str(content);
                msg.push_str("\n\n");
            }
        } else if !context.repo_files.is_empty() {
            msg.push_str("Repository file structure:\n");
            for file in &context.repo_files {
                msg.push_str(&format!("- {}\n", file));
            }
        }

        msg.push_str("\nProvide accurate, helpful answers based on this code. ");
        msg.push_str("If you're not sure about something, say so. ");
        msg.push_str("Include file paths and line references when relevant.");

        msg
    }

    /// Stream a response (for real-time updates)
    pub async fn ask_question_stream(
        &self,
        question: &str,
        context: &ChatContext,
    ) -> Result<Vec<String>> {
        // For now, just return the full response
        // TODO: Implement actual streaming when genai supports it better
        let response = self.ask_question(question, context).await?;
        Ok(vec![response])
    }
}

/// Helper function to select relevant files for a question
pub fn select_relevant_files(
    question: &str,
    all_files: &[crate::repo_indexer::FileInfo],
    max_files: usize,
) -> Vec<String> {
    let question_lower = question.to_lowercase();

    // Extract keywords from the question
    let keywords: Vec<&str> = question_lower
        .split_whitespace()
        .filter(|w| w.len() > 3)  // Filter short words
        .collect();

    // Score files based on relevance
    let mut scored_files: Vec<_> = all_files
        .iter()
        .filter(|f| f.is_text)
        .map(|f| {
            let path_lower = f.relative_path.to_lowercase();
            let mut score = 0;

            // Check for keyword matches in path
            for keyword in &keywords {
                if path_lower.contains(keyword) {
                    score += 10;
                }
            }

            // Prefer certain file types
            if let Some(ext) = &f.extension {
                match ext.as_str() {
                    "rs" | "py" | "js" | "ts" => score += 5,
                    "md" | "txt" => score += 2,
                    _ => {}
                }
            }

            // Prefer smaller files (easier to fit in context)
            if f.size < 10_000 {
                score += 3;
            } else if f.size < 50_000 {
                score += 1;
            }

            (f, score)
        })
        .collect();

    // Sort by score (highest first)
    scored_files.sort_by(|a, b| b.1.cmp(&a.1));

    // Take top N files
    scored_files
        .iter()
        .take(max_files)
        .map(|(f, _)| f.relative_path.clone())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_config() {
        let grok = AIProvider::Grok;
        assert_eq!(grok.api_key_env_var(), "XAI_API_KEY");
        assert!(grok.model_name().contains("grok"));

        let minimax = AIProvider::Minimax;
        assert_eq!(minimax.api_key_env_var(), "MINIMAX_API_KEY");
    }
}
