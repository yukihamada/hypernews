# HyperNews — AI ニュースポッドキャストプラットフォーム

Rust + Vanilla JS で構築した AI ニュースアグリゲーター。同一バイナリ・同一 Docker イメージで **2 つのサイトを本番運用中**:

| サイト | URL | 内容 |
|--------|-----|------|
| **news.xyz** | https://news.xyz | カード型ニュースサイト (3テーマ、チャット、TTS) |
| **news.online** | https://news.online | TikTok風 縦スワイプ AI音声ニュース (Apple Liquid Glass デザイン) |

> **余談**: いいサービスを思いついて勢いでドメインを取得したら、news.online が 453万円、news.xyz が 181万円、その他合わせて総額 **845万円** の請求が来た。まさかそんな値段だとは思わなかったが、後悔はしていない。

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│                   Fly.io (Tokyo nrt)             │
│  ┌────────────────────────────────────────────┐  │
│  │           news-server (単一バイナリ)         │  │
│  │  axum 0.7 HTTP ─┬─ /api/*  (REST API)     │  │
│  │                  ├─ /mcp    (MCP Server)   │  │
│  │                  └─ /*      (静的ファイル)   │  │
│  │  SQLite (WAL) ── /data/news.db             │  │
│  │  Background ──── RSS Fetcher (30分毎)       │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  news.xyz (fly.toml)   news.online (fly.online.toml) │
│  └─ カード型 UI          └─ 縦スワイプ + AI音声   │
└─────────────────────────────────────────────────┘
```

**ドメイン判別**: フロントエンドの `location.hostname` で `online` / `claud` / `xyz` を判定し、`data-site` 属性でUIを切り替え。バックエンドは共通。

---

## プロジェクト構成

```
hypernews/
├── backend/
│   ├── Cargo.toml              # ワークスペース定義
│   ├── feeds.toml              # RSSフィード設定 ★ フィード追加はここ
│   ├── crates/
│   │   ├── news-server/        # メインサーバー (Fly.io用)
│   │   │   └── src/
│   │   │       ├── main.rs     # エントリポイント、ルーター定義
│   │   │       ├── routes.rs   # 全APIハンドラー
│   │   │       ├── db.rs       # SQLiteストア
│   │   │       ├── fetcher.rs  # バックグラウンドRSSフェッチャー
│   │   │       ├── claude.rs   # Claude API (対話スクリプト生成)
│   │   │       ├── mcp.rs      # MCP Server
│   │   │       └── stripe.rs   # Stripe決済
│   │   ├── news-core/          # 共有ライブラリ (モデル、フィード解析、設定)
│   │   ├── news-api/           # AWS Lambda API (レガシー)
│   │   ├── news-fetcher/       # AWS Lambda Fetcher (レガシー)
│   │   └── news-admin/         # AWS Lambda Admin (レガシー)
│   └── infra/                  # AWS SAM テンプレート (レガシー)
│
├── frontend/
│   ├── index.html              # メインHTML (ドメイン判別ロジック含む)
│   ├── css/
│   │   ├── base.css            # 共通スタイル
│   │   ├── feed.css            # ★ news.online用 (Apple Liquid Glass)
│   │   ├── theme-card.css      # news.xyz カードテーマ
│   │   ├── theme-hacker.css    # news.xyz ハッカーテーマ
│   │   ├── theme-lite.css      # news.xyz ライトテーマ
│   │   └── site-claud.css      # claud テーマ
│   ├── js/
│   │   ├── app.js              # アプリ初期化 (online → FeedApp に分岐)
│   │   ├── feed.js             # ★ 縦スワイプフィードコントローラー
│   │   ├── feed-player.js      # ★ ポッドキャスト再生モジュール
│   │   ├── feed-voice.js       # ★ 音声認識コマンド
│   │   ├── site.js             # サイトブランディング設定
│   │   ├── api.js              # API クライアント
│   │   ├── renderer.js         # 記事レンダリング
│   │   ├── chat.js             # チャットUI
│   │   ├── settings.js         # 設定画面
│   │   ├── subscription.js     # サブスクリプション
│   │   ├── storage.js          # LocalStorage ヘルパー
│   │   ├── theme.js            # テーマ切替
│   │   ├── tts.js              # TTS クライアント
│   │   └── sw-register.js      # Service Worker 登録
│   ├── sw.js                   # Service Worker
│   ├── manifest.json           # PWA (news.xyz)
│   ├── manifest-online.json    # PWA (news.online)
│   └── manifest-claud.json     # PWA (claud)
│
├── Dockerfile                  # マルチステージビルド
├── fly.toml                    # Fly.io設定 (news.xyz)
├── fly.online.toml             # Fly.io設定 (news.online)
└── deploy-fly.sh               # デプロイスクリプト
```

---

## ローカル開発

### 必要なもの

- **Rust 1.75+** (stable)
- **SQLite 3** (rusqlite の bundled feature で同梱済み)

### 手順

```bash
# 1. クローン
git clone https://github.com/yukihamada/hypernews.git
cd hypernews

# 2. 環境変数を設定
export DATABASE_PATH=./news.db
export STATIC_DIR=../frontend
export PORT=8080

# AI機能を使う場合 (任意)
export ANTHROPIC_API_KEY=sk-ant-...   # Claude (対話生成・チャット)
export OPENAI_API_KEY=sk-...          # OpenAI TTS (ポッドキャスト音声)

# 3. ビルド＆起動
cd backend
cargo run -p news-server

# 4. ブラウザで開く
open http://localhost:8080
```

### news.online モードで確認する方法

ローカルでは hostname が `localhost` なので、DevTools のコンソールで以下を実行:

```javascript
document.documentElement.dataset.site = 'online';
location.reload();
```

または Chrome DevTools → Settings → Devices で `news.online` を `localhost:8080` にマッピング。

---

## よくある変更

### RSSフィードを追加・変更する

`backend/feeds.toml` を編集。形式:

```toml
[[feeds]]
url = "https://example.com/rss"
category = "tech"           # general / tech / business / entertainment / sports / science / podcast
source = "Example News"
language = "ja"             # ja / en
```

変更後、サーバーを再起動すると次のフェッチサイクル（30分毎）で反映。

### カテゴリを追加する

1. `backend/feeds.toml` に新カテゴリのフィードを追加
2. `frontend/js/feed.js` の `loadCategories()` フォールバック配列にカテゴリを追加
3. `frontend/css/feed.css` に `--feed-gradient` を追加 (画像なし記事のグラデーション)

### フィードUIのデザインを変更する

- `frontend/css/feed.css` — Apple Liquid Glass デザイン。カラートークンは `:root` で定義
- `frontend/js/feed.js` — フィードの動作制御 (スクロール、キーボード、設定シート)
- `frontend/js/feed-player.js` — ポッドキャスト再生 (セグメント順次再生)

### ポッドキャスト生成の仕組み

1. ユーザーが再生ボタンをタップ
2. `POST /api/podcast/generate` にリクエスト
3. バックエンド: Claude Sonnet で2人対話スクリプト(8-12行)を生成
4. 各行を OpenAI TTS (host=`coral`, analyst=`echo`) で音声化
5. `audio_segments` (base64 MP3) をレスポンスで返却
6. フロントエンド: セグメントを順次再生、話者ハイライト＆字幕同期

コスト: 約 $0.007/記事 (Claude $0.003 + TTS $0.004)。キャッシュ(6h TTL)で同一記事は1回のみ生成。

---

## API エンドポイント一覧

### パブリック

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/articles` | 記事一覧 (カーソルページネーション) |
| `GET` | `/api/categories` | カテゴリ一覧 |
| `GET` | `/api/feed` | フィード用記事一覧 (limit=10) |
| `POST` | `/api/podcast/generate` | ポッドキャスト生成 |
| `POST` | `/api/tts` | TTS音声生成 |
| `GET` | `/api/tts/voices` | TTS声一覧 |
| `POST` | `/api/articles/summarize` | 記事要約 |
| `POST` | `/api/articles/ask` | 記事Q&A |
| `GET` | `/api/usage` | 使用量確認 |
| `GET` | `/health` | ヘルスチェック |
| `POST` | `/mcp` | MCP Server |

### 管理者 (`x-admin-secret` ヘッダー必要)

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/admin/feeds` | フィード管理 |
| `POST` | `/api/admin/feeds` | フィード追加 |
| `PUT` | `/api/admin/feeds/:id` | フィード更新 |
| `DELETE` | `/api/admin/feeds/:id` | フィード削除 |
| `POST` | `/api/admin/command` | 自然言語コマンド実行 |

---

## 環境変数

| 変数 | 必須 | 説明 | デフォルト |
|------|------|------|-----------|
| `DATABASE_PATH` | - | SQLite ファイルパス | `/data/news.db` |
| `STATIC_DIR` | - | フロントエンドディレクトリ | `/app/public` |
| `PORT` | - | ポート | `8080` |
| `ANTHROPIC_API_KEY` | △ | Claude API キー (AI機能用) | - |
| `OPENAI_API_KEY` | △ | OpenAI TTS (ポッドキャスト音声) | - |
| `ELEVENLABS_API_KEY` | - | ElevenLabs TTS | - |
| `CARTESIA_API_KEY` | - | Cartesia TTS | - |
| `STRIPE_SECRET_KEY` | - | Stripe 決済 | - |
| `STRIPE_WEBHOOK_SECRET` | - | Stripe Webhook 検証 | - |
| `STRIPE_PRICE_ID` | - | Stripe サブスク価格 | - |
| `ADMIN_SECRET` | - | 管理API認証 (空=オープン) | - |
| `BASE_URL` | - | 公開URL | `https://news.xyz` |

**△** = AI機能を使う場合に必要。なくてもサーバー自体は起動し、ニュース配信は動作する。

---

## デプロイ (Fly.io)

### 前提

```bash
# Fly CLI インストール
brew install flyctl
fly auth login
```

### デプロイ手順

```bash
# news.xyz をデプロイ
fly deploy -c fly.toml

# news.online をデプロイ (同じDockerイメージ)
fly deploy -c fly.online.toml
```

### シークレット設定

```bash
# news.xyz
fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a news-xyz
fly secrets set OPENAI_API_KEY=sk-... -a news-xyz

# news.online
fly secrets set ANTHROPIC_API_KEY=sk-ant-... -a news-online
fly secrets set OPENAI_API_KEY=sk-... -a news-online
```

### Fly.io 構成

- **リージョン**: `nrt` (東京)
- **マシン**: `shared-cpu-1x`, 512MB RAM
- **ボリューム**: `/data` に SQLite DB (WAL モード)
- **自動停止**: OFF (バックグラウンドフェッチャーが常時稼働)

---

## Docker

```bash
# ビルド
docker build -t hypernews .

# 起動
docker run -p 8080:8080 \
  -v hypernews-data:/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e OPENAI_API_KEY=sk-... \
  hypernews
```

---

## 技術詳細

### Rust クレート構成

| クレート | 説明 |
|---------|------|
| `news-server` | メインサーバー: axum + SQLite + fetcher + Claude + MCP |
| `news-core` | 共有: モデル、フィード解析、設定、重複検知、OGP取得 |
| `news-api` | AWS Lambda API (レガシー、DynamoDB) |
| `news-fetcher` | AWS Lambda Fetcher (レガシー) |
| `news-admin` | AWS Lambda Admin (レガシー) |

`news-core` は `dynamo` feature gate があり、`news-server` は `default-features = false` で DynamoDB 依存を除外。

### 主要な依存バージョン

- axum `0.7.9`, reqwest `0.12`, feed-rs `2`, rusqlite `0.33` (bundled)
- **注意**: axum 0.7 のパスパラメータは `:param` 形式 (`{param}` は 0.8+)

### フロントエンド構成

- フレームワークなし、Vanilla JS + CSS
- 各 `.js` は IIFE パターンでグローバル名前空間にモジュール公開 (`const FeedApp = (() => { ... })()`)
- `data-site` 属性で `online` のとき feed.css/feed.js/feed-player.js/feed-voice.js を条件読み込み

### news.online の音声機能

- **ポッドキャスト**: Claude Sonnet で2人対話生成 → OpenAI TTS (`gpt-4o-mini-tts`) で音声化
- **タイトル読み上げ**: ブラウザ内蔵 `SpeechSynthesis` API で記事タイトルを自動読み上げ
- **音声コマンド**: `SpeechRecognition` API で「次」「再生」「テクノロジー」等の日本語コマンド認識

---

## トラブルシューティング

| 問題 | 対処 |
|------|------|
| `cargo build` でリンクエラー | `rustup default stable` で stable ツールチェインを確認 |
| ポッドキャスト生成されない | `ANTHROPIC_API_KEY` と `OPENAI_API_KEY` を確認 |
| RSS が取得されない | `feeds.toml` の URL が正しいか確認。起動後30分待つ |
| news.online の UI が出ない | hostname に `online` が含まれているか確認 (DevTools で `data-site` を確認) |
| SQLite locked | 同時に複数プロセスがDBにアクセスしていないか確認 |

---

## ライセンス

Private — All rights reserved.
