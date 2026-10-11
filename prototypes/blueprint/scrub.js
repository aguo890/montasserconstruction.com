// Featured projects build as you scroll. Each section pins its stage (CSS sticky inside a taller
// `.proj__pin`); scroll progress through the pin, lightly eased, drives construction from 0 to 100.
// With WebGL the shared 3D stage renders it; without, the SVG drawing crossfades into the as-built plan.
// Fact chips and site prints land at thresholds. Reduced motion: no pin, fully built, static.
import { DRAWINGS } from './drawings.js';

const EASE_MS = 110;
const SNAP = 0.0005;
// Stage ends match STAGES in 3d/kit.js: foundation, structure, envelope, landscape.
const STAGE_ENDS = [0.26, 0.56, 0.84, 1];
const STAGE_NAMES = [
  { en: 'Foundation', ar: 'الأساسات' }, { en: 'Structure', ar: 'الهيكل' },
  { en: 'Envelope', ar: 'الواجهات' }, { en: 'Landscape', ar: 'تنسيق الموقع' },
];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const bi = (p) => `<span class="en">${p.en}</span><span class="ar" lang="ar" dir="rtl">${p.ar}</span>`;

function stageMarkup(id, def) {
  return `
    <svg class="scrub__layer dwg" viewBox="0 0 1000 700" aria-hidden="true" focusable="false">${def.dwg(`${id}-d`)}</svg>
    <svg class="scrub__layer scrub__layer--built dwg dwg--built" viewBox="0 0 1000 700" aria-hidden="true" focusable="false">${def.built(`${id}-b`)}</svg>
    <ol class="scrub__ticker" aria-hidden="true">${STAGE_NAMES.map((n) => `<li>${bi(n)}</li>`).join('')}</ol>
    <p class="scrub__note" aria-hidden="true">${bi({ en: 'Study model · illustrative', ar: 'نموذج دراسي · توضيحي' })}</p>`;
}

function buildScrub(fig, { reduced, onChange }) {
  const id = fig.dataset.dwg;
  const def = DRAWINGS[id];
  const sheet = fig.closest('.sheet');
  const pin = fig.closest('[data-pin]');
  if (!def || !sheet || !pin) return null;
  const stage = fig.querySelector('.scrub__stage');
  stage.innerHTML = stageMarkup(id, def);
  const frame = pin.firstElementChild;
  const steps = [...stage.querySelectorAll('.scrub__ticker li')];
  const chips = [...sheet.querySelectorAll('.chip[data-at]')];
  const prints = [...sheet.querySelectorAll('.prints .print')];
  prints.forEach((p, i) => { p.dataset.at = String((i + 1) / (prints.length + 1)); });

  let value = reduced ? 1 : 0;
  let target = value;
  let raf = 0;

  function paint() {
    stage.style.setProperty('--p', value.toFixed(3));
    [...chips, ...prints].forEach((el) => el.classList.toggle('is-on', value >= Number(el.dataset.at) - 0.001));
    steps.forEach((li, i) => {
      const from = i ? STAGE_ENDS[i - 1] : 0;
      li.classList.toggle('is-done', value >= STAGE_ENDS[i] - 0.001);
      li.classList.toggle('is-now', value > from && value < STAGE_ENDS[i] - 0.001);
    });
    onChange?.(sheet.id, value * 100, id);
  }

  // Time-based easing, so slow frames still converge at the same pace.
  let last = 0;
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(now - last, 100) : 16;
    last = now;
    const d = target - value;
    value = Math.abs(d) < SNAP ? target : value + d * (1 - Math.exp(-dt / EASE_MS));
    paint();
    if (value !== target) raf = requestAnimationFrame(tick);
    else last = 0;
  }

  function measure() {
    if (reduced) return;
    const r = pin.getBoundingClientRect();
    const stick = parseFloat(getComputedStyle(frame).top) || 0;
    const travel = Math.max(1, pin.offsetHeight - frame.offsetHeight);
    target = clamp01((stick - r.top) / travel);
    if (target !== value && !raf) raf = requestAnimationFrame(tick);
  }

  function setMode(next) {
    fig.classList.toggle('is-3d', next === '3d');
    paint();
  }

  paint();
  return { id, sheet: sheet.id, stage, pin, measure, setMode, get: () => value * 100 };
}

export function initScrubs(opts) {
  const scrubs = [...document.querySelectorAll('.scrub[data-dwg]')].map((fig) => buildScrub(fig, opts)).filter(Boolean);
  if (!opts.reduced) {
    const near = new Set();
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      const s = scrubs.find((x) => x.pin === e.target);
      s.measure();
      if (e.isIntersecting) near.add(s);
      else near.delete(s);
    }), { rootMargin: '20% 0px' });
    scrubs.forEach((s) => io.observe(s.pin));
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; near.forEach((s) => s.measure()); });
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
  }
  return new Map(scrubs.map((s) => [s.sheet, s]));
}
