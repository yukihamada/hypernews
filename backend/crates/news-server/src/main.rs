mod claude;
mod db;
mod fetcher;
mod mcp;
mod routes;
mod stripe;

use axum::extract::Request;
use axum::http::HeaderValue;
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Redirect};
use axum::routing::{delete, get, post, put};
use axum::Router;
use db::Db;
use news_core::config::DynamicFeed;
use news_core::feeds::FeedsConfig;
use routes::AppState;
use std::sync::Arc;
use tower::limit::ConcurrencyLimitLayer;
use tower_http::compression::CompressionLayer;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::services::ServeDir;
use tracing::info;

const FEEDS_TOML: &str = include_str!("../../../feeds.toml");

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "/data/news.db".into());
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "/app/public".into());
    let api_key = std::env::var("ANTHROPIC_API_KEY").unwrap_or_default();
    let elevenlabs_api_key = std::env::var("ELEVENLABS_API_KEY").unwrap_or_default();
    let openai_api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
    let cartesia_api_key = std::env::var("CARTESIA_API_KEY").unwrap_or_default();
    let fish_audio_api_key = std::env::var("FISH_AUDIO_API_KEY").unwrap_or_default();
    let aimlapi_key = std::env::var("AIMLAPI_KEY").unwrap_or_default();
    let venice_api_key = std::env::var("VENICE_API_KEY").unwrap_or_default();
    let stripe_secret_key = std::env::var("STRIPE_SECRET_KEY").unwrap_or_default();
    let stripe_webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET").unwrap_or_default();
    let stripe_price_id = std::env::var("STRIPE_PRICE_ID").unwrap_or_default();
    let admin_secret = std::env::var("ADMIN_SECRET").unwrap_or_default();
    let base_url = std::env::var("BASE_URL").unwrap_or_else(|_| "https://news.xyz".into());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let db = Arc::new(Db::open(&db_path).expect("Failed to open SQLite database"));

    // Seed feeds from feeds.toml if DB is empty
    if db.feed_count().unwrap_or(0) == 0 {
        if let Ok(config) = FeedsConfig::from_toml(FEEDS_TOML) {
            for (i, feed) in config.feeds.iter().enumerate() {
                let dynamic = DynamicFeed {
                    feed_id: format!("seed-{}", i),
                    url: feed.url.clone(),
                    source: feed.source.clone(),
                    category: feed.category.clone(),
                    enabled: true,
                    added_by: Some("seed".into()),
                };
                let _ = db.put_feed(&dynamic);
            }
            info!(count = config.feeds.len(), "Seeded feeds from feeds.toml");
        }
    }

    // Seed default categories if table is empty
    if db.category_count().unwrap_or(0) == 0 {
        let _ = db.seed_default_categories();
    }
    // Ensure all categories are visible (fix for hidden categories)
    let _ = db.ensure_all_categories_visible();

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("NewsAggregator/1.0")
        .build()
        .expect("Failed to build HTTP client");

    // Spawn background fetcher
    let fetcher_db = Arc::clone(&db);
    let fetcher_client = http_client.clone();
    tokio::spawn(async move {
        fetcher::run(fetcher_db, fetcher_client).await;
    });

    let state = Arc::new(AppState {
        db,
        http_client,
        api_key,
        elevenlabs_api_key,
        openai_api_key,
        cartesia_api_key,
        fish_audio_api_key,
        aimlapi_key,
        venice_api_key,
        stripe_secret_key,
        stripe_webhook_secret,
        stripe_price_id,
        admin_secret,
        base_url,
    });

    let api_routes = Router::new()
        .route("/api/articles", get(routes::get_articles))
        .route("/api/categories", get(routes::get_categories))
        .route("/health", get(routes::health))
        .route("/api/articles/summarize", post(routes::handle_summarize))
        .route("/api/articles/questions", post(routes::handle_article_questions))
        .route("/api/articles/ask", post(routes::handle_article_ask))
        .route("/api/tts/to-reading", post(routes::handle_to_reading))
        .route("/api/tts/voices", get(routes::handle_tts_voices))
        .route("/api/tts", post(routes::handle_tts))
        .route("/api/podcast/generate", post(routes::handle_podcast_generate))
        .route("/api/feed", get(routes::get_feed))
        .route("/api/admin/feeds", get(routes::list_feeds))
        .route("/api/admin/feeds", post(routes::add_feed))
        .route("/api/admin/feeds/:feed_id", delete(routes::delete_feed))
        .route("/api/admin/feeds/:feed_id", put(routes::update_feed))
        .route("/api/admin/categories", post(routes::handle_categories_manage))
        .route("/api/admin/command", post(routes::handle_command))
        .route("/api/admin/features", post(routes::handle_toggle_feature))
        .route("/api/admin/changes", get(routes::list_changes))
        .route(
            "/api/admin/changes/:id/apply",
            post(routes::apply_change),
        )
        .route(
            "/api/admin/changes/:id/reject",
            post(routes::reject_change),
        )
        // Subscription routes
        .route("/api/subscribe", post(routes::handle_subscribe))
        .route("/api/stripe/webhook", post(routes::handle_stripe_webhook))
        .route("/api/subscription/status", get(routes::handle_subscription_status))
        .route("/api/subscription/portal", post(routes::handle_billing_portal))
        .route("/api/usage", get(routes::handle_usage))
        // MCP server endpoint
        .route("/mcp", post(mcp::handle_mcp))
        // SEO: server-side rendered index.html with per-domain OGP meta tags
        .route("/", get(routes::serve_index_html))
        .route("/index.html", get(routes::serve_index_html))
        // SEO: sitemap and robots.txt
        .route("/robots.txt", get(routes::serve_robots_txt))
        .route("/sitemap.xml", get(routes::serve_sitemap_xml))
        .with_state(state);

    // CORS: restrict to known origins (same-origin requests + specific domains)
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list([
            "https://news.xyz".parse::<HeaderValue>().unwrap(),
            "https://news.online".parse::<HeaderValue>().unwrap(),
            "https://news.cloud".parse::<HeaderValue>().unwrap(),
            "https://chatnews.link".parse::<HeaderValue>().unwrap(),
            "https://chatnews.tech".parse::<HeaderValue>().unwrap(),
            "https://yournews.link".parse::<HeaderValue>().unwrap(),
            "https://velo.tech".parse::<HeaderValue>().unwrap(),
            "https://news.claud".parse::<HeaderValue>().unwrap(),
            "https://news-xyz.fly.dev".parse::<HeaderValue>().unwrap(),
            "https://news-online.fly.dev".parse::<HeaderValue>().unwrap(),
            "http://localhost:8080".parse::<HeaderValue>().unwrap(),
        ]))
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::HeaderName::from_static("x-device-id"),
            axum::http::HeaderName::from_static("x-admin-secret"),
        ]);

    let app = api_routes
        .fallback_service(ServeDir::new(&static_dir).append_index_html_on_directories(true))
        .layer(middleware::from_fn(redirect_chatnews_tech))
        .layer(ConcurrencyLimitLayer::new(256))
        .layer(CompressionLayer::new())
        .layer(cors)
        // Security headers
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            axum::http::header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        ));

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("Failed to bind");

    info!(port, "Server starting");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server error");
}

/// Redirect chatnews.tech → chatnews.link (301)
async fn redirect_chatnews_tech(req: Request, next: Next) -> impl IntoResponse {
    if let Some(host) = req.headers().get("host").and_then(|h| h.to_str().ok()) {
        if host.contains("chatnews.tech") {
            let uri = req.uri();
            let path = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/");
            let target = format!("https://chatnews.link{}", path);
            return Redirect::permanent(&target).into_response();
        }
    }
    next.run(req).await.into_response()
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C handler");
    info!("Shutdown signal received");
}
