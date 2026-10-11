// Panel markup for the yard: glance layer only (icon, number, short label), with "More" opening a short drawer in place.

import { PROJECTS, SECTORS, TOTALS } from './data.js';
import { icon, LOGO_MARK } from './icons.js';
import { T } from './strings.js';
import { asset, esc, num, say, tr } from './util.js';

const RIG = `<div class="yd-pc__rig" aria-hidden="true"><span class="yd-pc__cable"></span><span class="yd-pc__hook"></span>
  <svg class="yd-pc__sling" preserveAspectRatio="none"><line x1="50%" y1="0" x2="22%" y2="100%"/><line x1="50%" y1="0" x2="78%" y2="100%"/></svg></div>`;
const PUFF = `<span class="yd-pc__dust" aria-hidden="true"><svg class="yd-pc__puff yd-pc__puff--s" viewBox="0 0 34 18"><path d="M32 16 6 15M31 12 9 6M27 10 15 2"/><circle cx="4" cy="11" r="1"/><circle cx="11" cy="9" r=".8"/></svg><svg class="yd-pc__puff yd-pc__puff--e" viewBox="0 0 34 18"><path d="m2 16 26-1M3 12l22-6M7 10l12-8"/><circle cx="30" cy="11" r="1"/><circle cx="23" cy="9" r=".8"/></svg></span>`;

const shell = (cls, attrs, body) =>
  `<li class="yd-pc ${cls}" ${attrs}><div class="yd-pc__hang">${RIG}<article class="yd-pc__body">${body}</article></div><span class="yd-pc__shadow" aria-hidden="true"></span>${PUFF}</li>`;

const action = (label, attrs, cls = 'yd-act') =>
  `<button class="${cls}" type="button" ${attrs}><span>${say(label)}</span>${icon('arrow', 'yd-flip')}</button>`;

function photo(p) {
  const img = p.img[p.cover];
  if (!img) return `<div class="yd-ph yd-ph--none">${icon('volume')}<span>${say(T.noPhoto)}</span></div>`;
  return `<figure class="yd-ph" style="--nw:${img.w}px;--nh:${img.h}px"><div class="yd-ht"><img src="${asset(img.src)}" width="${img.w}" height="${img.h}" alt="${esc(tr(img.alt))}" loading="lazy" decoding="async" draggable="false"></div></figure>`;
}

export function chips(list, cls = 'yd-chips') {
  const items = list.map((c) => {
    const value = c.n ? `<b>${typeof c.n === 'string' ? num(c.n) : say(c.n)}</b>` : '';
    const label = tr(c.l) ? `<span>${say(c.l)}</span>` : '';
    return `<li class="yd-chip">${icon(c.i)}${value}${label}</li>`;
  });
  return `<ul class="${cls}" role="list">${items.join('')}</ul>`;
}

/** Owner and place on one line; an owner that only repeats the project name is dropped. */
export function whoLine(p) {
  const owner = p.c && !p.t.en.includes(p.c.en) ? p.c : null;
  return [owner, p.l].filter(Boolean).map(say).join(' · ');
}

function projectPanel(p) {
  const more = `yd-m-${p.id}`;
  const note = p.note ? `<p class="yd-more__note">${say(p.note)}</p>` : '';
  const drawer = `<div class="yd-more" id="${more}" inert><div class="yd-more__in"><p class="yd-more__sc">${say(p.sc)}</p>${note}${action(T.record, `data-open="${p.id}"`, 'yd-act yd-act--record')}</div></div>`;
  const toggle = `<button class="yd-tog" type="button" data-more aria-expanded="false" aria-controls="${more}" aria-describedby="yd-t-${p.id}"><span>${say(T.more)}</span>${icon('plus')}</button>`;
  const body = `${photo(p)}<h3 class="yd-pc__t" id="yd-t-${p.id}">${say(p.t)}</h3><p class="yd-pc__who">${whoLine(p)}</p>${chips(p.chips)}${drawer}${toggle}`;
  return shell('yd-pc--project', `data-id="${p.id}"`, body);
}

function sectorPanel(sector) {
  const count = `<p class="yd-sec__count"><b>${num(sector.count)}</b><span>${say(T.projects(sector.count))}</span></p>`;
  const body = `<div class="yd-sec__icon">${icon(sector.icon)}</div><h3 class="yd-pc__name" id="yd-s-${sector.key}">${say(sector.name)}</h3>${count}<p class="yd-sec__line">${say(sector.line)}</p>${action(T.seeAll(sector.count, sector.phrase), `data-sector="${sector.key}"`)}<span class="yd-pc__foot" aria-hidden="true"></span>`;
  return shell('yd-pc--sector', `data-sector-panel="${sector.key}"`, body);
}

function endPanel() {
  const totals = TOTALS.map((t) => `<li><b>${num(t.n)}</b><span>${say(t.l)}</span></li>`).join('');
  const body = `<div class="yd-end"><div class="yd-end__brand">${LOGO_MARK}<h3 class="yd-pc__name">${say(T.endTitle)}</h3>${action(T.allProjects, 'data-sector="all"')}</div><ul class="yd-end__totals" role="list">${totals}</ul></div><span class="yd-pc__foot" aria-hidden="true"></span>`;
  return shell('yd-pc--end', '', body);
}

/** Builds the panel sequence (each sector, then its featured projects; water projects have their own section) into `track`. */
export function buildPanels(track) {
  const html = [];
  const entries = [];
  SECTORS.forEach((sector) => {
    entries.push({ kind: 'sector', sector, title: sector.name });
    html.push(sectorPanel(sector));
    PROJECTS.filter((p) => p.sec === sector.key).forEach((p) => {
      entries.push({ kind: 'project', sector, title: p.t, id: p.id });
      html.push(projectPanel(p));
    });
  });
  entries.push({ kind: 'end', sector: null, title: T.endTitle });
  html.push(endPanel());
  track.innerHTML = html.join('');
  [...track.children].forEach((el, i) => Object.assign(entries[i], {
    el, hang: el.querySelector('.yd-pc__hang'), lift: -1, ang: 0, sway: entries[i].kind === 'end' ? 0.3 : 0.7 + ((i * 37) % 10) / 20,
  }));
  return entries;
}

export function buildTabs(nav, panels) {
  nav.innerHTML = SECTORS.map((s) => `<button class="yd-tab" type="button" data-stop="${s.key}">${icon(s.icon)}<span>${say(s.name)}</span></button>`).join('');
  return SECTORS.map((s) => ({
    key: s.key, el: nav.querySelector(`[data-stop="${s.key}"]`), index: panels.findIndex((p) => p.kind === 'sector' && p.sector.key === s.key),
  }));
}

/** Opens or closes a project panel's in-place drawer. */
export function setDrawer(toggle, isOpen) {
  const panel = toggle.closest('.yd-pc');
  const drawer = panel.querySelector('.yd-more');
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.querySelector('span').innerHTML = say(isOpen ? T.less : T.more);
  panel.classList.toggle('is-open', isOpen);
  drawer.inert = !isOpen;
}
