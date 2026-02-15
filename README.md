# news.xyz - I Spent $64.5K on Domains, Then Built This

> **The Story**: I had a brilliant idea for an AI news platform. Got excited and registered some domains without checking the price.
>
> Then the invoice arrived:
> - news.online: **$40,000**
> - news.xyz: **$16,000**
> - 5 other domains: **$8,500**
>
> **Total: $64,500 USD**
>
> I had no idea premium domains cost this much. My heart stopped. But after the shock wore off, I thought: "Well, I can't return them. Might as well build something extraordinary."

---

## What I Built

One single **Rust binary** that powers **7 completely different news experiences**:

| Site | URL | Experience |
|------|-----|------------|
| 🎯 **news.xyz** | https://news.xyz | Card-based news (3 themes, AI chat, TTS) |
| 📱 **news.online** | https://news.online | TikTok-style vertical swipe with AI podcasts |
| 🔧 **news.cloud** | https://news.cloud | News API platform for developers |
| 💬 **chatnews.link** | https://chatnews.link | Chat with AI about the news |
| ✨ **yournews.link** | https://yournews.link | Personalized news curation |
| ⚡ **velo.tech** | https://velo.tech | Web performance measurement |
| 🔀 **chatnews.tech** | — | 301 redirect → chatnews.link |

All running from the **same Docker image** on Fly.io (Tokyo). Domain detection happens client-side, UI switches based on hostname. Backend is shared.

**No separate deployments. No multiple databases. Just one binary, seven experiences.**

---

## Why This Matters

Most platforms require separate deployments, databases, and infrastructure per site. I wanted to prove you can build multiple premium experiences from one codebase without sacrificing user experience.

The $64.5K mistake forced me to think differently. Instead of building one mediocre site to "justify" the cost, I built seven excellent ones.

### The Tech Stack

```
Rust (axum 0.7) + Vanilla JS
        ↓
Single SQLite database (WAL mode)
        ↓
Claude Sonnet (dialogue generation)
OpenAI TTS (voice synthesis)
        ↓
Deployed to Fly.io Tokyo (nrt)
```

**Architecture Philosophy**:
- No framework bloat, just performance
- Client-side domain detection
- Shared backend, divergent UI
- AI-powered features (podcast, chat, summarization)
- RSS aggregation every 30 minutes

---

## Quick Start

### Try It (No Signup Required)

- **news.xyz** - Best on desktop, card-based layout
- **news.online** - Perfect on mobile, TikTok-style feed
- **news.cloud** - API docs for developers

### Run Locally

```bash
# Prerequisites: Rust 1.75+, SQLite 3
git clone https://github.com/yukihamada/hypernews.git
cd hypernews/backend

# Environment setup
export DATABASE_PATH=./news.db
export STATIC_DIR=../frontend
export PORT=8080

# Optional: AI features
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

# Build & run
cargo run -p news-server

# Open browser
open http://localhost:8080
```

### Test Different Sites Locally

Since `localhost` doesn't match any domain, use DevTools console:

```javascript
// news.online (TikTok-style feed)
document.documentElement.dataset.site = 'online'; location.reload();

// news.cloud (API platform)
document.documentElement.dataset.site = 'cloud'; location.reload();

// chatnews.link (chat UI)
document.documentElement.dataset.site = 'chatnews'; location.reload();

// yournews.link (personalized)
document.documentElement.dataset.site = 'yournews'; location.reload();

// velo.tech (performance tool)
document.documentElement.dataset.site = 'velo'; location.reload();
```

---

## Architecture Deep Dive

### Single Binary, Multiple Sites

```
┌─────────────────────────────────────────────────┐
│                   Fly.io (Tokyo nrt)             │
│  ┌────────────────────────────────────────────┐  │
│  │      news-server (single Rust binary)      │  │
│  │  axum 0.7 HTTP ─┬─ /api/*  (REST API)     │  │
│  │                  ├─ /mcp    (MCP Server)   │  │
│  │                  └─ /*      (static files)  │  │
│  │  SQLite (WAL) ── /data/news.db             │  │
│  │  Background ──── RSS Fetcher (30min)       │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  news.xyz       news.online      news.cloud      │
│  chatnews.link  yournews.link    velo.tech       │
│  chatnews.tech → chatnews.link (301)             │
└─────────────────────────────────────────────────┘
```

**How It Works**:
1. All 7 domains point to the same Fly.io app
2. Frontend JavaScript detects `window.location.hostname`
3. Sets `data-site` attribute on `<html>` element
4. CSS and JS modules load based on `data-site` value
5. Backend serves same API to all sites

**Result**: One deployment updates all seven sites instantly.

---

## Project Structure

```
hypernews/
├── backend/
│   ├── feeds.toml              # RSS feed configuration
│   ├── crates/
│   │   ├── news-server/        # Main server (Fly.io)
│   │   │   └── src/
│   │   │       ├── main.rs     # Entry point, router
│   │   │       ├── routes.rs   # API handlers
│   │   │       ├── db.rs       # SQLite store
│   │   │       ├── fetcher.rs  # Background RSS fetch
│   │   │       ├── claude.rs   # Claude API integration
│   │   │       ├── mcp.rs      # MCP Server
│   │   │       └── stripe.rs   # Payment processing
│   │   └── news-core/          # Shared library
│
├── frontend/
│   ├── index.html              # Main HTML (domain detection)
│   ├── css/
│   │   ├── base.css            # Common styles
│   │   ├── feed.css            # news.online (Apple Liquid Glass)
│   │   ├── cloud.css           # news.cloud API docs
│   │   ├── chatnews.css        # chatnews.link chat UI
│   │   ├── yournews.css        # yournews.link personalized
│   │   ├── velo.css            # velo.tech performance
│   │   └── theme-*.css         # news.xyz themes (card/hacker/lite)
│   ├── js/
│   │   ├── app.js              # App initialization
│   │   ├── feed.js             # news.online vertical swipe
│   │   ├── feed-player.js      # Podcast player
│   │   ├── cloud.js            # API documentation
│   │   ├── chatnews.js         # Chat UI
│   │   ├── yournews.js         # Personalization
│   │   ├── velo.js             # Performance measurement
│   │   └── ...                 # Shared modules
│   └── manifest-*.json         # PWA manifests per site
│
├── Dockerfile                  # Multi-stage build
├── fly.*.toml                  # Fly.io configs (7 files)
└── deploy-fly.sh               # Deployment script
```

---

## Features by Site

### 🎯 news.xyz
- **3 Visual Themes**: Card, Hacker, Lite
- **AI Assistant**: 4 conversation modes (Caster, Friend, Scholar, Entertainer)
- **TTS**: Read articles aloud
- **Categories**: Tech, Business, Entertainment, Sports, Science
- **PWA**: Install as app

### 📱 news.online
- **TikTok-Style Feed**: Vertical swipe navigation
- **AI Podcasts**: Two-person dialogue about each article (Claude + OpenAI TTS)
- **Voice Commands**: "Next", "Play", "Technology" (Japanese)
- **Apple Liquid Glass**: iOS-inspired visual design
- **Auto-narration**: Browser TTS reads headlines

### 🔧 news.cloud
- **REST API**: `/api/articles`, `/api/categories`, `/api/feed`
- **Documentation**: Interactive API explorer
- **Developer Tools**: CORS enabled, JSON responses
- **Rate Limiting**: Fair use policy
- **Future**: Paid tiers, webhooks, custom feeds

### 💬 chatnews.link
- **Chat Interface**: Discuss news with AI
- **Context-Aware**: AI remembers conversation history
- **Question Suggestions**: Auto-generated follow-ups
- **Voice Output**: TTS for AI responses

### ✨ yournews.link
- **Personalization**: Interest-based curation
- **Learning Algorithm**: Adapts to reading patterns
- **Custom Categories**: Create your own topics
- **Reading History**: Track what you've read

### ⚡ velo.tech
- **Core Web Vitals**: LCP, FID, CLS measurement
- **Performance Score**: Lighthouse-style metrics
- **Comparison**: Benchmark against top sites
- **Export**: Download reports as JSON/PDF

---

## API Documentation

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/articles` | List articles (cursor pagination) |
| `GET` | `/api/categories` | List categories |
| `GET` | `/api/feed` | Feed articles (limit=10) |
| `POST` | `/api/podcast/generate` | Generate AI podcast for article |
| `POST` | `/api/tts` | Text-to-speech synthesis |
| `POST` | `/api/articles/summarize` | Summarize article with AI |
| `POST` | `/api/articles/ask` | Q&A about article |
| `GET` | `/health` | Health check |
| `POST` | `/mcp` | MCP Server endpoint |

### Example: Get Articles

```bash
curl https://news.xyz/api/articles?limit=20&category=tech
```

Response:
```json
{
  "articles": [...],
  "next_cursor": "eyJ0aW1lc3RhbXAiOjE3MDk1...",
  "has_more": true
}
```

### Example: Generate Podcast

```bash
curl -X POST https://news.xyz/api/podcast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "article_id": "abc123",
    "style": "professional"
  }'
```

Response:
```json
{
  "audio_segments": [
    {
      "speaker": "host",
      "text": "今日のトップニュースは...",
      "audio_base64": "//uQxAA..."
    }
  ],
  "duration_seconds": 45
}
```

---

## How AI Features Work

### Podcast Generation (news.online)

1. User taps play button on article
2. `POST /api/podcast/generate` with article ID
3. Backend:
   - Claude Sonnet generates 2-person dialogue script (8-12 lines)
   - Each line sent to OpenAI TTS (`alloy` for host, `echo` for analyst)
   - Audio segments cached for 6 hours
4. Frontend plays segments sequentially with speaker highlighting

**Cost**: ~$0.007/article (Claude $0.003 + TTS $0.004)

### AI Assistant (news.xyz)

1. User selects conversation mode (Caster/Friend/Scholar/Entertainer)
2. System generates 4 question suggestions based on article
3. User taps suggestion → AI generates contextual answer
4. Answer read aloud via TTS
5. New suggestions generated based on conversation history

**Modes**:
- **Caster**: Professional, objective, news-style
- **Friend**: Casual, friendly, conversational
- **Scholar**: Academic, detailed, data-driven
- **Entertainer**: Humorous, engaging, fun

---

## Deployment

### Deploy to Fly.io

```bash
# Install Fly CLI
brew install flyctl
fly auth login

# Deploy all sites (same Docker image)
fly deploy -c fly.toml            # news.xyz
fly deploy -c fly.online.toml     # news.online
fly deploy -c fly.cloud.toml      # news.cloud
fly deploy -c fly.chatnews.toml   # chatnews.link + chatnews.tech
fly deploy -c fly.yournews.toml   # yournews.link
fly deploy -c fly.velo.toml       # velo.tech
```

### Set Secrets

```bash
for app in news-xyz news-online news-cloud chatnews yournews velo-tech; do
  fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a $app
  fly secrets set OPENAI_API_KEY=sk-... -a $app
done
```

### Fly.io Configuration

- **Region**: `nrt` (Tokyo)
- **Machine**: `shared-cpu-1x`, 512MB RAM
- **Volume**: `/data` (SQLite with WAL mode)
- **Auto-stop**: Disabled (background fetcher runs 24/7)

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_PATH` | - | SQLite file path | `/data/news.db` |
| `STATIC_DIR` | - | Frontend directory | `/app/public` |
| `PORT` | - | HTTP port | `8080` |
| `ANTHROPIC_API_KEY` | * | Claude API (AI features) | - |
| `OPENAI_API_KEY` | * | OpenAI TTS (podcasts) | - |
| `ELEVENLABS_API_KEY` | - | ElevenLabs TTS | - |
| `STRIPE_SECRET_KEY` | - | Stripe payments | - |
| `ADMIN_SECRET` | - | Admin API auth | - |
| `BASE_URL` | - | Public URL | `https://news.xyz` |

**\*** = Required for AI features. Server runs without them, but AI functionality will be disabled.

---

## RSS Feed Management

Edit `backend/feeds.toml`:

```toml
[[feeds]]
url = "https://example.com/rss"
category = "tech"           # general/tech/business/entertainment/sports/science
source = "Example News"
language = "ja"             # ja/en
```

Changes take effect on next fetch cycle (30 minutes) or server restart.

---

## Adding New Categories

1. Add feeds to `backend/feeds.toml` with new category
2. Update `frontend/js/feed.js` → `loadCategories()` fallback
3. Add color gradient in `frontend/css/feed.css` → `--feed-gradient`

---

## Development Tips

### Testing Different Sites

Use Chrome DevTools to switch sites without DNS:

```javascript
// In console
const sites = ['xyz', 'online', 'cloud', 'chatnews', 'yournews', 'velo'];
document.documentElement.dataset.site = sites[1]; // news.online
location.reload();
```

### Hot Reload CSS

```bash
# In frontend/
npx browser-sync start --server --files "css/*.css, js/*.js" --no-open
```

### Debugging AI Features

```javascript
// Check if AI is available
fetch('/api/articles/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    article_id: 'test',
    question: 'Hello?'
  })
}).then(r => r.json()).then(console.log);
```

### SQLite CLI

```bash
sqlite3 news.db
.tables
SELECT COUNT(*) FROM articles;
SELECT * FROM articles ORDER BY published_at DESC LIMIT 5;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `cargo build` link error | Check `rustup default stable` |
| Podcasts not generating | Verify `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` |
| RSS not updating | Check `feeds.toml` URLs, wait 30min for next cycle |
| Wrong UI showing | DevTools → check `document.documentElement.dataset.site` |
| SQLite locked | Ensure only one process accesses DB |
| AI responses fail | Check API keys, network tab for 429/503 errors |

---

## Performance

- **Build time**: ~2 minutes (Rust release mode)
- **Docker image**: ~150MB (Alpine + Rust binary)
- **RSS fetch**: 30-second cycle for ~50 feeds
- **API response**: <50ms (p95) for article list
- **Podcast generation**: 8-15 seconds (first request, cached afterward)
- **Memory usage**: ~100MB idle, ~200MB under load

---

## Why Rust + Vanilla JS?

**Backend (Rust)**:
- Blazing fast, memory-safe
- Single binary deployment (no runtime needed)
- Excellent async support (tokio)
- SQLite integration is rock-solid (rusqlite)

**Frontend (Vanilla JS)**:
- No build step (instant refresh)
- No framework tax (smaller bundle)
- Full control over UX
- Easier to debug and maintain

**Together**: Maximum performance, minimum complexity.

---

## The Lesson

**Check the price before you buy.**

Premium domains can cost thousands. Always verify before clicking "Purchase."

But if you do make a $64.5K mistake? Build something extraordinary to justify it.

---

## Roadmap

### Q1 2026
- [ ] API pricing tiers for news.cloud
- [ ] Pro features for news.online (unlimited podcasts)
- [ ] User accounts and sync across devices
- [ ] Mobile apps (iOS/Android)

### Q2 2026
- [ ] Custom RSS feeds (user-defined sources)
- [ ] AI summarization improvements
- [ ] Webhooks for news.cloud
- [ ] Community features (comments, sharing)

### Q3 2026
- [ ] Open-source portions of codebase
- [ ] Multi-language support (English, Chinese, Spanish)
- [ ] Integration with note-taking apps (Notion, Obsidian)
- [ ] Advanced analytics for news.cloud

---

## Contributing

Currently private. Will open-source selected modules (feed parser, MCP server) soon.

If you want to contribute ideas or report bugs, open an issue or email yuki@hamada.dev.

---

## License

Private - All rights reserved.

---

## Contact

- **Email**: yuki@hamada.dev
- **Twitter/X**: [@yukihamada](https://twitter.com/yukihamada)
- **GitHub**: [@yukihamada](https://github.com/yukihamada)

---

## Acknowledgments

Built with:
- Rust (axum, tokio, rusqlite)
- Claude Sonnet (Anthropic)
- OpenAI TTS
- Fly.io (Tokyo region)
- Premium domains (expensive but worth it 😅)

Special thanks to everyone who told me "check the price first" AFTER I bought the domains.

---

**TL;DR**: Accidentally spent $64.5K on domains. Built 7 AI news sites from one Rust binary to cope. No regrets.
