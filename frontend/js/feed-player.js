/**
 * feed-player.js — Audio playback module for podcast feed
 * Handles segment-by-segment playback, speaker highlighting, and subtitle sync.
 */
'use strict';

const FeedPlayer = (() => {
  // Per-item state keyed by article_id
  const itemStates = new Map();

  // Currently playing item
  let activeItem = null;
  let currentAudio = null;
  let progressTimer = null;

  const STATE_IDLE = 0;
  const STATE_LOADING = 1;
  const STATE_PLAYING = 2;
  const STATE_PAUSED = 3;

  function getState(item) {
    const id = item.dataset.articleId;
    if (!itemStates.has(id)) {
      itemStates.set(id, {
        state: STATE_IDLE,
        segments: null,      // [{speaker, text, audio_base64}]
        currentSegment: -1,
        totalDuration: 0,
        elapsed: 0,
      });
    }
    return itemStates.get(id);
  }

  /** Called when a feed item enters the viewport */
  function onItemActivated(item) {
    // Don't auto-play; user must tap to start
  }

  /** Called when a feed item leaves the viewport */
  function onItemDeactivated(item) {
    const st = getState(item);
    if (st.state === STATE_PLAYING || st.state === STATE_LOADING) {
      pause(item);
    }
  }

  function togglePlay(item) {
    const st = getState(item);
    if (st.state === STATE_PLAYING) {
      pause(item);
    } else if (st.state === STATE_PAUSED && st.segments) {
      resume(item);
    } else if (st.state === STATE_IDLE || (st.state === STATE_PAUSED && !st.segments)) {
      startPodcast(item);
    }
  }

  async function startPodcast(item) {
    const st = getState(item);
    st.state = STATE_LOADING;
    updateUI(item);

    try {
      const body = {
        article_id: item.dataset.articleId,
        title: item.dataset.title,
        description: item.dataset.description,
        source: item.dataset.source,
      };
      if (item.dataset.url) body.url = item.dataset.url;

      const auth = typeof Subscription !== 'undefined' ? Subscription.authHeaders() : {};
      const deviceId = typeof Storage !== 'undefined' ? Storage.get('deviceId') : '';
      const headers = { 'Content-Type': 'application/json', ...auth };
      if (deviceId) headers['X-Device-Id'] = deviceId;

      const res = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (res.status === 402 || res.status === 429) {
        st.state = STATE_IDLE;
        setSubtitle(item, '');
        showUpgradeCTA(item, res.status === 429 ? '本日の利用回数に達しました' : 'トークン不足です');
        updateUI(item);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `API error: ${res.status}`);
      }

      const data = await res.json();
      st.segments = data.audio_segments || [];

      if (st.segments.length === 0) {
        st.state = STATE_IDLE;
        setSubtitle(item, 'ポッドキャストを生成できませんでした');
        updateUI(item);
        return;
      }

      st.currentSegment = -1;
      st.elapsed = 0;
      st.state = STATE_PLAYING;
      activeItem = item;
      item.classList.add('playing');
      updateUI(item);

      playNextSegment(item);
    } catch (e) {
      console.error('Podcast generation error:', e);
      st.state = STATE_IDLE;
      setSubtitle(item, e.message || 'エラーが発生しました');
      updateUI(item);
    }
  }

  function playNextSegment(item) {
    const st = getState(item);
    if (st.state !== STATE_PLAYING) return;

    st.currentSegment++;
    if (st.currentSegment >= st.segments.length) {
      // All segments done
      onPodcastEnd(item);
      return;
    }

    const seg = st.segments[st.currentSegment];

    // Update speaker highlight
    highlightSpeaker(item, seg.speaker);

    // Update subtitle
    setSubtitle(item, `「${seg.text}」`);

    // Play audio
    if (seg.audio_base64 && seg.audio_base64.length > 0) {
      const audioUrl = `data:audio/mpeg;base64,${seg.audio_base64}`;
      currentAudio = new Audio(audioUrl);

      currentAudio.addEventListener('ended', () => {
        playNextSegment(item);
      });

      currentAudio.addEventListener('error', () => {
        // Skip to next segment on error
        playNextSegment(item);
      });

      currentAudio.addEventListener('loadedmetadata', () => {
        // Update estimated total duration
        updateTotalDuration(st);
      });

      currentAudio.play().catch(() => {
        // Autoplay blocked — skip to next
        playNextSegment(item);
      });

      startProgressTracking(item);
    } else {
      // No audio for this segment — show text briefly then move on
      setTimeout(() => {
        if (st.state === STATE_PLAYING) {
          playNextSegment(item);
        }
      }, 2000);
    }
  }

  function startProgressTracking(item) {
    stopProgressTracking();
    progressTimer = setInterval(() => {
      if (!currentAudio || !activeItem) return;
      const st = getState(item);
      updateProgress(item, st);
    }, 100);
  }

  function stopProgressTracking() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  function updateTotalDuration(st) {
    // Estimate total duration from segments
    let total = 0;
    for (let i = 0; i < st.segments.length; i++) {
      if (i < st.currentSegment) {
        total += 5; // rough estimate for past segments
      } else if (i === st.currentSegment && currentAudio && currentAudio.duration) {
        total += currentAudio.duration;
      } else {
        total += 5; // estimate future segments
      }
    }
    st.totalDuration = total;
  }

  function updateProgress(item, st) {
    if (!currentAudio) return;
    const progressBar = item.querySelector('.player__progress-bar');
    const timeEl = item.querySelector('.player__time');
    if (!progressBar || !timeEl) return;

    // Calculate approximate elapsed
    let elapsed = 0;
    // Sum past segment durations (estimate 5s each)
    for (let i = 0; i < st.currentSegment; i++) {
      elapsed += 5;
    }
    elapsed += currentAudio.currentTime || 0;

    const total = Math.max(st.totalDuration, elapsed + 1);
    const pct = Math.min((elapsed / total) * 100, 100);
    progressBar.style.width = pct + '%';
    timeEl.textContent = formatTime(elapsed);
  }

  function pause(item) {
    const st = getState(item);
    st.state = STATE_PAUSED;
    if (currentAudio) {
      currentAudio.pause();
    }
    stopProgressTracking();
    item.classList.remove('playing');
    updateUI(item);
  }

  function resume(item) {
    const st = getState(item);
    st.state = STATE_PLAYING;
    activeItem = item;
    item.classList.add('playing');
    if (currentAudio && currentAudio.paused) {
      currentAudio.play().catch(() => {});
      startProgressTracking(item);
    } else {
      // Restart from current segment
      if (st.currentSegment >= 0 && st.currentSegment < st.segments.length) {
        st.currentSegment--;
        playNextSegment(item);
      }
    }
    updateUI(item);
  }

  function onPodcastEnd(item) {
    const st = getState(item);
    st.state = STATE_IDLE;
    st.currentSegment = -1;
    stopProgressTracking();
    item.classList.remove('playing');
    highlightSpeaker(item, null);
    setSubtitle(item, '再生完了');

    // Set progress to 100%
    const progressBar = item.querySelector('.player__progress-bar');
    if (progressBar) progressBar.style.width = '100%';

    updateUI(item);

    // Auto-scroll to next after 1.5s (if enabled)
    if (typeof FeedApp !== 'undefined' && FeedApp.shouldAutoScroll()) {
      setTimeout(() => {
        FeedApp.autoScrollNext();
      }, 1500);
    }
  }

  function highlightSpeaker(item, speaker) {
    const avatars = item.querySelectorAll('.player__avatar');
    avatars.forEach(av => {
      av.classList.toggle('active', av.dataset.speaker === speaker);
    });
  }

  function setSubtitle(item, text) {
    const subtitleEl = item.querySelector('.player__subtitle-text');
    if (!subtitleEl) return;
    subtitleEl.classList.remove('visible', 'fade-in');
    subtitleEl.textContent = text;
    // Trigger reflow for animation
    void subtitleEl.offsetWidth;
    subtitleEl.classList.add('visible', 'fade-in');
  }

  function updateUI(item) {
    const st = getState(item);
    const player = item.querySelector('.feed-item__player');
    const playIcon = item.querySelector('.player__play-icon');
    const pauseIcon = item.querySelector('.player__pause-icon');

    if (!player) return;

    player.classList.toggle('feed-item__player--loading', st.state === STATE_LOADING);

    if (playIcon && pauseIcon) {
      if (st.state === STATE_PLAYING) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function showUpgradeCTA(item, message) {
    // Show inline upgrade prompt in the player area
    const subtitleEl = item.querySelector('.player__subtitle-text');
    if (subtitleEl) {
      subtitleEl.innerHTML = `${message} <a href="/pro.html" style="color:#f59e0b;text-decoration:underline;font-weight:600">Proで無制限→</a>`;
      subtitleEl.classList.add('visible');
    }
  }

  return { onItemActivated, onItemDeactivated, togglePlay };
})();
