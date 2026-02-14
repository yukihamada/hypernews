/**
 * cloud.js — API Platform page for news.cloud
 * Developer documentation, live API demos, and pricing.
 * English-first bilingual (EN/JA).
 */
'use strict';

const CloudApp = (() => {
  const BASE = '';

  // Detect language
  let lang = (localStorage.getItem('hn_lang') || navigator.language || 'en').slice(0, 2);
  if (lang !== 'ja') lang = 'en';

  const i18n = {
    en: {
      navFeatures: 'Features',
      navApi: 'API',
      navPricing: 'Pricing',
      navCta: 'Get Started',
      heroBadge: 'API v1 Live',
      heroSubtitle: 'News API Platform',
      heroDesc: 'Integrate AI-powered news data into your app. Article search, AI summaries, podcast generation, and MCP support.',
      ctaApi: 'API Reference',
      ctaPricing: 'Pricing Plans',
      statFeeds: 'Feeds',
      statCategories: 'Categories',
      statStatus: 'Status',
      statusLive: 'Live',
      statusChecking: 'Checking',
      featuresLabel: 'Features',
      featuresTitle: 'Built for Developers',
      featuresDesc: 'Everything from news data retrieval to AI analysis, delivered via API',
      features: [
        { icon: '\u26A1', title: 'Real-time Article API', desc: 'Fetch the latest news from 146+ feeds instantly via REST API. Cursor-based pagination.' },
        { icon: '\uD83E\uDDE0', title: 'AI Summary & Q&A', desc: 'High-quality AI summaries and Q&A powered by Claude Sonnet. Understand articles instantly.' },
        { icon: '\uD83C\uDFA7', title: 'Podcast Generation', desc: 'Auto-generate AI dialogue podcasts from news articles. TTS API also available.' },
        { icon: '\uD83D\uDD17', title: 'MCP Support', desc: 'Model Context Protocol compatible. Access news data directly from Claude Desktop and AI agents.' },
        { icon: '\uD83D\uDEE1\uFE0F', title: 'Fast & Robust', desc: 'High-performance backend built with Rust + axum. Stable performance with SQLite WAL mode.' },
        { icon: '\uD83C\uDF10', title: 'Global Coverage', desc: '7 categories of news from 146+ international and Japanese sources.' },
      ],
      apiLabel: 'API Reference',
      apiTitle: 'Endpoints',
      apiDesc: 'Try live API responses with the demo buttons',
      endpoints: [
        { desc: 'Get articles (cursor pagination)' },
        { desc: 'List categories' },
        { desc: 'Get feed articles' },
        { desc: 'AI article summary' },
        { desc: 'AI Q&A' },
        { desc: 'Generate podcast' },
        { desc: 'Text-to-speech' },
        { desc: 'MCP Server' },
      ],
      tryIt: 'Try it',
      loading: 'Loading...',
      codeLabel: 'Quick Start',
      codeTitle: 'Get started in a few lines',
      codeDesc: 'Simple REST API for instant integration',
      codeCommentFetch: '// Fetch news articles',
      codeCommentSummary: '// AI Summary',
      pricingLabel: 'Pricing',
      pricingTitle: 'Simple Pricing',
      pricingDesc: 'Pay for what you need, scale as you grow',
      plans: [
        {
          name: 'Free',
          price: '$0',
          unit: '',
          desc: 'For personal projects & prototyping',
          features: ['100 requests/day', 'Articles & Categories API', 'Cursor pagination', 'Community support'],
          btn: 'Get Started Free',
          btnClass: 'outline',
        },
        {
          name: 'Pro',
          price: '$29',
          unit: '/mo',
          desc: 'For production use',
          features: ['10,000 requests/day', 'All APIs (AI summary, Q&A)', 'Podcast generation', 'MCP Server access', 'Priority support'],
          btn: 'Subscribe to Pro',
          btnClass: 'filled',
          featured: true,
        },
        {
          name: 'Enterprise',
          price: 'Contact us',
          unit: '',
          desc: 'For large-scale & custom needs',
          features: ['Unlimited requests', 'Dedicated instance', 'Custom feed sources', 'SLA 99.9%', 'Dedicated support'],
          btn: 'Contact Us',
          btnClass: 'outline',
        },
      ],
    },
    ja: {
      navFeatures: '\u6A5F\u80FD',
      navApi: 'API',
      navPricing: '\u6599\u91D1',
      navCta: '\u306F\u3058\u3081\u308B',
      heroBadge: 'API v1 \u516C\u958B\u4E2D',
      heroSubtitle: '\u30CB\u30E5\u30FC\u30B9API\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0',
      heroDesc: 'AI\u30CB\u30E5\u30FC\u30B9\u30C7\u30FC\u30BF\u3092\u3042\u306A\u305F\u306E\u30A2\u30D7\u30EA\u306B\u3002\u8A18\u4E8B\u691C\u7D22\u3001AI\u8981\u7D04\u3001\u30DD\u30C3\u30C9\u30AD\u30E3\u30B9\u30C8\u751F\u6210\u3001MCP\u5BFE\u5FDC\u3002',
      ctaApi: 'API\u30EA\u30D5\u30A1\u30EC\u30F3\u30B9',
      ctaPricing: '\u6599\u91D1\u30D7\u30E9\u30F3',
      statFeeds: '\u30D5\u30A3\u30FC\u30C9',
      statCategories: '\u30AB\u30C6\u30B4\u30EA',
      statStatus: '\u30B9\u30C6\u30FC\u30BF\u30B9',
      statusLive: '\u7A3C\u50CD\u4E2D',
      statusChecking: '\u78BA\u8A8D\u4E2D',
      featuresLabel: 'Features',
      featuresTitle: '\u958B\u767A\u8005\u306E\u305F\u3081\u306E\u6A5F\u80FD',
      featuresDesc: '\u30CB\u30E5\u30FC\u30B9\u30C7\u30FC\u30BF\u306E\u53D6\u5F97\u304B\u3089AI\u5206\u6790\u307E\u3067\u3001\u3059\u3079\u3066\u3092API\u3067\u63D0\u4F9B',
      features: [
        { icon: '\u26A1', title: '\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u8A18\u4E8BAPI', desc: '146\u4EE5\u4E0A\u306E\u30D5\u30A3\u30FC\u30C9\u304B\u3089\u53CE\u96C6\u3057\u305F\u6700\u65B0\u30CB\u30E5\u30FC\u30B9\u3092REST API\u3067\u5373\u5EA7\u306B\u53D6\u5F97\u3002\u30AB\u30FC\u30BD\u30EB\u30DA\u30FC\u30B8\u30CD\u30FC\u30B7\u30E7\u30F3\u5BFE\u5FDC\u3002' },
        { icon: '\uD83E\uDDE0', title: 'AI\u8981\u7D04 & \u8CEA\u554F\u5FDC\u7B54', desc: 'Claude Sonnet\u306B\u3088\u308B\u9AD8\u54C1\u8CEA\u306AAI\u8981\u7D04\u3068\u8CEA\u554F\u5FDC\u7B54\u3002\u8A18\u4E8B\u306E\u5185\u5BB9\u3092\u5373\u5EA7\u306B\u628A\u63E1\u3002' },
        { icon: '\uD83C\uDFA7', title: '\u30DD\u30C3\u30C9\u30AD\u30E3\u30B9\u30C8\u751F\u6210', desc: '\u30CB\u30E5\u30FC\u30B9\u8A18\u4E8B\u304B\u3089AI\u5BFE\u8A71\u578B\u30DD\u30C3\u30C9\u30AD\u30E3\u30B9\u30C8\u3092\u81EA\u52D5\u751F\u6210\u3002\u97F3\u58F0\u5909\u63DBAPI\u3082\u5229\u7528\u53EF\u80FD\u3002' },
        { icon: '\uD83D\uDD17', title: 'MCP\u5BFE\u5FDC', desc: 'Model Context Protocol\u5BFE\u5FDC\u3002Claude Desktop\u3084AI\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u304B\u3089\u30CB\u30E5\u30FC\u30B9\u30C7\u30FC\u30BF\u306B\u76F4\u63A5\u30A2\u30AF\u30BB\u30B9\u3002' },
        { icon: '\uD83D\uDEE1\uFE0F', title: '\u9AD8\u901F & \u5805\u7262', desc: 'Rust + axum\u3067\u69CB\u7BC9\u3055\u308C\u305F\u9AD8\u901F\u30D0\u30C3\u30AF\u30A8\u30F3\u30C9\u3002SQLite WAL\u30E2\u30FC\u30C9\u3067\u5B89\u5B9A\u3057\u305F\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u3002' },
        { icon: '\uD83C\uDF10', title: '\u30B0\u30ED\u30FC\u30D0\u30EB\u30AB\u30D0\u30EC\u30C3\u30B8', desc: '7\u30AB\u30C6\u30B4\u30EA\u306E\u30CB\u30E5\u30FC\u30B9\u3092146\u4EE5\u4E0A\u306E\u56FD\u969B\u30FB\u65E5\u672C\u306E\u30BD\u30FC\u30B9\u304B\u3089\u7DB2\u7F85\u7684\u306B\u30AB\u30D0\u30FC\u3002' },
      ],
      apiLabel: 'API Reference',
      apiTitle: '\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u4E00\u89A7',
      apiDesc: '\u30E9\u30A4\u30D6\u30C7\u30E2\u3067API\u30EC\u30B9\u30DD\u30F3\u30B9\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059',
      endpoints: [
        { desc: '\u8A18\u4E8B\u4E00\u89A7\u53D6\u5F97\uFF08\u30AB\u30FC\u30BD\u30EB\u30DA\u30FC\u30B8\u30CD\u30FC\u30B7\u30E7\u30F3\u5BFE\u5FDC\uFF09' },
        { desc: '\u30AB\u30C6\u30B4\u30EA\u4E00\u89A7' },
        { desc: '\u30D5\u30A3\u30FC\u30C9\u8A18\u4E8B\u53D6\u5F97' },
        { desc: 'AI\u8A18\u4E8B\u8981\u7D04' },
        { desc: 'AI\u8CEA\u554F\u5FDC\u7B54' },
        { desc: '\u30DD\u30C3\u30C9\u30AD\u30E3\u30B9\u30C8\u751F\u6210' },
        { desc: '\u30C6\u30AD\u30B9\u30C8\u97F3\u58F0\u5909\u63DB' },
        { desc: 'MCP Server' },
      ],
      tryIt: 'Try it',
      loading: '\u8AAD\u307F\u8FBC\u307F\u4E2D...',
      codeLabel: 'Quick Start',
      codeTitle: '\u6570\u884C\u3067\u59CB\u3081\u3089\u308C\u308B',
      codeDesc: '\u30B7\u30F3\u30D7\u30EB\u306AREST API\u3067\u3059\u3050\u306B\u7D71\u5408',
      codeCommentFetch: '// Fetch news articles',
      codeCommentSummary: '// AI Summary',
      pricingLabel: 'Pricing',
      pricingTitle: '\u30B7\u30F3\u30D7\u30EB\u306A\u6599\u91D1\u4F53\u7CFB',
      pricingDesc: '\u5FC5\u8981\u306A\u5206\u3060\u3051\u3001\u30B9\u30B1\u30FC\u30E9\u30D6\u30EB\u306B',
      plans: [
        {
          name: 'Free',
          price: '\u00A50',
          unit: '',
          desc: '\u500B\u4EBA\u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u30FB\u30D7\u30ED\u30C8\u30BF\u30A4\u30D7\u306B',
          features: ['100 \u30EA\u30AF\u30A8\u30B9\u30C8/\u65E5', '\u8A18\u4E8B\u4E00\u89A7 & \u30AB\u30C6\u30B4\u30EA API', '\u30AB\u30FC\u30BD\u30EB\u30DA\u30FC\u30B8\u30CD\u30FC\u30B7\u30E7\u30F3', '\u30B3\u30DF\u30E5\u30CB\u30C6\u30A3\u30B5\u30DD\u30FC\u30C8'],
          btn: '\u7121\u6599\u3067\u306F\u3058\u3081\u308B',
          btnClass: 'outline',
        },
        {
          name: 'Pro',
          price: '$29',
          unit: '/\u6708',
          desc: '\u30D7\u30ED\u30C0\u30AF\u30B7\u30E7\u30F3\u5229\u7528\u306B',
          features: ['10,000 \u30EA\u30AF\u30A8\u30B9\u30C8/\u65E5', '\u5168API\uFF08AI\u8981\u7D04\u30FB\u8CEA\u554F\u5FDC\u7B54\u542B\u3080\uFF09', '\u30DD\u30C3\u30C9\u30AD\u30E3\u30B9\u30C8\u751F\u6210', 'MCP Server \u30A2\u30AF\u30BB\u30B9', '\u512A\u5148\u30B5\u30DD\u30FC\u30C8'],
          btn: 'Pro \u3092\u7533\u3057\u8FBC\u3080',
          btnClass: 'filled',
          featured: true,
        },
        {
          name: 'Enterprise',
          price: '\u304A\u554F\u3044\u5408\u308F\u305B',
          unit: '',
          desc: '\u5927\u898F\u6A21\u5229\u7528\u30FB\u30AB\u30B9\u30BF\u30DE\u30A4\u30BA',
          features: ['\u7121\u5236\u9650\u30EA\u30AF\u30A8\u30B9\u30C8', '\u5C02\u7528\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9', '\u30AB\u30B9\u30BF\u30E0\u30D5\u30A3\u30FC\u30C9\u8FFD\u52A0', 'SLA 99.9%', '\u5C02\u4EFB\u30B5\u30DD\u30FC\u30C8'],
          btn: '\u304A\u554F\u3044\u5408\u308F\u305B',
          btnClass: 'outline',
        },
      ],
    },
  };

  const ENDPOINTS = [
    { method: 'GET', path: '/api/articles', tryUrl: '/api/articles?limit=3', tryLabel: 'Try it' },
    { method: 'GET', path: '/api/categories', tryUrl: '/api/categories', tryLabel: 'Try it' },
    { method: 'GET', path: '/api/feed', tryUrl: '/api/feed?limit=3', tryLabel: 'Try it' },
    { method: 'POST', path: '/api/articles/summarize', tryUrl: '/api/articles/summarize', tryBody: { minutes: 60 }, tryLabel: 'Try it' },
    { method: 'POST', path: '/api/articles/ask', tryUrl: '/api/articles/ask', tryBody: { title: 'Latest AI developments', description: 'AI evolution accelerates', source: 'news.cloud', question: 'What are the key points?' }, tryLabel: 'Try it' },
    { method: 'POST', path: '/api/podcast/generate', tryUrl: '/api/podcast/generate', tryBody: { category: 'tech', count: 3 }, tryLabel: 'Try it' },
    { method: 'POST', path: '/api/tts', tryUrl: '/api/tts', tryBody: { text: 'Hello from news.cloud API platform.' }, tryLabel: 'Try it' },
    { method: 'POST', path: '/mcp', tryUrl: null, tryLabel: null, isMcp: true },
  ];

  function t() { return i18n[lang]; }

  function init() {
    hideStandardUI();
    document.body.dataset.mode = 'dark';
    buildPage();
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
    container.id = 'cloud-container';

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

    // Language toggle
    const langBtn = container.querySelector('#cloud-lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        lang = lang === 'en' ? 'ja' : 'en';
        localStorage.setItem('hn_lang', lang);
        // Rebuild
        container.remove();
        buildPage();
        fetchStats();
      });
    }

    // Pricing button click handlers
    container.querySelectorAll('.cloud-pricing-btn.filled').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = '/pro.html';
      });
    });
  }

  function buildNav() {
    const s = t();
    return `
      <nav class="cloud-nav">
        <div class="cloud-nav-inner">
          <a href="/" class="cloud-nav-brand">
            news<span class="cloud-nav-dot">.</span>cloud
          </a>
          <ul class="cloud-nav-links">
            <li><a href="#features">${esc(s.navFeatures)}</a></li>
            <li><a href="#api-reference">${esc(s.navApi)}</a></li>
            <li><a href="#pricing">${esc(s.navPricing)}</a></li>
            <li><a href="#api-reference" class="cloud-nav-cta">${esc(s.navCta)}</a></li>
            <li><button class="cloud-lang-btn" id="cloud-lang-btn">${lang.toUpperCase()}</button></li>
          </ul>
        </div>
      </nav>`;
  }

  function buildHero() {
    const s = t();
    return `
      <section class="cloud-hero">
        <div class="cloud-hero-badge">
          <span class="cloud-hero-badge-dot"></span>
          ${esc(s.heroBadge)}
        </div>
        <h1>news.cloud</h1>
        <h2>${esc(s.heroSubtitle)}</h2>
        <p class="cloud-hero-desc">
          ${esc(s.heroDesc)}
        </p>
        <div class="cloud-hero-actions">
          <a href="#api-reference" class="cloud-cta-btn primary">${esc(s.ctaApi)}</a>
          <a href="#pricing" class="cloud-cta-btn secondary">${esc(s.ctaPricing)}</a>
        </div>
        <div class="cloud-stats" id="cloud-stats">
          <div class="cloud-stat">
            <div class="cloud-stat-value" id="stat-feeds">--</div>
            <div class="cloud-stat-label">${esc(s.statFeeds)}</div>
          </div>
          <div class="cloud-stat">
            <div class="cloud-stat-value" id="stat-categories">--</div>
            <div class="cloud-stat-label">${esc(s.statCategories)}</div>
          </div>
          <div class="cloud-stat">
            <div class="cloud-stat-value" id="stat-status">--</div>
            <div class="cloud-stat-label">${esc(s.statStatus)}</div>
          </div>
        </div>
      </section>`;
  }

  function buildFeatures() {
    const s = t();
    let cards = s.features.map(f => `
      <div class="cloud-feature-card">
        <span class="cloud-feature-icon">${f.icon}</span>
        <div class="cloud-feature-title">${esc(f.title)}</div>
        <div class="cloud-feature-desc">${esc(f.desc)}</div>
      </div>`).join('');

    return `
      <section class="cloud-section" id="features">
        <div class="cloud-section-header">
          <div class="cloud-section-label">${esc(s.featuresLabel)}</div>
          <h2 class="cloud-section-title">${esc(s.featuresTitle)}</h2>
          <p class="cloud-section-desc">${esc(s.featuresDesc)}</p>
        </div>
        <div class="cloud-features">${cards}</div>
      </section>`;
  }

  function buildAPIReference() {
    const s = t();
    let cards = ENDPOINTS.map((ep, i) => {
      const methodClass = ep.method.toLowerCase();
      const desc = s.endpoints[i] ? s.endpoints[i].desc : ep.path;
      const tryBtn = ep.tryLabel
        ? `<button class="cloud-endpoint-try" data-endpoint-idx="${i}">${esc(s.tryIt)}</button>`
        : `<span class="cloud-mcp-badge">MCP</span>`;

      return `
        <div class="cloud-card cloud-animate-in" id="endpoint-card-${i}">
          <div class="cloud-endpoint">
            <span class="cloud-method ${methodClass}">${esc(ep.method)}</span>
            <span class="cloud-endpoint-path">${esc(ep.path)}</span>
            <span class="cloud-endpoint-separator">\u2014</span>
            <span class="cloud-endpoint-desc">${esc(desc)}</span>
            ${tryBtn}
          </div>
          <div class="cloud-response" id="response-${i}"></div>
        </div>`;
    }).join('');

    return `
      <section class="cloud-section" id="api-reference">
        <div class="cloud-section-header">
          <div class="cloud-section-label">${esc(s.apiLabel)}</div>
          <h2 class="cloud-section-title">${esc(s.apiTitle)}</h2>
          <p class="cloud-section-desc">${esc(s.apiDesc)}</p>
        </div>
        <div class="cloud-endpoints">${cards}</div>
      </section>`;
  }

  function buildCodeSample() {
    const s = t();
    const code = `<span class="key">${esc(s.codeCommentFetch)}</span>
<span class="key">const</span> response = <span class="key">await</span> <span class="string">fetch</span>(<span class="string">'https://news.cloud/api/articles?limit=10'</span>);
<span class="key">const</span> data = <span class="key">await</span> response.<span class="string">json</span>();

console.<span class="string">log</span>(data.articles.<span class="string">length</span>); <span class="null">// 10</span>
console.<span class="string">log</span>(data.next_cursor);     <span class="null">// "eyJsYXN0X2..."</span>

<span class="null">${esc(s.codeCommentSummary)}</span>
<span class="key">const</span> summary = <span class="key">await</span> <span class="string">fetch</span>(<span class="string">'https://news.cloud/api/articles/summarize'</span>, {
  <span class="key">method</span>: <span class="string">'POST'</span>,
  <span class="key">headers</span>: { <span class="string">'Content-Type'</span>: <span class="string">'application/json'</span> },
  <span class="key">body</span>: JSON.<span class="string">stringify</span>({ <span class="key">minutes</span>: <span class="number">60</span> })
});`;

    return `
      <section class="cloud-section">
        <div class="cloud-section-header">
          <div class="cloud-section-label">${esc(s.codeLabel)}</div>
          <h2 class="cloud-section-title">${esc(s.codeTitle)}</h2>
          <p class="cloud-section-desc">${esc(s.codeDesc)}</p>
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
    const s = t();

    let cards = s.plans.map(p => {
      const featList = p.features.map(f => `<li>${esc(f)}</li>`).join('');
      const featuredClass = p.featured ? ' featured' : '';
      return `
        <div class="cloud-pricing-card${featuredClass}">
          <div class="cloud-pricing-name">${esc(p.name)}</div>
          <div class="cloud-pricing-price">${esc(p.price)}<span class="unit">${esc(p.unit)}</span></div>
          <div class="cloud-pricing-desc">${esc(p.desc)}</div>
          <ul class="cloud-pricing-features">${featList}</ul>
          <button class="cloud-pricing-btn ${p.btnClass}">${esc(p.btn)}</button>
        </div>`;
    }).join('');

    return `
      <section class="cloud-section" id="pricing">
        <div class="cloud-section-header">
          <div class="cloud-section-label">${esc(s.pricingLabel)}</div>
          <h2 class="cloud-section-title">${esc(s.pricingTitle)}</h2>
          <p class="cloud-section-desc">${esc(s.pricingDesc)}</p>
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
    const s = t();
    const statFeeds = document.getElementById('stat-feeds');
    const statCategories = document.getElementById('stat-categories');
    const statStatus = document.getElementById('stat-status');
    if (!statFeeds) return;

    const [healthResult, categoriesResult] = await Promise.allSettled([
      fetch(BASE + '/health').then(r => r.json()),
      fetch(BASE + '/api/categories').then(r => r.json()),
    ]);

    if (healthResult.status === 'fulfilled') {
      const h = healthResult.value;
      const feedCount = h.feeds_count || h.feed_count || 146;
      statFeeds.textContent = feedCount + '+';
      statStatus.textContent = '\u2705 ' + s.statusLive;
    } else {
      statFeeds.textContent = '146+';
      statStatus.textContent = '\u26A0\uFE0F ' + s.statusChecking;
    }

    if (categoriesResult.status === 'fulfilled') {
      const cats = categoriesResult.value;
      statCategories.textContent = (Array.isArray(cats) ? cats.length : 7);
    } else {
      statCategories.textContent = '7';
    }
  }

  // --- Try It ---

  async function handleTryIt(btn) {
    const s = t();
    const idx = parseInt(btn.dataset.endpointIdx, 10);
    const ep = ENDPOINTS[idx];
    if (!ep || !ep.tryUrl) return;

    const responseEl = document.getElementById('response-' + idx);
    if (!responseEl) return;

    if (responseEl.classList.contains('open')) {
      responseEl.classList.remove('open');
      setTimeout(() => { responseEl.innerHTML = ''; }, 350);
      return;
    }

    btn.classList.add('loading');
    btn.textContent = s.loading;

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
      btn.textContent = s.tryIt;
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

    requestAnimationFrame(() => {
      el.classList.add('open');
    });
  }

  function highlightJSON(str) {
    if (str.length > 8000) {
      str = str.slice(0, 8000) + '\n\n... (truncated)';
    }

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
