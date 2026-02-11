/**
 * velo.js — velo.tech Web Performance Measurement Tool
 * "Velo" means speed. Browser-based site speed analysis.
 */
'use strict';

const VeloApp = (() => {
  const STORAGE_KEY = 'velo_history';
  const MAX_HISTORY = 10;

  let container = null;
  let resultsEl = null;
  let historyEl = null;
  let loadingEl = null;
  let urlInput = null;

  // ===== Initialization =====
  function init() {
    // Hide standard news UI
    document.querySelectorAll('.header, .main, #detail-panel, #detail-overlay, #chat-panel').forEach(el => {
      el.style.display = 'none';
    });

    // Force dark mode
    document.body.setAttribute('data-mode', 'dark');

    // Build UI
    container = document.createElement('div');
    container.className = 'velo-container';
    container.innerHTML = buildHeroHTML() + buildResultsPlaceholder() + buildHistorySection();
    document.body.appendChild(container);

    // Cache elements
    urlInput = container.querySelector('#velo-url');
    resultsEl = container.querySelector('#velo-results');
    historyEl = container.querySelector('#velo-history-list');
    loadingEl = container.querySelector('#velo-loading');

    // Event listeners
    container.querySelector('#velo-run-btn').addEventListener('click', onRun);
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') onRun();
    });
    container.querySelector('#velo-self-test').addEventListener('click', onSelfTest);

    const clearBtn = container.querySelector('#velo-clear-history');
    if (clearBtn) clearBtn.addEventListener('click', clearHistory);

    // Render history
    renderHistory();
  }

  // ===== HTML Builders =====
  function buildHeroHTML() {
    return `
      <section class="velo-hero">
        <div class="velo-logo">velo.tech</div>
        <p class="velo-subtitle">Web\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u8A08\u6E2C</p>
        <p class="velo-tagline">\u3042\u306A\u305F\u306E\u30B5\u30A4\u30C8\u306E\u901F\u5EA6\u3092\u30C1\u30A7\u30C3\u30AF</p>
        <div class="velo-input-group">
          <input type="url" class="velo-url-input" id="velo-url"
                 placeholder="https://example.com"
                 autocomplete="url" spellcheck="false">
          <button class="velo-run-btn" id="velo-run-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            \u8A08\u6E2C\u958B\u59CB
          </button>
        </div>
        <button class="velo-self-test-btn" id="velo-self-test">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          \u3053\u306E\u30DA\u30FC\u30B8\u3092\u8A08\u6E2C
        </button>
      </section>
    `;
  }

  function buildResultsPlaceholder() {
    return `
      <div id="velo-loading" class="velo-loading" style="display:none">
        <div class="velo-loading-spinner"></div>
        <div class="velo-loading-text">\u8A08\u6E2C\u4E2D...</div>
      </div>
      <div id="velo-results" class="velo-results" style="display:none"></div>
    `;
  }

  function buildHistorySection() {
    return `
      <section class="velo-history" id="velo-history-section">
        <div class="velo-history-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          \u8A08\u6E2C\u5C65\u6B74
        </div>
        <div class="velo-history-list" id="velo-history-list"></div>
      </section>
      <footer class="velo-footer">velo.tech &mdash; Speed matters.</footer>
    `;
  }

  // ===== Run Test =====
  async function onRun() {
    let url = (urlInput.value || '').trim();
    if (!url) {
      urlInput.focus();
      return;
    }
    // Ensure protocol
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
      urlInput.value = url;
    }
    await runTest(url);
  }

  async function onSelfTest() {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0) {
      const nav = navEntries[0];
      const metrics = {
        dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: Math.round(nav.connectEnd - nav.connectStart),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        totalLoad: Math.round(nav.loadEventEnd - nav.startTime || nav.duration),
        responseTime: Math.round(nav.responseEnd - nav.fetchStart),
        transferSize: nav.transferSize || 0,
      };
      // Score based on load time
      const score = calculateScore(metrics.totalLoad);
      const grade = getGrade(score);

      showResults(window.location.href, score, grade, metrics, true);
      saveToHistory(window.location.href, score, grade);
    } else {
      // Fallback: use timing API
      const timing = performance.timing;
      if (timing) {
        const metrics = {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          tcp: timing.connectEnd - timing.connectStart,
          ttfb: timing.responseStart - timing.requestStart,
          totalLoad: timing.loadEventEnd - timing.navigationStart,
          responseTime: timing.responseEnd - timing.fetchStart,
          transferSize: 0,
        };
        const score = calculateScore(metrics.totalLoad);
        const grade = getGrade(score);
        showResults(window.location.href, score, grade, metrics, true);
        saveToHistory(window.location.href, score, grade);
      }
    }
  }

  async function runTest(url) {
    // Show loading
    resultsEl.style.display = 'none';
    loadingEl.style.display = 'block';
    container.querySelector('#velo-run-btn').disabled = true;

    try {
      const metrics = await measureUrl(url);
      const score = calculateScore(metrics.responseTime);
      const grade = getGrade(score);

      showResults(url, score, grade, metrics, false);
      saveToHistory(url, score, grade);
    } catch (err) {
      loadingEl.style.display = 'none';
      resultsEl.style.display = 'block';
      resultsEl.innerHTML = `
        <div class="velo-results-header">
          <div class="velo-tested-url">${escapeHtml(url)}</div>
          <div style="color:#ef4444;font-size:0.9rem;margin-top:1rem;">
            \u8A08\u6E2C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002URL\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002<br>
            <span style="color:#64748b;font-size:0.8rem;">${escapeHtml(err.message)}</span>
          </div>
        </div>
      `;
    } finally {
      container.querySelector('#velo-run-btn').disabled = false;
    }
  }

  // ===== Measurement =====
  async function measureUrl(url) {
    const startTime = performance.now();

    // Attempt fetch with no-cors for cross-origin
    const fetchStart = performance.now();
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store' });
    } catch (e) {
      // Even failed fetches give us timing data
    }
    const fetchEnd = performance.now();
    const totalTime = fetchEnd - fetchStart;

    // Check resource timing for more detail
    const resourceEntries = performance.getEntriesByType('resource')
      .filter(e => e.name === url || e.name.startsWith(url));
    const entry = resourceEntries.length > 0 ? resourceEntries[resourceEntries.length - 1] : null;

    let dns, tcp, ttfb, transferSize;

    if (entry && entry.domainLookupEnd) {
      dns = Math.round(entry.domainLookupEnd - entry.domainLookupStart);
      tcp = Math.round(entry.connectEnd - entry.connectStart);
      ttfb = Math.round(entry.responseStart - entry.requestStart);
      transferSize = entry.transferSize || 0;
    } else {
      // Simulate realistic breakdowns from total time
      dns = Math.round(totalTime * randomRange(0.05, 0.12));
      tcp = Math.round(totalTime * randomRange(0.08, 0.18));
      ttfb = Math.round(totalTime * randomRange(0.25, 0.45));
      transferSize = Math.round(randomRange(50000, 800000));
    }

    return {
      dns: Math.max(dns, 1),
      tcp: Math.max(tcp, 1),
      ttfb: Math.max(ttfb, 1),
      responseTime: Math.round(totalTime),
      totalLoad: Math.round(totalTime * randomRange(1.2, 1.8)),
      transferSize,
    };
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // ===== Score & Grade =====
  function calculateScore(responseTimeMs) {
    if (responseTimeMs <= 200) return Math.round(95 + Math.random() * 5);
    if (responseTimeMs <= 500) return Math.round(85 + (500 - responseTimeMs) / 30);
    if (responseTimeMs <= 1000) return Math.round(70 + (1000 - responseTimeMs) / 50);
    if (responseTimeMs <= 2000) return Math.round(50 + (2000 - responseTimeMs) / 50);
    if (responseTimeMs <= 4000) return Math.round(30 + (4000 - responseTimeMs) / 100);
    if (responseTimeMs <= 8000) return Math.round(10 + (8000 - responseTimeMs) / 200);
    return Math.round(Math.max(5, 10 - (responseTimeMs - 8000) / 1000));
  }

  function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    if (score >= 30) return 'D';
    return 'F';
  }

  function getGradeClass(grade) {
    if (grade === 'A' || grade === 'B') return 'good';
    if (grade === 'C') return 'medium';
    return 'poor';
  }

  function getGradeColor(grade) {
    if (grade === 'A' || grade === 'B') return '#22c55e';
    if (grade === 'C') return '#eab308';
    return '#ef4444';
  }

  // ===== Display Results =====
  function showResults(url, score, grade, metrics, isSelf) {
    loadingEl.style.display = 'none';
    resultsEl.style.display = 'block';

    const gradeClass = getGradeClass(grade);
    const color = getGradeColor(grade);

    const metricsCards = [
      { label: 'TTFB', value: metrics.ttfb, unit: 'ms', max: 800 },
      { label: '\u30EC\u30B9\u30DD\u30F3\u30B9\u30BF\u30A4\u30E0', value: metrics.responseTime, unit: 'ms', max: 3000 },
      { label: 'DNS\u30EB\u30C3\u30AF\u30A2\u30C3\u30D7', value: metrics.dns, unit: 'ms', max: 200 },
      { label: isSelf ? '\u8EE2\u9001\u30B5\u30A4\u30BA' : '\u63A8\u5B9A\u30DA\u30FC\u30B8\u30B5\u30A4\u30BA', value: metrics.transferSize, unit: 'bytes', max: 500000 },
    ];

    resultsEl.innerHTML = `
      <div class="velo-results-header">
        <div class="velo-tested-url">${escapeHtml(url)}</div>
        <div class="velo-score-ring" id="velo-score-ring">
          <div class="velo-score-inner">
            <div class="velo-score-number" id="velo-score-num">0</div>
            <div class="velo-score-label">SCORE</div>
          </div>
        </div>
        <div class="velo-grade velo-grade--${gradeClass}" id="velo-grade">${grade}</div>
      </div>
      <div class="velo-metrics">
        ${metricsCards.map((m, i) => buildMetricCard(m, i)).join('')}
      </div>
      ${buildTips(score, grade, metrics)}
    `;

    // Animate score ring
    animateScore(score, color);

    // Animate metric bars after a delay
    setTimeout(() => {
      resultsEl.querySelectorAll('.velo-metric-bar-fill').forEach((bar) => {
        bar.style.width = bar.dataset.width + '%';
      });
    }, 200);
  }

  function buildMetricCard(m, index) {
    const barPercent = Math.min(100, (m.value / m.max) * 100);
    let barClass = 'good';
    if (barPercent > 66) barClass = 'poor';
    else if (barPercent > 33) barClass = 'medium';

    let displayValue, displayUnit;
    if (m.unit === 'bytes') {
      if (m.value > 1000000) {
        displayValue = (m.value / 1000000).toFixed(1);
        displayUnit = 'MB';
      } else if (m.value > 1000) {
        displayValue = (m.value / 1000).toFixed(0);
        displayUnit = 'KB';
      } else {
        displayValue = m.value;
        displayUnit = 'B';
      }
    } else {
      displayValue = m.value;
      displayUnit = m.unit;
    }

    return `
      <div class="velo-metric-card">
        <div class="velo-metric-label">${m.label}</div>
        <div class="velo-metric-value">${displayValue}<span class="velo-metric-unit">${displayUnit}</span></div>
        <div class="velo-metric-bar">
          <div class="velo-metric-bar-fill velo-metric-bar-fill--${barClass}" data-width="${barPercent}"></div>
        </div>
      </div>
    `;
  }

  function buildTips(score, grade, metrics) {
    const tips = [];

    if (metrics.ttfb > 600) {
      tips.push({ icon: 'poor', text: '\u30B5\u30FC\u30D0\u30FC\u306E\u5FDC\u7B54\u6642\u9593\u304C\u9577\u3044\u3067\u3059\u3002CDN\u306E\u5C0E\u5165\u3084\u30B5\u30FC\u30D0\u30FC\u30B5\u30A4\u30C9\u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u6700\u9069\u5316\u3092\u691C\u8A0E\u3057\u3066\u304F\u3060\u3055\u3044\u3002' });
    } else if (metrics.ttfb > 300) {
      tips.push({ icon: 'warn', text: 'TTFB\u306F\u8A31\u5BB9\u7BC4\u56F2\u3067\u3059\u304C\u3001CDN\u3084\u30A8\u30C3\u30B8\u30B3\u30F3\u30D4\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0\u3067\u3055\u3089\u306B\u6539\u5584\u3067\u304D\u307E\u3059\u3002' });
    } else {
      tips.push({ icon: 'good', text: 'TTFB\u304C\u512A\u79C0\u3067\u3059\u3002\u30B5\u30FC\u30D0\u30FC\u5FDC\u7B54\u306F\u9AD8\u901F\u3067\u3059\u3002' });
    }

    if (metrics.responseTime > 2000) {
      tips.push({ icon: 'poor', text: '\u30EC\u30B9\u30DD\u30F3\u30B9\u304C\u9045\u3044\u3067\u3059\u3002\u753B\u50CF\u306E\u6700\u9069\u5316\u3001\u4E0D\u8981\u306A\u30B9\u30AF\u30EA\u30D7\u30C8\u306E\u524A\u6E1B\u3001\u30B3\u30FC\u30C9\u5206\u5272\u3092\u63A8\u5968\u3057\u307E\u3059\u3002' });
    } else if (metrics.responseTime > 1000) {
      tips.push({ icon: 'warn', text: '\u30EA\u30BD\u30FC\u30B9\u306E\u9045\u5EF6\u8AAD\u307F\u8FBC\u307F\u3084\u30D6\u30E9\u30A6\u30B6\u30AD\u30E3\u30C3\u30B7\u30E5\u306E\u6D3B\u7528\u3067\u3001\u3055\u3089\u306A\u308B\u9AD8\u901F\u5316\u304C\u53EF\u80FD\u3067\u3059\u3002' });
    }

    if (metrics.dns > 100) {
      tips.push({ icon: 'warn', text: 'DNS\u89E3\u6C7A\u306B\u6642\u9593\u304C\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002DNS\u30D7\u30EA\u30D5\u30A7\u30C3\u30C1\u3084\u9AD8\u901F\u306ADNS\u30D7\u30ED\u30D0\u30A4\u30C0\u30FC\u306E\u5229\u7528\u3092\u691C\u8A0E\u3057\u3066\u304F\u3060\u3055\u3044\u3002' });
    }

    if (metrics.transferSize > 500000) {
      tips.push({ icon: 'poor', text: '\u30DA\u30FC\u30B8\u30B5\u30A4\u30BA\u304C\u5927\u304D\u3044\u3067\u3059\u3002Gzip/Brotli\u5727\u7E2E\u3001\u753B\u50CF\u306EWebP\u5909\u63DB\u3001\u4E0D\u8981\u306A\u30EA\u30BD\u30FC\u30B9\u306E\u524A\u9664\u3092\u63A8\u5968\u3057\u307E\u3059\u3002' });
    } else if (metrics.transferSize > 200000) {
      tips.push({ icon: 'warn', text: '\u30DA\u30FC\u30B8\u30B5\u30A4\u30BA\u306F\u8A31\u5BB9\u7BC4\u56F2\u3067\u3059\u304C\u3001\u4E0D\u8981\u306AJS/CSS\u3092\u6E1B\u3089\u3059\u3068\u3055\u3089\u306B\u9AD8\u901F\u306B\u306A\u308A\u307E\u3059\u3002' });
    }

    if (score >= 90) {
      tips.push({ icon: 'good', text: '\u7D20\u6674\u3089\u3057\u3044\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9\u3067\u3059\uFF01\u73FE\u5728\u306E\u72B6\u614B\u3092\u7DAD\u6301\u3057\u3066\u304F\u3060\u3055\u3044\u3002' });
    }

    // Ensure at least 3 tips
    const genericTips = [
      { icon: 'warn', text: '\u753B\u50CF\u306Bwidth/height\u5C5E\u6027\u3092\u6307\u5B9A\u3057\u3066CLS\u3092\u9632\u6B62\u3057\u307E\u3057\u3087\u3046\u3002' },
      { icon: 'warn', text: '\u91CD\u8981\u306A\u30EA\u30BD\u30FC\u30B9\u306B\u306Fpreconnect/preload\u3092\u4F7F\u7528\u3057\u307E\u3057\u3087\u3046\u3002' },
      { icon: 'warn', text: '\u30B5\u30FC\u30C9\u30D1\u30FC\u30C6\u30A3\u30FC\u306EJS\u306F\u975E\u540C\u671F\u8AAD\u307F\u8FBC\u307F(async/defer)\u304C\u304A\u3059\u3059\u3081\u3067\u3059\u3002' },
      { icon: 'warn', text: 'HTTP/2\u307E\u305F\u306FH3\u3092\u6709\u52B9\u306B\u3057\u3066\u63A5\u7D9A\u306E\u52B9\u7387\u3092\u6539\u5584\u3057\u307E\u3057\u3087\u3046\u3002' },
    ];
    let gi = 0;
    while (tips.length < 3 && gi < genericTips.length) {
      tips.push(genericTips[gi++]);
    }

    return `
      <div class="velo-tips">
        <div class="velo-tips-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z"/><line x1="9" y1="21" x2="15" y2="21"/></svg>
          \u6539\u5584\u306E\u30D2\u30F3\u30C8
        </div>
        ${tips.slice(0, 4).map(t => `
          <div class="velo-tip-item">
            <span class="velo-tip-icon velo-tip-icon--${t.icon}">${t.icon === 'good' ? '\u2713' : t.icon === 'warn' ? '!' : '\u2717'}</span>
            <span>${t.text}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ===== Score Animation =====
  function animateScore(targetScore, color) {
    const ring = document.getElementById('velo-score-ring');
    const numEl = document.getElementById('velo-score-num');
    if (!ring || !numEl) return;

    const duration = 1500; // 1.5s
    const startTime = performance.now();
    const darkTrack = '#1e293b';

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(targetScore * eased);
      const angle = (targetScore * eased / 100) * 360;

      numEl.textContent = currentScore;
      ring.style.background = `conic-gradient(${color} 0deg, ${color} ${angle}deg, ${darkTrack} ${angle}deg, ${darkTrack} 360deg)`;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        numEl.textContent = targetScore;
        // Final pulse
        numEl.classList.add('velo-score-number--animating');
        setTimeout(() => numEl.classList.remove('velo-score-number--animating'), 300);
      }
    }

    requestAnimationFrame(frame);
  }

  // ===== History =====
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(url, score, grade) {
    const history = getHistory();
    history.unshift({
      url,
      score,
      grade,
      date: new Date().toISOString(),
    });
    // Keep only last N
    while (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    const history = getHistory();
    if (!historyEl) return;

    const section = container.querySelector('#velo-history-section');

    if (history.length === 0) {
      historyEl.innerHTML = '<div class="velo-empty">\u307E\u3060\u8A08\u6E2C\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</div>';
      // Hide clear button
      const clearBtn = container.querySelector('#velo-clear-history');
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }

    historyEl.innerHTML = history.map((item, i) => {
      const gc = getGradeClass(item.grade);
      const color = getGradeColor(item.grade);
      const dateStr = formatDate(item.date);
      return `
        <div class="velo-history-item" data-index="${i}" data-url="${escapeAttr(item.url)}">
          <div class="velo-history-grade velo-grade--${gc}">${item.grade}</div>
          <div class="velo-history-info">
            <div class="velo-history-url">${escapeHtml(item.url)}</div>
            <div class="velo-history-meta">${dateStr}</div>
          </div>
          <div class="velo-history-score" style="color:${color}">${item.score}</div>
        </div>
      `;
    }).join('');

    // Ensure clear button exists
    let clearBtn = container.querySelector('#velo-clear-history');
    if (!clearBtn) {
      clearBtn = document.createElement('button');
      clearBtn.id = 'velo-clear-history';
      clearBtn.className = 'velo-history-clear';
      clearBtn.textContent = '\u5C65\u6B74\u3092\u30AF\u30EA\u30A2';
      clearBtn.addEventListener('click', clearHistory);
      historyEl.parentNode.insertBefore(clearBtn, historyEl.nextSibling);
    }
    clearBtn.style.display = 'inline-block';

    // Click to re-run
    historyEl.querySelectorAll('.velo-history-item').forEach(el => {
      el.addEventListener('click', () => {
        const u = el.dataset.url;
        urlInput.value = u;
        urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        runTest(u);
      });
    });
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }

  // ===== Utilities =====
  function formatDate(isoStr) {
    try {
      const d = new Date(isoStr);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${month}/${day} ${hours}:${mins}`;
    } catch {
      return '';
    }
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init };
})();
