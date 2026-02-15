/**
 * ChatWeb.ai API client
 *
 * Provides access to chatweb.ai's AI chat and analysis capabilities.
 * Uses the explore endpoint for parallel multi-model analysis.
 */

use serde::{Deserialize, Serialize};
use std::time::Duration;

const CHATWEB_API_URL: &str = "https://chatweb.ai/api/v1";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Serialize)]
struct ChatExploreRequest {
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatExploreResponse {
    #[serde(default)]
    responses: Vec<ModelResponse>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ModelResponse {
    model: String,
    response: String,
    #[serde(default)]
    tokens: u32,
    #[serde(default)]
    latency_ms: u64,
}

/// Article analysis result from ChatWeb.ai
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArticleAnalysis {
    pub summary: String,
    pub keywords: Vec<String>,
    pub sentiment: String, // "positive", "negative", "neutral"
    pub importance_score: f32, // 0.0 - 1.0
    pub category: String,
}

pub struct ChatWebClient {
    client: reqwest::Client,
    api_url: String,
}

impl ChatWebClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            api_url: CHATWEB_API_URL.to_string(),
        }
    }

    /// Analyze an article using ChatWeb.ai's explore mode (parallel multi-model)
    pub async fn analyze_article(
        &self,
        title: &str,
        description: &str,
        url: &str,
    ) -> Result<ArticleAnalysis, String> {
        let prompt = format!(
            r#"Analyze this news article and provide structured output in JSON format:

Title: {}
Description: {}
URL: {}

Provide analysis in this exact JSON format:
{{
  "summary": "Brief 2-sentence summary in Japanese (max 100 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sentiment": "positive|negative|neutral",
  "importance_score": 0.0-1.0,
  "category": "tech|business|sports|entertainment|science|podcast|other"
}}

Focus on:
- Summary: Concise, informative, Japanese language
- Keywords: 3-5 relevant terms
- Sentiment: Overall tone
- Importance: Breaking news=0.9+, regular=0.5, minor=0.3
- Category: Best fit from the list

Return ONLY the JSON object, no additional text."#,
            title, description, url
        );

        let request = ChatExploreRequest {
            message: prompt,
            session_id: None,
        };

        let response = self
            .client
            .post(format!("{}/chat/explore", self.api_url))
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("ChatWeb API request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("ChatWeb API error: {}", response.status()));
        }

        let data: ChatExploreResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse ChatWeb response: {}", e))?;

        if let Some(error) = data.error {
            return Err(format!("ChatWeb API error: {}", error));
        }

        // Find the best response (prefer claude models, then by latency)
        let best_response = data
            .responses
            .iter()
            .filter(|r| !r.response.is_empty())
            .min_by_key(|r| {
                let is_claude = r.model.contains("claude");
                let penalty = if is_claude { 0 } else { 10000 };
                penalty + r.latency_ms
            })
            .ok_or("No valid responses from ChatWeb API")?;

        // Parse JSON from response
        let analysis = self.parse_analysis(&best_response.response)?;

        Ok(analysis)
    }

    /// Parse analysis JSON from ChatWeb response
    fn parse_analysis(&self, response: &str) -> Result<ArticleAnalysis, String> {
        // Extract JSON from response (may have markdown code blocks)
        let json_str = if response.contains("```json") {
            response
                .split("```json")
                .nth(1)
                .and_then(|s| s.split("```").next())
                .unwrap_or(response)
                .trim()
        } else if response.contains("```") {
            response
                .split("```")
                .nth(1)
                .unwrap_or(response)
                .trim()
        } else {
            response.trim()
        };

        // Try to parse as JSON
        let analysis: ArticleAnalysis = serde_json::from_str(json_str)
            .map_err(|e| format!("Failed to parse analysis JSON: {} (response: {})", e, json_str))?;

        // Validate analysis
        if analysis.summary.is_empty() {
            return Err("Analysis summary is empty".to_string());
        }

        if analysis.keywords.is_empty() {
            return Err("Analysis keywords are empty".to_string());
        }

        if !["positive", "negative", "neutral"].contains(&analysis.sentiment.as_str()) {
            return Err(format!("Invalid sentiment: {}", analysis.sentiment));
        }

        if !(0.0..=1.0).contains(&analysis.importance_score) {
            return Err(format!(
                "Invalid importance score: {}",
                analysis.importance_score
            ));
        }

        Ok(analysis)
    }

    /// Analyze multiple articles in parallel
    pub async fn analyze_articles_parallel(
        &self,
        articles: Vec<(&str, &str, &str)>, // (title, description, url)
        max_concurrent: usize,
    ) -> Vec<Result<ArticleAnalysis, String>> {
        use futures::stream::{self, StreamExt};

        stream::iter(articles)
            .map(|(title, desc, url)| async move {
                self.analyze_article(title, desc, url).await
            })
            .buffer_unordered(max_concurrent)
            .collect::<Vec<_>>()
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_parse_analysis() {
        let client = ChatWebClient::new();

        let json_response = r#"{
  "summary": "テスト記事の要約です。AIによる分析結果。",
  "keywords": ["AI", "分析", "テスト"],
  "sentiment": "neutral",
  "importance_score": 0.6,
  "category": "tech"
}"#;

        let result = client.parse_analysis(json_response);
        assert!(result.is_ok());

        let analysis = result.unwrap();
        assert_eq!(analysis.keywords.len(), 3);
        assert_eq!(analysis.sentiment, "neutral");
        assert_eq!(analysis.category, "tech");
    }

    #[tokio::test]
    async fn test_parse_analysis_with_markdown() {
        let client = ChatWebClient::new();

        let markdown_response = r#"Here's the analysis:

```json
{
  "summary": "マークダウン形式のテスト。",
  "keywords": ["test"],
  "sentiment": "positive",
  "importance_score": 0.5,
  "category": "other"
}
```

Hope this helps!"#;

        let result = client.parse_analysis(markdown_response);
        assert!(result.is_ok());
    }
}
