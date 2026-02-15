/**
 * feed.js — Coming Soon landing page for news.online
 * Bilingual (EN/JA), 844万円 domain story + AI TV news teaser
 */
'use strict';

const FeedApp = (() => {
  const i18n = {
    en: {
      badge: 'Coming Soon',
      tagline: 'AI-Powered Video & Audio News. Like TV, but smarter.',
      amountLabel: 'The price of this domain',
      storyTitle: 'How I accidentally spent $56,000 on domain names',
      story1: 'I was browsing premium domains, excited about the AI news wave. "Oh, <strong>news.online</strong> is available!" I thought. One misclick later, I had purchased it for <strong>$30,000</strong>. Non-refundable.',
      story2: 'But I didn\'t stop there. In my panic-induced haze, I also grabbed <strong>news.xyz</strong>, <strong>news.cloud</strong>, and a handful of others. The total damage:',
      story3: 'No refunds. No mercy. So I did the only rational thing: I decided to build something <strong>worthy of an $56,000 domain</strong>. Written entirely in <strong>Rust</strong>, because if you\'re going to burn money, at least make it blazing fast.',
      invoiceOnline: 'news.online',
      invoiceXyz: 'news.xyz',
      invoiceCloud: 'news.cloud',
      invoiceOthers: 'Other domains & fees',
      invoiceTotal: 'Total damage',
      comingTitle: 'What\'s Coming',
      feat1Name: 'AI Video News',
      feat1Desc: 'Watch AI-generated news broadcasts with natural voices and visuals',
      feat2Name: 'Podcast Dialogues',
      feat2Desc: 'Two AI hosts discuss and debate every story in real-time',
      feat3Name: 'Swipe & Watch',
      feat3Desc: 'TikTok-style vertical feed — swipe through news like TV channels',
      feat4Name: 'Blazing Fast',
      feat4Desc: 'Rust backend, zero ads, instant load — the $56K speed experience',
      liveTitle: 'Already Live',
      liveXyzSub: 'AI-Powered News',
      liveCloudSub: 'Cloud News',
      techText: 'Backend powered by <strong>Rust</strong> + <strong>Axum</strong>. AI by <strong>Claude</strong>. Zero tracking. Zero ads. Pure speed.',
      footer: 'The $56,000 domain, coming to life.',
    },
    ja: {
      badge: 'Coming Soon',
      tagline: 'AI動画 & 音声ニュース。テレビを超える、次世代体験。',
      amountLabel: 'このドメインの購入価格',
      storyTitle: '手が滑って844万円課金した話',
      story1: 'ドメインを探していた。「お、<strong>news.online</strong>空いてるじゃん」。購入ボタンをクリックした瞬間、画面に表示された金額は<strong>¥4,537,500</strong>。プレミアムドメインの罠だった。返金不可。',
      story2: 'パニック状態のまま<strong>news.xyz</strong>、<strong>news.cloud</strong>、その他もろもろを購入。合計の請求額:',
      story3: '返金なし。容赦なし。だから決めた。<strong>844万円に見合うサービスを作る</strong>。バックエンドはすべて<strong>Rust</strong>で書き殴った。金を燃やすなら、せめて爆速にする。',
      invoiceOnline: 'news.online',
      invoiceXyz: 'news.xyz',
      invoiceCloud: 'news.cloud',
      invoiceOthers: 'その他ドメイン・手数料',
      invoiceTotal: '合計請求額',
      comingTitle: '開発中の機能',
      feat1Name: 'AI動画ニュース',
      feat1Desc: 'AIが生成する自然な音声と映像のニュース放送',
      feat2Name: 'ポッドキャスト対話',
      feat2Desc: '2人のAIホストがすべてのニュースをリアルタイムで議論',
      feat3Name: 'スワイプ & 視聴',
      feat3Desc: 'TikTok風の縦スワイプ — テレビのようにニュースを切り替え',
      feat4Name: '暴力的な速度',
      feat4Desc: 'Rustバックエンド、広告ゼロ、即座にロード — 844万円の速度体験',
      liveTitle: '公開中のサイト',
      liveXyzSub: 'AI高速ニュース',
      liveCloudSub: 'クラウドニュース',
      techText: 'バックエンド: <strong>Rust</strong> + <strong>Axum</strong>。AI: <strong>Claude</strong>。トラッキングなし。広告なし。純粋な速度。',
      footer: '844万円のドメイン、命を吹き込み中。',
    },
  };

  let lang = 'en';

  function init() {
    // Detect language from browser
    const browserLang = (navigator.language || '').toLowerCase();
    lang = browserLang.startsWith('ja') ? 'ja' : 'en';

    // Hide standard news UI
    const header = document.querySelector('.header');
    const main = document.querySelector('.main');
    const detailPanel = document.getElementById('detail-panel');
    const detailOverlay = document.getElementById('detail-overlay');
    const chatPanel = document.getElementById('chat-panel');
    const proModal = document.getElementById('pro-modal');
    const proModalOverlay = document.getElementById('pro-modal-overlay');
    [header, main, detailPanel, detailOverlay, chatPanel, proModal, proModalOverlay].forEach(el => {
      if (el) el.style.display = 'none';
    });

    // Dark mode
    document.body.dataset.mode = 'dark';
    document.body.style.background = '#000';
    document.body.style.overflow = 'hidden';

    render();
  }

  function render() {
    const t = i18n[lang];

    // Remove previous landing if exists
    const prev = document.getElementById('landing');
    if (prev) prev.remove();

    const landing = document.createElement('div');
    landing.id = 'landing';
    landing.className = 'landing';
    landing.innerHTML = `
      <div class="landing__bg"></div>

      <div class="landing__lang">
        <button class="landing__lang-btn ${lang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
        <button class="landing__lang-btn ${lang === 'ja' ? 'active' : ''}" data-lang="ja">JA</button>
      </div>

      <div class="landing__content">
        <!-- Hero -->
        <div class="landing__hero">
          <div class="landing__badge">${t.badge}</div>
          <h1 class="landing__logo">news.online</h1>
          <p class="landing__tagline">${t.tagline}</p>
        </div>

        <!-- Price tag -->
        <div class="landing__price-tag">
          <div class="landing__amount">${lang === 'ja' ? '¥8,449,007' : '$56,000'}</div>
          <div class="landing__amount-label">${t.amountLabel}</div>
        </div>

        <!-- Story -->
        <div class="landing__story">
          <div class="landing__story-card">
            <h2 class="landing__story-title">${t.storyTitle}</h2>
            <p class="landing__story-text">${t.story1}</p>
            <p class="landing__story-text">${t.story2}</p>

            <div class="landing__invoice">
              <div class="landing__invoice-row landing__invoice-row--highlight">
                <span>${t.invoiceOnline}</span>
                <span class="landing__invoice-val">${lang === 'ja' ? '¥4,537,500' : '$30,250'}</span>
              </div>
              <div class="landing__invoice-row">
                <span>${t.invoiceXyz}</span>
                <span class="landing__invoice-val">${lang === 'ja' ? '¥1,815,000' : '$12,100'}</span>
              </div>
              <div class="landing__invoice-row">
                <span>${t.invoiceCloud}</span>
                <span class="landing__invoice-val">${lang === 'ja' ? '¥181,500' : '$1,210'}</span>
              </div>
              <div class="landing__invoice-row">
                <span>${t.invoiceOthers}</span>
                <span class="landing__invoice-val">${lang === 'ja' ? '¥1,915,007' : '$12,440'}</span>
              </div>
              <div class="landing__invoice-row landing__invoice-row--total">
                <span>${t.invoiceTotal}</span>
                <span class="landing__invoice-val">${lang === 'ja' ? '¥8,449,007' : '$56,000'}</span>
              </div>
            </div>

            <p class="landing__story-text">${t.story3}</p>
          </div>
        </div>

        <!-- What's coming -->
        <div class="landing__coming">
          <h2 class="landing__section-title">${t.comingTitle}</h2>
          <div class="landing__features">
            <div class="landing__feature">
              <span class="landing__feature-icon" aria-hidden="true">&#x1F3AC;</span>
              <div class="landing__feature-name">${t.feat1Name}</div>
              <div class="landing__feature-desc">${t.feat1Desc}</div>
            </div>
            <div class="landing__feature">
              <span class="landing__feature-icon" aria-hidden="true">&#x1F399;</span>
              <div class="landing__feature-name">${t.feat2Name}</div>
              <div class="landing__feature-desc">${t.feat2Desc}</div>
            </div>
            <div class="landing__feature">
              <span class="landing__feature-icon" aria-hidden="true">&#x1F4F1;</span>
              <div class="landing__feature-name">${t.feat3Name}</div>
              <div class="landing__feature-desc">${t.feat3Desc}</div>
            </div>
            <div class="landing__feature">
              <span class="landing__feature-icon" aria-hidden="true">&#x26A1;</span>
              <div class="landing__feature-name">${t.feat4Name}</div>
              <div class="landing__feature-desc">${t.feat4Desc}</div>
            </div>
          </div>
        </div>

        <!-- Live sites -->
        <div class="landing__live">
          <h2 class="landing__section-title">${t.liveTitle}</h2>
          <div class="landing__live-links">
            <a class="landing__live-link" href="https://news.xyz" target="_blank" rel="noopener">
              news.xyz
              <small>${t.liveXyzSub}</small>
            </a>
            <a class="landing__live-link" href="https://news.cloud" target="_blank" rel="noopener">
              news.cloud
              <small>${t.liveCloudSub}</small>
            </a>
          </div>
        </div>

        <!-- Tech -->
        <div class="landing__tech">
          <p class="landing__tech-text">${t.techText}</p>
        </div>

        <!-- Footer -->
        <div class="landing__footer">
          <p class="landing__footer-text">${t.footer}</p>
        </div>
      </div>
    `;

    document.body.appendChild(landing);

    // Language toggle
    landing.querySelectorAll('.landing__lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        lang = btn.dataset.lang;
        render();
      });
    });
  }

  return { init };
})();
