/**
 * feed.js — Vertical swipe feed controller for news.online
 * Handles article loading, scroll-snap navigation, and category filtering.
 */
'use strict';

const FeedApp = (() => {
  let currentCategory = '';
  let currentCursor = null;
  let isLoading = false;
  let categories = [];
  let feedContainer = null;
  let categoryBar = null;
  let activeObserver = null;
  let currentActiveItem = null;

  function init() {
    // Hide standard news UI
    const header = document.querySelector('.header');
    const main = document.querySelector('.main');
    const detailPanel = document.getElementById('detail-panel');
    const detailOverlay = document.getElementById('detail-overlay');
    const chatPanel = document.getElementById('chat-panel');
    const ecoStatus = document.getElementById('eco-status');
    if (header) header.style.display = 'none';
    if (main) main.style.display = 'none';
    if (detailPanel) detailPanel.style.display = 'none';
    if (detailOverlay) detailOverlay.style.display = 'none';
    if (chatPanel) chatPanel.style.display = 'none';
    if (ecoStatus) ecoStatus.style.display = 'none';

    // Set dark mode for feed
    document.body.dataset.mode = 'dark';
    document.body.style.background = '#000';

    // Create feed container
    feedContainer = document.createElement('div');
    feedContainer.className = 'feed-container';
    feedContainer.id = 'feed-container';
    document.body.appendChild(feedContainer);

    // Create category bar
    categoryBar = document.createElement('nav');
    categoryBar.className = 'feed-category-bar';
    categoryBar.id = 'feed-category-bar';
    document.body.appendChild(categoryBar);

    // Category bar click
    categoryBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.feed-cat-btn');
      if (!btn) return;
      const cat = btn.dataset.category;
      setCategory(cat);
    });

    // IntersectionObserver for active item detection
    activeObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          setActiveItem(entry.target);
        }
      }
    }, { threshold: [0.6] });

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);

    // Infinite scroll detection
    feedContainer.addEventListener('scroll', onScroll, { passive: true });

    // Init voice interaction
    if (typeof FeedVoice !== 'undefined') {
      FeedVoice.init();
    }

    // Create settings bottom sheet
    createSettingsSheet();

    // Load data
    loadCategories();
    loadArticles();
  }

  function handleKeyboard(e) {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigateNext();
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigatePrev();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentActiveItem && typeof FeedPlayer !== 'undefined') {
        FeedPlayer.togglePlay(currentActiveItem);
      }
    }
  }

  function navigateNext() {
    if (!currentActiveItem) return;
    const next = currentActiveItem.nextElementSibling;
    if (next && next.classList.contains('feed-item')) {
      next.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function navigatePrev() {
    if (!currentActiveItem) return;
    const prev = currentActiveItem.previousElementSibling;
    if (prev && prev.classList.contains('feed-item')) {
      prev.scrollIntoView({ behavior: 'smooth' });
    }
  }

  let announceEnabled = true; // Announce titles via browser TTS

  function setActiveItem(item) {
    if (currentActiveItem === item) return;

    // Deactivate previous
    if (currentActiveItem) {
      currentActiveItem.classList.remove('active');
      if (typeof FeedPlayer !== 'undefined') {
        FeedPlayer.onItemDeactivated(currentActiveItem);
      }
    }

    // Stop any ongoing browser speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    currentActiveItem = item;
    item.classList.add('active');

    // Announce article title via browser TTS
    if (announceEnabled && window.speechSynthesis) {
      const title = item.dataset.title || '';
      const source = item.dataset.source || '';
      if (title) {
        const utterance = new SpeechSynthesisUtterance(
          source ? `${source}。${title}` : title
        );
        utterance.lang = 'ja-JP';
        utterance.rate = 1.1;
        utterance.volume = 0.7;
        window.speechSynthesis.speak(utterance);
      }
    }

    // Auto-play podcast if available
    if (typeof FeedPlayer !== 'undefined') {
      FeedPlayer.onItemActivated(item);
    }
  }

  function setAnnounce(enabled) {
    announceEnabled = enabled;
    if (!enabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  let scrollTimer = null;
  function onScroll() {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      // Check if near bottom → load more
      const { scrollTop, scrollHeight, clientHeight } = feedContainer;
      if (scrollHeight - scrollTop - clientHeight < clientHeight * 1.5 && currentCursor && !isLoading) {
        loadArticles(true);
      }
    }, 200);
  }

  async function loadCategories() {
    try {
      categories = await Api.fetchCategories();
    } catch {
      categories = [
        { id: 'general', label_ja: '総合' },
        { id: 'tech', label_ja: 'テクノロジー' },
        { id: 'business', label_ja: 'ビジネス' },
        { id: 'entertainment', label_ja: 'エンタメ' },
        { id: 'sports', label_ja: 'スポーツ' },
        { id: 'science', label_ja: 'サイエンス' },
      ];
    }
    renderCategories();
  }

  function renderCategories() {
    categoryBar.innerHTML = '';
    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'feed-cat-btn' + (currentCategory === '' ? ' active' : '');
    allBtn.dataset.category = '';
    allBtn.textContent = 'すべて';
    categoryBar.appendChild(allBtn);

    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.className = 'feed-cat-btn' + (currentCategory === cat.id ? ' active' : '');
      btn.dataset.category = cat.id;
      btn.textContent = cat.label_ja || cat.label || cat.id;
      categoryBar.appendChild(btn);
    }
  }

  function setCategory(cat) {
    currentCategory = cat;
    renderCategories();
    loadArticles();
  }

  async function loadArticles(append = false) {
    if (isLoading) return;
    isLoading = true;

    if (!append) {
      currentCursor = null;
      feedContainer.innerHTML = '';
      // Show loading skeleton
      for (let i = 0; i < 3; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'feed-item';
        skeleton.style.background = '#111';
        skeleton.style.display = 'flex';
        skeleton.style.alignItems = 'center';
        skeleton.style.justifyContent = 'center';
        skeleton.innerHTML = '<div style="color:rgba(255,255,255,0.3);font-size:14px">読み込み中...</div>';
        feedContainer.appendChild(skeleton);
      }
    }

    try {
      const params = new URLSearchParams();
      if (currentCategory) params.set('category', currentCategory);
      params.set('limit', '10');
      if (append && currentCursor) params.set('cursor', currentCursor);

      const res = await fetch(`/api/feed?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      if (!append) {
        feedContainer.innerHTML = '';
      }

      for (const article of data.articles) {
        const item = createFeedItem(article);
        feedContainer.appendChild(item);
        activeObserver.observe(item);
      }

      currentCursor = data.next_cursor || null;

      // If first load, scroll to top
      if (!append && feedContainer.firstChild) {
        feedContainer.scrollTop = 0;
      }
    } catch (e) {
      console.error('Feed load error:', e);
      if (!append) {
        feedContainer.innerHTML = '<div class="feed-item" style="display:flex;align-items:center;justify-content:center"><div style="color:rgba(255,255,255,0.5);font-size:14px">ニュースの読み込みに失敗しました</div></div>';
      }
    } finally {
      isLoading = false;
    }
  }

  function createFeedItem(article) {
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.dataset.articleId = article.article_id || '';
    item.dataset.category = article.category || '';
    item.dataset.title = article.title || '';
    item.dataset.description = article.description || '';
    item.dataset.source = article.source || '';
    item.dataset.url = article.url || '';

    const hasImage = article.image_url && article.image_url.trim() !== '';
    if (!hasImage) {
      item.classList.add('feed-item--no-image');
    }

    // Time ago
    const timeAgo = formatTimeAgo(article.published_at);

    // Category label
    const catInfo = categories.find(c => c.id === article.category);
    const catLabel = catInfo ? (catInfo.label_ja || catInfo.label) : (article.category || '');

    item.innerHTML = `
      <div class="feed-item__bg" ${hasImage ? `style="background-image:url('${escHtml(article.image_url)}')"` : ''}></div>
      <div class="feed-item__actions">
        <button class="feed-action-btn feed-action-share" aria-label="シェア">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>シェア</span>
        </button>
        <a class="feed-action-btn feed-action-source" href="${escHtml(article.url || '#')}" target="_blank" rel="noopener" aria-label="元記事">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>元記事</span>
        </a>
      </div>
      <div class="feed-item__content">
        ${catLabel ? `<span class="feed-item__category">${escHtml(catLabel)}</span>` : ''}
        <h2 class="feed-item__title">${escHtml(article.title || '')}</h2>
        ${article.description ? `<p class="feed-item__desc">${escHtml(article.description)}</p>` : ''}
        <div class="feed-item__meta">
          <span>${escHtml(article.source || '')}</span>
          ${timeAgo ? `<span class="feed-item__meta-dot"></span><span>${timeAgo}</span>` : ''}
        </div>
      </div>
      <div class="feed-item__player">
        <div class="player__speakers">
          <div class="player__avatar player__avatar--host" data-speaker="host">H</div>
          <span class="player__avatar-label">Host</span>
          <div class="player__avatar player__avatar--analyst" data-speaker="analyst">A</div>
          <span class="player__avatar-label">Analyst</span>
        </div>
        <div class="player__subtitle">
          <span class="player__subtitle-text">タップして再生</span>
        </div>
        <div class="player__controls">
          <button class="player__play-btn" aria-label="再生">
            <svg class="player__play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg class="player__pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
            <div class="player__loading-indicator"></div>
          </button>
          <div class="player__progress-wrap">
            <div class="player__progress-bar"></div>
          </div>
          <span class="player__time">0:00</span>
        </div>
      </div>
    `;

    // Share button
    item.querySelector('.feed-action-share').addEventListener('click', () => {
      const shareData = { title: article.title, url: article.url };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(article.url).catch(() => {});
      }
    });

    // Play button
    item.querySelector('.player__play-btn').addEventListener('click', () => {
      if (typeof FeedPlayer !== 'undefined') {
        FeedPlayer.togglePlay(item);
      }
    });

    return item;
  }

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
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function autoScrollNext() {
    if (!currentActiveItem) return;
    const next = currentActiveItem.nextElementSibling;
    if (next && next.classList.contains('feed-item')) {
      next.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- Settings Bottom Sheet ---

  function createSettingsSheet() {
    // Settings button (top-right)
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'feed-settings-btn';
    settingsBtn.setAttribute('aria-label', '設定');
    settingsBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
    document.body.appendChild(settingsBtn);

    // Bottom sheet overlay
    const overlay = document.createElement('div');
    overlay.className = 'feed-sheet-overlay';
    overlay.id = 'feed-sheet-overlay';
    document.body.appendChild(overlay);

    // Bottom sheet
    const sheet = document.createElement('div');
    sheet.className = 'feed-sheet';
    sheet.id = 'feed-sheet';

    // Load saved settings
    const savedAnnounce = localStorage.getItem('feed_announce') !== 'false';
    const savedAutoScroll = localStorage.getItem('feed_auto_scroll') !== 'false';
    const savedAutoPlay = localStorage.getItem('feed_auto_play') === 'true';

    announceEnabled = savedAnnounce;

    sheet.innerHTML = `
      <div class="feed-sheet__handle"></div>
      <h2 class="feed-sheet__title">設定</h2>

      <div class="feed-sheet__section">
        <h3 class="feed-sheet__section-title">音声</h3>
        <label class="feed-sheet__toggle">
          <span class="feed-sheet__toggle-label">タイトル読み上げ</span>
          <span class="feed-sheet__toggle-desc">記事をスワイプしたとき、タイトルを音声で読み上げます</span>
          <input type="checkbox" id="setting-announce" ${savedAnnounce ? 'checked' : ''}>
          <span class="feed-sheet__toggle-switch"></span>
        </label>
        <label class="feed-sheet__toggle">
          <span class="feed-sheet__toggle-label">再生後に自動スクロール</span>
          <span class="feed-sheet__toggle-desc">ポッドキャスト再生完了後、次の記事に自動移動</span>
          <input type="checkbox" id="setting-auto-scroll" ${savedAutoScroll ? 'checked' : ''}>
          <span class="feed-sheet__toggle-switch"></span>
        </label>
      </div>

      <div class="feed-sheet__section">
        <h3 class="feed-sheet__section-title">表示</h3>
        <div class="feed-sheet__row">
          <span>フォントサイズ</span>
          <div class="feed-sheet__font-btns">
            <button class="feed-sheet__font-btn" data-size="small">A</button>
            <button class="feed-sheet__font-btn active" data-size="medium">A</button>
            <button class="feed-sheet__font-btn" data-size="large">A</button>
          </div>
        </div>
      </div>

      <div class="feed-sheet__section">
        <h3 class="feed-sheet__section-title">情報</h3>
        <div class="feed-sheet__info">
          <span>news.online</span>
          <span style="opacity:0.5">AIニュースポッドキャスト</span>
        </div>
        <div class="feed-sheet__info">
          <span>音声コマンド</span>
          <span style="opacity:0.5">マイクボタンを押して「次」「再生」「テクノロジー」など</span>
        </div>
        <div class="feed-sheet__info">
          <span>キーボード</span>
          <span style="opacity:0.5">↑↓ ナビ / Space 再生・停止</span>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);

    // Event handlers
    settingsBtn.addEventListener('click', () => toggleSheet(true));
    overlay.addEventListener('click', () => toggleSheet(false));

    // Settings change handlers
    sheet.querySelector('#setting-announce').addEventListener('change', (e) => {
      announceEnabled = e.target.checked;
      localStorage.setItem('feed_announce', e.target.checked);
      if (!e.target.checked && window.speechSynthesis) window.speechSynthesis.cancel();
    });

    sheet.querySelector('#setting-auto-scroll').addEventListener('change', (e) => {
      localStorage.setItem('feed_auto_scroll', e.target.checked);
    });

    // Font size buttons
    const fontBtns = sheet.querySelectorAll('.feed-sheet__font-btn');
    const savedFont = localStorage.getItem('feed_font_size') || 'medium';
    fontBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === savedFont);
      btn.addEventListener('click', () => {
        fontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFontSize(btn.dataset.size);
        localStorage.setItem('feed_font_size', btn.dataset.size);
      });
    });
    applyFontSize(savedFont);

    // Swipe down to close
    let touchStartY = 0;
    sheet.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 60) toggleSheet(false);
    }, { passive: true });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.classList.contains('open')) {
        toggleSheet(false);
      }
    });

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .feed-settings-btn {
        position: fixed;
        top: max(12px, env(safe-area-inset-top, 12px));
        right: 12px;
        z-index: 11;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px) saturate(180%);
        -webkit-backdrop-filter: blur(10px) saturate(180%);
        color: rgba(255,255,255,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: all 0.2s;
      }
      .feed-settings-btn:active { transform: scale(0.92); }
      .feed-sheet-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        background: rgba(0,0,0,0.5);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }
      .feed-sheet-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }
      .feed-sheet {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 51;
        background: rgba(28, 28, 30, 0.85);
        backdrop-filter: blur(40px) saturate(180%);
        -webkit-backdrop-filter: blur(40px) saturate(180%);
        border-radius: 20px 20px 0 0;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding: 12px 20px 32px;
        padding-bottom: max(32px, env(safe-area-inset-bottom, 32px));
        transform: translateY(100%);
        transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
        max-height: 80dvh;
        overflow-y: auto;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif;
      }
      .feed-sheet.open {
        transform: translateY(0);
      }
      .feed-sheet__handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255,255,255,0.2);
        margin: 0 auto 16px;
      }
      .feed-sheet__title {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 20px;
      }
      .feed-sheet__section {
        margin-bottom: 24px;
      }
      .feed-sheet__section-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255,255,255,0.4);
        margin-bottom: 12px;
      }
      .feed-sheet__toggle {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .feed-sheet__toggle-label {
        flex: 1;
        font-size: 15px;
        font-weight: 500;
      }
      .feed-sheet__toggle-desc {
        width: 100%;
        font-size: 12px;
        color: rgba(255,255,255,0.4);
        line-height: 1.4;
        margin-top: -4px;
      }
      .feed-sheet__toggle input {
        display: none;
      }
      .feed-sheet__toggle-switch {
        width: 44px;
        height: 26px;
        border-radius: 13px;
        background: rgba(255,255,255,0.15);
        position: relative;
        flex-shrink: 0;
        transition: background 0.2s;
      }
      .feed-sheet__toggle-switch::after {
        content: '';
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        transition: transform 0.2s;
      }
      .feed-sheet__toggle input:checked + .feed-sheet__toggle-switch {
        background: #30d158;
      }
      .feed-sheet__toggle input:checked + .feed-sheet__toggle-switch::after {
        transform: translateX(18px);
      }
      .feed-sheet__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;
        font-size: 15px;
      }
      .feed-sheet__font-btns {
        display: flex;
        gap: 4px;
      }
      .feed-sheet__font-btn {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        font-weight: 600;
        transition: all 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .feed-sheet__font-btn[data-size="small"] { font-size: 12px; }
      .feed-sheet__font-btn[data-size="medium"] { font-size: 15px; }
      .feed-sheet__font-btn[data-size="large"] { font-size: 18px; }
      .feed-sheet__font-btn.active {
        background: #fff;
        color: #000;
        border-color: #fff;
      }
      .feed-sheet__info {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 10px 0;
        font-size: 13px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }
      .feed-sheet__info span:last-child {
        text-align: right;
        max-width: 60%;
        font-size: 12px;
      }
    `;
    document.body.appendChild(style);
  }

  function toggleSheet(open) {
    const sheet = document.getElementById('feed-sheet');
    const overlay = document.getElementById('feed-sheet-overlay');
    if (sheet) sheet.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('open', open);
  }

  function applyFontSize(size) {
    const container = document.getElementById('feed-container');
    if (!container) return;
    const sizes = { small: '16px', medium: '20px', large: '26px' };
    container.style.setProperty('--feed-title-size', sizes[size] || sizes.medium);
    // Also apply to existing items
    container.querySelectorAll('.feed-item__title').forEach(el => {
      el.style.fontSize = sizes[size] || sizes.medium;
    });
  }

  function shouldAutoScroll() {
    return localStorage.getItem('feed_auto_scroll') !== 'false';
  }

  return { init, autoScrollNext, setAnnounce, shouldAutoScroll };
})();
