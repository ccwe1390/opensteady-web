(function () {
  'use strict';
  if (globalThis.__openSteadyController) return;
  const S = OpenSteadySelect, P = OpenSteadyPolicy, D = OpenSteadyDOM;
  let config = { enabled: false, mode: 'stable', doubleGuard: true, radius: 24 };
  let paused = false, heldAlt = false, delivering = false, preview = null, frozen = null, lastMove = 0;
  let selector = new S.StableSelector(), policy = new P.ClickPolicy();
  const counters = { redirects: 0, slips: 0, guarded: 0, abstentions: 0, errors: 0, samples: 0, slowestCallbackMs: 0 };
  // Closed shadow root avoids style collisions; the outline never receives input.
  const host = document.createElement('div'); host.setAttribute('data-opensteady-overlay', '');
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #078265;border-radius:6px;box-sizing:border-box;display:none;box-shadow:0 0 0 2px #fff9;';
  shadow.appendChild(box); document.documentElement.appendChild(host);
  function hide() { box.style.display = 'none'; preview = null; }
  function clear() { hide(); frozen = null; selector.reset(); policy.cancel(); }
  function error() {
    counters.errors++; clear();
    if (counters.errors >= 3) { paused = true; index.stop(); }
  }
  const index = new D.TargetIndex(host, error);
  const active = () => config.enabled && !paused;
  const stamp = e => e.timeStamp / 1000;
  const bypass = e => heldAlt || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || !active();
  const accepted = e => e.isTrusted && !delivering;
  function selectionPresent() { const s = document.getSelection(); return !!s && !s.isCollapsed; }
  function hit(e) { return D.actualControl(e.target); }
  function hitId(e) { return index.idFor(hit(e)); }
  function safeSpace(e) {
    return !D.sensitive(e.target) && !hit(e) && !selectionPresent() &&
      !e.composedPath().some(n => n instanceof Element && (n.shadowRoot || n.matches('[data-opensteady-no-assist]')));
  }
  function show(id, t) {
    const checked = index.validate(id, index.rects.get(id));
    if (!checked) { hide(); return; }
    const { rect } = checked;
    const since = preview?.id === id && D.sameRect(preview.rect, rect) ? preview.since : t;
    preview = { id, rect, since, last: t };
    box.style.left = rect.x - 3 + 'px'; box.style.top = rect.y - 3 + 'px';
    box.style.width = rect.w + 6 + 'px'; box.style.height = rect.h + 6 + 'px'; box.style.display = 'block';
  }
  function observe(e) {
    if (!accepted(e) || e.pointerType !== 'mouse') return;
    if (policy.press) { policy.move({ x: e.clientX, y: e.clientY, bypass: bypass(e) }); return; }
    if (bypass(e) || e.buttons !== 0 || D.sensitive(e.target)) { hide(); selector.reset(); return; }
    counters.samples++; lastMove = performance.now();
    const near = index.near(e.clientX, e.clientY, config.radius);
    // Nearby risky controls create an exclusion zone; do not redirect into their gaps.
    if (near.some(r => r.risky && S.distToRect(e.clientX, e.clientY, r) <= Math.min(12, config.radius))) { hide(); selector.reset(); return; }
    const id = selector.update(stamp(e), e.clientX, e.clientY, near);
    if (id === null) { counters.abstentions++; hide(); } else show(id, stamp(e));
  }
  function down(e) {
    if (!accepted(e)) return;
    frozen = null;
    const control = hit(e), id = index.idFor(control), t = stamp(e);
    const validPreview = preview && t - preview.last <= 0.6 && index.validate(preview.id, preview.rect);
    const safe = control ? D.eligible(control) : safeSpace(e);
    policy.down({ t, x: e.clientX, y: e.clientY, button: e.button, pointerType: e.pointerType, pointerId: e.pointerId,
      bypass: bypass(e) || !safe || selectionPresent(), hitId: id, selectedId: validPreview ? preview.id : null,
      previewAge: validPreview ? t - preview.since : 0, canRedirect: !control && safeSpace(e) });
    const chosen = policy.press?.candidate;
    if (chosen !== null && chosen !== undefined) {
      const checked = index.validate(chosen, id === chosen ? null : preview?.rect);
      if (checked) frozen = { id: chosen, rect: checked.rect }; else policy.cancel();
    }
  }
  function up(e) {
    if (!accepted(e)) return;
    policy.up({ t: stamp(e), x: e.clientX, y: e.clientY, pointerId: e.pointerId,
      bypass: bypass(e) || selectionPresent(), hitId: hitId(e) });
  }
  function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function click(e) {
    if (!accepted(e)) return;
    const p = policy.released;
    // Validate again immediately before delivery; stale/covered/moved controls abstain.
    const target = frozen && index.validate(frozen.id, frozen.rect);
    const native = hit(e), nativeSafe = D.eligible(native);
    const canRedirect = !!target && !!p && !selectionPresent() &&
      (p.hitId === frozen.id || safeSpace(e)) &&
      S.distToRect(p.x, p.y, frozen.rect) <= config.radius &&
      S.distToRect(p.upX, p.upY, frozen.rect) <= config.radius;
    const result = policy.click({ t: stamp(e), button: e.button, detail: e.detail,
      pointerType: e.pointerType || 'mouse', bypass: bypass(e), hitId: index.idFor(native),
      canRedirect, safe: nativeSafe || !!target });
    frozen = null;
    if (result.action === 'suppress') { stop(e); counters.guarded++; return; }
    if (result.action !== 'redirect' || !target || result.id !== target.rect.id || e.defaultPrevented) return;
    // Call synchronously inside trusted click dispatch to retain available user activation.
    delivering = true;
    try {
      target.el.focus({ preventScroll: true });
      if (!index.validate(target.rect.id, target.rect)) return;
      target.el.click();
    } finally { delivering = false; }
    stop(e);
    counters.redirects++; if (result.reason === 'slip') counters.slips++;
  }
  function wrap(fn) {
    return e => {
      const began = performance.now();
      try { fn(e); } catch { error(); }
      finally { counters.slowestCallbackMs = Math.max(counters.slowestCallbackMs, performance.now() - began); }
    };
  }
  const listeners = [];
  function listen(type, fn, target = window) {
    const callback = wrap(fn); target.addEventListener(type, callback, true); listeners.push([target, type, callback]);
  }
  listen('pointermove', observe); listen('pointerdown', down); listen('pointerup', up); listen('click', click);
  listen('dblclick', e => {
    if (accepted(e) && !bypass(e) && policy.suppressDoubleEvent(stamp(e), hitId(e))) stop(e);
  });
  for (const name of ['pointercancel', 'dragstart', 'gotpointercapture', 'contextmenu', 'blur']) listen(name, e => {
    // Capture sees element blur as well. Ordinary focus changes during a click are not window blur.
    if (name === 'blur' && e.target !== window) return;
    if (name === 'blur') heldAlt = false;
    clear();
  });
  for (const name of ['scroll', 'resize']) listen(name, () => { clear(); index.invalidate(); });
  listen('keydown', e => {
    if (!e.isTrusted) return;
    if (e.key === 'Escape' && active()) { paused = true; clear(); index.stop(); }
    if (e.key === 'Alt') { heldAlt = true; clear(); }
  });
  listen('keyup', e => { if (e.isTrusted && e.key === 'Alt') heldAlt = false; });
  listen('visibilitychange', () => { if (document.hidden) { heldAlt = false; clear(); } }, document);
  const staleTimer = setInterval(() => { if (preview && performance.now() - lastMove > 600) hide(); }, 300);
  function configure(value, resume = true) {
    config = { ...OpenSteadySettings.normalizeSettings(value), enabled: value.enabled === true };
    if (resume) paused = false;
    heldAlt = false; clear(); policy.reset();
    selector = config.mode === 'nearest' ? new S.NearestSelector({ radius: config.radius }) : new S.StableSelector({ radius: config.radius });
    policy = new P.ClickPolicy({ doubleGuard: config.doubleGuard });
    if (config.enabled && !paused) index.start(); else index.stop();
  }
  const controller = { configure, status: () => ({ enabled: active(), paused, config, counters: { ...counters }, index: { ...index.stats },
      outlineReady: !!preview, outlineAgeMs: preview ? Math.max(0, performance.now() - preview.since * 1000) : 0,
      selectionReason: selector.diagnostics?.reason || null }),
    dispose: () => { index.dispose(); clearInterval(staleTimer); for (const [target,type,fn] of listeners) target.removeEventListener(type,fn,true); host.remove(); } };
  globalThis.__openSteadyController = controller;
  // Extension messages never accept page-supplied synthetic pointer events or a lab flag.
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener((message, sender, reply) => {
      if (sender.id !== chrome.runtime.id) return;
      if (message.type === 'configure') { configure(message.config, message.resume === true); reply({ ok: true }); }
      if (message.type === 'status') reply(controller.status());
    });
    chrome.runtime.sendMessage({ type: 'content-config' }).then(r => { if (r?.config) configure(r.config, false); }).catch(() => { /* default disabled */ });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' || area === 'session') chrome.runtime.sendMessage({ type: 'content-config' }).then(r => {
        if (r?.config) configure(r.config, false);
      }).catch(() => { config.enabled = false; clear(); index.stop(); });
    });
  }
})();
