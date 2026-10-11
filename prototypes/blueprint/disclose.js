// Progressive disclosure, one component for the page: glance → More (in place) → full record.
// Markup: <div class="more" data-more> … <div class="more__panel">detail</div></div>. The panel stays
// visible without JS; with JS a button (aria-expanded / aria-controls) is inserted and the panel collapses.

const MS = 320;
const LABELS = {
  more: { en: 'More', ar: 'المزيد' },
  less: { en: 'Less', ar: 'أقل' },
};
const reduced = () => document.documentElement.classList.contains('rm');
let uid = 0;

const pair = (p, cls) => `<span class="${cls} en">${p.en}</span><span class="${cls} ar" lang="ar" dir="rtl">${p.ar}</span>`;

function labelFor(box) {
  const d = box.dataset;
  return {
    more: d.moreEn ? { en: d.moreEn, ar: d.moreAr || LABELS.more.ar } : LABELS.more,
    less: d.lessEn ? { en: d.lessEn, ar: d.lessAr || LABELS.less.ar } : LABELS.less,
  };
}

/** Opens or closes a panel with a height reveal (instant under reduced motion). */
export function setOpen(btn, open) {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel || (btn.getAttribute('aria-expanded') === 'true') === open) return;
  btn.setAttribute('aria-expanded', String(open));
  panel.getAnimations?.().forEach((a) => a.cancel());
  if (open) panel.hidden = false;
  btn.dispatchEvent(new CustomEvent('more:toggle', { bubbles: true, detail: { open } }));
  if (reduced() || !panel.animate) { panel.hidden = !open; return; }
  const h = panel.scrollHeight;
  const run = panel.animate(
    [{ height: open ? '0px' : `${h}px`, opacity: open ? 0 : 1 }, { height: open ? `${h}px` : '0px', opacity: open ? 1 : 0 }],
    { duration: MS, easing: 'cubic-bezier(.2,.7,.2,1)' },
  );
  panel.style.overflow = 'hidden';
  run.onfinish = () => { panel.style.overflow = ''; if (!open) panel.hidden = true; };
}

export function initDisclosures(scope = document) {
  scope.querySelectorAll('[data-more]:not([data-more-ready])').forEach((box) => {
    const panel = box.querySelector(':scope > .more__panel');
    if (!panel) return;
    box.dataset.moreReady = '';
    uid += 1;
    panel.id ||= `more-${uid}`;
    panel.hidden = true;
    const l = labelFor(box);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'more__btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', panel.id);
    btn.innerHTML = `<span class="more__sign" aria-hidden="true"></span>${pair(l.more, 'more__closed')}${pair(l.less, 'more__open')}`;
    btn.addEventListener('click', () => setOpen(btn, btn.getAttribute('aria-expanded') !== 'true'));
    panel.before(btn);
  });
}
