// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

mod db;
mod commands;
mod repo_indexer;
mod ai_provider;
mod minimax_api;
mod minimax_enhanced;
mod file_watcher;
mod tkg;
mod scanner;
mod session;
mod deep_research;

// Import the orchestrate_agents module from commands
use commands::orchestrate_agents;
use session::{save_session, load_session, list_sessions};

pub use tkg::*;

#[derive(Debug, Serialize, Deserialize)]
struct Project {
    id: Option<i64>,
    name: String,
    category: String,
    description: String,
    stage: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PricingAnalysis {
    current_pricing: serde_json::Value,
    recommendations: Vec<String>,
    expected_impact: f64,
    ab_test_plan: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct PitchAnalysis {
    overall_score: i32,
    red_flags: Vec<RedFlag>,
    green_flags: Vec<GreenFlag>,
    recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RedFlag {
    slide: i32,
    severity: i32,
    issue: String,
    fix: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GreenFlag {
    slide: i32,
    strength: String,
    recommendation: String,
}

#[tauri::command]
async fn analyze_growth_tactics(
    _product: Project,
    _knowledge_base: String,
) -> Result<Vec<String>, String> {
    // TODO: Call Claude API with product info + knowledge base
    // For now, return mock data
    Ok(vec![
        "Product Hunt Launch".to_string(),
        "Reddit Marketing".to_string(),
        "LinkedIn Content Strategy".to_string(),
    ])
}

#[tauri::command]
async fn calculate_k_factor(
    _total_users: i32,
    invites_per_user: f64,
    conversion_rate: f64,
) -> Result<f64, String> {
    let k_factor = invites_per_user * conversion_rate;
    Ok(k_factor)
}

#[tauri::command]
async fn analyze_pricing(
    current_pricing: serde_json::Value,
) -> Result<PricingAnalysis, String> {
    // TODO: Call Claude API for analysis
    Ok(PricingAnalysis {
        current_pricing,
        recommendations: vec![
            "Use charm pricing (.99)".to_string(),
            "Add third tier for anchoring".to_string(),
        ],
        expected_impact: 0.25,
        ab_test_plan: serde_json::json!({
            "variants": ["control", "charm_pricing"],
            "duration": "2 weeks"
        }),
    })
}

#[tauri::command]
async fn analyze_pitch_deck(_deck_path: String) -> Result<PitchAnalysis, String> {
    // TODO: Extract PDF text, call Claude API
    Ok(PitchAnalysis {
        overall_score: 42,
        red_flags: vec![
            RedFlag {
                slide: 5,
                severity: 9,
                issue: "TAM calculation too broad".to_string(),
                fix: "Use bottom-up TAM calculation".to_string(),
            }
        ],
        green_flags: vec![
            GreenFlag {
                slide: 6,
                strength: "40% MoM growth".to_string(),
                recommendation: "Make this the headline".to_string(),
            }
        ],
        recommendations: vec![
            "Fix TAM slide".to_string(),
            "Add technical co-founder".to_string(),
        ],
    })
}

#[tauri::command]
async fn save_project(app_handle: tauri::AppHandle, project: Project) -> Result<i64, String> {
    let app_data = app_handle.path_resolver().app_data_dir()
        .ok_or("Failed to get app data dir")?;

    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;

    let db_path = app_data.join("data.db");
    let conn = db::init_db(&db_path).map_err(|e| e.to_string())?;

    db::insert_project(&conn, &project).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_projects(app_handle: tauri::AppHandle) -> Result<Vec<Project>, String> {
    let app_data = app_handle.path_resolver().app_data_dir()
        .ok_or("Failed to get app data dir")?;

    let db_path = app_data.join("data.db");
    let conn = db::init_db(&db_path).map_err(|e| e.to_string())?;

    db::get_all_projects(&conn).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(commands::AppState::new())
        .invoke_handler(tauri::generate_handler![
            // Original commands
            analyze_growth_tactics,
            calculate_k_factor,
            analyze_pricing,
            analyze_pitch_deck,
            save_project,
            get_projects,
            // Repo explorer commands
            commands::init_ai_provider,
            commands::index_repository,
            commands::get_repo_files,
            commands::search_files,
            commands::read_file,
            commands::ask_ai_question,
            // Knowledge Companion commands
            minimax_api::get_content_structure,
            minimax_api::read_markdown_file,
            minimax_api::save_markdown_file,
            minimax_api::search_content,
            minimax_api::chat_with_minimax,
            minimax_api::generate_image_minimax,
            minimax_api::get_progress,
            minimax_api::mark_guide_read,
            minimax_api::download_image,
            // Enhanced MiniMax M2 agent commands
            minimax_enhanced::chat_with_agent,
            minimax_enhanced::chat_with_agent_stream,
            minimax_enhanced::create_study_guide_enhanced,
            minimax_enhanced::list_blueprint_files,
            minimax_enhanced::read_blueprint_file,
            // Temporal Knowledge Graph commands
            tkg::tkg_initialize,
            tkg::tkg_store_knowledge,
            tkg::tkg_search_similar,
            tkg::tkg_test_connection,
            tkg::tkg_relate_nodes,
            tkg::tkg_query_temporal,
            tkg::tkg_backup_consciousness,
            tkg::tkg_get_stats,
            // RCA Cascade commands
            tkg::tkg_cascade_brainstorm,
            tkg::tkg_get_cascade_config,
            tkg::tkg_claim_legacy_data,
            // Agent Orchestration
            orchestrate_agents::orchestrate_agents,
            orchestrate_agents::create_agent_chain,
            orchestrate_agents::list_agent_chains,
            orchestrate_agents::start_agent_debate,
            // Media Window Command
            open_media_window,
            // Codebase Scanner
            scanner::scan_codebase,
            // Session Management
            save_session,
            load_session,
            list_sessions,
        ])
        .setup(|app| {
            // Initialize database on startup
            let app_data = app.path_resolver().app_data_dir()
                .ok_or("Failed to get app data dir")?;

            std::fs::create_dir_all(&app_data)?;
            let db_path = app_data.join("data.db");
            db::init_db(&db_path)?;

            // Initialize knowledge companion database
            let kc_db_path = app_data.join("knowledge_companion.db");
            minimax_api::init_kc_database(&kc_db_path)?;

            // Setup file watcher for automatic content refresh
            file_watcher::setup_file_watcher(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn open_media_window(app: tauri::AppHandle, url: String, label: &str) -> Result<(), String> {
    tauri::WindowBuilder::new(&app, label, tauri::WindowUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?))
        .title("Media Preview")
        .inner_size(800.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}
