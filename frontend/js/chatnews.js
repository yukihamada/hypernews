/**
 * chatnews.js — ChatNews messenger-style chat interface for consuming news
 * IIFE module: ChatNewsApp
 */
'use strict';

const ChatNewsApp = (() => {
  const SESSION_KEY = 'chatnews_conversation';

  /** Category chips definition */
  const CATEGORIES = [
    { id: '', label: 'すべて' },
    { id: 'tech', label: 'テクノロジー' },
    { id: 'business', label: 'ビジネス' },
    { id: 'entertainment', label: 'エンタメ' },
    { id: 'sports', label: 'スポーツ' },
    { id: 'science', label: 'サイエンス' },
  ];

  let container = null;
  let messagesEl = null;
  let inputEl = null;
  let sendBtn = null;
  let chipsEl = null;
  let conversation = []; // { role: 'user'|'ai', type: 'text'|'cards'|'typing', content, cards? }

  // ===== HTML Escaping =====
  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Relative Time =====
  function relativeTime(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'たった今';
    if (mins < 60) return `${mins}分前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}時間前`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}日前`;
    return new Date(isoStr).toLocaleDateString('ja-JP');
  }

  // ===== Session Storage =====
  function saveConversation() {
    try {
      const toSave = conversation.filter(m => m.type !== 'typing');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
    } catch { /* quota exceeded — ignore */ }
  }

  function loadConversation() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch { /* parse error */ }
    return null;
  }

  // ===== Init =====
  function init() {
    // Hide standard news UI elements
    hideStandardUI();

    // Force dark mode for chatnews
    document.body.dataset.mode = 'dark';

    // Build the chat interface
    buildUI();

    // Try to restore conversation from session
    const saved = loadConversation();
    if (saved && saved.length > 0) {
      restoreConversation(saved);
    } else {
      startFreshConversation();
    }
  }

  function hideStandardUI() {
    const selectors = ['.header', '.main', '#detail-panel', '#detail-overlay', '#chat-panel', '.eco-status'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    }
  }

  // ===== Build UI =====
  function buildUI() {
    container = document.createElement('div');
    container.className = 'cn-container';

    // Header
    const header = document.createElement('div');
    header.className = 'cn-header';
    header.innerHTML = `
      <div class="cn-header-icon">CN</div>
      <div class="cn-header-logo">
        <div class="cn-header-title">ChatNews</div>
        <div class="cn-header-subtitle">AI\u3068\u30CB\u30E5\u30FC\u30B9\u3092\u8A9E\u308D\u3046</div>
      </div>`;
    container.appendChild(header);

    // Messages
    messagesEl = document.createElement('div');
    messagesEl.className = 'cn-messages';
    container.appendChild(messagesEl);

    // Chips
    chipsEl = document.createElement('div');
    chipsEl.className = 'cn-chips';
    buildChips();
    container.appendChild(chipsEl);

    // Input bar
    const inputBar = document.createElement('div');
    inputBar.className = 'cn-input-bar';

    inputEl = document.createElement('textarea');
    inputEl.className = 'cn-input';
    inputEl.placeholder = '\u30CB\u30E5\u30FC\u30B9\u306B\u3064\u3044\u3066\u8CEA\u554F\u3057\u3066\u307F\u3088\u3046...';
    inputEl.rows = 1;
    inputEl.addEventListener('input', onInputResize);
    inputEl.addEventListener('keydown', onInputKeydown);

    sendBtn = document.createElement('button');
    sendBtn.className = 'cn-send-btn';
    sendBtn.type = 'button';
    sendBtn.setAttribute('aria-label', '\u9001\u4FE1');
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    sendBtn.addEventListener('click', onSend);

    inputBar.appendChild(inputEl);
    inputBar.appendChild(sendBtn);
    container.appendChild(inputBar);

    document.body.appendChild(container);
  }

  function buildChips() {
    chipsEl.innerHTML = '';
    for (const cat of CATEGORIES) {
      const chip = document.createElement('button');
      chip.className = 'cn-chip';
      chip.type = 'button';
      chip.textContent = cat.label;
      chip.dataset.category = cat.id;
      chip.addEventListener('click', () => onChipClick(cat));
      chipsEl.appendChild(chip);
    }
  }

  // ===== Input Handling =====
  function onInputResize() {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }

  function onInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function onSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    handleUserMessage(text);
  }

  // ===== Conversation Logic =====
  function startFreshConversation() {
    addAIMessage('\u3053\u3093\u306B\u3061\u306F\uFF01\u6700\u65B0\u30CB\u30E5\u30FC\u30B9\u306B\u3064\u3044\u3066\u4F55\u3067\u3082\u805E\u3044\u3066\u304F\u3060\u3055\u3044\u3002\u30AB\u30C6\u30B4\u30EA\u3092\u9078\u3076\u304B\u3001\u6C17\u306B\u306A\u308B\u30C8\u30D4\u30C3\u30AF\u3092\u5165\u529B\u3057\u3066\u306D\u3002');
    fetchTopHeadlines();
  }

  function restoreConversation(saved) {
    for (const msg of saved) {
      if (msg.role === 'user') {
        renderUserBubble(msg.content);
        conversation.push(msg);
      } else if (msg.role === 'ai' && msg.type === 'text') {
        renderAIBubble(msg.content);
        conversation.push(msg);
      } else if (msg.role === 'ai' && msg.type === 'cards') {
        renderAIBubble(msg.content);
        renderArticleCards(msg.cards || []);
        conversation.push(msg);
      }
    }
    scrollToBottom();
  }

  async function fetchTopHeadlines() {
    showTyping();
    try {
      const data = await Api.fetchArticles(null, 3);
      hideTyping();
      if (data.articles && data.articles.length > 0) {
        addAICardsMessage('\u4ECA\u65E5\u306E\u30C8\u30C3\u30D7\u30CB\u30E5\u30FC\u30B9\u3067\u3059\uFF1A', data.articles);
      } else {
        addAIMessage('\u73FE\u5728\u30CB\u30E5\u30FC\u30B9\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5C11\u3057\u5F8C\u3067\u8A66\u3057\u3066\u307F\u3066\u304F\u3060\u3055\u3044\u3002');
      }
    } catch {
      hideTyping();
      addAIMessage('\u30CB\u30E5\u30FC\u30B9\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002');
    }
  }

  function onChipClick(cat) {
    const label = cat.label;
    const categoryId = cat.id;

    // Add user message
    addUserMessage(label);

    // Fetch articles for this category
    fetchCategoryArticles(categoryId, label);
  }

  async function fetchCategoryArticles(categoryId, label) {
    showTyping();
    try {
      const data = await Api.fetchArticles(categoryId || null, 5);
      hideTyping();
      if (data.articles && data.articles.length > 0) {
        const heading = categoryId
          ? `${escHtml(label)}\u306E\u6700\u65B0\u30CB\u30E5\u30FC\u30B9\u3067\u3059\uFF1A`
          : '\u6700\u65B0\u30CB\u30E5\u30FC\u30B9\u3067\u3059\uFF1A';
        addAICardsMessage(heading, data.articles);
      } else {
        addAIMessage(`${escHtml(label)}\u306E\u30CB\u30E5\u30FC\u30B9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002`);
      }
    } catch {
      hideTyping();
      addAIMessage('\u30CB\u30E5\u30FC\u30B9\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002');
    }
  }

  async function handleUserMessage(text) {
    addUserMessage(text);

    // Check if it looks like a question about a specific topic
    showTyping();
    try {
      // Use askArticleQuestion with the user's text as both title context and question
      const data = await Api.askArticleQuestion('', '', '', text);
      hideTyping();
      if (data && data.answer) {
        addAIMessage(data.answer);
      } else {
        // Fallback: search for articles matching the text
        await searchArticles(text);
      }
    } catch {
      hideTyping();
      // Fallback: try searching for articles
      try {
        await searchArticles(text);
      } catch {
        addAIMessage('\u3059\u307F\u307E\u305B\u3093\u3001\u56DE\u7B54\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5225\u306E\u8CEA\u554F\u3092\u8A66\u3057\u3066\u307F\u3066\u304F\u3060\u3055\u3044\u3002');
      }
    }
  }

  async function searchArticles(query) {
    try {
      const data = await Api.fetchArticles(null, 5);
      if (data.articles && data.articles.length > 0) {
        // Filter articles that might match the query
        const queryLower = query.toLowerCase();
        let matched = data.articles.filter(a =>
          (a.title && a.title.toLowerCase().includes(queryLower)) ||
          (a.description && a.description.toLowerCase().includes(queryLower)) ||
          (a.source && a.source.toLowerCase().includes(queryLower))
        );

        if (matched.length === 0) {
          matched = data.articles.slice(0, 3);
          addAICardsMessage(`\u300C${escHtml(query)}\u300D\u306B\u95A2\u9023\u3059\u308B\u8A18\u4E8B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u304C\u3001\u6700\u65B0\u306E\u30CB\u30E5\u30FC\u30B9\u3092\u304A\u5C4A\u3051\u3057\u307E\u3059\uFF1A`, matched);
        } else {
          addAICardsMessage(`\u300C${escHtml(query)}\u300D\u306B\u95A2\u9023\u3059\u308B\u8A18\u4E8B\u3067\u3059\uFF1A`, matched.slice(0, 5));
        }
      } else {
        addAIMessage('\u8A72\u5F53\u3059\u308B\u8A18\u4E8B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002');
      }
    } catch {
      addAIMessage('\u8A18\u4E8B\u306E\u691C\u7D22\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002');
    }
  }

  async function handleArticleClick(article) {
    addUserMessage(`\u300C${article.title}\u300D\u306B\u3064\u3044\u3066\u6559\u3048\u3066`);
    showTyping();
    try {
      const data = await Api.askArticleQuestion(
        article.title,
        article.description || '',
        article.source || '',
        '\u3053\u306E\u8A18\u4E8B\u3092\u8981\u7D04\u3057\u3066\u304F\u3060\u3055\u3044',
        article.url
      );
      hideTyping();
      if (data && data.answer) {
        addAIMessage(data.answer);
      } else {
        addAIMessage('\u3053\u306E\u8A18\u4E8B\u306E\u8981\u7D04\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002');
      }
    } catch {
      hideTyping();
      addAIMessage('\u8981\u7D04\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u5C11\u3057\u5F8C\u3067\u8A66\u3057\u3066\u307F\u3066\u304F\u3060\u3055\u3044\u3002');
    }
  }

  // ===== Message Rendering =====

  function addUserMessage(text) {
    const msg = { role: 'user', type: 'text', content: text };
    conversation.push(msg);
    renderUserBubble(text);
    scrollToBottom();
    saveConversation();
  }

  function addAIMessage(text) {
    const msg = { role: 'ai', type: 'text', content: text };
    conversation.push(msg);
    renderAIBubble(text);
    scrollToBottom();
    saveConversation();
  }

  function addAICardsMessage(text, articles) {
    const cards = articles.map(a => ({
      id: a.id,
      title: a.title,
      url: a.url,
      source: a.source,
      published_at: a.published_at,
      image_url: a.image_url,
      description: a.description,
      category: a.category,
    }));
    const msg = { role: 'ai', type: 'cards', content: text, cards };
    conversation.push(msg);
    renderAIBubble(text);
    renderArticleCards(cards);
    scrollToBottom();
    saveConversation();
  }

  function renderUserBubble(text) {
    const row = document.createElement('div');
    row.className = 'cn-bubble-row cn-bubble-row--user';

    const bubble = document.createElement('div');
    bubble.className = 'cn-bubble cn-bubble--user';
    bubble.textContent = text;

    row.appendChild(bubble);
    messagesEl.appendChild(row);
  }

  function renderAIBubble(text) {
    const row = document.createElement('div');
    row.className = 'cn-bubble-row cn-bubble-row--ai';

    const avatar = document.createElement('div');
    avatar.className = 'cn-avatar cn-avatar--ai';
    avatar.textContent = 'AI';

    const bubble = document.createElement('div');
    bubble.className = 'cn-bubble cn-bubble--ai';
    // Render text with line breaks preserved
    bubble.innerHTML = escHtml(text).replace(/\n/g, '<br>');

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  }

  function renderArticleCards(cards) {
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cn-article-cards';

    for (const card of cards) {
      const cardEl = document.createElement('div');
      cardEl.className = 'cn-article-card';
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('tabindex', '0');

      let imgHtml;
      if (card.image_url) {
        imgHtml = `<img class="cn-article-card-img" src="${escHtml(card.image_url)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`;
      } else {
        const catText = card.category || card.source || 'NEWS';
        imgHtml = `<div class="cn-article-card-img cn-article-card-img--placeholder">${escHtml(catText)}</div>`;
      }

      cardEl.innerHTML = `
        ${imgHtml}
        <div class="cn-article-card-body">
          <div class="cn-article-card-title">${escHtml(card.title)}</div>
          <div class="cn-article-card-meta">
            <span>${escHtml(card.source || '')}</span>
            <span class="cn-article-card-meta-dot"></span>
            <span>${relativeTime(card.published_at)}</span>
          </div>
        </div>`;

      // Click to get summary
      const articleData = { ...card };
      cardEl.addEventListener('click', () => handleArticleClick(articleData));
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleArticleClick(articleData);
        }
      });

      cardsContainer.appendChild(cardEl);
    }

    messagesEl.appendChild(cardsContainer);
  }

  // ===== Typing Indicator =====
  function showTyping() {
    // Remove any existing typing indicator
    hideTyping();

    const row = document.createElement('div');
    row.className = 'cn-typing';
    row.id = 'cn-typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'cn-avatar cn-avatar--ai';
    avatar.textContent = 'AI';

    const dots = document.createElement('div');
    dots.className = 'cn-typing-dots';
    dots.innerHTML = '<div class="cn-typing-dot"></div><div class="cn-typing-dot"></div><div class="cn-typing-dot"></div>';

    row.appendChild(avatar);
    row.appendChild(dots);
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function hideTyping() {
    const el = document.getElementById('cn-typing-indicator');
    if (el) el.remove();
  }

  // ===== Scroll =====
  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // ===== Public API =====
  return { init };
})();
