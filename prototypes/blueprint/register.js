// All projects: a quiet reference list of every entry in the company profile (projects.js).
// About 8 rows by default, then "Show all"; sector filters and search; each row opens in place.
import { PROJECTS } from './projects.js';
import { icon } from './icons.js';
import { setOpen } from './disclose.js';

const PREVIEW = 8;
const IMG = '../../assets/img/projects/';
const SECTORS = [
  { key: 'sports', icon: 'sports', en: 'Sports', ar: 'الرياضة' },
  { key: 'clubs', icon: 'clubs', en: 'Clubs', ar: 'الأندية' },
  { key: 'education', icon: 'education', en: 'Education', ar: 'التعليم' },
  { key: 'banks', icon: 'banks', en: 'Banks', ar: 'البنوك' },
  { key: 'industry', icon: 'industry', en: 'Industry', ar: 'الصناعة' },
  { key: 'public', icon: 'public', en: 'Public works', ar: 'الأشغال العامة' },
  { key: 'health', icon: 'heritage', en: 'Healthcare and heritage', ar: 'الصحة والتراث' },
  { key: 'hospitality', icon: 'hospitality', en: 'Hospitality', ar: 'الضيافة' },
  { key: 'water', icon: 'water', en: 'Water', ar: 'المياه' },
];
const STATUS = {
  done: { icon: 'status', en: 'Completed', ar: 'مكتمل' },
  ongoing: { icon: 'underway', en: 'Underway', ar: 'قيد التنفيذ' },
  conflict: { icon: 'underway', en: 'To confirm', ar: 'للتأكيد' },
  unstated: { icon: 'status', en: 'Not stated', ar: 'غير مذكور' },
};
const FEATURED = {
  'city-club': 'p301', 'matrouh-stadium': 'p302', 'matrouh-university': 'p303', 'el-morsi-abu-el-abbas-mosque-square': 'p304',
  'coral-beach-village': 'p305', 'beyti-almarai-factory': 'p306', 'aquafac-factory': 'p306', 'faragello-cake-factory': 'p306',
};
const T = {
  all: { en: 'All', ar: 'الكل' },
  showAll: { en: 'Show all', ar: 'اعرض الكل' },
  showLess: { en: 'Show fewer', ar: 'اعرض أقل' },
  matches: { en: (n) => `${n} found`, ar: (n) => `${n} نتيجة` },
  open: { en: 'See the project →', ar: 'شاهد المشروع ←' },
  status: { en: 'Status as printed', ar: 'الموقف كما ورد' },
  differ: { en: 'The profile gives two statuses.', ar: 'يذكر ملف الشركة حالتين مختلفتين.' },
  enlarge: { en: 'Enlarge photo: ', ar: 'تكبير الصورة: ' },
  seeAll: { en: (n, s) => `See all ${n} ${s} projects`, ar: (n, s) => `كل مشروعات ${s} (${n})` },
};
const SEE_ALL_NAME = {
  sports: { en: 'sports', ar: 'الرياضة' }, clubs: { en: 'club', ar: 'الأندية' }, education: { en: 'education', ar: 'التعليم' },
  banks: { en: 'banking', ar: 'البنوك' }, industry: { en: 'industry', ar: 'الصناعة' }, public: { en: 'public works', ar: 'الأشغال العامة' },
  health: { en: 'healthcare and heritage', ar: 'الصحة والتراث' }, hospitality: { en: 'hospitality', ar: 'الضيافة' }, water: { en: 'water', ar: 'المياه' },
};
const root = document.documentElement;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const bi = (p) => `<span class="en">${esc(p.en)}</span><span class="ar" lang="ar" dir="rtl">${esc(p.ar)}</span>`;
const normalize = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const NOT_STATED = 'Not stated';

// Branches follow every top-level entry, so the first rows are the showcased projects.
const ORDERED = [...PROJECTS.filter((p) => !p.parent), ...PROJECTS.filter((p) => p.parent)];

function rowHtml(p) {
  const st = STATUS[p.st];
  const meta = [p.c, p.l].filter((x) => x.en !== NOT_STATED).map(bi).join('<i aria-hidden="true"> · </i>');
  const go = FEATURED[p.id] ? `<a class="xref" href="#${FEATURED[p.id]}">${bi(T.open)}</a>` : '';
  const note = p.st === 'conflict' ? `<p class="reg__note">${bi(T.differ)}</p>` : '';
  const sc = p.sc ? `<p>${bi(p.sc)}</p>` : '';
  const l = root.lang === 'ar' ? 'ar' : 'en';
  const photos = p.img ? `<ul class="reg__ph">${p.img.map((im) => `<li><button type="button" class="lb-open" data-lightbox="reg-${p.id}"><span class="sr-only">${bi(T.enlarge)}</span><img src="${IMG}${im.src}" width="${im.w}" height="${im.h}" alt="${esc(im.alt[l])}" data-alt-en="${esc(im.alt.en)}" data-alt-ar="${esc(im.alt.ar)}" loading="lazy" decoding="async"></button></li>`).join('')}</ul>` : '';
  return `<li class="reg__row${p.parent ? ' is-child' : ''}" data-id="${p.id}" data-sec="${p.sec}" data-q="${esc(normalize(`${p.t.en} ${p.t.ar} ${p.c.en} ${p.c.ar} ${p.l.en} ${p.l.ar}`))}">
      <button type="button" class="reg__name" aria-expanded="false" aria-controls="reg-${p.id}">
        ${icon(SECTORS.find((s) => s.key === p.sec).icon, 'ico reg__ico')}<span class="reg__t">${bi(p.t)}</span>
        <span class="reg__st reg__st--${p.st}">${icon(st.icon)}${bi(st)}</span>
      </button>
      <div class="reg__detail more__panel" id="reg-${p.id}" hidden>
        ${meta ? `<p class="reg__meta">${meta}</p>` : ''}${sc}
        <p class="reg__meta"><b>${bi(T.status)}:</b> ${bi(p.s)}</p>${note}${photos}${go}
      </div>
    </li>`;
}

export function initRegister() {
  const box = document.querySelector('[data-register]');
  if (!box) return;
  const list = box.querySelector('[data-reg-list]');
  const filters = box.querySelector('[data-reg-filters]');
  const search = box.querySelector('[data-reg-search]');
  const allBtn = box.querySelector('[data-reg-all]');
  const count = box.querySelector('[data-reg-count]');
  const empty = box.querySelector('[data-reg-empty]');
  // Counts are distinct projects: a programme entry with branches (City Club) is listed but not counted (68 in all).
  const umbrellas = new Set(PROJECTS.filter((p) => p.parent).map((p) => p.parent));
  const counted = PROJECTS.filter((p) => !umbrellas.has(p.id));
  const counts = counted.reduce((m, p) => m.set(p.sec, (m.get(p.sec) || 0) + 1), new Map());
  const lang = () => (root.lang === 'ar' ? 'ar' : 'en');

  document.querySelectorAll('[data-group-count]').forEach((el) => { el.textContent = String(counts.get(el.dataset.groupCount) || 0); });
  filters.innerHTML = [{ key: 'all', icon: 'grid', ...T.all }, ...SECTORS]
    .map((s) => `<button type="button" data-group="${s.key}" aria-pressed="${s.key === 'all'}">${icon(s.icon)}${bi(s)} <i>${s.key === 'all' ? counted.length : counts.get(s.key) || 0}</i></button>`).join('');
  list.innerHTML = ORDERED.map(rowHtml).join('');
  allBtn.setAttribute('aria-controls', list.id || (list.id = 'reg-list'));

  const rows = [...list.querySelectorAll('.reg__row')];
  let group = 'all';
  let expanded = false;

  function labelSeeAll() {
    const l = lang();
    document.querySelectorAll('[data-filter-go]').forEach((b) => {
      const k = b.dataset.filterGo;
      b.textContent = `${T.seeAll[l](counts.get(k) || 0, SEE_ALL_NAME[k][l])} ${l === 'ar' ? '←' : '→'}`;
    });
  }

  function apply() {
    const q = normalize(search.value.trim());
    const matches = rows.filter((r) => (group === 'all' || r.dataset.sec === group) && (!q || r.dataset.q.includes(q)));
    const limit = expanded || q ? Infinity : PREVIEW;
    rows.forEach((r) => { r.hidden = true; });
    matches.slice(0, limit).forEach((r) => { r.hidden = false; });
    empty.hidden = matches.length > 0;
    allBtn.hidden = q || matches.length <= PREVIEW;
    allBtn.setAttribute('aria-expanded', String(expanded));
    const l = lang();
    allBtn.innerHTML = `<span class="more__sign" aria-hidden="true"></span>${expanded ? T.showLess[l] : T.showAll[l]}`;
    count.textContent = q ? T.matches[l](matches.length) : '';
  }

  function setGroup(g) {
    group = g === 'all' || SECTORS.some((s) => s.key === g) ? g : 'all';
    filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.group === group)));
    apply();
  }

  const scrollToList = () => document.getElementById('r350').scrollIntoView({ behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });

  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-group]');
    if (b) setGroup(b.dataset.group);
  });
  search.addEventListener('input', apply);
  allBtn.addEventListener('click', () => {
    expanded = !expanded;
    apply();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.reg__name');
    if (b) setOpen(b, b.getAttribute('aria-expanded') !== 'true');
  });
  const showSector = (key) => {
    search.value = '';
    expanded = true;
    setGroup(key);
    scrollToList();
  };
  document.querySelectorAll('[data-filter-go]').forEach((b) => b.addEventListener('click', () => showSector(b.dataset.filterGo)));
  document.addEventListener('bp:sector', (e) => showSector(e.detail.key));
  document.addEventListener('bp:find', (e) => {
    const row = rows.find((r) => r.dataset.id === e.detail.id);
    if (!row) return;
    search.value = '';
    expanded = true;
    setGroup('all');
    const btn = row.querySelector('.reg__name');
    setOpen(btn, true);
    rows.forEach((r) => r.classList.toggle('is-found', r === row));
    requestAnimationFrame(() => {
      row.scrollIntoView({ block: 'center', behavior: root.classList.contains('rm') ? 'auto' : 'smooth' });
      btn.focus({ preventScroll: true });
    });
  });
  window.addEventListener('montaser:langchange', () => { labelSeeAll(); apply(); });

  labelSeeAll();
  apply();
}
