# news.xyz AI Assistant - 完全ガイド

## 概要

news.xyzに統合されたAIアシスタント機能。記事を読みながらインタラクティブに質問でき、AIが音声で回答します。

## 実装内容

### ✅ 実装済み機能

1. **4つの会話モード**
   - 📺 **キャスター** - プロのニュースキャスタースタイル。客観的で正確な情報提供
   - 💬 **友達** - カジュアルでフレンドリーな雑談スタイル
   - 🎓 **学者** - 学術的で詳細な分析。データや歴史的背景を含む
   - 🎭 **エンタメ** - 面白おかしく、ユーモアを交えた解説

2. **質問サジェスト**
   - Claude APIが記事に基づいて4つの質問を自動生成
   - キャッシュ機構（6時間TTL）で高速レスポンス

3. **インタラクティブサイクル**
   - サジェストをタップ → AI回答生成 → 音声読み上げ → 次のサジェスト自動生成
   - 会話履歴を3ターンまで保持（文脈を維持）

4. **音声読み上げ**
   - 既存のTts.jsモジュールと統合
   - ElevenLabs / OpenAI TTS対応
   - モード別の音声設定に対応

5. **レスポンシブUI**
   - news.xyzのカード型デザインに自然に統合
   - ダークモード対応
   - モバイル最適化（2列グリッドレイアウト）

## ファイル構成

```
hypernews/
├── frontend/
│   ├── js/
│   │   └── assistant.js        # AIアシスタントのメインロジック (13.6KB)
│   ├── css/
│   │   └── assistant.css       # スタイルシート (8KB+)
│   └── index.html              # CSS/JS読み込み追加済み
└── backend/
    └── crates/news-server/src/
        ├── routes.rs           # /api/articles/questions, /api/articles/ask
        └── claude.rs           # Claude APIプロンプト設計
```

## 使い方

### 1. バックエンド起動

```bash
cd /Users/yuki/workspace/media/hypernews/backend
cargo run --bin news-server
```

### 2. ブラウザでアクセス

http://localhost:8080 にアクセス

### 3. 基本的な操作

1. 各記事カードの下部に4つのモードボタンが表示されます
2. モードを選択（デフォルトは📺キャスター）
3. 4つの質問サジェストが表示されます
4. サジェストをクリック → AI回答が生成され、音声で読み上げられます
5. 回答後、新しい質問サジェストが自動生成されます

### 4. モード切り替え

- **キャスターモード** - 客観的で正確な情報
- **友達モード** - カジュアルで親しみやすい
- **学者モード** - 詳細で学術的な分析
- **エンタメモード** - ユーモアを交えた楽しい解説

回答生成中や音声再生中はモード切り替えができません。

## ElevenLabs音声設定

### 濱田優貴さんの声の設定方法

ブラウザのDevToolsコンソール（F12）で以下を実行：

```javascript
// 1. 利用可能な音声リストを確認
Tts.getVoices().forEach(v => console.log(v.id, v.label));

// 2. 濱田優貴さんのクローン音声を探す（category: "cloned"）
// 例: clone:abc123 や el:xyz789

// 3. 各モードに音声を割り当て
Assistant.setModeVoice('caster', 'clone:abc123');      // キャスター用
Assistant.setModeVoice('friend', 'clone:def456');      // 友達用
Assistant.setModeVoice('scholar', 'clone:ghi789');     // 学者用
Assistant.setModeVoice('entertainer', 'clone:jkl012'); // エンタメ用

// 4. 設定を確認
Assistant.listModeVoices();

// 5. デフォルトに戻す
Assistant.setModeVoice('caster', 'default');
```

### 音声プリセット例

```javascript
// 落ち着いた声 → キャスター
Assistant.setModeVoice('caster', 'el:hamada_calm');

// 明るい声 → 友達
Assistant.setModeVoice('friend', 'el:hamada_friendly');

// 厳格な声 → 学者
Assistant.setModeVoice('scholar', 'el:hamada_serious');

// 元気な声 → エンタメ
Assistant.setModeVoice('entertainer', 'el:hamada_energetic');
```

## デバッグ

### コンソールログ確認

```javascript
// モジュールが正しくロードされているか確認
console.log('Assistant:', typeof Assistant);
console.log('Tts:', typeof Tts);

// 現在の音声設定を確認
Assistant.listModeVoices();
```

### よくあるエラー

**「回答の生成に失敗しました」**
- APIキーが設定されているか確認
- ネットワークタブでAPIレスポンスを確認
- 429エラー → レート制限超過
- 503エラー → APIキー未設定

**音声が再生されない**
- Tts設定を確認: `Tts.getStyle()`
- ブラウザの音声設定を確認
- ElevenLabs APIキーが設定されているか確認

**モード切り替えができない**
- 回答生成中や音声再生中は切り替え不可
- 待ってから再試行

## パフォーマンス

- **API呼び出し**: キャッシュ機構（6時間TTL）で高速化
- **多重クリック防止**: `isGenerating`フラグで制御
- **音声キャッシュ**: Tts.jsのCache APIで同じ回答は再生成しない
- **状態分離**: 記事ごとに独立した状態管理（Map）

## 今後の拡張案

1. **設定UI** - モード別音声を設定画面から変更可能に
2. **会話履歴エクスポート** - Q&Aセッションを保存・共有
3. **カスタムモード** - ユーザーが独自のスタイルを作成
4. **音声速度調整** - モード別に再生速度を設定
5. **マルチ言語対応** - 英語・中国語など他言語のニュースにも対応

## ライセンス

濱田優貴さんのElevenLabs音声は自由に使用可能です。
