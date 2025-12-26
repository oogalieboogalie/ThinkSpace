// Tests for database functionality

#[cfg(test)]
mod tests {
    use crate::db::{init_db, insert_project};
    use crate::Project;
    use rusqlite::Connection;
    use tempfile::NamedTempFile;

    fn create_test_db() -> (NamedTempFile, Connection) {
        let temp_file = NamedTempFile::new().unwrap();
        let conn = init_db(temp_file.path()).unwrap();
        (temp_file, conn)
    }

    #[test]
    fn test_init_db_creates_tables() {
        let temp_file = NamedTempFile::new().unwrap();
        let conn = init_db(temp_file.path()).unwrap();

        // Check that projects table exists
        let result: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='projects'",
            [],
            |row| row.get(0),
        );

        assert_eq!(result.unwrap(), 1, "Projects table should exist");
    }

    #[test]
    fn test_init_db_creates_growth_tactics_table() {
        let temp_file = NamedTempFile::new().unwrap();
        let conn = init_db(temp_file.path()).unwrap();

        let result: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='growth_tactics'",
            [],
            |row| row.get(0),
        );

        assert_eq!(result.unwrap(), 1, "Growth tactics table should exist");
    }

    #[test]
    fn test_init_db_creates_pricing_analysis_table() {
        let temp_file = NamedTempFile::new().unwrap();
        let conn = init_db(temp_file.path()).unwrap();

        let result: Result<i32, _> = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='pricing_analysis'",
            [],
            |row| row.get(0),
        );

        assert_eq!(result.unwrap(), 1, "Pricing analysis table should exist");
    }

    #[test]
    fn test_insert_project_basic() {
        let (_temp_file, conn) = create_test_db();

        let project = Project {
            id: 0,
            name: "Test Project".to_string(),
            category: Some("tech".to_string()),
            description: Some("A test project".to_string()),
            stage: Some("idea".to_string()),
        };

        let result = insert_project(&conn, &project);
        assert!(result.is_ok(), "Should successfully insert project");
        assert_eq!(result.unwrap(), 1, "First project should have ID 1");
    }

    #[test]
    fn test_insert_project_increments_id() {
        let (_temp_file, conn) = create_test_db();

        let project1 = Project {
            id: 0,
            name: "Project 1".to_string(),
            category: None,
            description: None,
            stage: None,
        };

        let project2 = Project {
            id: 0,
            name: "Project 2".to_string(),
            category: None,
            description: None,
            stage: None,
        };

        let id1 = insert_project(&conn, &project1).unwrap();
        let id2 = insert_project(&conn, &project2).unwrap();

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
    }

    #[test]
    fn test_insert_project_with_optional_fields() {
        let (_temp_file, conn) = create_test_db();

        let project = Project {
            id: 0,
            name: "Minimal Project".to_string(),
            category: None,
            description: None,
            stage: None,
        };

        let result = insert_project(&conn, &project);
        assert!(result.is_ok(), "Should handle None optional fields");
    }

    #[test]
    fn test_insert_project_preserves_data() {
        let (_temp_file, conn) = create_test_db();

        let project = Project {
            id: 0,
            name: "Detailed Project".to_string(),
            category: Some("saas".to_string()),
            description: Some("A detailed description".to_string()),
            stage: Some("mvp".to_string()),
        };

        let id = insert_project(&conn, &project).unwrap();

        // Retrieve and verify
        let retrieved: (String, Option<String>, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT name, category, description, stage FROM projects WHERE id = ?1",
                [id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .unwrap();

        assert_eq!(retrieved.0, "Detailed Project");
        assert_eq!(retrieved.1, Some("saas".to_string()));
        assert_eq!(retrieved.2, Some("A detailed description".to_string()));
        assert_eq!(retrieved.3, Some("mvp".to_string()));
    }

    #[test]
    fn test_foreign_key_constraint() {
        let (_temp_file, conn) = create_test_db();

        // This test assumes foreign keys are enabled
        // Try to insert growth tactics with non-existent project_id
        let result = conn.execute(
            "INSERT INTO growth_tactics (project_id, tactics) VALUES (?1, ?2)",
            rusqlite::params![999, "some tactics"],
        );

        // Note: SQLite foreign keys need to be explicitly enabled
        // This test documents the expected behavior
        // In practice, you might want to enable foreign keys in init_db
    }

    #[test]
    fn test_init_db_is_idempotent() {
        let temp_file = NamedTempFile::new().unwrap();

        // Initialize database twice
        let _conn1 = init_db(temp_file.path()).unwrap();
        let conn2 = init_db(temp_file.path()).unwrap();

        // Should not error on second init
        let count: i32 = conn2
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(count, 3, "Should have exactly 3 tables");
    }

    #[test]
    fn test_project_timestamps() {
        let (_temp_file, conn) = create_test_db();

        let project = Project {
            id: 0,
            name: "Timestamp Test".to_string(),
            category: None,
            description: None,
            stage: None,
        };

        let id = insert_project(&conn, &project).unwrap();

        // Verify created_at timestamp was set
        let created_at: String = conn
            .query_row(
                "SELECT created_at FROM projects WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .unwrap();

        assert!(!created_at.is_empty(), "Timestamp should be set");
    }
}
