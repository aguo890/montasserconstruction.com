// Build order, links to the page's featured sections, map extents and base-map lettering.

// One build-up step per sector, largest story first.
export const SECTOR_ORDER = ["water", "sports", "clubs", "industry", "education", "health", "hospitality", "public", "banks"];

// Projects with their own featured section on the page; the City Club branches follow their programme.
export const SECTION_LINKS = {
  "city-club": "p301",
  "matrouh-stadium": "p302",
  "matrouh-university": "p303",
  "el-morsi-abu-el-abbas-mosque-square": "p304",
  "coral-beach-village": "p305",
  "beyti-almarai-factory": "p306",
  "faragello-cake-factory": "p306",
  "aquafac-factory": "p306",
};

// Projected extents (km) of the relief rasters, from the Atlas build
export const RASTERS = [
  { src: "relief-region.webp", x0: -2688, y0: -2209, x1: 3273, y1: 2604 },
  { src: "relief-egypt.webp", x0: -685, y0: -658, x1: 651, y1: 654 },
];

export const EGYPT_BOUNDS = { lon: [24.7, 36.9], lat: [21.9, 31.7] };
// The inset must cover the Delta, Greater Cairo, Alexandria and Beni Suef; it grows to its frame's shape.
export const DETAIL_BOUNDS = { lon: [29.45, 31.95], lat: [28.98, 31.6] };

// Base-map lettering. kind sets the type style; view limits a label to one view.
export const LABELS = [
  { en: "Mediterranean Sea", ar: "البحر المتوسط", kind: "sea", at: [30.2, 32.75], view: "main" },
  { en: "Mediterranean Sea", ar: "البحر المتوسط", kind: "sea", at: [30.7, 31.86], view: "detail" },
  { en: "Red Sea", ar: "البحر الأحمر", kind: "sea", path: [[35.15, 25.9], [36.75, 23.3]], view: "main" },
  { en: "Lake Nasser", ar: "بحيرة ناصر", kind: "water", at: [32.35, 22.7], view: "main" },
  { en: "Nile", ar: "النيل", kind: "river", at: [30.55, 27.25], view: "main" },
  { en: "Egypt", ar: "مصر", kind: "egypt", at: [28.6, 27.7], view: "main" },
  { en: "Sinai", ar: "سيناء", kind: "region", at: [33.85, 29.75], view: "main" },
  { en: "Western Desert", ar: "الصحراء الغربية", kind: "region", at: [27.0, 29.2], view: "main" },
  { en: "Eastern Desert", ar: "الصحراء الشرقية", kind: "region", path: [[32.35, 27.05], [33.35, 25.35]], view: "main" },
  { en: "Libya", ar: "ليبيا", kind: "country", at: [24.0, 27.0], view: "main" },
  { en: "Sudan", ar: "السودان", kind: "country", at: [30.6, 21.2], view: "main" },
  { en: "Saudi Arabia", ar: "السعودية", kind: "country", at: [37.1, 27.6], view: "main" },
  { en: "Suez Canal", ar: "قناة السويس", kind: "water", path: [[32.42, 30.25], [32.36, 30.95]], view: "detail" },
  { en: "Faiyum", ar: "الفيوم", kind: "feature", at: [30.68, 29.36], view: "detail" },
];
