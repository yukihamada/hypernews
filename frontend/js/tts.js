/**
 * tts.js — Text-to-Speech with ElevenLabs + Web Speech fallback
 */
'use strict';

const Tts = (() => {
  // Web Speech fallback styles
  const WEB_STYLES = {
    newscaster: { label: 'ニュースキャスター (ブラウザ)', pitch: 1.0, rate: 1.15 },
    ikebo:      { label: 'イケボ (ブラウザ)',             pitch: 0.75, rate: 0.9 },
  };

  let jaVoice = null;
  let currentAudio = null;
  let currentUtterance = null;
  let elVoices = [];       // ElevenLabs voices from API
  let elAvailable = false; // ElevenLabs configured on server?
  let voicesLoaded = false;

  function init() {
    pickJaVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.addEventListener('voiceschanged', pickJaVoice);
    }
    loadElevenLabsVoices();
  }

  function pickJaVoice() {
    const voices = speechSynthesis.getVoices();
    jaVoice = voices.find(v => /ja[-_]JP/i.test(v.lang))
           || voices.find(v => /ja/i.test(v.lang))
           || null;
  }

  async function loadElevenLabsVoices() {
    try {
      const res = await fetch('/api/tts/voices');
      if (!res.ok) return;
      const data = await res.json();
      elAvailable = data.available;
      elVoices = data.voices || [];
      voicesLoaded = true;

      // Auto-set default voice if none selected
      if (data.default_voice_id && getStyle() === 'off') {
        setStyle(`el:${data.default_voice_id}`);
      }
    } catch {
      elAvailable = false;
      voicesLoaded = true;
    }
  }

  function getVoices() {
    const all = [];
    // ElevenLabs voices (server already sorts: cloned → recommended → other)
    for (const v of elVoices) {
      let label = v.name;
      if (v.category === 'cloned') label += ' (My Voice)';
      else if (v.recommended) label = '\u2605 ' + label;
      all.push({
        id: `el:${v.voice_id}`,
        label,
        type: 'elevenlabs',
        voice_id: v.voice_id,
        category: v.category,
        preview_url: v.preview_url,
        recommended: v.recommended || false,
      });
    }
    // Web Speech fallback
    for (const [key, style] of Object.entries(WEB_STYLES)) {
      all.push({ id: `web:${key}`, label: style.label, type: 'web', key, recommended: false });
    }
    return all;
  }

  function isAvailable() {
    return elAvailable;
  }

  function setStyle(key) {
    Storage.set('ttsVoice', key);
    updateButtons();
  }

  function getStyle() {
    return Storage.get('ttsVoice') || 'off';
  }

  async function toggle(articleEl) {
    const style = getStyle();
    if (style === 'off') {
      Chat.openPanel();
      Chat.addMessage('読み上げを使うには、ボイスを選んでください。', 'bot');
      return;
    }

    if ((currentAudio || currentUtterance) && articleEl.classList.contains('speaking')) {
      stop();
      return;
    }

    stop();

    const title = articleEl.querySelector('.article-title')?.textContent || '';
    const desc = articleEl.querySelector('.article-desc')?.textContent || '';
    const text = (title + '。' + desc).trim();
    if (!text) return;

    articleEl.classList.add('speaking');

    // Send raw text — backend handles reading conversion inline
    _speak(text, () => {
      articleEl.classList.remove('speaking');
    });
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio = null;
    }
    speechSynthesis.cancel();
    currentUtterance = null;
    document.querySelectorAll('.article.speaking').forEach(el => el.classList.remove('speaking'));
  }

  function speakText(text, onEnd) {
    const style = getStyle();
    if (style === 'off') {
      if (onEnd) onEnd();
      return false;
    }
    stop();
    _speak(text, onEnd);
    return true;
  }

  /** djb2 hash for cache keys */
  function djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  }

  const TTS_CACHE_NAME = 'hypernews-tts-v1';

  async function _speak(text, onEnd) {
    const style = getStyle();
    if (style === 'off') { if (onEnd) onEnd(); return; }

    // API-based voice (ElevenLabs, OpenAI, Cartesia, Fish Audio)
    const isApiVoice = style.startsWith('el:') || style.startsWith('openai:')
      || style.startsWith('cartesia:') || style.startsWith('fish:')
      || style.startsWith('aimlapi:') || style.startsWith('venice:')
      || style.startsWith('cosyvoice:') || style.startsWith('qwen-tts:')
      || style.startsWith('qwen-omni:');
    if (isApiVoice) {
      const voiceId = style.startsWith('el:') ? style.slice(3) : style; // el: strips prefix, others sent as-is
      try {
        // Check Cache API for cached audio
        const textHash = djb2Hash(text);
        const cacheUrl = `/tts-cache/${encodeURIComponent(voiceId)}/${textHash}`;
        let blob = null;
        const ttsCache = typeof caches !== 'undefined' ? await caches.open(TTS_CACHE_NAME).catch(() => null) : null;
        if (ttsCache) {
          const cached = await ttsCache.match(cacheUrl);
          if (cached) {
            blob = await cached.blob();
          }
        }

        if (!blob) {
          // Cache miss — fetch from server
          const auth = typeof Subscription !== 'undefined' ? Subscription.authHeaders() : {};
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...auth },
            body: JSON.stringify({ text, voice_id: voiceId }),
          });
          if (res.status === 402) {
            if (typeof Subscription !== 'undefined') Subscription.showUpgradePrompt('TTS', 3);
            if (onEnd) onEnd();
            return;
          }
          if (!res.ok) throw new Error(`TTS error: ${res.status}`);
          blob = await res.blob();

          // Store in Cache API
          if (ttsCache) {
            const cacheRes = new Response(blob.slice(0), {
              headers: { 'Content-Type': 'audio/mpeg' },
            });
            ttsCache.put(cacheUrl, cacheRes).catch(() => {});
          }
        }

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          if (onEnd) onEnd();
        };
        audio.play();
      } catch {
        if (onEnd) onEnd();
      }
      return;
    }

    // Web Speech fallback
    const webKey = style.startsWith('web:') ? style.slice(4) : style;
    const cfg = WEB_STYLES[webKey];
    if (!cfg) { if (onEnd) onEnd(); return; }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ja-JP';
    utter.pitch = cfg.pitch;
    utter.rate = cfg.rate;
    if (jaVoice) utter.voice = jaVoice;

    utter.onend = () => { currentUtterance = null; if (onEnd) onEnd(); };
    utter.onerror = () => { currentUtterance = null; if (onEnd) onEnd(); };

    currentUtterance = utter;
    speechSynthesis.speak(utter);
  }

  function updateButtons() {
    const style = getStyle();
    const voices = getVoices();
    const voice = voices.find(v => v.id === style);
    document.querySelectorAll('.tts-btn').forEach(btn => {
      btn.title = style === 'off' ? '読み上げOFF' : (voice?.label || '');
    });
  }

  // Legacy compatibility
  const STYLES = WEB_STYLES;

  return { init, setStyle, getStyle, getVoices, isAvailable, toggle, stop, speakText, updateButtons, STYLES, loadElevenLabsVoices };
})();
