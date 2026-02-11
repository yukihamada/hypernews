# HyperNews

AI-powered global news aggregation platform with multi-source RSS feeds, natural language configuration, text-to-speech, and MCP server integration.

## Features

- **Global RSS Aggregation** — 24+ international feeds across 6 categories (General, Tech, Business, Entertainment, Sports, Science)
- **AI-Powered Q&A** — Ask questions about any article, powered by Claude Sonnet
- **News Summarization** — AI-generated news anchor scripts with TTS playback
- **Multi-Provider TTS** — ElevenLabs, OpenAI, Cartesia, Fish Audio, AI/ML API, Venice AI with automatic failover
- **Natural Language Admin** — Configure feeds, features, and categories via conversational chat
- **MCP Server** — Model Context Protocol endpoint for external AI tool integration
- **Settings UI** — Full-featured settings page with RSS management, display preferences, and AI configuration
- **PWA Support** — Offline-capable Progressive Web App with Service Worker
- **Subscription System** — Free tier with daily limits, Pro tier via Stripe
- **A/B Testing** — 10 design variants with Thompson Sampling auto-optimization
- **Article Grouping** — ML-based duplicate detection and clustering
- **Multi-Theme** — Hacker, Card, Lite themes with 7 accent colors, dark/light mode

## Tech Stack

### Backend (Rust)
- **axum 0.7** — HTTP framework
- **rusqlite** (WAL mode) — SQLite storage
- **feed-rs v2** — RSS/Atom feed parsing
- **reqwest 0.12** — HTTP client (rustls-tls)
- **tokio** — Async runtime with background fetcher
- **tower-http** — CORS, compression, security headers

### Frontend
- **Vanilla JS** — No framework, modular ES6+ singletons
- **PWA** — Service Worker, offline support, battery saving
- **Responsive** — Mobile-first design with multiple layout densities

### Infrastructure
- **Fly.io** — Primary deployment (Tokyo region)
- **AWS Lambda** — Alternative deployment via SAM
- **Docker** — Multi-stage build

## Project Structure

```
backend/
  crates/
    news-core/       # Shared models, feed parsing, config, grouping
    news-server/     # Standalone server (Fly.io) — axum + SQLite + fetcher + MCP
    news-fetcher/    # Lambda fetcher
    news-api/        # Lambda API
    news-admin/      # Lambda admin
  feeds.toml         # RSS feed configuration
  infra/             # SAM template + deploy scripts
frontend/
  index.html         # Main app
  about.html         # Landing page
  settings.html      # Settings UI
  js/                # 12+ JS modules
  css/               # Theme stylesheets
  sw.js              # Service Worker
```

## Setup

### Prerequisites
- Rust 1.75+ (stable)
- SQLite 3

### Local Development

```bash
# Clone
git clone <repo-url> && cd agi

# Build backend
cd backend
cargo build -p news-server

# Set environment variables
export DATABASE_PATH=./news.db
export STATIC_DIR=../frontend
export ANTHROPIC_API_KEY=sk-ant-...
export PORT=8080

# Run
cargo run -p news-server
```

Open `http://localhost:8080` in your browser.

### Docker

```bash
docker build -t hypernews .
docker run -p 8080:8080 \
  -v news-data:/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  hypernews
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_PATH` | No | SQLite path (default: `/data/news.db`) |
| `STATIC_DIR` | No | Frontend directory (default: `/app/public`) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI features |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS |
| `OPENAI_API_KEY` | No | OpenAI TTS (gpt-4o-mini-tts) |
| `CARTESIA_API_KEY` | No | Cartesia TTS |
| `FISH_AUDIO_API_KEY` | No | Fish Audio TTS |
| `AIMLAPI_KEY` | No | AI/ML API TTS |
| `VENICE_API_KEY` | No | Venice AI TTS |
| `STRIPE_SECRET_KEY` | No | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook verification |
| `STRIPE_PRICE_ID` | No | Stripe subscription price |
| `ADMIN_SECRET` | No | Admin API authentication (empty = open) |
| `BASE_URL` | No | Public URL (default: `https://news.xyz`) |
| `PORT` | No | Server port (default: `8080`) |

## Deploy (Fly.io)

```bash
# Deploy news.xyz
fly deploy -c fly.toml

# Deploy news.online
fly deploy -c fly.online.toml
```

## MCP Server

HyperNews exposes a Model Context Protocol endpoint at `POST /mcp` for external AI tool integration.

### Tools
- `list_articles` — Fetch articles by category
- `search_articles` — Keyword search
- `list_feeds` / `add_feed` / `remove_feed` / `toggle_feed` — Feed management
- `list_categories` — Category listing
- `ask_question` — AI Q&A on articles
- `summarize_news` — Generate news summary
- `get_settings` / `update_settings` — Configuration management

### Resources
- `news://articles` — Latest articles
- `news://feeds` — Registered feeds
- `news://categories` — Category list
- `news://settings` — Current settings

### Example
```bash
curl -X POST https://news.xyz/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## License

Private — All rights reserved.
