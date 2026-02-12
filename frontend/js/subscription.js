/**
 * subscription.js — Device ID, Pro token, and subscription management
 */
'use strict';

const Subscription = (() => {
  const DEVICE_ID_KEY = 'hn_device_id';
  const PRO_TOKEN_KEY = 'hn_pro_token';

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getProToken() {
    return localStorage.getItem(PRO_TOKEN_KEY);
  }

  function setProToken(token) {
    if (token) {
      localStorage.setItem(PRO_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(PRO_TOKEN_KEY);
    }
    updateProBadge();
  }

  function isPro() {
    return !!getProToken();
  }

  function authHeaders() {
    const headers = {};
    headers['X-Device-Id'] = getDeviceId();
    // Priority: Pro token > Google auth token
    const proToken = getProToken();
    if (proToken) {
      headers['Authorization'] = `Bearer ${proToken}`;
    } else if (typeof GoogleAuth !== 'undefined' && GoogleAuth.isAuthenticated()) {
      headers['Authorization'] = `Bearer ${GoogleAuth.getAuthToken()}`;
    }
    return headers;
  }

  async function checkRedirect() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);

    // Poll for subscription status — the webhook may take a moment
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await fetch('/api/subscription/status', {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            // Retrieve token from checkout session
            const tokenRes = await fetch('/api/subscription/status', {
              headers: { 'X-Device-Id': getDeviceId() },
            });
            if (tokenRes.ok) {
              const tokenData = await tokenRes.json();
              if (tokenData.token) {
                setProToken(tokenData.token);
              }
            }
            Chat.openPanel();
            Chat.addMessage('Pro\u30d7\u30e9\u30f3\u3078\u306e\u30a2\u30c3\u30d7\u30b0\u30ec\u30fc\u30c9\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\uff01AI\u6a5f\u80fd\u304c\u7121\u5236\u9650\u3067\u3054\u5229\u7528\u3044\u305f\u3060\u3051\u307e\u3059\u3002', 'bot');
            return;
          }
        }
      } catch { /* ignore */ }

      if (attempts < 5) {
        setTimeout(poll, 2000);
      } else {
        Chat.openPanel();
        Chat.addMessage('Pro\u30d7\u30e9\u30f3\u306e\u6709\u52b9\u5316\u3092\u78ba\u8a8d\u4e2d\u3067\u3059\u3002\u3057\u3070\u3089\u304f\u304a\u5f85\u3061\u304f\u3060\u3055\u3044\u3002', 'bot');
      }
    };
    poll();
  }

  async function subscribe() {
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ device_id: getDeviceId() }),
      });
      if (res.status === 503) {
        Chat.addMessage('サブスクリプション機能は現在準備中です。もうしばらくお待ちください。', 'bot');
        return;
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      Chat.addMessage(`エラー: ${err.message}`, 'bot');
    }
  }

  async function openBillingPortal() {
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      if (res.status === 503) {
        Chat.addMessage('課金管理機能は現在準備中です。もうしばらくお待ちください。', 'bot');
        return;
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      Chat.addMessage(`エラー: ${err.message}`, 'bot');
    }
  }

  async function fetchUsage() {
    try {
      const res = await fetch('/api/usage', { headers: authHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function showUpgradePrompt(feature, limit, tier) {
    const suggestions = document.getElementById('chat-suggestions');
    Chat.openPanel();

    if (tier === 'authenticated' || (typeof GoogleAuth !== 'undefined' && GoogleAuth.isAuthenticated())) {
      // Authenticated user → promote Pro
      const msg = `${feature}の本日の利用回数（${limit}回）に達しました。Proプラン（¥500/月）で無制限にご利用いただけます。`;
      Chat.addMessage(msg, 'bot');
      if (suggestions) {
        suggestions.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'chat-chip chip-accent';
        btn.type = 'button';
        btn.textContent = 'Proにアップグレード';
        btn.addEventListener('click', () => {
          Chat.addMessage('Proにアップグレード', 'user');
          subscribe();
        });
        suggestions.appendChild(btn);
      }
    } else {
      // Free user → promote Google Sign-In + Pro
      const msg = `${feature}の本日の利用回数（${limit}回）に達しました。Googleログインで制限が2倍に！`;
      Chat.addMessage(msg, 'bot');
      if (suggestions) {
        suggestions.innerHTML = '';
        // Google Sign-In button
        const googleBtn = document.createElement('button');
        googleBtn.className = 'chat-chip chip-accent';
        googleBtn.type = 'button';
        googleBtn.textContent = 'Googleでログイン';
        googleBtn.addEventListener('click', () => {
          Chat.addMessage('Googleでログイン', 'user');
          if (typeof GoogleAuth !== 'undefined') {
            GoogleAuth.showOneTap();
            // Also render a button in suggestions area
            const container = document.createElement('div');
            container.id = 'google-signin-inline';
            container.style.padding = '8px 0';
            suggestions.innerHTML = '';
            suggestions.appendChild(container);
            GoogleAuth.renderButton(container);
          }
        });
        suggestions.appendChild(googleBtn);
        // Pro button
        const proBtn = document.createElement('button');
        proBtn.className = 'chat-chip';
        proBtn.type = 'button';
        proBtn.textContent = 'Proプラン（無制限）';
        proBtn.addEventListener('click', () => {
          Chat.addMessage('Proにアップグレード', 'user');
          subscribe();
        });
        suggestions.appendChild(proBtn);
      }
    }
  }

  function updateProBadge() {
    const logo = document.querySelector('.logo');
    if (!logo) return;
    const existing = logo.querySelector('.pro-badge');
    if (isPro() && !existing) {
      const badge = document.createElement('span');
      badge.className = 'pro-badge';
      badge.textContent = 'Pro';
      logo.appendChild(badge);
    } else if (!isPro() && existing) {
      existing.remove();
    }
  }

  return {
    getDeviceId,
    getProToken,
    setProToken,
    isPro,
    authHeaders,
    checkRedirect,
    subscribe,
    openBillingPortal,
    fetchUsage,
    showUpgradePrompt,
    updateProBadge,
  };
})();
