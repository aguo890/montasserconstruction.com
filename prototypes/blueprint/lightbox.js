// One lightbox for every photo on the page and in its modules. A click on any element carrying
// data-lightbox="group" (an <img>, or a button/link that contains one) opens a native <dialog> showing the
// full-size file at its natural size or smaller. Prev/next stay within the group; arrow keys follow the
// reading direction, swipe works on touch, Escape or a backdrop click closes, and focus returns to the opener.

const SWIPE_PX = 40;
const T = {
  enlarge: { en: 'Enlarge photo', ar: 'تكبير الصورة' },
  close: { en: 'Close', ar: 'إغلاق' },
  prev: { en: 'Previous photo', ar: 'الصورة السابقة' },
  next: { en: 'Next photo', ar: 'الصورة التالية' },
};
const root = document.documentElement;
const lang = () => (root.lang === 'ar' ? 'ar' : 'en');
const rtl = () => root.dir === 'rtl';

/** The larger original sits beside each -800 thumbnail (content/images.md); originals are never upscaled. */
const fullSrc = (src) => src.replace(/-800\.webp(\?.*)?$/, '.webp');

const imgOf = (el) => (el.tagName === 'IMG' ? el : el.querySelector('img'));
const usable = (el) => !el.closest('[inert], [hidden], [aria-hidden="true"]') && el.getClientRects().length > 0;
const srcOf = (el) => imgOf(el)?.getAttribute('src');

/** A trigger inside a decorative duplicate (the marquee's loop copy) maps to its visible original. */
function startIndex(items, trigger) {
  const i = items.indexOf(trigger);
  if (i >= 0) return i;
  return Math.max(0, items.findIndex((el) => srcOf(el) === srcOf(trigger)));
}

function build() {
  const dlg = document.createElement('dialog');
  dlg.className = 'lb';
  dlg.setAttribute('aria-label', T.enlarge.en);
  dlg.innerHTML = `
    <figure class="lb__fig">
      <img class="lb__img" alt="" decoding="async">
      <figcaption class="lb__cap"><span class="lb__txt"></span><span class="lb__n" aria-hidden="true"></span></figcaption>
    </figure>
    <button type="button" class="lb__btn lb__close" data-lb="close"><span aria-hidden="true">×</span></button>
    <button type="button" class="lb__btn lb__prev" data-lb="prev"><span aria-hidden="true">‹</span></button>
    <button type="button" class="lb__btn lb__next" data-lb="next"><span aria-hidden="true">›</span></button>`;
  document.body.append(dlg);
  return dlg;
}

function labelButtons(dlg) {
  const l = lang();
  dlg.setAttribute('aria-label', T.enlarge[l]);
  ['close', 'prev', 'next'].forEach((k) => dlg.querySelector(`[data-lb="${k}"]`).setAttribute('aria-label', T[k][l]));
}

/** Wraps plain page <img data-lightbox> in a button so keyboards reach them; modules may pass buttons directly. */
export function prepareLightboxImages(scope = document) {
  scope.querySelectorAll('img[data-lightbox]').forEach((img) => {
    if (img.closest('button, a')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lb-open';
    btn.dataset.lightbox = img.dataset.lightbox;
    delete img.dataset.lightbox;
    btn.innerHTML = `<span class="sr-only"><span class="en">${T.enlarge.en}: </span><span class="ar" lang="ar" dir="rtl">${T.enlarge.ar}: </span></span>`;
    img.replaceWith(btn);
    btn.append(img);
  });
}

export function initLightbox() {
  const dlg = build();
  const pic = dlg.querySelector('.lb__img');
  const txt = dlg.querySelector('.lb__txt');
  const num = dlg.querySelector('.lb__n');
  let items = [];
  let index = 0;
  let opener = null;

  function show(i) {
    index = (i + items.length) % items.length;
    const src = imgOf(items[index]);
    pic.style.removeProperty('--nw');
    pic.onload = () => { pic.style.setProperty('--nw', `${pic.naturalWidth}px`); };
    pic.onerror = () => { pic.onerror = null; pic.src = src.currentSrc || src.src; };
    pic.src = fullSrc(src.currentSrc || src.src);
    pic.alt = src.alt;
    txt.textContent = src.alt;
    num.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : '';
    dlg.classList.toggle('is-single', items.length < 2);
  }

  function open(trigger) {
    const group = trigger.dataset.lightbox;
    items = [...document.querySelectorAll(`[data-lightbox="${CSS.escape(group)}"]`)].filter((el) => imgOf(el) && usable(el));
    if (!items.length) items = [trigger];
    opener = trigger;
    labelButtons(dlg);
    show(startIndex(items, trigger));
    dlg.showModal();
    dlg.querySelector('[data-lb="close"]').focus();
  }

  const step = (d) => { if (items.length > 1) show(index + d); };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-lightbox]');
    if (!t || !imgOf(t) || dlg.contains(t)) return;
    e.preventDefault();
    e.stopPropagation();
    open(t);
  }, true);

  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lb]');
    if (b) {
      if (b.dataset.lb === 'close') dlg.close();
      else step(b.dataset.lb === 'next' ? 1 : -1);
      return;
    }
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const forward = (e.key === 'ArrowRight') !== rtl();
    step(forward ? 1 : -1);
  });
  let sx = null;
  dlg.addEventListener('pointerdown', (e) => { sx = e.pointerType === 'mouse' ? null : e.clientX; });
  dlg.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    const forward = (dx < 0) !== rtl();
    step(forward ? 1 : -1);
  });
  dlg.addEventListener('close', () => {
    pic.removeAttribute('src');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  window.addEventListener('montaser:langchange', () => {
    if (!dlg.open) return;
    labelButtons(dlg);
    show(index);
  });

  prepareLightboxImages();
  return { open };
}
