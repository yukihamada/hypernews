use crate::claude;
use crate::db::Db;
use crate::stripe;
use axum::extract::{Path, Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use news_core::changes::{AdminAction, ChangeRequest, ChangeStatus};
use news_core::config::DynamicFeed;
use news_core::grouping;
use news_core::models::{ArticlesResponse, Category, CategoryInfo};
use axum::body::Body;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::sync::Arc;
use std::time::Duration;
use tracing::{info, warn};

fn cache_key(endpoint: &str, body: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(endpoint.as_bytes());
    hasher.update(b":");
    hasher.update(body.as_bytes());
    hex::encode(hasher.finalize())
}

pub struct AppState {
    pub db: Arc<Db>,
    pub http_client: reqwest::Client,
    pub api_key: String,
    pub elevenlabs_api_key: String,
    pub openai_api_key: String,
    pub cartesia_api_key: String,
    pub fish_audio_api_key: String,
    pub aimlapi_key: String,
    pub venice_api_key: String,
    pub runpod_api_key: String,
    pub runpod_client: reqwest::Client,
    pub cosyvoice_endpoint_id: String,
    pub qwen_tts_endpoint_id: String,
    pub qwen_omni_endpoint_id: String,
    pub stripe_secret_key: String,
    pub stripe_webhook_secret: String,
    pub stripe_price_id: String,
    pub admin_secret: String,
    pub base_url: String,
}

/// Check admin auth. Returns error response if unauthorized.
fn check_admin_auth(headers: &HeaderMap, state: &AppState) -> Result<(), Response> {
    if state.admin_secret.is_empty() {
        // No secret configured = open (dev mode)
        return Ok(());
    }
    let provided = headers
        .get("x-admin-secret")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if provided == state.admin_secret {
        Ok(())
    } else {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "管理者認証が必要です"})),
        )
            .into_response())
    }
}

#[derive(Debug)]
pub enum UserTier {
    Anonymous,
    Free { device_id: String },
    Pro,
}

fn extract_user_tier(headers: &HeaderMap, db: &Db) -> UserTier {
    // Check for Pro token first
    if let Some(auth) = headers.get("authorization") {
        if let Ok(val) = auth.to_str() {
            if let Some(token) = val.strip_prefix("Bearer ") {
                if let Ok(Some((_, _, status, period_end))) = db.get_subscription_by_token(token) {
                    if status == "active" {
                        // Check if period hasn't expired
                        if let Ok(end) = period_end.parse::<chrono::DateTime<chrono::Utc>>() {
                            if end > chrono::Utc::now() {
                                return UserTier::Pro;
                            }
                        }
                    }
                }
            }
        }
    }

    // Check for device ID
    if let Some(device_id) = headers.get("x-device-id") {
        if let Ok(id) = device_id.to_str() {
            if !id.is_empty() {
                return UserTier::Free {
                    device_id: id.to_string(),
                };
            }
        }
    }

    UserTier::Anonymous
}

struct FeatureLimit {
    name: &'static str,
    daily_limit: i64,
}

const FEATURE_LIMITS: &[FeatureLimit] = &[
    FeatureLimit { name: "summarize", daily_limit: 1 },
    FeatureLimit { name: "questions", daily_limit: 5 },
    FeatureLimit { name: "ask", daily_limit: 5 },
    FeatureLimit { name: "tts", daily_limit: 3 },
    FeatureLimit { name: "to_reading", daily_limit: 5 },
    FeatureLimit { name: "podcast", daily_limit: 3 },
];

fn get_daily_limit(feature: &str) -> i64 {
    FEATURE_LIMITS
        .iter()
        .find(|f| f.name == feature)
        .map(|f| f.daily_limit)
        .unwrap_or(5)
}

fn check_rate_limit(
    db: &Db,
    tier: &UserTier,
    feature: &str,
) -> Result<(), Response> {
    match tier {
        UserTier::Pro => Ok(()),
        UserTier::Free { device_id } => {
            let limit = get_daily_limit(feature);
            let used = db.get_usage(device_id, feature).unwrap_or(0);
            if used >= limit {
                Err((
                    StatusCode::PAYMENT_REQUIRED,
                    Json(serde_json::json!({
                        "error": "rate_limit_exceeded",
                        "message": format!("本日の{}回数上限（{}回）に達しました。Proプランにアップグレードすると無制限でご利用いただけます。", feature, limit),
                        "feature": feature,
                        "limit": limit,
                        "used": used,
                        "upgrade_url": "/pro"
                    })),
                )
                    .into_response())
            } else {
                Ok(())
            }
        }
        UserTier::Anonymous => {
            Err((
                StatusCode::PAYMENT_REQUIRED,
                Json(serde_json::json!({
                    "error": "device_id_required",
                    "message": "AI機能を利用するにはデバイスIDが必要です。"
                })),
            )
                .into_response())
        }
    }
}

fn increment_if_free(db: &Db, tier: &UserTier, feature: &str) {
    if let UserTier::Free { device_id } = tier {
        let _ = db.increment_usage(device_id, feature);
    }
}

#[derive(Deserialize)]
pub struct ArticlesQuery {
    pub category: Option<String>,
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

#[derive(Deserialize)]
pub struct CommandRequest {
    pub command: String,
}

#[derive(Deserialize)]
pub struct SummarizeRequest {
    pub minutes: u32,
}

#[derive(Deserialize)]
pub struct ToggleFeatureRequest {
    pub feature: String,
    pub enabled: bool,
}

// --- Public API ---

pub async fn get_articles(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ArticlesQuery>,
) -> Response {
    let category = params.category.as_deref().and_then(Category::from_str);
    let limit = params.limit.unwrap_or(30).min(100).max(1);

    let result = state
        .db
        .query_articles(category.as_ref(), limit, params.cursor.as_deref());

    match result {
        Ok((mut articles, next_cursor)) => {
            // Apply grouping if feature is enabled
            if let Ok(flags) = state.db.get_feature_flags() {
                if flags.grouping_enabled && articles.len() > 1 {
                    let titles: Vec<&str> =
                        articles.iter().map(|a| a.title.as_str()).collect();
                    let groups =
                        grouping::group_articles(&titles, flags.grouping_threshold);

                    for group in &groups {
                        if group.len() > 1 {
                            let group_id = uuid::Uuid::new_v4().to_string();
                            let count = group.len() as u32;
                            for (i, &idx) in group.iter().enumerate() {
                                articles[idx].group_id = Some(group_id.clone());
                                if i == 0 {
                                    articles[idx].group_count = Some(count);
                                }
                            }
                        }
                    }

                    let keep_indices: std::collections::HashSet<usize> = groups
                        .iter()
                        .flat_map(|g| {
                            if g.len() > 1 {
                                vec![g[0]]
                            } else {
                                g.clone()
                            }
                        })
                        .collect();

                    let filtered: Vec<_> = articles
                        .into_iter()
                        .enumerate()
                        .filter(|(i, _)| keep_indices.contains(i))
                        .map(|(_, a)| a)
                        .collect();
                    articles = filtered;
                }
            }

            let body = ArticlesResponse {
                articles,
                next_cursor,
            };
            (
                StatusCode::OK,
                [
                    (header::CACHE_CONTROL, "public, max-age=120"),
                    (header::CONTENT_TYPE, "application/json; charset=utf-8"),
                ],
                Json(body),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to query articles");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Internal server error"})),
            )
                .into_response()
        }
    }
}

pub async fn get_categories(State(state): State<Arc<AppState>>) -> Response {
    match state.db.get_categories() {
        Ok(cats) => {
            let visible: Vec<serde_json::Value> = cats
                .into_iter()
                .filter(|(_, _, _, _, vis)| *vis)
                .map(|(id, label_ja, label_en, sort_order, _)| {
                    serde_json::json!({
                        "id": id,
                        "label": if label_en.is_empty() { label_ja.clone() } else { label_en },
                        "label_ja": label_ja,
                        "sort_order": sort_order,
                    })
                })
                .collect();
            (
                StatusCode::OK,
                [
                    (header::CACHE_CONTROL, "public, max-age=60"),
                    (header::CONTENT_TYPE, "application/json; charset=utf-8"),
                ],
                Json(visible),
            )
                .into_response()
        }
        Err(_) => {
            // Fallback to hardcoded
            (
                StatusCode::OK,
                [
                    (header::CACHE_CONTROL, "public, max-age=3600"),
                    (header::CONTENT_TYPE, "application/json; charset=utf-8"),
                ],
                Json(CategoryInfo::all()),
            )
                .into_response()
        }
    }
}

pub async fn health(State(state): State<Arc<AppState>>) -> Response {
    match state.db.feed_count() {
        Ok(count) => (
            StatusCode::OK,
            Json(serde_json::json!({"status": "ok", "feeds": count})),
        )
            .into_response(),
        Err(_) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"status": "degraded", "error": "database unavailable"})),
        )
            .into_response(),
    }
}

pub async fn get_article_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Response {
    match state.db.get_article_by_id(&id) {
        Ok(Some(article)) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
            Json(serde_json::json!({"article": article})),
        )
            .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Article not found"})),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn handle_search(
    State(state): State<Arc<AppState>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let q = params.get("q").cloned().unwrap_or_default();
    if q.is_empty() {
        return (
            StatusCode::OK,
            Json(serde_json::json!({"articles": [], "query": ""})),
        )
            .into_response();
    }
    let limit = params
        .get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(20)
        .min(100)
        .max(1);
    match state.db.search_articles(&q, limit) {
        Ok(articles) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json; charset=utf-8")],
            Json(serde_json::json!({"articles": articles, "query": q})),
        )
            .into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to search articles");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
}

pub async fn handle_image_proxy(
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let url = match params.get("url") {
        Some(u) if !u.is_empty() => u.clone(),
        _ => {
            return (StatusCode::BAD_REQUEST, "Missing url param").into_response();
        }
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap();

    match client.get(&url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let content_type = resp
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/jpeg")
                .to_string();

            match resp.bytes().await {
                Ok(bytes) => {
                    let headers = [
                        (header::CONTENT_TYPE, content_type),
                        (
                            header::CACHE_CONTROL,
                            "public, max-age=86400".to_string(),
                        ),
                    ];
                    (headers, bytes).into_response()
                }
                Err(_) => (StatusCode::BAD_GATEWAY, "Failed to read image").into_response(),
            }
        }
        _ => (StatusCode::BAD_GATEWAY, "Failed to fetch image").into_response(),
    }
}

pub async fn handle_summarize(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<SummarizeRequest>,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);
    if let Err(resp) = check_rate_limit(&state.db, &tier, "summarize") {
        return resp;
    }

    if state.api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "APIキーが設定されていません"})),
        )
            .into_response();
    }

    let minutes = body.minutes.max(1).min(10);
    let target_chars = (minutes as usize) * 300;

    let articles = match state.db.query_articles(None, 30, None) {
        Ok((arts, _)) => arts,
        Err(e) => {
            warn!(error = %e, "Failed to query articles for summary");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "記事の取得に失敗しました"})),
            )
                .into_response();
        }
    };

    if articles.is_empty() {
        return (
            StatusCode::OK,
            Json(serde_json::json!({"summary": "現在表示できるニュースがありません。", "article_count": 0})),
        )
            .into_response();
    }

    let pairs: Vec<(String, String)> = articles
        .iter()
        .map(|a| (a.title.clone(), a.source.clone()))
        .collect();
    let article_count = pairs.len();

    // Cache check — key based on article titles + minutes
    let titles_hash: String = pairs.iter().map(|(t, _)| t.as_str()).collect::<Vec<_>>().join("|");
    let ckey = cache_key("summarize", &format!("{}:{}", minutes, titles_hash));
    if let Ok(Some(cached)) = state.db.get_cache(&ckey) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&cached) {
            // Cache hit — don't count against daily limit
            return (StatusCode::OK, Json(val)).into_response();
        }
    }

    match claude::summarize_articles(&state.http_client, &state.api_key, &pairs, target_chars)
        .await
    {
        Ok(summary) => {
            increment_if_free(&state.db, &tier, "summarize");

            // Convert to reading for TTS
            let reading = claude::convert_to_reading(
                &state.http_client,
                &state.api_key,
                &summary,
            )
            .await
            .unwrap_or_else(|_| summary.clone());

            let resp_json = serde_json::json!({
                "summary": summary,
                "summary_reading": reading,
                "article_count": article_count
            });

            // Cache for 3 hours
            let _ = state.db.set_cache(&ckey, "summarize", &resp_json.to_string(), 10800);

            (StatusCode::OK, Json(resp_json)).into_response()
        }
        Err(e) => {
            warn!(error = %e, "Summarize failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "要約の生成に失敗しました。しばらくしてお試しください。"})),
            )
                .into_response()
        }
    }
}

// --- Text-to-Reading (hiragana) API ---

#[derive(Deserialize)]
pub struct ToReadingRequest {
    pub text: String,
}

pub async fn handle_to_reading(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<ToReadingRequest>,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);
    if let Err(resp) = check_rate_limit(&state.db, &tier, "to_reading") {
        return resp;
    }

    if state.api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "APIキーが設定されていません"})),
        )
            .into_response();
    }

    let text = if body.text.len() > 5000 {
        &body.text[..5000]
    } else {
        &body.text
    };

    match claude::convert_to_reading(&state.http_client, &state.api_key, text).await {
        Ok(reading) => {
            increment_if_free(&state.db, &tier, "to_reading");
            (
                StatusCode::OK,
                Json(serde_json::json!({"reading": reading})),
            )
                .into_response()
        }
        Err(e) => {
            warn!(error = %e, "Text to reading conversion failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "読み変換に失敗しました。しばらくしてお試しください。"})),
            )
                .into_response()
        }
    }
}

// --- Podcast API ---

#[derive(Deserialize)]
pub struct PodcastGenerateRequest {
    pub article_id: Option<String>,
    pub title: String,
    pub description: String,
    pub source: String,
    pub url: Option<String>,
    pub provider: Option<String>,
}

#[derive(Serialize)]
struct AudioSegment {
    speaker: String,
    text: String,
    audio_base64: String,
}

pub async fn handle_podcast_generate(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<PodcastGenerateRequest>,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);
    if let Err(resp) = check_rate_limit(&state.db, &tier, "podcast") {
        return resp;
    }

    if state.api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "APIキーが設定されていません"})),
        )
            .into_response();
    }

    let use_qwen_omni = body.provider.as_deref() == Some("qwen-omni");

    if !use_qwen_omni && state.openai_api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "OpenAI APIキーが設定されていません（TTS用）"})),
        )
            .into_response();
    }

    if use_qwen_omni && (state.runpod_api_key.is_empty() || state.qwen_omni_endpoint_id.is_empty()) {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "Qwen-Omni endpoint が設定されていません"})),
        )
            .into_response();
    }

    // Cache check
    let url_for_key = body.url.as_deref().unwrap_or("");
    let ckey = cache_key("podcast", &format!("{}|{}|{}", body.title, body.source, url_for_key));
    if let Ok(Some(cached)) = state.db.get_cache(&ckey) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&cached) {
            return (StatusCode::OK, Json(val)).into_response();
        }
    }

    // Fetch article content if URL provided
    let article_content = if let Some(ref url) = body.url {
        if !url.is_empty() {
            news_core::ogp::fetch_article_content(&state.http_client, url).await.unwrap_or_default()
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    // Generate dialogue script
    let dialogue = match claude::generate_dialogue_script(
        &state.http_client,
        &state.api_key,
        &body.title,
        &body.description,
        &body.source,
        &article_content,
    )
    .await
    {
        Ok(d) => d,
        Err(e) => {
            warn!(error = %e, "Dialogue generation failed");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "対話スクリプトの生成に失敗しました"})),
            )
                .into_response();
        }
    };

    // Generate TTS for each line (host=coral, analyst=echo)
    let mut audio_segments = Vec::new();
    for line in &dialogue {
        if use_qwen_omni {
            // Use Qwen-Omni via RunPod
            let omni_voice = if line.speaker == "host" { "Chelsie" } else { "Ethan" };
            let system_prompt = if line.speaker == "host" {
                "あなたは人気ニュースポッドキャストのホストです。親しみやすく明るいトーンで、リスナーに直接語りかけるように話してください。"
            } else {
                "あなたはニュース解説の専門家です。落ち着いた知的なトーンで、分析的に語ってください。"
            };
            let input = serde_json::json!({
                "text": line.text,
                "voice": omni_voice,
                "system_prompt": system_prompt
            });
            match runpod_async(&state, &state.qwen_omni_endpoint_id, input).await {
                Ok(output) => {
                    let b64 = output["audio_base64"].as_str().unwrap_or("").to_string();
                    audio_segments.push(AudioSegment {
                        speaker: line.speaker.clone(),
                        text: line.text.clone(),
                        audio_base64: b64,
                    });
                }
                Err(e) => {
                    warn!(error = %e, speaker = %line.speaker, "Qwen-Omni TTS failed");
                    audio_segments.push(AudioSegment {
                        speaker: line.speaker.clone(),
                        text: line.text.clone(),
                        audio_base64: String::new(),
                    });
                }
            }
        } else {
            // Use OpenAI TTS
            let voice = if line.speaker == "host" { "coral" } else { "echo" };
            let tts_instruction = if line.speaker == "host" {
                "あなたは人気ニュースポッドキャストのホストです。以下のルールで話してください：\n- 親しみやすく明るいトーンで、リスナーに直接語りかけるように話す\n- 自然な相づちや感嘆を入れ、会話感を出す\n- 句読点で適切に間を取り、聞き取りやすくする\n- 棒読みは厳禁。人間同士の会話のようなリズムで話す"
            } else {
                "あなたはニュース解説の専門家です。以下のルールで話してください：\n- 落ち着いた知的なトーンで、分析的に語る\n- 重要なポイントは少し強調し、説得力を持たせる\n- 自然な話し言葉で、硬すぎない表現を使う\n- 棒読みは厳禁。聞き手が理解しやすいペースで話す"
            };
            let tts_body = serde_json::json!({
                "model": "gpt-4o-mini-tts",
                "input": line.text,
                "voice": voice,
                "response_format": "mp3",
                "instructions": tts_instruction
            });

            match state.http_client
                .post("https://api.openai.com/v1/audio/speech")
                .header("Authorization", format!("Bearer {}", state.openai_api_key))
                .header("content-type", "application/json")
                .json(&tts_body)
                .send()
                .await
            {
                Ok(resp) if resp.status().is_success() => {
                    match resp.bytes().await {
                        Ok(bytes) => {
                            let b64 = base64::Engine::encode(
                                &base64::engine::general_purpose::STANDARD,
                                &bytes,
                            );
                            audio_segments.push(AudioSegment {
                                speaker: line.speaker.clone(),
                                text: line.text.clone(),
                                audio_base64: b64,
                            });
                        }
                        Err(e) => {
                            warn!(error = %e, speaker = %line.speaker, "TTS bytes read failed");
                            audio_segments.push(AudioSegment {
                                speaker: line.speaker.clone(),
                                text: line.text.clone(),
                                audio_base64: String::new(),
                            });
                        }
                    }
                }
                Ok(resp) => {
                    let status = resp.status();
                    let err_body = resp.text().await.unwrap_or_default();
                    warn!(status = %status, body = %err_body, speaker = %line.speaker, "TTS generation failed");
                    audio_segments.push(AudioSegment {
                        speaker: line.speaker.clone(),
                        text: line.text.clone(),
                        audio_base64: String::new(),
                    });
                }
                Err(e) => {
                    warn!(error = %e, speaker = %line.speaker, "TTS request failed");
                    audio_segments.push(AudioSegment {
                        speaker: line.speaker.clone(),
                        text: line.text.clone(),
                        audio_base64: String::new(),
                    });
                }
            }
        }
    }

    increment_if_free(&state.db, &tier, "podcast");

    let resp_json = serde_json::json!({
        "dialogue": dialogue,
        "audio_segments": audio_segments,
    });

    // Cache for 6 hours
    let _ = state.db.set_cache(&ckey, "podcast", &resp_json.to_string(), 21600);

    (StatusCode::OK, Json(resp_json)).into_response()
}

// --- Feed API (for online) ---

#[derive(Deserialize)]
pub struct FeedQuery {
    pub category: Option<String>,
    pub limit: Option<i64>,
    pub cursor: Option<String>,
}

pub async fn get_feed(
    State(state): State<Arc<AppState>>,
    Query(params): Query<FeedQuery>,
) -> Response {
    let category = params.category.as_deref().and_then(Category::from_str);
    let limit = params.limit.unwrap_or(10).min(20).max(1);

    let result = state
        .db
        .query_articles(category.as_ref(), limit, params.cursor.as_deref());

    match result {
        Ok((articles, next_cursor)) => {
            let body = serde_json::json!({
                "articles": articles,
                "next_cursor": next_cursor,
            });
            (
                StatusCode::OK,
                [
                    (header::CACHE_CONTROL, "public, max-age=30, stale-while-revalidate=60"),
                    (header::CONTENT_TYPE, "application/json; charset=utf-8"),
                ],
                Json(body),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to query feed articles");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Internal server error"})),
            )
                .into_response()
        }
    }
}

// --- Category Management API ---

#[derive(Deserialize)]
pub struct CategoryAction {
    pub action: String,
    pub id: Option<String>,
    pub label_ja: Option<String>,
    pub order: Option<Vec<String>>,
}

pub async fn handle_categories_manage(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<CategoryAction>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    match body.action.as_str() {
        "add" => {
            let id = match &body.id {
                Some(id) if !id.is_empty() => id.clone(),
                _ => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "id is required"}))).into_response(),
            };
            let label = body.label_ja.clone().unwrap_or_else(|| id.clone());
            let max_order = state.db.get_categories().map(|c| c.len() as i32).unwrap_or(0);
            match state.db.put_category(&id, &label, "", max_order) {
                Ok(()) => (StatusCode::OK, Json(serde_json::json!({"status": "ok", "message": format!("カテゴリ「{}」を追加しました", label)}))).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
            }
        }
        "remove" => {
            let id = match &body.id {
                Some(id) => id.clone(),
                None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "id is required"}))).into_response(),
            };
            match state.db.delete_category(&id) {
                Ok(()) => (StatusCode::OK, Json(serde_json::json!({"status": "ok", "message": format!("カテゴリ「{}」を削除しました", id)}))).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
            }
        }
        "rename" => {
            let id = match &body.id {
                Some(id) => id.clone(),
                None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "id is required"}))).into_response(),
            };
            let label = match &body.label_ja {
                Some(l) => l.clone(),
                None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "label_ja is required"}))).into_response(),
            };
            match state.db.rename_category(&id, &label) {
                Ok(()) => (StatusCode::OK, Json(serde_json::json!({"status": "ok", "message": format!("カテゴリを「{}」に変更しました", label)}))).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
            }
        }
        "reorder" => {
            let order = match &body.order {
                Some(o) => o.clone(),
                None => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "order is required"}))).into_response(),
            };
            match state.db.reorder_categories(&order) {
                Ok(()) => (StatusCode::OK, Json(serde_json::json!({"status": "ok", "message": "カテゴリの並び順を変更しました"}))).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
            }
        }
        _ => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Unknown action"}))).into_response(),
    }
}

// --- Article Q&A API ---

#[derive(Deserialize)]
pub struct ArticleQuestionsRequest {
    pub title: String,
    pub description: String,
    pub source: String,
    pub url: Option<String>,
    pub custom_prompt: Option<String>,
}

#[derive(Deserialize)]
pub struct ArticleAskRequest {
    pub title: String,
    pub description: String,
    pub source: String,
    pub question: String,
    pub url: Option<String>,
    pub custom_prompt: Option<String>,
}

// --- Feed Management API ---

#[derive(Deserialize)]
pub struct AddFeedRequest {
    pub url: String,
    pub source: String,
    pub category: String,
}

#[derive(Deserialize)]
pub struct UpdateFeedRequest {
    pub enabled: Option<bool>,
}

pub async fn list_feeds(
    State(state): State<Arc<AppState>>,
) -> Response {
    // Feed list is public (read-only); mutations still require admin auth
    match state.db.get_all_feeds() {
        Ok(feeds) => (StatusCode::OK, Json(serde_json::json!({"feeds": feeds}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
    }
}

pub async fn add_feed(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<AddFeedRequest>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    if body.url.is_empty() || body.source.is_empty() || body.category.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "url, source, category are required"}))).into_response();
    }
    let feed_id = format!("feed-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("x"));
    let feed = DynamicFeed {
        feed_id: feed_id.clone(),
        url: body.url,
        source: body.source,
        category: body.category,
        enabled: true,
        added_by: Some("settings".into()),
    };
    match state.db.put_feed(&feed) {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"status": "ok", "feed_id": feed_id, "message": "フィードを追加しました"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
    }
}

pub async fn delete_feed(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(feed_id): Path<String>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    match state.db.delete_feed(&feed_id) {
        Ok(()) => (StatusCode::OK, Json(serde_json::json!({"status": "ok", "message": "フィードを削除しました"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
    }
}

pub async fn update_feed(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(feed_id): Path<String>,
    Json(body): Json<UpdateFeedRequest>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    let feeds = match state.db.get_all_feeds() {
        Ok(f) => f,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
    };
    let feed = match feeds.into_iter().find(|f| f.feed_id == feed_id) {
        Some(f) => f,
        None => return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Feed not found"}))).into_response(),
    };
    let updated = DynamicFeed {
        enabled: body.enabled.unwrap_or(feed.enabled),
        ..feed
    };
    match state.db.put_feed(&updated) {
        Ok(()) => {
            let label = if updated.enabled { "有効" } else { "無効" };
            (StatusCode::OK, Json(serde_json::json!({"status": "ok", "message": format!("フィードを{}にしました", label)}))).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))).into_response(),
    }
}

pub async fn handle_article_questions(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<ArticleQuestionsRequest>,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);
    if let Err(resp) = check_rate_limit(&state.db, &tier, "questions") {
        return resp;
    }

    if state.api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "APIキーが設定されていません"})),
        )
            .into_response();
    }

    // Cache check (include URL for cache key)
    let url_for_key = body.url.as_deref().unwrap_or("");
    let ckey = cache_key("questions", &format!("{}|{}|{}|{}", body.title, body.description, body.source, url_for_key));
    if let Ok(Some(cached)) = state.db.get_cache(&ckey) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&cached) {
            return (StatusCode::OK, Json(val)).into_response();
        }
    }

    // Fetch article content if URL provided
    let article_content = if let Some(ref url) = body.url {
        if !url.is_empty() {
            news_core::ogp::fetch_article_content(&state.http_client, url).await.unwrap_or_default()
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    match claude::generate_questions(
        &state.http_client,
        &state.api_key,
        &body.title,
        &body.description,
        &body.source,
        &article_content,
        body.custom_prompt.as_deref(),
    )
    .await
    {
        Ok(questions) => {
            increment_if_free(&state.db, &tier, "questions");
            let resp_json = serde_json::json!({"questions": questions});
            let _ = state.db.set_cache(&ckey, "questions", &resp_json.to_string(), 21600); // 6h
            (StatusCode::OK, Json(resp_json)).into_response()
        }
        Err(e) => {
            warn!(error = %e, "Question generation failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "質問の生成に失敗しました。しばらくしてお試しください。"})),
            )
                .into_response()
        }
    }
}

pub async fn handle_article_ask(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<ArticleAskRequest>,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);
    if let Err(resp) = check_rate_limit(&state.db, &tier, "ask") {
        return resp;
    }

    if state.api_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "APIキーが設定されていません"})),
        )
            .into_response();
    }

    // Cache check (include URL for cache key)
    let url_for_key = body.url.as_deref().unwrap_or("");
    let ckey = cache_key("ask", &format!("{}|{}|{}|{}|{}", body.title, body.description, body.source, body.question, url_for_key));
    if let Ok(Some(cached)) = state.db.get_cache(&ckey) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&cached) {
            return (StatusCode::OK, Json(val)).into_response();
        }
    }

    // Fetch article content if URL provided
    let article_content = if let Some(ref url) = body.url {
        if !url.is_empty() {
            news_core::ogp::fetch_article_content(&state.http_client, url).await.unwrap_or_default()
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    match claude::answer_question(
        &state.http_client,
        &state.api_key,
        &body.title,
        &body.description,
        &body.source,
        &body.question,
        &article_content,
        body.custom_prompt.as_deref(),
    )
    .await
    {
        Ok(answer) => {
            increment_if_free(&state.db, &tier, "ask");
            let resp_json = serde_json::json!({"answer": answer});
            let _ = state.db.set_cache(&ckey, "ask", &resp_json.to_string(), 21600); // 6h
            (StatusCode::OK, Json(resp_json)).into_response()
        }
        Err(e) => {
            warn!(error = %e, "Answer generation failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "回答の生成に失敗しました。しばらくしてお試しください。"})),
            )
                .into_response()
        }
    }
}

// --- TTS API (ElevenLabs proxy) ---

#[derive(Deserialize)]
pub struct TtsRequest {
    pub text: String,
    pub voice_id: String,
}

#[derive(Serialize)]
struct VoiceInfo {
    voice_id: String,
    name: String,
    category: String,
    preview_url: Option<String>,
    labels: Option<serde_json::Value>,
    recommended: bool,
}

// OpenAI TTS voices (gpt-4o-mini-tts supports all these)
const OPENAI_TTS_VOICES: &[(&str, &str, bool)] = &[
    ("alloy",   "Alloy（中性・落ち着き）", true),
    ("ash",     "Ash（男性・温かみ）", false),
    ("ballad",  "Ballad（男性・柔らか）", false),
    ("coral",   "Coral（女性・会話的）", true),
    ("echo",    "Echo（男性・低音）", false),
    ("fable",   "Fable（男性・語り）", false),
    ("nova",    "Nova（女性・自然）", true),
    ("onyx",    "Onyx（男性・深み）", false),
    ("sage",    "Sage（女性・知的）", true),
    ("shimmer", "Shimmer（女性・明るい）", false),
    ("verse",   "Verse（中性・表現力）", false),
];

// AI/ML API TTS models (OpenAI-compatible, crypto payment)
// model_id, display_name, recommended
const AIMLAPI_TTS_MODELS: &[(&str, &str, &str, bool)] = &[
    // (voice, model, display_name, recommended)
    ("nova",    "openai/gpt-4o-mini-tts",    "gpt-4o-mini-tts Nova", true),
    ("coral",   "openai/gpt-4o-mini-tts",    "gpt-4o-mini-tts Coral", true),
    ("alloy",   "openai/gpt-4o-mini-tts",    "gpt-4o-mini-tts Alloy", false),
    ("sage",    "openai/gpt-4o-mini-tts",    "gpt-4o-mini-tts Sage", false),
    ("amalthea","deepgram/aura-2",           "Deepgram Aura2 Amalthea", false),
    ("athena",  "deepgram/aura-2",           "Deepgram Aura2 Athena", false),
    ("luna",    "deepgram/aura-2",           "Deepgram Aura2 Luna", false),
    ("orion",   "deepgram/aura-2",           "Deepgram Aura2 Orion", false),
];

// Venice AI TTS (Kokoro, OpenAI-compatible, crypto/VVV stake)
const VENICE_TTS_VOICES: &[(&str, &str, bool)] = &[
    ("af_heart",  "Heart（女性・温かい）", true),
    ("af_alloy",  "Alloy（女性・中性）", false),
    ("af_aoede",  "Aoede（女性・表現力）", false),
    ("af_bella",  "Bella（女性・柔らか）", true),
    ("af_nicole", "Nicole（女性・落ち着き）", false),
    ("af_nova",   "Nova（女性・自然）", false),
    ("af_sky",    "Sky（女性・明るい）", false),
    ("am_adam",   "Adam（男性・低音）", true),
    ("am_echo",   "Echo（男性・クリア）", false),
    ("am_michael","Michael（男性・温かみ）", false),
    ("am_onyx",   "Onyx（男性・深み）", false),
];

// CosyVoice 2 voices (RunPod)
const COSYVOICE_VOICES: &[(&str, &str, bool)] = &[
    ("日本語女性", "CosyVoice 日本語女性", true),
    ("日本語男性", "CosyVoice 日本語男性", true),
    ("英語女性",   "CosyVoice English Female", false),
    ("英語男性",   "CosyVoice English Male", false),
    ("中国語女性", "CosyVoice 中国語女性", false),
    ("中国語男性", "CosyVoice 中国語男性", false),
];

// Qwen3-TTS voices (RunPod) — language-based generation
const QWEN_TTS_VOICES: &[(&str, &str, bool)] = &[
    ("Japanese", "Qwen-TTS 日本語", true),
    ("English",  "Qwen-TTS English", true),
    ("Chinese",  "Qwen-TTS 中国語", false),
    ("Korean",   "Qwen-TTS 한국어", false),
    ("French",   "Qwen-TTS Français", false),
    ("German",   "Qwen-TTS Deutsch", false),
    ("Spanish",  "Qwen-TTS Español", false),
];

// Qwen2.5-Omni voices (RunPod) — for conversational/podcast
const QWEN_OMNI_VOICES: &[(&str, &str, bool)] = &[
    ("Chelsie", "Qwen-Omni Chelsie（女性・会話）", true),
    ("Ethan",   "Qwen-Omni Ethan（男性・会話）", true),
];

pub async fn handle_tts_voices(State(state): State<Arc<AppState>>) -> Response {
    let mut voices: Vec<VoiceInfo> = Vec::new();

    // Fetch ElevenLabs voices
    if !state.elevenlabs_api_key.is_empty() {
        if let Ok(resp) = state
            .http_client
            .get("https://api.elevenlabs.io/v1/voices")
            .header("xi-api-key", &state.elevenlabs_api_key)
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(body) = resp.json::<serde_json::Value>().await {
                    let el_voices: Vec<VoiceInfo> = body["voices"]
                        .as_array()
                        .unwrap_or(&vec![])
                        .iter()
                        .map(|v| {
                            let category = v["category"].as_str().unwrap_or("premade").to_string();
                            let labels = v.get("labels").cloned();
                            let is_cloned = category == "cloned";
                            let is_japanese = labels
                                .as_ref()
                                .and_then(|l| l.get("language"))
                                .and_then(|lang| lang.as_str())
                                .map(|lang| {
                                    let lower = lang.to_lowercase();
                                    lower.contains("ja") || lower.contains("japanese")
                                })
                                .unwrap_or(false);
                            VoiceInfo {
                                voice_id: v["voice_id"].as_str().unwrap_or("").to_string(),
                                name: v["name"].as_str().unwrap_or("").to_string(),
                                category,
                                preview_url: v["preview_url"].as_str().map(|s| s.to_string()),
                                labels,
                                recommended: is_cloned || is_japanese,
                            }
                        })
                        .collect();
                    voices.extend(el_voices);
                }
            }
        }
    }

    // Add OpenAI TTS voices
    if !state.openai_api_key.is_empty() {
        for (voice_key, label, rec) in OPENAI_TTS_VOICES {
            voices.push(VoiceInfo {
                voice_id: format!("openai:{}", voice_key),
                name: format!("OpenAI {}", label),
                category: "openai".to_string(),
                preview_url: None,
                labels: Some(serde_json::json!({"provider": "openai", "language": "multilingual"})),
                recommended: *rec,
            });
        }
    }

    // Fetch Cartesia voices
    if !state.cartesia_api_key.is_empty() {
        if let Ok(resp) = state
            .http_client
            .get("https://api.cartesia.ai/voices")
            .header("X-API-Key", &state.cartesia_api_key)
            .header("Cartesia-Version", "2025-04-16")
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(items) = resp.json::<Vec<serde_json::Value>>().await {
                    for v in &items {
                        let lang = v["language"].as_str().unwrap_or("");
                        let is_ja = lang == "ja" || lang.starts_with("ja-");
                        voices.push(VoiceInfo {
                            voice_id: format!("cartesia:{}", v["id"].as_str().unwrap_or("")),
                            name: format!("Cartesia {}", v["name"].as_str().unwrap_or("Unknown")),
                            category: "cartesia".to_string(),
                            preview_url: None,
                            labels: Some(serde_json::json!({"provider": "cartesia", "language": lang})),
                            recommended: is_ja,
                        });
                    }
                }
            }
        }
    }

    // Add Fish Audio voices (curated Japanese voices)
    if !state.fish_audio_api_key.is_empty() {
        // Fetch user's models from Fish Audio
        if let Ok(resp) = state
            .http_client
            .get("https://api.fish.audio/model")
            .header("Authorization", format!("Bearer {}", state.fish_audio_api_key))
            .query(&[("page_size", "50"), ("language", "ja")])
            .send()
            .await
        {
            if resp.status().is_success() {
                if let Ok(body) = resp.json::<serde_json::Value>().await {
                    if let Some(items) = body["items"].as_array() {
                        for v in items {
                            let title = v["title"].as_str().unwrap_or("Unknown");
                            let id = v["_id"].as_str().unwrap_or("");
                            if id.is_empty() { continue; }
                            voices.push(VoiceInfo {
                                voice_id: format!("fish:{}", id),
                                name: format!("Fish {}", title),
                                category: "fish".to_string(),
                                preview_url: None,
                                labels: Some(serde_json::json!({"provider": "fish_audio", "language": "ja"})),
                                recommended: true,
                            });
                        }
                    }
                }
            }
        }
    }

    // Add AI/ML API voices (crypto payment)
    if !state.aimlapi_key.is_empty() {
        for (voice, model, label, rec) in AIMLAPI_TTS_MODELS {
            voices.push(VoiceInfo {
                voice_id: format!("aimlapi:{}:{}", model, voice),
                name: format!("AI/ML {}", label),
                category: "aimlapi".to_string(),
                preview_url: None,
                labels: Some(serde_json::json!({"provider": "aimlapi", "model": model, "language": "multilingual"})),
                recommended: *rec,
            });
        }
    }

    // Add Venice AI voices (crypto/VVV stake)
    if !state.venice_api_key.is_empty() {
        for (voice_key, label, rec) in VENICE_TTS_VOICES {
            voices.push(VoiceInfo {
                voice_id: format!("venice:{}", voice_key),
                name: format!("Venice {}", label),
                category: "venice".to_string(),
                preview_url: None,
                labels: Some(serde_json::json!({"provider": "venice", "model": "tts-kokoro", "language": "multilingual"})),
                recommended: *rec,
            });
        }
    }

    // Add CosyVoice voices (RunPod)
    if !state.runpod_api_key.is_empty() && !state.cosyvoice_endpoint_id.is_empty() {
        for (voice_key, label, rec) in COSYVOICE_VOICES {
            voices.push(VoiceInfo {
                voice_id: format!("cosyvoice:{}", voice_key),
                name: label.to_string(),
                category: "cosyvoice".to_string(),
                preview_url: None,
                labels: Some(serde_json::json!({"provider": "cosyvoice", "language": "multilingual"})),
                recommended: *rec,
            });
        }
    }

    // Add Qwen3-TTS voices (RunPod)
    if !state.runpod_api_key.is_empty() && !state.qwen_tts_endpoint_id.is_empty() {
        for (voice_key, label, rec) in QWEN_TTS_VOICES {
            voices.push(VoiceInfo {
                voice_id: format!("qwen-tts:{}", voice_key),
                name: label.to_string(),
                category: "qwen-tts".to_string(),
                preview_url: None,
                labels: Some(serde_json::json!({"provider": "qwen-tts", "language": "multilingual"})),
                recommended: *rec,
            });
        }
    }

    // Add Qwen2.5-Omni voices (RunPod)
    if !state.runpod_api_key.is_empty() && !state.qwen_omni_endpoint_id.is_empty() {
        for (voice_key, label, rec) in QWEN_OMNI_VOICES {
            voices.push(VoiceInfo {
                voice_id: format!("qwen-omni:{}", voice_key),
                name: label.to_string(),
                category: "qwen-omni".to_string(),
                preview_url: None,
                labels: Some(serde_json::json!({"provider": "qwen-omni", "language": "multilingual"})),
                recommended: *rec,
            });
        }
    }

    let available = !voices.is_empty();

    // Sort: cloned → recommended → other
    voices.sort_by(|a, b| {
        let rank = |v: &VoiceInfo| -> u8 {
            if v.category == "cloned" { 0 }
            else if v.recommended { 1 }
            else { 2 }
        };
        rank(a).cmp(&rank(b)).then_with(|| a.name.cmp(&b.name))
    });

    let default_voice_id = voices
        .iter()
        .find(|v| v.recommended)
        .map(|v| v.voice_id.clone());

    (
        StatusCode::OK,
        [(header::CACHE_CONTROL, "public, max-age=300")],
        Json(serde_json::json!({
            "voices": voices,
            "available": available,
            "default_voice_id": default_voice_id
        })),
    )
        .into_response()
}

pub async fn handle_tts(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<TtsRequest>,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);
    if let Err(resp) = check_rate_limit(&state.db, &tier, "tts") {
        return resp;
    }

    let raw_text = if body.text.len() > 5000 {
        &body.text[..5000]
    } else {
        &body.text
    };

    // --- Audio cache check (voice_id + raw_text) ---
    let audio_ckey = cache_key("tts_audio", &format!("{}|{}", body.voice_id, raw_text));
    if let Ok(Some(cached_b64)) = state.db.get_cache(&audio_ckey) {
        if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &cached_b64) {
            return audio_response(axum::body::Bytes::from(bytes));
        }
    }

    // --- Cached to-reading conversion (TTL 24h) ---
    let reading_ckey = cache_key("to_reading", raw_text);
    let text = if let Ok(Some(cached_reading)) = state.db.get_cache(&reading_ckey) {
        cached_reading
    } else if !state.api_key.is_empty() {
        match claude::convert_to_reading(&state.http_client, &state.api_key, raw_text).await {
            Ok(reading) => {
                let _ = state.db.set_cache(&reading_ckey, "to_reading", &reading, 86400);
                reading
            }
            Err(_) => raw_text.to_string(),
        }
    } else {
        raw_text.to_string()
    };

    // --- TTS generation with timeout + failover ---
    let is_runpod = body.voice_id.starts_with("cosyvoice:")
        || body.voice_id.starts_with("qwen-tts:")
        || body.voice_id.starts_with("qwen-omni:");
    let timeout_secs = if is_runpod { 90 } else { 10 };

    let primary_result = tokio::time::timeout(
        Duration::from_secs(timeout_secs),
        tts_generate(&state, &body.voice_id, &text),
    ).await;

    let audio_bytes = match primary_result {
        Ok(Ok(bytes)) => bytes,
        Ok(Err(e)) => {
            warn!(error = %e, voice = %body.voice_id, "Primary TTS failed, trying failover");
            // RunPod providers don't participate in failover (cold start too slow)
            if is_runpod {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("TTS生成に失敗しました: {}", e)})),
                ).into_response();
            }
            match try_failover(&state, &body.voice_id, &text).await {
                Ok(bytes) => bytes,
                Err(resp) => return resp,
            }
        }
        Err(_) => {
            warn!(voice = %body.voice_id, timeout_secs, "Primary TTS timed out, trying failover");
            if is_runpod {
                return (
                    StatusCode::GATEWAY_TIMEOUT,
                    Json(serde_json::json!({"error": "TTS生成がタイムアウトしました。GPUのコールドスタート中の可能性があります。しばらくしてお試しください。"})),
                ).into_response();
            }
            match try_failover(&state, &body.voice_id, &text).await {
                Ok(bytes) => bytes,
                Err(resp) => return resp,
            }
        }
    };

    // Cache audio (base64, TTL 6h)
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &audio_bytes);
    let _ = state.db.set_cache(&audio_ckey, "tts_audio", &b64, 21600);

    increment_if_free(&state.db, &tier, "tts");
    audio_response(audio_bytes)
}

/// Try failover providers with 5s timeout each. Returns Ok(bytes) or error Response.
async fn try_failover(
    state: &AppState,
    current_voice_id: &str,
    text: &str,
) -> Result<axum::body::Bytes, Response> {
    let fallbacks = tts_fallback_chain(state, current_voice_id);
    for (provider_name, fallback_voice) in &fallbacks {
        match tokio::time::timeout(
            Duration::from_secs(5),
            tts_generate(state, fallback_voice, text),
        ).await {
            Ok(Ok(bytes)) => {
                info!(provider = %provider_name, "TTS failover succeeded");
                return Ok(bytes);
            }
            Ok(Err(e)) => {
                warn!(provider = %provider_name, error = %e, "TTS failover failed");
            }
            Err(_) => {
                warn!(provider = %provider_name, "TTS failover timed out (5s)");
            }
        }
    }
    Err((
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({"error": "全TTSプロバイダが失敗しました"})),
    ).into_response())
}

fn audio_response(bytes: axum::body::Bytes) -> Response {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "audio/mpeg")
        .header(header::CACHE_CONTROL, "private, max-age=3600")
        .body(Body::from(bytes))
        .unwrap()
}

/// Build a failover chain of (provider_name, voice_id) to try, excluding the current provider.
fn tts_fallback_chain(state: &AppState, current_voice_id: &str) -> Vec<(&'static str, String)> {
    let current_provider = if current_voice_id.starts_with("openai:") { "openai" }
        else if current_voice_id.starts_with("cartesia:") { "cartesia" }
        else if current_voice_id.starts_with("fish:") { "fish" }
        else if current_voice_id.starts_with("aimlapi:") { "aimlapi" }
        else if current_voice_id.starts_with("venice:") { "venice" }
        else { "elevenlabs" };

    // Priority: aimlapi (fast+cheap) → venice (fast) → openai → elevenlabs
    let mut chain = Vec::new();
    if current_provider != "aimlapi" && !state.aimlapi_key.is_empty() {
        chain.push(("aimlapi", "aimlapi:openai/gpt-4o-mini-tts:nova".to_string()));
    }
    if current_provider != "venice" && !state.venice_api_key.is_empty() {
        chain.push(("venice", "venice:af_heart".to_string()));
    }
    if current_provider != "openai" && !state.openai_api_key.is_empty() {
        chain.push(("openai", "openai:nova".to_string()));
    }
    // Skip ElevenLabs in failover — voice IDs are account-specific and unreliable as fallback
    chain
}

/// Core TTS generation — returns audio bytes or error string. No HTTP response logic.
async fn tts_generate(state: &AppState, voice_id: &str, text: &str) -> Result<axum::body::Bytes, String> {
    if let Some(voice_name) = voice_id.strip_prefix("openai:") {
        return tts_openai(state, text, voice_name).await;
    }
    if let Some(vid) = voice_id.strip_prefix("cartesia:") {
        return tts_cartesia(state, text, vid).await;
    }
    if let Some(ref_id) = voice_id.strip_prefix("fish:") {
        return tts_fish(state, text, ref_id).await;
    }
    if let Some(rest) = voice_id.strip_prefix("aimlapi:") {
        return tts_aimlapi(state, text, rest).await;
    }
    if let Some(voice_name) = voice_id.strip_prefix("venice:") {
        return tts_venice(state, text, voice_name).await;
    }
    if let Some(voice_name) = voice_id.strip_prefix("cosyvoice:") {
        return tts_cosyvoice(state, text, voice_name).await;
    }
    if let Some(voice_name) = voice_id.strip_prefix("qwen-tts:") {
        return tts_qwen_tts(state, text, voice_name).await;
    }
    if let Some(voice_name) = voice_id.strip_prefix("qwen-omni:") {
        return tts_qwen_omni(state, text, voice_name).await;
    }
    // Default: ElevenLabs
    tts_elevenlabs(state, text, voice_id).await
}

async fn tts_elevenlabs(state: &AppState, text: &str, voice_id: &str) -> Result<axum::body::Bytes, String> {
    if state.elevenlabs_api_key.is_empty() {
        return Err("ElevenLabs APIキーが未設定".into());
    }
    let el_body = serde_json::json!({
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.3,
            "use_speaker_boost": true
        }
    });
    let url = format!("https://api.elevenlabs.io/v1/text-to-speech/{}", voice_id);
    let resp = state.http_client.post(&url)
        .header("xi-api-key", &state.elevenlabs_api_key)
        .header("content-type", "application/json")
        .header("accept", "audio/mpeg")
        .json(&el_body)
        .send()
        .await
        .map_err(|e| format!("ElevenLabs request: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("ElevenLabs {status}: {body}"));
    }
    resp.bytes().await.map_err(|e| format!("ElevenLabs bytes: {e}"))
}

async fn tts_openai(state: &AppState, text: &str, voice: &str) -> Result<axum::body::Bytes, String> {
    if state.openai_api_key.is_empty() {
        return Err("OpenAI APIキーが未設定".into());
    }
    let body = serde_json::json!({
        "model": "gpt-4o-mini-tts",
        "input": text,
        "voice": voice,
        "response_format": "mp3",
        "instructions": "あなたはプロの日本語ニュースキャスターです。以下のルールで自然に読み上げてください：\n- 人間が話すような自然な抑揚とリズムで読む\n- 句読点では適切な間を取る\n- 重要なキーワードは少し強調する\n- 機械的な棒読みは絶対に避け、聞き手に語りかけるように話す\n- 固有名詞や数字は正確にはっきり発音する"
    });
    let resp = state.http_client.post("https://api.openai.com/v1/audio/speech")
        .header("Authorization", format!("Bearer {}", state.openai_api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenAI request: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("OpenAI {status}: {body}"));
    }
    resp.bytes().await.map_err(|e| format!("OpenAI bytes: {e}"))
}

async fn tts_cartesia(state: &AppState, text: &str, voice_id: &str) -> Result<axum::body::Bytes, String> {
    if state.cartesia_api_key.is_empty() {
        return Err("Cartesia APIキーが未設定".into());
    }
    let body = serde_json::json!({
        "model_id": "sonic-3",
        "transcript": text,
        "voice": { "mode": "id", "id": voice_id },
        "language": "ja",
        "output_format": { "container": "mp3", "sample_rate": 44100, "bit_rate": 128000 }
    });
    let resp = state.http_client.post("https://api.cartesia.ai/tts/bytes")
        .header("X-API-Key", &state.cartesia_api_key)
        .header("Cartesia-Version", "2025-04-16")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Cartesia request: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Cartesia {status}: {body}"));
    }
    resp.bytes().await.map_err(|e| format!("Cartesia bytes: {e}"))
}

async fn tts_fish(state: &AppState, text: &str, reference_id: &str) -> Result<axum::body::Bytes, String> {
    if state.fish_audio_api_key.is_empty() {
        return Err("Fish Audio APIキーが未設定".into());
    }
    let body = serde_json::json!({
        "text": text,
        "reference_id": reference_id,
        "format": "mp3",
        "latency": "normal"
    });
    let resp = state.http_client.post("https://api.fish.audio/v1/tts")
        .header("Authorization", format!("Bearer {}", state.fish_audio_api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Fish request: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Fish {status}: {body}"));
    }
    resp.bytes().await.map_err(|e| format!("Fish bytes: {e}"))
}

async fn tts_aimlapi(state: &AppState, text: &str, model_and_voice: &str) -> Result<axum::body::Bytes, String> {
    if state.aimlapi_key.is_empty() {
        return Err("AI/ML APIキーが未設定".into());
    }
    let (model, voice) = match model_and_voice.rsplit_once(':') {
        Some((m, v)) => (m, v),
        None => ("openai/gpt-4o-mini-tts", model_and_voice),
    };
    let body = serde_json::json!({
        "model": model,
        "text": text,
        "voice": voice,
        "response_format": "mp3"
    });
    let resp = state.http_client.post("https://api.aimlapi.com/v1/tts")
        .header("Authorization", format!("Bearer {}", state.aimlapi_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AIMLAPI request: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("AIMLAPI {status}: {body}"));
    }
    // AI/ML API returns JSON with audio URL
    let resp_body: serde_json::Value = resp.json().await
        .map_err(|e| format!("AIMLAPI parse: {e}"))?;
    let audio_url = resp_body["audio"]["url"].as_str()
        .ok_or_else(|| format!("AIMLAPI: no audio URL in {resp_body}"))?;
    let audio_resp = state.http_client.get(audio_url).send().await
        .map_err(|e| format!("AIMLAPI download: {e}"))?;
    if !audio_resp.status().is_success() {
        return Err(format!("AIMLAPI download: {}", audio_resp.status()));
    }
    audio_resp.bytes().await.map_err(|e| format!("AIMLAPI bytes: {e}"))
}

async fn tts_venice(state: &AppState, text: &str, voice: &str) -> Result<axum::body::Bytes, String> {
    if state.venice_api_key.is_empty() {
        return Err("Venice APIキーが未設定".into());
    }
    let body = serde_json::json!({
        "model": "tts-kokoro",
        "input": text,
        "voice": voice,
        "response_format": "mp3"
    });
    let resp = state.http_client.post("https://api.venice.ai/api/v1/audio/speech")
        .header("Authorization", format!("Bearer {}", state.venice_api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Venice request: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Venice {status}: {body}"));
    }
    resp.bytes().await.map_err(|e| format!("Venice bytes: {e}"))
}

// --- RunPod Serverless helpers ---

/// Call RunPod serverless endpoint synchronously (runsync).
/// Used for CosyVoice and Qwen-TTS where response is fast enough.
async fn runpod_runsync(
    state: &AppState,
    endpoint_id: &str,
    input: serde_json::Value,
) -> Result<serde_json::Value, String> {
    if state.runpod_api_key.is_empty() {
        return Err("RunPod APIキーが未設定".into());
    }
    let url = format!(
        "https://api.runpod.ai/v2/{}/runsync",
        endpoint_id
    );
    let body = serde_json::json!({ "input": input });
    let resp = state
        .runpod_client
        .post(&url)
        .header("Authorization", format!("Bearer {}", state.runpod_api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("RunPod request: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("RunPod {status}: {body}"));
    }

    let result: serde_json::Value = resp.json().await
        .map_err(|e| format!("RunPod parse: {e}"))?;

    match result["status"].as_str() {
        Some("COMPLETED") => Ok(result["output"].clone()),
        Some("FAILED") => Err(format!("RunPod job failed: {}", result["error"].as_str().unwrap_or("unknown"))),
        Some(status) => Err(format!("RunPod unexpected status: {status}")),
        None => Err(format!("RunPod: no status in response: {result}")),
    }
}

/// Call RunPod serverless endpoint asynchronously with polling.
/// Used for Qwen-Omni which may have longer cold starts.
async fn runpod_async(
    state: &AppState,
    endpoint_id: &str,
    input: serde_json::Value,
) -> Result<serde_json::Value, String> {
    if state.runpod_api_key.is_empty() {
        return Err("RunPod APIキーが未設定".into());
    }

    // Submit job
    let run_url = format!("https://api.runpod.ai/v2/{}/run", endpoint_id);
    let body = serde_json::json!({ "input": input });
    let resp = state
        .runpod_client
        .post(&run_url)
        .header("Authorization", format!("Bearer {}", state.runpod_api_key))
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("RunPod submit: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("RunPod submit {status}: {body}"));
    }

    let submit_result: serde_json::Value = resp.json().await
        .map_err(|e| format!("RunPod submit parse: {e}"))?;
    let job_id = submit_result["id"].as_str()
        .ok_or_else(|| "RunPod: no job id in response".to_string())?;

    // Poll for result
    let status_url = format!("https://api.runpod.ai/v2/{}/status/{}", endpoint_id, job_id);
    for _ in 0..60 {
        tokio::time::sleep(Duration::from_secs(2)).await;

        let resp = state
            .runpod_client
            .get(&status_url)
            .header("Authorization", format!("Bearer {}", state.runpod_api_key))
            .send()
            .await
            .map_err(|e| format!("RunPod poll: {e}"))?;

        let result: serde_json::Value = resp.json().await
            .map_err(|e| format!("RunPod poll parse: {e}"))?;

        match result["status"].as_str() {
            Some("COMPLETED") => return Ok(result["output"].clone()),
            Some("FAILED") => return Err(format!("RunPod job failed: {}", result["error"].as_str().unwrap_or("unknown"))),
            Some("IN_QUEUE") | Some("IN_PROGRESS") => continue,
            Some(s) => return Err(format!("RunPod unexpected status: {s}")),
            None => return Err(format!("RunPod: no status in poll response")),
        }
    }

    Err("RunPod: polling timeout (120s)".into())
}

async fn tts_cosyvoice(state: &AppState, text: &str, voice: &str) -> Result<axum::body::Bytes, String> {
    if state.cosyvoice_endpoint_id.is_empty() {
        return Err("CosyVoice endpoint未設定".into());
    }
    let input = serde_json::json!({
        "text": text,
        "voice": voice,
        "speed": 1.0
    });
    let output = runpod_runsync(state, &state.cosyvoice_endpoint_id, input).await?;
    decode_runpod_audio(&output)
}

async fn tts_qwen_tts(state: &AppState, text: &str, language: &str) -> Result<axum::body::Bytes, String> {
    if state.qwen_tts_endpoint_id.is_empty() {
        return Err("Qwen-TTS endpoint未設定".into());
    }
    let input = serde_json::json!({
        "text": text,
        "language": language,
    });
    let output = runpod_runsync(state, &state.qwen_tts_endpoint_id, input).await?;
    decode_runpod_audio(&output)
}

async fn tts_qwen_omni(state: &AppState, text: &str, voice: &str) -> Result<axum::body::Bytes, String> {
    if state.qwen_omni_endpoint_id.is_empty() {
        return Err("Qwen-Omni endpoint未設定".into());
    }
    let input = serde_json::json!({
        "text": text,
        "voice": voice,
        "system_prompt": "あなたはプロの日本語ニュースキャスターです。自然な会話調で、親しみやすく明るいトーンで読み上げてください。"
    });
    let output = runpod_async(state, &state.qwen_omni_endpoint_id, input).await?;
    decode_runpod_audio(&output)
}

/// Decode base64 audio from RunPod handler response.
fn decode_runpod_audio(output: &serde_json::Value) -> Result<axum::body::Bytes, String> {
    let audio_b64 = output["audio_base64"].as_str()
        .ok_or_else(|| format!("RunPod: no audio_base64 in output: {output}"))?;
    if audio_b64.is_empty() {
        return Err("RunPod: empty audio output".into());
    }
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, audio_b64)
        .map_err(|e| format!("RunPod base64 decode: {e}"))?;
    Ok(axum::body::Bytes::from(bytes))
}

// --- Admin API ---

pub async fn handle_toggle_feature(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<ToggleFeatureRequest>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    let feature = body.feature.trim();
    if feature.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Empty feature name"})),
        )
            .into_response();
    }

    match state.db.set_feature_flag(feature, body.enabled, None) {
        Ok(()) => {
            let label = if body.enabled { "有効" } else { "無効" };
            info!(feature, enabled = body.enabled, "Feature toggled");
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "status": "ok",
                    "message": format!("{}を{}にしました。", feature, label)
                })),
            )
                .into_response()
        }
        Err(e) => {
            warn!(error = %e, feature, "Failed to toggle feature");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": format!("Failed to toggle feature: {}", e)})),
            )
                .into_response()
        }
    }
}

pub async fn handle_command(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<CommandRequest>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    let command = body.command.trim();
    if command.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Empty command"})),
        )
            .into_response();
    }

    let current_config = match state.db.get_service_config() {
        Ok(c) => c,
        Err(e) => {
            warn!(error = %e, "Failed to load service config");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to load config"})),
            )
                .into_response();
        }
    };

    let interpretation = match claude::interpret_command(
        &state.http_client,
        &state.api_key,
        command,
        &current_config,
    )
    .await
    {
        Ok(i) => i,
        Err(e) => {
            warn!(error = %e, "Claude API interpretation failed");
            return (
                StatusCode::OK,
                Json(serde_json::json!({
                    "type": "error",
                    "message": format!("コマンドの解釈に失敗しました: {}", e)
                })),
            )
                .into_response();
        }
    };

    if interpretation.confidence < 0.7 || interpretation.actions.is_empty() {
        return (
            StatusCode::OK,
            Json(serde_json::json!({
                "type": "info",
                "message": interpretation.interpretation,
                "confidence": interpretation.confidence
            })),
        )
            .into_response();
    }

    let change_id = uuid::Uuid::new_v4().to_string();
    let change = ChangeRequest {
        change_id: change_id.clone(),
        status: ChangeStatus::Preview,
        command_text: command.to_string(),
        interpretation: interpretation.interpretation.clone(),
        actions: interpretation.actions,
        preview_config: Some(current_config),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    if let Err(e) = state.db.create_change(&change) {
        warn!(error = %e, "Failed to save change request");
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "type": "preview",
            "change_id": change_id,
            "interpretation": interpretation.interpretation,
            "confidence": interpretation.confidence,
            "actions": change.actions
        })),
    )
        .into_response()
}

pub async fn list_changes(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    match state.db.list_changes(20) {
        Ok(changes) => {
            (StatusCode::OK, Json(serde_json::json!({"changes": changes}))).into_response()
        }
        Err(e) => {
            warn!(error = %e, "Failed to list changes");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Failed to list changes"})),
            )
                .into_response()
        }
    }
}

pub async fn apply_change(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(change_id): Path<String>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    let change = match state.db.get_change(&change_id) {
        Ok(Some(c)) => c,
        Ok(None) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "Change not found"})),
            )
                .into_response()
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e})),
            )
                .into_response()
        }
    };

    if change.status != ChangeStatus::Preview {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Change is not in preview status"})),
        )
            .into_response();
    }

    let mut applied = 0;
    let mut errors = Vec::new();

    for action in &change.actions {
        match apply_action(&state.db, action) {
            Ok(()) => applied += 1,
            Err(e) => errors.push(format!("{:?}: {}", action, e)),
        }
    }

    let _ = state
        .db
        .update_change_status(&change_id, ChangeStatus::Applied);

    info!(change_id = %change_id, applied, errors = errors.len(), "Change applied");

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "applied",
            "applied": applied,
            "errors": errors
        })),
    )
        .into_response()
}

pub async fn reject_change(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(change_id): Path<String>,
) -> Response {
    if let Err(resp) = check_admin_auth(&headers, &state) { return resp; }
    match state
        .db
        .update_change_status(&change_id, ChangeStatus::Rejected)
    {
        Ok(()) => (
            StatusCode::OK,
            Json(serde_json::json!({"status": "rejected"})),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e})),
        )
            .into_response(),
    }
}

// --- Subscription API ---

#[derive(Deserialize)]
pub struct SubscribeRequest {
    pub device_id: Option<String>,
}

pub async fn handle_subscribe(
    State(state): State<Arc<AppState>>,
    Json(body): Json<SubscribeRequest>,
) -> Response {
    if state.stripe_secret_key.is_empty() || state.stripe_price_id.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "課金機能が設定されていません"})),
        )
            .into_response();
    }

    let client_ref = body.device_id.unwrap_or_default();
    let success_url = format!("{}/pro/success?session_id={{CHECKOUT_SESSION_ID}}", state.base_url);
    let cancel_url = format!("{}/pro/cancel", state.base_url);

    match stripe::create_checkout_session(
        &state.http_client,
        &state.stripe_secret_key,
        &state.stripe_price_id,
        &success_url,
        &cancel_url,
        &client_ref,
    )
    .await
    {
        Ok(result) => (
            StatusCode::OK,
            Json(serde_json::json!({"url": result.session_url})),
        )
            .into_response(),
        Err(e) => {
            warn!(error = %e, "Failed to create checkout session");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "チェックアウトの作成に失敗しました"})),
            )
                .into_response()
        }
    }
}

pub async fn handle_stripe_webhook(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Response {
    // Verify signature
    let sig = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if state.stripe_webhook_secret.is_empty() {
        warn!("Stripe webhook secret not configured — rejecting webhook");
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Webhook not configured"}))).into_response();
    }
    if let Err(e) = stripe::verify_webhook_signature(&body, sig, &state.stripe_webhook_secret) {
        warn!(error = %e, "Webhook signature verification failed");
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invalid signature"}))).into_response();
    }

    let event: serde_json::Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(e) => {
            warn!(error = %e, "Failed to parse webhook body");
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invalid JSON"}))).into_response();
        }
    };

    let event_type = event["type"].as_str().unwrap_or("");
    info!(event_type, "Stripe webhook received");

    match event_type {
        "checkout.session.completed" => {
            let session = &event["data"]["object"];
            let customer_id = session["customer"].as_str().unwrap_or("");
            let subscription_id = session["subscription"].as_str().unwrap_or("");

            if !customer_id.is_empty() && !subscription_id.is_empty() {
                // Generate API token
                let api_token = uuid::Uuid::new_v4().to_string();
                // Fetch subscription to get period_end
                let period_end = fetch_subscription_period_end(
                    &state.http_client,
                    &state.stripe_secret_key,
                    subscription_id,
                )
                .await
                .unwrap_or_else(|_| {
                    (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339()
                });

                if let Err(e) = state.db.create_subscription(
                    &api_token,
                    customer_id,
                    subscription_id,
                    &period_end,
                ) {
                    warn!(error = %e, "Failed to create subscription in DB");
                }
                info!(customer_id, subscription_id, "Subscription created via checkout");
            }
        }
        "customer.subscription.updated" => {
            let sub = &event["data"]["object"];
            let sub_id = sub["id"].as_str().unwrap_or("");
            let status = sub["status"].as_str().unwrap_or("");
            let period_end = sub["current_period_end"].as_i64().map(|ts| {
                chrono::DateTime::from_timestamp(ts, 0)
                    .unwrap_or_default()
                    .to_rfc3339()
            });

            if !sub_id.is_empty() {
                let _ = state.db.update_subscription_status(
                    sub_id,
                    status,
                    period_end.as_deref(),
                );
                info!(sub_id, status, "Subscription updated via webhook");
            }
        }
        "customer.subscription.deleted" => {
            let sub = &event["data"]["object"];
            let sub_id = sub["id"].as_str().unwrap_or("");
            if !sub_id.is_empty() {
                let _ = state.db.update_subscription_status(sub_id, "canceled", None);
                info!(sub_id, "Subscription canceled via webhook");
            }
        }
        "invoice.payment_failed" => {
            let invoice = &event["data"]["object"];
            let sub_id = invoice["subscription"].as_str().unwrap_or("");
            if !sub_id.is_empty() {
                let _ = state.db.update_subscription_status(sub_id, "past_due", None);
                info!(sub_id, "Subscription payment failed");
            }
        }
        _ => {
            info!(event_type, "Unhandled webhook event type");
        }
    }

    (StatusCode::OK, Json(serde_json::json!({"received": true}))).into_response()
}

async fn fetch_subscription_period_end(
    client: &reqwest::Client,
    secret_key: &str,
    subscription_id: &str,
) -> Result<String, String> {
    let url = format!("https://api.stripe.com/v1/subscriptions/{}", subscription_id);
    let resp = client
        .get(&url)
        .basic_auth(secret_key, None::<&str>)
        .send()
        .await
        .map_err(|e| format!("Stripe fetch subscription: {e}"))?;

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Stripe JSON parse: {e}"))?;

    let ts = json["current_period_end"]
        .as_i64()
        .ok_or_else(|| "No current_period_end".to_string())?;

    Ok(chrono::DateTime::from_timestamp(ts, 0)
        .unwrap_or_default()
        .to_rfc3339())
}

pub async fn handle_subscription_status(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    if let Some(auth) = headers.get("authorization") {
        if let Ok(val) = auth.to_str() {
            if let Some(token) = val.strip_prefix("Bearer ") {
                if let Ok(Some((_, _, status, period_end))) =
                    state.db.get_subscription_by_token(token)
                {
                    return (
                        StatusCode::OK,
                        Json(serde_json::json!({
                            "active": status == "active",
                            "status": status,
                            "current_period_end": period_end
                        })),
                    )
                        .into_response();
                }
            }
        }
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "active": false,
            "status": "none"
        })),
    )
        .into_response()
}

pub async fn handle_billing_portal(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    if state.stripe_secret_key.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({"error": "課金機能が設定されていません"})),
        )
            .into_response();
    }

    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");

    if token.is_empty() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "認証トークンが必要です"})),
        )
            .into_response();
    }

    let customer_id = match state.db.get_subscription_by_token(token) {
        Ok(Some((cid, _, _, _))) => cid,
        _ => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "サブスクリプションが見つかりません"})),
            )
                .into_response();
        }
    };

    let return_url = format!("{}/", state.base_url);
    match stripe::create_billing_portal_session(
        &state.http_client,
        &state.stripe_secret_key,
        &customer_id,
        &return_url,
    )
    .await
    {
        Ok(url) => (
            StatusCode::OK,
            Json(serde_json::json!({"url": url})),
        )
            .into_response(),
        Err(e) => {
            warn!(error = %e, "Failed to create billing portal session");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "ポータルの作成に失敗しました"})),
            )
                .into_response()
        }
    }
}

pub async fn handle_usage(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    let tier = extract_user_tier(&headers, &state.db);

    match tier {
        UserTier::Pro => {
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "tier": "pro",
                    "usage": {},
                    "limits": {}
                })),
            )
                .into_response()
        }
        UserTier::Free { device_id } => {
            let usage = state.db.get_all_usage(&device_id).unwrap_or_default();
            let usage_map: serde_json::Map<String, serde_json::Value> = usage
                .into_iter()
                .map(|(f, c)| (f, serde_json::json!(c)))
                .collect();
            let limits_map: serde_json::Map<String, serde_json::Value> = FEATURE_LIMITS
                .iter()
                .map(|f| (f.name.to_string(), serde_json::json!(f.daily_limit)))
                .collect();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "tier": "free",
                    "usage": usage_map,
                    "limits": limits_map
                })),
            )
                .into_response()
        }
        UserTier::Anonymous => {
            let limits_map: serde_json::Map<String, serde_json::Value> = FEATURE_LIMITS
                .iter()
                .map(|f| (f.name.to_string(), serde_json::json!(f.daily_limit)))
                .collect();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "tier": "anonymous",
                    "usage": {},
                    "limits": limits_map
                })),
            )
                .into_response()
        }
    }
}

// --- Telemetry endpoint (fire-and-forget from sendBeacon) ---

pub async fn handle_telemetry(body: axum::body::Bytes) -> Response {
    // Log telemetry data (vitals, errors) from frontend beacons
    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&body) {
        let telemetry_type = json["type"].as_str().unwrap_or("unknown");
        match telemetry_type {
            "vitals" => {
                let url = json["url"].as_str().unwrap_or("");
                let metrics = &json["metrics"];
                info!(url, lcp = ?metrics["LCP"], inp = ?metrics["INP"], cls = ?metrics["CLS"], ttfb = ?metrics["TTFB"], "Web Vitals");
            }
            "errors" => {
                let count = json["errors"].as_array().map(|a| a.len()).unwrap_or(0);
                if count > 0 {
                    let url = json["url"].as_str().unwrap_or("");
                    warn!(url, count, "Client errors reported");
                }
            }
            _ => {}
        }
    }
    StatusCode::NO_CONTENT.into_response()
}

fn apply_action(db: &Db, action: &AdminAction) -> Result<(), String> {
    match action {
        AdminAction::AddFeed {
            url,
            source,
            category,
        } => {
            let feed_id = format!(
                "feed-{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .split('-')
                    .next()
                    .unwrap_or("x")
            );
            let feed = DynamicFeed {
                feed_id,
                url: url.clone(),
                source: source.clone(),
                category: category.clone(),
                enabled: true,
                added_by: Some("admin-chat".into()),
            };
            db.put_feed(&feed)
        }
        AdminAction::RemoveFeed { feed_id } => db.delete_feed(feed_id),
        AdminAction::EnableFeed { feed_id } => update_feed_enabled(db, feed_id, true),
        AdminAction::DisableFeed { feed_id } => update_feed_enabled(db, feed_id, false),
        AdminAction::ToggleFeature { feature, enabled } => {
            db.set_feature_flag(feature, *enabled, None)
        }
        AdminAction::SetGroupingThreshold { threshold } => {
            let extra = serde_json::json!({"similarity_threshold": threshold}).to_string();
            db.set_feature_flag("grouping", true, Some(&extra))
        }
        AdminAction::AddCategory { id, label_ja } => {
            let max_order = db.get_categories().map(|cats| cats.len() as i32).unwrap_or(0);
            db.put_category(id, label_ja, "", max_order)
        }
        AdminAction::RemoveCategory { id } => db.delete_category(id),
        AdminAction::RenameCategory { id, label_ja } => db.rename_category(id, label_ja),
        AdminAction::ReorderCategories { order } => db.reorder_categories(order),
    }
}

fn update_feed_enabled(db: &Db, feed_id: &str, enabled: bool) -> Result<(), String> {
    let feeds = db.get_all_feeds()?;
    let feed = feeds
        .into_iter()
        .find(|f| f.feed_id == feed_id)
        .ok_or_else(|| format!("Feed not found: {}", feed_id))?;
    let updated = DynamicFeed { enabled, ..feed };
    db.put_feed(&updated)
}

// --- SEO / OGP per-domain ---

struct SiteMeta {
    _site_id: &'static str,
    name: &'static str,
    title: &'static str,
    description: &'static str,
    description_long: &'static str,
    url: &'static str,
    image: &'static str,
    theme_color: &'static str,
    lang: &'static str,
    keywords: &'static str,
}

const SITE_METAS: &[SiteMeta] = &[
    SiteMeta {
        _site_id: "xyz",
        name: "news.xyz",
        title: "news.xyz - AI-Powered News",
        description: "Smart news with AI-generated summaries, Q&A, and voice reading. The fastest AI news aggregator.",
        description_long: "AI-Powered News Aggregator. Get the latest news across tech, business, entertainment, sports, and science with AI summaries, voice reading, and interactive Q&A.",
        url: "https://news.xyz/",
        image: "https://news.xyz/icons/icon-512.png",
        theme_color: "#1a1a2e",
        lang: "en",
        keywords: "news,AI,artificial intelligence,news aggregator,AI summary,voice news,tech news,breaking news",
    },
    SiteMeta {
        _site_id: "online",
        name: "news.online",
        title: "news.online - Voice News Feed",
        description: "TikTok-style AI voice news feed. Swipe through the latest news with AI-generated podcast dialogues.",
        description_long: "Voice News - TikTok-style AI voice news feed. Swipe through the latest news with AI-generated podcast dialogues and voice narration.",
        url: "https://news.online/",
        image: "https://news.online/icons/icon-512.png",
        theme_color: "#000000",
        lang: "en",
        keywords: "voice news,AI podcast,news feed,TikTok news,audio news,AI narration,news online",
    },
    SiteMeta {
        _site_id: "cloud",
        name: "news.cloud",
        title: "news.cloud - News API Platform",
        description: "Developer-friendly news aggregation API. AI summaries, article search, podcast generation, and MCP support.",
        description_long: "News API Platform for developers. Access AI-powered news aggregation, article search, AI summaries, podcast generation, and MCP integration via a simple REST API.",
        url: "https://news.cloud/",
        image: "https://news.cloud/icons/icon-512.png",
        theme_color: "#0f172a",
        lang: "en",
        keywords: "news API,developer API,news aggregation,AI API,MCP,REST API,news data,news platform",
    },
    SiteMeta {
        _site_id: "chatnews",
        name: "ChatNews",
        title: "ChatNews - Conversational AI News",
        description: "Chat with AI about the latest news. Get summaries, deep dives, and answers in a conversational format.",
        description_long: "Conversational AI News Experience. Chat with AI about the latest news, get instant summaries, deep-dive analysis, and answers to your questions.",
        url: "https://chatnews.link/",
        image: "https://chatnews.link/icons/icon-512.png",
        theme_color: "#18181b",
        lang: "en",
        keywords: "chat news,AI chat,conversational news,news AI,chatbot news,AI assistant,news summary",
    },
    SiteMeta {
        _site_id: "yournews",
        name: "YourNews",
        title: "YourNews - Personalized AI News",
        description: "AI-curated news tailored to your interests. Your personalized news feed delivered daily.",
        description_long: "Your Personalized AI News. AI curates and delivers news tailored to your interests with smart summaries and voice reading.",
        url: "https://yournews.link/",
        image: "https://yournews.link/icons/icon-512.png",
        theme_color: "#0c0a09",
        lang: "en",
        keywords: "personalized news,AI curation,custom news feed,news for you,AI news,daily news,smart news",
    },
    SiteMeta {
        _site_id: "velo",
        name: "velo.tech",
        title: "velo.tech - Web Speed Insights",
        description: "Instant web performance measurement. Core Web Vitals, speed scores, and optimization suggestions in one click.",
        description_long: "Web Speed Insights. Measure your website performance instantly with Core Web Vitals analysis, speed scores, and actionable optimization suggestions.",
        url: "https://velo.tech/",
        image: "https://velo.tech/icons/icon-512.png",
        theme_color: "#020617",
        lang: "en",
        keywords: "web performance,Core Web Vitals,speed test,website speed,performance audit,web optimization",
    },
    SiteMeta {
        _site_id: "claud",
        name: "ClaudNews",
        title: "ClaudNews - AI News by Claude",
        description: "AI-powered news aggregator powered by Claude. Smart summaries, Q&A, and voice reading.",
        description_long: "AI News by Claude. Get the latest news with AI-generated summaries, interactive Q&A, and voice reading powered by Claude.",
        url: "https://news.claud/",
        image: "https://news.claud/icons/icon-512.png",
        theme_color: "#1c1917",
        lang: "en",
        keywords: "Claude AI,AI news,news summary,Claude news,AI aggregator,smart news",
    },
];

fn detect_site(host: &str) -> &'static SiteMeta {
    if host.contains("online") {
        &SITE_METAS[1]
    } else if host.contains("chatnews") {
        &SITE_METAS[3]
    } else if host.contains("yournews") {
        &SITE_METAS[4]
    } else if host.contains("velo") {
        &SITE_METAS[5]
    } else if host.contains(".cloud") {
        &SITE_METAS[2]
    } else if host.contains("claud") {
        &SITE_METAS[6]
    } else {
        &SITE_METAS[0] // news.xyz default
    }
}

/// Serve index.html with per-domain SEO/OGP meta tags injected server-side.
/// This is critical because crawlers (Googlebot, Facebook, Twitter) do NOT execute JavaScript.
/// Instead of fragile string replacements on the original template, we use placeholders.
const INDEX_HTML_TEMPLATE: &str = include_str!("../../../../frontend/index.html");

pub async fn serve_index_html(headers: HeaderMap) -> Response {
    let host = headers
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("news.xyz");

    let site = detect_site(host);

    // Build the <head> section with correct meta tags for this domain
    let head_block = format!(
r#"<head>
  <script>(function(){{var h=location.hostname;var s='xyz';if(h.indexOf('online')!==-1)s='online';else if(h.indexOf('chatnews')!==-1)s='chatnews';else if(h.indexOf('yournews')!==-1)s='yournews';else if(h.indexOf('velo')!==-1)s='velo';else if(h.indexOf('.cloud')!==-1)s='cloud';else if(h.indexOf('claud')!==-1)s='claud';document.documentElement.dataset.site=s;}})()</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="{description_long}">
  <meta name="keywords" content="{keywords}">
  <meta name="theme-color" content="{theme_color}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{url}">
  <!-- OGP -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="{name}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{image}">
  <meta property="og:locale" content="ja_JP">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{image}">
  <title>{title}</title>"#,
        description_long = site.description_long,
        keywords = site.keywords,
        theme_color = site.theme_color,
        url = site.url,
        name = site.name,
        title = site.title,
        description = site.description,
        image = site.image,
    );

    // Replace the entire <head> block up to (but not including) the manifest link
    // The template starts with: <!DOCTYPE html>\n<html lang="ja">\n<head>\n  ...  \n  <title>...</title>
    // We replace from <head> through </title> line, then keep the rest (manifest, CSS, etc.)
    let html_str = INDEX_HTML_TEMPLATE;

    // Find the end of the <title> line to know where to splice
    let title_end = html_str.find("</title>")
        .map(|pos| {
            // Find the end of the line containing </title>
            html_str[pos..].find('\n').map(|nl| pos + nl + 1).unwrap_or(pos + 8)
        })
        .unwrap_or(0);

    let head_start = html_str.find("<head>").unwrap_or(0);

    let html = if title_end > head_start {
        let lang_attr = format!("<html lang=\"{}\">", site.lang);
        format!(
            "<!DOCTYPE html>\n{}\n{}\n{}",
            lang_attr,
            head_block,
            &html_str[title_end..]
        )
    } else {
        // Fallback: serve the original template
        html_str.to_string()
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .header(header::CACHE_CONTROL, "public, max-age=300")
        .body(Body::from(html))
        .unwrap()
}

/// Serve /robots.txt with a reference to the sitemap.
pub async fn serve_robots_txt(headers: HeaderMap) -> Response {
    let host = headers
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("news.xyz");

    let site = detect_site(host);

    let body = format!(
        "User-agent: *\n\
         Allow: /\n\
         \n\
         Sitemap: {}sitemap.xml\n",
        site.url
    );

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .header(header::CACHE_CONTROL, "public, max-age=3600")
        .body(Body::from(body))
        .unwrap()
}

/// Serve /sitemap.xml dynamically generated from articles in the database.
pub async fn serve_sitemap_xml(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    let host = headers
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("news.xyz");

    let site = detect_site(host);
    let base_url = site.url.trim_end_matches('/');

    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n",
    );

    // Homepage
    xml.push_str(&format!(
        "  <url>\n    <loc>{}/</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n",
        base_url
    ));

    // Static pages
    for page in &["about.html", "settings.html"] {
        xml.push_str(&format!(
            "  <url>\n    <loc>{}/{}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n",
            base_url, page
        ));
    }

    // Category pages
    for cat in news_core::models::Category::all() {
        xml.push_str(&format!(
            "  <url>\n    <loc>{}/?category={}</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.8</priority>\n  </url>\n",
            base_url, cat.as_str()
        ));
    }

    // Recent articles (up to 200 for sitemap coverage)
    if let Ok((articles, _)) = state.db.query_articles(None, 200, None) {
        for article in &articles {
            let lastmod = article.published_at.format("%Y-%m-%dT%H:%M:%S+00:00");
            // Use article ID as the URL fragment/path for the detail view
            let escaped_id = article.id.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;");
            xml.push_str(&format!(
                "  <url>\n    <loc>{}/#article/{}</loc>\n    <lastmod>{}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>\n",
                base_url, escaped_id, lastmod
            ));
        }
    }

    xml.push_str("</urlset>\n");

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/xml; charset=utf-8")
        .header(header::CACHE_CONTROL, "public, max-age=600")
        .body(Body::from(xml))
        .unwrap()
}
