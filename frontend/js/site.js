/**
 * site.js — Site branding based on hostname
 * Detects claud vs xyz site and applies branding (logo, title, meta, manifest)
 */
'use strict';

const Site = (() => {
  const siteId = document.documentElement.dataset.site || 'xyz';

  const config = {
    xyz: {
      name: 'news.xyz',
      title: 'news.xyz - AI-Powered News',
      description: 'Smart news with AI-generated summaries, Q&A, and voice reading. The fastest AI news aggregator.',
      url: 'https://news.xyz/',
      image: 'https://news.xyz/icons/icon-512.png',
      manifest: 'manifest.json',
      themeColor: '#1a1a2e',
    },
    claud: {
      name: 'ClaudNews',
      title: 'ClaudNews - AI News by Claude',
      description: 'AI-powered news aggregator powered by Claude. Smart summaries, Q&A, and voice reading.',
      url: 'https://news.claud/',
      image: 'https://news.claud/icons/icon-512.png',
      manifest: 'manifest-claud.json',
      themeColor: '#1c1917',
    },
    online: {
      name: 'news.online',
      title: 'news.online - Voice News Feed',
      description: 'TikTok-style AI voice news feed. Swipe through the latest news with AI-generated podcast dialogues.',
      url: 'https://news.online/',
      image: 'https://news.online/icons/icon-512.png',
      manifest: 'manifest-online.json',
      themeColor: '#000000',
    },
    cloud: {
      name: 'news.cloud',
      title: 'news.cloud - News API Platform',
      description: 'Developer-friendly news aggregation API. AI summaries, article search, podcast generation, and MCP support.',
      url: 'https://news.cloud/',
      image: 'https://news.cloud/icons/icon-512.png',
      manifest: 'manifest-cloud.json',
      themeColor: '#0f172a',
    },
    chatnews: {
      name: 'ChatNews',
      title: 'ChatNews - Conversational AI News',
      description: 'Chat with AI about the latest news. Get summaries, deep dives, and answers in a conversational format.',
      url: 'https://chatnews.link/',
      image: 'https://chatnews.link/icons/icon-512.png',
      manifest: 'manifest-chatnews.json',
      themeColor: '#18181b',
    },
    yournews: {
      name: 'YourNews',
      title: 'YourNews - Personalized AI News',
      description: 'AI-curated news tailored to your interests. Your personalized news feed delivered daily.',
      url: 'https://yournews.link/',
      image: 'https://yournews.link/icons/icon-512.png',
      manifest: 'manifest-yournews.json',
      themeColor: '#0c0a09',
    },
    velo: {
      name: 'velo.tech',
      title: 'velo.tech - Web Speed Insights',
      description: 'Instant web performance measurement. Core Web Vitals, speed scores, and optimization suggestions in one click.',
      url: 'https://velo.tech/',
      image: 'https://velo.tech/icons/icon-512.png',
      manifest: 'manifest-velo.json',
      themeColor: '#020617',
    },
  };

  const c = config[siteId] || config.xyz;

  function apply() {
    // Logo
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.textContent = c.name;
    }

    // Title
    document.title = c.title;

    // Theme color
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', c.themeColor);

    // Canonical
    const canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute('href', c.url);

    // Manifest
    const mf = document.querySelector('link[rel="manifest"]');
    if (mf) mf.setAttribute('href', c.manifest);

    // Cross-site navigation footer
    renderFooter();

    // OGP
    setMeta('og:title', c.title);
    setMeta('og:url', c.url);
    setMeta('og:site_name', c.name);
    setMeta('og:image', c.image);
    setMeta('og:description', c.description);

    // Twitter
    setMeta('twitter:title', c.title);
    setMeta('twitter:description', c.description);
    setMeta('twitter:image', c.image);
  }

  function setMeta(nameOrProp, content) {
    const el = document.querySelector(`meta[name="${nameOrProp}"]`)
            || document.querySelector(`meta[property="${nameOrProp}"]`);
    if (el) el.setAttribute('content', content);
  }

  const sisterSites = [
    { id: 'xyz',      url: 'https://news.xyz/',       label: 'news.xyz',   desc: 'AIニュース' },
    { id: 'claud',    url: 'https://news.claud/',      label: 'ClaudNews',  desc: 'AIニュース' },
    { id: 'online',   url: 'https://news.online/',     label: 'news.online', desc: '音声ニュース' },
    { id: 'cloud',    url: 'https://news.cloud/',      label: 'news.cloud', desc: 'API' },
    { id: 'chatnews', url: 'https://chatnews.link/',   label: 'ChatNews',   desc: 'チャット' },
    { id: 'yournews', url: 'https://yournews.link/',   label: 'YourNews',   desc: 'パーソナル' },
    { id: 'velo',     url: 'https://velo.tech/',       label: 'velo.tech',  desc: '速度計測' },
  ];

  function renderFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const others = sisterSites.filter(s => s.id !== siteId);
    footer.innerHTML =
      '<div class="site-footer-label">姉妹サイト</div>' +
      '<div class="site-footer-links">' +
      others.map(s =>
        '<a class="site-footer-link" href="' + s.url + '" rel="noopener">' +
        s.label + '<span class="site-footer-brand"> - ' + s.desc + '</span></a>'
      ).join('') +
      '</div>';
  }

  // Apply immediately on parse (before DOMContentLoaded for meta tags that exist)
  // Logo will be applied on DOMContentLoaded since it's in body
  document.addEventListener('DOMContentLoaded', apply);

  return {
    id: siteId,
    name: c.name,
    title: c.title,
    url: c.url,
    themeColor: c.themeColor,
  };
})();
