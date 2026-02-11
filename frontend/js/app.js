/**
 * app.js — Main entry point: initialization, article loading, offline, eco system
 */
'use strict';

const App = (() => {
  let currentCategory = '';
  let currentCursor = null;
  let isLoading = false;
  let categories = [];
  let scrollObserver = null;
  let readObserver = null;
  let detailOpen = false;
  let detailTrigger = null;
  let isOffline = !navigator.onLine;
  let autoRefreshTimer = null;
  let currentDetailArticle = null;

  const els = {};

  function init() {
    // Branch to feed UI for online site
    if (typeof Site !== 'undefined' && Site.id === 'online' && typeof FeedApp !== 'undefined') {
      FeedApp.init();
      return;
    }

    els.articles = document.getElementById('articles');
    els.loading = document.getElementById('loading');
    els.nav = document.getElementById('category-nav');
    els.loadMoreWrap = document.getElementById('load-more-wrap');
    els.loadMoreBtn = document.getElementById('load-more-btn');
    els.sentinel = document.getElementById('scroll-sentinel');
    els.detailPanel = document.getElementById('detail-panel');
    els.detailOverlay = document.getElementById('detail-overlay');
    els.detailBack = document.getElementById('detail-back');
    els.detailExternal = document.getElementById('detail-external');
    els.detailTitle = document.getElementById('detail-title');
    els.detailMeta = document.getElementById('detail-meta');
    els.detailDesc = document.getElementById('detail-desc');
    els.detailImgWrap = document.getElementById('detail-img-wrap');
    els.detailQuestions = document.getElementById('detail-questions');
    els.detailAnswers = document.getElementById('detail-answers');

    // Apply stored preferences
    Theme.apply();
    Tts.init();
    ReadHistory.init();
    Bookmarks.init();
    EcoSystem.init();

    // A/B Test: assign variant and apply design
    if (typeof ABTest !== 'undefined') {
      ABTest.init();
      // Support ?ab_preview=variant_id for admin preview
      const previewId = new URLSearchParams(location.search).get('ab_preview');
      if (previewId) ABTest.preview(previewId);
    }

    currentCategory = Storage.get('category');

    // Load categories
    loadCategories();

    // Load articles
    loadArticles();

    // Category nav click
    els.nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      const cat = btn.dataset.category;
      setCategory(cat);
    });

    // Category nav scroll indicator
    els.nav.addEventListener('scroll', () => {
      const atEnd = els.nav.scrollLeft + els.nav.clientWidth >= els.nav.scrollWidth - 8;
      els.nav.classList.toggle('scrolled-end', atEnd);
    });

    // Load more button (fallback for infinite scroll)
    els.loadMoreBtn.addEventListener('click', () => {
      if (currentCursor && !isLoading) loadArticles(true);
    });

    // Infinite scroll via IntersectionObserver
    scrollObserver = new IntersectionObserver((entries) => {
      if (!Storage.get('infiniteScroll')) return;
      if (entries[0].isIntersecting && currentCursor && !isLoading) {
        loadArticles(true);
      }
    }, { rootMargin: '200px' });
    scrollObserver.observe(els.sentinel);

    // Read tracking: mark articles as read when visible
    readObserver = new IntersectionObserver((entries) => {
      const delay = Storage.get('readMarkDelay');
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting) {
          if (delay < 0) continue; // OFF
          el._readTimer = setTimeout(() => {
            const id = el.dataset.articleId;
            if (id && !ReadHistory.isRead(id)) {
              ReadHistory.markRead(id);
              el.classList.add('read');
              EcoSystem.recordView(id);
              if (Storage.get('hideReadArticles')) {
                el.style.display = 'none';
              }
            }
          }, delay);
        } else {
          clearTimeout(el._readTimer);
        }
      }
    }, { threshold: 0.5 });

    // TTS button click (event delegation)
    els.articles.addEventListener('click', (e) => {
      const btn = e.target.closest('.tts-btn');
      if (!btn) return;
      const article = btn.closest('.article');
      if (article) Tts.toggle(article);
    });

    // Intercept article title clicks → open detail panel or new tab
    els.articles.addEventListener('click', (e) => {
      const link = e.target.closest('.article-title a');
      if (!link) return;
      const articleEl = link.closest('.article');

      // Mark as read
      if (articleEl && articleEl.dataset.articleId) {
        ReadHistory.markRead(articleEl.dataset.articleId);
        articleEl.classList.add('read');
        EcoSystem.recordView(articleEl.dataset.articleId);
        if (Storage.get('hideReadArticles')) {
          articleEl.style.display = 'none';
        }
      }

      const clickAction = Storage.get('articleClickAction');
      if (clickAction === 'newtab') {
        // Let default link behavior open in new tab (do not preventDefault)
        return;
      }

      e.preventDefault();
      detailTrigger = link;
      openDetail({
        title: link.textContent,
        url: link.href,
        source: articleEl?.querySelector('.article-source')?.textContent || '',
        time: articleEl?.querySelector('time')?.textContent || '',
        description: articleEl?.querySelector('.article-desc')?.textContent || '',
        imageUrl: articleEl?.querySelector('.article-img')?.src || '',
      });
    });

    // Detail panel close handlers
    els.detailBack.addEventListener('click', closeDetail);
    els.detailOverlay.addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && detailOpen) closeDetail();
    });

    // Subscription: check redirect + show Pro badge
    Subscription.checkRedirect();
    Subscription.updateProBadge();

    // Mode toggle button
    const modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => Theme.toggleMode());
    }

    // Bookmark button click (event delegation)
    els.articles.addEventListener('click', (e) => {
      const btn = e.target.closest('.bookmark-btn');
      if (!btn) return;
      const article = btn.closest('.article');
      if (!article) return;
      const id = article.dataset.articleId;
      const titleEl = article.querySelector('.article-title a');
      const sourceEl = article.querySelector('.article-source');
      const data = {
        title: titleEl?.textContent || '',
        url: titleEl?.href || '',
        source: sourceEl?.textContent || '',
      };
      const isNowBookmarked = Bookmarks.toggle(id, data);
      btn.classList.toggle('bookmarked', isNowBookmarked);
    });

    // Share button in detail panel
    const shareBtn = document.getElementById('detail-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (!currentDetailArticle) return;
        const shareData = {
          title: currentDetailArticle.title,
          url: currentDetailArticle.url,
        };
        if (navigator.share) {
          navigator.share(shareData).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(currentDetailArticle.url).then(() => {
            Chat.addMessage('URLをクリップボードにコピーしました。', 'bot');
          }).catch(() => {});
        }
      });
    }

    // Chat init
    Chat.init();

    // Auto-refresh setup
    setupAutoRefresh();

    // Offline/online detection
    setupOfflineDetection();

    // Battery saving
    setupBatterySaving();

    // Prefetch categories for offline after idle
    if (navigator.onLine) {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
      idle(() => prefetchForOffline());
    }
  }

  // --- Offline Detection ---

  function setupOfflineDetection() {
    updateOfflineUI();
    window.addEventListener('online', () => {
      isOffline = false;
      updateOfflineUI();
      // Process pending offline requests for eco tokens
      EcoSystem.processOfflineQueue();
      // Refresh articles in background
      loadArticles();
    });
    window.addEventListener('offline', () => {
      isOffline = true;
      updateOfflineUI();
    });
  }

  function updateOfflineUI() {
    document.body.classList.toggle('is-offline', isOffline);
    // Hide AI sections when offline
    const aiSection = document.querySelector('.detail-ai-section');
    if (aiSection) aiSection.style.display = isOffline ? 'none' : '';
  }

  // --- Battery Saving ---

  function setupBatterySaving() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((battery) => {
      const check = () => {
        const lowBattery = battery.level <= 0.2 && !battery.charging;
        document.body.classList.toggle('battery-saving', lowBattery);
        if (lowBattery && Storage.get('mode') !== 'dark') {
          document.body.dataset.mode = 'dark';
        }
      };
      check();
      battery.addEventListener('levelchange', check);
      battery.addEventListener('chargingchange', check);
    });
  }

  // --- Prefetch for Offline ---

  function prefetchForOffline() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    const catIds = categories.map(c => c.id).filter(Boolean);
    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_CATEGORIES',
      categories: ['', ...catIds],
    });
  }

  async function loadCategories() {
    try {
      categories = await Api.fetchCategories();
      Renderer.renderCategories(els.nav, categories, currentCategory);
    } catch {
      // Use default categories on error
      categories = [
        { id: 'general', label: 'General', label_ja: '総合' },
        { id: 'tech', label: 'Technology', label_ja: 'テクノロジー' },
        { id: 'business', label: 'Business', label_ja: 'ビジネス' },
        { id: 'entertainment', label: 'Entertainment', label_ja: 'エンタメ' },
        { id: 'sports', label: 'Sports', label_ja: 'スポーツ' },
        { id: 'science', label: 'Science', label_ja: 'サイエンス' },
        { id: 'podcast', label: 'Podcast', label_ja: 'ポッドキャスト' },
      ];
      Renderer.renderCategories(els.nav, categories, currentCategory);
    }
  }

  async function loadArticles(append = false) {
    if (isLoading) return;
    isLoading = true;

    if (!append) {
      currentCursor = null;
      Renderer.renderSkeletons(els.articles);
      els.loadMoreWrap.style.display = 'none';
    } else {
      // Show scroll spinner while loading more
      let spinner = document.getElementById('scroll-spinner');
      if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'scroll-spinner';
        spinner.className = 'scroll-spinner';
        spinner.textContent = '読み込み中';
        els.articles.parentNode.insertBefore(spinner, els.sentinel);
      }
    }

    try {
      const data = await Api.fetchArticles(
        currentCategory || null,
        Storage.get('articlesPerPage'),
        append ? currentCursor : null,
      );

      // Remove scroll spinner
      const spinner = document.getElementById('scroll-spinner');
      if (spinner) spinner.remove();

      Renderer.render(els.articles, data.articles, append);
      if (!append) injectJsonLd(data.articles);
      currentCursor = data.next_cursor || null;
      els.loadMoreWrap.style.display = currentCursor ? '' : 'none';
      els.sentinel.style.display = currentCursor ? '' : 'none';

      // Observe new article elements for read tracking
      const hideRead = Storage.get('hideReadArticles');
      els.articles.querySelectorAll('.article:not([data-observed])').forEach(el => {
        el.dataset.observed = '1';
        readObserver.observe(el);
        // Apply read state from history
        if (el.dataset.articleId && ReadHistory.isRead(el.dataset.articleId)) {
          el.classList.add('read');
          if (hideRead) el.style.display = 'none';
        }
      });
    } catch {
      const sp = document.getElementById('scroll-spinner');
      if (sp) sp.remove();
      if (!append) {
        els.articles.innerHTML = '<div class="loading">ニュースの読み込みに失敗しました。後ほどお試しください。</div>';
      }
    } finally {
      isLoading = false;
    }
  }

  function setCategory(cat) {
    currentCategory = cat;
    Storage.set('category', cat);
    Renderer.renderCategories(els.nav, categories, cat);
    updatePageTitle(cat);
    loadArticles();
  }

  function updatePageTitle(cat) {
    const siteName = (typeof Site !== 'undefined') ? Site.name : 'news.xyz';
    const catInfo = categories.find(c => c.id === cat);
    if (cat && catInfo) {
      document.title = `${catInfo.label_ja} - ${siteName}`;
      setMeta('og:title', `${catInfo.label_ja}ニュース - ${siteName}`);
      setMeta('description', `${catInfo.label_ja}カテゴリの最新ニュースをAIが要約・質問応答。${siteName}。`);
    } else {
      document.title = `${siteName} - AI超高速ニュース`;
      setMeta('og:title', `${siteName} - AI超高速ニュース`);
      setMeta('description', `AI搭載の超高速ニュースアグリゲーター。最新ニュースをAIが要約・質問応答・読み上げ。`);
    }
  }

  function setMeta(nameOrProp, content) {
    let el = document.querySelector(`meta[name="${nameOrProp}"]`)
          || document.querySelector(`meta[property="${nameOrProp}"]`);
    if (el) el.setAttribute('content', content);
  }

  function injectJsonLd(articles) {
    const siteName = (typeof Site !== 'undefined') ? Site.name : 'news.xyz';
    let script = document.getElementById('jsonld-news');
    if (!script) {
      script = document.createElement('script');
      script.id = 'jsonld-news';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    const items = articles.slice(0, 10).map(a => ({
      '@type': 'NewsArticle',
      headline: a.title,
      url: a.url,
      datePublished: a.published_at,
      publisher: { '@type': 'Organization', name: a.source },
      ...(a.image_url ? { image: a.image_url } : {}),
      ...(a.description ? { description: a.description } : {}),
    }));
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${siteName} 最新ニュース`,
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item,
      })),
    });
  }

  function getCategories() {
    return categories;
  }

  // --- Article Detail Panel ---

  function openDetail(article) {
    detailOpen = true;
    currentDetailArticle = article;
    els.detailTitle.textContent = article.title;
    els.detailExternal.href = article.url;
    els.detailMeta.textContent = [article.source, article.time].filter(Boolean).join(' · ');
    els.detailDesc.textContent = article.description || '';
    els.detailImgWrap.innerHTML = article.imageUrl
      ? `<img src="${article.imageUrl}" alt="${Renderer.escHtml(article.title)}" loading="lazy">`
      : '';
    els.detailQuestions.innerHTML = '<div class="detail-loading">質問を生成中</div>';
    els.detailAnswers.innerHTML = '';

    els.detailPanel.hidden = false;
    els.detailOverlay.hidden = false;
    requestAnimationFrame(() => {
      els.detailPanel.classList.add('open');
      els.detailOverlay.classList.add('open');
      els.detailBack.focus();
    });

    // Hide AI section when offline
    const aiSection = els.detailPanel.querySelector('.detail-ai-section');
    if (aiSection) aiSection.style.display = isOffline ? 'none' : '';

    // Fetch AI questions (online only)
    if (!isOffline) {
      fetchQuestions(article);
    } else {
      els.detailQuestions.innerHTML = '<div class="detail-loading" style="font-style:normal;color:var(--muted)">オフラインのためAI機能は利用できません</div>';
    }
  }

  function closeDetail() {
    detailOpen = false;
    els.detailPanel.classList.remove('open');
    els.detailOverlay.classList.remove('open');
    setTimeout(() => {
      els.detailPanel.hidden = true;
      els.detailOverlay.hidden = true;
    }, 250);
    if (detailTrigger) {
      detailTrigger.focus();
      detailTrigger = null;
    }
  }

  async function fetchQuestions(article) {
    try {
      const data = await Api.getArticleQuestions(article.title, article.description, article.source, article.url);
      els.detailQuestions.innerHTML = '';
      if (!data.questions || data.questions.length === 0) {
        els.detailQuestions.innerHTML = '<div class="detail-loading" style="font-style:normal">質問を生成できませんでした</div>';
        return;
      }
      for (const q of data.questions) {
        const chip = document.createElement('button');
        chip.className = 'detail-q-chip';
        chip.type = 'button';
        chip.textContent = q;
        chip.addEventListener('click', () => {
          if (chip.classList.contains('asked')) return;
          chip.classList.add('asked');
          askQuestion(article, q);
        });
        els.detailQuestions.appendChild(chip);
      }
    } catch {
      els.detailQuestions.innerHTML = '';
      const errDiv = document.createElement('div');
      errDiv.className = 'detail-loading';
      errDiv.style.fontStyle = 'normal';
      errDiv.textContent = '質問の生成に失敗しました ';
      const retryBtn = document.createElement('button');
      retryBtn.className = 'detail-q-chip';
      retryBtn.type = 'button';
      retryBtn.textContent = '再試行';
      retryBtn.addEventListener('click', () => {
        els.detailQuestions.innerHTML = '<div class="detail-loading">質問を生成中</div>';
        fetchQuestions(article);
      });
      errDiv.appendChild(retryBtn);
      els.detailQuestions.appendChild(errDiv);
    }
  }

  async function askQuestion(article, question) {
    // Consume 1 token
    EcoSystem.consumeToken();

    const block = document.createElement('div');
    block.className = 'detail-answer-block';
    block.innerHTML = `<div class="detail-answer-q">${Renderer.escHtml(question)}</div><div class="detail-answer-loading">回答を生成中</div>`;
    els.detailAnswers.appendChild(block);
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Also scroll the detail-body container to show the answer
    const detailBody = els.detailPanel.querySelector('.detail-body');
    if (detailBody) {
      detailBody.scrollTop = detailBody.scrollHeight;
    }

    // Check query cache first
    const cacheKey = `${article.title}|${question}`;
    const cached = EcoSystem.getQueryCache(cacheKey);

    if (cached) {
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        typewriterEffect(loading, cached);
      }
      return;
    }

    try {
      const data = await Api.askArticleQuestion(article.title, article.description, article.source, question, article.url);
      const answer = data.answer || '回答を取得できませんでした';
      // Cache the answer
      EcoSystem.setQueryCache(cacheKey, answer);
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        typewriterEffect(loading, answer);
      }
    } catch {
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        loading.style.color = 'var(--muted)';
        const errText = document.createTextNode('回答の取得に失敗しました ');
        loading.appendChild(errText);
        const retryBtn = document.createElement('button');
        retryBtn.className = 'detail-q-chip';
        retryBtn.type = 'button';
        retryBtn.textContent = '再試行';
        retryBtn.addEventListener('click', () => {
          loading.className = 'detail-answer-loading';
          loading.style.color = '';
          loading.textContent = '回答を生成中';
          fetchAnswer(article, question, block);
        });
        loading.appendChild(retryBtn);
      }
    }
  }

  /** Shared answer fetch logic for askQuestion and retry */
  async function fetchAnswer(article, question, block) {
    const cacheKey = `${article.title}|${question}`;
    try {
      const data = await Api.askArticleQuestion(article.title, article.description, article.source, question, article.url);
      const answer = data.answer || '回答を取得できませんでした';
      EcoSystem.setQueryCache(cacheKey, answer);
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        typewriterEffect(loading, answer);
      }
    } catch {
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        loading.style.color = 'var(--muted)';
        const errText = document.createTextNode('回答の取得に失敗しました ');
        loading.appendChild(errText);
        const retryBtn = document.createElement('button');
        retryBtn.className = 'detail-q-chip';
        retryBtn.type = 'button';
        retryBtn.textContent = '再試行';
        retryBtn.addEventListener('click', () => {
          loading.className = 'detail-answer-loading';
          loading.style.color = '';
          loading.textContent = '回答を生成中';
          fetchAnswer(article, question, block);
        });
        loading.appendChild(retryBtn);
      }
    }
  }

  /** Typewriter effect for answer display */
  function typewriterEffect(el, text) {
    const speed = Storage.get('typewriterSpeed');
    if (!speed || speed <= 0) {
      el.textContent = text;
      const detailBody = els.detailPanel ? els.detailPanel.querySelector('.detail-body') : null;
      if (detailBody) detailBody.scrollTop = detailBody.scrollHeight;
      return;
    }
    let i = 0;
    const detailBody = els.detailPanel ? els.detailPanel.querySelector('.detail-body') : null;
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        if (detailBody && i % 5 === 0) {
          detailBody.scrollTop = detailBody.scrollHeight;
        }
        setTimeout(tick, speed);
      } else if (detailBody) {
        detailBody.scrollTop = detailBody.scrollHeight;
      }
    }
    tick();
  }

  // --- Auto-Refresh ---

  function setupAutoRefresh() {
    const interval = Storage.get('autoRefresh');
    setAutoRefresh(interval);
  }

  function setAutoRefresh(minutes) {
    Storage.set('autoRefresh', minutes);
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    if (minutes > 0) {
      autoRefreshTimer = setInterval(() => {
        if (!document.hidden && !isLoading && !detailOpen) {
          loadArticles();
        }
      }, minutes * 60 * 1000);
    }
  }

  // Expose for chat commands
  function refresh() {
    loadCategories();
    loadArticles();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { setCategory, getCategories, refresh, setAutoRefresh };
})();

/**
 * EcoSystem — Token economy, query caching, smart cache management
 * - Cache hit rate: 0-99% configurable (default 20%)
 * - Lower cache rate = more eco points
 * - 1 query = 1 token
 * - Articles with <30% view probability → cache dropped
 * - Offline miss on dropped cache → earn tokens when back online
 */
const EcoSystem = (() => {
  const STORAGE_KEY = 'hn_eco';
  let state = {
    tokens: 100,       // Starting tokens
    ecoPoints: 0,      // Eco points earned
    cacheRate: 20,     // 0-99%, default 20%
    queryCache: {},     // { key: { answer, ts } }
    viewStats: {},      // { articleId: { views: N, shown: N } }
    offlineQueue: [],   // Articles clicked offline that were cache-dropped
    totalQueries: 0,
    cacheHits: 0,
  };

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state = { ...state, ...saved };
      }
    } catch { /* ignore */ }
    renderEcoStatus();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota */ }
  }

  function consumeToken() {
    state.totalQueries++;
    if (state.tokens > 0) state.tokens--;
    // Award eco points based on inverse cache rate
    // Lower cache rate = more eco points per query
    const ecoMultiplier = Math.max(1, Math.floor((100 - state.cacheRate) / 10));
    state.ecoPoints += ecoMultiplier;
    save();
    renderEcoStatus();
  }

  function getQueryCache(key) {
    const entry = state.queryCache[key];
    if (!entry) return null;
    state.cacheHits++;
    save();
    return entry.answer;
  }

  function setQueryCache(key, answer) {
    state.queryCache[key] = { answer, ts: Date.now() };
    // Prune old cache entries (keep latest 500)
    const entries = Object.entries(state.queryCache);
    if (entries.length > 500) {
      entries.sort((a, b) => a[1].ts - b[1].ts);
      const toRemove = entries.slice(0, entries.length - 500);
      for (const [k] of toRemove) delete state.queryCache[k];
    }
    save();
  }

  function setCacheRate(rate) {
    state.cacheRate = Math.max(0, Math.min(99, Math.floor(rate)));
    save();
    renderEcoStatus();
  }

  function getCacheRate() {
    return state.cacheRate;
  }

  function recordView(articleId) {
    if (!state.viewStats[articleId]) {
      state.viewStats[articleId] = { views: 0, shown: 0 };
    }
    state.viewStats[articleId].views++;
    save();
  }

  function recordShown(articleId) {
    if (!state.viewStats[articleId]) {
      state.viewStats[articleId] = { views: 0, shown: 0 };
    }
    state.viewStats[articleId].shown++;
    save();
  }

  /** Get view probability for an article (views / shown) */
  function getViewProbability(articleId) {
    const s = state.viewStats[articleId];
    if (!s || s.shown === 0) return 0.5; // unknown → assume 50%
    return s.views / s.shown;
  }

  /** Should this article's cache be kept? */
  function shouldKeepCache(articleId) {
    return getViewProbability(articleId) >= 0.3;
  }

  /** Record offline miss — user clicked article that had no cache */
  function recordOfflineMiss(articleId) {
    if (!state.offlineQueue.includes(articleId)) {
      state.offlineQueue.push(articleId);
      save();
    }
  }

  /** Process pending offline queue when back online — award tokens */
  function processOfflineQueue() {
    if (state.offlineQueue.length === 0) return;
    const earned = state.offlineQueue.length;
    state.tokens += earned;
    // Learn: these articles should be cached next time
    for (const id of state.offlineQueue) {
      if (!state.viewStats[id]) {
        state.viewStats[id] = { views: 0, shown: 0 };
      }
      // Boost view count to increase future cache probability
      state.viewStats[id].views += 3;
      state.viewStats[id].shown += 1;
    }
    state.offlineQueue = [];
    save();
    renderEcoStatus();
  }

  function renderEcoStatus() {
    let badge = document.getElementById('eco-status');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'eco-status';
      badge.className = 'eco-status';
      document.body.appendChild(badge);
    }
    badge.innerHTML =
      `<span class="eco-tokens" title="トークン残量">${state.tokens}T</span>` +
      `<span class="eco-points" title="エコポイント（キャッシュ率${state.cacheRate}%）">${state.ecoPoints}EP</span>`;
  }

  function getState() { return { ...state }; }

  return {
    init, consumeToken, getQueryCache, setQueryCache,
    setCacheRate, getCacheRate,
    recordView, recordShown, getViewProbability, shouldKeepCache,
    recordOfflineMiss, processOfflineQueue,
    getState, save,
  };
})();
