/**
 * cloud.js — API Platform page for news.cloud
 * Developer documentation, live API demos, and pricing.
 */
'use strict';

const CloudApp = (() => {
  const BASE = '';

  const ENDPOINTS = [
    {
      method: 'GET',
      path: '/api/articles',
      desc: '記事一覧取得（カーソルページネーション対応）',
      tryUrl: '/api/articles?limit=3',
      tryLabel: 'Try it',
    },
    {
      method: 'GET',
      path: '/api/categories',
      desc: 'カテゴリ一覧',
      tryUrl: '/api/categories',
      tryLabel: 'Try it',
    },
    {
      method: 'GET',
      path: '/api/feed',
      desc: 'フィード記事取得',
      tryUrl: '/api/feed?limit=3',
      tryLabel: 'Try it',
    },
    {
      method: 'POST',
      path: '/api/articles/summarize',
      desc: 'AI記事要約',
      tryUrl: '/api/articles/summarize',
      tryBody: { minutes: 60 },
      tryLabel: 'Try it',
    },
    {
      method: 'POST',
      path: '/api/articles/ask',
      desc: 'AI質問応答',
      tryUrl: '/api/articles/ask',
      tryBody: { title: 'AI技術の最新動向', description: 'AIの進化が加速', source: 'news.cloud', question: 'この記事の要点は？' },
      tryLabel: 'Try it',
    },
    {
      method: 'POST',
      path: '/api/podcast/generate',
      desc: 'ポッドキャスト生成',
      tryUrl: '/api/podcast/generate',
      tryBody: { category: 'tech', count: 3 },
      tryLabel: 'Try it',
    },
    {
      method: 'POST',
      path: '/api/tts',
      desc: 'テキスト音声変換',
      tryUrl: '/api/tts',
      tryBody: { text: 'こんにちは、news.cloudです。' },
      tryLabel: 'Try it',
    },
    {
      method: 'POST',
      path: '/mcp',
      desc: 'MCP Server',
      tryUrl: null,
      tryLabel: null,
      isMcp: true,
    },
  ];

  function init() {
    // Hide standard news UI
    hideStandardUI();
    // Force dark mode
    document.body.dataset.mode = 'dark';
    // Build the page
    buildPage();
    // Fetch live stats
    fetchStats();
  }

  function hideStandardUI() {
    const selectors = ['.header', '.main', '#detail-panel', '#detail-overlay', '#chat-panel', '#eco-status'];
    selectors.forEach(sel => {
      const el = sel.startsWith('#') ? document.getElementById(sel.slice(1)) : document.querySelector(sel);
      if (el) el.style.display = 'none';
    });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function buildPage() {
    const container = document.createElement('div');
    container.className = 'cloud-container';

    container.innerHTML = buildNav() + buildHero() + buildFeatures() + buildAPIReference() + buildCodeSample() + buildPricing() + buildFooter();

    document.body.appendChild(container);

    // Attach event listeners for "Try it" buttons
    container.querySelectorAll('[data-endpoint-idx]').forEach(btn => {
      btn.addEventListener('click', () => handleTryIt(btn));
    });

    // Smooth scroll for nav links
    container.querySelectorAll('.cloud-nav-links a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const target = document.getElementById(a.getAttribute('href').slice(1));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function buildNav() {
    return `
      <nav class="cloud-nav">
        <div class="cloud-nav-inner">
          <a href="/" class="cloud-nav-brand">
            news<span class="cloud-nav-dot">.</span>cloud
          </a>
          <ul class="cloud-nav-links">
            <li><a href="#features">機能</a></li>
            <li><a href="#api-reference">API</a></li>
            <li><a href="#pricing">料金</a></li>
            <li><a href="#api-reference" class="cloud-nav-cta">はじめる</a></li>
          </ul>
        </div>
      </nav>`;
  }

  function buildHero() {
    return `
      <section class="cloud-hero">
        <div class="cloud-hero-badge">
          <span class="cloud-hero-badge-dot"></span>
          API v1 公開中
        </div>
        <h1>news.cloud</h1>
        <h2>ニュースAPIプラットフォーム</h2>
        <p class="cloud-hero-desc">
          AIニュースデータをあなたのアプリに。記事検索、AI要約、ポッドキャスト生成、MCP対応。
        </p>
        <div class="cloud-hero-actions">
          <a href="#api-reference" class="cloud-cta-btn primary">APIリファレンス</a>
          <a href="#pricing" class="cloud-cta-btn secondary">料金プラン</a>
        </div>
        <div class="cloud-stats" id="cloud-stats">
          <div class="cloud-stat">
            <div class="cloud-stat-value" id="stat-feeds">--</div>
            <div class="cloud-stat-label">フィード</div>
          </div>
          <div class="cloud-stat">
            <div class="cloud-stat-value" id="stat-categories">--</div>
            <div class="cloud-stat-label">カテゴリ</div>
          </div>
          <div class="cloud-stat">
            <div class="cloud-stat-value" id="stat-status">--</div>
            <div class="cloud-stat-label">ステータス</div>
          </div>
        </div>
      </section>`;
  }

  function buildFeatures() {
    const features = [
      {
        icon: '\u26A1',
        title: 'リアルタイム記事API',
        desc: '146以上のフィードから収集した最新ニュースをREST APIで即座に取得。カーソルページネーション対応。',
      },
      {
        icon: '\uD83E\uDDE0',
        title: 'AI要約 & 質問応答',
        desc: 'Claude Sonnetによる高品質なAI要約と質問応答。記事の内容を即座に把握。',
      },
      {
        icon: '\uD83C\uDFA7',
        title: 'ポッドキャスト生成',
        desc: 'ニュース記事からAI対話型ポッドキャストを自動生成。音声変換APIも利用可能。',
      },
      {
        icon: '\uD83D\uDD17',
        title: 'MCP対応',
        desc: 'Model Context Protocol対応。Claude DesktopやAIエージェントからニュースデータに直接アクセス。',
      },
      {
        icon: '\uD83D\uDEE1\uFE0F',
        title: '高速 & 堅牢',
        desc: 'Rust + axumで構築された高速バックエンド。SQLite WALモードで安定したパフォーマンス。',
      },
      {
        icon: '\uD83C\uDF10',
        title: '日本語ネイティブ',
        desc: '日本語ニュースに特化。7カテゴリのニュースを網羅的にカバー。',
      },
    ];

    let cards = features.map(f => `
      <div class="cloud-feature-card">
        <span class="cloud-feature-icon">${f.icon}</span>
        <div class="cloud-feature-title">${esc(f.title)}</div>
        <div class="cloud-feature-desc">${esc(f.desc)}</div>
      </div>`).join('');

    return `
      <section class="cloud-section" id="features">
        <div class="cloud-section-header">
          <div class="cloud-section-label">Features</div>
          <h2 class="cloud-section-title">開発者のための機能</h2>
          <p class="cloud-section-desc">ニュースデータの取得からAI分析まで、すべてをAPIで提供</p>
        </div>
        <div class="cloud-features">${cards}</div>
      </section>`;
  }

  function buildAPIReference() {
    let cards = ENDPOINTS.map((ep, i) => {
      const methodClass = ep.method.toLowerCase();
      const tryBtn = ep.tryLabel
        ? `<button class="cloud-endpoint-try" data-endpoint-idx="${i}">${esc(ep.tryLabel)}</button>`
        : `<span class="cloud-mcp-badge">MCP</span>`;

      return `
        <div class="cloud-card cloud-animate-in" id="endpoint-card-${i}">
          <div class="cloud-endpoint">
            <span class="cloud-method ${methodClass}">${esc(ep.method)}</span>
            <span class="cloud-endpoint-path">${esc(ep.path)}</span>
            <span class="cloud-endpoint-separator">\u2014</span>
            <span class="cloud-endpoint-desc">${esc(ep.desc)}</span>
            ${tryBtn}
          </div>
          <div class="cloud-response" id="response-${i}"></div>
        </div>`;
    }).join('');

    return `
      <section class="cloud-section" id="api-reference">
        <div class="cloud-section-header">
          <div class="cloud-section-label">API Reference</div>
          <h2 class="cloud-section-title">エンドポイント一覧</h2>
          <p class="cloud-section-desc">ライブデモでAPIレスポンスを確認できます</p>
        </div>
        <div class="cloud-endpoints">${cards}</div>
      </section>`;
  }

  function buildCodeSample() {
    const code = `<span class="key">// ニュース記事を取得</span>
<span class="key">const</span> response = <span class="key">await</span> <span class="string">fetch</span>(<span class="string">'https://news.cloud/api/articles?limit=10'</span>);
<span class="key">const</span> data = <span class="key">await</span> response.<span class="string">json</span>();

console.<span class="string">log</span>(data.articles.<span class="string">length</span>); <span class="null">// 10</span>
console.<span class="string">log</span>(data.next_cursor);     <span class="null">// "eyJsYXN0X2..."</span>

<span class="null">// AI要約</span>
<span class="key">const</span> summary = <span class="key">await</span> <span class="string">fetch</span>(<span class="string">'https://news.cloud/api/articles/summarize'</span>, {
  <span class="key">method</span>: <span class="string">'POST'</span>,
  <span class="key">headers</span>: { <span class="string">'Content-Type'</span>: <span class="string">'application/json'</span> },
  <span class="key">body</span>: JSON.<span class="string">stringify</span>({ <span class="key">minutes</span>: <span class="number">60</span> })
});`;

    return `
      <section class="cloud-section">
        <div class="cloud-section-header">
          <div class="cloud-section-label">Quick Start</div>
          <h2 class="cloud-section-title">数行で始められる</h2>
          <p class="cloud-section-desc">シンプルなREST APIですぐに統合</p>
        </div>
        <div class="cloud-code-sample">
          <div class="cloud-code-sample-header">
            <span class="cloud-code-sample-dot red"></span>
            <span class="cloud-code-sample-dot yellow"></span>
            <span class="cloud-code-sample-dot green"></span>
            <span class="cloud-code-sample-title">app.js</span>
          </div>
          <div class="cloud-code">
            <pre>${code}</pre>
          </div>
        </div>
      </section>`;
  }

  function buildPricing() {
    const plans = [
      {
        name: 'Free',
        price: '\u00A50',
        unit: '',
        desc: '個人プロジェクト・プロトタイプに',
        features: ['100 リクエスト/日', '記事一覧 & カテゴリ API', 'カーソルページネーション', 'コミュニティサポート'],
        btn: { label: '無料ではじめる', class: 'outline' },
        featured: false,
      },
      {
        name: 'Pro',
        price: '$29',
        unit: '/\u6708',
        desc: 'プロダクション利用に',
        features: ['10,000 リクエスト/日', '全API（AI要約・質問応答含む）', 'ポッドキャスト生成', 'MCP Server アクセス', '優先サポート'],
        btn: { label: 'Pro を申し込む', class: 'filled' },
        featured: true,
      },
      {
        name: 'Enterprise',
        price: 'お問い合わせ',
        unit: '',
        desc: '大規模利用・カスタマイズ',
        features: ['無制限リクエスト', '専用インスタンス', 'カスタムフィード追加', 'SLA 99.9%', '専任サポート'],
        btn: { label: 'お問い合わせ', class: 'outline' },
        featured: false,
      },
    ];

    let cards = plans.map(p => {
      const featList = p.features.map(f => `<li>${esc(f)}</li>`).join('');
      const featuredClass = p.featured ? ' featured' : '';
      return `
        <div class="cloud-pricing-card${featuredClass}">
          <div class="cloud-pricing-name">${esc(p.name)}</div>
          <div class="cloud-pricing-price">${esc(p.price)}<span class="unit">${esc(p.unit)}</span></div>
          <div class="cloud-pricing-desc">${esc(p.desc)}</div>
          <ul class="cloud-pricing-features">${featList}</ul>
          <button class="cloud-pricing-btn ${p.btn.class}">${esc(p.btn.label)}</button>
        </div>`;
    }).join('');

    return `
      <section class="cloud-section" id="pricing">
        <div class="cloud-section-header">
          <div class="cloud-section-label">Pricing</div>
          <h2 class="cloud-section-title">シンプルな料金体系</h2>
          <p class="cloud-section-desc">必要な分だけ、スケーラブルに</p>
        </div>
        <div class="cloud-pricing">${cards}</div>
      </section>`;
  }

  function buildFooter() {
    return `
      <footer class="cloud-footer">
        <div class="cloud-footer-inner">
          <div class="cloud-footer-brand">news.cloud</div>
          <ul class="cloud-footer-links">
            <li><a href="#api-reference">API Docs</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="https://news.xyz/" target="_blank" rel="noopener">news.xyz</a></li>
            <li><a href="https://news.online/" target="_blank" rel="noopener">news.online</a></li>
          </ul>
          <div class="cloud-footer-tech">
            <span class="cloud-footer-tech-badge">Built with Rust + axum</span>
            <span class="cloud-footer-tech-badge">Powered by Claude Sonnet</span>
          </div>
        </div>
      </footer>`;
  }

  // --- Live Stats ---

  async function fetchStats() {
    const statFeeds = document.getElementById('stat-feeds');
    const statCategories = document.getElementById('stat-categories');
    const statStatus = document.getElementById('stat-status');

    // Fetch health and categories in parallel
    const [healthResult, categoriesResult] = await Promise.allSettled([
      fetch(BASE + '/health').then(r => r.json()),
      fetch(BASE + '/api/categories').then(r => r.json()),
    ]);

    // Health / feeds count
    if (healthResult.status === 'fulfilled') {
      const h = healthResult.value;
      const feedCount = h.feeds_count || h.feed_count || 146;
      statFeeds.textContent = feedCount + '+';
      statStatus.textContent = '\u2705 \u7A3C\u50CD\u4E2D';
    } else {
      statFeeds.textContent = '146+';
      statStatus.textContent = '\u26A0\uFE0F \u78BA\u8A8D\u4E2D';
    }

    // Categories
    if (categoriesResult.status === 'fulfilled') {
      const cats = categoriesResult.value;
      statCategories.textContent = (Array.isArray(cats) ? cats.length : 7) + ' \u30AB\u30C6\u30B4\u30EA';
    } else {
      statCategories.textContent = '7 \u30AB\u30C6\u30B4\u30EA';
    }
  }

  // --- Try It ---

  async function handleTryIt(btn) {
    const idx = parseInt(btn.dataset.endpointIdx, 10);
    const ep = ENDPOINTS[idx];
    if (!ep || !ep.tryUrl) return;

    const responseEl = document.getElementById('response-' + idx);
    if (!responseEl) return;

    // Toggle: if already open, close it
    if (responseEl.classList.contains('open')) {
      responseEl.classList.remove('open');
      setTimeout(() => { responseEl.innerHTML = ''; }, 350);
      return;
    }

    // Show loading
    btn.classList.add('loading');
    btn.textContent = '\u8AAD\u307F\u8FBC\u307F\u4E2D...';

    const start = performance.now();

    try {
      const opts = {};
      if (ep.method === 'POST') {
        opts.method = 'POST';
        opts.headers = { 'Content-Type': 'application/json' };
        if (ep.tryBody) opts.body = JSON.stringify(ep.tryBody);
      }

      const res = await fetch(BASE + ep.tryUrl, opts);
      const elapsed = Math.round(performance.now() - start);
      const status = res.status;
      const statusOk = status >= 200 && status < 400;

      let json;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        json = text.slice(0, 2000);
      }

      renderResponse(responseEl, {
        status: status,
        ok: statusOk,
        elapsed: elapsed,
        data: json,
      });
    } catch (err) {
      renderResponse(responseEl, {
        status: 0,
        ok: false,
        elapsed: Math.round(performance.now() - start),
        data: { error: err.message },
      });
    } finally {
      btn.classList.remove('loading');
      btn.textContent = ep.tryLabel;
    }
  }

  function renderResponse(el, res) {
    const statusClass = res.ok ? 'ok' : 'error';
    const statusText = res.ok ? res.status + ' OK' : (res.status || 'Error');
    const jsonStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
    const highlighted = highlightJSON(jsonStr);

    el.innerHTML = `
      <div class="cloud-response-header">
        <span class="cloud-response-status ${statusClass}">${esc(String(statusText))}</span>
        <span class="cloud-response-time">${res.elapsed}ms</span>
      </div>
      <div class="cloud-code">
        <pre>${highlighted}</pre>
      </div>`;

    // Trigger open animation
    requestAnimationFrame(() => {
      el.classList.add('open');
    });
  }

  function highlightJSON(str) {
    // Limit display length
    if (str.length > 8000) {
      str = str.slice(0, 8000) + '\n\n... (truncated)';
    }

    // Simple JSON syntax highlighter
    return str.replace(
      /("(?:\\.|[^"\\])*")\s*:/g,
      '<span class="key">$1</span>:'
    ).replace(
      /:\s*("(?:\\.|[^"\\])*")/g,
      ': <span class="string">$1</span>'
    ).replace(
      /:\s*(\d+(?:\.\d+)?)/g,
      ': <span class="number">$1</span>'
    ).replace(
      /:\s*(true|false)/g,
      ': <span class="bool">$1</span>'
    ).replace(
      /:\s*(null)/g,
      ': <span class="null">$1</span>'
    ).replace(
      /([[\]{}])/g,
      '<span class="bracket">$1</span>'
    );
  }

  return { init };
})();
