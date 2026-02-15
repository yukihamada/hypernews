/**
 * renderer.js — DOM generation for articles
 * Single renderer, CSS handles theme differences.
 */
'use strict';

const Renderer = (() => {
  /**
   * Format relative time — delegates to I18n if available
   */
  function relativeTime(isoStr) {
    if (typeof I18n !== 'undefined') return I18n.relativeTime(isoStr);
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoStr).toLocaleDateString('en-US');
  }

  /**
   * Create a single article element.
   */
  function createArticleEl(article) {
    const el = document.createElement('article');
    el.className = 'article';
    el.dataset.category = article.category;
    el.dataset.articleId = article.id || '';
    // Data attributes for FeedMurmur
    el.dataset.title = article.title || '';
    el.dataset.description = stripHtml(article.description) || '';
    el.dataset.source = article.source || '';
    el.dataset.url = article.url || '';

    const catLabel = article.category || '';

    const cleanDesc = stripHtml(article.description);
    const descHtml = cleanDesc
      ? `<p class="article-desc">${escHtml(cleanDesc)}</p>`
      : '';

    const groupBadge =
      article.group_count && article.group_count > 1
        ? `<span class="group-badge">${typeof t === 'function' ? t('group_badge', { n: article.group_count - 1 }) : '+' + (article.group_count - 1) + ' related'}</span>`
        : '';

    // Image: use proxy to avoid CORS/mixed-content issues
    const imgUrl = article.image_url
      ? '/api/image-proxy?url=' + encodeURIComponent(article.image_url)
      : '';
    const imgHtml = imgUrl
      ? `<div class="article-img-wrap" data-category="${escHtml(catLabel)}">
           <img class="article-img" src="${imgUrl}" alt="" loading="lazy" onerror="this.parentElement.classList.add('img-failed')">
           <div class="article-img-fallback"><span>${escHtml(article.source)}</span></div>
         </div>`
      : `<div class="article-img-wrap" data-category="${escHtml(catLabel)}">
           <div class="article-img-fallback"><span>${escHtml(article.source)}</span></div>
         </div>`;

    const ttsLabel = typeof t === 'function' ? t('tts.read_aloud') : 'Read aloud';
    const bmLabel = typeof t === 'function' ? t('bookmark') : 'Bookmark';

    el.innerHTML = `
      ${imgHtml}
      <div class="article-body">
        <h2 class="article-title"><a href="${escHtml(article.url)}" target="_blank" rel="noopener">${escHtml(article.title)}</a>${groupBadge}</h2>
        <div class="article-meta">
          <span class="article-source">${escHtml(article.source)}</span>
          <time datetime="${article.published_at}">${relativeTime(article.published_at)}</time>
          <button class="tts-btn" type="button" aria-label="${ttsLabel}" title="${ttsLabel}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg></button>
          <button class="bookmark-btn${typeof Bookmarks !== 'undefined' && Bookmarks.isBookmarked(article.id) ? ' bookmarked' : ''}" type="button" aria-label="${bmLabel}" title="${bmLabel}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>
        </div>
        ${descHtml}
      </div>`;

    return el;
  }

  /**
   * Render a list of articles into the container.
   * @param {HTMLElement} container
   * @param {Array} articles
   * @param {boolean} append - true to append, false to replace
   */
  function render(container, articles, append = false) {
    if (!append) {
      container.innerHTML = '';
    }

    if (articles.length === 0 && !append) {
      container.innerHTML = `<div class="loading">${typeof t === 'function' ? t('no_articles') : 'No articles found'}</div>`;
      return;
    }

    // Sort articles: ones with description first
    const sortedArticles = [...articles].sort((a, b) => {
      const aHasDesc = a.description && a.description.trim().length > 0;
      const bHasDesc = b.description && b.description.trim().length > 0;
      if (aHasDesc && !bHasDesc) return -1;
      if (!aHasDesc && bHasDesc) return 1;
      return 0; // Keep original order for same type
    });

    const frag = document.createDocumentFragment();
    for (const article of sortedArticles) {
      frag.appendChild(createArticleEl(article));
    }
    container.appendChild(frag);
  }

  /**
   * Render category buttons.
   */
  function renderCategories(nav, categories, activeCategory) {
    nav.innerHTML = '';
    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn' + (activeCategory === '' ? ' active' : '');
    allBtn.dataset.category = '';
    allBtn.textContent = typeof t === 'function' ? t('all') : 'All';
    nav.appendChild(allBtn);

    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (activeCategory === cat.id ? ' active' : '');
      btn.dataset.category = cat.id;
      btn.textContent = typeof I18n !== 'undefined' ? I18n.categoryLabel(cat) : (cat.label || cat.label_ja);
      nav.appendChild(btn);
    }
  }

  function renderSkeletons(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'skeleton';
      el.innerHTML = `
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line w80"></div>
          <div class="skeleton-line w60"></div>
          <div class="skeleton-line short"></div>
        </div>`;
      container.appendChild(el);
    }
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function stripHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return { render, renderCategories, renderSkeletons, relativeTime, escHtml, stripHtml };
})();
