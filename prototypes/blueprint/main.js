// Blueprint: the Montaser homepage as a living drawing set.
import { cube, joint, phase, pid, elevation } from './sketches.js';
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
import { initSites, openSite } from './site/boot.js';
import { siteIdForProject } from './site/sites.js';

const root = document.documentElement;
const reduced = root.classList.contains('rm');
const SKETCHES = { cube, joint, pid, elevation, phase1: () => phase(1), phase2: () => phase(2), phase3: () => phase(3) };
const COUNT_MS = 1400;

function renderSketches() {
  document.querySelectorAll('[data-sketch]').forEach((svg) => { svg.innerHTML = SKETCHES[svg.dataset.sketch](); });
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

function init() {
  renderIcons();
  renderSketches();
  initLang();
  initDisclosures();
  initMarquee(document.querySelector('[data-marquee]'));
  initChrome();

  if (reduced) {
    document.querySelectorAll('svg.dwg').forEach((s) => s.classList.add('is-drawn'));
    document.querySelectorAll('.reveal').forEach((s) => s.classList.add('is-in'));
  } else {
    observe('svg.dwg', 'is-drawn', 0.18);
    observe('.reveal', 'is-in', 0.1);
    observe('.qty[data-count]', 'is-counted', 0.6, countUp);
  }
  initElevation();
  initWater();
  initForm();
  initRegister();
  initLightbox();
  initSites();
  mountModules();
}

const findProject = (id) => document.dispatchEvent(new CustomEvent('bp:find', { detail: { id } }));

/** From the yard or the map: a project with a site opens the site view, any other its row in All projects. */
function openProject(id) {
  document.querySelector('dialog.yd-dz[open]')?.close();
  const siteId = siteIdForProject(id);
  if (!siteId) { findProject(id); return; }
  // One task later, so a closing dossier has returned focus to its opener first.
  setTimeout(() => openSite(siteId, { opener: document.activeElement }), 0);
}

// The precast yard (cover) and the map (after Projects) are self-contained modules.
function mountModules() {
  const yardRoot = document.querySelector('[data-yard-mount]');
  if (yardRoot) {
    mountYard(yardRoot, {
      onShowSector: (key) => document.dispatchEvent(new CustomEvent('bp:sector', { detail: { key } })),
      onOpenProject: openProject,
    });
  }
  const mapRoot = document.querySelector('[data-map-mount]');
  if (mapRoot) mountMap(mapRoot, { onOpenProject: openProject, onShowAllProjects: findProject });
}

init();
