// Project dossier: the full record in a modal sheet (owner, place, facts, scope, real photos, prev/next and "View project").

import { PROJECTS, SECTORS } from './data.js';
import { icon } from './icons.js';
import { chips, whoLine } from './panels.js';
import { T } from './strings.js';
import { asset, esc, getDir, getLang, say, tr } from './util.js';

const byId = new Map(PROJECTS.map((p) => [p.id, p]));
const sectorOf = (p) => SECTORS.find((s) => s.key === p.sec);
const otherLang = () => (getLang() === 'ar' ? 'en' : 'ar');

function photos(p) {
  if (!p.img.length) return `<p class="yd-dz__none">${icon('volume')}${say(T.noPhoto)}</p>`;
  // Each photo opens the page's shared lightbox (lightbox.js), grouped per project.
  const list = p.img.map((img) => `<figure class="yd-dz__ph" style="--nw:${img.w}px"><button type="button" class="yd-dz__zoom" data-lightbox="yard-${p.id}"><img src="${asset(img.src)}" width="${img.w}" height="${img.h}" alt="${esc(tr(img.alt))}" loading="lazy" decoding="async"></button></figure>`);
  return `<section class="yd-dz__photos" aria-label="${esc(tr(T.photos))}">${list.join('')}</section>`;
}

function head(p, index, total) {
  const sector = sectorOf(p);
  return `<header class="yd-dz__head"><span class="yd-dz__sec">${icon(sector.icon)}${say(sector.name)}</span><span class="yd-dz__pos">${say(T.dossierPos(index + 1, total))}</span>
    <button class="yd-dz__close" type="button" data-dz-close aria-label="${esc(tr(T.close))}">${icon('close')}</button></header>`;
}

function render(p, index, total) {
  const alt = p.t[otherLang()];
  const who = whoLine(p);
  const note = p.note ? `<p class="yd-dz__note">${say(p.note)}</p>` : '';
  const view = p.section ? `<button class="yd-act yd-act--solid" type="button" data-dz-view="${p.section}"><span>${say(T.view)}</span>${icon('arrow', 'yd-flip')}</button>` : '';
  const nav = total > 1
    ? `<div class="yd-dz__nav"><button class="yd-step" type="button" data-dz-step="-1" aria-label="${esc(tr(T.prev))}">${icon('arrow', 'yd-flip yd-back')}</button><button class="yd-step" type="button" data-dz-step="1" aria-label="${esc(tr(T.next))}">${icon('arrow', 'yd-flip')}</button></div>`
    : '';
  return `${head(p, index, total)}
    <h2 class="yd-dz__t" id="yd-dz-t">${say(p.t)}</h2>
    <p class="yd-dz__alt" lang="${otherLang()}" dir="${otherLang() === 'ar' ? 'rtl' : 'ltr'}">${esc(alt)}</p>
    ${who ? `<p class="yd-dz__who">${icon('pin')}<span>${who}</span></p>` : ''}
    ${chips(p.chips, 'yd-chips yd-chips--lg')}
    <section class="yd-dz__scope"><h3>${say(T.scope)}</h3><p>${say(p.sc)}</p>${note}</section>
    ${view ? `<div class="yd-dz__view">${view}</div>` : ''}
    ${photos(p)}
    <footer class="yd-dz__foot">${nav}</footer>`;
}

/** Creates the module-owned <dialog>. open(id, opener) shows a project; prev/next walk every featured project. */
export function createDossier({ onOpenProject }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'yd-dz';
  dialog.setAttribute('aria-labelledby', 'yd-dz-t');
  dialog.innerHTML = '<div class="yd-dz__in" data-dz-body></div>';
  document.body.append(dialog);
  const body = dialog.querySelector('[data-dz-body]');
  const ids = PROJECTS.map((p) => p.id);
  let index = 0;
  let opener = null;

  function show(i) {
    index = (i + ids.length) % ids.length;
    dialog.lang = getLang();
    dialog.dir = getDir() === 1 ? 'ltr' : 'rtl';
    body.innerHTML = render(byId.get(ids[index]), index, ids.length);
    dialog.scrollTop = 0;
  }

  function onClick(e) {
    if (e.target === dialog || e.target.closest('[data-dz-close]')) { dialog.close(); return; }
    const view = e.target.closest('[data-dz-view]');
    if (view) { dialog.close(); onOpenProject(view.dataset.dzView); return; }
    const step = e.target.closest('[data-dz-step]');
    if (!step) return;
    show(index + Number(step.dataset.dzStep));
    body.querySelector(`[data-dz-step="${step.dataset.dzStep}"]`)?.focus();
  }

  dialog.addEventListener('click', onClick);
  dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); opener = null; });

  return {
    open(id, from) {
      opener = from ?? null;
      show(Math.max(0, ids.indexOf(id)));
      if (!dialog.open) dialog.showModal();
      dialog.querySelector('[data-dz-close]')?.focus();
    },
    refresh() { if (dialog.open) show(index); },
    destroy() { if (dialog.open) dialog.close(); dialog.remove(); },
  };
}
