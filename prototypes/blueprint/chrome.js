// Page chrome: sheet borders with zone marks, the Sections menu, the active-section strip at the
// bottom (section name and reading progress), and in-page link focus.
import { icon } from './icons.js';

const COLS = 8;
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const bi = (en, ar) => `<span class="en">${en}</span><span class="ar" lang="ar" dir="rtl">${ar}</span>`;
const visible = (s) => !s.hidden;

function zoneRows(sheet) {
  return Math.max(3, Math.min(14, Math.round(sheet.offsetHeight / 240)));
}

function decorateZones(sheets) {
  sheets.filter(visible).forEach((s) => {
    const rows = zoneRows(s);
    if (Number(s.dataset.rows) === rows) return;
    s.dataset.rows = String(rows);
    s.querySelector(':scope > .zones')?.remove();
    const nums = Array.from({ length: COLS }, (_, i) => `<span>${i + 1}</span>`).join('');
    const lets = Array.from({ length: rows }, (_, i) => `<span>${String.fromCharCode(65 + i)}</span>`).join('');
    s.insertAdjacentHTML('afterbegin', `<div class="zones" aria-hidden="true"><div class="zones__t">${nums}</div><div class="zones__b">${nums}</div><div class="zones__l">${lets}</div><div class="zones__r">${lets}</div></div>`);
  });
}

function flip(el, html) {
  if (!el || el.innerHTML === html) return;
  el.innerHTML = html;
  if (root.classList.contains('rm')) return;
  el.classList.remove('tb__flip');
  void el.offsetWidth;
  el.classList.add('tb__flip');
}

function buildMenu(list, sheets) {
  list.innerHTML = sheets.filter(visible).map((s) => `<li><a href="#${s.id}" data-goto="${s.id}">${icon(s.dataset.icon || 'grid')}${bi(s.dataset.name, s.dataset.nameAr)}</a></li>`).join('');
}

export function initChrome() {
  const sheets = $$('main > .sheet');
  const tb = Object.fromEntries($$('[data-tb]').map((el) => [el.dataset.tb, el]));

  decorateZones(sheets);
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => decorateZones(sheets), 200); });

  const dialog = $('#sheet-index');
  const list = $('[data-index-list]');
  buildMenu(list, sheets);
  $$('[data-open-index]').forEach((b) => b.addEventListener('click', () => { buildMenu(list, sheets); dialog.showModal(); }));
  list.addEventListener('click', (e) => { if (e.target.closest('a')) dialog.close(); });

  // In-page links: fall back when a module's section is still hidden, then move focus to the target.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    let target = document.getElementById(a.getAttribute('href').slice(1));
    if (target?.hidden && a.dataset.fallback) {
      e.preventDefault();
      target = $(a.dataset.fallback);
      target?.scrollIntoView({ behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });
    }
    if (!target) return;
    requestAnimationFrame(() => {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  let active = null;
  const navLinks = $$('.topnav a');
  function navFor(s) {
    if (s.id === 's202') return '#projects';
    if (s.id === 'a102' || s.id === 's201') return '#a101';
    return `#${s.id}`;
  }
  function setActive(s) {
    if (s === active) return;
    active = s;
    flip(tb.title, bi(s.dataset.name, s.dataset.nameAr));
    const shown = sheets.filter(visible);
    if (tb.bar) tb.bar.style.width = `${((shown.indexOf(s) + 1) / shown.length) * 100}%`;
    const ref = navFor(s);
    navLinks.forEach((a) => (a.getAttribute('href') === ref ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    $$('a', list).forEach((a) => (a.dataset.goto === s.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  }

  let ticking = false;
  function spy() {
    ticking = false;
    const line = innerHeight * 0.38;
    let cur = sheets[0];
    for (const s of sheets) {
      if (s.hidden) continue;
      if (s.getBoundingClientRect().top <= line) cur = s;
      else break;
    }
    setActive(cur);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  spy();
}
