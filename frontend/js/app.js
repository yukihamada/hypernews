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
  let searchDebounceTimer = null;
  let isSearchMode = false;
  let bookmarkPanelOpen = false;

  const els = {};

  function init() {
    if (typeof ErrorTracker !== 'undefined') ErrorTracker.init();
    if (typeof Vitals !== 'undefined') Vitals.init();

    // Branch to dedicated UI for each site
    if (typeof Site !== 'undefined') {
      const s = Site.id;
      if (s === 'online' && typeof FeedApp !== 'undefined') { FeedApp.init(); return; }
      if (s === 'cloud' && typeof CloudApp !== 'undefined') { CloudApp.init(); return; }
      if (s === 'chatnews' && typeof ChatNewsApp !== 'undefined') { ChatNewsApp.init(); return; }
      if (s === 'yournews' && typeof YourNewsApp !== 'undefined') { YourNewsApp.init(); return; }
      if (s === 'velo' && typeof VeloApp !== 'undefined') { VeloApp.init(); return; }
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
    els.searchToggle = document.getElementById('search-toggle');
    els.searchBar = document.getElementById('search-bar');
    els.searchInput = document.getElementById('search-input');
    els.searchClear = document.getElementById('search-clear');
    els.bookmarkToggle = document.getElementById('bookmark-toggle');
    els.bookmarkPanel = document.getElementById('bookmark-panel');
    els.bookmarkOverlay = document.getElementById('bookmark-overlay');
    els.bookmarkList = document.getElementById('bookmark-list');
    els.bookmarkClose = document.getElementById('bookmark-close');
    els.bookmarkClearBtn = document.getElementById('bookmark-clear-btn');
    els.bookmarkFooter = document.getElementById('bookmark-footer');

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

    // Handle /article/:id permalink on page load
    checkArticlePermalink();

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.articleId) {
        loadArticleById(e.state.articleId);
      } else if (detailOpen) {
        closeDetail();
      }
    });

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
        id: articleEl?.dataset.articleId || '',
        title: link.textContent,
        url: link.href,
        source: articleEl?.querySelector('.article-source')?.textContent || '',
        time: articleEl?.querySelector('time')?.textContent || '',
        description: articleEl?.querySelector('.article-desc')?.textContent || '',
        imageUrl: articleEl?.querySelector('.article-img-wrap .article-img')?.src || '',
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

    // Google Auth + Konami
    if (typeof GoogleAuth !== 'undefined') GoogleAuth.init();
    if (typeof Konami !== 'undefined') Konami.init();

    // Ads init (Free users only)
    if (typeof Ads !== 'undefined') Ads.init();

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

    // Search toggle + input handlers
    if (els.searchToggle && els.searchBar && els.searchInput) {
      els.searchToggle.addEventListener('click', toggleSearch);

      els.searchInput.addEventListener('input', () => {
        const q = els.searchInput.value.trim();
        els.searchClear.hidden = !q;
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          if (q.length > 0) {
            performSearch(q);
          } else {
            exitSearch();
          }
        }, 300);
      });

      els.searchClear.addEventListener('click', () => {
        els.searchInput.value = '';
        els.searchClear.hidden = true;
        exitSearch();
        els.searchInput.focus();
      });

      // Cmd/Ctrl+K to toggle search
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          toggleSearch();
        }
      });
    }

    // Bookmark panel handlers
    if (els.bookmarkToggle && els.bookmarkPanel) {
      els.bookmarkToggle.addEventListener('click', openBookmarkPanel);
      els.bookmarkClose.addEventListener('click', closeBookmarkPanel);
      els.bookmarkOverlay.addEventListener('click', closeBookmarkPanel);
      els.bookmarkClearBtn.addEventListener('click', () => {
        Bookmarks.clear();
        renderBookmarkList();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && bookmarkPanelOpen) closeBookmarkPanel();
      });
    }

    // Auto-refresh setup
    setupAutoRefresh();

    // Offline/online detection
    setupOfflineDetection();

    // Battery saving
    setupBatterySaving();

    // Prefetch categories for offline after idle + prefetch 3-min summary
    if (navigator.onLine) {
      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
      idle(() => {
        prefetchForOffline();
        Api.summarizeArticles(3).catch(() => {});
      });
    }
  }

  // --- Search ---

  function toggleSearch() {
    const isOpen = els.searchBar.classList.contains('open');
    if (isOpen) {
      closeSearch();
    } else {
      els.searchBar.hidden = false;
      requestAnimationFrame(() => {
        els.searchBar.classList.add('open');
        els.searchToggle.classList.add('active');
        els.searchInput.focus();
      });
    }
  }

  function closeSearch() {
    els.searchBar.classList.remove('open');
    els.searchToggle.classList.remove('active');
    els.searchInput.value = '';
    els.searchClear.hidden = true;
    if (isSearchMode) exitSearch();
    setTimeout(() => { els.searchBar.hidden = true; }, 250);
  }

  async function performSearch(query) {
    isSearchMode = true;
    els.loadMoreWrap.style.display = 'none';
    els.sentinel.style.display = 'none';
    Renderer.renderSkeletons(els.articles);
    try {
      const data = await Api.searchArticles(query);
      Renderer.render(els.articles, data.articles, false);
      // Observe for read tracking
      const hideRead = Storage.get('hideReadArticles');
      els.articles.querySelectorAll('.article:not([data-observed])').forEach(el => {
        el.dataset.observed = '1';
        readObserver.observe(el);
        if (el.dataset.articleId && ReadHistory.isRead(el.dataset.articleId)) {
          el.classList.add('read');
          if (hideRead) el.style.display = 'none';
        }
      });
    } catch {
      els.articles.innerHTML = '<div class="loading">検索に失敗しました</div>';
    }
  }

  function exitSearch() {
    if (!isSearchMode) return;
    isSearchMode = false;
    loadArticles();
  }

  // --- Bookmark Panel ---

  function openBookmarkPanel() {
    bookmarkPanelOpen = true;
    renderBookmarkList();
    els.bookmarkPanel.hidden = false;
    els.bookmarkOverlay.hidden = false;
    requestAnimationFrame(() => {
      els.bookmarkPanel.classList.add('open');
      els.bookmarkOverlay.classList.add('open');
    });
  }

  function closeBookmarkPanel() {
    bookmarkPanelOpen = false;
    els.bookmarkPanel.classList.remove('open');
    els.bookmarkOverlay.classList.remove('open');
    setTimeout(() => {
      els.bookmarkPanel.hidden = true;
      els.bookmarkOverlay.hidden = true;
    }, 250);
  }

  function renderBookmarkList() {
    const all = Bookmarks.getAll();
    if (all.length === 0) {
      els.bookmarkList.innerHTML = '<div class="bookmark-empty">ブックマークした記事はありません</div>';
      els.bookmarkFooter.hidden = true;
      return;
    }
    els.bookmarkFooter.hidden = false;
    els.bookmarkList.innerHTML = '';
    for (const bm of all) {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.innerHTML =
        `<div class="bookmark-item-title"><a href="${Renderer.escHtml(bm.url)}" target="_blank" rel="noopener">${Renderer.escHtml(bm.title)}</a></div>` +
        `<div class="bookmark-item-meta">${Renderer.escHtml(bm.source || '')}</div>`;
      els.bookmarkList.appendChild(item);
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
      // Show banner ad below articles (first load only)
      if (!append && typeof Ads !== 'undefined') {
        Ads.showBannerAd(els.articles.parentNode);
      }
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

    // Push permalink URL
    if (article.id) {
      history.pushState({ articleId: article.id }, '', `/article/${article.id}`);
    }

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
    // Restore URL
    if (location.pathname.startsWith('/article/')) {
      history.pushState(null, '', '/');
    }
  }

  function checkArticlePermalink() {
    const match = location.pathname.match(/^\/article\/(.+)$/);
    if (match) {
      loadArticleById(decodeURIComponent(match[1]));
    }
  }

  async function loadArticleById(id) {
    try {
      const data = await Api.getArticleById(id);
      if (data.article) {
        const a = data.article;
        const proxyImg = a.image_url ? '/api/image-proxy?url=' + encodeURIComponent(a.image_url) : '';
        openDetail({
          id: a.id,
          title: a.title,
          url: a.url,
          source: a.source,
          time: a.published_at ? new Date(a.published_at).toLocaleString('ja-JP') : '',
          description: a.description || '',
          imageUrl: proxyImg,
        });
      }
    } catch {
      // Article not found — stay on main page
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
    const block = document.createElement('div');
    block.className = 'detail-answer-block';
    block.innerHTML = `<div class="detail-answer-q">${Renderer.escHtml(question)}</div><div class="detail-answer-loading">回答を生成中</div>`;
    els.detailAnswers.appendChild(block);
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const detailBody = els.detailPanel.querySelector('.detail-body');
    if (detailBody) {
      detailBody.scrollTop = detailBody.scrollHeight;
    }

    // Check cache FIRST — earn tokens on hit
    const cacheKey = `${article.title}|${question}`;
    const cached = EcoSystem.getQueryCache(cacheKey);

    if (cached) {
      EcoSystem.earnFromCache();
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        typewriterEffect(loading, cached);
      }
      return;
    }

    // Cache miss — check token balance
    if (!EcoSystem.canAfford('ask')) {
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.style.color = 'var(--muted)';
        loading.innerHTML = 'トークン不足です。<a href="/pro.html" style="color:var(--accent);text-decoration:underline">Proプラン</a>で無制限に。';
      }
      return;
    }

    // Spend tokens
    EcoSystem.spend('ask');

    try {
      // Fetch AI answer and related articles in parallel
      const [data, searchData] = await Promise.all([
        Api.askArticleQuestion(article.title, article.description, article.source, question, article.url),
        Api.searchArticles(question, 5).catch(() => ({ articles: [] })),
      ]);
      const answer = data.answer || '回答を取得できませんでした';
      EcoSystem.setQueryCache(cacheKey, answer);
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.textContent = '';
        typewriterEffect(loading, answer);
      }
      // Show related articles from search
      const related = (searchData.articles || []).filter(a => a.url !== article.url).slice(0, 3);
      if (related.length > 0) {
        appendRelatedArticles(block, related);
      }
    } catch {
      // Refund tokens on API failure
      EcoSystem.refund('ask');
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

  function appendRelatedArticles(block, articles) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-related';
    wrap.innerHTML = '<div class="detail-related-label">関連記事</div>';
    for (const a of articles) {
      const link = document.createElement('a');
      link.className = 'detail-related-item';
      link.href = a.url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.innerHTML = `<span class="detail-related-source">${Renderer.escHtml(a.source)}</span> ${Renderer.escHtml(a.title)}`;
      wrap.appendChild(link);
    }
    block.appendChild(wrap);
  }

  /** Shared answer fetch logic for askQuestion and retry */
  async function fetchAnswer(article, question, block) {
    if (!EcoSystem.canAfford('ask')) {
      const loading = block.querySelector('.detail-answer-loading');
      if (loading) {
        loading.className = 'detail-answer-a';
        loading.style.color = 'var(--muted)';
        loading.innerHTML = 'トークン不足です。<a href="/pro.html" style="color:var(--accent);text-decoration:underline">Proプラン</a>で無制限に。';
      }
      return;
    }
    EcoSystem.spend('ask');
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
      EcoSystem.refund('ask');
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
 * EcoSystem — AI Token Economy
 *
 * Core mechanic:
 *   AI問い合わせ → トークン消費
 *   キャッシュヒット → トークン獲得
 *
 * This creates a sustainable loop: popular queries get cached,
 * cache hits earn tokens, which fund new unique queries.
 *
 * Costs:  ask=3, questions=2, summarize=5, tts=2, podcast=5
 * Reward: cache hit = +2 tokens
 * Daily:  +15 tokens (cap 100)
 */
const EcoSystem = (() => {
  const STORAGE_KEY = 'hn_eco';
  const INITIAL_TOKENS = 30;
  const MAX_TOKENS = 100;
  const DAILY_REFILL = 15;
  const CACHE_REWARD = 2;
  const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

  const COSTS = {
    ask: 3,
    questions: 2,
    summarize: 5,
    tts: 2,
    podcast: 5,
  };

  let state = {
    tokens: INITIAL_TOKENS,
    totalEarned: 0,
    totalSpent: 0,
    cacheHits: 0,
    cacheMisses: 0,
    queryCache: {},
    lastRefill: null,
    konamiActive: false,
  };

  function getMaxTokens() {
    return state.konamiActive ? 10000 : MAX_TOKENS;
  }

  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        state = { ...state, ...saved };
      }
    } catch { /* ignore */ }
    checkDailyRefill();
    renderEcoStatus();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota */ }
  }

  function checkDailyRefill() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastRefill !== today) {
      const before = state.tokens;
      state.tokens = Math.min(state.tokens + DAILY_REFILL, getMaxTokens());
      state.lastRefill = today;
      save();
      if (state.tokens > before) {
        setTimeout(() => animateChange(state.tokens - before), 500);
      }
    }
  }

  /** Check if user can afford a feature */
  function canAfford(feature) {
    if (typeof Subscription !== 'undefined' && Subscription.isPro()) return true;
    return state.tokens >= (COSTS[feature] || 1);
  }

  /** Spend tokens for an AI query (cache miss) */
  function spend(feature) {
    if (typeof Subscription !== 'undefined' && Subscription.isPro()) return;
    const cost = COSTS[feature] || 1;
    state.tokens = Math.max(0, state.tokens - cost);
    state.totalSpent += cost;
    state.cacheMisses++;
    save();
    renderEcoStatus();
    animateChange(-cost);
  }

  /** Refund tokens on API failure */
  function refund(feature) {
    if (typeof Subscription !== 'undefined' && Subscription.isPro()) return;
    const cost = COSTS[feature] || 1;
    state.tokens = Math.min(state.tokens + cost, getMaxTokens());
    state.totalSpent -= cost;
    state.cacheMisses--;
    save();
    renderEcoStatus();
    animateChange(+cost);
  }

  /** Earn tokens from a cache hit */
  function earnFromCache() {
    if (typeof Subscription !== 'undefined' && Subscription.isPro()) return;
    state.tokens = Math.min(state.tokens + CACHE_REWARD, getMaxTokens());
    state.totalEarned += CACHE_REWARD;
    state.cacheHits++;
    save();
    renderEcoStatus();
    animateChange(+CACHE_REWARD);
  }

  /** Award konami bonus tokens */
  function awardKonami(amount) {
    state.konamiActive = true;
    state.tokens = Math.min(state.tokens + amount, 10000);
    state.totalEarned += amount;
    save();
    renderEcoStatus();
    animateChange(+amount);
  }

  function getQueryCache(key) {
    const entry = state.queryCache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
      delete state.queryCache[key];
      save();
      return null;
    }
    return entry.answer;
  }

  function setQueryCache(key, answer) {
    state.queryCache[key] = { answer, ts: Date.now() };
    const entries = Object.entries(state.queryCache);
    if (entries.length > 300) {
      entries.sort((a, b) => a[1].ts - b[1].ts);
      for (const [k] of entries.slice(0, entries.length - 300)) {
        delete state.queryCache[k];
      }
    }
    save();
  }

  function recordView() { /* noop — kept for compat */ }
  function processOfflineQueue() { /* noop */ }

  function renderEcoStatus() {
    let badge = document.getElementById('eco-status');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'eco-status';
      badge.className = 'eco-status';
      document.body.appendChild(badge);
    }
    const total = state.cacheHits + state.cacheMisses;
    const hitRate = total > 0 ? Math.round(state.cacheHits / total * 100) : 0;
    const isPro = typeof Subscription !== 'undefined' && Subscription.isPro();
    const low = !isPro && state.tokens <= 5;
    badge.innerHTML = isPro
      ? `<span class="eco-tokens eco-tokens--pro" title="Pro: 無制限">∞<small>T</small></span>` +
        `<span class="eco-hitrate" title="キャッシュヒット率 ${state.cacheHits}/${total}">${hitRate}%<small>HIT</small></span>`
      : `<span class="eco-tokens${low ? ' eco-tokens--low' : ''}" title="AIトークン（毎日+${DAILY_REFILL}）">${state.tokens}<small>T</small></span>` +
        `<span class="eco-hitrate" title="キャッシュヒット率 ${state.cacheHits}/${total}">${hitRate}%<small>HIT</small></span>`;
  }

  function animateChange(delta) {
    const badge = document.getElementById('eco-status');
    if (!badge) return;
    const popup = document.createElement('span');
    popup.className = 'eco-popup ' + (delta > 0 ? 'eco-popup--earn' : 'eco-popup--spend');
    popup.textContent = delta > 0 ? `+${delta}` : `${delta}`;
    badge.appendChild(popup);
    popup.addEventListener('animationend', () => popup.remove());
    setTimeout(() => popup.remove(), 1500);
  }

  function getState() { return { ...state }; }

  return {
    init, canAfford, spend, refund, earnFromCache,
    getQueryCache, setQueryCache,
    recordView, processOfflineQueue,
    getState, save, renderEcoStatus, awardKonami,
  };
})();
