use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use ignore::gitignore::GitignoreBuilder;
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: PathBuf,
    pub relative_path: String,
    pub extension: Option<String>,
    pub size: u64,
    pub is_text: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoIndex {
    pub root_path: PathBuf,
    pub files: Vec<FileInfo>,
    pub total_files: usize,
    pub total_size: u64,
}

impl RepoIndex {
    /// Create a new empty index
    pub fn new(root_path: PathBuf) -> Self {
        Self {
            root_path,
            files: Vec::new(),
            total_files: 0,
            total_size: 0,
        }
    }

    /// Index a repository directory
    pub fn index_directory(repo_path: &Path) -> Result<Self> {
        let mut index = Self::new(repo_path.to_path_buf());

        // Build gitignore matcher
        let gitignore = Self::build_gitignore(repo_path)?;

        // Walk the directory tree
        for entry in WalkDir::new(repo_path)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| !Self::is_hidden(e))
        {
            let entry = entry.context("Failed to read directory entry")?;
            let path = entry.path();

            // Skip directories
            if !path.is_file() {
                continue;
            }

            // Check if file should be ignored
            let relative_path = path.strip_prefix(repo_path)
                .context("Failed to get relative path")?;

            if gitignore.matched(relative_path, false).is_ignore() {
                continue;
            }

            // Get file metadata
            let metadata = entry.metadata().context("Failed to read file metadata")?;
            let size = metadata.len();

            // Determine if it's a text file
            let extension = path.extension()
                .and_then(|e| e.to_str())
                .map(|s| s.to_string());

            let is_text = Self::is_likely_text_file(&extension, size);

            // Add to index
            let file_info = FileInfo {
                path: path.to_path_buf(),
                relative_path: relative_path.to_string_lossy().to_string(),
                extension,
                size,
                is_text,
            };

            index.total_size += size;
            index.files.push(file_info);
        }

        index.total_files = index.files.len();
        Ok(index)
    }

    /// Build gitignore matcher for the repository
    fn build_gitignore(repo_path: &Path) -> Result<ignore::gitignore::Gitignore> {
        let mut builder = GitignoreBuilder::new(repo_path);

        // Add .gitignore file if it exists
        let gitignore_path = repo_path.join(".gitignore");
        if gitignore_path.exists() {
            builder.add(gitignore_path);
        }

        // Add common patterns to ignore
        builder.add_line(None, "node_modules/")?;
        builder.add_line(None, "target/")?;
        builder.add_line(None, ".git/")?;
        builder.add_line(None, "dist/")?;
        builder.add_line(None, "build/")?;
        builder.add_line(None, "*.lock")?;
        builder.add_line(None, "package-lock.json")?;
        builder.add_line(None, "yarn.lock")?;

        Ok(builder.build()?)
    }

    /// Check if a directory entry is hidden
    fn is_hidden(entry: &walkdir::DirEntry) -> bool {
        // Only hide .git directory and its contents
        // Allow other dotfiles like .env, .gitignore, .github, etc.
        entry.file_name()
            .to_str()
            .map(|s| s == ".git")
            .unwrap_or(false)
    }

    /// Determine if a file is likely a text file based on extension and size
    fn is_likely_text_file(extension: &Option<String>, size: u64) -> bool {
        // Skip very large files (>2MB)
        if size > 2_000_000 {
            return false;
        }

        // Check common text file extensions
        if let Some(ext) = extension {
            let text_extensions = [
                "rs", "toml", "json", "md", "txt", "js", "ts", "tsx", "jsx",
                "py", "go", "java", "c", "cpp", "h", "hpp", "cs", "rb",
                "php", "html", "css", "scss", "yaml", "yml", "xml", "sh",
                "bash", "zsh", "fish", "ps1", "bat", "cmd", "sql", "proto",
                "graphql", "vue", "svelte", "astro",
                // Config and other text files
                "env", "gitignore", "dockerignore", "editorconfig", 
                "conf", "cfg", "ini", "properties", "gradle",
                "lock", "log", "svg", "csv", "tsv",
            ];

            return text_extensions.contains(&ext.to_lowercase().as_str());
        }

        // If no extension (e.g. Dockerfile, Makefile, LICENSE), assume it's text
        // provided it's not too large (already checked above)
        true
    }

    /// Get files matching a query (simple substring match for now)
    pub fn search_files(&self, query: &str) -> Vec<&FileInfo> {
        self.files
            .iter()
            .filter(|f| f.relative_path.to_lowercase().contains(&query.to_lowercase()))
            .collect()
    }

    /// Get file content as string
    pub fn read_file_content(path: &Path) -> Result<String> {
        std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read file: {}", path.display()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_likely_text_file() {
        assert!(RepoIndex::is_likely_text_file(&Some("rs".to_string()), 1000));
        assert!(RepoIndex::is_likely_text_file(&Some("json".to_string()), 1000));
        assert!(RepoIndex::is_likely_text_file(&Some("env".to_string()), 1000));
        assert!(RepoIndex::is_likely_text_file(&None, 1000)); // No extension
        
        assert!(!RepoIndex::is_likely_text_file(&Some("exe".to_string()), 1000));
        assert!(!RepoIndex::is_likely_text_file(&Some("rs".to_string()), 3_000_000)); // > 2MB
    }
}
