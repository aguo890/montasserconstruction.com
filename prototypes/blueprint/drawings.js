// Hand-authored project drawings: the no-WebGL fallback that crossfades from drawing to as-built as you scroll.
// Each drawing shares geometry between a linework layer (dwg) and an as-built layer (built).
import {
  g, line, rect, circle, path, poly, text, dimH, dimV, leader, north,
  tree, palm, builtTree, dwgTitle, cloud, capsule, polar, defs, url, r1,
} from './kit.js';

const ground = (ns, cls = 'b-ground') => rect(0, 0, 1000, 700, cls);
const asBuilt = (x = 960, y = 36) => g('stamp-built', rect(x - 150, y - 22, 150, 34, 'b-stamp', 3) + text(x - 75, y + 1, 'AS-BUILT', 't t-stamp', 'middle'));

/* ---------- shared sport geometry ---------- */

function pitchLines(x, y, w, h, c = 'l1 d') {
  const cy = y + h / 2;
  const pa = { d: w * 0.157, h: h * 0.59 };
  const ga = { d: w * 0.052, h: h * 0.27 };
  const cr = h * 0.135;
  const arc = (px, dir) => {
    const ax = px + dir * pa.d;
    const r = cr;
    const dy = Math.sqrt(Math.max(0, r * r - (ax - (px + dir * w * 0.105)) ** 2));
    return path(`M${r1(ax)} ${r1(cy - dy)} A${r1(r)} ${r1(r)} 0 0 ${dir > 0 ? 1 : 0} ${r1(ax)} ${r1(cy + dy)}`, c);
  };
  return rect(x, y, w, h, c) + line(x + w / 2, y, x + w / 2, y + h, c) +
    circle(x + w / 2, cy, cr, c) + circle(x + w / 2, cy, 1.6, 'fill-line') +
    rect(x, cy - pa.h / 2, pa.d, pa.h, c) + rect(x + w - pa.d, cy - pa.h / 2, pa.d, pa.h, c) +
    rect(x, cy - ga.h / 2, ga.d, ga.h, c) + rect(x + w - ga.d, cy - ga.h / 2, ga.d, ga.h, c) +
    arc(x, 1) + arc(x + w, -1) +
    rect(x - 6, cy - h * 0.06, 6, h * 0.12, c) + rect(x + w, cy - h * 0.06, 6, h * 0.12, c);
}

function courtLines(x, y, w, h, c = 'l1 d') {
  const cy = y + h / 2;
  const key = { d: w * 0.19, h: h * 0.36 };
  const r3 = h * 0.44;
  const bx1 = x + w * 0.05;
  const bx2 = x + w - w * 0.05;
  return rect(x, y, w, h, c) + line(x + w / 2, y, x + w / 2, y + h, c) + circle(x + w / 2, cy, h * 0.17, c) +
    rect(x, cy - key.h / 2, key.d, key.h, c) + rect(x + w - key.d, cy - key.h / 2, key.d, key.h, c) +
    path(`M${r1(x)} ${r1(cy - r3)} L${r1(bx1)} ${r1(cy - r3)} A${r1(r3)} ${r1(r3)} 0 0 1 ${r1(bx1)} ${r1(cy + r3)} L${r1(x)} ${r1(cy + r3)}`, c) +
    path(`M${r1(x + w)} ${r1(cy - r3)} L${r1(bx2)} ${r1(cy - r3)} A${r1(r3)} ${r1(r3)} 0 0 0 ${r1(bx2)} ${r1(cy + r3)} L${r1(x + w)} ${r1(cy + r3)}`, c);
}

function padelLines(x, y, w, h, c = 'l1 d', glass = 'l3 d') {
  return rect(x, y, w, h, c) + line(x + w / 2, y - 3, x + w / 2, y + h + 3, 'l2 d') +
    line(x + w * 0.16, y, x + w * 0.16, y + h, c) + line(x + w * 0.84, y, x + w * 0.84, y + h, c) +
    line(x + w * 0.16, y + h / 2, x + w * 0.84, y + h / 2, c) +
    line(x, y, x, y + h, glass) + line(x + w, y, x + w, y + h, glass);
}

/* ---------- P-301 City Club ---------- */

const CC = {
  club: [80, 80, 250, 130], hall: [370, 80, 190, 130], deck: [600, 80, 330, 150], pool: [626, 100, 278, 104],
  pitchO: [80, 250, 360, 232], pitch: [102, 266, 316, 200], stand: [80, 490, 360, 26],
  courts: [[480, 252, 160, 96], [480, 360, 160, 96]],
  padel: [[668, 262, 120, 60], [800, 262, 120, 60], [668, 334, 120, 60], [800, 334, 120, 60]],
  park: [80, 534, 470, 66],
  trees: [[60, 236], [60, 300], [60, 360], [60, 420], [458, 236], [458, 300], [458, 380], [458, 446], [586, 248], [586, 330], [586, 410], [944, 250], [944, 330], [944, 410], [690, 440], [740, 452], [800, 440], [860, 452], [910, 440], [350, 225], [560, 518], [600, 560]],
};

function ccDwg(ns) {
  const [cx, cy, cw, ch] = CC.club;
  const [hx, hy, hw, hh] = CC.hall;
  const bubbles = [0, 1, 2, 3, 4].map((i) => {
    const x = cx + (cw / 4) * i;
    return line(x, cy - 18, x, cy + ch, 'l0 dash') + circle(x, cy - 28, 9, 'l1 d') + text(x, cy - 24, String(i + 1), 't t-bub', 'middle');
  }).join('') + ['A', 'B', 'C'].map((l, i) => {
    const y = cy + (ch / 2) * i;
    return line(cx - 18, y, cx + cw, y, 'l0 dash') + circle(cx - 28, y, 9, 'l1 d') + text(cx - 28, y + 4, l, 't t-bub', 'middle');
  }).join('');
  const parkLines = Array.from({ length: 21 }, (_, i) => {
    const x = CC.park[0] + 12 + i * 22;
    return line(x, CC.park[1], x, CC.park[1] + 24, 'l0 d') + line(x, CC.park[1] + 42, x, CC.park[1] + 66, 'l0 d');
  }).join('');
  const lanes = Array.from({ length: 7 }, (_, i) => line(CC.pool[0], CC.pool[1] + (CC.pool[3] / 8) * (i + 1), CC.pool[0] + CC.pool[2], CC.pool[1] + (CC.pool[3] / 8) * (i + 1), 'l0 dash')).join('');
  const umbrellas = Array.from({ length: 9 }, (_, i) => circle(640 + i * 33, 218, 7, 'l0 d')).join('');
  const standRows = [0, 1, 2, 3].map((i) => line(CC.stand[0], CC.stand[1] + 5 + i * 6, CC.stand[0] + CC.stand[2], CC.stand[1] + 5 + i * 6, 'l0 d')).join('');
  const masts = [[88, 258], [432, 258], [88, 474], [432, 474]].map(([x, y]) => circle(x, y, 6, 'l1 d') + line(x - 4, y - 4, x + 4, y + 4, 'l0 d') + line(x - 4, y + 4, x + 4, y - 4, 'l0 d')).join('');
  const sched = Array.from({ length: 15 }, (_, i) => {
    const x = 678 + i * 16;
    return rect(x, 546, 13, 13, i < 10 ? 'l1 d sched-done' : 'l1 d', 0, i < 10 ? '' : `style="fill:${url(ns, 'diag')}"`);
  }).join('');

  return defs(ns) +
    g('grp', rect(40, 40, 920, 575, 'l2 dashdot', 24), 'style="--g:0"') +
    g('grp', rect(cx, cy, cw, ch, 'l3 d') + rect(cx + 6, cy + 6, cw - 12, ch - 12, 'l1 d') +
      line(cx + 125, cy + 6, cx + 125, cy + ch - 6, 'l1 d') + line(cx + 6, cy + 70, cx + 125, cy + 70, 'l1 d') +
      rect(cx + 150, cy + ch, 60, 12, 'l1 d') + text(cx + 186, cy + 58, 'CLUBHOUSE', 't t-lbl', 'middle') +
      text(cx + 186, cy + 76, 'SOCIAL · ADMIN · CAFÉ', 't t-sub minor', 'middle'), 'style="--g:1"') +
    g('grp L-anno', bubbles, 'style="--g:2"') +
    g('grp', rect(hx, hy, hw, hh, 'l3 d') + rect(hx + 6, hy + 6, hw - 12, hh - 12, 'l1 d') +
      courtLines(hx + 24, hy + 22, hw - 48, hh - 62, 'l0 d') +
      [0, 1, 2].map((i) => line(hx + 18, hy + hh - 30 + i * 7, hx + hw - 18, hy + hh - 30 + i * 7, 'l0 d')).join('') +
      text(hx + hw / 2, hy - 8, 'SPORTS HALL', 't t-lbl', 'middle'), 'style="--g:2"') +
    g('grp', rect(...CC.deck, 'l1 d') + rect(...CC.pool, 'l2 d') + lanes + umbrellas +
      text(CC.pool[0] + CC.pool[2] / 2, CC.pool[1] + 58, 'SWIMMING POOL', 't t-lbl t-onfill', 'middle'), 'style="--g:3"') +
    g('grp', rect(...CC.pitchO, 'l2 d') + pitchLines(...CC.pitch) + rect(...CC.stand, 'l2 d') + standRows + masts +
      text(CC.pitch[0] + CC.pitch[2] / 2, CC.pitch[1] - 4, 'FOOTBALL PITCH', 't t-lbl t-onfill', 'middle'), 'style="--g:3"') +
    g('grp', CC.courts.map(([x, y, w, h]) => courtLines(x, y, w, h)).join('') +
      text(560, 248, 'MULTI-SPORT COURTS', 't t-lbl', 'middle'), 'style="--g:4"') +
    g('grp', CC.padel.map(([x, y, w, h]) => padelLines(x, y, w, h)).join('') +
      text(794, 254, 'PADEL COURTS', 't t-lbl', 'middle'), 'style="--g:4"') +
    g('grp', rect(...CC.park, 'l1 d') + parkLines + text(315, 571, 'PARKING', 't t-lbl', 'middle') +
      rect(586, 600, 56, 15, 'l2 d') + path('M614 660 L614 628 M606 638 L614 628 L622 638', 'l2 d') +
      text(614, 676, 'ENTRANCE', 't t-sub', 'middle') +
      path('M452 600 L452 236 L592 236 L592 600', 'l0 dash'), 'style="--g:5"') +
    g('grp', CC.trees.map(([x, y]) => tree(x, y, 11)).join(''), 'style="--g:5"') +
    g('grp sched', rect(668, 486, 252, 112, 'l1 d') + text(678, 506, 'BRANCH SCHEDULE', 't t-lbl') +
      text(678, 524, '15 CITY CLUB BRANCHES', 't t-sub') + sched +
      text(678, 580, '10 COMPLETED', 't t-sub') + text(918, 580, '5 UNDERWAY', 't t-sub', 'end') +
      dimH(678, 835, 538, '', { c: 'L-dims mini' }), 'style="--g:6"') +
    leader(260, 140, 300, 30, 'THE FIRST SMART CLUB IN EGYPT') +
    north(966, 92, 0.8) +
    dwgTitle(40, 668, 1, 'SITE PLAN · TYPICAL CITY CLUB BRANCH');
}

function ccBuilt(ns) {
  const [cx, cy, cw, ch] = CC.club;
  const [hx, hy, hw, hh] = CC.hall;
  const lanes = Array.from({ length: 7 }, (_, i) => line(CC.pool[0] + 6, CC.pool[1] + (CC.pool[3] / 8) * (i + 1), CC.pool[0] + CC.pool[2] - 6, CC.pool[1] + (CC.pool[3] / 8) * (i + 1), 'b-lane')).join('');
  const umbrellas = Array.from({ length: 9 }, (_, i) => circle(640 + i * 33, 218, 8, 'b-umbrella')).join('');
  const parkLines = Array.from({ length: 21 }, (_, i) => {
    const x = CC.park[0] + 12 + i * 22;
    return line(x, CC.park[1] + 2, x, CC.park[1] + 24, 'b-line') + line(x, CC.park[1] + 42, x, CC.park[1] + 64, 'b-line');
  }).join('');
  const cars = [0, 2, 3, 6, 8, 9, 12, 15, 17, 19].map((i) => rect(CC.park[0] + 15 + i * 22, CC.park[1] + 4, 15, 18, 'b-car', 3)).join('');
  return defs(ns) + ground(ns) +
    rect(40, 40, 920, 575, 'b-lawn', 24) +
    rect(446, 230, 152, 386, 'b-paving') + rect(80, 226, 520, 14, 'b-paving') +
    rect(...CC.park, 'b-asphalt') + parkLines + cars +
    rect(cx, cy, cw, ch, 'b-roof', 0, `filter="${url(ns, 'shadow')}"`) + rect(cx + 8, cy + 8, cw - 16, ch - 16, 'b-roof-in') +
    rect(cx + 20, cy + 22, 70, 40, 'b-plant') + rect(cx + 150, cy + ch, 60, 12, 'b-canopy') +
    rect(hx, hy, hw, hh, 'b-roof-metal', 0, `filter="${url(ns, 'shadow')}"`) +
    [1, 2, 3, 4, 5, 6, 7].map((i) => line(hx + (hw / 8) * i, hy + 4, hx + (hw / 8) * i, hy + hh - 4, 'b-rib')).join('') +
    rect(...CC.deck, 'b-paving-light') + rect(...CC.pool, '', 0, `style="fill:${url(ns, 'water')}"`) + lanes + umbrellas +
    rect(...CC.pitchO, 'b-track-green') + rect(...CC.pitch, '', 0, `style="fill:${url(ns, 'grassv')}"`) + pitchLines(...CC.pitch, 'b-line') +
    rect(...CC.stand, 'b-seat-blue', 0, `filter="${url(ns, 'shadow')}"`) +
    CC.courts.map(([x, y, w, h]) => rect(x - 6, y - 6, w + 12, h + 12, 'b-court-g') + rect(x, y, w, h, 'b-court-t') + courtLines(x, y, w, h, 'b-line')).join('') +
    CC.padel.map(([x, y, w, h]) => rect(x, y, w, h, 'b-padel') + padelLines(x, y, w, h, 'b-line', 'b-glass')).join('') +
    rect(586, 600, 56, 15, 'b-roof') +
    CC.trees.map(([x, y]) => builtTree(x, y, 12)).join('') +
    [[88, 258], [432, 258], [88, 474], [432, 474]].map(([x, y]) => circle(x, y, 6, 'b-mast')).join('') +
    g('', rect(668, 486, 252, 112, 'b-card') + text(678, 506, 'CITY CLUB', 't t-lbl') +
      text(678, 524, '“THE FIRST SMART CLUB IN EGYPT”', 't t-sub') +
      Array.from({ length: 15 }, (_, i) => rect(678 + i * 16, 546, 13, 13, i < 10 ? 'b-done' : 'b-todo')).join('') +
      text(678, 580, '10 COMPLETED', 't t-sub') + text(918, 580, '5 UNDERWAY', 't t-sub', 'end')) +
    asBuilt(956, 640);
}

/* ---------- P-302 Matrouh Stadium ---------- */

const ST = { cx: 500, cy: 318, hl: 150, track: [110, 150], tier: [166, 228, 288] };

function stadiumAisles(c) {
  const { cx, cy, hl, tier } = ST;
  let out = '';
  for (let x = cx - hl + 30; x <= cx + hl - 29; x += 60) {
    out += line(x, cy - tier[0], x, cy - tier[2], c) + line(x, cy + tier[0], x, cy + tier[2], c);
  }
  for (let a = -90 + 22.5; a < 90; a += 22.5) {
    const [x1, y1] = polar(cx + hl, cy, tier[0], a);
    const [x2, y2] = polar(cx + hl, cy, tier[2], a);
    const [x3, y3] = polar(cx - hl, cy, tier[0], 180 - a);
    const [x4, y4] = polar(cx - hl, cy, tier[2], 180 - a);
    out += line(x1, y1, x2, y2, c) + line(x3, y3, x4, y4, c);
  }
  return out;
}

const gate = (x, y, c = 'l1 d') => circle(x, y, 7, c) + line(x, y, x, y - 7, 'l0 d') + line(x, y, x + 6, y + 4, 'l0 d') + line(x, y, x - 6, y + 4, 'l0 d');
const ST_GATES = [[400, 18], [600, 18], [400, 618], [600, 618], [86, 318], [914, 318], [170, 110], [830, 526]];
const ST_MASTS = [[96, 62], [904, 62], [96, 574], [904, 574]];

function stDwg(ns) {
  const { cx, cy, hl, track, tier } = ST;
  const rows = [];
  for (let r = tier[0]; r <= tier[2]; r += 10) rows.push(path(capsule(cx, cy, hl, r), r === tier[1] ? 'l2 d' : 'l0 d'));
  const lanes = [];
  for (let r = track[0]; r <= track[1]; r += 5) lanes.push(path(capsule(cx, cy, hl, r), r === track[0] || r === track[1] ? 'l1 d' : 'l0 d'));
  return defs(ns) +
    g('grp', path(capsule(cx, cy, hl, tier[2] + 12), 'l3 d') + path(capsule(cx, cy, hl, tier[0] - 6), 'l2 d'), 'style="--g:0"') +
    g('grp', rows.join(''), 'style="--g:1"') +
    g('grp', stadiumAisles('l1 d'), 'style="--g:2"') +
    g('grp', lanes.join(''), 'style="--g:2"') +
    g('grp', pitchLines(cx - 140, cy - 90, 280, 180), 'style="--g:3"') +
    g('grp', rect(cx - 140, cy - tier[2] - 8, 280, tier[2] - tier[0] + 26, 'l1 dash') +
      text(cx, cy - tier[2] + 30, 'ROOF OVER MAIN STAND', 't t-sub minor', 'middle'), 'style="--g:3"') +
    g('grp', rect(cx + hl + tier[2] - 34, cy - 46, 14, 92, 'l3 d') +
      leader(cx + hl + tier[2] - 27, cy - 30, 900, 168, 'MAIN LED SCREEN', { side: 'left' }), 'style="--g:4"') +
    g('grp', ST_GATES.map(([x, y]) => gate(x, y)).join('') +
      leader(600, 18, 690, 40, 'ELECTRONIC GATES'), 'style="--g:4"') +
    g('grp', ST_MASTS.map(([x, y]) => circle(x, y, 8, 'l2 d') + line(x - 6, y - 6, x + 6, y + 6, 'l1 d') + line(x - 6, y + 6, x + 6, y - 6, 'l1 d')).join(''), 'style="--g:4"') +
    g('grp L-anno', path(capsule(cx, cy, hl, tier[2] + 30), 'l1 dashdot') +
      text(118, 618, 'INFRASTRUCTURE & WATER SYSTEMS (RING MAIN)', 't t-sub'), 'style="--g:5"') +
    dimH(cx - hl - tier[2] - 12, cx + hl + tier[2] + 12, 660, '26,800 SEATS · TO FIFA STANDARDS', { ext: 26 }) +
    g('L-anno', text(cx, cy + 5, 'PITCH', 't t-lbl t-onfill', 'middle') + text(cx, cy + track[0] + 22, 'RUNNING TRACK', 't t-sub minor', 'middle')) +
    north(950, 120, 0.8) +
    dwgTitle(30, 40, 2, 'BOWL PLAN · MATROUH STADIUM');
}

function stBuilt(ns) {
  const { cx, cy, hl, track, tier } = ST;
  const ring = (r0, r1v) => capsule(cx, cy, hl, r1v) + ' ' + capsule(cx, cy, hl, r0);
  return defs(ns) + ground(ns, 'b-ground-sand') +
    path(capsule(cx, cy, hl, tier[2] + 30), 'b-concourse') +
    path(ring(tier[0], tier[1]), '', `style="fill:${url(ns, 'seatsG')}" fill-rule="evenodd"`) +
    path(ring(tier[1] + 4, tier[2]), '', `style="fill:${url(ns, 'seatsS')}" fill-rule="evenodd"`) +
    path(capsule(cx, cy, hl, tier[1] + 2), 'b-walk') +
    stadiumAisles('b-aisle') +
    path(ring(track[0], track[1]), 'b-track', 'fill-rule="evenodd"') +
    [115, 120, 125, 130, 135, 140, 145].map((r) => path(capsule(cx, cy, hl, r), 'b-lane-line')).join('') +
    path(capsule(cx, cy, hl, track[0]), '', `style="fill:${url(ns, 'grassv')}"`) +
    pitchLines(cx - 140, cy - 90, 280, 180, 'b-line') +
    rect(cx - 140, cy - tier[2] - 8, 280, tier[2] - tier[0] + 26, 'b-roof-glass', 0, `filter="${url(ns, 'shadow')}"`) +
    [1, 2, 3, 4, 5, 6].map((i) => line(cx - 140 + i * 40, cy - tier[2] - 8, cx - 140 + i * 40, cy - tier[0] + 18, 'b-rib')).join('') +
    rect(cx + hl + tier[2] - 34, cy - 46, 14, 92, 'b-led', 0, `filter="${url(ns, 'shadow')}"`) +
    ST_GATES.map(([x, y]) => circle(x, y, 7, 'b-gate')).join('') +
    ST_MASTS.map(([x, y]) => circle(x, y, 8, 'b-mast')).join('') +
    [[60, 640], [120, 650], [880, 650], [940, 640], [60, 30], [940, 30]].map(([x, y]) => builtTree(x, y, 13)).join('') +
    asBuilt(966, 664);
}

/* ---------- P-303 Matrouh University ---------- */

const UN = { cx: 500, cy: 318 };
const UN_BLOCKS = [-90, -30, 30, 150, 210].map((a) => ({ a, p: polar(UN.cx, UN.cy, 196, a) }));
const octagon = (cx, cy, r) => Array.from({ length: 8 }, (_, i) => polar(cx, cy, r, 22.5 + i * 45));

function block({ a, p }, c, inner = true) {
  const [x, y] = p;
  const rot = a + 90;
  const body = rect(-78, -30, 156, 60, c) + (inner ? line(-72, -4, 72, -4, 'l0 d') + line(-72, 4, 72, 4, 'l0 d') +
    [-48, -16, 16, 48].map((dx) => line(dx, -30, dx, -4, 'l0 d') + line(dx, 4, dx, 30, 'l0 d')).join('') +
    rect(-8, -26, 16, 18, 'l0 d') : '');
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)})">${body}</g>`;
}

const UN_ROAD = 'M120 82 H880 Q920 82 920 122 V552 Q920 592 880 592 H120 Q80 592 80 552 V122 Q80 82 120 82 Z';
const UN_ROAD_IN = 'M136 102 H864 Q900 102 900 138 V536 Q900 572 864 572 H136 Q100 572 100 536 V138 Q100 102 136 102 Z';

function unDwg(ns) {
  const { cx, cy } = UN;
  const nets = g('nets L-anno',
    path('M150 132 H850 V540', 'net net--e l1 dashdot') +
    path('M560 420 L640 470 L800 500', 'net net--s l1 dash') + path('M380 470 L520 480 L640 470', 'net net--s l1 dash') +
    path('M800 520 C700 560 400 560 230 520 C180 500 170 420 190 360', 'net net--i l1 dot') +
    path('M300 200 C380 150 620 150 700 200 M300 440 C380 500 420 500 460 510', 'net net--f l1 d') +
    [[300, 200], [700, 200], [460, 510], [500, 150]].map(([x, y]) => circle(x, y, 5, 'fill-red')).join('') +
    [[640, 470], [560, 420], [520, 480]].map(([x, y]) => circle(x, y, 5, 'l1 d')).join(''));
  const legend = g('legend L-anno', rect(118, 450, 148, 106, 'l1 d fill-paper') + text(128, 468, 'NETWORKS', 't t-sub') +
    line(128, 484, 162, 484, 'net net--e l1 dashdot') + text(170, 488, 'ELECTRICAL', 't t-sub') +
    line(128, 502, 162, 502, 'net net--s l1 dash') + text(170, 506, 'SEWAGE', 't t-sub') +
    line(128, 520, 162, 520, 'net net--i l1 dot') + text(170, 524, 'IRRIGATION', 't t-sub') +
    line(128, 538, 162, 538, 'net net--f l1') + circle(145, 538, 4, 'fill-red') + text(170, 542, 'FIRE', 't t-sub'));
  const months = [0, 6, 12, 18, 24, 30].map((m) => {
    const x = 120 + (m / 30) * 760;
    return line(x, 612, x, 618, 'l1 d') + text(x, 608, `M${m}`, 't t-sub', 'middle');
  }).join('');
  return defs(ns) +
    g('grp', path(UN_ROAD, 'l2 d') + path(UN_ROAD_IN, 'l2 d') +
      path('M128 92 H872 Q910 92 910 130 V544 Q910 582 872 582 H128 Q90 582 90 544 V130 Q90 92 128 92 Z', 'l0 dash') +
      rect(486, 572, 28, 40, 'l1 d') + line(486, 592, 514, 592, 'l0 d'), 'style="--g:0"') +
    g('grp', poly(octagon(cx, cy, 74), 'l3 d') + poly(octagon(cx, cy, 64), 'l1 d') + poly(octagon(cx, cy, 30), 'l2 d') +
      octagon(cx, cy, 64).map(([x, y], i) => line(x, y, ...octagon(cx, cy, 30)[i], 'l0 d')).join('') +
      path(`M${cx} ${cy + 74} V572`, 'l1 dash'), 'style="--g:1"') +
    g('grp', UN_BLOCKS.map((b) => block(b, 'l3 d')).join(''), 'style="--g:2"') +
    g('grp', circle(834, 140, 20, 'l2 d') + circle(878, 162, 20, 'l2 d') + text(856, 196, 'WATER TANKS', 't t-sub', 'middle') +
      rect(760, 470, 120, 84, 'l2 d') + circle(792, 500, 16, 'l1 d') + circle(792, 500, 6, 'l0 d') + circle(844, 500, 16, 'l1 d') +
      rect(772, 524, 96, 20, 'l1 d') + text(820, 466, 'WWTP · IRRIGATION', 't t-sub', 'middle') +
      rect(126, 116, 44, 30, 'l2 d') + text(148, 135, 'SUB', 't t-sub', 'middle'), 'style="--g:3"') +
    g('grp', nets, 'style="--g:4"') + legend +
    g('L-anno', text(cx, cy + 4, 'CENTRAL', 't t-sub', 'middle') +
      leader(...UN_BLOCKS[0].p, 300, 52, 'EDUCATIONAL BUILDINGS', { side: 'left' }) +
      leader(...UN_BLOCKS[2].p, 760, 600 - 160, 'SCIENTIFIC WORKSHOPS') +
      leader(...UN_BLOCKS[1].p, 700, 46, 'ADMINISTRATIVE ANNEXES') +
      leader(...UN_BLOCKS[4].p, 330, 250, 'UNIVERSITY SERVICES')) +
    g('dims-prog L-dims', months +
      dimH(120, 120 + (18 / 30) * 760, 638, 'BUILDINGS · 18 MONTHS') +
      dimH(120, 880, 676, 'INFRASTRUCTURE · 30 MONTHS')) +
    north(956, 556, 0.7) +
    dwgTitle(24, 38, 3, 'CAMPUS PLAN · MATROUH UNIVERSITY');
}

function unBuilt(ns) {
  const { cx, cy } = UN;
  return defs(ns) + ground(ns, 'b-ground-sand') +
    path(UN_ROAD, 'b-asphalt') + path(UN_ROAD_IN, 'b-ground-sand') +
    path('M128 92 H872 Q910 92 910 130 V544 Q910 582 872 582 H128 Q90 582 90 544 V130 Q90 92 128 92 Z', 'b-roadline') +
    rect(486, 392, 28, 220, 'b-asphalt') +
    circle(cx, cy, 150, 'b-plaza') + circle(cx, cy, 112, 'b-lawn-light') +
    poly(octagon(cx, cy, 74), 'b-roof', true).replace('/>', ` filter="${url(ns, 'shadow')}"/>`) +
    poly(octagon(cx, cy, 64), 'b-roof-in') + poly(octagon(cx, cy, 30), 'b-lawn') +
    UN_BLOCKS.map((b) => `<g filter="${url(ns, 'shadow')}">${block(b, 'b-roof', false)}</g>` +
      block(b, 'b-roof-edge', false)).join('') +
    UN_BLOCKS.map(({ a, p }) => `<g transform="translate(${r1(p[0])} ${r1(p[1])}) rotate(${a + 90})">${rect(-70, -22, 140, 8, 'b-plant')}${rect(-70, 14, 140, 8, 'b-plant')}</g>`).join('') +
    circle(834, 140, 20, 'b-tank') + circle(878, 162, 20, 'b-tank') +
    rect(760, 470, 120, 84, 'b-concrete') + circle(792, 500, 16, 'b-water-fill') + circle(844, 500, 16, 'b-water-fill') + rect(772, 524, 96, 20, 'b-water-fill') +
    rect(126, 116, 44, 30, 'b-roof') +
    [[260, 300], [740, 300], [380, 440], [620, 440], [420, 190], [580, 190], [230, 380], [770, 380]].map(([x, y]) => builtTree(x, y, 11)).join('') +
    asBuilt(964, 664);
}

/* ---------- P-304 Mosque Square ---------- */

const MQ_ROUTE = 'M36 604 C130 594 190 458 290 446 C400 436 470 400 560 330 C620 284 650 246 700 240 C770 232 792 330 765 436';
const MQ_COLS_N = Array.from({ length: 22 }, (_, i) => [90 + i * 26, 92]);
const MQ_COLS_S = Array.from({ length: 12 }, (_, i) => [360 + i * 26, 608]);
const MQ_PALMS = [[150, 560], [215, 490], [420, 456], [496, 400], [610, 300], [652, 270], [792, 300], [802, 380], [100, 200], [100, 320]];
const MQ_STOPS = [[290, 446, '1'], [700, 240, '2'], [765, 436, '3']];

function mainMosque(c, domeC, extra = '') {
  const pts = [[215, 190], [365, 190], [405, 230], [405, 370], [365, 410], [215, 410], [175, 370], [175, 230]];
  return poly(pts, c).replace('/>', ` ${extra}/>`) + circle(290, 300, 54, domeC) + circle(290, 300, 40, domeC) +
    [[221, 230], [359, 230], [221, 370], [359, 370]].map(([x, y]) => circle(x, y, 17, domeC)).join('');
}
const minaret = (x, y, c) => rect(x - 13, y - 13, 26, 26, c) + circle(x, y, 9, c) + circle(x, y, 3, c);
const otherMosques = (c, domeC, extra = '') => rect(640, 110, 140, 104, c, 0, extra) + circle(710, 162, 32, domeC) +
  rect(700, 440, 130, 110, c, 0, extra) + circle(765, 495, 32, domeC);
const minarets = (c) => minaret(430, 422, c) + minaret(806, 124, c) + minaret(852, 458, c);

function mqDwg(ns) {
  const hatch = `style="fill:${url(ns, 'diag')}"`;
  const cross = `style="fill:${url(ns, 'cross')}"`;
  const arches = (cols, dy) => cols.slice(0, -1).map(([x, y]) => path(`M${x + 4} ${y} Q${x + 13} ${y + dy} ${x + 22} ${y}`, 'l0 dash')).join('');
  return defs(ns) +
    g('grp', rect(60, 70, 820, 560, 'l1 d') + rect(80, 90, 780, 520, 'l0 dash'), 'style="--g:0"') +
    g('grp', mainMosque('l3 d', 'l1 d', hatch) + otherMosques('l3 d', 'l1 d', hatch) + minarets('l2 d'), 'style="--g:1"') +
    g('grp', MQ_COLS_N.map(([x, y]) => rect(x - 4, y - 4, 8, 8, 'l2 d')).join('') + arches(MQ_COLS_N, 18) +
      MQ_COLS_S.map(([x, y]) => rect(x - 4, y - 4, 8, 8, 'l2 d')).join('') + arches(MQ_COLS_S, -18), 'style="--g:2"') +
    g('grp', rect(460, 140, 110, 54, 'l3 d', 0, cross) + rect(540, 470, 80, 46, 'l3 d', 0, cross), 'style="--g:2"') +
    g('grp route', path(MQ_ROUTE, 'route-edge d') + path(MQ_ROUTE, 'route-fill d') + path(MQ_ROUTE, 'l1 dash route-centre'), 'style="--g:3"') +
    g('grp', MQ_PALMS.map(([x, y]) => palm(x, y, 13)).join(''), 'style="--g:4"') +
    g('L-anno', MQ_STOPS.map(([x, y, n]) => circle(x, y, 12, 'l2 d fill-paper') + text(x, y + 4, n, 't t-bub', 'middle')).join('') +
      text(290, 296, 'EL-MORSI ABU EL-ABBAS', 't t-lbl t-onfill', 'middle') + text(290, 314, 'MOSQUE', 't t-sub t-onfill', 'middle') +
      text(710, 102, 'MOSQUE', 't t-sub', 'middle') + text(765, 572, 'MOSQUE', 't t-sub', 'middle') +
      leader(515, 140, 540, 40, 'NEW FACILITIES') +
      leader(300, 92, 250, 40, 'ARCADES · UPGRADED', { side: 'left' }) +
      leader(560, 330, 600, 650, 'TOURISTIC PROMENADE', { sub: 'ONE ROUTE LINKING ALL MOSQUES' })) +
    g('legend L-anno', rect(892, 470, 100, 96, 'l1 d fill-paper') +
      rect(902, 482, 18, 12, 'l1 d', 0, hatch) + text(926, 492, 'EXISTING', 't t-sub') +
      rect(902, 504, 18, 12, 'l1 d', 0, cross) + text(926, 514, 'NEW', 't t-sub') +
      line(902, 534, 920, 534, 'route-mini') + text(926, 538, 'ROUTE', 't t-sub') +
      text(902, 558, 'HERITAGE KEPT', 't t-sub')) +
    cloud(892, 604, 96, 28, 'CITY: CONFIRM') +
    north(950, 70, 0.8) +
    dwgTitle(24, 672, 4, 'SQUARE PLAN · MOSQUE SQUARE PROMENADE');
}

function mqBuilt(ns) {
  return defs(ns) + ground(ns, 'b-ground-stone') +
    rect(60, 70, 820, 560, '', 0, `style="fill:${url(ns, 'pave')}"`) +
    path(MQ_ROUTE, 'b-route') + path(MQ_ROUTE, 'b-route-in') +
    `<g filter="${url(ns, 'shadow')}">${mainMosque('b-mosque', 'b-dome')}${otherMosques('b-mosque', 'b-dome')}${minarets('b-minaret')}` +
    rect(460, 140, 110, 54, 'b-roof') + rect(540, 470, 80, 46, 'b-roof') +
    rect(82, 80, 568, 24, 'b-tile') + rect(352, 596, 300, 24, 'b-tile') + '</g>' +
    MQ_PALMS.map(([x, y]) => builtTree(x, y, 12)).join('') +
    asBuilt(966, 664);
}

/* ---------- P-305 Coral Beach Village ---------- */
// Channel and pier are drawn in true 2:1 proportion (90 m : 45 m), 4 units per metre.

const CB = { shore: 244, chX: 486, chW: 58, chTop: 252, chLen: 360, pierX: 380, pierLen: 180 };
const CB_SHORE = 'M0 236 C120 250 220 228 330 244 C430 258 560 236 660 246 C780 258 880 238 1000 246';
const CB_REEF = 'M0 300 C150 320 260 296 400 318 C560 340 700 306 860 326 C930 334 970 320 1000 324 L1000 552 C860 572 700 548 560 566 C420 584 260 556 120 572 C70 578 30 570 0 574 Z';
const CB_LAGOON_A = 'M96 270 C150 254 270 262 300 290 C320 320 280 352 210 356 C140 360 84 334 80 304 C78 286 84 276 96 270 Z';
const CB_LAGOON_B = 'M120 392 C180 372 300 380 322 410 C338 436 300 462 230 466 C160 470 108 448 104 420 C102 404 108 396 120 392 Z';
const CB_BREAK = [[586, 250], [586, 412], [812, 412], [812, 330]];
const CB_WALK = [[880, 248], [900, 330], [930, 430]];

function rockChain(pts, c) {
  let out = '';
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 13);
    for (let k = 0; k <= n; k += 1) {
      const x = x1 + ((x2 - x1) * k) / n;
      const y = y1 + ((y2 - y1) * k) / n;
      const s = 6 + ((k * 7 + i * 3) % 4);
      out += poly([[x - s, y], [x - s * 0.3, y - s * 0.9], [x + s * 0.8, y - s * 0.5], [x + s, y + s * 0.4], [x, y + s * 0.9]], c);
    }
  }
  return out;
}

function cbDwg(ns) {
  const { chX, chW, chTop, chLen, pierX, pierLen } = CB;
  const berths = [0, 1, 2, 3, 4, 5].map((i) => line(620 + i * 30, 262, 620 + i * 30, 312, 'l1 d')).join('');
  const posts = Array.from({ length: 16 }, (_, i) => circle(90 + i * 15, 372 + Math.sin(i / 2) * 4, 2.6, 'fill-ink')).join('');
  const planks = (() => {
    let out = '';
    for (let i = 0; i < CB_WALK.length - 1; i += 1) {
      const [x1, y1] = CB_WALK[i];
      const [x2, y2] = CB_WALK[i + 1];
      const n = Math.round(Math.hypot(x2 - x1, y2 - y1) / 9);
      const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
      for (let k = 0; k < n; k += 1) {
        const x = x1 + ((x2 - x1) * k) / n;
        const y = y1 + ((y2 - y1) * k) / n;
        out += line(x - Math.cos(ang) * 8, y - Math.sin(ang) * 8, x + Math.cos(ang) * 8, y + Math.sin(ang) * 8, 'l0 d');
      }
    }
    return out;
  })();
  return defs(ns) +
    g('grp', rect(0, 0, 1000, 236, '', 0, `style="fill:${url(ns, 'dots')}" opacity=".6"`) + path(CB_SHORE, 'l3 d') +
      path('M0 266 C150 280 280 258 420 272 C560 286 700 262 860 276 C930 282 970 272 1000 276', 'l0 dash'), 'style="--g:0"') +
    g('grp', path(CB_REEF, 'l1 d', `style="fill:${url(ns, 'reef')}"`) + text(140, 540, 'CORAL REEF FLAT', 't t-sub minor'), 'style="--g:1"') +
    g('grp', rect(chX, chTop, chW, chLen, 'l3 d fill-paper') + rect(chX, chTop + 40, chW, chLen - 40, 'l0 d', 0, `style="fill:${url(ns, 'rock')}"`) +
      text(chX + chW / 2, 660, 'OPEN SEA', 't t-sub', 'middle'), 'style="--g:2"') +
    g('grp', rect(pierX - 8, CB.shore - 4, 16, pierLen + 4, 'l3 d fill-paper') + rect(pierX - 22, CB.shore + pierLen - 20, 44, 20, 'l2 d fill-paper') +
      [1, 2, 3, 4, 5, 6, 7, 8].map((i) => line(pierX - 8, CB.shore + i * 20, pierX + 8, CB.shore + i * 20, 'l0 d')).join(''), 'style="--g:3"') +
    g('grp', path(CB_LAGOON_A, 'l2 d') + path(CB_LAGOON_B, 'l2 d') + posts +
      text(200, 312, 'LAGOON 1', 't t-sub', 'middle') + text(214, 428, 'LAGOON 2', 't t-sub', 'middle'), 'style="--g:3"') +
    g('grp', rect(604, 252, 196, 140, 'l1 dash') + berths + text(700, 352, 'MARINA', 't t-lbl', 'middle') +
      rockChain(CB_BREAK, 'l1 d'), 'style="--g:4"') +
    g('grp', poly(CB_WALK, 'l2 d', false) + planks + circle(930, 440, 22, 'l2 d') +
      text(930, 486, 'CORAL RIVIERA', 't t-sub', 'middle'), 'style="--g:4"') +
    g('grp', rect(90, 60, 160, 90, 'l2 d') + rect(300, 40, 120, 70, 'l2 d') + rect(780, 50, 170, 80, 'l2 d') +
      path('M560 120 C600 90 700 90 740 120 C760 150 720 190 650 190 C580 190 540 160 560 120 Z', 'l2 d') +
      [[480, 70], [520, 190], [270, 190], [860, 180]].map(([x, y]) => palm(x, y, 12)).join(''), 'style="--g:5"') +
    dimV(chX + chW + 26, chTop, chTop + chLen, '90 m CHANNEL', { ext: 20, right: true }) +
    dimV(pierX - 30, CB.shore, CB.shore + pierLen, '45 m CONCRETE PIER', { ext: 16 }) +
    g('L-anno', leader(chX + 30, 470, 640, 500, '25,000 m³ ROCK REMOVED', { sub: 'UNDERWATER, TO FORM THE CHANNEL' }) +
      leader(812, 380, 840, 590, 'BREAKWATERS WITH RIPRAP') +
      leader(150, 372, 60, 470, 'WOODEN BARRIER', { side: 'left' })) +
    north(960, 300, 0.8) +
    g('L-anno', text(980, 690, 'CHANNEL AND PIER IN TRUE 2:1 PROPORTION', 't t-sub', 'end')) +
    dwgTitle(24, 672, 5, 'MARINE PLAN · CORAL BEACH VILLAGE');
}

function cbBuilt(ns) {
  const { chX, chW, chTop, chLen, pierX, pierLen } = CB;
  return defs(ns) + rect(0, 0, 1000, 700, '', 0, `style="fill:${url(ns, 'sea')}"`) +
    path(CB_REEF, 'b-reef') + path(CB_REEF, '', `style="fill:${url(ns, 'reef')}" opacity=".5"`) +
    path(`${CB_SHORE} L1000 0 L0 0 Z`, 'b-sand') +
    path('M0 0 H1000 V200 C800 210 600 196 400 206 C250 212 100 200 0 204 Z', 'b-lawn-light') +
    rect(chX, chTop, chW, chLen + 120, 'b-channel') +
    path(CB_LAGOON_A, 'b-lagoon') + path(CB_LAGOON_B, 'b-lagoon') +
    rect(604, 252, 196, 140, 'b-marina') +
    [0, 1, 2, 3, 4, 5].map((i) => rect(618 + i * 30, 262, 5, 50, 'b-timber-solid')).join('') +
    rockChain(CB_BREAK, 'b-rock') +
    `<g filter="${url(ns, 'shadow')}">` + rect(pierX - 8, CB.shore - 4, 16, pierLen + 4, 'b-concrete') + rect(pierX - 22, CB.shore + pierLen - 20, 44, 20, 'b-concrete') +
    poly(CB_WALK, 'b-walkway', false) + circle(930, 440, 22, 'b-timber-solid') +
    rect(90, 60, 160, 90, 'b-roof') + rect(300, 40, 120, 70, 'b-roof') + rect(780, 50, 170, 80, 'b-roof') + '</g>' +
    path('M560 120 C600 90 700 90 740 120 C760 150 720 190 650 190 C580 190 540 160 560 120 Z', 'b-pool-shape') +
    Array.from({ length: 14 }, (_, i) => circle(80 + i * 18, 248 + (i % 2) * 6, 6, 'b-umbrella-straw')).join('') +
    [[480, 70], [520, 190], [270, 190], [860, 180], [540, 60], [760, 190]].map(([x, y]) => builtTree(x, y, 12)).join('') +
    asBuilt(966, 664);
}

/* ---------- P-306 Industry: factory section ---------- */

const FA = { gl: 520, c1: 150, c2: 850, eave: 262, ridge: 168 };

function frame(c, cc) {
  const { gl, c1, c2, eave, ridge } = FA;
  return rect(c1 - 8, eave, 16, gl - eave, c) + rect(c2 - 8, eave, 16, gl - eave, c) +
    poly([[c1 - 8, eave], [500, ridge], [c2 + 8, eave], [c2 + 8, eave + 18], [500, ridge + 18], [c1 - 8, eave + 18]], c) +
    line(c1 - 20, eave - 8, 500, ridge - 14, cc) + line(500, ridge - 14, c2 + 20, eave - 8, cc);
}

function faDwg(ns) {
  const { gl, c1, c2, eave } = FA;
  const purlins = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 0.5) / 9;
    return rect(c1 + (500 - c1) * t - 4, eave - 12 - (eave - FA.ridge) * t, 8, 8, 'l1 d') +
      rect(500 + (c2 - 500) * t - 4, FA.ridge - 12 + (eave - FA.ridge) * t, 8, 8, 'l1 d');
  }).join('');
  const heads = Array.from({ length: 10 }, (_, i) => poly([[200 + i * 64, 280], [195 + i * 64, 290], [205 + i * 64, 290]], 'fill-red')).join('');
  return defs(ns) +
    g('grp', line(20, gl, 980, gl, 'l4 d') + rect(20, gl, 960, 40, 'l0 d', 0, `style="fill:${url(ns, 'earth')}"`) +
      [c1, c2].map((x) => rect(x - 34, gl + 14, 68, 26, 'l2 d fill-paper')).join(''), 'style="--g:0"') +
    g('grp', frame('l3 d fill-paper', 'l2 d') + purlins, 'style="--g:1"') +
    g('grp L-anno', [[c1, '1'], [c2, '2']].map(([x, n]) => line(x, 120, x, eave, 'l0 dash') + circle(x, 108, 11, 'l1 d') + text(x, 112, n, 't t-bub', 'middle')).join(''), 'style="--g:1"') +
    g('grp', rect(650, 390, 192, 10, 'l3 d') + line(650, 400, 610, gl, 'l1 d') +
      [0, 1, 2, 3, 4, 5].map((i) => line(650 - i * 7, 400 + i * 20, 660 - i * 7, 400 + i * 20, 'l0 d')).join(''), 'style="--g:2"') +
    g('grp mep', rect(180, 296, 640, 7, 'l1 d', 0, `style="fill:${url(ns, 'cross')}"`) + text(190, 318, 'ELECTRICAL · CABLE TRAY', 't t-sub minor') +
      line(170, 280, 830, 280, 'l2 d red-line') + heads +
      rect(300, 330, 34, 24, 'l1 d') + line(300, 330, 334, 354, 'l0 d') + line(334, 330, 300, 354, 'l0 d') +
      rect(560, 330, 34, 24, 'l1 d') + line(560, 330, 594, 354, 'l0 d') + line(594, 330, 560, 354, 'l0 d') +
      line(334, 342, 560, 342, 'l1 dash'), 'style="--g:3"') +
    g('grp', rect(210, 382, 52, 138, 'l2 d', 26) + line(236, 382, 236, 360, 'l1 d') + line(236, 360, 330, 360, 'l1 d') +
      [[330, 450, 80, 70], [430, 470, 100, 50], [550, 455, 60, 65]].map(([x, y, w, h]) => rect(x, y, w, h, 'l2 d')).join('') +
      path('M262 470 H330 M410 480 H430 M530 490 H550', 'l1 d') +
      [0, 1, 2].map((i) => rect(760 + i * 28, 430, 24, 90, 'l2 d')).join(''), 'style="--g:4"') +
    g('grp', [[260, 545, 10], [420, 548, 7], [560, 545, 10], [720, 550, 6]].map(([x, y, r]) => circle(x, y, r, 'l2 d fill-paper')).join(''), 'style="--g:5"') +
    g('L-anno', leader(500, 280, 520, 120, 'FIRE SYSTEMS', { sub: 'SPRINKLERS' }) +
      leader(317, 342, 340, 214, 'MEP', { side: 'left', sub: 'HVAC DUCTWORK' }) +
      leader(800, 470, 900, 360, 'ELECTRICAL', { sub: 'CONTROL PANELS' }) +
      leader(420, 548, 470, 640, 'INFRASTRUCTURE', { sub: 'BURIED SERVICES' }) +
      text(30, gl - 8, '±0.00 FFL', 't t-sub') +
      [[24, 'A'], [976, 'A']].map(([x, l]) => circle(x, 200, 13, 'l2 d') + text(x, 205, l, 't t-bub', 'middle') + line(x, 213, x, 250, 'l2 d')).join('')) +
    dwgTitle(24, 672, 6, 'SECTION A–A · TYPICAL FACTORY, MEP SERVICES');
}

function faBuilt(ns) {
  const { gl, c1, c2, eave } = FA;
  return defs(ns) + rect(0, 0, 1000, 700, 'b-sky') +
    rect(20, gl, 960, 180, 'b-earth') + rect(c1 - 8, 330, c2 - c1 + 16, gl - 330, 'b-wall') +
    poly([[c1 - 8, eave], [500, FA.ridge], [c2 + 8, eave], [c2 + 8, gl], [c1 - 8, gl]], 'b-interior') +
    `<g filter="${url(ns, 'shadow')}">` + frame('b-steel', 'b-cladding') + '</g>' +
    rect(c1 + 8, gl - 8, c2 - c1 - 16, 8, 'b-floor') +
    rect(650, 390, 192, 10, 'b-concrete') + line(650, 400, 610, gl, 'b-stair') +
    rect(180, 296, 640, 7, 'b-tray') + line(170, 280, 830, 280, 'b-fire') +
    Array.from({ length: 10 }, (_, i) => circle(200 + i * 64, 288, 3.5, 'b-fire-head')).join('') +
    rect(300, 330, 34, 24, 'b-duct') + rect(560, 330, 34, 24, 'b-duct') + rect(334, 336, 226, 12, 'b-duct') +
    rect(210, 382, 52, 138, 'b-tankfill', 0, 'rx="26"') + path('M236 382 V360 H330', 'b-pipe') +
    [[330, 450, 80, 70], [430, 470, 100, 50], [550, 455, 60, 65]].map(([x, y, w, h]) => rect(x, y, w, h, 'b-machine', 3)).join('') +
    path('M262 470 H330 M410 480 H430 M530 490 H550', 'b-pipe') +
    [0, 1, 2].map((i) => rect(760 + i * 28, 430, 24, 90, 'b-panel') + rect(764 + i * 28, 440, 16, 10, 'b-panel-screen')).join('') +
    [[260, 545, 10, 'b-pipe-s'], [420, 548, 7, 'b-pipe-w'], [560, 545, 10, 'b-pipe-s'], [720, 550, 6, 'b-pipe-f']].map(([x, y, r, c]) => circle(x, y, r, c)).join('') +
    g('mep-key', [['b-fire', 'FIRE'], ['b-tray', 'ELECTRICAL'], ['b-duct', 'HVAC'], ['b-pipe', 'PROCESS']].map(([c, l], i) =>
      rect(40 + i * 110, 600, 22, 10, c.replace('b-fire', 'b-fire-key')) + text(68 + i * 110, 609, l, 't t-sub')).join('')) +
    asBuilt(966, 664);
}

export const DRAWINGS = {
  cityclub: { dwg: ccDwg, built: ccBuilt },
  stadium: { dwg: stDwg, built: stBuilt },
  university: { dwg: unDwg, built: unBuilt },
  mosque: { dwg: mqDwg, built: mqBuilt },
  coral: { dwg: cbDwg, built: cbBuilt },
  factory: { dwg: faDwg, built: faBuilt },
};

