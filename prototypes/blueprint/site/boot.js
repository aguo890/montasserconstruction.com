// Site view entry, loaded with the page: wires every [data-site] link (cards, key numbers, slideshow,
// All projects) and the #site/<id> deep link. The view, three.js and the models load only on demand:
// the first hover, focus or press on a site link prefetches them; opening loads them if needed.
import { getSite } from './sites.js';

const HASH_PREFIX = '#site/';
const PREFETCH_EVENTS = ['pointerover', 'focusin', 'pointerdown'];
let viewModule = null;

const loadView = () => (viewModule ||= import('./view.js'));

/** The site id in location.hash, when it names a known site. */
export function siteFromHash(hash = location.hash) {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const id = decodeURIComponent(hash.slice(HASH_PREFIX.length));
  return getSite(id) ? id : null;
}

/** Opens a site. opener gets focus back on close; fromHistory skips pushing a history entry. */
export async function openSite(id, { opener = null, fromHistory = false } = {}) {
  if (!getSite(id)) return;
  try {
    const view = await loadView();
    view.openSite(id, { opener, fromHistory });
  } catch (err) {
    console.warn('The site view could not load.', err);
  }
}

function prefetch() {
  loadView().then((view) => view.prefetch()).catch(() => { viewModule = null; });
}

function onClick(e) {
  const link = e.target.closest('a[data-site]');
  if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openSite(link.dataset.site, { opener: link });
}

function onHistory() {
  const id = siteFromHash();
  if (id) { openSite(id, { fromHistory: true }); return; }
  viewModule?.then((view) => view.closeFromHistory());
}

export function initSites() {
  document.addEventListener('click', onClick);
  const warm = (e) => {
    if (!e.target.closest?.('[data-site]')) return;
    PREFETCH_EVENTS.forEach((type) => document.removeEventListener(type, warm));
    prefetch();
  };
  PREFETCH_EVENTS.forEach((type) => document.addEventListener(type, warm, { passive: true }));
  addEventListener('popstate', onHistory);
  addEventListener('hashchange', onHistory);
  const deepLink = siteFromHash();
  if (deepLink) openSite(deepLink, { fromHistory: true });
}
