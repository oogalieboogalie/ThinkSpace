/**
 * Embedding Service
 * Handles OpenAI embedding generation
 */

use serde_json::json;
use tauri::api::http;

const OPENAI_EMBEDDING_MODEL: &str = "text-embedding-3-small";

pub struct EmbeddingService {
    pub openai_api_key: String,
    pub http_client: http::Client,
}

impl EmbeddingService {
    pub fn new(openai_api_key: String) -> Self {
        Self {
            openai_api_key,
            http_client: http::Client::new(),
        }
    }

    pub async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>, Box<dyn std::error::Error>> {
        let url = "https://api.openai.com/v1/embeddings";

        // Truncate text if too long (OpenAI has token limits)
        let max_chars = 8000;
        let text = if text.len() > max_chars {
            &text[..max_chars]
        } else {
            text
        };

        let request_body = json!({
            "model": OPENAI_EMBEDDING_MODEL,
            "input": text
        });

        let request = http::HttpRequestBuilder::new("POST", url)?
            .header("Authorization", format!("Bearer {}", self.openai_api_key))?
            .header("Content-Type", "application/json")?
            .body(request_body.to_string())?;

        let response = self.http_client.send(request).await?;

        if !response.status().is_success() {
            let error_text = response.body();
            return Err(format!("OpenAI API error: {}", error_text).into());
        }

        let response_json: serde_json::Value = serde_json::from_str(&response.body())?;

        // Extract embedding vector
        let embedding = response_json
            .get("data")
            .and_then(|d| d.get(0))
            .and_then(|d| d.get("embedding"))
            .and_then(|e| e.as_array())
            .ok_or("Invalid response format")?;

        // Convert to Vec<f32>
        let vector: Vec<f32> = embedding
            .iter()
            .filter_map(|v| v.as_f64())
            .map(|v| v as f32)
            .collect();

        if vector.is_empty() {
            return Err("Empty embedding vector".into());
        }

        Ok(vector)
    }

    pub async fn generate_embeddings_batch(
        &self,
        texts: &[String],
    ) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        let mut results = Vec::new();

        // Process in smaller batches to avoid rate limits
        let batch_size = 20;
        for batch in texts.chunks(batch_size) {
            for text in batch {
                match self.generate_embedding(text).await {
                    Ok(embedding) => results.push(embedding),
                    Err(e) => {
                        println!("Failed to embed text: {}", e);
                        return Err(e);
                    }
                }
            }

            // Small delay between batches
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
        }

        Ok(results)
    }
}
