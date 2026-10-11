// Cover slideshow: rows of project cards that drift by themselves (CSS transforms only).
// Three rows on wide screens, two at 720 px and below; alternate rows run in opposite directions,
// mirrored in Arabic. Hover or focus pauses a row; the whole set pauses offscreen. Reduced motion:
// static rows that scroll by hand. A card's photo opens the lightbox; its title links to the project's
// section, or to its row in All projects.
import { icon } from '../icons.js';

const IMG = '../../assets/img/projects/';
const SPEED_PX_S = 26;
const NARROW = '(max-width: 720px)';
const ENLARGE = { en: 'Enlarge photo: ', ar: 'تكبير الصورة: ' };

// w × h are the thumbnails' native sizes; card frames never exceed them (see cover.css).
const CARDS = [
  { id: 'city-club', href: '#p301', sec: 'clubs', img: 'city-club-1-800.webp', w: 800, h: 600, t: { en: 'City Club', ar: 'سيتي كلوب' }, r: { en: 'First smart club in Egypt', ar: 'أول نادٍ ذكي في مصر' }, alt: { en: 'City Club branch exterior with a branded facade mural', ar: 'واجهة فرع سيتي كلوب بجدارية تحمل اسم النادي' } },
  { id: 'matrouh-stadium', href: '#p302', sec: 'sports', img: 'matrouh-stadium-1-800.webp', w: 512, h: 427, t: { en: 'Matrouh Stadium', ar: 'استاد مطروح' }, r: { en: '26,800 seats · FIFA standards', ar: '26,800 مقعد · معايير الفيفا' }, alt: { en: 'Matrouh Stadium pitch, track and stands', ar: 'ملعب استاد مطروح ومضماره ومدرجاته' } },
  { id: 'matrouh-university', href: '#p303', sec: 'education', img: 'matrouh-university-2-800.webp', w: 411, h: 322, t: { en: 'Matrouh University', ar: 'جامعة مطروح' }, r: { en: 'Buildings in 18 months', ar: 'المباني في 18 شهرًا' }, alt: { en: 'Aerial view of the Matrouh University campus', ar: 'لقطة جوية لحرم جامعة مطروح' } },
  { id: 'el-morsi-abu-el-abbas-mosque-square', href: '#p304', sec: 'heritage', img: 'el-morsi-abu-el-abbas-mosque-square-3-800.webp', w: 420, h: 273, t: { en: 'Mosque Square', ar: 'ساحة المساجد' }, r: { en: 'Heritage kept · one promenade', ar: 'حفاظ على التراث · ممشى واحد' }, alt: { en: 'Workers erecting arcade beams at the Mosque Square', ar: 'عمال يركّبون كمرات الرواق في ساحة المساجد' } },
  { id: 'coral-beach-village', href: '#p305', sec: 'marine', img: 'coral-beach-village-2-800.webp', w: 800, h: 376, t: { en: 'Coral Beach Village', ar: 'قرية كورال بيتش' }, r: { en: '25,000 m³ rock removed', ar: '25,000 م³ صخور أُزيلت' }, alt: { en: 'Coral Beach Village resort pool with slides and palms', ar: 'حمام سباحة منتجع كورال بيتش بالزلاقات والنخيل' } },
  { id: 'faragello-cake-factory', href: '#p306', sec: 'industry', img: 'faragello-cake-factory-1-800.webp', w: 500, h: 285, t: { en: 'Faragello factory', ar: 'مصنع فرجيللو' }, r: { en: 'Cake and dairy factory', ar: 'مصنع الكيك والألبان' }, alt: { en: 'Blue-roofed Faragello factory buildings in Borg El Arab', ar: 'مباني مصنع فرجيللو بأسقف زرقاء في برج العرب' } },
  { id: 'tivoli-dome', href: '#r350', sec: 'hospitality', img: 'tivoli-dome-1-800.webp', w: 800, h: 533, t: { en: 'Tivoli Dome', ar: 'تيفولي دوم' }, r: { en: 'Guinness World Record venue', ar: 'موقع حاصل على رقم غينيس القياسي' }, alt: { en: 'Tivoli Dome Heliopolis at night around its lake', ar: 'تيفولي دوم مصر الجديدة ليلًا حول البحيرة' } },
  { id: 'suez-stadium', href: '#r350', sec: 'sports', img: 'suez-stadium-2-800.webp', w: 800, h: 533, t: { en: 'Suez Stadium', ar: 'استاد السويس' }, r: { en: 'Seats · LED screen · e-gates', ar: 'مقاعد · شاشة LED · بوابات إلكترونية' }, alt: { en: 'Suez Stadium floodlit at night', ar: 'استاد السويس مضاءً ليلًا' } },
  { id: 'beyti-almarai-factory', href: '#p306', sec: 'industry', img: 'beyti-almarai-factory-1-800.webp', w: 746, h: 707, t: { en: 'Beyti – Almarai', ar: 'بيتي – المراعي' }, r: { en: 'MEP · fire · infrastructure', ar: 'كهروميكانيكا · حريق · بنية تحتية' }, alt: { en: 'Beyti – Almarai plant room with control panels and pipework', ar: 'غرفة معدات مصنع بيتي – المراعي بلوحات التحكم والمواسير' } },
  { id: 'el-hadaf-training-center', href: '#r350', sec: 'sports', img: 'el-hadaf-training-center-2-800.webp', w: 392, h: 260, t: { en: 'El-Hadaf Center', ar: 'مركز الهدف' }, r: { en: 'Completed and handed over', ar: 'تم الانتهاء والتسليم' }, alt: { en: 'El-Hadaf training pitches and landscaped walkways', ar: 'ملاعب تدريب مركز الهدف والممرات المنسّقة' } },
  { id: 'banque-misr', href: '#r350', sec: 'banks', img: 'banque-misr-5-800.webp', w: 480, h: 319, t: { en: 'Banque Misr', ar: 'بنك مصر' }, r: { en: 'MEP works · underway', ar: 'أعمال كهروميكانيكية · جارٍ العمل' }, alt: { en: 'Glazed Banque Misr office building', ar: 'مبنى بنك مصر الإداري الزجاجي' } },
  { id: 'aswan-stadium', href: '#r350', sec: 'sports', img: 'aswan-stadium-3-800.webp', w: 420, h: 413, t: { en: 'Aswan Stadium', ar: 'استاد أسوان' }, r: { en: 'Renovated to FIFA standards', ar: 'تجديد وفق معايير الفيفا' }, alt: { en: 'Covered stand with new seating at Aswan Stadium', ar: 'مدرج مغطى بمقاعد جديدة في استاد أسوان' } },
  { id: 'city-club', href: '#p301', sec: 'clubs', img: 'city-club-5-800.webp', w: 800, h: 640, t: { en: 'City Club', ar: 'سيتي كلوب' }, r: { en: '10 completed · 5 underway', ar: '10 مكتملة · 5 قيد التنفيذ' }, alt: { en: 'City Club outdoor swimming pool', ar: 'حمام السباحة المكشوف في سيتي كلوب' } },
  { id: 'movenpick-airport-hotel', href: '#r350', sec: 'hospitality', img: 'movenpick-airport-hotel-1-800.webp', w: 800, h: 388, t: { en: 'Mövenpick Airport Hotel', ar: 'موفنبيك المطار' }, r: { en: 'Landscape and site works', ar: 'تنسيق الموقع والأعمال الخارجية' }, alt: { en: 'Mövenpick Airport Hotel entrance canopy at night', ar: 'مظلة مدخل فندق موفنبيك المطار ليلًا' } },
  { id: 'egyptian-rowing-club', href: '#r350', sec: 'clubs', img: 'egyptian-rowing-club-1-800.webp', w: 419, h: 412, t: { en: 'Egyptian Rowing Club', ar: 'النادي المصري للتجديف' }, r: { en: 'Floating clubhouse renewed', ar: 'تجديد المقر العائم' }, alt: { en: 'Renovated floating clubhouse of the Egyptian Rowing Club', ar: 'المقر العائم المجدَّد للنادي المصري للتجديف' } },
  { id: 'abbassia-mental-health-hospital', href: '#r350', sec: 'health', img: 'abbassia-mental-health-hospital-1-800.webp', w: 414, h: 411, t: { en: 'Abbassia Hospital', ar: 'مستشفى العباسية' }, r: { en: 'Ward 18 redeveloped', ar: 'إعادة تطوير العنبر 18' }, alt: { en: 'Renovated Ward 18 at Abbassia hospital', ar: 'العنبر 18 بعد التجديد في مستشفى العباسية' } },
  { id: 'la-plage-beach', href: '#r350', sec: 'hospitality', img: 'la-plage-beach-2-800.webp', w: 429, h: 206, t: { en: 'La Plage Beach', ar: 'شاطئ لا بلاج' }, r: { en: 'Landscape · walkways', ar: 'تنسيق الموقع · الممرات' }, alt: { en: 'La Plage Beach lawn with timber walkway and pergolas', ar: 'حديقة شاطئ لا بلاج بممشى خشبي وبرجولات' } },
  { id: 'tivoli-dome', href: '#r350', sec: 'hospitality', img: 'tivoli-dome-2-800.webp', w: 800, h: 450, t: { en: 'Tivoli Dome', ar: 'تيفولي دوم' }, r: { en: 'Heliopolis, Cairo', ar: 'مصر الجديدة، القاهرة' }, alt: { en: 'Tivoli Dome café seating beside the lake by day', ar: 'مقاعد مقاهي تيفولي دوم بجوار البحيرة نهارًا' } },
];

const bi = (p) => `<span class="en">${p.en}</span><span class="ar" lang="ar" dir="rtl">${p.ar}</span>`;

// The photo opens the lightbox (group "cover"); the title links to the project.
function cardHtml(c) {
  const ar = document.documentElement.lang === 'ar';
  const find = c.href === '#r350' ? c.id : '';
  return `<li class="mq__card">
      <button type="button" class="mq__img" data-lightbox="cover" style="--w:${c.w}px;--h:${c.h}px"><span class="sr-only">${bi(ENLARGE)}</span><img src="${IMG}${c.img}" width="${c.w}" height="${c.h}" alt="${ar ? c.alt.ar : c.alt.en}" data-alt-en="${c.alt.en}" data-alt-ar="${c.alt.ar}" decoding="async"></button>
      <a class="mq__txt" href="${c.href}" data-find="${find}"><b>${bi(c.t)}<span class="mq__arr" aria-hidden="true">→</span></b><span class="mq__r">${icon(c.sec, 'ico mq__ico')}${bi(c.r)}</span></a>
    </li>`;
}

function rowHtml(cards, i) {
  const set = cards.map(cardHtml).join('');
  // The second set makes the loop seamless. It stays clickable (it fills half the visible loop) but is
  // hidden from screen readers and taken out of the tab order, so keyboards meet each card once.
  return `<div class="mq__row" data-dir="${i % 2 ? 'left' : 'right'}"><div class="mq__track">
      <ul class="mq__set">${set}</ul><ul class="mq__set mq__set--dup" aria-hidden="true">${set}</ul>
    </div></div>`;
}

function untabDuplicates(box) {
  box.querySelectorAll('.mq__set--dup :is(a, button)').forEach((el) => { el.tabIndex = -1; });
}

function chunk(rows) {
  const out = Array.from({ length: rows }, () => []);
  CARDS.forEach((c, i) => out[i % rows].push(c));
  return out;
}

function setDurations(box) {
  box.querySelectorAll('.mq__row').forEach((row) => {
    const w = row.querySelector('.mq__set').getBoundingClientRect().width;
    row.style.setProperty('--dur', `${Math.max(30, w / SPEED_PX_S).toFixed(1)}s`);
  });
}

export function initMarquee(box) {
  if (!box) return;
  const mq = matchMedia(NARROW);
  const render = () => {
    box.innerHTML = chunk(mq.matches ? 2 : 3).map(rowHtml).join('');
    untabDuplicates(box);
    requestAnimationFrame(() => setDurations(box));
  };
  render();
  mq.addEventListener('change', render);
  box.addEventListener('load', () => setDurations(box), true);
  const io = new IntersectionObserver(([e]) => box.classList.toggle('is-off', !e.isIntersecting));
  io.observe(box);
  box.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-find]');
    if (!a?.dataset.find) return;
    e.preventDefault();
    document.dispatchEvent(new CustomEvent('bp:find', { detail: { id: a.dataset.find } }));
  });
}
