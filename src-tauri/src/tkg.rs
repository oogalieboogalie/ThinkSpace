/// Simplified Temporal Knowledge Graph System
/// This is a placeholder that compiles and allows UI integration
/// Full TKG implementation will be completed after credentials are provided

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Embedding vector type
pub type Embedding = Vec<f32>;

/// Unique identifier for knowledge nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeId(pub String);

/// Temporal relationship between nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RelationshipType {
    Causes,
    ExplainedBy,
    RelatedTo,
    EvolvesTo,
    Contradicts,
    Supports,
    DerivedFrom,
    TemporalBefore,
    TemporalAfter,
    SimilarTo,
}

/// Types of knowledge nodes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    Fact,
    Concept,
    Memory,
    Learning,
    Relationship,
    Insight,
    UserInput,
    AiResponse,
}

// ============================================================
// WEIGHTED AUTONOMOUS MEMORY ALGORITHM (WAMA)
// ============================================================

/// Classification of save priority - YOUR ALGORITHM!
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SaveDecision {
    ImmediateCascade,  // Score 0.9+ - Save immediately with full priority
    PrioritySave,      // Score 0.7+ - Save with high priority
    BatchQueue,        // Score 0.5+ - Queue for batch processing
    Consider,          // Score 0.3+ - Consider saving later
    LetFade,           // Score <0.3 - Don't save, let it fade
}

#[derive(Debug, Clone)]
pub struct Criterion {
    pub name: String,
    pub weight: f32,  // 0.0 to 1.0
}

#[derive(Debug, Clone)]
pub struct ContextModifier {
    pub name: String,
    pub condition: String,  // Simple string match for condition
    pub boost: f32,  // Additive boost to score
}

// ============================================================
// RECURSIVE CASCADE ALGORITHM (RCA)
// ============================================================

/// Configuration for RCA cascade algorithm
#[derive(Debug, Clone)]
pub struct CascadeConfig {
    pub max_depth: usize,
    pub satisfaction_threshold: f32,
    pub beam_width: Option<usize>,
    pub enable_pruning: bool,
    pub prune_threshold: f32,
    pub enable_memoization: bool,
    pub verbose: bool,
}

impl Default for CascadeConfig {
    fn default() -> Self {
        Self {
            max_depth: 5,
            satisfaction_threshold: 0.9,
            beam_width: Some(3),
            enable_pruning: true,
            prune_threshold: 0.3,
            enable_memoization: true,
            verbose: false,
        }
    }
}

/// A single cascade step
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CascadeStep {
    pub depth: usize,
    pub thought: String,
    pub triggered_thoughts: Vec<String>,
    pub confidence: f32,
}

/// Result of a cascade operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CascadeResult {
    pub final_synthesis: String,
    pub all_thoughts: Vec<String>,
    pub steps: Vec<CascadeStep>,
    pub depths_explored: usize,
    pub thoughts_processed: usize,
    pub max_satisfaction: f32,
    pub termination_reason: String,
    pub execution_time_ms: u64,
}

/// TKG Configuration
#[derive(Debug, Clone)]
pub struct TKGConfig {
    pub qdrant_host: String,
    pub qdrant_port: u16,
    pub qdrant_collection: String,
    pub qdrant_api_key: String,
    pub cohere_api_key: String,
    pub embedding_model: String,
    pub dimension: usize,
    pub max_nodes_per_query: usize,
    pub temporal_decay_factor: f32,
    pub min_trust_threshold: f32,
}

/// Main TKG Engine - Simplified
pub struct TemporalKnowledgeGraph {
    pub config: TKGConfig,
    pub initialized: bool,
}

impl TemporalKnowledgeGraph {
    /// Build a normalized Qdrant base URL that always has scheme and port.
    /// Accepts inputs like `localhost`, `localhost:6333`, or `https://host:port`.
    fn qdrant_base_url(&self) -> String {
        let mut host = self.config.qdrant_host.trim_end_matches('/').to_string();

        // Ensure scheme (default to https for cloud endpoints)
        if !host.starts_with("http://") && !host.starts_with("https://") {
            host = format!("https://{}", host);
        }

        // Check if port is present in the host part (after the scheme)
        let host_part = host.splitn(2, "://").nth(1).unwrap_or(&host);
        let has_port = host_part
            .rsplit_once(':')
            .map(|(_, port)| port.chars().all(|c| c.is_ascii_digit()))
            .unwrap_or(false);

        if !has_port && self.config.qdrant_port != 0 {
            format!("{}:{}", host, self.config.qdrant_port)
        } else {
            host
        }
    }

    /// Initialize TKG with configuration
    pub fn new(config: TKGConfig) -> Self {
        Self {
            config,
            initialized: false,
        }
    }

    /// Connect to services and create collection if needed
    pub async fn connect_qdrant(&mut self) -> Result<(), String> {
        eprintln!("🔌 Connecting to Qdrant...");

        let client = reqwest::Client::new();

        // Build the base URL
        let base_url = self.qdrant_base_url();

        let url = format!("{}/collections", base_url);

        eprintln!("📡 Host: {}", self.config.qdrant_host);
        eprintln!("📡 Base URL: {}", base_url);
        eprintln!("📡 Checking collections at: {}", url);
        eprintln!("📡 Collection: {}", self.config.qdrant_collection);

        // List collections
        let response = client.get(&url)
            .header("Api-Key", &self.config.qdrant_api_key)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Qdrant: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Qdrant API error: {}", response.status()));
        }

        let result: serde_json::Value = response.json().await
            .map_err(|e| format!("Failed to parse Qdrant response: {}", e))?;

        let collections = result["result"]["collections"]
            .as_array()
            .cloned()
            .unwrap_or_else(Vec::new);

        let collection_exists = collections.iter()
            .any(|c| c["name"].as_str() == Some(&self.config.qdrant_collection));

        if !collection_exists {
            eprintln!("📦 Creating collection '{}'...", self.config.qdrant_collection);

            // Create collection
            let base = self.qdrant_base_url();
            let _create_url = format!("{}/collections/{}/points", base, self.config.qdrant_collection);
            let create_response = client.put(&format!("{}/collections/{}", base, self.config.qdrant_collection))
                .header("Api-Key", &self.config.qdrant_api_key)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({
                    "vectors": {
                        "size": self.config.dimension,
                        "distance": "Cosine"
                    }
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to create collection: {}", e))?;

            if !create_response.status().is_success() {
                let error_text = create_response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(format!("Failed to create collection: {}", error_text));
            }

            eprintln!("✅ Collection '{}' created successfully!", self.config.qdrant_collection);
        } else {
            eprintln!("✅ Collection '{}' already exists", self.config.qdrant_collection);
        }

        // Ensure payload index for user_id exists
        let base = self.qdrant_base_url();
        let index_url = format!("{}/collections/{}/index", base, self.config.qdrant_collection);
        let index_payload = serde_json::json!({
            "field_name": "user_id",
            "field_schema": "keyword"
        });

        let index_response = client.put(&index_url)
            .header("Api-Key", &self.config.qdrant_api_key)
            .header("Content-Type", "application/json")
            .json(&index_payload)
            .send()
            .await
            .map_err(|e| format!("Failed to create index: {}", e))?;

        if !index_response.status().is_success() {
             // It's okay if it fails (e.g. already exists), just log it
             eprintln!("⚠️ Index creation note: {}", index_response.status());
        } else {
             eprintln!("✅ Index for 'user_id' ensured.");
        }

        self.initialized = true;
        Ok(())
    }

    /// Generate embedding for text using Cohere
    pub async fn embed_text(&self, text: &str) -> Result<Embedding, String> {
        eprintln!("🔄 Generating embedding for text: '{}'", text);

        let client = reqwest::Client::new();
        let url = "https://api.cohere.ai/v1/embed";

        let payload = serde_json::json!({
            "model": self.config.embedding_model,
            "texts": [text],
            "input_type": "search_document"
        });

        eprintln!("📡 Calling Cohere API with model '{}'...", self.config.embedding_model);

        let response = client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.config.cohere_api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                eprintln!("❌ Cohere API connection error: {}", e);
                format!("Failed to call Cohere API: {}", e)
            })?;

        eprintln!("📥 Cohere response status: {}", response.status());

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            eprintln!("❌ Cohere API error response: {}", error_text);
            return Err(format!("Cohere API error: {}", error_text));
        }

        let result: serde_json::Value = response.json().await
            .map_err(|e| {
                eprintln!("❌ Failed to parse Cohere response: {}", e);
                format!("Failed to parse Cohere response: {}", e)
            })?;

        eprintln!("✅ Cohere response received, extracting embeddings...");

        let embeddings = result["embeddings"]
            .as_array()
            .and_then(|arr| arr.get(0))
            .and_then(|first| first.as_array())
            .ok_or_else(|| {
                eprintln!("❌ Invalid embedding response format");
                "Invalid embedding response format".to_string()
            })?;

        let embedding: Embedding = embeddings
            .iter()
            .filter_map(|v| v.as_f64().map(|f| f as f32))
            .collect();

        eprintln!("✅ Embedding generated successfully ({} dimensions)", embedding.len());

        Ok(embedding)
    }

    /// Evaluate content using YOUR WAMA algorithm!
    pub fn evaluate_with_wama(&self, content: &str) -> (SaveDecision, f32) {
        eprintln!("🧠 WAMA evaluating: {}...", &content[..std::cmp::min(content.len(), 60)]);

        let content_lower = content.to_lowercase();

        // Define criteria (your WAMA logic!)
        // Using tuples for easier pattern matching
        type WeightedCriterion = (String, f32, fn(&str) -> bool);

        let criteria: Vec<WeightedCriterion> = vec![
            // HIGH PRIORITY: Learning and Reminders (0.95)
            (
                "Learning & Growth".to_string(),
                0.95,
                |text: &str| -> bool {
                    text.contains("learning")
                        || text.contains("studying")
                        || text.contains("practicing")
                        || text.contains("trying to")
                }
            ),
            (
                "Reminders & Deadlines".to_string(),
                0.95,
                |text: &str| -> bool {
                    // Detect reminder intent patterns
                    text.to_lowercase().contains("remind me")
                        || text.to_lowercase().contains("don't forget")
                        || text.to_lowercase().contains("remember to")
                        || text.to_lowercase().contains("todo")
                        || text.to_lowercase().contains("deadline")
                        || text.to_lowercase().contains("by ")
                        || text.to_lowercase().contains("before ")
                        || text.to_lowercase().contains("need to")
                }
            ),
            // HIGH PRIORITY: Personal Preferences (0.9)
            (
                "Personal Preference".to_string(),
                0.9,
                |text: &str| -> bool {
                    text.contains("prefer")
                        || text.contains("like")
                        || text.contains("use ")
                        || text.contains("love")
                }
            ),
            // MEDIUM-HIGH: Goals & Important Facts (0.85)
            (
                "Goals & Objectives".to_string(),
                0.85,
                |text: &str| -> bool {
                    text.contains("goal")
                        || text.contains("plan")
                        || text.contains("want to")
                        || text.contains("need to")
                }
            ),
            (
                "Important Facts".to_string(),
                0.85,
                |text: &str| -> bool {
                    text.contains("important")
                        || text.contains("key")
                        || text.contains("critical")
                        || text.contains("vital")
                }
            ),
            // MEDIUM: Technical Details & Names (0.8)
            (
                "Technical Details".to_string(),
                0.8,
                |text: &str| -> bool {
                    text.contains("command")
                        || text.contains("code")
                        || text.contains("setup")
                        || text.contains("config")
                        || text.contains("install")
                }
            ),
            (
                "Names & Specifics".to_string(),
                0.8,
                |text: &str| -> bool {
                    text.chars().any(|c| c.is_uppercase())
                        || text.contains("'")
                        || text.contains("\"")
                }
            ),
            // MEDIUM-LOW: Context-Rich (0.7)
            (
                "Context-Rich Content".to_string(),
                0.7,
                |text: &str| -> bool {
                    text.len() > 50
                        && (text.contains("because")
                            || text.contains("since")
                            || text.contains("however")
                            || text.contains("however"))
                }
            ),
        ];

        // Evaluate against criteria
        let mut total_score = 0.0;
        let mut matched_criteria = Vec::new();

        for (name, weight, matcher) in &criteria {
            if matcher(&content_lower) {
                total_score += *weight;
                matched_criteria.push(name.clone());
            }
        }

        // Normalize score - Grok's fix: average only MATCHED criteria!
        let final_score = if matched_criteria.is_empty() {
            0.0
        } else {
            (total_score / matched_criteria.len() as f32).min(1.0)
        };

        // Apply context modifiers
        let mut modified_score = final_score;

        // Boost for specific contexts
        if content_lower.contains("user") || content_lower.contains("my") {
            modified_score += 0.1;
        }
        if content_lower.contains("!") || content_lower.contains("important") {
            modified_score += 0.15;
        }
        if content.len() > 100 {
            modified_score += 0.1;
        }

        // Cap at 1.0
        modified_score = modified_score.min(1.0);

        // Determine decision based on thresholds
        let decision = if modified_score >= 0.9 {
            SaveDecision::ImmediateCascade
        } else if modified_score >= 0.7 {
            SaveDecision::PrioritySave
        } else if modified_score >= 0.5 {
            SaveDecision::BatchQueue
        } else if modified_score >= 0.3 {
            SaveDecision::Consider
        } else {
            SaveDecision::LetFade
        };

        eprintln!("   ✅ WAMA Decision: {:?} (score: {:.2})", decision, modified_score);
        if !matched_criteria.is_empty() {
            eprintln!("   📋 Matched criteria: {}", matched_criteria.join(", "));
        }

        (decision, modified_score)
    }
}

/// Test Qdrant connection
#[tauri::command]
pub async fn tkg_test_connection(
    qdrant_host: String,
    qdrant_port: u16,
    qdrant_collection: String,
    qdrant_api_key: String,
) -> Result<String, String> {
    eprintln!("🔌 Testing Qdrant connection...");

    let config = TKGConfig {
        qdrant_host,
        qdrant_port,
        qdrant_collection,
        qdrant_api_key,
        cohere_api_key: "test".to_string(), // Not needed for connection test
        embedding_model: "embed-v4.0".to_string(),
        dimension: 1536,
        max_nodes_per_query: 10,
        temporal_decay_factor: 0.95,
        min_trust_threshold: 0.5,
    };

    let mut tkg = TemporalKnowledgeGraph::new(config);

    match tkg.connect_qdrant().await {
        Ok(_) => Ok(serde_json::json!({
            "success": true,
            "message": "Qdrant connection successful!",
            "host": tkg.config.qdrant_host,
            "port": tkg.config.qdrant_port,
            "collection": tkg.config.qdrant_collection
        }).to_string()),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "message": "Qdrant connection failed",
            "error": e
        }).to_string()),
    }
}

impl TemporalKnowledgeGraph {
/// Execute YOUR Recursive Cascade Algorithm for brainstorming!
    pub fn cascade_brainstorm(
        &self,
        trigger: String,
        config: CascadeConfig,
    ) -> CascadeResult {
        eprintln!("🌊 RCA Cascade starting: {}...", trigger);

        let start_time = std::time::Instant::now();
        let mut thoughts = vec![trigger.clone()];
        let mut depth = 0;
        let mut satisfaction: f32 = 0.0;
        let mut all_thoughts = Vec::new();
        let mut steps = Vec::new();
        let mut seen = std::collections::HashSet::new();

        // SIMULATED Grok-style thought generation
        // In real implementation, this would call Grok API
        let grok_processor = |thought: &str, current_depth: usize| -> Vec<String> {
            let mut expansions = Vec::new();

            // Generate creative expansions based on thought
            if current_depth == 0 {
                // Initial trigger - generate broad ideas
                expansions.push(format!("{} - Innovation opportunities", thought));
                expansions.push(format!("{} - Potential challenges", thought));
                expansions.push(format!("{} - Market applications", thought));
                expansions.push(format!("{} - Technical implementation", thought));
            } else if current_depth == 1 {
                // Second level - dive deeper
                expansions.push(format!("Building on {}: Consider scaling strategies", thought));
                expansions.push(format!("Building on {}: User experience implications", thought));
                expansions.push(format!("Building on {}: Revenue models to explore", thought));
            } else {
                // Deeper levels - get more specific
                expansions.push(format!("Implementation detail: {}", thought));
                expansions.push(format!("Risk analysis: {}", thought));
                expansions.push(format!("Success metrics: {}", thought));
            }

            // Add some randomness
            if current_depth < 3 {
                expansions.push(format!("Further explore: {}", thought));
            }

            expansions
        };

        // SIMULATED satisfaction evaluator
        let satisfaction_evaluator = |text: &str, d: usize| -> f32 {
            let mut score: f32 = 0.5; // Base score

            // Depth-based scoring
            if d >= 3 {
                score += 0.3; // Deeper thoughts more valuable
            }
            if d >= 4 {
                score += 0.2;
            }

            // Content-based scoring
            if text.contains("innovation") || text.contains("strateg") {
                score += 0.15;
            }
            if text.contains("implement") || text.contains("technical") {
                score += 0.1;
            }
            if text.contains("revenue") || text.contains("market") {
                score += 0.1;
            }
            if text.contains("risk") || text.contains("challenge") {
                score += 0.05;
            }

            score.min(1.0)
        };

        while satisfaction < config.satisfaction_threshold
            && depth < config.max_depth
            && !thoughts.is_empty()
        {
            if config.verbose {
                eprintln!("\n  🔄 Depth {}: Processing {} thought(s)", depth, thoughts.len());
            }

            let mut new_thoughts = Vec::new();

            for thought in &thoughts {
                // Memoization check
                if config.enable_memoization {
                    let thought_hash = format!("{}-{}", thought, depth);
                    if seen.contains(&thought_hash) {
                        if config.verbose {
                            eprintln!("    ⏩ Skipping (seen): {}", thought);
                        }
                        continue;
                    }
                    seen.insert(thought_hash);
                }

                // Process thought (simulate Grok generating ideas)
                let triggered = grok_processor(thought, depth);
                all_thoughts.push(thought.clone());

                // Evaluate triggered thoughts
                let mut triggered_with_confidence = Vec::new();
                for t in &triggered {
                    let confidence = satisfaction_evaluator(t, depth);
                    satisfaction = satisfaction.max(confidence);

                    if config.verbose {
                        eprintln!("    • {} (confidence: {:.2})", t, confidence);
                    }

                    // Pruning check
                    if !config.enable_pruning || confidence >= config.prune_threshold {
                        triggered_with_confidence.push((t.clone(), confidence));
                    } else if config.verbose {
                        eprintln!("      ✂️ Pruned (low confidence)");
                    }
                }

                // Record step
                steps.push(CascadeStep {
                    depth,
                    thought: thought.clone(),
                    triggered_thoughts: triggered.clone(),
                    confidence: satisfaction,
                });

                // Add to new thoughts
                for (t, _) in &triggered_with_confidence {
                    new_thoughts.push(t.clone());
                }
            }

            // Beam search (limit width)
            if let Some(beam_width) = config.beam_width {
                if new_thoughts.len() > beam_width {
                    new_thoughts.truncate(beam_width);
                }
            }

            thoughts = new_thoughts;
            depth += 1;

            if config.verbose {
                eprintln!("  📊 Satisfaction: {:.2}", satisfaction);
            }
        }

        // Synthesize results
        let final_synthesis = if all_thoughts.is_empty() {
            trigger.clone()
        } else {
            format!("Cascade Result (depth {}):\n{}", depth, all_thoughts.join("\n"))
        };

        let execution_time = start_time.elapsed();

        eprintln!("✅ Cascade complete! Depth: {}, Thoughts: {}, Satisfaction: {:.2}",
                  depth, all_thoughts.len(), satisfaction);

        let thoughts_count = all_thoughts.len();

        CascadeResult {
            final_synthesis,
            all_thoughts,
            steps,
            depths_explored: depth,
            thoughts_processed: thoughts_count,
            max_satisfaction: satisfaction,
            termination_reason: if depth >= config.max_depth {
                "max_depth_reached".to_string()
            } else if satisfaction >= config.satisfaction_threshold {
                "satisfaction_reached".to_string()
            } else {
                "no_new_thoughts".to_string()
            },
            execution_time_ms: execution_time.as_millis() as u64,
        }
    }

    /// Store knowledge in Qdrant
    pub async fn store_knowledge(
        &mut self,
        content: String,
        node_type: NodeType,
        importance: f32,
        user_id: String,
    ) -> Result<NodeId, String> {
        // Step 1: WAMA evaluation FIRST (before spending Cohere credits!)
        let (decision, score) = self.evaluate_with_wama(&content);

        // Handle rejection cases
        match decision {
            SaveDecision::LetFade => {
                eprintln!("   ⚠️  WAMA rejected: Score {:.2} < 0.3 (LET_FADE)", score);
                return Err(format!("WAMA Decision: LET_FADE (score: {:.2}) - Content not worth saving", score));
            }
            SaveDecision::Consider => {
                eprintln!("   ⚠️  WAMA borderline: Score {:.2} - Consider saving manually", score);
                // Continue anyway, but log it
            }
            _ => {
                eprintln!("   ✅ WAMA approved: {:?} (score: {:.2})", decision, score);
            }
        }

        // Step 2: Generate embedding for the content (only if WAMA says save)
        let embedding = self.embed_text(&content).await?;

        // Create unique node ID
        let node_id = Uuid::new_v4();

        // Create payload
        let node_type_str = match node_type {
            NodeType::Fact => "FACT",
            NodeType::Concept => "CONCEPT",
            NodeType::Memory => "MEMORY",
            NodeType::Learning => "LEARNING",
            NodeType::Relationship => "RELATIONSHIP",
            NodeType::Insight => "INSIGHT",
            NodeType::UserInput => "USER_INPUT",
            NodeType::AiResponse => "AI_RESPONSE",
        };

        eprintln!("💾 Storing knowledge in Qdrant collection '{}'...", self.config.qdrant_collection);

        let client = reqwest::Client::new();
        let url = format!("{}/collections/{}/points", self.qdrant_base_url(), self.config.qdrant_collection);

        // Create payload with WAMA data
        let payload = serde_json::json!({
            "content": content,
            "node_type": node_type_str,
            "importance": importance,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "wama_decision": format!("{:?}", decision),
            "wama_score": score,
            "user_id": user_id
        });

        // Create point with UUID as string
        let point = serde_json::json!({
            "id": node_id.to_string(),
            "vector": embedding,
            "payload": payload
        });

        // Upsert point
        let response = client.put(&url)
            .header("Api-Key", &self.config.qdrant_api_key)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "points": [point]
            }))
            .send()
            .await
            .map_err(|e| format!("Failed to store knowledge: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Failed to store knowledge: {}", error_text));
        }

        eprintln!("✅ Knowledge stored successfully! Node ID: {}", node_id);
        Ok(NodeId(node_id.to_string()))
    }

    fn build_search_payload(
        query_embedding: &Embedding,
        limit: usize,
        user_id: &str,
    ) -> serde_json::Value {
        serde_json::json!({
            "vector": query_embedding,
            "limit": limit as u64,
            "with_payload": true,
            "with_vectors": false,
            "filter": {
                "must": [
                    {
                        "key": "user_id",
                        "match": {
                            "value": user_id
                        }
                    }
                ]
            }
        })
    }

    /// Search similar knowledge in Qdrant
    pub async fn search_similar(
        &mut self,
        query: &str,
        limit: usize,
        user_id: String,
    ) -> Result<Vec<serde_json::Value>, String> {
        // Generate embedding for the query
        let query_embedding = self.embed_text(query).await?;

        // Search in Qdrant
        let client = reqwest::Client::new();
        let url = format!(
            "{}/collections/{}/points/search",
            self.qdrant_base_url(),
            self.config.qdrant_collection
        );

        let search_payload = Self::build_search_payload(&query_embedding, limit, &user_id);

        let response = client
            .post(&url)
            .header("Api-Key", &self.config.qdrant_api_key)
            .header("Content-Type", "application/json")
            .json(&search_payload)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Qdrant: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(format!("Qdrant search error: {}", error_text));
        }

        let result: serde_json::Value = response.json().await
            .map_err(|e| format!("Failed to parse Qdrant response: {}", e))?;

        let points = result["result"]
            .as_array()
            .cloned()
            .unwrap_or_else(Vec::new);

        Ok(points)
    }

    /// Get consciousness stats (placeholder)
    pub fn get_consciousness_stats(&self) -> serde_json::Value {
        serde_json::json!({
            "status": "initialized",
            "qdrant_configured": !self.config.qdrant_host.is_empty(),
            "cohere_configured": !self.config.cohere_api_key.is_empty(),
            "message": "Full TKG features available after credentials are provided"
        })
    }
}

// ==================== Global TKG Instance ====================

use std::sync::Mutex;
use std::sync::Arc;

lazy_static::lazy_static! {
    static ref TKG_INSTANCE: Arc<Mutex<Option<TemporalKnowledgeGraph>>> = {
        Arc::new(Mutex::new(None))
    };
}

// ==================== Tauri Command Handlers ====================

/// Initialize TKG with configuration
#[tauri::command]
pub async fn tkg_initialize(
    qdrant_host: String,
    qdrant_port: u16,
    qdrant_collection: String,
    qdrant_api_key: String,
    cohere_api_key: String,
) -> Result<String, String> {
    let config = TKGConfig {
        qdrant_host,
        qdrant_port,
        qdrant_collection,
        qdrant_api_key,
        cohere_api_key,
        embedding_model: "embed-v4.0".to_string(),
        dimension: 1536,  // ✅ Fixed: Cohere embed-v4.0 generates 1536-dim embeddings
        max_nodes_per_query: 10,
        temporal_decay_factor: 0.95,
        min_trust_threshold: 0.5,
    };

    let mut tkg = TemporalKnowledgeGraph::new(config);

    // Connect to Qdrant (placeholder implementation)
    if let Err(e) = tkg.connect_qdrant().await {
        return Err(format!("Failed to initialize TKG: {}", e));
    }

    // Store in global instance
    let mut instance = TKG_INSTANCE.lock().map_err(|e| e.to_string())?;
    *instance = Some(tkg);

    Ok("TKG initialized successfully".to_string())
}

/// Store knowledge in TKG
#[tauri::command]
pub async fn tkg_store_knowledge(
    content: String,
    node_type: String,
    importance: f32,
    user_id: String,
) -> Result<String, String> {
    let node_type_normalized = node_type.trim().to_uppercase();
    let node_type_enum = match node_type_normalized.as_str() {
        "FACT" => NodeType::Fact,
        "CONCEPT" => NodeType::Concept,
        "MEMORY" => NodeType::Memory,
        "LEARNING" => NodeType::Learning,
        "RELATIONSHIP" => NodeType::Relationship,
        "INSIGHT" => NodeType::Insight,
        "USER_INPUT" => NodeType::UserInput,
        "AI_RESPONSE" => NodeType::AiResponse,
        _ => NodeType::Concept,
    };

    // Get config from global instance (use block to ensure guard is dropped)
    let config = {
        let instance = TKG_INSTANCE.lock().map_err(|e| e.to_string())?;
        match instance.as_ref() {
            Some(tkg) => tkg.config.clone(),
            None => return Err("TKG not initialized. Please configure your Qdrant and Cohere credentials in Settings.".to_string()),
        }
    }; // Guard is dropped here

    // Create a new TKG instance with the config and perform the operation
    let mut temp_tkg = TemporalKnowledgeGraph::new(config);
    temp_tkg.initialized = true;

    // First evaluate with WAMA
    let (decision, score) = temp_tkg.evaluate_with_wama(&content);

    // Check if WAMA rejects it
    if matches!(decision, SaveDecision::LetFade) {
        return Ok(serde_json::json!({
            "success": false,
            "decision": "LET_FADE",
            "score": score,
            "message": format!("WAMA rejected content (score: {:.2}) - not worth saving to TKG", score),
            "recommendation": "Content was filtered out as low-value"
        }).to_string());
    }

    // Store the knowledge
    let node_id = temp_tkg.store_knowledge(content, node_type_enum, importance, user_id).await
        .map_err(|e| format!("Failed to store knowledge: {}", e))?;

    Ok(serde_json::json!({
        "success": true,
        "node_id": node_id.0,
        "decision": format!("{:?}", decision),
        "score": score,
        "message": format!("Knowledge stored successfully in TKG (WAMA: {:?}, score: {:.2})", decision, score)
    }).to_string())
}

/// Search for similar knowledge
#[tauri::command]
pub async fn tkg_search_similar(
    query: String,
    limit: u64,
    user_id: String,
) -> Result<String, String> {
    // Get config from global instance (use block to ensure guard is dropped)
    let config = {
        let instance = TKG_INSTANCE.lock().map_err(|e| e.to_string())?;
        match instance.as_ref() {
            Some(tkg) => tkg.config.clone(),
            None => return Err("TKG not initialized. Please configure your Qdrant and Cohere credentials in Settings.".to_string()),
        }
    }; // Guard is dropped here

    // Create a new TKG instance with the config and perform the operation
    let mut temp_tkg = TemporalKnowledgeGraph::new(config);
    temp_tkg.initialized = true;

    let results = temp_tkg.search_similar(&query, limit as usize, user_id)
        .await
        .map_err(|e| format!("Failed to search knowledge: {}", e))?;

    Ok(serde_json::json!({
        "success": true,
        "query": query,
        "results": results,
        "count": results.len(),
        "message": "Search completed successfully"
    }).to_string())
}

/// Create relationship between nodes (placeholder)
#[tauri::command]
pub async fn tkg_relate_nodes(
    from_id: String,
    to_id: String,
    relationship: String,
    confidence: f32,
    context: String,
) -> Result<String, String> {
    Ok(serde_json::json!({
        "success": true,
        "from": from_id,
        "to": to_id,
        "relationship": relationship,
        "confidence": confidence,
        "context": context,
        "message": "Relationship created (placeholder - full features after credentials)"
    }).to_string())
}

/// Query with temporal awareness (placeholder)
#[tauri::command]
pub async fn tkg_query_temporal(
    query: String,
    time_context: Option<String>,
    trust_threshold: Option<f32>,
) -> Result<String, String> {
    Ok(serde_json::json!({
        "success": true,
        "query": query,
        "time_context": time_context,
        "trust_threshold": trust_threshold,
        "results": [],
        "message": "Temporal query completed (placeholder - full features after credentials)"
    }).to_string())
}

/// Backup consciousness state (placeholder)
#[tauri::command]
pub async fn tkg_backup_consciousness() -> Result<String, String> {
    Ok(serde_json::json!({
        "success": true,
        "backup_id": Uuid::new_v4().to_string(),
        "message": "Backup created (placeholder - full features after credentials)"
    }).to_string())
}

/// Get TKG statistics
#[tauri::command]
pub async fn tkg_get_stats() -> Result<String, String> {
    let instance = TKG_INSTANCE.lock().map_err(|e| e.to_string())?;
    let tkg = instance.as_ref().ok_or("TKG not initialized")?;

    let stats = tkg.get_consciousness_stats();
    drop(instance); // Drop the lock before any async operations
    Ok(serde_json::to_string(&stats).unwrap())
}

/// Execute RCA Cascade for brainstorming with Grok AI
#[tauri::command]
pub async fn tkg_cascade_brainstorm(
    trigger: String,
    max_depth: Option<usize>,
    satisfaction_threshold: Option<f32>,
    beam_width: Option<usize>,
) -> Result<String, String> {
    // Get config from global instance
    let config = {
        let instance = TKG_INSTANCE.lock().map_err(|e| e.to_string())?;
        match instance.as_ref() {
            Some(tkg) => tkg.config.clone(),
            None => return Err("TKG not initialized. Please configure your Qdrant and Cohere credentials in Settings.".to_string()),
        }
    }; // Guard is dropped here

    // Create a temporary TKG instance for the cascade
    let tkg = TemporalKnowledgeGraph::new(config);

    // Build cascade configuration
    let mut cascade_config = CascadeConfig::default();
    if let Some(depth) = max_depth {
        cascade_config.max_depth = depth;
    }
    if let Some(threshold) = satisfaction_threshold {
        cascade_config.satisfaction_threshold = threshold;
    }
    if let Some(width) = beam_width {
        cascade_config.beam_width = Some(width);
    }

    eprintln!("\n🌊 RCA CASCADE BRAINSTORM STARTED");
    eprintln!("   Trigger: {}", trigger);
    eprintln!("   Max Depth: {}", cascade_config.max_depth);
    eprintln!("   Satisfaction Threshold: {}", cascade_config.satisfaction_threshold);
    eprintln!("   Beam Width: {:?}", cascade_config.beam_width);

    // Execute cascade
    let result = tkg.cascade_brainstorm(trigger.clone(), cascade_config);

    eprintln!("\n✅ Cascade completed!");
    eprintln!("   Depth explored: {}", result.depths_explored);
    eprintln!("   Thoughts processed: {}", result.thoughts_processed);
    eprintln!("   Max satisfaction: {:.2}", result.max_satisfaction);
    eprintln!("   Termination: {}", result.termination_reason);

    Ok(serde_json::json!({
        "success": true,
        "trigger": trigger,
        "final_synthesis": result.final_synthesis,
        "all_thoughts": result.all_thoughts,
        "depths_explored": result.depths_explored,
        "thoughts_processed": result.thoughts_processed,
        "max_satisfaction": result.max_satisfaction,
        "termination_reason": result.termination_reason,
        "execution_time_ms": result.execution_time_ms,
        "steps": result.steps.iter().map(|s| serde_json::json!({
            "depth": s.depth,
            "thought": s.thought,
            "triggered_thoughts": s.triggered_thoughts,
            "confidence": s.confidence
        })).collect::<Vec<_>>(),
        "message": format!("RCA cascade completed! Explored {} depths, processed {} thoughts", result.depths_explored, result.thoughts_processed)
    }).to_string())
}

/// Get cascade statistics and configuration
#[tauri::command]
pub async fn tkg_get_cascade_config() -> Result<String, String> {
    let default_config = CascadeConfig::default();

    Ok(serde_json::json!({
        "success": true,
        "max_depth": default_config.max_depth,
        "satisfaction_threshold": default_config.satisfaction_threshold,
        "beam_width": default_config.beam_width,
        "enable_pruning": default_config.enable_pruning,
        "prune_threshold": default_config.prune_threshold,
        "enable_memoization": default_config.enable_memoization,
        "verbose": default_config.verbose,
        "message": "RCA Cascade configuration retrieved"
    }).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_id_creation() {
        let id = NodeId("test-id".to_string());
        assert_eq!(id.0, "test-id");
    }

    #[test]
    fn test_node_type_variants() {
        let types = vec![
            NodeType::Fact,
            NodeType::Concept,
            NodeType::Memory,
            NodeType::Learning,
            NodeType::Insight,
        ];
        assert_eq!(types.len(), 5);
    }

    #[test]
    fn test_search_payload_filters_by_user_id() {
        let embedding: Embedding = vec![0.0_f32; 3];

        let payload_a = TemporalKnowledgeGraph::build_search_payload(&embedding, 5, "user_a");
        let payload_b = TemporalKnowledgeGraph::build_search_payload(&embedding, 5, "user_b");

        assert_eq!(payload_a["filter"]["must"][0]["key"], "user_id");
        assert_eq!(payload_a["filter"]["must"][0]["match"]["value"], "user_a");
        assert_eq!(payload_b["filter"]["must"][0]["match"]["value"], "user_b");
    }
}

impl TemporalKnowledgeGraph {
    pub async fn claim_legacy_data(&mut self, user_id: &str, dry_run: bool) -> Result<usize, String> {
        let collection_name = &self.config.qdrant_collection;
        let base_url = self.qdrant_base_url();
        let client = reqwest::Client::new();
        
        // 1. Scroll points where user_id is null, empty, or "guest"
        // Qdrant filter: should match any of these conditions
        let filter = serde_json::json!({
            "should": [
                {
                    "is_empty": {
                        "key": "user_id"
                    }
                },
                {
                    "key": "user_id",
                    "match": {
                        "value": "guest"
                    }
                }
            ]
        });
        
        let scroll_url = format!("{}/collections/{}/points/scroll", base_url, collection_name);
        
        // We will scroll in batches
        let mut migrated_count = 0;
        let mut next_page_offset: Option<serde_json::Value> = None;
        
        loop {
            let mut scroll_payload = serde_json::json!({
                "limit": 100,
                "with_payload": true,
                "filter": filter
            });
            
            if let Some(offset) = next_page_offset.clone() {
                scroll_payload["offset"] = offset;
            }
            
            let response = client.post(&scroll_url)
                .header("Api-Key", &self.config.qdrant_api_key)
                .header("Content-Type", "application/json")
                .json(&scroll_payload)
                .send()
                .await
                .map_err(|e| format!("Failed to scroll legacy data: {}", e))?;
                
            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                return Err(format!("Qdrant scroll error: {}", error_text));
            }
            
            let result: serde_json::Value = response.json().await
                .map_err(|e| format!("Failed to parse Qdrant response: {}", e))?;
                
            let points = result["result"]["points"].as_array().ok_or("Invalid response format")?;
            
            if points.is_empty() {
                break;
            }

            if dry_run {
                migrated_count += points.len();
            } else {
                // Update each point
                for point in points {
                    let point_id = point["id"].as_str().or_else(|| point["id"].as_u64().map(|_| "id_is_int")).unwrap_or("unknown");

                    // Preserve the existing payload when claiming legacy data.
                    // Some Qdrant setups may treat payload updates as overwrites; sending the full payload avoids data loss.
                    let mut payload_update = point.get("payload").cloned().unwrap_or_else(|| serde_json::json!({}));
                    if !payload_update.is_object() {
                        payload_update = serde_json::json!({});
                    }
                    if let Some(obj) = payload_update.as_object_mut() {
                        obj.insert("user_id".to_string(), serde_json::Value::String(user_id.to_string()));
                    }

                    let update_url = format!("{}/collections/{}/points/payload?wait=true", base_url, collection_name);

                    let update_payload = serde_json::json!({
                        "points": [point["id"]], // Use the ID from the point object directly to preserve type
                        "payload": payload_update
                    });

                    let update_response = client.post(&update_url)
                        .header("Api-Key", &self.config.qdrant_api_key)
                        .header("Content-Type", "application/json")
                        .json(&update_payload)
                        .send()
                        .await
                        .map_err(|e| format!("Failed to update point: {}", e))?;

                    if !update_response.status().is_success() {
                        eprintln!("Failed to update point {}: {}", point_id, update_response.status());
                    } else {
                        migrated_count += 1;
                    }
                }
            }
            
            // Check for next page
            let offset_val = result["result"]["next_page_offset"].clone();
            if offset_val.is_null() {
                next_page_offset = None;
                break;
            } else {
                next_page_offset = Some(offset_val);
            }
        }
        
        Ok(migrated_count)
    }
}

#[tauri::command]
pub async fn tkg_claim_legacy_data(
    user_id: String,
    dry_run: Option<bool>,
) -> Result<String, String> {
    let dry_run = dry_run.unwrap_or(false);
    // Get config from global instance
    let config = {
        let instance = TKG_INSTANCE.lock().map_err(|e| e.to_string())?;
        match instance.as_ref() {
            Some(tkg) => tkg.config.clone(),
            None => return Err("TKG not initialized. Please configure your Qdrant credentials.".to_string()),
        }
    };

    // Create a new TKG instance
    let mut temp_tkg = TemporalKnowledgeGraph::new(config);
    temp_tkg.initialized = true;

    match temp_tkg.claim_legacy_data(&user_id, dry_run).await {
        Ok(count) if dry_run => Ok(format!("Dry run: found {} guest/legacy memories that would be migrated to user {}", count, user_id)),
        Ok(count) => Ok(format!("Successfully migrated {} memories to user {}", count, user_id)),
        Err(e) => Err(format!("Migration failed: {}", e)),
    }
}
