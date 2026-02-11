/**
 * renderer.js — DOM generation for articles
 * Single renderer, CSS handles theme differences.
 */
'use strict';

const Renderer = (() => {
  /**
   * Format relative time (e.g., "3時間前")
   */
  function relativeTime(isoStr) {
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

  /**
   * Create a single article element.
   */
  function createArticleEl(article) {
    const el = document.createElement('article');
    el.className = 'article';
    el.dataset.category = article.category;
    el.dataset.articleId = article.id || '';

    let imgHtml = '';
    if (article.image_url) {
      imgHtml = `<img class="article-img" src="${escHtml(article.image_url)}" alt="${escHtml(article.title)}" loading="lazy" decoding="async">`;
    } else {
      const catLabel = article.category || '';
      imgHtml = `<div class="article-img article-img-placeholder" data-category="${escHtml(catLabel)}"><span>${escHtml(catLabel)}</span></div>`;
    }

    const descHtml = article.description
      ? `<p class="article-desc">${escHtml(article.description)}</p>`
      : '';

    const groupBadge =
      article.group_count && article.group_count > 1
        ? `<span class="group-badge">+${article.group_count - 1}件の関連記事</span>`
        : '';

    el.innerHTML = `
      ${imgHtml}
      <div class="article-body">
        <h2 class="article-title"><a href="${escHtml(article.url)}" target="_blank" rel="noopener">${escHtml(article.title)}</a>${groupBadge}</h2>
        <div class="article-meta">
          <span class="article-source">${escHtml(article.source)}</span>
          <time datetime="${article.published_at}">${relativeTime(article.published_at)}</time>
          <button class="tts-btn" type="button" aria-label="読み上げ" title="読み上げ"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg></button>
          <button class="bookmark-btn${typeof Bookmarks !== 'undefined' && Bookmarks.isBookmarked(article.id) ? ' bookmarked' : ''}" type="button" aria-label="ブックマーク" title="ブックマーク"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>
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
      container.innerHTML = '<div class="loading">記事が見つかりません</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    for (const article of articles) {
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
    allBtn.textContent = 'すべて';
    nav.appendChild(allBtn);

    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (activeCategory === cat.id ? ' active' : '');
      btn.dataset.category = cat.id;
      btn.textContent = cat.label_ja;
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

  return { render, renderCategories, renderSkeletons, relativeTime, escHtml };
})();
