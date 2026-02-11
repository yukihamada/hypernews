/**
 * settings.js — Settings page logic
 */
'use strict';

(function() {
  const BASE = '';

  function adminHeaders() {
    const secret = Storage.get('adminSecret') || '';
    return secret ? { 'X-Admin-Secret': secret } : {};
  }

  // --- Dark mode from storage ---
  const mode = Storage.get('mode') || 'light';
  document.body.dataset.mode = mode;

  // --- Tab switching ---
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // --- Toast ---
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  // --- Admin secret ---
  const adminInput = document.getElementById('admin-secret');
  adminInput.value = Storage.get('adminSecret') || '';
  document.getElementById('admin-save-btn').addEventListener('click', () => {
    Storage.set('adminSecret', adminInput.value);
    toast('Admin secret saved');
    loadFeeds();
  });

  // === Tab 1: RSS Feeds ===
  async function loadFeeds() {
    const list = document.getElementById('feeds-list');
    try {
      const res = await fetch(`${BASE}/api/admin/feeds`, {
        headers: { ...adminHeaders() },
      });
      if (!res.ok) { list.innerHTML = '<div class="loading-text">Failed to load feeds</div>'; return; }
      const data = await res.json();
      if (!data.feeds || data.feeds.length === 0) {
        list.innerHTML = '<div class="loading-text">No feeds configured</div>';
        return;
      }
      list.innerHTML = '';
      for (const feed of data.feeds) {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.innerHTML = `
          <div class="feed-info">
            <div class="feed-source">${esc(feed.source)}</div>
            <div class="feed-url">${esc(feed.url)}</div>
          </div>
          <span class="feed-category">${esc(feed.category)}</span>
          <button class="feed-toggle ${feed.enabled ? 'on' : 'off'}" data-id="${esc(feed.feed_id)}" title="${feed.enabled ? 'Enabled' : 'Disabled'}"></button>
          <button class="feed-delete" data-id="${esc(feed.feed_id)}" title="Delete">&times;</button>
        `;
        list.appendChild(item);
      }
      // Toggle handlers
      list.querySelectorAll('.feed-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const newEnabled = btn.classList.contains('off');
          try {
            const res = await fetch(`${BASE}/api/admin/feeds/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...adminHeaders() },
              body: JSON.stringify({ enabled: newEnabled }),
            });
            if (res.ok) {
              btn.classList.toggle('on', newEnabled);
              btn.classList.toggle('off', !newEnabled);
              toast(newEnabled ? 'Feed enabled' : 'Feed disabled');
            }
          } catch(e) { toast('Error: ' + e.message); }
        });
      });
      // Delete handlers
      list.querySelectorAll('.feed-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this feed?')) return;
          const id = btn.dataset.id;
          try {
            const res = await fetch(`${BASE}/api/admin/feeds/${id}`, {
              method: 'DELETE',
              headers: { ...adminHeaders() },
            });
            if (res.ok) {
              btn.closest('.feed-item').remove();
              toast('Feed deleted');
            }
          } catch(e) { toast('Error: ' + e.message); }
        });
      });
    } catch(e) {
      list.innerHTML = '<div class="loading-text">Error loading feeds</div>';
    }
  }

  // Add feed
  document.getElementById('feed-add-btn').addEventListener('click', async () => {
    const url = document.getElementById('feed-url').value.trim();
    const source = document.getElementById('feed-source').value.trim();
    const category = document.getElementById('feed-category').value;
    if (!url || !source) { toast('URL and Source are required'); return; }
    try {
      const res = await fetch(`${BASE}/api/admin/feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ url, source, category }),
      });
      if (res.ok) {
        document.getElementById('feed-url').value = '';
        document.getElementById('feed-source').value = '';
        toast('Feed added');
        loadFeeds();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Failed to add feed');
      }
    } catch(e) { toast('Error: ' + e.message); }
  });

  // === Tab 2: Local Data ===
  function updateDataCounts() {
    ReadHistory.init();
    Bookmarks.init();
    document.getElementById('history-count').textContent = ReadHistory.getCount() + ' articles';
    document.getElementById('bookmark-count').textContent = Bookmarks.getCount() + ' items';

    // EcoSystem cache count
    try {
      const eco = JSON.parse(localStorage.getItem('hn_eco') || '{}');
      const cacheEntries = eco.queryCache ? Object.keys(eco.queryCache).length : 0;
      document.getElementById('cache-count').textContent = cacheEntries + ' entries';
    } catch { document.getElementById('cache-count').textContent = '0 entries'; }

    // Total storage size
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hn_')) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    document.getElementById('storage-size').textContent = (total / 1024).toFixed(1) + ' KB';
  }

  document.getElementById('clear-history').addEventListener('click', () => {
    localStorage.removeItem('hn_readHistory');
    toast('Read history cleared');
    updateDataCounts();
  });

  document.getElementById('clear-bookmarks').addEventListener('click', () => {
    localStorage.removeItem('hn_bookmarks');
    toast('Bookmarks cleared');
    updateDataCounts();
  });

  document.getElementById('clear-cache').addEventListener('click', () => {
    try {
      const eco = JSON.parse(localStorage.getItem('hn_eco') || '{}');
      eco.queryCache = {};
      eco.cacheHits = 0;
      localStorage.setItem('hn_eco', JSON.stringify(eco));
    } catch {}
    toast('AI cache cleared');
    updateDataCounts();
  });

  document.getElementById('clear-all').addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults?')) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('hn_')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
    toast('All settings reset');
    updateDataCounts();
    setTimeout(() => location.reload(), 500);
  });

  // --- Toggle helper ---
  function initToggle(id, key) {
    const btn = document.getElementById(id);
    if (!btn) return;
    const val = Storage.get(key);
    btn.setAttribute('aria-checked', String(!!val));
    btn.addEventListener('click', () => {
      const current = btn.getAttribute('aria-checked') === 'true';
      const next = !current;
      btn.setAttribute('aria-checked', String(next));
      Storage.set(key, next);
      toast(`${key}: ${next ? 'ON' : 'OFF'}`);
    });
  }

  // === Display Tab ===
  function initDisplayToggles() {
    initToggle('toggle-showImages', 'showImages');
    initToggle('toggle-showDescriptions', 'showDescriptions');
    initToggle('toggle-hideReadArticles', 'hideReadArticles');
    initToggle('toggle-enableAnimations', 'enableAnimations');
  }

  // === Reading Tab ===
  function initReading() {
    const perPage = String(Storage.get('articlesPerPage') || 30);
    setActive('articles-per-page-btns', perPage);
    document.getElementById('articles-per-page-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      const val = parseInt(btn.dataset.value, 10);
      Storage.set('articlesPerPage', val);
      setActive('articles-per-page-btns', btn.dataset.value);
      toast('Articles per page: ' + val);
    });

    const delay = String(Storage.get('readMarkDelay'));
    setActive('read-mark-btns', delay);
    document.getElementById('read-mark-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      const val = parseInt(btn.dataset.value, 10);
      Storage.set('readMarkDelay', val);
      setActive('read-mark-btns', btn.dataset.value);
      toast(val < 0 ? 'Read mark: OFF' : val === 0 ? 'Read mark: Instant' : `Read mark: ${val / 1000}s`);
    });

    const action = Storage.get('articleClickAction') || 'detail';
    setActive('click-action-btns', action);
    document.getElementById('click-action-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      Storage.set('articleClickAction', btn.dataset.value);
      setActive('click-action-btns', btn.dataset.value);
      toast('Click action: ' + btn.dataset.value);
    });

    initToggle('toggle-infiniteScroll', 'infiniteScroll');
  }

  // === Display Tab (existing) ===
  function initDisplay() {
    const theme = Storage.get('theme') || 'card';
    const currentMode = Storage.get('mode') || 'light';
    const fontSize = Storage.get('fontSize') || 16;
    const density = Storage.get('density') || 'normal';
    const accentColor = Storage.get('accentColor') || 'default';
    const autoRefresh = Storage.get('autoRefresh') || 0;

    setActive('theme-btns', theme);
    setActive('mode-btns', currentMode);
    setActive('density-btns', density);
    setActive('refresh-btns', String(autoRefresh));

    document.getElementById('font-size-range').value = fontSize;
    document.getElementById('font-size-val').textContent = fontSize + 'px';

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === accentColor);
    });

    // Theme buttons
    document.getElementById('theme-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      Storage.set('theme', btn.dataset.value);
      setActive('theme-btns', btn.dataset.value);
      toast('Theme: ' + btn.dataset.value);
    });

    // Mode buttons
    document.getElementById('mode-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      Storage.set('mode', btn.dataset.value);
      document.body.dataset.mode = btn.dataset.value;
      setActive('mode-btns', btn.dataset.value);
      toast('Mode: ' + btn.dataset.value);
    });

    // Font size
    document.getElementById('font-size-range').addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('font-size-val').textContent = val + 'px';
      Storage.set('fontSize', val);
    });

    // Density
    document.getElementById('density-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      Storage.set('density', btn.dataset.value);
      setActive('density-btns', btn.dataset.value);
      toast('Density: ' + btn.dataset.value);
    });

    // Colors
    document.getElementById('color-btns').addEventListener('click', e => {
      const btn = e.target.closest('.color-btn');
      if (!btn) return;
      Storage.set('accentColor', btn.dataset.value);
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      toast('Accent color: ' + btn.dataset.value);
    });

    // Auto refresh
    document.getElementById('refresh-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      const val = parseInt(btn.dataset.value, 10);
      Storage.set('autoRefresh', val);
      setActive('refresh-btns', btn.dataset.value);
      toast(val > 0 ? `Auto refresh: ${val} min` : 'Auto refresh: OFF');
    });
  }

  function setActive(groupId, value) {
    document.getElementById(groupId).querySelectorAll('.opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  // === AI & Voice Tab ===
  function initAI() {
    const qPrompt = Storage.get('aiQuestionPrompt') || '';
    const aPrompt = Storage.get('aiAnswerPrompt') || '';
    document.getElementById('ai-question-prompt').value = qPrompt;
    document.getElementById('ai-answer-prompt').value = aPrompt;

    document.getElementById('ai-save-btn').addEventListener('click', () => {
      Storage.set('aiQuestionPrompt', document.getElementById('ai-question-prompt').value);
      Storage.set('aiAnswerPrompt', document.getElementById('ai-answer-prompt').value);
      toast('AI prompts saved');
    });

    document.getElementById('ai-clear-btn').addEventListener('click', () => {
      document.getElementById('ai-question-prompt').value = '';
      document.getElementById('ai-answer-prompt').value = '';
      Storage.set('aiQuestionPrompt', '');
      Storage.set('aiAnswerPrompt', '');
      toast('AI prompts cleared');
    });

    // Typewriter speed
    const twSpeed = String(Storage.get('typewriterSpeed'));
    setActive('typewriter-btns', twSpeed);
    document.getElementById('typewriter-btns').addEventListener('click', e => {
      const btn = e.target.closest('.opt-btn');
      if (!btn) return;
      const val = parseInt(btn.dataset.value, 10);
      Storage.set('typewriterSpeed', val);
      setActive('typewriter-btns', btn.dataset.value);
      toast(val === 0 ? 'Typewriter: OFF' : `Typewriter: ${val}ms`);
    });

    // TTS Voice picker
    loadVoicePicker();

    // EcoSystem Cache Rate
    const cacheRate = Storage.get('ecoCacheRate');
    const rateRange = document.getElementById('cache-rate-range');
    const rateVal = document.getElementById('cache-rate-val');
    rateRange.value = cacheRate;
    rateVal.textContent = cacheRate + '%';
    rateRange.addEventListener('input', e => {
      const val = parseInt(e.target.value, 10);
      rateVal.textContent = val + '%';
      Storage.set('ecoCacheRate', val);
      if (typeof EcoSystem !== 'undefined' && EcoSystem.setCacheRate) {
        EcoSystem.setCacheRate(val);
      }
    });
  }

  async function loadVoicePicker() {
    const container = document.getElementById('tts-voice-btns');
    const hint = document.getElementById('tts-voice-hint');
    const currentVoice = Storage.get('ttsVoice') || 'off';

    try {
      const res = await fetch(`${BASE}/api/tts/voices`);
      if (!res.ok) throw new Error('Failed to load voices');
      const data = await res.json();
      const voices = data.voices || [];

      container.innerHTML = '<button class="opt-btn" data-value="off">OFF</button>';
      for (const v of voices) {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.dataset.value = v.id || v.name;
        btn.textContent = v.label || v.name || v.id;
        container.appendChild(btn);
      }
      setActive('tts-voice-btns', currentVoice);
      hint.textContent = voices.length > 0 ? '' : 'No voices available';

      container.addEventListener('click', e => {
        const btn = e.target.closest('.opt-btn');
        if (!btn) return;
        Storage.set('ttsVoice', btn.dataset.value);
        setActive('tts-voice-btns', btn.dataset.value);
        toast('TTS Voice: ' + (btn.dataset.value === 'off' ? 'OFF' : btn.textContent));
      });
    } catch {
      hint.textContent = 'Could not load voices';
      setActive('tts-voice-btns', currentVoice);
      container.addEventListener('click', e => {
        const btn = e.target.closest('.opt-btn');
        if (!btn) return;
        Storage.set('ttsVoice', btn.dataset.value);
        setActive('tts-voice-btns', btn.dataset.value);
        toast('TTS Voice: OFF');
      });
    }
  }

  // --- Utility ---
  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // --- Init ---
  loadFeeds();
  updateDataCounts();
  initDisplay();
  initDisplayToggles();
  initReading();
  initAI();
})();
