(function () {
  'use strict';

  const CALENDLY_URL =
    'https://calendly.com/growthp175/free-social-media-growth-strategy-call';
  // Correct WebRTC SDP exchange endpoint — must include model as a query param.
  // (The old /v1/realtime/calls path does not exist.)
  const REALTIME_MODEL  = 'gpt-4o-realtime-preview-2024-12-17';
  const REALTIME_SDP_URL = `https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;

  function apiBase() {
    const raw = (window.BROKERBOOST_REALTIME_API || '').replace(/\/$/, '');
    return raw;
  }

  function sessionUrl() {
    const b = apiBase();
    if (!b) return '/api/realtime/session';
    return `${b}/api/realtime/session`;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  const seenCallIds = new Set();

  function runTool(name, args) {
    switch (name) {
      case 'open_scheduling':
        window.open(CALENDLY_URL, '_blank', 'noopener');
        return { ok: true, opened: 'calendly' };
      case 'scroll_to_section': {
        const map = { pricing: 'pricing', cta: 'cta', faq: 'faq' };
        const id = map[args.section];
        if (!id) return { ok: false, error: 'Invalid section' };
        const el = document.getElementById(id);
        if (!el) return { ok: false, error: 'Section not found' };
        el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
        return { ok: true, section: id };
      }
      case 'set_billing_period': {
        if (args.billing !== 'monthly' && args.billing !== 'yearly') {
          return { ok: false, error: 'Invalid billing' };
        }
        if (typeof window.brokerBoostSetBilling === 'function') {
          window.brokerBoostSetBilling(args.billing);
          return { ok: true, billing: args.billing };
        }
        return { ok: false, error: 'Billing UI not available' };
      }
      case 'start_checkout': {
        const plan = args.plan;
        if (!['starter', 'growth', 'pro'].includes(plan)) {
          return { ok: false, error: 'Invalid plan' };
        }
        if (args.billing && typeof window.brokerBoostSetBilling === 'function') {
          window.brokerBoostSetBilling(args.billing);
        }
        if (typeof window.openCheckout !== 'function') {
          return { ok: false, error: 'Checkout not available' };
        }
        window.openCheckout(plan);
        return { ok: true, plan };
      }
      case 'checkout_go_to_step': {
        const step = Number(args.step);
        if (![1, 2, 3].includes(step)) return { ok: false, error: 'Invalid step' };
        const overlay = document.getElementById('co-overlay');
        if (!overlay || !overlay.classList.contains('open')) {
          return { ok: false, error: 'Checkout modal is not open' };
        }
        if (typeof window.coShowStep !== 'function') {
          return { ok: false, error: 'Checkout UI not available' };
        }
        window.coShowStep(step);
        return { ok: true, step };
      }
      case 'submit_checkout_payment': {
        const overlay = document.getElementById('co-overlay');
        if (!overlay || !overlay.classList.contains('open')) {
          return { ok: false, error: 'Checkout modal is not open' };
        }
        const step =
          typeof window.brokerBoostGetCheckoutStep === 'function'
            ? window.brokerBoostGetCheckoutStep()
            : null;
        if (step !== 3) {
          return { ok: false, error: 'Complete steps 1–3 first' };
        }
        if (typeof window.coPay !== 'function') {
          return { ok: false, error: 'Payment action not available' };
        }
        window.coPay();
        return { ok: true, message: 'Opening Stripe' };
      }
      default:
        return { ok: false, error: 'Unknown tool' };
    }
  }

  function injectStyles() {
    if (document.getElementById('bb-voice-styles')) return;
    const style = document.createElement('style');
    style.id = 'bb-voice-styles';
    style.textContent = `
      .bb-voice-root{position:fixed;bottom:1.25rem;right:1.25rem;z-index:9998;display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;max-width:min(320px,calc(100vw - 2.5rem));font-family:'Inter',system-ui,sans-serif}
      .bb-voice-panel{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(168,205,184,.55);border-radius:14px;padding:.65rem .85rem;box-shadow:0 8px 32px rgba(45,106,79,.12),0 2px 8px rgba(28,18,8,.06)}
      .bb-voice-toggle{width:52px;height:52px;border-radius:50%;border:1.5px solid #2D6A4F;background:linear-gradient(145deg,#fff,#F2EBE0);color:#2D6A4F;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(45,106,79,.15);transition:transform .2s ease,box-shadow .2s ease}
      .bb-voice-toggle:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(45,106,79,.2)}
      .bb-voice-toggle:focus-visible{outline:2px solid #A0672C;outline-offset:2px}
      .bb-voice-toggle svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2}
      .bb-voice-toggle.connecting{pointer-events:none;opacity:.85}
      .bb-voice-toggle.live{background:linear-gradient(145deg,#2D6A4F,#1B4332);color:#fff;border-color:#1B4332}
      .bb-voice-toggle.error{border-color:#B00020;color:#B00020}
      .bb-voice-toggle .bb-pulse{position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(45,106,79,.35);animation:bb-pulse 1.8s ease-out infinite}
      @keyframes bb-pulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.35);opacity:0}}
      @media (prefers-reduced-motion:reduce){.bb-voice-toggle .bb-pulse{animation:none;display:none}}
      .bb-voice-legal{margin:0;font-size:.68rem;line-height:1.45;color:#8B6E55;text-align:right;max-width:260px}
      .bb-voice-legal a{color:#2D6A4F;text-decoration:underline;text-underline-offset:2px}
      .bb-voice-status{font-size:.72rem;color:#4A3120;margin:0;line-height:1.4}
    `;
    document.head.appendChild(style);
  }

  function buildUi() {
    injectStyles();
    const root = document.createElement('div');
    root.className = 'bb-voice-root';
    root.setAttribute('aria-live', 'polite');

    const panel = document.createElement('div');
    panel.className = 'bb-voice-panel';

    const status = document.createElement('p');
    status.className = 'bb-voice-status';
    status.textContent = 'Tap the mic to speak with our assistant.';

    const legal = document.createElement('p');
    legal.className = 'bb-voice-legal';
    legal.innerHTML =
      'Voice is sent to OpenAI for real-time responses. See our <a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>.';

    panel.appendChild(status);
    panel.appendChild(legal);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bb-voice-toggle';
    btn.setAttribute('aria-label', 'Start voice assistant');
    btn.style.position = 'relative';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3M8 21h8"/></svg>';

    root.appendChild(panel);
    root.appendChild(btn);
    document.body.appendChild(root);

    return { root, btn, status };
  }

  let pc = null;
  let dc = null;
  let localStream = null;
  let remoteAudio = null;
  let state = 'idle';
  const ui = buildUi();

  function setState(s, message) {
    state = s;
    ui.btn.classList.remove('connecting', 'live', 'error');
    ui.btn.querySelectorAll('.bb-pulse').forEach((n) => n.remove());

    if (s === 'connecting') {
      ui.btn.classList.add('connecting');
      ui.btn.setAttribute('aria-label', 'Connecting voice assistant');
      ui.status.textContent = message || 'Connecting…';
    } else if (s === 'live') {
      ui.btn.classList.add('live');
      ui.btn.setAttribute('aria-label', 'Stop voice assistant');
      ui.status.textContent = message || 'Listening. Tap again to stop.';
      if (!prefersReducedMotion()) {
        const pulse = document.createElement('span');
        pulse.className = 'bb-pulse';
        pulse.setAttribute('aria-hidden', 'true');
        ui.btn.appendChild(pulse);
      }
    } else if (s === 'error') {
      ui.btn.classList.add('error');
      ui.btn.setAttribute('aria-label', 'Voice assistant error — tap to retry');
      ui.status.textContent = message || 'Something went wrong. Tap to try again.';
    } else {
      ui.btn.setAttribute('aria-label', 'Start voice assistant');
      ui.status.textContent = message || 'Tap the mic to speak with our assistant.';
    }
  }

  function disconnect() {
    seenCallIds.clear();
    if (dc) {
      try {
        dc.close();
      } catch (_) {}
      dc = null;
    }
    if (pc) {
      try {
        pc.getSenders().forEach((s) => s.track && s.track.stop());
        pc.close();
      } catch (_) {}
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    if (remoteAudio) {
      remoteAudio.srcObject = null;
      remoteAudio.remove();
      remoteAudio = null;
    }
    setState('idle');
  }

  function handleServerEvent(ev) {
    if (!dc || ev.type !== 'response.done' || !ev.response || !Array.isArray(ev.response.output)) return;

    const calls = ev.response.output.filter(
      (x) => x.type === 'function_call' && x.status === 'completed' && x.call_id
    );
    if (!calls.length) return;

    for (const item of calls) {
      const callId = item.call_id;
      if (seenCallIds.has(callId)) continue;
      seenCallIds.add(callId);

      let result;
      try {
        const args = JSON.parse(item.arguments || '{}');
        result = runTool(item.name, args);
      } catch (e) {
        result = { ok: false, error: e.message || String(e) };
      }

      try {
        dc.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify(result),
            },
          })
        );
      } catch (_) {}
    }

    try {
      dc.send(JSON.stringify({ type: 'response.create' }));
    } catch (_) {}
  }

  function attachDataChannel(channel) {
    dc = channel;
    dc.addEventListener('message', (e) => {
      let ev;
      try {
        ev = JSON.parse(e.data);
      } catch {
        return;
      }
      if (ev.type === 'response.done') {
        handleServerEvent(ev);
      }
      if (ev.type === 'error') {
        console.warn('Realtime error', ev);
      }
    });
  }

  async function connect() {
    const base = apiBase();
    if (!base && typeof window.location !== 'undefined') {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        setState(
          'error',
          'Voice token URL is missing. Set window.BROKERBOOST_REALTIME_API in index.html, redeploy, then hard-refresh.'
        );
        return;
      }
    }

    setState('connecting', 'Waking voice service…');

    // ── Step 0: health-check ping to wake Render's free-tier service ──────
    // Render free services sleep after 15 min. The /health GET is fast and
    // sidesteps CORS (no Origin header on same-origin GET), warming the dyno
    // before the credentialled POST that follows.
    const healthUrl = `${apiBase()}/health`;
    try {
      await fetch(healthUrl, { method: 'GET', cache: 'no-store', mode: 'cors' });
    } catch (_) {
      // Non-fatal: service might still respond to the POST. Continue.
    }

    setState('connecting', 'Connecting…');

    // ── Step 1: fetch ephemeral token from our Node server ────────────────
    const tokenEndpoint = sessionUrl();
    let tokenRes;
    try {
      tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        mode: 'cors',
        cache: 'no-store',
      });
    } catch (err) {
      console.error('Voice token fetch failed:', tokenEndpoint, err);
      setState(
        'error',
        'Cannot reach the voice API. Check that ALLOWED_ORIGINS on the Render token service includes this site\'s exact origin, and that OPENAI_API_KEY is set.'
      );
      return;
    }

    if (!tokenRes.ok) {
      const hint =
        tokenRes.status === 502 || tokenRes.status === 503
          ? ' — check OPENAI_API_KEY on the Render token server'
          : '';
      setState('error', `Voice session failed (HTTP ${tokenRes.status})${hint}.`);
      return;
    }

    let tokenJson;
    try {
      tokenJson = await tokenRes.json();
    } catch {
      setState('error', 'Invalid token response from voice server.');
      return;
    }

    const ephemeralKey = tokenJson.value;
    if (!ephemeralKey) {
      setState('error', 'No voice credential returned by token server.');
      return;
    }

    // ── Step 2: request microphone ────────────────────────────────────────
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('error', 'Microphone access was denied or unavailable.');
      return;
    }

    // ── Step 3: set up WebRTC peer connection ─────────────────────────────
    pc = new RTCPeerConnection();
    remoteAudio = document.createElement('audio');
    remoteAudio.autoplay = true;
    remoteAudio.setAttribute('playsinline', 'true');
    document.body.appendChild(remoteAudio);

    pc.ontrack = (e) => {
      if (e.streams[0]) remoteAudio.srcObject = e.streams[0];
    };

    pc.addTrack(localStream.getAudioTracks()[0]);

    const channel = pc.createDataChannel('oai-events');
    attachDataChannel(channel);

    // ── Step 4: SDP offer → OpenAI Realtime (correct endpoint) ───────────
    // Endpoint: POST /v1/realtime?model=<model>  (NOT /v1/realtime/calls)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    let sdpRes;
    try {
      sdpRes = await fetch(REALTIME_SDP_URL, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });
    } catch {
      disconnect();
      setState('error', 'Could not connect to OpenAI Realtime.');
      return;
    }

    if (!sdpRes.ok) {
      const t = await sdpRes.text().catch(() => '');
      console.warn('OpenAI Realtime SDP failed', sdpRes.status, t.slice(0, 200));
      disconnect();
      setState('error', `Voice connection failed (OpenAI ${sdpRes.status}).`);
      return;
    }

    const answerSdp = await sdpRes.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    setState('live');
  }

  ui.btn.addEventListener('click', () => {
    if (state === 'connecting') return;
    if (state === 'live' || state === 'error') {
      disconnect();
      return;
    }
    connect();
  });
})();
