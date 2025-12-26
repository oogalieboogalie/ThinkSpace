use async_trait::async_trait;
use serde_json::Value;

pub mod filesystem;

#[async_trait]
pub trait Tool: Send + Sync {
    /// The name of the tool (e.g., "read_file")
    fn name(&self) -> &str;

    /// A description of what the tool does
    fn description(&self) -> &str;

    /// The JSON schema for the tool's parameters
    fn parameters(&self) -> Value;

    /// Execute the tool with the given arguments
    async fn execute(&self, args: Value) -> Result<String, String>;
}
