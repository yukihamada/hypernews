/**
 * feed-voice.js — Voice interaction module for news.online
 * Uses Web Speech API for speech recognition (voice commands).
 * Provides voice feedback via the podcast player's TTS.
 */
'use strict';

const FeedVoice = (() => {
  let recognition = null;
  let isListening = false;
  let voiceBtn = null;
  let statusEl = null;
  let supported = false;

  // Command mappings (Japanese + English)
  const COMMANDS = {
    next:     ['次', 'つぎ', 'next', '次のニュース', '次へ', 'ネクスト'],
    prev:     ['前', 'まえ', 'previous', '前のニュース', '前へ', '戻る', '戻って'],
    play:     ['再生', 'さいせい', 'play', '聞く', '聞かせて', '読んで', 'プレイ', '再生して'],
    pause:    ['停止', 'ていし', 'pause', 'stop', '止めて', 'とめて', 'ストップ', '一時停止'],
    all:      ['すべて', '全部', 'all', '全カテゴリ', 'ぜんぶ'],
    tech:     ['テクノロジー', 'テック', 'tech', 'technology', 'IT'],
    business: ['ビジネス', 'business', '経済', 'けいざい'],
    entertainment: ['エンタメ', 'entertainment', '芸能', 'げいのう'],
    sports:   ['スポーツ', 'sports'],
    science:  ['サイエンス', 'science', '科学', 'かがく'],
    general:  ['総合', 'そうごう', 'general', 'ニュース'],
    mute:     ['ミュート', 'mute', '静かに', '黙って', 'しずかに', '音声オフ'],
    unmute:   ['ミュート解除', 'unmute', '喋って', 'しゃべって', '音声オン', '読み上げ'],
  };

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      return;
    }
    supported = true;

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('end', handleEnd);
    recognition.addEventListener('error', handleError);

    createUI();
  }

  function createUI() {
    // Voice button (bottom-left, above safe area)
    voiceBtn = document.createElement('button');
    voiceBtn.className = 'feed-voice-btn';
    voiceBtn.id = 'feed-voice-btn';
    voiceBtn.setAttribute('aria-label', '音声コマンド');
    voiceBtn.innerHTML = `
      <svg class="voice-mic-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
        <path d="M19 10v2a7 7 0 01-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      <svg class="voice-stop-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display:none">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
      </svg>
    `;
    voiceBtn.addEventListener('click', toggle);
    document.body.appendChild(voiceBtn);

    // Status indicator
    statusEl = document.createElement('div');
    statusEl.className = 'feed-voice-status';
    statusEl.id = 'feed-voice-status';
    document.body.appendChild(statusEl);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .feed-voice-btn {
        position: fixed;
        left: 16px;
        bottom: max(20px, env(safe-area-inset-bottom, 20px));
        z-index: 20;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition: all 0.2s;
      }
      .feed-voice-btn:active {
        transform: scale(0.92);
      }
      .feed-voice-btn.listening {
        background: rgba(239, 68, 68, 0.8);
        animation: voicePulse 1.2s ease-in-out infinite;
      }
      .feed-voice-btn.listening .voice-mic-icon { display: none; }
      .feed-voice-btn.listening .voice-stop-icon { display: block; }
      @keyframes voicePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
      }
      .feed-voice-status {
        position: fixed;
        left: 50%;
        top: 80px;
        transform: translateX(-50%);
        z-index: 20;
        padding: 8px 16px;
        border-radius: 20px;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #fff;
        font-size: 13px;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
        max-width: 80%;
        text-align: center;
      }
      .feed-voice-status.visible {
        opacity: 1;
      }
    `;
    document.body.appendChild(style);
  }

  function toggle() {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }

  function start() {
    if (!supported || !recognition) return;
    // Pause podcast if playing
    try {
      recognition.start();
      isListening = true;
      voiceBtn.classList.add('listening');
      showStatus('聞いています...');
    } catch (e) {
      console.error('Speech recognition start error:', e);
    }
  }

  function stop() {
    if (!recognition) return;
    try {
      recognition.stop();
    } catch { /* ignore */ }
    isListening = false;
    voiceBtn.classList.remove('listening');
    hideStatus();
  }

  function handleResult(event) {
    const results = event.results;
    if (!results || results.length === 0) return;

    // Collect all alternatives
    const alternatives = [];
    for (let i = 0; i < results[0].length; i++) {
      alternatives.push(results[0][i].transcript.trim().toLowerCase());
    }
    const text = alternatives[0];

    showStatus(`"${text}"`);

    // Match against commands
    const cmd = matchCommand(alternatives);
    if (cmd) {
      executeCommand(cmd, text);
    } else {
      showStatus(`"${text}" — コマンドが認識できませんでした`, 2000);
    }
  }

  function matchCommand(alternatives) {
    for (const alt of alternatives) {
      for (const [cmd, keywords] of Object.entries(COMMANDS)) {
        for (const kw of keywords) {
          if (alt.includes(kw.toLowerCase())) {
            return cmd;
          }
        }
      }
    }
    return null;
  }

  function executeCommand(cmd, rawText) {
    switch (cmd) {
      case 'next':
        showStatus('次のニュースへ', 1500);
        if (typeof FeedApp !== 'undefined') FeedApp.autoScrollNext();
        break;
      case 'prev': {
        showStatus('前のニュースへ', 1500);
        // Navigate to previous
        const container = document.getElementById('feed-container');
        if (container) {
          const items = container.querySelectorAll('.feed-item');
          const active = container.querySelector('.feed-item.active');
          if (active) {
            const idx = Array.from(items).indexOf(active);
            if (idx > 0) items[idx - 1].scrollIntoView({ behavior: 'smooth' });
          }
        }
        break;
      }
      case 'play': {
        showStatus('再生します', 1500);
        const activeItem = document.querySelector('.feed-item.active');
        if (activeItem && typeof FeedPlayer !== 'undefined') {
          FeedPlayer.togglePlay(activeItem);
        }
        break;
      }
      case 'pause': {
        showStatus('停止します', 1500);
        const playingItem = document.querySelector('.feed-item.active');
        if (playingItem && typeof FeedPlayer !== 'undefined') {
          FeedPlayer.togglePlay(playingItem);
        }
        break;
      }
      case 'all':
        showStatus('すべてのニュース', 1500);
        setFeedCategory('');
        break;
      case 'tech':
        showStatus('テクノロジー', 1500);
        setFeedCategory('tech');
        break;
      case 'business':
        showStatus('ビジネス', 1500);
        setFeedCategory('business');
        break;
      case 'entertainment':
        showStatus('エンタメ', 1500);
        setFeedCategory('entertainment');
        break;
      case 'sports':
        showStatus('スポーツ', 1500);
        setFeedCategory('sports');
        break;
      case 'science':
        showStatus('サイエンス', 1500);
        setFeedCategory('science');
        break;
      case 'general':
        showStatus('総合', 1500);
        setFeedCategory('general');
        break;
      case 'mute':
        showStatus('読み上げをオフにしました', 1500);
        if (typeof FeedApp !== 'undefined') FeedApp.setAnnounce(false);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        break;
      case 'unmute':
        showStatus('読み上げをオンにしました', 1500);
        if (typeof FeedApp !== 'undefined') FeedApp.setAnnounce(true);
        break;
    }
  }

  function setFeedCategory(cat) {
    // Click the matching category button
    const btn = document.querySelector(`.feed-cat-btn[data-category="${cat}"]`);
    if (btn) btn.click();
  }

  function handleEnd() {
    isListening = false;
    voiceBtn.classList.remove('listening');
    setTimeout(() => hideStatus(), 2000);
  }

  function handleError(event) {
    console.log('Speech recognition error:', event.error);
    isListening = false;
    voiceBtn.classList.remove('listening');
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      showStatus('マイクのアクセスを許可してください', 3000);
    } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
      showStatus('音声認識エラー', 2000);
    }
  }

  let statusTimer = null;
  function showStatus(text, autoHideMs) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.add('visible');
    if (statusTimer) clearTimeout(statusTimer);
    if (autoHideMs) {
      statusTimer = setTimeout(hideStatus, autoHideMs);
    }
  }

  function hideStatus() {
    if (statusEl) statusEl.classList.remove('visible');
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
  }

  return { init, toggle, start, stop };
})();
