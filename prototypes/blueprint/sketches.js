// Supporting drawings: cover cube, Montaser + Diwan joint, phases,
// the desalination schematic and the long elevation.
import { g, line, rect, circle, path, poly, text, dimV, leader, north, iso, tree, defs, url } from './kit.js';

/* ---------- Cover: the logo mark as an axonometric construction ---------- */

const T = [227.5, 0];
const L = [0, 129.7];
const R = [455, 129.7];
const F = [227.5, 297.2];
const H = 293.5;
const NAVY = '227.5,0 5.8,120 101.7,191.8 227.5,124.2 353.3,191.8 449.2,120';
const TEAL = '0,129.7 227.5,297.2 455,129.7 455,423.2 374.3,500 343.2,500 343.2,344.1 227.5,448.9 111.8,344.1 111.8,500 80.7,500 0,423.2';

function isoGrid() {
  const out = [];
  const m = 0.5701;
  for (let b = -900; b <= 900; b += 64.85) {
    out.push(line(-140, -140 * m + b, 660, 660 * m + b, 'l0 grid-line'));
    out.push(line(-140, 140 * m + b + 259.4, 660, -660 * m + b + 259.4, 'l0 grid-line'));
  }
  for (let x = -113.75 * 1; x <= 600; x += 113.75) out.push(line(x, -80, x, 660, 'l0 grid-line'));
  return out.join('');
}

// Three profile facts on the cube. Sites underway, counted from content/data.json: City Club's 5 underway
// branches, plus Banque Misr, Beyti – Almarai, Alexandria University's Engineering Center (merged with Abis
// University, its probable p.4 row), South Mallawi and the Alamein University plant. Conflicting statuses are left out.
// Each label sits on a shelf: dot on the mark, a leader to the shelf, the fact above it and a short sub-line below.
// `end` is where the shelf stops; labels on the right align to it, so they never run past the frame.
const FACTS = [
  { dot: [330, 92], knee: [392, -16], end: 660, en: ['68 PROJECTS', 'ACROSS EGYPT'], ar: ['68 مشروعًا', 'في أنحاء مصر'],
    tip: { en: '68 distinct projects named in the April 2026 company profile.', ar: '68 مشروعًا مختلفًا وردت في ملف الشركة، أبريل 2026.' } },
  { dot: [48, 330], knee: [-6, 626], end: -140, en: ['10 SITES UNDERWAY', 'APRIL 2026'], ar: ['10 مواقع قيد التنفيذ', 'أبريل 2026'],
    tip: { en: 'As of the April 2026 company profile: 5 City Club branches underway, plus 5 projects marked ongoing or under development. Three projects with conflicting statuses are not counted.',
      ar: 'وفق ملف الشركة، أبريل 2026: 5 فروع لسيتي كلوب قيد التنفيذ، و5 مشروعات أخرى جارية. لا تُحتسب ثلاثة مشروعات تتعارض حالتها.' } },
  { dot: [404, 320], knee: [462, 626], end: 660, en: ['100+ MEP PROJECTS'], ar: ['+100 مشروع كهروميكانيكي'],
    tip: { en: 'More than 100 MEP projects executed (April 2026 company profile).', ar: 'أكثر من 100 مشروع كهروميكانيكي منفّذ (ملف الشركة، أبريل 2026).' } },
];

function fact({ dot, knee, end, en, ar, tip }) {
  const [x1, y1] = dot;
  const [x2, y2] = knee;
  const toRight = end > x2;
  const label = (lang, [main, sub]) => {
    // Right-hand shelves align text to their far end; Arabic (rtl) flips the anchor keyword for the same edge.
    const enAnchor = toRight ? 'end' : 'start';
    const anchor = lang === 'ar' ? (enAnchor === 'end' ? 'start' : 'end') : enAnchor;
    const attrs = lang === 'ar' ? ' lang="ar" direction="rtl"' : '';
    const subText = sub ? `<text class="t t-sub"${attrs} x="${end}" y="${y2 + 22}" text-anchor="${anchor}">${sub}</text>` : '';
    return `<g class="${lang}"><title>${tip[lang]}</title><text class="t t-lbl"${attrs} x="${end}" y="${y2 - 8}" text-anchor="${anchor}">${main}</text>${subText}</g>`;
  };
  return g('leader L-anno', circle(x1, y1, 3, 'fill-ink') + poly([[x1, y1], [x2, y2], [end, y2]], 'l1 d', false) + label('en', en) + label('ar', ar));
}

export function cube() {
  const BL = [0, L[1] + H];
  const BR = [455, R[1] + H];
  const BF = [227.5, F[1] + H];
  const proj = [
    [T, [227.5, -64]], [L, [-110, 192.4]], [R, [565, 192.4]], [BL, [-110, BL[1] + 62.7]], [BR, [565, BR[1] + 62.7]],
  ].map(([a, b]) => line(a[0], a[1], b[0], b[1], 'l0 proj')).join('');
  return `<defs>
      <radialGradient id="cv-fade" cx="50%" cy="46%" r="58%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="cv-mask"><rect x="-140" y="-90" width="800" height="760" fill="url(#cv-fade)"/></mask>
    </defs>` +
    g('cv-grid L-grid', isoGrid(), 'mask="url(#cv-mask)"') +
    g('grp', proj, 'style="--g:0"') +
    g('grp', poly([T, L, F, R], 'l1 d') + line(...L, ...BL, 'l1 d') + line(...R, ...BR, 'l1 d') +
      line(...F, ...BF, 'l1 d') + line(...BL, ...BF, 'l1 d') + line(...BF, ...BR, 'l1 d'), 'style="--g:1"') +
    g('cube-fill', `<polygon class="cf cf--navy" points="${NAVY}"/><polygon class="cf cf--teal" points="${TEAL}"/>`) +
    g('grp', `<polygon class="l3 d" pathLength="1" points="${NAVY}"/><polygon class="l3 d" pathLength="1" points="${TEAL}"/>`, 'style="--g:3"') +
    g('cv-labels', FACTS.map(fact).join('')) +
    dimV(-64, 0, 500, 'SINCE 1999', { ext: 40 }) +
    north(580, 470, 1.1);
}

/* ---------- About: Montaser + Diwan connection ---------- */

export function joint() {
  const beam = (x1, x2) => line(x1, 150, x2, 150, 'l4 d') + line(x1, 230, x2, 230, 'l4 d') +
    line(x1, 158, x2, 158, 'l1 d') + line(x1, 222, x2, 222, 'l1 d');
  const bolts = [268, 292, 348, 372].flatMap((x) => [168, 190, 212].map((y) =>
    circle(x, y, 6, 'l2 d') + line(x - 9, y, x + 9, y, 'l0 d') + line(x, y - 9, x, y + 9, 'l0 d'))).join('');
  return defs('jt') +
    g('grp', beam(30, 318) + rect(30, 158, 288, 64, 'l0 d', 0, `style="fill:${url('jt', 'diag')}"`), 'style="--g:0"') +
    g('grp', beam(322, 610) + rect(322, 158, 288, 64, 'l0 d', 0, `style="fill:${url('jt', 'cross')}"`), 'style="--g:1"') +
    g('grp', rect(250, 140, 140, 100, 'l2 d fill-paper') + line(320, 132, 320, 248, 'l1 dash') + bolts, 'style="--g:2"') +
    g('grp', line(30, 300, 610, 300, 'l2 d') + line(30, 316, 610, 316, 'l2 d') + rect(312, 292, 16, 32, 'l2 d fill-paper') +
      path('M150 308 H200 M190 302 L200 308 L190 314', 'l2 d') + path('M450 308 H500 M490 302 L500 308 L490 314', 'l2 d'), 'style="--g:3"') +
    g('L-anno', text(40, 116, 'MONTASER', 't t-big') + text(40, 136, 'GENERAL CONTRACTING · CONSTRUCTION & INFRASTRUCTURE', 't t-sub') +
      text(600, 116, 'DIWAN', 't t-big', 'end') + `<text class="t t-ar" x="600" y="84" text-anchor="end" direction="rtl" lang="ar">ديوان</text>` +
      text(600, 136, 'SISTER COMPANY', 't t-sub', 'end') +
      leader(320, 248, 360, 266, 'ONE INTEGRATED PLATFORM', { sub: 'SEAMLESS PROJECT EXECUTION' }) +
      text(320, 346, 'SHARED PORTFOLIO · WATER TREATMENT & DESALINATION', 't t-sub', 'middle'));
}

/* ---------- Services: the same block designed, built, delivered ---------- */

function box(P, w, d, h) {
  return { a: P(0, 0, 0), b: P(w, 0, 0), c: P(w, d, 0), e: P(0, d, 0), a2: P(0, 0, h), b2: P(w, 0, h), c2: P(w, d, h), e2: P(0, d, h) };
}

export function phase(n) {
  const P = iso(150, 128, 24);
  const W = 4;
  const D = 3;
  const Hh = 3;
  const k = box(P, W, D, Hh);
  const ground = Array.from({ length: 7 }, (_, i) => line(...P(-1 + i, -1, 0), ...P(-1 + i, D + 1, 0), 'l0 grid-line')).join('') +
    Array.from({ length: 6 }, (_, i) => line(...P(-1, -1 + i, 0), ...P(W + 1, -1 + i, 0), 'l0 grid-line')).join('');
  if (n === 1) {
    return g('L-grid', ground) +
      g('grp', poly([k.a2, k.b2, k.c2, k.e2], 'l2 d') + line(...k.b2, ...k.b, 'l2 d') + line(...k.c2, ...k.c, 'l2 d') +
        line(...k.e2, ...k.e, 'l2 d') + line(...k.b, ...k.c, 'l2 d') + line(...k.c, ...k.e, 'l2 d'), 'style="--g:0"') +
      g('grp', line(...k.a2, ...k.a, 'l0 dash') + line(...k.a, ...k.b, 'l0 dash') + line(...k.a, ...k.e, 'l0 dash'), 'style="--g:1"') +
      g('grp', [1, 2].map((z) => poly([P(W, 0, z), P(W, D, z), P(0, D, z)], 'l0 dash', false)).join(''), 'style="--g:1"') +
      g('grp L-anno', [[0, D], [W, D], [W, 0]].map(([x, y], i) => {
        const [px, py] = P(x, y, 0);
        return line(px, py, px, py + 22, 'l0 d') + circle(px, py + 30, 8, 'l1 d') + text(px, py + 34, ['A', 'B', 'C'][i], 't t-bub-s', 'middle');
      }).join(''), 'style="--g:2"') +
      g('grp L-dims', line(...P(W + 0.7, 0, 0), ...P(W + 0.7, D, 0), 'l1 d') + line(...P(0, D + 0.7, 0), ...P(W, D + 0.7, 0), 'l1 d'), 'style="--g:2"');
  }
  if (n === 2) {
    const cols = [];
    for (let x = 0; x <= W; x += 2) for (let y = 0; y <= D; y += 1.5) cols.push(line(...P(x, y, 0), ...P(x, y, y === 0 && x === 0 ? 2 : 2), 'l2 d'));
    const slabs = [1, 2].map((z) => poly([P(0, 0, z), P(W, 0, z), P(W, D, z), P(0, D, z)], 'l1 d')).join('');
    const scaff = Array.from({ length: 5 }, (_, i) => line(...P(W + 0.3, i * 0.75, 0), ...P(W + 0.3, i * 0.75, 2.6), 'l0 d')).join('') +
      [0.6, 1.3, 2, 2.6].map((z) => line(...P(W + 0.3, 0, z), ...P(W + 0.3, D, z), 'l0 d')).join('');
    const mast = [P(-1.2, 1.2, 0), P(-1.2, 1.2, 5.4)];
    const jib = [P(-1.2, 1.2, 5.2), P(3.2, -1.6, 5.2)];
    const cj = P(-2.6, 2.1, 5.2);
    const hook = P(2.2, -1, 5.2);
    return g('L-grid', ground) +
      g('grp', cols.join('') + slabs, 'style="--g:0"') +
      g('grp', scaff, 'style="--g:1"') +
      g('grp', line(...mast[0], ...mast[1], 'l3 d') + line(...jib[0], ...jib[1], 'l2 d') + line(...mast[1], ...jib[1], 'l0 d') +
        line(...mast[1], ...cj, 'l0 d') + line(...jib[0], ...cj, 'l2 d') + rect(cj[0] - 6, cj[1] - 2, 12, 9, 'l1 d') +
        line(...hook, hook[0], hook[1] + 54, 'l0 d') + rect(hook[0] - 10, hook[1] + 54, 20, 8, 'l1 d'), 'style="--g:2"');
  }
  const top = poly([k.a2, k.b2, k.c2, k.e2], 'ph-top');
  const left = poly([k.e2, k.c2, k.c, k.e], 'ph-left');
  const right = poly([k.b2, k.c2, k.c, k.b], 'ph-right');
  const win = [];
  for (let z = 0.35; z < Hh; z += 1) {
    for (let x = 0.3; x < W - 0.2; x += 0.7) win.push(poly([P(x, D, z), P(x + 0.4, D, z), P(x + 0.4, D, z + 0.45), P(x, D, z + 0.45)], 'ph-win'));
    for (let y = 0.3; y < D - 0.2; y += 0.7) win.push(poly([P(W, y, z), P(W, y + 0.4, z), P(W, y + 0.4, z + 0.45), P(W, y, z + 0.45)], 'ph-win ph-win--r'));
  }
  const flag = P(0.4, 0.4, Hh);
  return g('L-grid', ground) + g('ph-solid', top + left + right + win.join('')) +
    g('grp', poly([k.a2, k.b2, k.c2, k.e2], 'l2 d') + line(...k.b2, ...k.b, 'l2 d') + line(...k.c2, ...k.c, 'l2 d') +
      line(...k.e2, ...k.e, 'l2 d') + line(...k.b, ...k.c, 'l2 d') + line(...k.c, ...k.e, 'l2 d'), 'style="--g:0"') +
    g('grp', line(flag[0], flag[1], flag[0], flag[1] - 40, 'l1 d') + poly([[flag[0], flag[1] - 40], [flag[0] + 22, flag[1] - 33], [flag[0], flag[1] - 26]], 'fill-red') +
      tree(...P(W + 1, D + 0.4, 0), 10) + tree(...P(-0.6, D + 1, 0), 9) + tree(...P(W + 1.2, -0.6, 0), 8), 'style="--g:1"');
}

/* ---------- Water: typical desalination and reuse schematic (1200 × 520) ---------- */

const pump = (x, y, tag) => circle(x, y, 22, 'p-l2 d') + poly([[x - 12, y + 14], [x + 14, y], [x - 12, y - 14]], 'p-l1 d') + text(x, y + 42, tag, 't p-tag', 'middle');
const valve = (x, y) => path(`M${x - 9} ${y - 7} L${x + 9} ${y + 7} L${x + 9} ${y - 7} L${x - 9} ${y + 7} Z`, 'p-l1 d');
const arrow = (x, y, dir = 1) => path(`M${x - 9 * dir} ${y - 6} L${x} ${y} L${x - 9 * dir} ${y + 6}`, 'p-l2 d');

export function pid() {
  const pipe = (d, c = '') => path(d, `p-pipe d ${c}`) + path(d, `flow ${c}`);
  const tubes = [124, 150, 176, 202].map((y) => rect(500, y - 9, 200, 18, 'p-l1 d', 9)).join('');
  return g('grp', path('M30 160 q14 -10 28 0 t28 0 t28 0 t28 0 M30 182 q14 -10 28 0 t28 0 t28 0 t28 0 M30 204 q14 -10 28 0 t28 0 t28 0 t28 0', 'p-l1 d') +
      text(30, 120, 'SOURCE', 't p-lbl') + text(30, 138, 'SEAWATER · BRACKISH', 't p-tag'), 'style="--g:0"') +
    g('grp', pipe('M150 170 H178') + pump(200, 170, 'INTAKE PUMP') + pipe('M222 170 H272') +
      rect(272, 112, 36, 116, 'p-l2 d', 18) + rect(322, 112, 36, 116, 'p-l2 d', 18) + pipe('M308 170 H322') + text(315, 96, 'PRE-TREATMENT', 't p-lbl', 'middle') +
      text(315, 252, 'FILTERS', 't p-tag', 'middle') + pipe('M358 170 H418') + valve(388, 170), 'style="--g:1"') +
    g('grp', pump(440, 170, 'HIGH PRESSURE') + pipe('M462 170 H500') + tubes + line(500, 110, 500, 230, 'p-l2 d') + line(700, 110, 700, 230, 'p-l2 d') +
      text(600, 96, 'DESALINATION TRAIN', 't p-lbl', 'middle') + text(600, 252, 'TYPICAL · NOT PROJECT-SPECIFIC', 't p-tag', 'middle'), 'style="--g:2"') +
    g('grp', pipe('M700 170 H800', 'flow--product') + arrow(780, 170) +
      rect(800, 108, 84, 124, 'p-l2 d') + path('M800 108 Q842 88 884 108', 'p-l2 d') + text(842, 96 - 14, 'TANK', 't p-tag', 'middle') +
      text(842, 184, 'PRODUCT', 't p-tag', 'middle') +
      line(760, 170, 760, 132, 'p-l1 d') + circle(760, 112, 20, 'p-l2 d fill-bp') + line(740, 112, 780, 112, 'p-l0 d') +
      text(760, 116, 'FLOW', 't p-inst', 'middle'), 'style="--g:3"') +
    g('grp', pipe('M884 200 H918', 'flow--product') + pump(940, 200, 'PUMP') + pipe('M962 200 H1010', 'flow--product') + arrow(1004, 200) +
      path('M1020 230 V170 L1050 150 L1080 170 V230 Z M1090 230 V180 H1130 V230 M1090 180 L1110 164 L1130 180 M1138 230 V176 L1152 186 V176 L1166 186 V230', 'p-l2 d') +
      line(1012, 230, 1176, 230, 'p-l2 d') + text(1094, 262, 'HOTELS · RESORTS', 't p-tag', 'middle') + text(1094, 278, 'VILLAGES · FACTORIES', 't p-tag', 'middle'), 'style="--g:4"') +
    g('grp', pipe('M600 211 V300 H90', 'flow--brine') + arrow(100, 300, -1) + text(90, 322, 'BRINE TO OUTFALL', 't p-tag'), 'style="--g:4"') +
    g('grp', pipe('M1100 278 V400 H940', 'flow--waste') + rect(900, 380, 40, 40, 'p-l2 d') + text(920, 444, 'SCREEN', 't p-tag', 'middle') +
      pipe('M900 400 H860', 'flow--waste') + rect(720, 372, 140, 56, 'p-l2 d') +
      Array.from({ length: 9 }, (_, i) => circle(736 + i * 14, 414 - (i % 3) * 8, 3, 'p-l0 d')).join('') + text(790, 452, 'BIOLOGICAL TREATMENT', 't p-tag', 'middle') +
      pipe('M720 400 H674', 'flow--waste') + circle(640, 400, 34, 'p-l2 d') + circle(640, 400, 10, 'p-l1 d') + text(640, 452, 'CLARIFIER', 't p-tag', 'middle') +
      pipe('M606 400 H570', 'flow--reuse') + rect(520, 380, 50, 40, 'p-l2 d') + text(545, 444, 'DISINFECTION', 't p-tag', 'middle') +
      pipe('M520 400 H470', 'flow--reuse') + arrow(478, 400, -1) +
      `<g class="p-trees">${tree(440, 392, 16, 'p-l1 d')}${tree(404, 404, 13, 'p-l1 d')}${tree(372, 392, 11, 'p-l1 d')}</g>` +
      text(404, 444, 'REUSE · IRRIGATION', 't p-tag', 'middle') +
      text(1110, 340, 'WASTEWATER', 't p-tag'), 'style="--g:5"') +
    g('scale', line(120, 492, 1080, 492, 'p-l1 d') + [0, 750, 1000, 1500, 3000].map((v) => {
      const x = 120 + (v / 3000) * 960;
      return line(x, 486, x, 498, 'p-l1 d') + text(x, 514, v.toLocaleString('en-US'), 't p-tag', 'middle');
    }).join('') + text(120, 474, 'PLANT CAPACITY · m³/day', 't p-tag') +
      `<g class="cap-dim">${line(120, 492, 120, 492, 'cap-line')}${circle(120, 492, 7, 'cap-dot')}</g>`) +
    `<g class="pid-readout"><text class="t p-read" x="1070" y="62" text-anchor="middle" data-pid="cap">750 m³/day</text><text class="t p-tag" x="1070" y="86" text-anchor="middle" data-pid="plant">MARCY VILLAGE · MARSA MATROUH</text></g>`;
}

/* ---------- Vision: elevation of what Montaser builds (2400 × 360) ---------- */

export function elevation() {
  const G0 = 300;
  const win = (x, y, cols, rows, w = 12, h = 14, gx = 22, gy = 26) => {
    let out = '';
    for (let c = 0; c < cols; c += 1) for (let r = 0; r < rows; r += 1) out += rect(x + c * gx, y + r * gy, w, h, 'l0 e');
    return out;
  };
  const tank = (x, w, h) => rect(x, G0 - h, w, h, 'l2 e') + path(`M${x} ${G0 - h} Q${x + w / 2} ${G0 - h - 18} ${x + w} ${G0 - h}`, 'l2 e');
  const arcade = (x, n) => Array.from({ length: n }, (_, i) => path(`M${x + i * 34} ${G0} V${G0 - 40} Q${x + i * 34 + 17} ${G0 - 66} ${x + i * 34 + 34} ${G0 - 40} V${G0}`, 'l1 e')).join('');
  const parts = [
    tank(50, 70, 120) + tank(140, 70, 150) + rect(230, G0 - 60, 80, 60, 'l2 e') + line(85, G0 - 90, 300, G0 - 90, 'l1 e') + line(85, G0 - 100, 300, G0 - 100, 'l1 e'),
    path(`M350 ${G0} V${G0 - 70} L390 ${G0 - 110} V${G0 - 70} L430 ${G0 - 110} V${G0 - 70} L470 ${G0 - 110} V${G0 - 70} L510 ${G0 - 110} V${G0 - 70} L550 ${G0 - 110} V${G0 - 70} H600 V${G0}`, 'l2 e') + win(366, G0 - 50, 9, 1, 14, 18, 26),
    rect(660, G0 - 120, 120, 120, 'l2 e') + win(672, G0 - 108, 5, 4) + rect(800, G0 - 180, 90, 180, 'l3 e') +
      path(`M800 ${G0 - 180} L845 ${G0 - 200} L890 ${G0 - 180}`, 'l2 e') + win(812, G0 - 166, 3, 6, 14, 14, 26, 26) +
      rect(910, G0 - 120, 120, 120, 'l2 e') + win(922, G0 - 108, 5, 4),
    rect(1070, G0 - 110, 200, 110, 'l2 e') + path(`M1110 ${G0 - 110} Q1170 ${G0 - 210} 1230 ${G0 - 110}`, 'l3 e') + line(1170, G0 - 196, 1170, G0 - 216, 'l1 e') +
      rect(1290, G0 - 260, 26, 260, 'l2 e') + path(`M1286 ${G0 - 260} L1303 ${G0 - 300} L1320 ${G0 - 260}`, 'l2 e') + line(1284, G0 - 200, 1322, G0 - 200, 'l1 e') + arcade(1060, 6),
    path(`M1370 ${G0} L1470 ${G0 - 130} H1500 V${G0}`, 'l2 e') + path(`M1720 ${G0} L1620 ${G0 - 130} H1590 V${G0}`, 'l2 e') +
      Array.from({ length: 10 }, (_, i) => line(1380 + i * 10, G0 - 13 * i, 1500, G0 - 13 * i, 'l0 e')).join('') +
      path(`M1460 ${G0 - 150} L1360 ${G0 - 168}`, 'l3 e') + line(1460, G0 - 150, 1460, G0 - 130, 'l2 e') +
      line(1350, G0, 1350, G0 - 250, 'l2 e') + rect(1336, G0 - 270, 28, 20, 'l1 e') + line(1745, G0, 1745, G0 - 250, 'l2 e') + rect(1731, G0 - 270, 28, 20, 'l1 e') + line(1500, G0 - 2, 1590, G0 - 2, 'l1 e'),
    rect(1790, G0 - 90, 150, 90, 'l2 e') + win(1802, G0 - 76, 6, 2, 14, 16, 23, 34) + rect(1960, G0 - 50, 110, 50, 'l1 e') +
      Array.from({ length: 6 }, (_, i) => line(1960 + i * 22, G0 - 50, 1960 + i * 22, G0, 'l0 e')).join(''),
    rect(2100, G0 - 70, 120, 8, 'l3 e') + line(2116, G0 - 62, 2116, G0, 'l2 e') + line(2204, G0 - 62, 2204, G0, 'l2 e') +
      path(`M2250 ${G0} V${G0 - 90}`, 'l2 e') + path(`M2250 ${G0 - 90} q-30 6 -42 24 M2250 ${G0 - 90} q30 6 42 24 M2250 ${G0 - 90} q-18 -14 -34 -10 M2250 ${G0 - 90} q18 -14 34 -10`, 'l1 e'),
    rect(2300, G0 - 16, 90, 8, 'l2 e') + [2310, 2340, 2370].map((x) => line(x, G0 - 8, x, G0 + 26, 'l1 e')).join('') +
      path(`M2290 ${G0 + 10} q10 -6 20 0 t20 0 t20 0 t20 0 t20 0`, 'l0 e'),
  ];
  const labels = [[180, 'WATER'], [475, 'INDUSTRY'], [845, 'EDUCATION'], [1190, 'HERITAGE'], [1545, 'SPORTS'], [1930, 'CLUBS'], [2170, 'HOSPITALITY'], [2345, 'MARINE']];
  return defs('el') + rect(0, G0, 2400, 40, 'l0', 0, `style="fill:${url('el', 'earth')}"`) + line(0, G0, 2400, G0, 'l3 e') +
    parts.map((p, i) => g('el-part', p, `style="--k:${i}"`)).join('') +
    g('L-anno', labels.map(([x, l]) => text(x, G0 + 56, l, 't t-lbl', 'middle') + line(x, G0 + 30, x, G0 + 40, 'l1')).join(''));
}

