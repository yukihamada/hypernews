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
      title: 'news.xyz - AI超高速ニュース',
      description: 'AI搭載の超高速ニュースアグリゲーター。最新ニュースをAIが要約・質問応答・読み上げ。',
      url: 'https://news.xyz/',
      image: 'https://news.xyz/icons/icon-512.png',
      manifest: 'manifest.json',
      themeColor: '#1a1a2e',
    },
    claud: {
      name: 'ClaudNews',
      title: 'ClaudNews - AI超高速ニュース',
      description: 'AI搭載の超高速ニュースアグリゲーター。最新ニュースをAIが要約・質問応答・読み上げ。',
      url: 'https://news.claud/',
      image: 'https://news.claud/icons/icon-512.png',
      manifest: 'manifest-claud.json',
      themeColor: '#1c1917',
    },
    online: {
      name: 'news.online',
      title: 'news.online - AIニュースポッドキャスト',
      description: 'AIが生成する対話型ニュースポッドキャスト。縦スワイプで最新ニュースを音声で楽しめる。',
      url: 'https://news.online/',
      image: 'https://news.online/icons/icon-512.png',
      manifest: 'manifest-online.json',
      themeColor: '#000000',
    },
    cloud: {
      name: 'news.cloud',
      title: 'news.cloud - News API Platform',
      description: 'AIニュースAPI。記事検索・AI要約・ポッドキャスト生成・MCP対応。開発者向けニュースデータプラットフォーム。',
      url: 'https://news.cloud/',
      image: 'https://news.cloud/icons/icon-512.png',
      manifest: 'manifest-cloud.json',
      themeColor: '#0f172a',
    },
    chatnews: {
      name: 'ChatNews',
      title: 'ChatNews - AIとニュースを語ろう',
      description: 'AIとチャットしながらニュースを読む新体験。最新ニュースの要約・深掘り・質問をチャット形式で。',
      url: 'https://chatnews.link/',
      image: 'https://chatnews.link/icons/icon-512.png',
      manifest: 'manifest-chatnews.json',
      themeColor: '#18181b',
    },
    yournews: {
      name: 'YourNews',
      title: 'YourNews - あなた専用AIニュース',
      description: 'あなたの興味に合わせてAIがニュースをキュレーション。パーソナライズされたニュースフィードを毎日お届け。',
      url: 'https://yournews.link/',
      image: 'https://yournews.link/icons/icon-512.png',
      manifest: 'manifest-yournews.json',
      themeColor: '#0c0a09',
    },
    velo: {
      name: 'velo.tech',
      title: 'velo.tech - Web Speed Insights',
      description: 'Webサイトのパフォーマンスを瞬時に計測。Core Web Vitals、速度スコア、改善提案をワンクリックで。',
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
