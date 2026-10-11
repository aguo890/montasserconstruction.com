// English / Arabic. The inline head script sets lang and dir before first paint; this module owns the
// toggle, persistence, title and meta, attribute swaps, and the `montaser:langchange` event modules listen for.

const STORAGE_KEY = 'montaser-lang';
const META = {
  en: {
    title: 'Montaser Group for General Contracting | Design, execution and delivery in Egypt since 1999',
    description: 'Montaser Group for General Contracting, Egypt, since 1999: FIFA-standard stadiums, smart sports clubs, universities, factories, marine works and, with sister company Diwan, water treatment and desalination.',
  },
  ar: {
    title: 'منتصر للمقاولات العمومية | التصميم والتنفيذ والتسليم في مصر منذ 1999',
    description: 'منتصر للمقاولات العمومية، مصر، منذ 1999: ملاعب بمعايير الفيفا، وأندية رياضية ذكية، وجامعات، ومصانع، وأعمال بحرية، ومع الشركة الشقيقة ديوان معالجة المياه وتحليتها.',
  },
};
const ATTRS = [['data-alt-ar', 'alt', 'altEn', 'altAr'], ['data-ph-ar', 'placeholder', 'phEn', 'phAr'], ['data-aria-ar', 'aria-label', 'ariaEn', 'ariaAr'], ['data-title-ar', 'title', 'titleEn', 'titleAr']];
const root = document.documentElement;

export const getLang = () => (root.lang === 'ar' ? 'ar' : 'en');

/** Picks the active language from a `{ en, ar }` pair. */
export const tr = (pair) => (typeof pair === 'string' ? pair : pair[getLang()] ?? pair.en);

export function applyAttributes(scope = document) {
  const ar = getLang() === 'ar';
  ATTRS.forEach(([sel, attr, enKey, arKey]) => {
    scope.querySelectorAll(`[${sel}]`).forEach((el) => {
      if (!(enKey in el.dataset)) el.dataset[enKey] = el.getAttribute(attr) ?? '';
      el.setAttribute(attr, ar ? el.dataset[arKey] : el.dataset[enKey]);
    });
  });
}

function applyMeta(lang) {
  document.title = META[lang].title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', META[lang].description);
}

function persist(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage blocked: the URL still carries the choice */ }
  const url = new URL(location.href);
  if (lang === 'ar') url.searchParams.set('lang', 'ar');
  else url.searchParams.delete('lang');
  history.replaceState(history.state, '', url);
}

/** Keeps the reader on the same section while the layout mirrors. */
function withScrollAnchor(change) {
  const line = (document.querySelector('.topbar')?.offsetHeight ?? 0) + 1;
  const blocks = [...document.querySelectorAll('main > section:not([hidden]), footer')];
  const anchor = blocks.find((b) => { const r = b.getBoundingClientRect(); return r.top <= line && r.bottom > line; });
  if (!anchor) { change(); return; }
  const offset = line - anchor.getBoundingClientRect().top;
  change();
  const drift = anchor.getBoundingClientRect().top - (line - offset);
  window.scrollTo({ top: window.scrollY + drift, behavior: 'instant' });
}

export function setLang(lang) {
  const next = lang === 'ar' ? 'ar' : 'en';
  withScrollAnchor(() => {
    root.lang = next;
    root.dir = next === 'ar' ? 'rtl' : 'ltr';
    applyAttributes();
    applyMeta(next);
  });
  persist(next);
  window.dispatchEvent(new CustomEvent('montaser:langchange', { detail: { lang: next } }));
}

export function initLang() {
  applyAttributes();
  applyMeta(getLang());
  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    const sync = () => btn.setAttribute('aria-pressed', String(getLang() === 'ar'));
    sync();
    btn.addEventListener('click', () => { setLang(getLang() === 'ar' ? 'en' : 'ar'); sync(); });
    window.addEventListener('montaser:langchange', sync);
  });
}
