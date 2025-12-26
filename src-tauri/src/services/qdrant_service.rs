/**
 * Qdrant Service
 * Handles Qdrant Cloud operations
 */

use qdrant_client::client::QdrantClient;
use qdrant_client::qdrant::{VectorParams, Distance, PointsOperationResponse};
use qdrant_client::models::{PointStruct, Filter, FieldCondition, MatchValue};

pub struct QdrantService {
    pub client: QdrantClient,
    pub collection_name: String,
}

impl QdrantService {
    pub fn new(qdrant_url: String, qdrant_api_key: String, collection_name: String) -> Self {
        let client = QdrantClient::new(qdrant_url, qdrant_api_key);

        Self {
            client,
            collection_name,
        }
    }

    pub async fn ensure_collection_exists(&self) -> Result<(), Box<dyn std::error::Error>> {
        let collections = self.client.list_collections().await?;

        let collection_exists = collections
            .collections
            .iter()
            .any(|c| c.name == self.collection_name);

        if !collection_exists {
            println!("Creating collection: {}", self.collection_name);

            self.client
                .create_collection(&self.collection_name, VectorParams {
                    size: 1536, // text-embedding-3-small dimension
                    distance: Distance::Cosine,
                })
                .await?;
        }

        Ok(())
    }

    pub async fn upsert_points(
        &self,
        collection_name: &str,
        points: Vec<PointStruct>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let result = self.client
            .upsert_points_blocking(collection_name, points)
            .await?;

        Ok(())
    }

    pub async fn search(
        &self,
        query_vector: Vec<f32>,
        limit: u64,
        filter: Option<Filter>,
    ) -> Result<Vec<qdrant_client::models::ScoredPoint>, Box<dyn std::error::Error>> {
        let result = self.client
            .search_blocking(&self.collection_name, query_vector, limit, filter)
            .await?;

        Ok(result)
    }

    pub async fn get_collection_info(&self) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let info = self.client
            .collection_info(&self.collection_name)
            .await?;

        Ok(serde_json::to_value(info)?)
    }
}
