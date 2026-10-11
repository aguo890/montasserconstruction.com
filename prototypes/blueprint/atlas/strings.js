// Every visible map string as an { en, ar } pair, plus the language helpers. Sector names follow Monolith.

export const getLang = () => (document.documentElement.lang === "ar" ? "ar" : "en");
export const tx = (pair) => (pair == null ? "" : typeof pair === "string" ? pair : pair[getLang()] ?? pair.en);

export const UI = {
  kicker: { en: "Map", ar: "الخريطة" },
  title: { en: "Where we build", ar: "مواقع مشروعاتنا" },
  mapLabel: { en: "Map of our projects in Egypt", ar: "خريطة مشروعاتنا في مصر" },
  insetLabel: { en: "Delta and Cairo", ar: "الدلتا والقاهرة" },
  scroll: { en: "Scroll or press Next", ar: "مرّر أو اضغط التالي" },
  across: { en: "Across Egypt", ar: "في أنحاء مصر" },
  next: { en: "Next", ar: "التالي" },
  back: { en: "Back", ar: "السابق" },
  showAll: { en: "Show all", ar: "اعرض الكل" },
  replay: { en: "Replay", ar: "أعد العرض" },
  steps: { en: "Build-up by sector", ar: "البناء حسب القطاع" },
  filter: { en: "Filter", ar: "تصفية" },
  allSectors: { en: "All sectors", ar: "كل القطاعات" },
  capacity: { en: "Water capacity", ar: "سعة محطات المياه" },
  perDay: { en: "m³/day", ar: "م³/يوم" },
  noPlace: { en: "Location not stated", ar: "الموقع غير مذكور" },
  close: { en: "Close", ar: "إغلاق" },
  more: { en: "More", ar: "المزيد" },
  viewProject: { en: "View project", ar: "عرض المشروع" },
  seeAll: { en: "See in all projects", ar: "اعرضه في كل المشروعات" },
  regionOnly: { en: "Region only", ar: "المنطقة فقط" },
  photo: { en: "Photo", ar: "صورة" },
  km: { en: "km", ar: "كم" },
  photos: { en: "photos", ar: "صور" },
  projects: { en: "projects", ar: "مشروعات" },
  project: { en: "project", ar: "مشروع" },
  conflict: { en: "The profile lists it as both completed and underway.", ar: "يذكره ملف الشركة مكتملًا وقيد التنفيذ معًا." },
};

export const SECTOR_NAMES = {
  water: { en: "Water and wastewater", ar: "المياه والصرف الصحي" },
  sports: { en: "Sports", ar: "الرياضة" },
  clubs: { en: "Clubs and entertainment", ar: "الأندية والترفيه" },
  industry: { en: "Industry", ar: "الصناعة" },
  education: { en: "Education", ar: "التعليم" },
  health: { en: "Healthcare and heritage", ar: "الصحة والتراث" },
  hospitality: { en: "Hospitality and tourism", ar: "السياحة والضيافة" },
  public: { en: "Public works", ar: "المرافق والأشغال العامة" },
  banks: { en: "Banks", ar: "البنوك" },
};

export const STATUS = {
  done: { en: "Handed over", ar: "تم التسليم" },
  ongoing: { en: "Underway", ar: "جارٍ العمل" },
  conflict: { en: "Sources differ", ar: "تتعارض المصادر" },
  unstated: { en: "Status not stated", ar: "الموقف غير مذكور" },
};

// Stated facts as icon + number + short label. City Club branches share the chain's chip; capacities come from the data.
const chip = (i, n, en, ar) => ({ i, n, l: { en, ar } });
export const FACT_CHIPS = {
  "city-club": [chip("standard", { en: "1st", ar: "أول" }, "smart club in Egypt", "نادٍ ذكي في مصر")],
  "matrouh-university": [chip("duration", { en: "18 mo", ar: "18 شهرًا" }, "buildings", "المباني"), chip("duration", { en: "30 mo", ar: "30 شهرًا" }, "infrastructure", "البنية التحتية")],
  "matrouh-stadium": [chip("seats", "26,800", "seats", "مقعد"), chip("standard", { en: "FIFA", ar: "معايير الفيفا" }, "standards", "")],
  "tivoli-dome": [chip("standard", { en: "Guinness", ar: "رقم غينيس" }, "venue record", "للمكان")],
  "coral-beach-village": [chip("volume", "25,000 m³", "rock removed", "صخور مُزالة"), chip("length", "90 m", "channel", "قناة"), chip("length", "45 m", "pier", "رصيف")],
};
