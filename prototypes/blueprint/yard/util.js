// Small helpers shared by the yard and its dossier.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const REPO_ROOT = new URL('../../../', import.meta.url);

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Resolves a repo-root asset path against this module, so it works from the page and from the dev harness. */
export const asset = (path) => new URL(path, REPO_ROOT).href;

/** Page language per the module contract: <html lang="ar"> means Arabic, anything else English. */
export const getLang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');

/** 1 for left-to-right, -1 for right-to-left. */
export const getDir = () => (getLang() === 'ar' || document.documentElement.dir === 'rtl' ? -1 : 1);

/** Text of a { en, ar } pair in the current language. */
export const tr = (pair) => (pair ? pair[getLang()] ?? pair.en : '');

/** Escaped text of a pair, marked up with its language so Arabic gets the Arabic face. */
export const say = (pair) => (getLang() === 'ar' ? `<span lang="ar">${esc(pair.ar)}</span>` : esc(pair.en));

/** Numbers and units stay left-to-right inside Arabic text. */
export const num = (value) => `<bdi dir="ltr">${esc(value)}</bdi>`;

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const isReduced = () => reducedQuery.matches || document.documentElement.classList.contains('rm');
export const onReducedChange = (fn, signal) => reducedQuery.addEventListener('change', fn, { signal });
