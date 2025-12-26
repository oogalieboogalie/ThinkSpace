/**
 * Tauri Command: Embed File
 * Handles file upload and embedding into Qdrant
 */

use serde::{Deserialize, Serialize};
use tauri::{command, State};

use crate::qdrant::QdrantService;
use crate::embedding::EmbeddingService;

#[derive(Debug, Serialize)]
pub struct EmbedResult {
    pub success: bool,
    pub chunks_processed: usize,
    pub collection: String,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct EmbedRequest {
    pub chunks: Vec<String>,
    pub filename: String,
    pub collection_name: Option<String>,
    pub chunk_size: Option<usize>,
    pub chunk_overlap: Option<usize>,
}

#[command]
pub async fn embed_file_handler(
    request: EmbedRequest,
    qdrant: State<'_, QdrantService>,
    embedding: State<'_, EmbeddingService>,
) -> Result<EmbedResult, String> {
    let collection_name = request.collection_name.unwrap_or_else(|| "knowledge_base".to_string());
    let chunk_size = request.chunk_size.unwrap_or(1000);
    let chunk_overlap = request.chunk_overlap.unwrap_or(200);

    println!("Embedding file: {} with {} chunks", request.filename, request.chunks.len());

    // Process chunks
    let mut processed_count = 0;
    let batch_size = 50; // Process in batches to avoid rate limits

    for chunk_batch in request.chunks.chunks(batch_size) {
        // Generate embeddings for batch
        let mut points = Vec::new();

        for (i, chunk) in chunk_batch.iter().enumerate() {
            match embedding.generate_embedding(chunk).await {
                Ok(embedding_vector) => {
                    let point_id = generate_point_id(&request.filename, i);

                    let metadata = serde_json::json!({
                        "source_file": request.filename,
                        "chunk_index": i,
                        "chunk_size": chunk.len(),
                        "collection": collection_name,
                        "timestamp": chrono::Utc::now().to_rfc3339(),
                    });

                    let point = qdrant_client::models::PointStruct {
                        id: point_id,
                        vector: embedding_vector,
                        payload: serde_json::to_value(metadata)
                            .unwrap_or_else(|_| serde_json::json!({})),
                    };

                    points.push(point);
                }
                Err(e) => {
                    println!("Failed to embed chunk {}: {}", i, e);
                    return Err(format!("Embedding failed for chunk {}: {}", i, e));
                }
            }
        }

        // Upload batch to Qdrant
        match qdrant.upsert_points(&collection_name, points).await {
            Ok(_) => {
                processed_count += chunk_batch.len();
                println!("Uploaded batch: {}/{}", processed_count, request.chunks.len());
            }
            Err(e) => {
                println!("Failed to upload batch: {}", e);
                return Err(format!("Qdrant upload failed: {}", e));
            }
        }

        // Small delay to avoid rate limits
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    println!("Successfully embedded {} chunks", processed_count);

    Ok(EmbedResult {
        success: true,
        chunks_processed: processed_count,
        collection: collection_name,
        error: None,
    })
}

fn generate_point_id(filename: &str, chunk_index: usize) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    format!("{}:{}", filename, chunk_index).hash(&hasher);
    hasher.finish() as u64
}
