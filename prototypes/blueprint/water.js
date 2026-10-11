// Water section: the plant selector drives the diagram (flow speed, pipe weight, capacity readout)
// and the live water surface behind it (current speed and clarity). The surface is one WebGL2 context,
// created when the section comes near, rendered only while in view. Without WebGL, after a context
// loss, or with reduced motion, the section keeps a static caustic texture (CSS).

const MAX = 3000;
const X0 = 120;
const SPAN = 960;
const NEAR = '60% 0px';
const DRAG_DROP_MS = 70;
const PLANTS = {
  marcy: { en: 'MARCY VILLAGE · MARSA MATROUH', ar: 'قرية مارسي · مرسى مطروح' },
  ghazala: { en: 'GHAZALA VILLAGE · NORTH COAST', ar: 'قرية غزالة · الساحل الشمالي' },
  andalusia: { en: 'ANDALUSIA VILLAGE · MARSA MATROUH', ar: 'قرية الأندلس · مرسى مطروح' },
  'rixos-nc': { en: 'RIXOS · NORTH COAST', ar: 'ريكسوس · الساحل الشمالي' },
  hurghada: { en: 'HURGHADA', ar: 'الغردقة' },
};
const UNIT = { en: 'm³/day', ar: 'م³/يوم' };
const root = document.documentElement;
const lang = () => (root.lang === 'ar' ? 'ar' : 'en');

function initSurface(sheet, onReady) {
  const host = sheet.querySelector('.water__surface');
  if (!host || root.classList.contains('rm') || !('WebGL2RenderingContext' in window)) return;
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const canvas = document.createElement('canvas');
    canvas.className = 'water__gl';
    host.append(canvas);
    let surface;
    try {
      const { createSurface } = await import('./water/surface.js');
      surface = createSurface({
        canvas,
        coarse: matchMedia('(pointer: coarse)').matches,
        onLost: () => { canvas.remove(); sheet.classList.remove('has-water'); },
      });
    } catch (err) {
      console.warn('Live water unavailable; keeping the static texture.', err);
      canvas.remove();
      return;
    }
    sheet.classList.add('has-water');
    new IntersectionObserver(([e]) => surface.setVisible(e.isIntersecting)).observe(sheet);
    wirePointer(sheet, canvas, surface);
    onReady(surface);
  }, { rootMargin: NEAR });
  io.observe(sheet);
}

function wirePointer(sheet, canvas, surface) {
  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  let last = 0;
  sheet.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < DRAG_DROP_MS) return;
    last = now;
    surface.addDrop(...at(e), e.buttons ? 0.55 : 0.22);
  }, { passive: true });
  sheet.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, input, label, summary, select, textarea')) return;
    surface.addDrop(...at(e), 1.5);
  });
}

export function initWater() {
  const sheet = document.getElementById('w401');
  const ctrl = sheet?.querySelector('[data-pid-ctrl]');
  const svg = sheet?.querySelector('.dwg--pid');
  if (!ctrl || !svg) return;
  const cap = svg.querySelector('[data-pid="cap"]');
  const plant = svg.querySelector('[data-pid="plant"]');
  const line = svg.querySelector('.cap-line');
  const dot = svg.querySelector('.cap-dot');
  const rows = [...sheet.querySelectorAll('.plants__t tbody tr')];
  let surface = null;

  function label(input) {
    const l = lang();
    const v = Number(input.value);
    cap.textContent = `${v.toLocaleString('en-US')} ${UNIT[l]}`;
    plant.textContent = PLANTS[input.dataset.row][l];
    [cap, plant].forEach((t) => {
      if (l === 'ar') { t.setAttribute('lang', 'ar'); t.setAttribute('direction', 'rtl'); } else { t.removeAttribute('lang'); t.removeAttribute('direction'); }
    });
  }

  function apply(input) {
    const k = Number(input.value) / MAX;
    svg.style.setProperty('--pipe', (2.6 + k * 5).toFixed(2));
    svg.style.setProperty('--flow-dur', `${(2.2 - k * 1.55).toFixed(2)}s`);
    const x = X0 + k * SPAN;
    line.setAttribute('x2', x.toFixed(1));
    dot.setAttribute('cx', x.toFixed(1));
    rows.forEach((r) => r.classList.toggle('is-on', r.dataset.row === input.dataset.row));
    label(input);
    surface?.setFlow(k);
  }

  const checked = () => ctrl.querySelector('input:checked');
  ctrl.addEventListener('change', (e) => { if (e.target.name === 'cap') apply(e.target); });
  window.addEventListener('montaser:langchange', () => { if (checked()) label(checked()); });
  if (checked()) apply(checked());
  initSurface(sheet, (s) => { surface = s; if (checked()) s.setFlow(Number(checked().value) / MAX); });
}
