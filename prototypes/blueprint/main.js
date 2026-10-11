// Blueprint: the Montaser homepage as a living drawing set.
import { cube, joint, phase, DETAILS, pid, elevation } from './sketches.js';
import { initScrubs } from './scrub.js';
import { initChrome } from './chrome.js';
import { initRegister } from './register.js';
import { initWater } from './water.js';
import { initForm } from './form.js';
import { initLang } from './lang.js';
import { initDisclosures } from './disclose.js';
import { renderIcons } from './icons.js';
import { initMarquee } from './cover/marquee.js';
import { initLightbox } from './lightbox.js';
import { mountYard } from './yard/yard.js';
import { mountMap } from './atlas/map.js';

const root = document.documentElement;
const reduced = root.classList.contains('rm');
const SKETCHES = { cube, joint, pid, elevation, phase1: () => phase(1), phase2: () => phase(2), phase3: () => phase(3) };
const COUNT_MS = 1400;
const GL_MARGIN = '150% 0px';
const VIS_STEPS = [0, 0.1, 0.25, 0.5, 0.75, 1];

function renderSketches() {
  document.querySelectorAll('[data-sketch]').forEach((svg) => { svg.innerHTML = SKETCHES[svg.dataset.sketch](); });
  document.querySelectorAll('[data-detail]').forEach((svg) => { svg.innerHTML = DETAILS[svg.dataset.detail](); });
}

function countUp(el) {
  const to = Number(el.dataset.count);
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / COUNT_MS);
    el.textContent = Math.round(to * (1 - (1 - t) ** 3)).toLocaleString('en-US');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function observe(selector, cls, threshold, onEnter) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add(cls);
    onEnter?.(e.target);
    io.unobserve(e.target);
  }), { threshold, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll(selector).forEach((el) => io.observe(el));
}

function initElevation() {
  const fig = document.querySelector('[data-elev]');
  const svg = fig?.querySelector('svg');
  if (!svg || reduced) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = fig.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.8)));
    svg.style.setProperty('--p', p.toFixed(3));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

// One canvas and one WebGL2 context for every featured project, created when the first approaches.
// It moves into the most visible section and renders only when that section's progress changes.
function init3d(scrubs) {
  if (!('WebGL2RenderingContext' in window)) return;
  const list = [...scrubs.values()];
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    boot3d(list);
  }, { rootMargin: GL_MARGIN });
  list.forEach((s) => io.observe(s.stage));
}

async function boot3d(list) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scrub__gl';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!context) return;
  let gl;
  try {
    const { createStage } = await import('./3d/stage.js');
    gl = createStage({ canvas, context, mobile: matchMedia('(pointer: coarse)').matches || innerWidth < 700 });
  } catch (err) {
    console.warn('3D models unavailable; keeping the SVG drawings.', err);
    return;
  }
  const byStage = new Map(list.map((s) => [s.stage, s]));
  const ratios = new Map();
  list.forEach((s) => s.setMode('3d'));
  root.classList.add('has-3d');
  document.addEventListener('bp:progress', (e) => gl.setProgress(e.detail.id, e.detail.value));

  const vis = new IntersectionObserver((entries) => {
    entries.forEach((e) => ratios.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null;
    let bestR = 0;
    ratios.forEach((r, el) => { if (r > bestR) { bestR = r; best = el; } });
    if (!best) { gl.setVisible(false); return; }
    const s = byStage.get(best);
    gl.attach(best, s.id, s.get());
  }, { threshold: VIS_STEPS });
  list.forEach((s) => vis.observe(s.stage));

  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  list.forEach((s, i) => idle(() => gl.prebuild(s.id), { timeout: 2000 + i * 400 }));

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    vis.disconnect();
    gl.dispose();
    canvas.remove();
    root.classList.remove('has-3d');
    list.forEach((s) => s.setMode('svg'));
  }, { once: true });
}

function init() {
  renderIcons();
  renderSketches();
  initLang();
  initDisclosures();
  initMarquee(document.querySelector('[data-marquee]'));
  let scrubs = new Map();
  const chrome = initChrome({ getBuilt: (id) => scrubs.get(id)?.get() });
  scrubs = initScrubs({
    reduced,
    onChange: (sheetId, value, id) => {
      chrome.refreshBuild();
      document.dispatchEvent(new CustomEvent('bp:progress', { detail: { id, value } }));
    },
  });
  chrome.refreshBuild();

  if (reduced) {
    document.querySelectorAll('svg.dwg').forEach((s) => s.classList.add('is-drawn'));
    document.querySelectorAll('.reveal').forEach((s) => s.classList.add('is-in'));
  } else {
    observe('svg.dwg', 'is-drawn', 0.18);
    observe('.reveal', 'is-in', 0.1);
    observe('.qty[data-count]', 'is-counted', 0.6, countUp);
  }
  initElevation();
  init3d(scrubs);
  initWater();
  initForm();
  initRegister();
  initLightbox();
  mountModules();
}

// The precast yard (cover) and the map (after the featured projects) are self-contained modules.
function mountModules() {
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  const yardRoot = document.querySelector('[data-yard-mount]');
  if (yardRoot) {
    mountYard(yardRoot, {
      onShowSector: (key) => document.dispatchEvent(new CustomEvent('bp:sector', { detail: { key } })),
      onOpenProject: goTo,
    });
  }
  const mapRoot = document.querySelector('[data-map-mount]');
  if (mapRoot) {
    mountMap(mapRoot, {
      onOpenProject: goTo,
      onShowAllProjects: (id) => document.dispatchEvent(new CustomEvent('bp:find', { detail: { id } })),
    });
  }
}

init();
