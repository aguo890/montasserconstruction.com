// The fifteen project sites on the landing page, in English and Arabic. Featured copy and the former
// "More projects" copy are kept word for word from the earlier page; owners, places and statuses come
// from projects.js. members: project ids (projects.js) the site stands for; City Club branches join
// through their parent. models: keys in site/models.json whose scenes the site shows, in order.
import { PROJECTS } from '../projects.js';

const IMG = '../../assets/img/projects/';
const NOT_STATED = 'Not stated';

export const SITES = [
  {
    id: 'city-club', featured: true, members: ['city-club'], models: ['city-club'],
    kicker: { icon: 'clubs', en: 'Sports and social clubs', ar: 'الأندية الرياضية والاجتماعية' },
    title: { en: 'City Club', ar: 'سيتي كلوب' },
    who: { icon: 'client', en: 'Estadat for Sports Investment · across Egypt', ar: 'شركة إستادات للاستثمار الرياضي · في أنحاء مصر' },
    chips: [
      { icon: 'status', n: '10', l: { en: 'Clubs completed', ar: 'أندية مكتملة' } },
      { icon: 'underway', n: '5', l: { en: 'Underway', ar: 'قيد التنفيذ' } },
      { icon: 'first', n: { en: '1st', ar: 'الأول' }, l: { en: 'Smart club in Egypt', ar: 'نادٍ ذكي في مصر' }, wide: true },
    ],
    what: { en: 'Sports halls, padel, pitches, pools and multi-sport courts, with every service building.', ar: 'صالات رياضية وملاعب بادل وكرة وحمامات سباحة وملاعب متعددة، بكل مباني الخدمات.' },
    more: [
      { en: 'Branches from Tanta and Kafr El Sheikh to Luxor and Aswan.', ar: 'فروع من طنطا وكفر الشيخ حتى الأقصر وأسوان.' },
    ],
  },
  {
    id: 'matrouh-stadium', featured: true, members: ['matrouh-stadium'], models: ['matrouh-stadium'],
    kicker: { icon: 'sports', en: 'Sports', ar: 'الرياضة' },
    title: { en: 'Matrouh Stadium', ar: 'استاد مطروح' },
    who: { icon: 'client', en: 'Ministry of Youth and Sports · Marsa Matrouh', ar: 'وزارة الشباب والرياضة · مرسى مطروح' },
    chips: [
      { icon: 'seats', n: '26,800', l: { en: 'Seats', ar: 'مقعد' } },
      { icon: 'standard', n: { en: 'FIFA', ar: 'الفيفا' }, l: { en: 'Standards', ar: 'معايير' } },
      { icon: 'mep', n: 'LED', l: { en: 'Main screen · e-gates', ar: 'شاشة رئيسية · بوابات إلكترونية' }, wide: true },
    ],
    what: { en: 'Full renovation and modernisation, with infrastructure and water systems.', ar: 'تجديد وتحديث شامل، مع البنية التحتية وأنظمة المياه.' },
    more: [
      { en: 'Status not stated in the profile.', ar: 'الموقف التنفيذي غير مذكور في ملف الشركة.', note: true },
    ],
  },
  {
    id: 'matrouh-university', featured: true, members: ['matrouh-university'], models: ['matrouh-university'],
    kicker: { icon: 'education', en: 'Education', ar: 'التعليم' },
    title: { en: 'Matrouh University', ar: 'جامعة مطروح' },
    who: { icon: 'client', en: 'Matrouh University · Marsa Matrouh', ar: 'جامعة مطروح · مرسى مطروح' },
    chips: [
      { icon: 'duration', n: '18', unit: { en: 'mo', ar: 'شهرًا' }, l: { en: 'Buildings', ar: 'المباني' } },
      { icon: 'duration', n: '30', unit: { en: 'mo', ar: 'شهرًا' }, l: { en: 'Infrastructure', ar: 'البنية التحتية' } },
      { icon: 'networks', n: '4', l: { en: 'Utility networks · treatment plant', ar: 'شبكات مرافق · محطة معالجة' }, wide: true },
    ],
    what: { en: 'Faculties, workshops and services; electrical, sewage, irrigation and fire networks; a wastewater plant that waters the campus.', ar: 'كليات وورش وخدمات؛ شبكات كهرباء وصرف وري وحريق؛ ومحطة معالجة تروي الحرم.' },
    more: [
      { en: 'Status: under execution, or handed over; the profile gives both.', ar: 'الموقف: قيد التنفيذ أو تم التسليم؛ يذكر ملف الشركة الحالتين.', note: true },
    ],
  },
  {
    id: 'el-morsi-abu-el-abbas-mosque-square', featured: true, members: ['el-morsi-abu-el-abbas-mosque-square'], models: ['el-morsi-abu-el-abbas-mosque-square'],
    kicker: { icon: 'heritage', en: 'Religious and heritage', ar: 'ديني وتراثي' },
    title: { en: 'Mosque Square, El-Morsi Abu El-Abbas', ar: 'ساحة المساجد – المرسي أبو العباس' },
    who: { icon: 'location', en: 'Alexandria', ar: 'الإسكندرية' },
    chips: [
      { icon: 'route', n: '1', l: { en: 'Promenade, all mosques', ar: 'ممشى يربط المساجد' } },
      { icon: 'heritage', n: { en: 'Kept', ar: 'محفوظ' }, l: { en: 'Heritage', ar: 'التراث' } },
      { icon: 'underway', n: { en: 'Works', ar: 'أعمال' }, l: { en: 'In progress in the profile', ar: 'جارية في ملف الشركة' }, wide: true },
    ],
    what: { en: 'Existing buildings upgraded, new facilities built, one route linking every mosque.', ar: 'رفع كفاءة المباني القائمة، وإنشاء مرافق جديدة، ومسار واحد يربط كل المساجد.' },
    more: [
      { en: 'Client not stated; Alexandria inferred from the landmark.', ar: 'الجهة المالكة غير مذكورة؛ والإسكندرية مستنتجة من المعلم.', note: true },
    ],
  },
  {
    id: 'coral-beach-village', featured: true, members: ['coral-beach-village'], models: ['coral-beach-village'],
    kicker: { icon: 'marine', en: 'Marine works', ar: 'أعمال بحرية' },
    title: { en: 'Coral Beach Village', ar: 'قرية كورال بيتش' },
    who: { icon: 'client', en: 'Coral Beach Village', ar: 'قرية كورال بيتش' },
    chips: [
      { icon: 'rock', n: '25,000', unit: 'm³', l: { en: 'Rock removed', ar: 'صخور أُزيلت' } },
      { icon: 'channel', n: '90', unit: 'm', l: { en: 'Channel', ar: 'قناة' } },
      { icon: 'pier', n: '45', unit: 'm', l: { en: 'Concrete pier', ar: 'رصيف خرساني' } },
      { icon: 'water', n: '2', l: { en: 'Lagoons + marina', ar: 'بحيرتان + مرسى' } },
    ],
    what: { en: 'Underwater rock removal, breakwaters with riprap, a wooden barrier and a walkway.', ar: 'إزالة صخور تحت الماء، وحواجز أمواج بالدبش، وحاجز خشبي، وممشى.' },
    more: [
      { en: 'Location and status not stated.', ar: 'الموقع والموقف التنفيذي غير مذكورين.', note: true },
    ],
  },
  {
    id: 'factories', featured: true,
    members: ['faragello-cake-factory', 'beyti-almarai-factory', 'aquafac-factory'],
    models: ['faragello-cake-factory', 'beyti-almarai-factory'],
    kicker: { icon: 'industry', en: 'Industry', ar: 'الصناعة' },
    title: { en: 'Factories', ar: 'المصانع' },
    who: { icon: 'client', en: 'Beyti – Almarai · Faragello · Aquafac', ar: 'بيتي – المراعي · فرجيللو · أيكوفاك' },
    chips: [
      { icon: 'industry', n: '3', l: { en: 'Factories', ar: 'مصانع' } },
      { icon: 'mep', n: { en: 'MEP', ar: 'كهروميكانيكا' }, l: { en: 'Electrical · fire · infrastructure', ar: 'كهرباء · حريق · بنية تحتية' } },
      { icon: 'underway', n: { en: 'Underway', ar: 'قيد التنفيذ' }, l: { en: 'Beyti – Almarai', ar: 'بيتي – المراعي' }, wide: true },
    ],
    what: { en: 'Factories for food and pharmaceutical producers, from structure to MEP.', ar: 'مصانع لمنتجي الأغذية والأدوية، من الإنشاءات إلى الكهروميكانيكا.' },
    more: [
      { b: { en: 'Faragello', ar: 'فرجيللو' }, en: 'cake and dairy factory, Borg El Arab.', ar: 'مصنع الكيك والألبان، برج العرب.' },
      { b: { en: 'Aquafac', ar: 'أيكوفاك' }, en: 'pharmaceutical factory, 6th of October City.', ar: 'مصنع أدوية، مدينة 6 أكتوبر.' },
      { en: 'Faragello and Aquafac: under development, or handed over; the profile gives both.', ar: 'فرجيللو وأيكوفاك: قيد التنفيذ أو تم التسليم؛ يذكر ملف الشركة الحالتين.', note: true },
    ],
  },
  {
    id: 'suez-stadium', wide: true, members: ['suez-stadium'], models: ['suez-stadium'],
    kicker: { icon: 'sports', en: 'Sports', ar: 'الرياضة' },
    title: { en: 'Suez Stadium', ar: 'استاد السويس' },
    chip: { icon: 'seats', en: 'Seats · LED · e-gates', ar: 'مقاعد · شاشة · بوابات' },
    what: { en: 'Seating, main LED screen, electronic gates, infrastructure and water systems.', ar: 'المقاعد والشاشة الرئيسية والبوابات الإلكترونية والبنية التحتية وأنظمة المياه.' },
    more: [],
  },
  {
    id: 'aswan-stadium', members: ['aswan-stadium'], models: ['aswan-stadium'],
    kicker: { icon: 'sports', en: 'Sports', ar: 'الرياضة' },
    title: { en: 'Aswan Sports Stadium', ar: 'استاد أسوان الرياضي' },
    chip: { icon: 'standard', en: 'FIFA standards', ar: 'معايير الفيفا' },
    what: { en: 'Full renovation and redevelopment to FIFA standards.', ar: 'تجديد وإعادة تطوير شاملة وفق معايير الفيفا.' },
    more: [],
  },
  {
    id: 'el-hadaf-training-center', members: ['el-hadaf-training-center'], models: ['el-hadaf-training-center'],
    kicker: { icon: 'sports', en: 'Sports', ar: 'الرياضة' },
    title: { en: 'El-Hadaf National Teams Training Center', ar: 'مركز الهدف لتدريب المنتخبات الوطنية' },
    chip: { icon: 'status', en: 'Handed over', ar: 'تم التسليم', done: true },
    what: { en: 'New buildings, a redeveloped facility, all infrastructure and MEP.', ar: 'مبانٍ جديدة، وإعادة تأهيل منشأة، وكل أعمال البنية التحتية والكهروميكانيكا.' },
    more: [],
  },
  {
    id: 'tivoli-dome', wide: true, members: ['tivoli-dome'], models: ['tivoli-dome'],
    kicker: { icon: 'hospitality', en: 'Hospitality', ar: 'الضيافة' },
    title: { en: 'Tivoli Dome, Heliopolis', ar: 'تيفولي دوم – مصر الجديدة' },
    chip: { icon: 'first', en: 'Guinness World Record venue', ar: 'موقع حاصل على رقم غينيس' },
    what: { en: 'Restaurants and cafés around a lake, in keeping with historic Heliopolis and the Baron Empain palace.', ar: 'مطاعم ومقاهٍ حول بحيرة بطراز يتناغم مع مصر الجديدة التاريخية وقصر البارون إمبان.' },
    more: [
      { en: 'The record is the venue’s; Montaser’s scope is to be confirmed.', ar: 'الرقم القياسي للموقع، ونطاق أعمال منتصر بحاجة إلى تأكيد.', note: true },
    ],
  },
  {
    id: 'movenpick-airport-hotel', wide: true, members: ['movenpick-airport-hotel'], models: ['movenpick-airport-hotel'],
    kicker: { icon: 'hospitality', en: 'Hospitality', ar: 'الضيافة' },
    title: { en: 'Mövenpick Airport Hotel', ar: 'فندق موفنبيك المطار' },
    chip: { icon: 'landscape', en: 'Landscape', ar: 'تنسيق المواقع' },
    what: { en: 'Landscape and site coordination: green areas, trees, rocks and natural scenery.', ar: 'تنسيق الموقع العام: مسطحات خضراء وأشجار وصخور ومناظر طبيعية.' },
    more: [],
  },
  {
    id: 'la-plage-beach', members: ['la-plage-beach'], models: ['la-plage-beach'],
    kicker: { icon: 'hospitality', en: 'Hospitality', ar: 'الضيافة' },
    title: { en: 'La Plage Beach', ar: 'شاطئ لا بلاج' },
    chip: { icon: 'landscape', en: 'Landscape', ar: 'تنسيق المواقع' },
    what: { en: 'Landscape works, restaurants, restrooms, entrances and a reception office.', ar: 'أعمال تنسيق الموقع، ومطاعم، ودورات مياه، ومداخل، ومكتب استقبال.' },
    more: [],
  },
  {
    id: 'egyptian-rowing-club', members: ['egyptian-rowing-club'], models: ['egyptian-rowing-club'],
    kicker: { icon: 'clubs', en: 'Clubs', ar: 'الأندية' },
    title: { en: 'Egyptian Rowing Club', ar: 'النادي المصري للتجديف' },
    chip: { icon: 'marine', en: 'Floating clubhouse', ar: 'مقر عائم' },
    what: { en: 'Renovation and redevelopment of the club’s floating facilities.', ar: 'تجديد وإعادة تطوير المرافق العائمة للنادي.' },
    more: [],
  },
  {
    id: 'banque-misr', members: ['banque-misr'], models: ['banque-misr'],
    kicker: { icon: 'banks', en: 'Banks', ar: 'البنوك' },
    title: { en: 'Banque Misr', ar: 'بنك مصر' },
    chip: { icon: 'underway', en: 'Underway', ar: 'قيد التنفيذ' },
    what: { en: 'MEP, electrical, fire systems and infrastructure.', ar: 'أعمال كهروميكانيكية وكهربائية وأنظمة حريق وبنية تحتية.' },
    more: [
      { en: 'El Shorouk branch (probable).', ar: 'فرع الشروق (مرجّح).', note: true },
    ],
  },
  {
    id: 'abbassia-mental-health-hospital', members: ['abbassia-mental-health-hospital'], models: ['abbassia-mental-health-hospital'],
    kicker: { icon: 'health', en: 'Healthcare', ar: 'الصحة' },
    title: { en: 'Abbassia Hospital, Ward 18', ar: 'مستشفى العباسية – العنبر 18' },
    chip: { icon: 'status', en: 'Completed', ar: 'مكتمل', done: true },
    what: { en: 'Redevelopment of Ward 18 and its annexes, Abbassia, Cairo.', ar: 'إعادة تطوير العنبر 18 وملحقاته، العباسية، القاهرة.' },
    more: [],
  },
];

// [file base in assets/img/projects/, native width, native height, alt EN, alt AR]; the first is the card photo.
const PHOTOS = {
  'city-club': [
    ['city-club-4', 739, 415, 'Aerial view of a City Club: pitch, courts and stands', 'لقطة جوية لسيتي كلوب: الملعب والملاعب الفرعية والمدرجات'],
    ['city-club-2', 800, 600, 'City Club indoor sports hall with yellow seating', 'صالة رياضية مغطاة في سيتي كلوب بمقاعد صفراء'],
    ['city-club-3', 800, 600, 'City Club padel court with glass walls', 'ملعب بادل بجدران زجاجية في سيتي كلوب'],
    ['city-club-1', 800, 600, 'City Club branch exterior: building facade with large City Club branded mural, blue outdoor chairs and landscaped fence', 'فرع سيتي كلوب: واجهة المبنى بجدارية تحمل اسم النادي ومقاعد خارجية زرقاء'],
    ['city-club-5', 800, 640, 'City Club outdoor Olympic-style swimming pool with umbrellas, surrounded by residential blocks', 'سيتي كلوب: حمام سباحة أولمبي مكشوف بالمظلات'],
    ['city-club-6', 765, 401, 'City Club newly surfaced blue multi-sport court', 'سيتي كلوب: ملعب متعدد الرياضات بأرضية زرقاء جديدة'],
  ],
  'matrouh-stadium': [
    ['matrouh-stadium-1', 512, 427, 'Matrouh Stadium pitch, red track and stands', 'ملعب استاد مطروح والمضمار الأحمر والمدرجات'],
    ['matrouh-stadium-3', 329, 199, 'Main LED screen above green seating at Matrouh Stadium', 'الشاشة الرئيسية فوق المقاعد الخضراء في استاد مطروح'],
    ['matrouh-stadium-5', 418, 245, 'Matrouh Stadium entrance with flags', 'مدخل استاد مطروح بالأعلام'],
    ['matrouh-stadium-2', 329, 205, 'Matrouh Stadium: main stand and scoreboard across the track', 'استاد مطروح: المدرج الرئيسي ولوحة النتائج عبر المضمار'],
    ['matrouh-stadium-4', 418, 137, 'Matrouh Stadium: wide view of stands and pitch', 'استاد مطروح: منظر عام للمدرجات وأرض الملعب'],
  ],
  'matrouh-university': [
    ['matrouh-university-1', 511, 352, 'Faculty building at Matrouh University', 'مبنى كلية في جامعة مطروح'],
    ['matrouh-university-2', 411, 322, 'Aerial view of the Matrouh University campus', 'لقطة جوية لحرم جامعة مطروح'],
    ['matrouh-university-3', 325, 160, 'Council hall at Matrouh University', 'قاعة المجلس في جامعة مطروح'],
    ['matrouh-university-4', 325, 139, 'Matrouh University: interior stair hall with wall lighting', 'جامعة مطروح: بهو درج داخلي بإضاءة جدارية'],
  ],
  'el-morsi-abu-el-abbas-mosque-square': [
    ['el-morsi-abu-el-abbas-mosque-square-1', 417, 271, 'Mosque Square arcade under renovation', 'رواق ساحة المساجد أثناء التجديد'],
    ['el-morsi-abu-el-abbas-mosque-square-3', 420, 273, 'Workers on scaffolding erecting arcade beams', 'عمال على السقالات يركّبون كمرات الرواق'],
    ['el-morsi-abu-el-abbas-mosque-square-4', 420, 269, 'Rebar for the paving slab along the colonnade', 'حديد تسليح بلاطة الأرضية بمحاذاة الرواق'],
    ['el-morsi-abu-el-abbas-mosque-square-2', 415, 266, 'Mosque Square: arcade works in progress with scaffolding and workers', 'ساحة المساجد: أعمال الرواق الجارية بالسقالات والعمال'],
  ],
  'coral-beach-village': [
    ['coral-beach-village-1', 800, 376, 'Coral Beach Village lagoon beach with thatched umbrellas', 'شاطئ البحيرة في قرية كورال بيتش بالمظلات'],
    ['coral-beach-village-2', 800, 376, 'Coral Beach Village resort pool with slides and palms', 'حمام السباحة في منتجع كورال بيتش بالزلاقات والنخيل'],
  ],
  factories: [
    ['faragello-cake-factory-1', 500, 285, 'Blue-roofed Faragello factory buildings in Borg El Arab', 'مباني مصنع فرجيللو بأسقف زرقاء في برج العرب'],
    ['beyti-almarai-factory-1', 746, 707, 'Beyti – Almarai plant room with control panels and pipework', 'غرفة معدات مصنع بيتي – المراعي بلوحات التحكم والمواسير'],
  ],
  'suez-stadium': [
    ['suez-stadium-2', 800, 533, 'Suez Stadium floodlit at night', 'استاد السويس مضاءً ليلًا'],
    ['suez-stadium-1', 800, 379, 'Suez Stadium: main stand with seat lettering, pitch in foreground', 'استاد السويس: المدرج الرئيسي بحروف مكوّنة من المقاعد، وأرض الملعب في المقدمة'],
    ['suez-stadium-3', 800, 317, 'Suez Stadium: rows of new blue and orange spectator seats', 'استاد السويس: صفوف من مقاعد المتفرجين الجديدة بالأزرق والبرتقالي'],
  ],
  'aswan-stadium': [
    ['aswan-stadium-3', 420, 413, 'Covered stand with new seating at Aswan Stadium', 'مدرج مغطى بمقاعد جديدة في استاد أسوان'],
    ['aswan-stadium-1', 419, 412, 'Aswan Sports Stadium: stand with colourful canopy and pitch', 'استاد أسوان: مدرج بمظلة ملوّنة وأرض الملعب'],
    ['aswan-stadium-2', 291, 173, 'Aswan Sports Stadium: pitch with goal, stands and scoreboard', 'استاد أسوان: الملعب والمرمى والمدرجات ولوحة النتائج'],
  ],
  'el-hadaf-training-center': [
    ['el-hadaf-training-center-2', 392, 260, 'El-Hadaf training pitches and landscaped walkways', 'ملاعب تدريب مركز الهدف والممرات المنسّقة'],
    ['el-hadaf-training-center-1', 392, 260, 'El-Hadaf National Teams Training Center: pool deck with umbrellas and loungers', 'مركز الهدف: محيط حمام السباحة بالمظلات وكراسي الاسترخاء'],
    ['el-hadaf-training-center-3', 447, 531, 'El-Hadaf: EFA-branded building beside a pitch, flags in foreground', 'مركز الهدف: مبنى يحمل شعار اتحاد الكرة بجوار ملعب، والأعلام في المقدمة'],
  ],
  'tivoli-dome': [
    ['tivoli-dome-1', 800, 533, 'Tivoli Dome Heliopolis at night around its lake', 'تيفولي دوم مصر الجديدة ليلًا حول البحيرة'],
    ['tivoli-dome-2', 800, 450, 'Tivoli Dome Heliopolis by day: colourful café seating beside lake and fountains', 'تيفولي دوم نهارًا: جلسات مقاهٍ ملوّنة بجوار البحيرة والنوافير'],
  ],
  'movenpick-airport-hotel': [
    ['movenpick-airport-hotel-1', 800, 388, 'Mövenpick Airport Hotel entrance canopy at night', 'مظلة مدخل فندق موفنبيك المطار ليلًا'],
    ['movenpick-airport-hotel-2', 800, 386, 'Mövenpick Airport Hotel: pool terrace with palms at dusk', 'فندق موفنبيك المطار: تراس حمام السباحة بالنخيل عند الغروب'],
  ],
  'la-plage-beach': [
    ['la-plage-beach-2', 429, 206, 'La Plage Beach lawn with timber walkway and pergolas', 'حديقة شاطئ لا بلاج بممشى خشبي وبرجولات'],
    ['la-plage-beach-1', 414, 362, 'La Plage Beach: lawn, white planters and shade structures', 'شاطئ لا بلاج: مسطح أخضر وأحواض زرع بيضاء ومظلات'],
    ['la-plage-beach-3', 429, 193, 'La Plage Beach: kiosks, tent and reception booths on lawn', 'شاطئ لا بلاج: أكشاك وخيمة ومكاتب استقبال على المسطح الأخضر'],
  ],
  'egyptian-rowing-club': [
    ['egyptian-rowing-club-1', 419, 412, 'Renovated floating clubhouse of the Egyptian Rowing Club', 'المقر العائم المجدَّد للنادي المصري للتجديف'],
    ['egyptian-rowing-club-2', 419, 433, 'Egyptian Rowing Club: timber deck and upper terrace of floating facility', 'النادي المصري للتجديف: السطح الخشبي والتراس العلوي للمنشأة العائمة'],
    ['egyptian-rowing-club-3', 419, 413, 'Egyptian Rowing Club: wood-panelled lounge interior with porthole window', 'النادي المصري للتجديف: صالة داخلية مكسوّة بالخشب بنافذة دائرية'],
  ],
  'banque-misr': [
    ['banque-misr-5', 480, 319, 'Glazed Banque Misr office building', 'مبنى بنك مصر الإداري الزجاجي'],
    ['banque-misr-1', 427, 194, 'Banque Misr project: lift lobby with framed marble/granite wall cladding', 'مشروع بنك مصر: ردهة المصاعد بكسوة جدارية من الرخام والجرانيت'],
    ['banque-misr-2', 260, 346, 'Banque Misr project: granite paving and glass balustrade on landscaped terrace', 'مشروع بنك مصر: أرضيات جرانيت ودرابزين زجاجي على تراس منسّق'],
    ['banque-misr-3', 156, 345, 'Banque Misr project: interior corridor with stone cladding', 'مشروع بنك مصر: ممر داخلي بكسوة حجرية'],
    ['banque-misr-4', 414, 542, 'Banque Misr project: roof/terrace wooden deck tiles with glass balustrade, desert compound beyond', 'مشروع بنك مصر: أرضية خشبية على السطح بدرابزين زجاجي'],
  ],
  'abbassia-mental-health-hospital': [
    ['abbassia-mental-health-hospital-1', 414, 411, 'Renovated Ward 18 at Abbassia hospital', 'العنبر 18 بعد التجديد في مستشفى العباسية'],
    ['abbassia-mental-health-hospital-2', 352, 333, 'Abbassia Ward 18: entrance terrace with timber pergola, umbrella and steps', 'العنبر 18: شرفة المدخل ببرجولة خشبية ومظلة ودرج'],
    ['abbassia-mental-health-hospital-3', 426, 144, 'Abbassia Ward 18: dining room with timber picnic tables', 'العنبر 18: قاعة الطعام بطاولات خشبية'],
    ['abbassia-mental-health-hospital-4', 257, 258, 'Abbassia Ward 18: garden with timber pergola, bench and paved path', 'العنبر 18: حديقة ببرجولة خشبية ومقعد وممر مرصوف'],
    ['abbassia-mental-health-hospital-5', 157, 257, 'Abbassia Ward 18: patient ward with beds', 'العنبر 18: غرفة المرضى بالأسرّة'],
  ],
};

const BY_ID = new Map(SITES.map((s) => [s.id, s]));
const PROJECT_BY_ID = new Map(PROJECTS.map((p) => [p.id, p]));
const SITE_OF_PROJECT = new Map(SITES.flatMap((s) => s.members.map((m) => [m, s.id])));
const PROFILE_PHOTOS = new Map(PROJECTS.flatMap((p) => (p.img || []).map((im) => [im.src.replace('-800.webp', ''), im])));

const toPhoto = ([base, w, h, en, ar]) => ({ base, src: `${IMG}${base}-800.webp`, w, h, alt: { en, ar } });

export const getSite = (id) => BY_ID.get(id);
export const siteIndex = (id) => SITES.findIndex((s) => s.id === id);
export const photosOf = (site) => (PHOTOS[site.id] || []).map(toPhoto);

/** The photo with this file base: the site's own record, else the profile record (projects.js). */
export function photoByBase(site, base) {
  const own = photosOf(site).find((p) => p.base === base);
  if (own) return own;
  const im = PROFILE_PHOTOS.get(base);
  if (!im) return photosOf(site)[0];
  return { base, src: `${IMG}${im.src}`, w: im.w, h: im.h, alt: im.alt };
}

/** The site a project belongs to (City Club branches through their parent), or undefined. */
export function siteIdForProject(projectId) {
  if (BY_ID.has(projectId)) return projectId;
  const direct = SITE_OF_PROJECT.get(projectId);
  if (direct) return direct;
  const parent = PROJECT_BY_ID.get(projectId)?.parent;
  return parent ? SITE_OF_PROJECT.get(parent) : undefined;
}

/** The profile record (projects.js) of the site's first member. */
export const primaryProject = (site) => PROJECT_BY_ID.get(site.members[0]);

/** Owner · place for sites without their own line, from projects.js, leaving out unstated parts. */
export function whoOf(site) {
  if (site.who) return site.who;
  const p = primaryProject(site);
  const parts = [p.c, p.l].filter((x) => x && x.en !== NOT_STATED);
  if (!parts.length) return null;
  const icon = p.c.en === NOT_STATED ? 'location' : 'client';
  return { icon, en: parts.map((x) => x.en).join(' · '), ar: parts.map((x) => x.ar).join(' · ') };
}
