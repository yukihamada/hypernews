/**
 * yournews.js — YourNews: Personalized editorial news feed
 * A warm, magazine-style news experience based on user preferences.
 */
'use strict';

const YourNewsApp = (() => {
  // ===== Constants =====
  const PREFS_KEY = 'yn_prefs';
  const LAST_LOAD_KEY = 'yn_last_load';
  const ARTICLES_PER_PAGE = 20;
  const PULL_THRESHOLD = 80;

  const DEFAULT_CATEGORIES = [
    { id: 'tech', label_ja: 'テクノロジー' },
    { id: 'business', label_ja: 'ビジネス' },
    { id: 'entertainment', label_ja: 'エンタメ' },
    { id: 'sports', label_ja: 'スポーツ' },
    { id: 'science', label_ja: 'サイエンス' },
    { id: 'general', label_ja: '総合' },
  ];

  // ===== State =====
  let container = null;
  let categories = [];
  let allArticles = [];
  let displayedCount = 0;
  let isLoading = false;
  let cursors = {};         // { categoryId: nextCursor }
  let lastLoadTime = 0;
  let newArticleCount = 0;
  let pullStartY = 0;
  let pullDist = 0;
  let isPulling = false;
  let checkNewTimer = null;

  // ===== Initialization =====

  function init() {
    hideStandardUI();
    buildContainer();
    loadCategories().then(() => {
      const prefs = getPrefs();
      if (!prefs || prefs.length === 0) {
        showOnboarding();
      } else {
        showFeed();
      }
    });
  }

  function hideStandardUI() {
    const selectors = ['.header', '.main', '#detail-panel', '#detail-overlay', '#chat-panel', '#eco-status'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    }
    document.body.style.background = '#0c0a09';
  }

  function buildContainer() {
    container = document.createElement('div');
    container.className = 'yn-container';
    container.id = 'yn-container';
    document.body.appendChild(container);
  }

  async function loadCategories() {
    try {
      categories = await Api.fetchCategories();
      if (!categories || categories.length === 0) throw new Error('empty');
    } catch {
      categories = DEFAULT_CATEGORIES;
    }
  }

  // ===== Preferences =====

  function getPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setPrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* quota exceeded */ }
  }

  // ===== Onboarding =====

  function showOnboarding() {
    container.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.className = 'yn-onboarding';

    const selected = new Set();

    overlay.innerHTML = `
      <div class="yn-onboarding__logo">YourNews</div>
      <h1 class="yn-onboarding__title">YourNews へようこそ</h1>
      <p class="yn-onboarding__subtitle">あなたの興味を選んでください</p>
      <div class="yn-onboarding__chips" id="yn-ob-chips"></div>
      <button class="yn-onboarding__start" id="yn-ob-start">はじめる</button>
    `;

    document.body.appendChild(overlay);

    const chipsContainer = overlay.querySelector('#yn-ob-chips');
    const startBtn = overlay.querySelector('#yn-ob-start');

    for (const cat of categories) {
      const chip = document.createElement('button');
      chip.className = 'yn-onboarding__chip';
      chip.type = 'button';
      chip.textContent = cat.label_ja || cat.label || cat.id;
      chip.dataset.categoryId = cat.id;

      chip.addEventListener('click', () => {
        if (selected.has(cat.id)) {
          selected.delete(cat.id);
          chip.classList.remove('selected');
        } else {
          selected.add(cat.id);
          chip.classList.add('selected');
        }
        startBtn.classList.toggle('enabled', selected.size > 0);
        startBtn.textContent = selected.size > 0 ? `はじめる (${selected.size})` : 'はじめる';
      });

      chipsContainer.appendChild(chip);
    }

    startBtn.addEventListener('click', () => {
      if (selected.size === 0) return;
      setPrefs(Array.from(selected));
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        overlay.remove();
        showFeed();
      }, 300);
    });
  }

  // ===== Feed Display =====

  function showFeed() {
    container.innerHTML = '';
    allArticles = [];
    displayedCount = 0;
    cursors = {};

    // Top bar
    const topbar = document.createElement('div');
    topbar.className = 'yn-topbar';
    topbar.innerHTML = `
      <span class="yn-logo">YourNews</span>
      <div class="yn-topbar-actions">
        <button class="yn-refresh-btn" id="yn-refresh" aria-label="更新">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>
        <button class="yn-settings-btn" id="yn-settings" aria-label="設定">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
      </div>
    `;
    container.appendChild(topbar);

    // Greeting
    const greeting = document.createElement('div');
    greeting.className = 'yn-greeting';
    greeting.id = 'yn-greeting';
    greeting.innerHTML = `
      <div class="yn-greeting__text">${getGreeting()}</div>
      <div class="yn-greeting__date">${getFormattedDate()}</div>
    `;
    container.appendChild(greeting);

    // New articles banner
    const banner = document.createElement('div');
    banner.className = 'yn-new-banner';
    banner.id = 'yn-new-banner';
    banner.innerHTML = `<span class="yn-new-banner__dot"></span><span id="yn-new-banner-text"></span>`;
    container.appendChild(banner);

    // Feed area
    const feedArea = document.createElement('div');
    feedArea.id = 'yn-feed-area';
    container.appendChild(feedArea);

    // Scroll sentinel for infinite scroll
    const sentinel = document.createElement('div');
    sentinel.id = 'yn-sentinel';
    sentinel.style.height = '1px';
    container.appendChild(sentinel);

    // Pull indicator
    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'yn-pull-indicator';
    pullIndicator.id = 'yn-pull-indicator';
    pullIndicator.textContent = '引っ張って更新';
    document.body.appendChild(pullIndicator);

    // Event listeners
    setupRefreshButton();
    setupSettingsButton();
    setupInfiniteScroll(sentinel);
    setupPullToRefresh();
    setupNewArticleBanner(banner);

    // Build settings panel
    buildSettingsPanel();

    // Load articles
    loadFeed();
  }

  // ===== Greeting =====

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'おはようございます';
    if (hour >= 11 && hour < 17) return 'こんにちは';
    return 'こんばんは';
  }

  function getFormattedDate() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekDays = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    const weekDay = weekDays[now.getDay()];
    return `${month}月${day}日 ${weekDay}`;
  }

  // ===== Feed Loading =====

  async function loadFeed(refresh = false) {
    if (isLoading) return;
    isLoading = true;

    const feedArea = document.getElementById('yn-feed-area');
    if (!feedArea) { isLoading = false; return; }

    if (refresh) {
      allArticles = [];
      displayedCount = 0;
      cursors = {};
    }

    // Show skeleton on initial load
    if (allArticles.length === 0) {
      feedArea.innerHTML = buildSkeletonHTML();
    }

    try {
      const prefs = getPrefs() || [];
      const fetches = prefs.map(catId =>
        Api.fetchArticles(catId, ARTICLES_PER_PAGE, cursors[catId] || null)
          .then(data => {
            if (data.next_cursor) cursors[catId] = data.next_cursor;
            return (data.articles || []).map(a => ({ ...a, _fetchedCat: catId }));
          })
          .catch(() => [])
      );

      const results = await Promise.all(fetches);
      const newArticles = results.flat();

      // Deduplicate by article_id or url
      const existingIds = new Set(allArticles.map(a => a.id || a.article_id || a.url));
      const unique = [];
      for (const a of newArticles) {
        const key = a.id || a.article_id || a.url;
        if (!existingIds.has(key)) {
          existingIds.add(key);
          unique.push(a);
        }
      }

      // Sort by published_at descending
      unique.sort((a, b) => {
        const ta = new Date(a.published_at || 0).getTime();
        const tb = new Date(b.published_at || 0).getTime();
        return tb - ta;
      });

      if (refresh || allArticles.length === 0) {
        allArticles = unique;
      } else {
        allArticles = allArticles.concat(unique);
      }

      lastLoadTime = Date.now();
      try { localStorage.setItem(LAST_LOAD_KEY, String(lastLoadTime)); } catch {}

      displayedCount = 0;
      renderFeed();
    } catch (e) {
      console.error('YourNews feed load error:', e);
      if (allArticles.length === 0) {
        feedArea.innerHTML = `
          <div class="yn-empty">
            <div class="yn-empty__text">ニュースの読み込みに失敗しました。<br>後ほどお試しください。</div>
          </div>
        `;
      }
    } finally {
      isLoading = false;
    }
  }

  async function loadMoreArticles() {
    if (isLoading) return;

    // If we have un-displayed articles, show more from buffer
    if (displayedCount < allArticles.length) {
      renderMoreCards();
      return;
    }

    // Otherwise fetch more from API
    isLoading = true;
    const feedArea = document.getElementById('yn-feed-area');
    if (!feedArea) { isLoading = false; return; }

    // Show spinner
    const spinner = document.createElement('div');
    spinner.className = 'yn-spinner';
    spinner.id = 'yn-load-spinner';
    spinner.textContent = '読み込み中';
    feedArea.parentNode.insertBefore(spinner, document.getElementById('yn-sentinel'));

    try {
      const prefs = getPrefs() || [];
      const fetches = prefs.map(catId => {
        if (!cursors[catId]) return Promise.resolve([]);
        return Api.fetchArticles(catId, ARTICLES_PER_PAGE, cursors[catId])
          .then(data => {
            if (data.next_cursor) {
              cursors[catId] = data.next_cursor;
            } else {
              cursors[catId] = null;
            }
            return (data.articles || []).map(a => ({ ...a, _fetchedCat: catId }));
          })
          .catch(() => []);
      });

      const results = await Promise.all(fetches);
      const newArticles = results.flat();

      const existingIds = new Set(allArticles.map(a => a.id || a.article_id || a.url));
      const unique = [];
      for (const a of newArticles) {
        const key = a.id || a.article_id || a.url;
        if (!existingIds.has(key)) {
          existingIds.add(key);
          unique.push(a);
        }
      }

      unique.sort((a, b) => {
        const ta = new Date(a.published_at || 0).getTime();
        const tb = new Date(b.published_at || 0).getTime();
        return tb - ta;
      });

      allArticles = allArticles.concat(unique);
      renderMoreCards();
    } catch (e) {
      console.error('YourNews load more error:', e);
    } finally {
      const sp = document.getElementById('yn-load-spinner');
      if (sp) sp.remove();
      isLoading = false;
    }
  }

  // ===== Rendering =====

  function renderFeed() {
    const feedArea = document.getElementById('yn-feed-area');
    if (!feedArea) return;
    feedArea.innerHTML = '';

    if (allArticles.length === 0) {
      feedArea.innerHTML = `
        <div class="yn-empty">
          <div class="yn-empty__text">選択したカテゴリの記事がまだありません。</div>
        </div>
      `;
      return;
    }

    // Hero article (first article)
    const hero = allArticles[0];
    feedArea.appendChild(createHeroElement(hero));
    displayedCount = 1;

    // Grid
    const grid = document.createElement('div');
    grid.className = 'yn-grid';
    grid.id = 'yn-grid';
    feedArea.appendChild(grid);

    // Show initial batch
    const initialBatch = Math.min(allArticles.length, 11); // hero + 10 cards
    for (let i = 1; i < initialBatch; i++) {
      grid.appendChild(createCardElement(allArticles[i]));
      displayedCount = i + 1;
    }
  }

  function renderMoreCards() {
    const grid = document.getElementById('yn-grid');
    if (!grid) return;

    const start = displayedCount;
    const end = Math.min(allArticles.length, start + 10);

    for (let i = start; i < end; i++) {
      grid.appendChild(createCardElement(allArticles[i]));
      displayedCount = i + 1;
    }
  }

  function createHeroElement(article) {
    const el = document.createElement('div');
    el.className = 'yn-hero-article';
    el.dataset.articleId = article.id || article.article_id || '';
    el.dataset.url = article.url || '';

    const catInfo = categories.find(c => c.id === article.category);
    const catLabel = catInfo ? (catInfo.label_ja || catInfo.label) : (article.category || '');
    const timeAgo = formatTimeAgo(article.published_at);

    let imgHTML;
    if (article.image_url && article.image_url.trim()) {
      imgHTML = `<img class="yn-hero-article__img" src="${escHtml(article.image_url)}" alt="${escHtml(article.title)}" loading="eager">`;
    } else {
      imgHTML = `<div class="yn-hero-article__img-placeholder"><span>YN</span></div>`;
    }

    el.innerHTML = `
      <div class="yn-hero-article__img-wrap">${imgHTML}</div>
      <div class="yn-hero-article__body">
        ${catLabel ? `<span class="yn-hero-article__category">${escHtml(catLabel)}</span>` : ''}
        <h2 class="yn-hero-article__title">${escHtml(article.title || '')}</h2>
        ${article.description ? `<p class="yn-hero-article__desc">${escHtml(stripHtml(article.description))}</p>` : ''}
        <div class="yn-hero-article__meta">
          <span class="yn-source-badge">${escHtml(article.source || '')}</span>
          ${timeAgo ? `<span class="yn-hero-article__meta-dot"></span><span>${timeAgo}</span>` : ''}
        </div>
      </div>
    `;

    el.addEventListener('click', () => handleArticleClick(el, article));

    return el;
  }

  function createCardElement(article) {
    const el = document.createElement('div');
    el.className = 'yn-card';
    el.dataset.articleId = article.id || article.article_id || '';
    el.dataset.url = article.url || '';

    const catInfo = categories.find(c => c.id === article.category);
    const catLabel = catInfo ? (catInfo.label_ja || catInfo.label) : (article.category || '');
    const timeAgo = formatTimeAgo(article.published_at);

    let imgHTML;
    if (article.image_url && article.image_url.trim()) {
      imgHTML = `<img class="yn-card__img" src="${escHtml(article.image_url)}" alt="${escHtml(article.title)}" loading="lazy" decoding="async">`;
    } else {
      imgHTML = `<div class="yn-card__img-placeholder"><span>YN</span></div>`;
    }

    el.innerHTML = `
      <div class="yn-card__img-wrap">${imgHTML}</div>
      <div class="yn-card__body">
        ${catLabel ? `<span class="yn-card__category">${escHtml(catLabel)}</span>` : ''}
        <h3 class="yn-card__title">${escHtml(article.title || '')}</h3>
        <div class="yn-card__meta">
          <span class="yn-source-badge">${escHtml(article.source || '')}</span>
          ${timeAgo ? `<span class="yn-card__meta-dot"></span><span>${timeAgo}</span>` : ''}
        </div>
      </div>
      <div class="yn-card__expanded" id="yn-exp-${escAttr(article.id || article.article_id || '')}">
        ${article.description ? `<p class="yn-card__desc">${escHtml(stripHtml(article.description))}</p>` : ''}
        <button class="yn-card__ai-btn" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v2H8V6a4 4 0 014-4z"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 14h.01M15 14h.01"/></svg>
          AI要約を見る
        </button>
        <div class="yn-card__summary-area"></div>
        <a class="yn-card__source-link" href="${escHtml(article.url || '#')}" target="_blank" rel="noopener">
          元記事を読む
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    `;

    // Card click → expand/collapse
    const clickableArea = el.querySelector('.yn-card__body');
    const imgWrap = el.querySelector('.yn-card__img-wrap');

    const toggleExpand = (e) => {
      e.stopPropagation();
      handleArticleClick(el, article);
    };

    clickableArea.addEventListener('click', toggleExpand);
    imgWrap.addEventListener('click', toggleExpand);

    // AI summary button
    const aiBtn = el.querySelector('.yn-card__ai-btn');
    aiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fetchAISummary(el, article);
    });

    // Prevent source link from toggling card
    const sourceLink = el.querySelector('.yn-card__source-link');
    sourceLink.addEventListener('click', (e) => e.stopPropagation());

    return el;
  }

  function handleArticleClick(el, article) {
    const expanded = el.querySelector('.yn-card__expanded');
    if (!expanded) {
      // Hero article — open URL
      if (article.url) window.open(article.url, '_blank', 'noopener');
      return;
    }

    const isOpen = expanded.classList.contains('open');

    // Close all other expanded cards
    document.querySelectorAll('.yn-card__expanded.open').forEach(exp => {
      if (exp !== expanded) exp.classList.remove('open');
    });

    expanded.classList.toggle('open', !isOpen);

    // Scroll into view if opening
    if (!isOpen) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }

  async function fetchAISummary(cardEl, article) {
    const summaryArea = cardEl.querySelector('.yn-card__summary-area');
    const aiBtn = cardEl.querySelector('.yn-card__ai-btn');
    if (!summaryArea || !aiBtn) return;

    // If already loaded, just show
    if (summaryArea.querySelector('.yn-card__summary')) return;

    aiBtn.disabled = true;
    aiBtn.textContent = '要約を生成中...';
    summaryArea.innerHTML = '<div class="yn-card__summary-loading">AI要約を生成しています</div>';

    try {
      const data = await Api.summarizeArticles(30);
      const summary = data && data.summary ? data.summary : '要約を取得できませんでした。';
      summaryArea.innerHTML = `<div class="yn-card__summary">${escHtml(summary)}</div>`;
      aiBtn.style.display = 'none';
    } catch {
      summaryArea.innerHTML = '';
      aiBtn.disabled = false;
      aiBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4v2H8V6a4 4 0 014-4z"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 14h.01M15 14h.01"/></svg>
        再試行
      `;
    }
  }

  // ===== Skeleton =====

  function buildSkeletonHTML() {
    return `
      <div class="yn-skeleton yn-skeleton--hero"></div>
      <div class="yn-grid">
        <div class="yn-skeleton yn-skeleton--card"></div>
        <div class="yn-skeleton yn-skeleton--card"></div>
        <div class="yn-skeleton yn-skeleton--card"></div>
        <div class="yn-skeleton yn-skeleton--card"></div>
      </div>
    `;
  }

  // ===== Refresh =====

  function setupRefreshButton() {
    const btn = document.getElementById('yn-refresh');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.classList.add('spinning');
      newArticleCount = 0;
      updateNewBanner();
      await loadFeed(true);
      btn.classList.remove('spinning');
    });
  }

  // ===== Pull-to-Refresh =====

  function setupPullToRefresh() {
    const indicator = document.getElementById('yn-pull-indicator');
    if (!indicator) return;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY > 10) return;
      pullStartY = e.touches[0].clientY;
      isPulling = true;
      pullDist = 0;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      pullDist = e.touches[0].clientY - pullStartY;
      if (pullDist < 0) { pullDist = 0; return; }

      if (pullDist > 20) {
        indicator.classList.add('visible');
        if (pullDist >= PULL_THRESHOLD) {
          indicator.textContent = '離して更新';
        } else {
          indicator.textContent = '引っ張って更新';
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', async () => {
      if (!isPulling) return;
      isPulling = false;
      const indicator_ = document.getElementById('yn-pull-indicator');

      if (pullDist >= PULL_THRESHOLD) {
        if (indicator_) {
          indicator_.textContent = '更新中...';
          indicator_.classList.add('refreshing');
        }
        newArticleCount = 0;
        updateNewBanner();
        await loadFeed(true);
      }

      if (indicator_) {
        indicator_.classList.remove('visible', 'refreshing');
      }
      pullDist = 0;
    }, { passive: true });
  }

  // ===== Infinite Scroll =====

  function setupInfiniteScroll(sentinel) {
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading) {
        loadMoreArticles();
      }
    }, { rootMargin: '300px' });

    observer.observe(sentinel);
  }

  // ===== New Articles Banner =====

  function setupNewArticleBanner(banner) {
    if (!banner) return;

    banner.addEventListener('click', async () => {
      newArticleCount = 0;
      updateNewBanner();
      await loadFeed(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Check for new articles periodically (every 2 minutes)
    checkNewTimer = setInterval(() => checkForNewArticles(), 120000);
  }

  async function checkForNewArticles() {
    if (document.hidden) return;
    const prefs = getPrefs();
    if (!prefs || prefs.length === 0) return;

    try {
      // Fetch just 1 article per category to check timestamps
      const firstCat = prefs[0];
      const data = await Api.fetchArticles(firstCat, 1, null);
      if (data.articles && data.articles.length > 0) {
        const newestTime = new Date(data.articles[0].published_at).getTime();
        if (newestTime > lastLoadTime && lastLoadTime > 0) {
          newArticleCount++;
          updateNewBanner();
        }
      }
    } catch {
      // Silently ignore check errors
    }
  }

  function updateNewBanner() {
    const banner = document.getElementById('yn-new-banner');
    const text = document.getElementById('yn-new-banner-text');
    if (!banner || !text) return;

    if (newArticleCount > 0) {
      text.textContent = `${newArticleCount}件の新しい記事`;
      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
    }
  }

  // ===== Settings Panel =====

  function setupSettingsButton() {
    const btn = document.getElementById('yn-settings');
    if (!btn) return;

    btn.addEventListener('click', () => {
      openSettings();
    });
  }

  function buildSettingsPanel() {
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'yn-settings-overlay';
    overlay.id = 'yn-settings-overlay';
    document.body.appendChild(overlay);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'yn-settings-panel';
    panel.id = 'yn-settings-panel';

    panel.innerHTML = `
      <div class="yn-settings-panel__header">
        <h2 class="yn-settings-panel__title">設定</h2>
        <button class="yn-settings-panel__close" id="yn-settings-close" aria-label="閉じる">&times;</button>
      </div>
      <div class="yn-settings-panel__body">
        <div class="yn-settings-panel__section-title">カテゴリ</div>
        <div class="yn-settings-panel__chips" id="yn-settings-chips"></div>
        <button class="yn-settings-panel__save" id="yn-settings-save">保存する</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Close handlers
    overlay.addEventListener('click', closeSettings);
    panel.querySelector('#yn-settings-close').addEventListener('click', closeSettings);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        closeSettings();
      }
    });
  }

  function openSettings() {
    const overlay = document.getElementById('yn-settings-overlay');
    const panel = document.getElementById('yn-settings-panel');
    const chipsContainer = document.getElementById('yn-settings-chips');
    const saveBtn = document.getElementById('yn-settings-save');
    if (!overlay || !panel || !chipsContainer || !saveBtn) return;

    const currentPrefs = new Set(getPrefs() || []);

    // Render category chips
    chipsContainer.innerHTML = '';
    for (const cat of categories) {
      const chip = document.createElement('button');
      chip.className = 'yn-settings-panel__chip';
      chip.type = 'button';
      chip.textContent = cat.label_ja || cat.label || cat.id;
      chip.dataset.categoryId = cat.id;

      if (currentPrefs.has(cat.id)) {
        chip.classList.add('selected');
      }

      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
      });

      chipsContainer.appendChild(chip);
    }

    // Save button
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.id = 'yn-settings-save';

    newSaveBtn.addEventListener('click', async () => {
      const selected = [];
      chipsContainer.querySelectorAll('.yn-settings-panel__chip.selected').forEach(chip => {
        selected.push(chip.dataset.categoryId);
      });

      if (selected.length === 0) {
        newSaveBtn.textContent = 'カテゴリを1つ以上選んでください';
        newSaveBtn.style.background = '#ef4444';
        setTimeout(() => {
          newSaveBtn.textContent = '保存する';
          newSaveBtn.style.background = '';
        }, 2000);
        return;
      }

      setPrefs(selected);
      closeSettings();
      await loadFeed(true);
    });

    overlay.classList.add('open');
    panel.classList.add('open');
  }

  function closeSettings() {
    const overlay = document.getElementById('yn-settings-overlay');
    const panel = document.getElementById('yn-settings-panel');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
  }

  // ===== Utility Functions =====

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = Date.now();
      const diff = now - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'たった今';
      if (mins < 60) return `${mins}分前`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}時間前`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}日前`;
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function escAttr(str) {
    if (!str) return '';
    return str.replace(/[&"'<>]/g, c => ({
      '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;'
    }[c]));
  }

  // ===== Cleanup =====

  function destroy() {
    if (checkNewTimer) {
      clearInterval(checkNewTimer);
      checkNewTimer = null;
    }
  }

  // ===== Public API =====
  return { init };
})();
