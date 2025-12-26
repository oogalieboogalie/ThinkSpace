use serde::{Deserialize, Serialize};
use reqwest::Client;
use anyhow::{Result, Context};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub content: String,
    pub score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct TavilyResponse {
    pub results: Vec<SearchResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResearchStep {
    pub step_type: String, // "planning", "searching", "analyzing", "synthesizing"
    pub description: String,
    pub details: Option<String>,
}

pub struct DeepResearchAgent {
    tavily_api_key: String,
    client: Client,
}

impl DeepResearchAgent {
    pub fn new(api_key: String) -> Self {
        Self {
            tavily_api_key: api_key,
            client: Client::new(),
        }
    }

    pub async fn search(&self, query: &str) -> Result<Vec<SearchResult>> {
        let url = "https://api.tavily.com/search";
        let body = serde_json::json!({
            "api_key": self.tavily_api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": true,
            "max_results": 5
        });

        let resp = self.client.post(url)
            .json(&body)
            .send()
            .await
            .context("Failed to send request to Tavily")?
            .json::<TavilyResponse>()
            .await
            .context("Failed to parse Tavily response")?;

        Ok(resp.results)
    }

    pub async fn research_topic<F>(&self, topic: &str, depth: u32, on_progress: F) -> Result<String>
    where
        F: Fn(ResearchStep) + Send + Sync + 'static,
    {
        // 1. Plan
        on_progress(ResearchStep {
            step_type: "planning".to_string(),
            description: format!("Planning research for: {}", topic),
            details: None,
        });

        // For now, we'll do a direct search. In the future, we can use an LLM to generate sub-queries.
        // TODO: Integrate LLM for query generation if depth > 1

        // 2. Search
        on_progress(ResearchStep {
            step_type: "searching".to_string(),
            description: format!("Searching web for: {}", topic),
            details: None,
        });

        let results = self.search(topic).await?;
        
        let mut context = String::new();
        for (i, result) in results.iter().enumerate() {
             on_progress(ResearchStep {
                step_type: "analyzing".to_string(),
                description: format!("Reading source {}: {}", i + 1, result.title),
                details: Some(result.url.clone()),
            });
            context.push_str(&format!("Source: {}\nURL: {}\nContent: {}\n\n", result.title, result.url, result.content));
        }

        // 3. Synthesize
        // The actual synthesis will happen in the calling code (minimax_enhanced) using the LLM,
        // because we don't want to duplicate the LLM client logic here just yet.
        // We return the raw context for the LLM to process.
        
        Ok(context)
    }
}
