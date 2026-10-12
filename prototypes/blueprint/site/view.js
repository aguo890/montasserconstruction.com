// The site view: a full-screen native <dialog> with the 3D stage (about two thirds) and the info panel.
// Opening pushes #site/<id>; Back or close returns to the page; prev/next replace the hash. The stage
// opens on the card's photo in navy duotone, which fades into the site plan; the build then runs Plan →
// Drawing → Print → Built, with a stage ticker that also moves between the stages. Full screen and "Hide
// details" make the stage immersive. Without WebGL2, on a load error or without a manifest entry the stage
// shows the scene's photo instead, so it is never blank.
import { getLang, setLang } from '../lang.js';
import { initDisclosures } from '../disclose.js';
import { SITES, getSite, photosOf, siteIndex } from './sites.js';
import { loadManifest, scenesFor } from './models.js';
import { LABELS, frameHtml, infoHtml, railHtml, stageLabel } from './panel.js';

const MIN_PHOTO_MS = 420;
const STAGE_BUTTONS = 4;
const FULLSCREEN_ESC_GUARD_MS = 400;
const PRELOAD_RETRY_MS = 500;
const NARROW = '(max-width: 860px)';
const LOADING_DELAY_MS = 400;
const HISTORY_SETTLE_MS = 600;
const ROTATE_STEP = 12;
const TILT_STEP = 6;
const ZOOM_STEP = 1.15;
const root = document.documentElement;
const isReduced = () => root.classList.contains('rm');
const wait = (ms) => new Promise((r) => { setTimeout(r, ms); });
const hasWebGL2 = () => 'WebGL2RenderingContext' in window;

const s = {
  dlg: null, el: {}, site: null, scenes: [], scene: 0, token: 0,
  opener: null, didPush: false, fromHistory: false, keepFocus: false,
  stage: null, stagePromise: null, stageFailed: false, photoAt: 0, hintShown: false,
  isWide: false, wasFullscreen: false, fullscreenExitAt: -Infinity,
};

const hashUrl = (id) => `${location.pathname}${location.search}#site/${encodeURIComponent(id)}`;
const plainUrl = () => `${location.pathname}${location.search}`;

function loadStage() {
  if (!hasWebGL2() || s.stageFailed) return Promise.resolve(null);
  s.stagePromise ||= import('./stage.js').catch((err) => {
    console.warn('3D stage unavailable; showing photos.', err);
    s.stageFailed = true;
    return null;
  });
  return s.stagePromise;
}

async function getStage() {
  if (s.stage) return s.stage.isLost() ? null : s.stage;
  const mod = await loadStage();
  if (!mod || s.stageFailed) return null;
  s.stage = mod.createStage(s.el.gl, { isReduced, onLost: onContextLost, onProgress: syncTicker });
  if (!s.stage) s.stageFailed = true;
  return s.stage;
}

/** Warms the manifest and the 3D code (three.js and loaders) before the first open. */
export function prefetch() {
  loadManifest();
  loadStage();
}

/* ---------- dialog frame ---------- */

function query(dlg) {
  const q = (sel) => dlg.querySelector(sel);
  return {
    frame: q('.site__frame'), stageBox: q('[data-site-stage]'), gl: q('[data-site-gl]'), photo: q('[data-site-photo]'), img: q('[data-site-photo] img'),
    load: q('[data-site-load]'), pct: q('[data-site-pct]'), ctl3d: q('[data-site-ctl3d]'), hint: q('[data-site-hint]'),
    rail: q('[data-site-rail]'), note: q('[data-site-note]'), fallback: q('[data-site-fallback]'),
    info: q('[data-site-info]'), count: q('[data-site-count]'), lang: q('[data-site-lang]'),
    builds: [...dlg.querySelectorAll('[data-site-build]')], fullscreen: q('[data-site-fs]'), details: q('[data-site-details]'),
  };
}

function ensureDialog() {
  if (s.dlg) return s.dlg;
  const dlg = document.createElement('dialog');
  dlg.className = 'site';
  dlg.setAttribute('aria-labelledby', 'site-title');
  dlg.innerHTML = frameHtml();
  document.body.append(dlg);
  s.dlg = dlg;
  s.el = query(dlg);
  bindDialog(dlg);
  syncLangButton();
  s.el.fullscreen.hidden = !canFullscreen();
  setDetails(!s.isWide);
  return dlg;
}

function syncLangButton() {
  s.el.lang.setAttribute('aria-pressed', String(getLang() === 'ar'));
}

/* ---------- photo layer ---------- */

function setPhoto(photo, { duo }) {
  const { img, photo: box } = s.el;
  if (img.dataset.base !== photo.base) {
    img.src = photo.src;
    img.width = photo.w;
    img.height = photo.h;
    img.dataset.base = photo.base;
    box.style.setProperty('--w', `${photo.w}px`);
    box.style.setProperty('--h', `${photo.h}px`);
  }
  img.alt = photo.alt[getLang()];
  img.dataset.altEn = photo.alt.en;
  img.dataset.altAr = photo.alt.ar;
  box.classList.toggle('is-duo', duo);
  box.classList.add('is-on');
  s.photoAt = performance.now();
}

function hidePhoto() {
  s.el.photo.classList.remove('is-on');
}

function setLoading(fraction) {
  const { load, pct } = s.el;
  if (fraction === null) { load.hidden = true; return; }
  load.hidden = false;
  pct.textContent = fraction > 0 ? `${Math.round(fraction * 100)}%` : '';
}

/* ---------- stage modes ---------- */

/** 'loading', '3d' or 'fallback'. Only the 3D view is an interactive, labelled application. */
function setStageMode(mode) {
  const { stageBox, gl, ctl3d, fallback, hint } = s.el;
  const is3d = mode === '3d';
  stageBox.classList.toggle('is-fallback', mode === 'fallback');
  stageBox.classList.toggle('is-3d', is3d);
  ctl3d.hidden = !is3d;
  fallback.hidden = mode !== 'fallback';
  if (!is3d) hint.hidden = true;
  if (is3d) {
    gl.setAttribute('role', 'application');
    setAria(gl, stageLabel(s.site));
  } else {
    gl.removeAttribute('role');
    gl.removeAttribute('aria-label');
  }
}

function setAria(el, pair) {
  el.setAttribute('aria-label', pair[getLang()]);
  el.dataset.ariaEn = pair.en;
  el.dataset.ariaAr = pair.ar;
}

function showFallback(scene) {
  s.stage?.clear();
  setLoading(null);
  setPhoto(scene.photo, { duo: false });
  setStageMode('fallback');
}

/** The stage ticker: the live stage is highlighted, each button fills with its stage's progress, and the
 *  stage the build is heading for (or holding at) is pressed. */
function syncTicker(p, target) {
  const live = Math.min(STAGE_BUTTONS - 1, Math.max(0, Math.ceil(p) - 1));
  s.el.builds.forEach((b, i) => {
    b.style.setProperty('--p', Math.min(1, Math.max(0, p - i)).toFixed(3));
    b.classList.toggle('is-now', i === live);
    const pressed = String(i === target - 1);
    if (b.getAttribute('aria-pressed') !== pressed) b.setAttribute('aria-pressed', pressed);
  });
}

function onContextLost() {
  const scene = s.scenes[s.scene];
  if (scene && s.dlg?.open) showFallback(scene);
}

/** Loads and reveals one scene; keepPhoto leaves the card photo up while a new site loads. */
async function showScene(index, mode, { keepPhoto = false } = {}) {
  const token = ++s.token;
  s.scene = index;
  const scene = s.scenes[index];
  markRail();
  const stage = scene.glb ? await getStage() : null;
  if (token !== s.token) return;
  if (!stage) { showFallback(scene); return; }
  if (!keepPhoto) setPhoto(scene.photo, { duo: true });
  setStageMode('loading');
  const loadingTimer = setTimeout(() => setLoading(0), LOADING_DELAY_MS);
  try {
    const model = await stage.load(scene, { onProgress: (f) => { if (token === s.token) setLoading(f); } });
    if (token !== s.token) return;
    await Promise.all([stage.prepare(model), wait(Math.max(0, MIN_PHOTO_MS - (performance.now() - s.photoAt)))]);
    if (token !== s.token || !s.dlg.open) return;
    stage.present(model, scene, { mode, title: s.site.title });
    setStageMode('3d');
    hidePhoto();
    showHint();
    preloadNext(stage);
  } catch (err) {
    if (token === s.token) { console.warn(`3D model failed to load: ${scene.glb}`, err); showFallback(scene); }
  } finally {
    clearTimeout(loadingTimer);
    if (token === s.token) setLoading(null);
  }
}

/** Preloads the next scene's preview once the build has settled, so its parse never lands mid-sequence. */
function preloadNext(stage) {
  const next = s.scenes[s.scene + 1];
  if (!next?.glb) return;
  const token = s.token;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  const attempt = () => {
    if (token !== s.token || !s.dlg.open) return;
    if (stage.isBusy()) { setTimeout(attempt, PRELOAD_RETRY_MS); return; }
    idle(() => { if (token === s.token && s.dlg.open) stage.preload(next); }, { timeout: 4000 });
  };
  attempt();
}

function showHint() {
  if (s.hintShown || isReduced()) return;
  s.hintShown = true;
  s.el.hint.hidden = false;
}

/* ---------- info panel and rail ---------- */

function renderInfo() {
  s.el.info.innerHTML = infoHtml(s.site);
  s.el.info.scrollTop = 0;
  initDisclosures(s.el.info);
  s.el.count.textContent = `${siteIndex(s.site.id) + 1} / ${SITES.length}`;
}

function renderRail() {
  const { rail } = s.el;
  rail.hidden = s.scenes.length < 2;
  rail.innerHTML = railHtml(s.scenes, s.scene);
}

function markRail() {
  s.el.rail.querySelectorAll('[data-site-scene]').forEach((b) => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.siteScene) === s.scene));
  });
}

async function showSite(id, mode) {
  s.site = getSite(id);
  const token = ++s.token;
  renderInfo();
  s.scenes = [];
  s.scene = 0;
  renderRail();
  setPhoto(photosOf(s.site)[0], { duo: true });
  setStageMode('loading');
  s.stage?.clear();
  const scenes = await scenesFor(s.site);
  if (token !== s.token) return;
  s.scenes = scenes;
  renderRail();
  showScene(0, mode, { keepPhoto: true });
}

/* ---------- open, close, history ---------- */

/** Opens the view on a site (or switches to it when already open). */
export function openSite(id, { opener = null, fromHistory = false } = {}) {
  const dlg = ensureDialog();
  if (dlg.open) {
    if (s.site?.id !== id) showSite(id, 'switch');
    return;
  }
  s.opener = opener || document.activeElement;
  s.didPush = !fromHistory;
  s.keepFocus = false;
  if (!fromHistory) history.pushState({ site: id }, '', hashUrl(id));
  root.classList.add('is-site-open');
  dlg.showModal();
  dlg.querySelector('[data-site-close]').focus({ preventScroll: true });
  showSite(id, 'entrance');
}

/** History moved off a #site/ hash: close without touching history again. */
export function closeFromHistory() {
  if (!s.dlg?.open) return;
  s.fromHistory = true;
  s.dlg.close();
}

function restoreFocus() {
  const el = s.opener;
  s.opener = null;
  if (s.keepFocus || !el?.isConnected || el === document.body || el.closest('dialog:not([open])')) return;
  el.focus({ preventScroll: true });
}

function onClosed() {
  s.token += 1;
  s.stage?.pause();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setLoading(null);
  root.classList.remove('is-site-open');
  if (!s.fromHistory) {
    if (s.didPush) history.back();
    else history.replaceState(history.state, '', plainUrl());
  }
  s.fromHistory = false;
  s.didPush = false;
  restoreFocus();
}

/** Closes the view and waits until history has settled, so a following scroll is not undone. */
function closeAndSettle() {
  const pushed = s.didPush;
  s.keepFocus = true;
  s.dlg.close();
  if (!pushed) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { removeEventListener('popstate', done); clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, HISTORY_SETTLE_MS);
    addEventListener('popstate', done);
  });
}

function step(delta) {
  const i = (siteIndex(s.site.id) + delta + SITES.length) % SITES.length;
  const id = SITES[i].id;
  history.replaceState({ site: id }, '', hashUrl(id));
  showSite(id, 'switch');
}

async function findInAllProjects() {
  const id = s.site.members[0];
  await closeAndSettle();
  document.dispatchEvent(new CustomEvent('bp:find', { detail: { id } }));
}

/* ---------- immersion: full screen and the details panel ---------- */

// A <dialog> itself may not go full screen (Fullscreen spec), so its frame does.
const canFullscreen = () => Boolean(document.fullscreenEnabled && s.el.frame?.requestFullscreen);

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else s.el.frame.requestFullscreen().catch((err) => console.warn('Full screen is unavailable.', err));
}

function syncFullscreen() {
  if (!s.dlg) return;
  const isFull = document.fullscreenElement === s.el.frame;
  if (s.wasFullscreen && !isFull) s.fullscreenExitAt = performance.now();
  s.wasFullscreen = isFull;
  s.el.fullscreen.setAttribute('aria-pressed', String(isFull));
  setAria(s.el.fullscreen, isFull ? LABELS.exitFullscreen : LABELS.fullscreen);
}

/** Escape leaves full screen first; the same key press must not also close the dialog. */
function onCancel(e) {
  if (document.fullscreenElement || performance.now() - s.fullscreenExitAt < FULLSCREEN_ESC_GUARD_MS) e.preventDefault();
}

function onEscapeInFullscreen(e) {
  if (e.key !== 'Escape' || !document.fullscreenElement) return;
  e.preventDefault();
  e.stopPropagation();
  document.exitFullscreen().catch(() => {});
}

/** Shows or hides the info panel (desktop); the stage widens and the renderer follows every frame. */
function setDetails(isShown) {
  const canHide = !matchMedia(NARROW).matches;
  const isWide = canHide && !isShown;
  s.isWide = isWide;
  s.dlg.classList.toggle('is-wide', isWide);
  s.el.info.inert = isWide;
  s.el.details.setAttribute('aria-expanded', String(!isWide));
  setAria(s.el.details, isWide ? LABELS.showDetails : LABELS.hideDetails);
}

/* ---------- input ---------- */

const KEYS = {
  ArrowLeft: { azimuth: -ROTATE_STEP }, ArrowRight: { azimuth: ROTATE_STEP },
  ArrowUp: { elevation: TILT_STEP }, ArrowDown: { elevation: -TILT_STEP },
  '+': { zoom: 1 / ZOOM_STEP }, '=': { zoom: 1 / ZOOM_STEP }, '-': { zoom: ZOOM_STEP }, _: { zoom: ZOOM_STEP },
};

function onStageKey(e) {
  if (e.target !== s.el.gl || !s.el.stageBox.classList.contains('is-3d')) return;
  if (e.key === 'Home' || e.key === '0') { e.preventDefault(); s.stage?.resetView(); return; }
  const move = KEYS[e.key];
  if (!move) return;
  e.preventDefault();
  s.el.hint.hidden = true;
  s.stage?.nudge(move);
}

function onDialogClick(e) {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.matches('[data-site-close]')) s.dlg.close();
  else if (t.matches('[data-site-step]')) step(Number(t.dataset.siteStep));
  else if (t.matches('[data-site-build]')) s.stage?.goToStage(Number(t.dataset.siteBuild));
  else if (t.matches('[data-site-fs]')) toggleFullscreen();
  else if (t.matches('[data-site-details]')) setDetails(s.isWide);
  else if (t.matches('[data-site-reset]')) s.stage?.resetView();
  else if (t.matches('[data-site-scene]')) { const i = Number(t.dataset.siteScene); if (i !== s.scene) showScene(i, 'switch'); }
  else if (t.matches('[data-site-photos]')) s.el.info.querySelector('.site__thumbs [data-lightbox]')?.click();
  else if (t.matches('[data-site-find]')) findInAllProjects();
  else if (t.matches('[data-site-lang]')) setLang(getLang() === 'ar' ? 'en' : 'ar');
}

/** Any input on the stage skips a running build to its end; the stage controls decide for themselves. */
function skipSequence(e) {
  if (e.target.closest?.('[data-site-ctl]')) return;
  if (s.stage?.isBusy()) s.stage.skip();
  s.el.hint.hidden = true;
}

function onLangChange() {
  syncLangButton();
  if (!s.dlg.open || !s.site) return;
  renderInfo();
  renderRail();
  const photo = s.scenes[s.scene]?.photo;
  if (photo) s.el.img.alt = photo.alt[getLang()];
  if (s.el.stageBox.classList.contains('is-3d')) setAria(s.el.gl, stageLabel(s.site));
  s.stage?.relabel();
}

function bindDialog(dlg) {
  dlg.addEventListener('click', onDialogClick);
  dlg.addEventListener('close', onClosed);
  dlg.addEventListener('cancel', onCancel);
  s.el.gl.addEventListener('keydown', onStageKey);
  ['pointerdown', 'wheel'].forEach((type) => s.el.stageBox.addEventListener(type, skipSequence, { capture: true, passive: true }));
  dlg.addEventListener('keydown', onEscapeInFullscreen, true);
  dlg.addEventListener('keydown', (e) => { if (e.key !== 'Escape' && e.key !== 'Tab') skipSequence(e); }, true);
  document.addEventListener('fullscreenchange', syncFullscreen);
  matchMedia(NARROW).addEventListener('change', () => setDetails(!s.isWide));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) s.stage?.pause();
    else if (dlg.open) s.stage?.resume();
  });
  window.addEventListener('montaser:langchange', onLangChange);
}
