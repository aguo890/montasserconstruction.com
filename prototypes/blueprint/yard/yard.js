// Precast yard for Blueprint: sector and project panels hang from an ink gantry rail and are lowered into a row.
// A self-contained band: pointer drag (mouse and touch), horizontal wheel or trackpad, keys, tabs and buttons drive it,
// with inertia, snap and swing. Reduced motion and short viewports get a native horizontal scroller instead.

import { createDossier } from './dossier.js';
import { buildPanels, buildTabs, setDrawer } from './panels.js';
import { LOGO_MARK, icon } from './icons.js';
import { T } from './strings.js';
import { getDir, getLang, isReduced, num, onReducedChange, say, tr } from './util.js';

const LIFT_ZONE = [0.64, 0.42];    // panels whose centre is past 64% of the band hang, fully hoisted 42% later
const SWING_GAIN = 0.085;          // degrees per px/frame of track velocity
const SWING_MAX = 7;
const SPRING = 0.1;
const DAMPING = 0.22;
const EASE = 0.14;                 // share of the remaining distance covered per frame when gliding to a panel
const DRAG_THRESHOLD = 6;
const FRICTION = 0.94;
const FLING_STOP = 0.03;           // px per ms
const WHEEL_SNAP_MS = 160;
const MIN_DRIVEN_HEIGHT = 520;
const END_MIN_PX = 260;
const NAME_MIN_PX = 20;
const FRAME_MS = 16.67;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => t * t * (3 - 2 * t);
const noop = () => {};

const SKELETON = `
  <div class="yd-stage">
    <div class="yd-rail" data-rail>
      <div class="yd-beam" aria-hidden="true"><span class="yd-trolley">${LOGO_MARK}</span></div>
      <nav class="yd-tabs" data-tabs></nav>
    </div>
    <div class="yd-meta" aria-hidden="true"><span class="yd-count" data-count></span><span class="yd-hint" data-hint></span></div>
    <div class="yd-viewport" tabindex="0" role="region" aria-roledescription="carousel" data-viewport>
      <ol class="yd-track" role="list" data-track></ol>
    </div>
    <div class="yd-ground" aria-hidden="true"></div>
    <div class="yd-nav">
      <button class="yd-step" type="button" data-step="-1">${icon('arrow', 'yd-flip yd-back')}</button>
      <button class="yd-step" type="button" data-step="1">${icon('arrow', 'yd-flip')}</button>
    </div>
    <p class="yd-sr" aria-live="polite" data-live></p>
  </div>`;

/** Sector names are display words; shrink each until its longest word fits the panel. */
function fitNames(track) {
  track.querySelectorAll('.yd-pc__name').forEach((name) => {
    name.style.fontSize = '';
    let size = parseFloat(getComputedStyle(name).fontSize);
    while (name.scrollWidth > name.clientWidth + 1 && size > NAME_MIN_PX) {
      size -= 2;
      name.style.fontSize = `${size}px`;
    }
  });
}

function query(root) {
  const $ = (sel) => root.querySelector(sel);
  return {
    viewport: $('[data-viewport]'), track: $('[data-track]'), rail: $('[data-rail]'), tabs: $('[data-tabs]'),
    count: $('[data-count]'), hint: $('[data-hint]'), live: $('[data-live]'), steps: [...root.querySelectorAll('[data-step]')],
  };
}

/** Writes the language-dependent chrome: labels, hint and the root's direction. */
function paintChrome(root, el) {
  root.dir = getDir() === 1 ? 'ltr' : 'rtl';
  root.lang = getLang();
  el.viewport.setAttribute('aria-label', tr(T.region));
  el.tabs.setAttribute('aria-label', tr(T.tabs));
  el.hint.innerHTML = say(T.hint);
  el.steps[0].setAttribute('aria-label', tr(T.prev));
  el.steps[1].setAttribute('aria-label', tr(T.next));
}

/**
 * Mounts the yard into `rootEl` and returns { goTo, measure, destroy }.
 * onShowSector(key) fires from a sector's "See all n … projects" ('all' from the closing panel).
 * onOpenProject(siteId) fires from the dossier's "View in 3D" (a site id from site/sites.js, e.g. 'city-club').
 */
export function mountYard(rootEl, { onShowSector = noop, onOpenProject = noop } = {}) {
  const root = rootEl;
  root.classList.add('yard');
  root.hidden = false;
  root.innerHTML = SKELETON;
  const el = query(root);
  const dossier = createDossier({ onOpenProject });
  const abort = new AbortController();
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal: abort.signal });
  const s = {
    native: false, shift: 0, prevShift: 0, target: null, goal: 0, vel: 0, max: 0, vw: 1, pad: 0, liftPx: 0, metrics: [],
    angle: 0, angVel: 0, current: -1, visible: false, raf: 0, last: 0,
  };
  let panels = [];
  let tabs = [];
  let drag = null;
  let suppressClick = false;
  let keyboardInput = false;
  let wheelTimer = 0;

  function build() {
    paintChrome(root, el);
    panels = buildPanels(el.track);
    tabs = buildTabs(el.tabs, panels);
    s.current = -1;
  }

  function inlineStart(node, trackWidth) {
    return getDir() === 1 ? node.offsetLeft : trackWidth - node.offsetLeft - node.offsetWidth;
  }

  function measure() {
    fitNames(el.track);
    s.native = isReduced() || window.innerHeight < MIN_DRIVEN_HEIGHT;
    root.classList.toggle('is-driven', !s.native);
    s.vw = el.viewport.clientWidth || 1;
    s.pad = parseFloat(getComputedStyle(el.track).paddingInlineStart) || 0;
    panels.at(-1).el.style.width = `${Math.max(END_MIN_PX, s.vw - 2 * s.pad)}px`;
    const trackWidth = el.track.offsetWidth;
    s.metrics = panels.map((p) => ({ start: inlineStart(p.el, trackWidth), w: p.el.offsetWidth }));
    s.max = Math.max(0, trackWidth - s.vw);
    s.liftPx = parseFloat(getComputedStyle(root).getPropertyValue('--yd-lift')) || 0;
    if (s.native) { resetPanels(); readNative(); } else { s.shift = clamp(s.shift, 0, s.max); s.prevShift = s.shift; }
    render(1);
    wake();
  }

  function resetPanels() {
    el.track.style.transform = '';
    s.target = null;
    s.vel = 0;
    panels.forEach((p) => { p.hang.style.transform = ''; p.el.style.removeProperty('--lift'); p.lift = -1; });
  }

  function readNative() { s.shift = clamp(Math.abs(el.viewport.scrollLeft), 0, s.max); }

  const offsetOf = (i) => clamp(s.metrics[i].start - s.pad, 0, s.max);

  function nearestIndex() {
    let best = 0;
    s.metrics.forEach((m, i) => { if (Math.abs(m.start - s.pad - s.shift) < Math.abs(s.metrics[best].start - s.pad - s.shift)) best = i; });
    return best;
  }

  function paintCount(i) {
    const panel = panels[i];
    const label = panel.sector ? ` · ${say(panel.sector.name)}` : '';
    el.count.innerHTML = `${num(`${i + 1} / ${panels.length}`)}${label}`;
  }

  function updateCurrent() {
    const i = nearestIndex();
    if (i === s.current) return;
    s.current = i;
    paintCount(i);
    const key = panels[i].sector?.key ?? null;
    tabs.forEach((tab) => {
      if (tab.key !== key) { tab.el.removeAttribute('aria-current'); return; }
      tab.el.setAttribute('aria-current', 'true');
      if (s.visible) centerTab(tab.el);
    });
    el.steps[0].disabled = i === 0;
    el.steps[1].disabled = i === panels.length - 1;
  }

  function centerTab(tab) {
    const r = tab.getBoundingClientRect();
    const c = el.tabs.getBoundingClientRect();
    el.tabs.scrollBy({ left: r.left + r.width / 2 - (c.left + c.width / 2), behavior: 'instant' });
  }

  function renderPanels(time) {
    panels.forEach((p, i) => {
      const m = s.metrics[i];
      const rel = (m.start - s.shift + m.w / 2) / s.vw;
      const lift = smooth(clamp((rel - LIFT_ZONE[0]) / LIFT_ZONE[1], 0, 1));
      const sway = Math.sin(time / 760 + i * 1.7) * 0.55;
      const ang = (s.angle * p.sway + sway) * lift;
      if (Math.abs(lift - p.lift) < 0.0005 && Math.abs(ang - p.ang) < 0.01) return;
      if (p.lift > 0.002 && lift <= 0.002 && rel < 1) land(p);
      p.lift = lift;
      p.ang = ang;
      p.el.style.setProperty('--lift', lift.toFixed(4));
      p.hang.style.transform = lift > 0 ? `translate3d(0, ${(-lift * s.liftPx).toFixed(1)}px, 0) rotate(${ang.toFixed(3)}deg)` : '';
    });
  }

  function land(panel) {
    panel.el.classList.remove('is-landed');
    void panel.el.offsetWidth;
    panel.el.classList.add('is-landed');
  }

  function render(dt) {
    el.rail.style.setProperty('--prog', (s.max ? s.shift / s.max : 0).toFixed(4));
    if (s.native) { updateCurrent(); return; }
    const dir = getDir();
    el.track.style.transform = `translate3d(${(-dir * s.shift).toFixed(2)}px, 0, 0)`;
    // A hanging panel lags behind the track: screen velocity vx swings it by SWING_GAIN deg per px/frame.
    const vx = (-dir * (s.shift - s.prevShift)) / dt;
    s.prevShift = s.shift;
    const target = clamp(vx * SWING_GAIN, -SWING_MAX, SWING_MAX);
    s.angVel += ((target - s.angle) * SPRING - s.angVel * DAMPING) * dt;
    s.angle += s.angVel * dt;
    renderPanels(performance.now());
    updateCurrent();
  }

  /** Advances inertia (a fling) or the glide to a target panel by dt frames. */
  function step(dt) {
    if (drag?.active) return;
    if (s.vel) {
      const next = s.shift + s.vel * dt * FRAME_MS;
      s.shift = clamp(next, 0, s.max);
      s.vel *= FRICTION ** dt;
      if (next !== s.shift || Math.abs(s.vel) < FLING_STOP) { s.vel = 0; glideTo(nearestIndex()); }
      return;
    }
    if (s.target === null) return;
    const gap = s.target - s.shift;
    s.shift = Math.abs(gap) < 0.4 ? s.target : s.shift + gap * (1 - (1 - EASE) ** dt);
    if (s.shift === s.target) s.target = null;
  }

  function frame(time) {
    const dt = clamp((time - (s.last || time)) / FRAME_MS, 0.25, 3);
    s.last = time;
    step(dt || 1);
    render(dt || 1);
    s.raf = s.visible && !s.native && !document.hidden ? requestAnimationFrame(frame) : 0;
  }

  function wake() {
    if (!s.raf && s.visible && !s.native) { s.last = 0; s.raf = requestAnimationFrame(frame); }
  }

  function glideTo(i) {
    s.goal = i;
    s.target = offsetOf(i);
    wake();
  }

  function goTo(i, announce) {
    const index = clamp(i, 0, panels.length - 1);
    s.vel = 0;
    if (s.native) {
      s.goal = index;
      el.viewport.scrollTo({ left: offsetOf(index) * getDir(), behavior: isReduced() ? 'instant' : 'smooth' });
    } else {
      glideTo(index);
    }
    if (announce) el.live.textContent = tr(T.position(index + 1, panels.length, panels[index].title));
    return index;
  }

  const isMoving = () => s.target !== null || s.vel !== 0;
  const baseIndex = () => (isMoving() ? s.goal : s.current);

  function moveBy(ds) {
    if (s.native) { el.viewport.scrollBy({ left: ds * getDir(), behavior: 'instant' }); return; }
    s.target = null;
    s.shift = clamp(s.shift + ds, 0, s.max);
    wake();
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (s.native && e.pointerType !== 'mouse') return;
    s.vel = 0;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t: e.timeStamp, v: 0, active: false };
  }

  function startDrag(e) {
    const ax = Math.abs(e.clientX - drag.x0);
    const ay = Math.abs(e.clientY - drag.y0);
    if (ay > DRAG_THRESHOLD && ay > ax) { drag = null; return; }
    if (ax < DRAG_THRESHOLD) return;
    drag.active = true;
    drag.x = e.clientX;
    el.viewport.setPointerCapture(e.pointerId);
    el.viewport.classList.add('is-dragging');
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active) { startDrag(e); return; }
    const dx = e.clientX - drag.x;
    const dt = Math.max(1, e.timeStamp - drag.t);
    drag.v = 0.7 * (dx / dt) + 0.3 * drag.v;
    drag.x = e.clientX;
    drag.t = e.timeStamp;
    moveBy(-dx * getDir());
  }

  function onPointerEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.active) {
      el.viewport.classList.remove('is-dragging');
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      if (s.native) goTo(nearestIndex(), false);
      else { s.vel = -drag.v * getDir(); wake(); }
    }
    drag = null;
  }

  function onWheel(e) {
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (s.native || Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
    e.preventDefault();
    s.vel = 0;
    moveBy(dx * getDir());
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => glideTo(nearestIndex()), WHEEL_SNAP_MS);
  }

  function onKey(e) {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const forward = getDir() === 1 ? 'ArrowRight' : 'ArrowLeft';
    const back = getDir() === 1 ? 'ArrowLeft' : 'ArrowRight';
    const map = { [forward]: baseIndex() + 1, [back]: baseIndex() - 1, Home: 0, End: panels.length - 1 };
    if (!(e.key in map)) return;
    e.preventDefault();
    const index = goTo(map[e.key], true);
    if (el.viewport.contains(document.activeElement) && document.activeElement !== el.viewport) {
      panels[index].el.querySelector('button')?.focus({ preventScroll: true });
    }
  }

  function onFocusIn(e) {
    const panel = e.target.closest('.yd-pc');
    if (!panel || !keyboardInput) return;
    const index = panels.findIndex((p) => p.el === panel);
    if (index !== baseIndex()) goTo(index, false);
  }

  function onClick(e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; return; }
    const toggle = e.target.closest('[data-more]');
    if (toggle) { setDrawer(toggle, toggle.getAttribute('aria-expanded') !== 'true'); return; }
    const open = e.target.closest('[data-open]');
    if (open) { dossier.open(open.dataset.open, open); return; }
    const sector = e.target.closest('[data-sector]');
    if (sector) onShowSector(sector.dataset.sector);
  }

  function onLangChange() {
    const index = Math.max(0, s.current);
    build();
    measure();
    s.shift = offsetOf(index);
    s.prevShift = s.shift;
    s.target = null;
    if (s.native) el.viewport.scrollTo({ left: s.shift * getDir(), behavior: 'instant' });
    render(1);
    dossier.refresh();
  }

  on(el.viewport, 'pointerdown', onPointerDown);
  on(el.viewport, 'pointermove', onPointerMove);
  on(el.viewport, 'pointerup', onPointerEnd);
  on(el.viewport, 'pointercancel', onPointerEnd);
  on(el.viewport, 'wheel', onWheel, { passive: false });
  on(el.viewport, 'keydown', onKey);
  on(el.viewport, 'focusin', onFocusIn);
  on(el.viewport, 'click', onClick, { capture: true });
  on(el.viewport, 'dragstart', (e) => e.preventDefault());
  on(el.viewport, 'scroll', () => { if (s.native) { readNative(); render(1); } }, { passive: true });
  el.steps.forEach((btn) => on(btn, 'click', () => goTo(baseIndex() + Number(btn.dataset.step), true)));
  on(el.tabs, 'click', (e) => {
    const tab = e.target.closest('[data-stop]');
    if (tab) goTo(tabs.find((t) => t.key === tab.dataset.stop).index, true);
  });
  on(window, 'keydown', () => { keyboardInput = true; }, { capture: true });
  on(window, 'pointerdown', () => { keyboardInput = false; }, { capture: true });
  on(window, 'resize', () => measure(), { passive: true });
  on(window, 'montaser:langchange', onLangChange);
  on(document, 'visibilitychange', wake);
  onReducedChange(() => measure(), abort.signal);

  const io = new IntersectionObserver(([entry]) => { s.visible = entry.isIntersecting; wake(); }, { rootMargin: '10% 0px' });
  io.observe(root);
  const ro = new ResizeObserver(() => measure());
  ro.observe(el.viewport);
  build();
  document.fonts?.ready.then(() => { if (!abort.signal.aborted) measure(); });
  measure();

  function destroy() {
    abort.abort();
    io.disconnect();
    ro.disconnect();
    cancelAnimationFrame(s.raf);
    clearTimeout(wheelTimer);
    dossier.destroy();
    root.classList.remove('yard', 'is-driven');
    root.innerHTML = '';
  }

  return { goTo: (i) => goTo(i, true), measure, destroy };
}
