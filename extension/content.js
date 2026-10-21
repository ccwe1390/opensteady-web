(function () {
  'use strict';
  if (globalThis.__openSteadyController) return;
  const S = OpenSteadySelect, P = OpenSteadyPolicy, D = OpenSteadyDOM, J = OpenSteadyJitter;
  let config = { enabled: false, mode: 'stable', doubleGuard: true, radius: 24 };
  let paused = false, heldAlt = false, delivering = false, preview = null, frozen = null, lastMove = 0;
  let pressBlocked = false, pressSteady = true, pressOnControl = false, pressMadeSelection = false;
  let selectionAtPress = null, lastPress = null, lastDecision = null, pendingDrag = null;
  let selector = new S.StableSelector(), policy = new P.ClickPolicy(), dwell = new OpenSteadyDwell.DwellPolicy(), lastPoint = null;
  const linkDrag = new OpenSteadyLinkDrag.LinkDragPolicy(), jitter = new J.JitterMeter();
  const counters = { redirects: 0, slips: 0, guarded: 0, dwellClicks: 0, preventedLinkDrags: 0, preservedLinkClicks: 0, rejectedLinkClicks: 0, abstentions: 0, errors: 0, samples: 0, slowestCallbackMs: 0 };
  // Closed shadow root avoids style collisions; the outline never receives input.
  const host = document.createElement('div'); host.setAttribute('data-opensteady-overlay', '');
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #078265;border-radius:6px;box-sizing:border-box;display:none;box-shadow:0 0 0 2px #fff9;';
  const meter = document.createElement('div');
  meter.style.cssText = 'position:absolute;left:0;bottom:0;height:4px;width:100%;background:#078265;transform-origin:left;transform:scaleX(0);pointer-events:none;';
  box.appendChild(meter);
  shadow.appendChild(box); document.documentElement.appendChild(host);
  // Outline styles: border width, color, halo, progress bar height. "contrast" is black on a yellow halo, visible on light and dark pages.
  const OUTLINES = { standard: ['2px', '#078265', '0 0 0 2px #fff9', '4px'], bold: ['4px', '#078265', '0 0 0 2px #fff', '6px'], contrast: ['4px', '#000', '0 0 0 3px #ffd400', '6px'] };
  function styleOutline(kind) {
    const [width, color, halo, bar] = OUTLINES[kind] || OUTLINES.standard;
    box.style.borderWidth = width; box.style.borderColor = color; box.style.boxShadow = halo; meter.style.background = color; meter.style.height = bar;
  }
  function hide() { box.style.display = 'none'; preview = null; meter.style.transform = 'scaleX(0)'; }
  function clear() { hide(); frozen = null; lastPoint = null; dwell.cancel(); selector.reset(); policy.cancel(); linkDrag.abort(); jitter.reset(); }
  function error() {
    counters.errors++; clear();
    if (counters.errors >= 3) { paused = true; index.stop(); }
  }
  const index = new D.TargetIndex(host, error);
  const active = () => config.enabled && !paused;
  // Selection, gesture handling, and dwell all use the same delivery-time clock.
  // An event may have been timestamped before an intervening timer callback.
  const stamp = () => performance.now() / 1000;
  const bypass = e => heldAlt || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || !active();
  const accepted = e => e.isTrusted && !delivering;
  function selectionPresent() { const s = document.getSelection(); return !!s && !s.isCollapsed; }
  // The character position nearest a point. undefined means this browser cannot say.
  function caretAt(x, y) {
    if (document.caretRangeFromPoint) { const c = document.caretRangeFromPoint(x, y); return c ? { node: c.startContainer, offset: c.startOffset } : null; }
    if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); return c ? { node: c.offsetNode, offset: c.offset } : null; }
    return undefined;
  }
  // True when the point lies on selected text. Selected text elsewhere on the page is ignored:
  // a shaky press often selects something by accident, and that must not switch assistance off.
  // The browser is asked which character is nearest the point, and only that character and its
  // neighbour are measured, so the cost does not grow with the size of the selection.
  function selectionCovers(x, y) {
    const s = document.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return false;
    const caret = caretAt(x, y);
    if (caret === undefined) return true;                    // cannot tell: treat any selection as in the way
    const text = caret?.node;
    if (!text || text.nodeType !== 3) return false;          // the nearest position is not inside text
    for (let i = 0; i < s.rangeCount; i++) {
      const g = s.getRangeAt(i);
      if (!g.intersectsNode(text)) continue;
      // The selected part of this text node, narrowed to the characters on either side of the caret.
      const from = g.startContainer === text ? g.startOffset : 0, to = g.endContainer === text ? g.endOffset : text.length;
      const a = Math.max(from, caret.offset - 1), b = Math.min(to, caret.offset + 1);
      if (b <= a) continue;
      if (text.length > 1000000) return true;                // measuring inside a giant text node is slow: assume it is in the way
      const part = document.createRange(); part.setStart(text, a); part.setEnd(text, b);
      for (const r of part.getClientRects()) {
        if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1) return true;
      }
    }
    return false;
  }
  function selectionMark() {
    const s = document.getSelection();
    return s && !s.isCollapsed ? [s.anchorNode, s.anchorOffset, s.focusNode, s.focusOffset] : null;
  }
  const sameMark = (a, b) => a === b || (!!a && !!b && a.every((v, i) => v === b[i]));
  // A selection can be non-empty and still hold no visible text (only a line break, or a boundary).
  // Within one text node this is a cheap slice. Across nodes the selection is turned into text, which
  // usually is short, but in odd layouts a short press can select a lot and this then takes milliseconds.
  function selectionHasText() {
    const s = document.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return false;
    if (s.rangeCount === 1) {
      const g = s.getRangeAt(0);
      if (g.startContainer === g.endContainer && g.startContainer.nodeType === 3) return g.startContainer.data.slice(g.startOffset, g.endOffset).trim() !== '';
    }
    return String(s).trim() !== '';
  }
  function hit(e) { return D.actualControl(e.target); }
  function hitId(e) { return index.idFor(hit(e)); }
  function safeSpace(e) {
    return !D.sensitive(e.target) && !hit(e) &&
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
    if (e.buttons !== 0) linkDrag.move(e.clientX, e.clientY);
    if (policy.press) {
      if (bypass(e)) linkDrag.bypass();
      policy.move({ x: e.clientX, y: e.clientY, bypass: bypass(e) }); return;
    }
    // Shake is measured from the hand's own motion, on the events' own clock, before any press,
    // and only while assistance is on for this page.
    if (active() && e.buttons === 0) jitter.add(e.timeStamp / 1000, e.clientX, e.clientY);
    if (bypass(e) || e.buttons !== 0 || D.sensitive(e.target)) { lastPoint = null; dwell.cancel(); hide(); selector.reset(); return; }
    lastPoint = { x: e.clientX, y: e.clientY };
    counters.samples++; lastMove = performance.now();
    select(stamp(e), e.clientX, e.clientY, e.target);
  }
  function select(t, x, y, node) {
    if (D.sensitive(node)) { hide(); selector.reset(); return; }
    const near = index.near(x, y, config.radius);
    // Nearby risky controls create an exclusion zone; do not redirect into their gaps.
    if (near.some(r => r.risky && S.distToRect(x, y, r) <= Math.min(12, config.radius))) { hide(); selector.reset(); return; }
    const id = selector.update(t, x, y, near);
    if (id === null) { counters.abstentions++; hide(); } else show(id, t);
  }
  function down(e) {
    if (!accepted(e)) return;
    linkDrag.reset(); pendingDrag = null;
    // Manual presses stop dwell and require moving away before another automatic activation.
    dwell.block(stamp(e), e.clientX, e.clientY); lastPoint = null;
    frozen = null;
    const control = hit(e), id = index.idFor(control), t = stamp(e);
    const validPreview = preview && t - preview.last <= 0.6 && index.validate(preview.id, preview.rect);
    const safe = control ? D.eligible(control) : safeSpace(e);
    const shake = jitter.estimate(e.timeStamp / 1000), slipLimit = J.limitFor(shake);
    // Two separate questions. How far may this press wander (slipLimit, wider only from 4 px of shake)?
    // And is the hand steady enough that selected text is probably the person's own (under 2 px)?
    // Even mild shake selects text by accident all the time, so for any hand that is not steady,
    // selected text is not a reason to stand down.
    const steady = J.isSteady(shake);
    // For a steady hand, selected text matters when the press lands on it, unless that text is a link or button.
    pressBlocked = steady && selectionCovers(e.clientX, e.clientY) && !(control && D.eligible(control));
    pressSteady = steady; pressOnControl = !!control; pressMadeSelection = false;
    selectionAtPress = selectionMark(); lastDecision = null;
    lastPress = { shakePx: Math.round(shake * 10) / 10, slipLimitPx: Math.round(slipLimit * 10) / 10, steady, onControl: !!control,
      blockedBySelection: pressBlocked, outlined: !!validPreview, outlineAgeMs: validPreview ? Math.round((t - preview.since) * 1000) : 0 };
    policy.down({ t, x: e.clientX, y: e.clientY, button: e.button, pointerType: e.pointerType, pointerId: e.pointerId,
      bypass: bypass(e) || !safe || pressBlocked, hitId: id, selectedId: validPreview ? preview.id : null,
      previewAge: validPreview ? t - preview.since : 0, canRedirect: !control && safeSpace(e), slipLimit });
    const chosen = policy.press?.candidate;
    if (chosen !== null && chosen !== undefined) {
      const checked = index.validate(chosen, id === chosen ? null : preview?.rect);
      if (checked) frozen = { id: chosen, rect: checked.rect }; else policy.cancel();
    }
    // Remember the press so a drag that starts quickly can be cancelled: always for a press on an eligible
    // link or button, and for a press beside the outlined target only when the hand was not steady.
    if (config.dragGuard && frozen && policy.press && !bypass(e) && (control ? frozen.id === id : !steady)) {
      linkDrag.begin({ t, pointerId: e.pointerId, id: frozen.id, near: !control, x: e.clientX, y: e.clientY });
    }
  }
  function up(e) {
    if (!accepted(e)) return;
    const t = stamp(e);
    linkDrag.release(t, e.clientX, e.clientY);
    // A steady press beside a target that selected some text on its way is a text selection, not a near miss.
    // For a hand that is not steady the same thing is a slip, and the click handler removes the selection.
    // Only a press that could be corrected is looked at: one beside an outlined target, short enough.
    const pressed = policy.press;
    pressMadeSelection = pressSteady && !pressOnControl && !!frozen && !!pressed && pressed.maxDistance <= policy.sameTargetPx &&
      selectionPresent() && !sameMark(selectionMark(), selectionAtPress) && selectionHasText();
    policy.up({ t, x: e.clientX, y: e.clientY, pointerId: e.pointerId,
      bypass: bypass(e) || pressBlocked || pressMadeSelection, hitId: hitId(e) });
  }
  function stop(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  function click(e) {
    if (!accepted(e)) return;
    const drag = linkDrag.take();
    const p = policy.released;
    const native = hit(e), plain = e.detail !== 0 && !bypass(e);
    // After a drag the guard cancelled, the browser sends its click to the innermost element that contains
    // both the press and the release. Without the guard it would have dragged and sent no click at all.
    // A click with a modifier key held, and a keyboard click, are always left to the browser.
    let stray = false;
    if (drag?.cancelled && plain) {
      const ended = drag.upT ?? stamp(e);
      // Judged from the drag's own record, which survives a reset of the gesture policy (a scroll, a lost focus).
      const tooFar = drag.maxDistance > policy.sameTargetPx || ended - drag.t > policy.holdSeconds;
      // A click that reaches anything other than the pressed control (a card around the link, say, whether it is
      // marked as a control or only has a script listening for clicks) was not made on that thing.
      stray = index.idFor(native) !== drag.id;
      if (tooFar || (stray && !p)) {
        stop(e); counters.rejectedLinkClicks++; policy.cancel(); frozen = null;
        lastDecision = { action: 'stop', reason: tooFar ? 'cancelled-drag-went-too-far' : 'stray-click-after-cancelled-drag', ruledOut: null };
        return;
      }
    }
    if (drag?.cancelled && !p) {
      // The press is no longer followed as a click, but it stayed within bounds. The browser's own click stands.
      if (plain && index.idFor(native) === drag.id) counters.preservedLinkClicks++;
      lastDecision = { action: 'pass', reason: 'native-after-cancelled-drag', ruledOut: null };
      policy.cancel(); frozen = null; return;
    }
    // A stray click is judged as if it had reached no control at all, and it is stopped whatever is decided.
    const reached = stray ? null : native, nativeSafe = D.eligible(reached);
    // Validate again immediately before delivery; stale/covered/moved controls abstain.
    const target = frozen && index.validate(frozen.id, frozen.rect);
    // The press must be on or near the target, within the radius. So must the release, with one allowance:
    // when shake widened this press's limit, the release may be further away by that extra distance.
    // Name the first reason a correction is ruled out, for the status report. Null means none.
    const ruledOut = !p ? (pressMadeSelection ? 'press-selected-text' : 'press-not-a-click') : !frozen ? 'no-outlined-target' :
      !target ? 'target-gone-or-changed' : pressBlocked ? 'press-on-selected-text' :
      !(p.hitId === frozen.id || safeSpace(e)) ? 'click-landed-on-something-sensitive' :
      S.distToRect(p.x, p.y, frozen.rect) > config.radius ? 'press-too-far-from-target' :
      S.distToRect(p.upX, p.upY, frozen.rect) > config.radius + (p.slipLimit - policy.slipPx) ? 'release-too-far-from-target' : null;
    const canRedirect = ruledOut === null;
    const result = policy.click({ t: stamp(e), button: e.button, detail: e.detail,
      pointerType: e.pointerType || 'mouse', bypass: bypass(e), hitId: index.idFor(reached) ?? null,
      canRedirect, safe: nativeSafe || !!target });
    lastDecision = { action: result.action, reason: result.reason, ruledOut };
    frozen = null;
    const stopStray = () => { if (stray) { stop(e); counters.rejectedLinkClicks++; lastDecision = { ...lastDecision, action: 'stop', reason: 'stray-click-after-cancelled-drag' }; } };
    if (result.action === 'suppress') { stop(e); counters.guarded++; return; }
    if (drag?.cancelled && result.action === 'pass' && result.reason === 'native' && result.id === drag.id) counters.preservedLinkClicks++;
    if (result.action !== 'redirect' || !target || result.id !== target.rect.id || e.defaultPrevented) { stopStray(); return; }
    // Call synchronously inside trusted click dispatch to retain available user activation.
    let delivered = false;
    delivering = true;
    try {
      target.el.focus({ preventScroll: true });
      if (index.validate(target.rect.id, target.rect)) {
        // Text this same press selected is part of the slip. Remove it before the click lands.
        if (selectionPresent() && !sameMark(selectionMark(), selectionAtPress)) document.getSelection().removeAllRanges();
        target.el.click(); delivered = true;
      }
    } finally { delivering = false; }
    if (!delivered) { stopStray(); return; }
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
  function listen(type, fn, target = window, capture = true) {
    const callback = wrap(fn); target.addEventListener(type, callback, capture); listeners.push([target, type, callback, capture]);
  }
  listen('pointermove', observe); listen('pointerdown', down); listen('pointerup', up); listen('click', click);
  listen('dblclick', e => {
    if (accepted(e) && !bypass(e) && policy.suppressDoubleEvent(stamp(e), hitId(e))) stop(e);
  });
  // The quick drag guard decides in the capture listener, before the page sees the event, and acts in
  // actOnDrag, after the page's own handlers. Whatever was decided, a drag that the page cancels itself
  // needs nothing from the guard: the browser was never going to drag, so the press carries on as an
  // ordinary press. A drag that really starts ends the press: nothing will be corrected.
  const actOnDrag = wrap(e => {
    if (pendingDrag?.event !== e) return;
    const { cancel } = pendingDrag; pendingDrag = null;
    if (e.defaultPrevented) { linkDrag.reset(); return; }
    if (cancel) { e.preventDefault(); linkDrag.markCancelled(); counters.preventedLinkDrags++; return; }
    clear();
  });
  window.addEventListener('dragstart', actOnDrag, false); listeners.push([window, 'dragstart', actOnDrag, false]);
  listen('dragstart', e => {
    pendingDrag = null;
    if (!accepted(e)) { clear(); return; }
    // A page listener that ran even earlier has already cancelled the drag: the press carries on as an ordinary press.
    if (e.defaultPrevented) { linkDrag.reset(); return; }
    // A drag of selected text starts on a text node, so look at its parent element.
    const p = linkDrag.press, node = e.target instanceof Element ? e.target : e.target?.parentElement;
    // If the outline was on a different target when the press landed here, the press itself is in doubt:
    // leave the drag to the browser, so the guard never turns it into a click on a neighbor.
    const agreed = policy.press && (policy.press.selectedId === null || policy.press.selectedId === p?.id);
    // The drag must begin where the press did: on the pressed control, or, for a near miss, on something
    // that is not a control (selected text or an image beside the target). Anything explicitly draggable,
    // editable or otherwise sensitive is always left to the browser.
    const startedOn = index.idFor(D.actualControl(node));
    const sameStart = !!p && !!node && !D.sensitive(node) && (p.near ? startedOn === null : startedOn === p.id);
    const cancel = config.dragGuard && !bypass(e) && !!p && !!agreed && sameStart && frozen?.id === p.id &&
      linkDrag.canCancel(stamp(e), p.id) && !!index.validate(p.id, frozen.rect);
    // Window listeners run in the order they were added. Adding actOnDrag again now puts it after every
    // window listener the page has added so far, so a page that cancels the drag there is seen too.
    window.removeEventListener('dragstart', actOnDrag, false); window.addEventListener('dragstart', actOnDrag, false);
    pendingDrag = { event: e, cancel };
  });
  for (const name of ['pointercancel', 'gotpointercapture', 'contextmenu', 'blur']) listen(name, e => {
    // Capture sees element blur as well. Ordinary focus changes during a click are not window blur.
    if (name === 'blur' && e.target !== window) return;
    if (name === 'blur') heldAlt = false;
    clear();
  });
  for (const name of ['scroll', 'resize']) listen(name, () => { clear(); index.invalidate(); });
  listen('keydown', e => {
    if (!e.isTrusted) return;
    lastPoint = null; dwell.cancel();
    if (e.key === 'Escape' && active()) { paused = true; clear(); index.stop(); }
    if (e.key === 'Alt') { heldAlt = true; clear(); }
  });
  listen('keyup', e => { if (e.isTrusted && e.key === 'Alt') heldAlt = false; });
  listen('visibilitychange', () => { if (document.hidden) { heldAlt = false; clear(); } }, document);
  listen('wheel', clear);
  listen('pointerout', e => { if (e.relatedTarget === null) clear(); });
  const staleTimer = setInterval(() => { if (!config.dwellEnabled && preview && performance.now() - lastMove > 600) hide(); }, 300);
  function dwellTick() {
    if (!config.dwellEnabled || !active() || heldAlt || policy.press || !lastPoint || document.hidden || !document.hasFocus()) {
      dwell.cancel(); meter.style.transform = 'scaleX(0)'; if (!lastPoint) hide(); return;
    }
    const { x, y } = lastPoint, t = performance.now() / 1000, node = document.elementFromPoint(x,y);
    const native = D.actualControl(node), nativeId = index.idFor(native);
    // Selected text under the pointer may be what the person is working with, unless it is the text of a link or button.
    if (selectionCovers(x, y) && !(native && D.eligible(native))) { dwell.cancel(); meter.style.transform = 'scaleX(0)'; return; }
    select(t,x,y,node);
    // Never automatically activate a neighbor while the pointer is over another control.
    const candidate = preview && !D.sensitive(node) && (nativeId === null || nativeId === preview.id) ? preview.id : null;
    const result = dwell.update(t,x,y,candidate);
    meter.style.transform = `scaleX(${result.progress})`;
    if (result.action !== 'activate') return;
    const target = index.validate(result.id, preview?.rect);
    if (!target) return;
    delivering = true;
    try {
      target.el.focus({ preventScroll: true });
      if (!index.validate(result.id, target.rect)) return;
      target.el.click(); counters.dwellClicks++;
    } finally { delivering = false; }
  }
  const dwellTimer = setInterval(wrap(dwellTick), 40);
  function configure(value, resume = true) {
    config = { ...OpenSteadySettings.normalizeSettings(value), enabled: value.enabled === true };
    if (resume) paused = false;
    styleOutline(config.outline);
    heldAlt = false; clear(); policy.reset();
    linkDrag.reset(); pendingDrag = null; pressBlocked = false; pressSteady = true; pressOnControl = false; pressMadeSelection = false;
    selectionAtPress = null; lastPress = null; lastDecision = null;
    dwell = new OpenSteadyDwell.DwellPolicy({ delay: config.dwellMs / 1000 });
    selector = config.mode === 'nearest' ? new S.NearestSelector({ radius: config.radius }) : new S.StableSelector({ radius: config.radius });
    policy = new P.ClickPolicy({ doubleGuard: config.doubleGuard });
    if (config.enabled && !paused) index.start(); else index.stop();
  }
  const controller = { configure, status: () => ({ enabled: active(), paused, config, counters: { ...counters }, index: { ...index.stats },
      dwell: { progress: dwell.progress, needsMovement: !!dwell.lock },
      outlineReady: !!preview, outlineAgeMs: preview ? Math.max(0, performance.now() - preview.since * 1000) : 0,
      selectionReason: selector.diagnostics?.reason || null, lastPress, lastDecision }),
    dispose: () => { index.dispose(); clearInterval(staleTimer); clearInterval(dwellTimer); for (const [target,type,fn,capture] of listeners) target.removeEventListener(type,fn,capture); host.remove(); } };
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
