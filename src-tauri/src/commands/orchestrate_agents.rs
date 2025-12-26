use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
pub struct OrchestrateAgentRequest {
    pub chain_id: String,
    pub task: String,
    pub api_key: String,
    pub context: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentExecution {
    pub agent_id: String,
    pub agent_name: String,
    pub success: bool,
    pub content: String,
    pub error: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrchestrateAgentResponse {
    pub chain_id: String,
    pub chain_name: String,
    pub executions: Vec<AgentExecution>,
    pub total_duration_ms: u64,
}

#[tauri::command]
pub async fn orchestrate_agents(
    request: OrchestrateAgentRequest,
) -> Result<OrchestrateAgentResponse, String> {
    let start_time = std::time::Instant::now();

    let start_time = std::time::Instant::now();

    // Check for Deep Research Chain
    if request.chain_id == "deep-research-v1" {
        eprintln!("🚀 Starting Deep Research Agent Chain");
        
        // Initialize Minimax Agent
        // Note: We need to get the Tavily key from the request or environment
        // For now, we'll assume it might be passed in context or we need to fetch it
        // But the request struct has api_key (Minimax). 
        // We'll try to get Tavily key from context if available, otherwise empty (which might fail search)
        let tavily_key = request.context.as_ref()
            .and_then(|ctx| ctx.get("tavily_api_key"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let mut agent = crate::minimax_enhanced::MinimaxAgent::new(
            request.api_key.clone(),
            tavily_key,
            None, // No Grok key for now
            None  // No Gemini key for now
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
        let result = agent.run_autonomous_task(request.task.clone()).await?;

        let response = OrchestrateAgentResponse {
            chain_id: request.chain_id,
            chain_name: "Deep Research Agent".to_string(),
            executions: vec![
                AgentExecution {
                    agent_id: "deep-researcher".to_string(),
                    agent_name: "Deep Research Agent".to_string(),
                    success: true,
                    content: result,
                    error: None,
                    timestamp: chrono::Utc::now().timestamp_millis() as u64,
                },
            ],
            total_duration_ms: start_time.elapsed().as_millis() as u64,
        };

        return Ok(response);
    }

    // Fallback for other chains (Mock)
    let mock_response = OrchestrateAgentResponse {
        chain_id: request.chain_id,
        chain_name: "Content Creation Pipeline".to_string(),
        executions: vec![
            AgentExecution {
                agent_id: "researcher-v1".to_string(),
                agent_name: "Research Specialist".to_string(),
                success: true,
                content: "# Research Results\n\n[Mock research output]".to_string(),
                error: None,
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
            },
            AgentExecution {
                agent_id: "planner-v1".to_string(),
                agent_name: "Strategic Planner".to_string(),
                success: true,
                content: "# Content Plan\n\n[Mock planning output]".to_string(),
                error: None,
                timestamp: chrono::Utc::now().timestamp_millis() as u64,
            },
        ],
        total_duration_ms: start_time.elapsed().as_millis() as u64,
    };

    Ok(mock_response)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateChainRequest {
    pub name: String,
    pub description: Option<String>,
    pub agent_ids: Vec<String>,
}

#[tauri::command]
pub async fn create_agent_chain(
    request: CreateChainRequest,
) -> Result<String, String> {
    // In a real implementation, this would:
    // 1. Store the chain configuration
    // 2. Return a chain ID
    // 3. Validate that all agent IDs exist

    let chain_id = format!("chain-{}-{}-v1",
        request.name.to_lowercase().replace(" ", "-"),
        chrono::Utc::now().timestamp()
    );

    Ok(chain_id)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListChainsResponse {
    pub chains: Vec<AgentChainInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentChainInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub agent_count: usize,
    pub created_at: u64,
}

#[tauri::command]
pub async fn list_agent_chains() -> Result<ListChainsResponse, String> {
    // Return all registered chains

    let chains = vec![
        AgentChainInfo {
            id: "content-creation-v1".to_string(),
            name: "Content Creation Pipeline".to_string(),
            description: "Full pipeline: Research → Plan → Write → Review".to_string(),
            agent_count: 4,
            created_at: chrono::Utc::now().timestamp_millis() as u64,
        },
        AgentChainInfo {
            id: "research-review-v1".to_string(),
            name: "Research with Review".to_string(),
            description: "Research with quality review".to_string(),
            agent_count: 2,
            created_at: chrono::Utc::now().timestamp_millis() as u64,
        },
    ];

    Ok(ListChainsResponse { chains })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebateRequest {
    pub topic: String,
    pub api_key: String,
    pub turns: Option<usize>,
    pub provider: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebateTurn {
    pub speaker: String,
    pub content: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DebateResponse {
    pub topic: String,
    pub transcript: Vec<DebateTurn>,
    pub final_consensus: String,
}

#[tauri::command]
pub async fn start_agent_debate(
    request: DebateRequest,
) -> Result<DebateResponse, String> {
    let turns = request.turns.unwrap_or(3);
    let mut transcript = Vec::new();
    
    // Initialize Agents
    let provider_enum = match request.provider.as_deref() {
        Some("grok") => crate::minimax_enhanced::AIProvider::Grok,
        Some("gemini") => crate::minimax_enhanced::AIProvider::Gemini,
        _ => crate::minimax_enhanced::AIProvider::Minimax,
    };

    eprintln!("🔍 Debate Provider: {:?}", provider_enum);
    let masked_key = if request.api_key.len() > 10 {
        format!("{}...", &request.api_key[..10])
    } else {
        "SHORT_KEY".to_string()
    };
    eprintln!("🔑 API Key (masked): {}", masked_key);

    // Determine keys based on provider
    let (primary_key, gemini_key) = match provider_enum {
        crate::minimax_enhanced::AIProvider::Gemini => ("".to_string(), Some(request.api_key.clone())),
        _ => (request.api_key.clone(), None),
    };

    // Agent A: The Architect (Creative, Constructive)
    let mut architect = crate::minimax_enhanced::MinimaxAgent::new(
        primary_key.clone(),
        None,
        None,
        gemini_key.clone()
    ).with_provider(provider_enum.clone())
     .with_system_prompt(r#"You are The Architect.
Your goal is to design robust, scalable, and innovative solutions.
When presented with a topic, propose a high-level technical design.
When critiqued, refine your design to address the concerns while maintaining the core vision.
Be concise but specific."#.to_string());

    // Agent B: The Critic (Security, Performance, Reliability)
    let mut critic = crate::minimax_enhanced::MinimaxAgent::new(
        primary_key,
        None,
        None,
        gemini_key
    ).with_provider(provider_enum)
     .with_system_prompt(r#"You are The Critic.
Your goal is to find flaws, security risks, and performance bottlenecks.
Review the Architect's proposals with extreme scrutiny.
Point out edge cases, race conditions, and scalability issues.
Be constructive but ruthless."#.to_string());

    // Disable tools for debate to focus on pure reasoning
    let no_tools = std::collections::HashMap::new();
    architect = architect.with_enabled_tools(no_tools.clone());
    critic = critic.with_enabled_tools(no_tools);

    let mut current_context = format!("Topic: {}", request.topic);
    let mut last_message = String::new();
    let think_regex = Regex::new(r"(?s)<think>.*?</think>").unwrap();

    eprintln!("🚀 Starting debate on topic: {}", request.topic);

    for i in 0..turns {
        eprintln!("🏁 Debate Turn {}/{}", i + 1, turns);

        // Turn 1: Architect Proposal
        if i == 0 {
            architect.add_user_message(format!("Please propose a solution for: {}", request.topic));
        } else {
            // Architect responds to Critic
            architect.add_user_message(format!("The Critic raised these points:\n{}\n\nRefine your design.", last_message));
        }

        eprintln!("🗣️ Architect is thinking...");
        let arch_response = architect.chat(1).await?;
        eprintln!("✅ Architect responded");
        // Strip think tags for the transcript to save tokens
        let clean_content = think_regex.replace_all(&arch_response.content, "").trim().to_string();
        last_message = clean_content.clone();
        
        transcript.push(DebateTurn {
            speaker: "Architect".to_string(),
            content: last_message.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        });

        // Turn 2: Critic Review
        critic.add_user_message(format!("The Architect proposed:\n{}\n\nCritique this design.", last_message));
        eprintln!("🤔 Critic is thinking...");
        let critic_response = critic.chat(1).await?;
        eprintln!("✅ Critic responded");
        let clean_content = think_regex.replace_all(&critic_response.content, "").trim().to_string();
        last_message = clean_content.clone();

        transcript.push(DebateTurn {
            speaker: "Critic".to_string(),
            content: last_message.clone(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
        });
    }

    // Final Consensus (Architect's final word)
    eprintln!("⚖️ Generating Final Consensus...");
    architect.add_user_message(format!("Considering the Critic's feedback:\n{}\n\nProvide the FINAL, polished solution.", last_message));
    let final_response = architect.chat(1).await?;
    eprintln!("✅ Final Consensus generated");
    
    let clean_consensus = think_regex.replace_all(&final_response.content, "").trim().to_string();

    transcript.push(DebateTurn {
        speaker: "Architect (Final)".to_string(),
        content: clean_consensus.clone(),
        timestamp: chrono::Utc::now().timestamp_millis() as u64,
    });

    Ok(DebateResponse {
        topic: request.topic,
        transcript,
        final_consensus: clean_consensus,
    })
}
