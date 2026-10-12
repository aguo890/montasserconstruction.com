// Every UI string of the yard and its dossier, as { en, ar } pairs. Project and sector text lives in data.js.

const arProjects = (n) => {
  if (n === 1) return 'مشروع';
  if (n === 2) return 'مشروعان';
  return n <= 10 ? 'مشروعات' : 'مشروعًا';
};

export const T = {
  region: { en: 'Projects by sector', ar: 'المشروعات حسب القطاع' },
  tabs: { en: 'Jump to a sector', ar: 'انتقل إلى قطاع' },
  hint: { en: 'Drag · ← →', ar: 'اسحب · → ←' },
  prev: { en: 'Previous', ar: 'السابق' },
  next: { en: 'Next', ar: 'التالي' },
  more: { en: 'More', ar: 'المزيد' },
  less: { en: 'Less', ar: 'أقل' },
  record: { en: 'Full record', ar: 'السجل الكامل' },
  view: { en: 'View in 3D', ar: 'عرض ثلاثي الأبعاد' },
  close: { en: 'Close', ar: 'إغلاق' },
  photos: { en: 'Photos', ar: 'الصور' },
  scope: { en: 'Scope', ar: 'نطاق الأعمال' },
  owner: { en: 'Owner', ar: 'الجهة المالكة' },
  place: { en: 'Place', ar: 'الموقع' },
  noPhoto: { en: 'No photo in the profile', ar: 'لا توجد صورة في ملف الشركة' },
  allProjects: { en: 'See all projects', ar: 'اعرض كل المشروعات' },
  endTitle: { en: 'Montaser Group', ar: 'منتصر للمقاولات العمومية' },
  projects: (n) => ({ en: n === 1 ? 'project' : 'projects', ar: arProjects(n) }),
  seeAll: (n, phrase) => ({
    en: n === 1 ? `See the ${phrase.en} project` : `See all ${n} ${phrase.en} projects`,
    ar: n === 1 ? `اعرض مشروع ${phrase.ar}` : `اعرض كل مشروعات ${phrase.ar} (${n})`,
  }),
  position: (i, n, title) => ({ en: `${i} of ${n}: ${title.en}`, ar: `${i} من ${n}: ${title.ar}` }),
  dossierPos: (i, n) => ({ en: `${i} of ${n}`, ar: `${i} من ${n}` }),
};
