// Markup for the site view: the dialog frame, the info panel and the scenes rail. Every string is an
// { en, ar } pair rendered as paired spans (CSS shows the one matching <html lang>); attributes carry
// both languages through data-*-en / data-*-ar so lang.js can swap them.
import { icon } from '../icons.js';
import { photosOf, primaryProject, whoOf } from './sites.js';

const T = {
  projects: { en: 'Projects', ar: 'المشروعات' },
  close: { en: 'Close', ar: 'إغلاق' },
  prev: { en: 'Previous project', ar: 'المشروع السابق' },
  next: { en: 'Next project', ar: 'المشروع التالي' },
  lang: { en: 'Switch language: English or Arabic', ar: 'تبديل اللغة: الإنجليزية أو العربية' },
  note: { en: 'AI 3D impression from site photos · illustrative', ar: 'تصور ثلاثي الأبعاد مولّد بالذكاء الاصطناعي من صور الموقع · توضيحي' },
  fallback: { en: '3D model unavailable · showing the photo', ar: 'النموذج ثلاثي الأبعاد غير متاح · تظهر الصورة' },
  loading: { en: 'Loading 3D model', ar: 'جارٍ تحميل النموذج' },
  stages: { en: 'Build stages', ar: 'مراحل البناء' },
  stageNames: [
    { en: 'Plan', ar: 'المخطط' },
    { en: 'Drawing', ar: 'الرسم' },
    { en: 'Print', ar: 'الطباعة' },
    { en: 'Built', ar: 'المبنى' },
  ],
  reset: { en: 'Reset view', ar: 'إعادة ضبط العرض' },
  hint: { en: 'Drag to rotate', ar: 'اسحب للتدوير' },
  scenes: { en: 'Scenes', ar: 'المشاهد' },
  photos: { en: 'Photos', ar: 'الصور' },
  enlarge: { en: 'Enlarge photo: ', ar: 'تكبير الصورة: ' },
  find: { en: 'See in all projects', ar: 'اعرضه في كل المشروعات' },
  status: { en: 'Status as printed', ar: 'الموقف كما ورد' },
  stage: {
    en: (t) => `3D model of ${t}, generated from site photos. Drag or use arrow keys to rotate.`,
    ar: (t) => `نموذج ثلاثي الأبعاد لمشروع ${t}، مولّد من صور الموقع. اسحب أو استخدم مفاتيح الأسهم للتدوير.`,
  },
};

/** Labels that change with state (the view swaps them). */
export const LABELS = {
  fullscreen: { en: 'Full screen', ar: 'ملء الشاشة' },
  exitFullscreen: { en: 'Exit full screen', ar: 'إنهاء ملء الشاشة' },
  hideDetails: { en: 'Hide details', ar: 'إخفاء التفاصيل' },
  showDetails: { en: 'Show details', ar: 'إظهار التفاصيل' },
};

const NOT_STATED = 'Not stated';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');

/** Paired language spans for an { en, ar } pair (a plain string shows in both). */
const bi = (p) => (typeof p === 'string' ? esc(p) : `<span class="en">${esc(p.en)}</span><span class="ar" lang="ar" dir="rtl">${esc(p.ar)}</span>`);

/** aria-label in the current language, with both languages kept for lang.js. */
const ariaAttrs = (p) => `aria-label="${esc(p[lang()])}" data-aria-en="${esc(p.en)}" data-aria-ar="${esc(p.ar)}"`;

const altAttrs = (p) => `alt="${esc(p[lang()])}" data-alt-en="${esc(p.en)}" data-alt-ar="${esc(p.ar)}"`;

/** Plan · Drawing · Print · Built: each button fills with its stage's progress (--p, set by the view). */
function tickerHtml() {
  return T.stageNames.map((name, i) => `<button type="button" data-site-build="${i}" aria-pressed="${i === T.stageNames.length - 1}"><span class="site__tick">${bi(name)}</span></button>`).join('');
}

export function frameHtml() {
  return `
  <div class="site__frame">
    <header class="site__bar">
      <p class="site__mark"><img src="../../assets/brand/logo-mark.svg" width="18" height="20" alt=""><span>${bi(T.projects)}</span></p>
      <div class="site__nav">
        <button type="button" class="site__btn site__prev" data-site-step="-1" ${ariaAttrs(T.prev)}>${icon('arrow')}</button>
        <span class="site__count" data-site-count></span>
        <button type="button" class="site__btn site__next" data-site-step="1" ${ariaAttrs(T.next)}>${icon('arrow')}</button>
      </div>
      <div class="site__tools">
        <button type="button" class="langsw" data-site-lang ${ariaAttrs(T.lang)}><span class="langsw__opt langsw__opt--en" lang="en">EN</span><span class="langsw__sep" aria-hidden="true">|</span><span class="langsw__opt langsw__opt--ar" lang="ar">عربي</span></button>
        <button type="button" class="site__btn site__close" data-site-close ${ariaAttrs(T.close)}>${icon('close')}</button>
      </div>
    </header>
    <div class="site__body">
      <div class="site__stage" data-site-stage>
        <div class="site__gl" data-site-gl tabindex="0"></div>
        <figure class="site__photo" data-site-photo><span class="site__ph"><img alt="" decoding="async"></span></figure>
        <p class="site__load" data-site-load hidden>${bi(T.loading)} <b data-site-pct></b></p>
        <div class="site__ctl" data-site-ctl>
          <div class="site__ctl3d" data-site-ctl3d hidden>
            <div class="site__seg site__ticker" role="group" ${ariaAttrs(T.stages)}>${tickerHtml()}</div>
            <button type="button" class="site__btn site__reset" data-site-reset ${ariaAttrs(T.reset)}>${icon('reset')}</button>
          </div>
          <button type="button" class="site__btn site__fs" data-site-fs aria-pressed="false" ${ariaAttrs(LABELS.fullscreen)}><span class="site__fs-on">${icon('expand')}</span><span class="site__fs-off">${icon('shrink')}</span></button>
          <button type="button" class="site__btn site__details" data-site-details aria-controls="site-info" aria-expanded="true" ${ariaAttrs(LABELS.hideDetails)}>${icon('panel')}</button>
        </div>
        <p class="site__hint" data-site-hint hidden aria-hidden="true">${bi(T.hint)}</p>
        <div class="site__foot">
          <ul class="site__rail" data-site-rail ${ariaAttrs(T.scenes)} hidden></ul>
          <p class="site__note"><span data-site-note>${bi(T.note)}</span><span class="site__fallback" data-site-fallback hidden>${bi(T.fallback)}</span></p>
        </div>
      </div>
      <aside class="site__info" id="site-info" data-site-info></aside>
    </div>
  </div>`;
}

function chipHtml(c) {
  const unit = c.unit ? ` <small>${bi(c.unit)}</small>` : '';
  return `<li class="chip${c.wide ? ' chip--wide' : ''}">${icon(c.icon)}<b>${bi(c.n)}${unit}</b><span>${bi(c.l)}</span></li>`;
}

function statusChipHtml(c) {
  return `<p class="site__status${c.done ? ' is-done' : ''}">${icon(c.icon)}${bi(c)}</p>`;
}

function lineHtml(line) {
  const lead = line.b ? `<b>${bi(line.b)}</b> · ` : '';
  return `<li${line.note ? ' class="lines__note"' : ''}>${lead}${bi(line)}</li>`;
}

/** More lines: the site's own, then (for single-project sites) the status as the profile prints it. */
function moreLines(site) {
  const lines = [...site.more];
  const p = primaryProject(site);
  if (!site.featured && p?.s && p.s.en !== NOT_STATED) {
    lines.push({ b: T.status, en: p.s.en, ar: p.s.ar });
  }
  return lines;
}

function photosHtml(site) {
  const photos = photosOf(site);
  const thumbs = photos.map((ph) => `<li><button type="button" class="lb-open" data-lightbox="site-${site.id}"><span class="sr-only">${bi(T.enlarge)}</span><img src="${esc(ph.src)}" width="${ph.w}" height="${ph.h}" ${altAttrs(ph.alt)} loading="lazy" decoding="async"></button></li>`);
  return `<section class="site__photos">
      <h3 class="kicker"><button type="button" class="site__photosbtn" data-site-photos>${icon('photos')}${bi(T.photos)} <i>${photos.length}</i></button></h3>
      <ul class="site__thumbs">${thumbs.join('')}</ul>
    </section>`;
}

export function infoHtml(site) {
  const who = whoOf(site);
  const lines = moreLines(site);
  const facts = site.featured ? `<ul class="chips site__chips">${site.chips.map(chipHtml).join('')}</ul>` : statusChipHtml(site.chip);
  const more = lines.length ? `<div class="more" data-more><div class="more__panel"><ul class="lines lines--small">${lines.map(lineHtml).join('')}</ul></div></div>` : '';
  return `
    <p class="kicker site__sec">${icon(site.kicker.icon)}${bi(site.kicker)}</p>
    <h2 class="site__title" id="site-title">${bi(site.title)}</h2>
    ${who ? `<p class="site__who">${icon(who.icon)}${bi(who)}</p>` : ''}
    ${facts}
    <p class="site__what">${bi(site.what)}</p>
    ${more}
    ${photosHtml(site)}
    <p class="site__go"><button type="button" class="xref" data-site-find>${bi(T.find)} <span class="site__arr" aria-hidden="true">→</span></button></p>`;
}

export function railHtml(scenes, current) {
  return scenes.map((sc, i) => `<li><button type="button" class="site__scene" data-site-scene="${i}" aria-pressed="${i === current}">
      <img src="${esc(sc.photo.src)}" width="${sc.photo.w}" height="${sc.photo.h}" alt="" loading="lazy" decoding="async"><span>${bi(sc.label)}</span>
    </button></li>`).join('');
}

/** The stage's accessible name for the current site. */
export const stageLabel = (site) => ({ en: T.stage.en(site.title.en), ar: T.stage.ar(site.title.ar) });
