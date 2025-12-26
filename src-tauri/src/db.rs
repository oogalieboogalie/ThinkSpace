use rusqlite::{Connection, Result, params};
use std::path::Path;

use crate::Project;

pub fn init_db(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT,
            description TEXT,
            stage TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS growth_tactics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            tactics TEXT,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS pricing_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            current_pricing TEXT,
            recommendations TEXT,
            analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )",
        [],
    )?;

    Ok(conn)
}

pub fn insert_project(conn: &Connection, project: &Project) -> Result<i64> {
    conn.execute(
        "INSERT INTO projects (name, category, description, stage)
         VALUES (?1, ?2, ?3, ?4)",
        params![
            &project.name,
            &project.category,
            &project.description,
            &project.stage
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

pub fn get_all_projects(conn: &Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, category, description, stage FROM projects ORDER BY created_at DESC"
    )?;

    let projects = stmt.query_map([], |row| {
        Ok(Project {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            category: row.get(2)?,
            description: row.get(3)?,
            stage: row.get(4)?,
        })
    })?;

    projects.collect()
}
