// Maquettes 4–7: factory hall, Matrouh University, Mosque Square promenade, Coral Beach marine works.
import * as THREE from 'three';
import { instanceAnim } from './kit.js';
import {
  box, cyl, pipe, beam, ring, combine, extrudePlan, planShape, planPath, polyline, prismX,
  polygonPoints, lathe, domeProfile, arcadeWall, TAU,
} from './geo.js';
import { tree, palm, people } from './parts.js';

/* ---------- Factory hall (representative) ---------- */

export function buildFactory(kit, rand) {
  const Y = 0.012;
  kit.add(box(3.5, Y, 2.5), { mat: 'grey', stage: 'F', order: 0, edgeAngle: 40 });
  const X0 = -1.15;
  const BAYS = 9;
  const BAY = 0.2;
  const Z0 = -0.9;
  const Z1 = 0.1;
  const ZR = (Z0 + Z1) / 2;
  const EAVE = 0.3;
  const RIDGE = 0.4;
  kit.add(box(BAYS * BAY + 0.06, 0.016, Z1 - Z0 + 0.06, X0 + (BAYS * BAY) / 2, Y, ZR), { stage: 'F', order: 0.25 });
  const y0 = Y + 0.016;

  for (let i = 0; i <= BAYS; i++) {
    const x = X0 + i * BAY;
    const frame = combine([
      box(0.02, EAVE, 0.03, x, y0, Z0), box(0.02, EAVE, 0.03, x, y0, Z1),
      beam([x, y0 + EAVE, Z0], [x, y0 + RIDGE, ZR], 0.018, 0.024),
      beam([x, y0 + RIDGE, ZR], [x, y0 + EAVE, Z1], 0.018, 0.024),
    ]);
    kit.add(frame, { stage: 'S', order: (i / BAYS) * 0.75, mode: 'drop', drop: 0.32 });
  }
  const purlins = [];
  for (const f of [0.15, 0.4, 0.65, 0.9]) {
    for (const [za, ya] of [[Z0, EAVE], [Z1, EAVE]]) {
      const z = za + (ZR - za) * f;
      const y = y0 + ya + (RIDGE - ya) * f + 0.016;
      purlins.push(box(BAYS * BAY, 0.007, 0.007, X0 + (BAYS * BAY) / 2, y, z));
    }
  }
  kit.add(combine(purlins), { stage: 'S', order: 1, mode: 'drop', drop: 0.2, edges: false });

  const CLAD = 7;
  for (let i = 0; i < BAYS; i++) {
    const xm = X0 + (i + 0.5) * BAY;
    const order = i / BAYS;
    kit.add(box(BAY, EAVE, 0.006, xm, y0, Z0 - 0.018), { stage: 'E', order: order * 0.5 });
    if (i >= CLAD) continue;
    kit.add(beam([xm, y0 + EAVE + 0.026, Z0 - 0.03], [xm, y0 + RIDGE + 0.026, ZR], BAY, 0.006), { stage: 'E', order: 0.2 + order * 0.5, mode: 'drop' });
    kit.add(beam([xm, y0 + RIDGE + 0.026, ZR], [xm, y0 + EAVE + 0.026, Z1 + 0.03], BAY, 0.006), { mat: i % 2 ? 'glass' : 'card', stage: 'E', order: 0.25 + order * 0.5, mode: 'drop' });
    if (i < CLAD - 1) kit.add(box(BAY, EAVE, 0.006, xm, y0, Z1 + 0.018), { stage: 'E', order: 0.1 + order * 0.5 });
    if (i >= 2 && i <= 4) kit.add(box(0.11, 0.13, 0.004, xm, y0, Z1 + 0.023), { mat: 'dark', stage: 'E', order: 0.6, mode: 'pop', edges: false });
  }
  const gable = prismX([[Z0, 0], [Z1, 0], [Z1, EAVE], [ZR, RIDGE], [Z0, EAVE]], 0.006);
  gable.translate(X0 - 0.016, y0, 0);
  kit.add(gable, { stage: 'E', order: 0.0 });
  kit.add(box(0.66, 0.008, 0.15, X0 + 0.7, y0 + 0.17, Z1 + 0.09), { stage: 'E', order: 0.7, mode: 'drop' });

  const ox = -0.875;
  const oz = 0.39;
  [0.105, 0.21].forEach((h, f) => {
    kit.add(box(0.55, 0.012, 0.35, ox, Y + h, oz), { stage: 'S', order: 0.5 + f * 0.15, mode: 'drop' });
    kit.add(box(0.52, 0.093, 0.32, ox, Y + h - 0.093, oz), { mat: 'glass', stage: 'E', order: 0.3 + f * 0.1 });
  });
  kit.add(box(0.12, 0.23, 0.12, ox - 0.2, Y, oz - 0.08), { stage: 'S', order: 0.45 });
  const fins = [];
  for (let i = 0; i <= 14; i++) fins.push(box(0.005, 0.2, 0.025, ox - 0.27 + i * (0.54 / 14), Y + 0.016, oz + 0.185));
  kit.add(combine(fins), { stage: 'E', order: 0.55, mode: 'drop', drop: 0.2, edges: false });
  kit.add(box(0.6, 0.012, 0.4, ox, Y + 0.222, oz), { stage: 'E', order: 0.65, mode: 'drop' });

  [0.95, 1.2, 1.45].forEach((x, i) => {
    kit.add(cyl(0.1, 0.46, x, Y, -0.62, 28), { stage: 'S', order: 0.55 + i * 0.12, edgeAngle: 20 });
    kit.add(cyl(0.102, 0.08, x, Y + 0.46, -0.62, 28, 0.014), { stage: 'E', order: 0.4 + i * 0.08, mode: 'drop', edgeAngle: 20 });
  });
  kit.add(beam([1.2, Y + 0.56, -0.62], [0.65, Y + RIDGE + 0.06, ZR], 0.03, 0.03), { stage: 'E', order: 0.8, mode: 'drop' });
  kit.add(box(0.02, 0.36, 0.02, 0.88, Y, -0.5), { stage: 'E', order: 0.78, edges: false });

  kit.add(cyl(0.13, 0.15, 1.3, Y, 0.28, 32), { stage: 'S', order: 0.8, edgeAngle: 20 });
  kit.add(cyl(0.133, 0.025, 1.3, Y + 0.15, 0.28, 32, 0.02), { stage: 'E', order: 0.85, mode: 'drop', edgeAngle: 20 });
  kit.add(box(0.15, 0.08, 0.1, 1.0, Y, 0.3), { stage: 'S', order: 0.9 });

  for (let i = 0; i < 3; i++) {
    const x = 0.9 + i * 0.27;
    const truck = combine([box(0.06, 0.05, 0.055, x, Y, 0.97), box(0.06, 0.065, 0.2, x, Y, 0.82)]);
    kit.add(truck, { stage: 'L', order: 0.5 + i * 0.12, mode: 'drop', drop: 0.15 });
  }
  const bays = [];
  for (let i = 0; i <= 10; i++) {
    const x = -1.5 + i * 0.07;
    bays.push(x, Y + 0.001, 0.75, x, Y + 0.001, 0.92);
  }
  kit.addLines(bays, { stage: 'L', order: 0.1 });
  let n = 0;
  for (let x = -1.65; x <= 1.66; x += 0.165) tree(kit, x, 1.15, { order: (n++ % 18) / 18 });
  for (let z = -1.1; z <= 0.9; z += 0.2) tree(kit, -1.7, z, { s: 0.9, order: (n++ % 10) / 12 });
  for (const [x, z] of [[0.15, 0.45], [0.35, 0.5], [-0.25, 0.48]]) tree(kit, x, z, { s: 1.1, order: rand() });
  people(kit, [[-0.6, 0.62], [-0.55, 0.65], [0.7, 0.4], [0.2, 0.25]], { y: Y, h: 0.03 });
  return { height: 0.62 };
}

/* ---------- Matrouh University ---------- */

const UNI_FLOOR = 0.085;

function octagonRing(rOut, rIn, h, y, cx, cz) {
  const rot = Math.PI / 8;
  const shape = planShape(polygonPoints(8, rOut, cx, cz, rot));
  shape.holes.push(planPath(polygonPoints(8, rIn, cx, cz, rot).reverse()));
  return extrudePlan(shape, h, y);
}

function facultyBlock(kit, { cx, cz, w, d, floors, order, Y }) {
  kit.add(box(w + 0.04, 0.012, d + 0.04, cx, Y, cz), { stage: 'F', order: 0.3 + order * 0.6 });
  const y0 = Y + 0.012;
  const long = w >= d;
  const coreOffset = (long ? w : d) * 0.3;
  for (const s of [-1, 1]) {
    kit.add(box(long ? 0.06 : d * 0.5, floors * UNI_FLOOR, long ? d * 0.5 : 0.06, cx + (long ? s * coreOffset : 0), y0, cz + (long ? 0 : s * coreOffset)), { stage: 'S', order: order * 0.3, edges: true });
  }
  for (let f = 0; f < floors; f++) {
    kit.add(box(w, 0.012, d, cx, y0 + (f + 1) * UNI_FLOOR - 0.012, cz), { stage: 'S', order: 0.25 + order * 0.3 + (f / floors) * 0.4, mode: 'drop', drop: 0.25 });
    kit.add(box(w - 0.024, UNI_FLOOR - 0.012, d - 0.024, cx, y0 + f * UNI_FLOOR, cz), { mat: 'glass', stage: 'E', order: order * 0.3 + (f / floors) * 0.3, edges: true });
  }
  const fins = [];
  const span = long ? w : d;
  const count = Math.round(span / 0.045);
  for (let i = 0; i <= count; i++) {
    const t = -span / 2 + (i * span) / count;
    for (const s of [-1, 1]) {
      if (long) fins.push(box(0.005, floors * UNI_FLOOR, 0.022, cx + t, y0, cz + s * (d / 2 + 0.008)));
      else fins.push(box(0.022, floors * UNI_FLOOR, 0.005, cx + s * (w / 2 + 0.008), y0, cz + t));
    }
  }
  kit.add(combine(fins), { stage: 'E', order: 0.55 + order * 0.3, mode: 'drop', drop: 0.25, edges: false });
  kit.add(box(w * 0.3, 0.03, d * 0.4, cx, y0 + floors * UNI_FLOOR, cz), { stage: 'E', order: 0.85 + order * 0.1, mode: 'pop' });
}

export function buildUniversity(kit, rand) {
  const Y = 0.008;
  const lawns = [[-0.95, -0.42, 1.1, 0.5], [0.95, -0.42, 1.1, 0.5], [-0.75, 0.5, 0.9, 0.42], [0.75, 0.5, 0.9, 0.42]];
  lawns.forEach(([x, z, w, d], i) => kit.add(box(w, Y, d, x, 0, z), { mat: 'pitch', stage: 'F', order: i * 0.08, edges: false }));
  kit.add(box(0.3, 0.004, 1.2, 0, 0, 0.82), { mat: 'grey', stage: 'F', order: 0.2, edges: false });
  kit.add(box(3.0, 0.004, 0.16, 0, 0, 0.0), { mat: 'grey', stage: 'F', order: 0.22, edges: false });

  const cx = 0;
  const cz = -0.12;
  const R = 0.37;
  const RI = 0.16;
  kit.add(octagonRing(R + 0.03, RI - 0.02, 0.014, 0, cx, cz), { stage: 'F', order: 0.35, edgeAngle: 20 });
  const y0 = 0.014;
  for (let f = 0; f < 3; f++) {
    const fy = y0 + f * UNI_FLOOR;
    const cols = [];
    for (const [px, pz] of polygonPoints(8, R - 0.02, cx, cz, Math.PI / 8)) cols.push(box(0.018, UNI_FLOOR, 0.018, px, fy, pz));
    for (const [px, pz] of polygonPoints(8, RI + 0.02, cx, cz, Math.PI / 8)) cols.push(box(0.014, UNI_FLOOR, 0.014, px, fy, pz));
    kit.add(combine(cols), { stage: 'S', order: f * 0.3, edges: false });
    kit.add(octagonRing(R, RI, 0.012, fy + UNI_FLOOR - 0.012, cx, cz), { stage: 'S', order: f * 0.3 + 0.15, mode: 'drop', drop: 0.28, edgeAngle: 20 });
    kit.add(octagonRing(R - 0.018, RI + 0.012, UNI_FLOOR - 0.012, fy, cx, cz), { mat: 'glass', stage: 'E', order: f * 0.15, edgeAngle: 20 });
  }
  const fins = [];
  const corners = polygonPoints(8, R + 0.004, cx, cz, Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 8];
    for (let k = 0; k < 6; k++) {
      const t = (k + 0.5) / 6;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      fins.push(box(0.005, 3 * UNI_FLOOR, 0.02, px, y0, pz, Math.atan2(px - cx, pz - cz)));
    }
  }
  kit.add(combine(fins), { stage: 'E', order: 0.55, mode: 'drop', drop: 0.25, edges: false });
  kit.add(octagonRing(R + 0.012, R - 0.02, 0.022, y0 + 3 * UNI_FLOOR, cx, cz), { stage: 'E', order: 0.75, mode: 'drop', edgeAngle: 20 });
  kit.add(cyl(0.065, 0.07, cx, y0, cz, 8), { stage: 'E', order: 0.8 });
  kit.add(cyl(0.08, 0.025, cx, y0 + 0.07, cz, 8, 0.01), { stage: 'E', order: 0.9, mode: 'drop' });

  const blocks = [
    { cx: -1.1, cz: -0.98, w: 0.9, d: 0.24, floors: 4 },
    { cx: 1.1, cz: -0.98, w: 0.9, d: 0.24, floors: 4 },
    { cx: -1.5, cz: 0.12, w: 0.24, d: 0.86, floors: 3 },
    { cx: 1.5, cz: 0.12, w: 0.24, d: 0.86, floors: 3 },
    { cx: -0.95, cz: 1.0, w: 0.78, d: 0.22, floors: 3 },
  ];
  blocks.forEach((b, i) => facultyBlock(kit, { ...b, order: i / blocks.length, Y: 0 }));

  const wx = 0.95;
  const wz = 1.0;
  kit.add(box(0.8, 0.012, 0.4, wx, 0, wz), { stage: 'F', order: 0.8 });
  kit.add(box(0.76, 0.09, 0.36, wx, 0.012, wz), { stage: 'S', order: 0.7 });
  for (let t = 0; t < 4; t++) {
    const z0 = wz - 0.18 + t * 0.09;
    const tooth = prismX([[z0, 0], [z0 + 0.09, 0], [z0 + 0.09, 0.055]], 0.76);
    tooth.translate(wx, 0.102, 0);
    kit.add(tooth, { mat: t % 2 ? 'card' : 'card', stage: 'E', order: 0.3 + t * 0.1, mode: 'drop', drop: 0.25 });
  }

  for (const [x, i] of [[-0.2, 0], [0.04, 1]]) {
    kit.add(ring(0.095, 0.085, 0.05, x, 0, -1.15), { stage: 'S', order: 0.6 + i * 0.1, edgeAngle: 20 });
    kit.add(cyl(0.085, 0.003, x, 0.038, -1.15, 32), { mat: 'water', stage: 'L', order: 0.1, mode: 'pop', edges: false });
  }
  const legs = [];
  for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) legs.push(beam([0.32 + lx * 0.05, 0, -1.15 + lz * 0.05], [0.32 + lx * 0.03, 0.2, -1.15 + lz * 0.03], 0.008, 0.008));
  kit.add(combine(legs), { stage: 'S', order: 0.8, edges: false });
  kit.add(cyl(0.065, 0.07, 0.32, 0.2, -1.15, 24), { stage: 'E', order: 0.7, mode: 'drop', edgeAngle: 20 });

  let n = 0;
  for (let z = 0.3; z <= 1.36; z += 0.12) {
    tree(kit, -0.22, z, { order: (n % 10) / 12 });
    tree(kit, 0.22, z, { order: (n++ % 10) / 12 });
  }
  for (let x = -1.75; x <= 1.76; x += 0.175) {
    if (Math.abs(x) < 0.3) continue;
    tree(kit, x, 1.36, { s: 0.9, order: (n++ % 16) / 16 });
  }
  for (const [x, z] of [[-0.6, -0.5], [-0.75, -0.3], [0.6, -0.55], [0.8, -0.3], [-0.55, 0.45], [0.55, 0.45], [-1.15, -0.45], [1.15, -0.5]]) tree(kit, x, z, { s: 1.15, order: rand() });
  people(kit, [[0.05, 0.4], [-0.06, 0.55], [0.08, 0.7], [0.4, 0.02], [-0.5, 0.0], [-0.45, 0.04]], { y: 0.004, h: 0.03 });
  return { height: 0.4 };
}

/* ---------- Mosque Square promenade, Alexandria ---------- */

function minaret(kit, x, z, y, scale, order0) {
  const s = scale;
  const stack = [
    [box(0.09 * s, 0.24 * s, 0.09 * s, x, y, z), 'S', 0.55, 'grow'],
    [cyl(0.048 * s, 0.17 * s, x, y + 0.24 * s, z, 8), 'S', 0.75, 'grow'],
    [cyl(0.064 * s, 0.012 * s, x, y + 0.41 * s, z, 8), 'E', 0.12, 'drop'],
    [cyl(0.034 * s, 0.13 * s, x, y + 0.422 * s, z, 16), 'E', 0.24, 'drop'],
    [cyl(0.05 * s, 0.01 * s, x, y + 0.552 * s, z, 16), 'E', 0.36, 'drop'],
    [cyl(0.024 * s, 0.055 * s, x, y + 0.562 * s, z, 12), 'E', 0.46, 'drop'],
    [lathe(domeProfile(0.028 * s, 0.05 * s), 16, x, y + 0.617 * s, z), 'E', 0.56, 'drop'],
    [cyl(0.0028, 0.045 * s, x, y + 0.665 * s, z, 4), 'E', 0.64, 'drop'],
  ];
  stack.forEach(([g, stage, order, mode]) => kit.add(g, { stage, order: Math.min(order + order0, 1), mode, drop: 0.3, edgeAngle: 30, edges: mode !== 'drop' || order < 0.5 }));
}

function mosque(kit, { cx, cz, w, d, h, dome, corners, minaretAt, minaretScale, order0, Y }) {
  const t = 0.03;
  const walls = [
    box(w, h, t, cx, Y, cz - d / 2 + t / 2), box(w, h, t, cx, Y, cz + d / 2 - t / 2),
    box(t, h, d - 2 * t, cx - w / 2 + t / 2, Y, cz), box(t, h, d - 2 * t, cx + w / 2 - t / 2, Y, cz),
  ];
  walls.forEach((g, i) => kit.add(g, { stage: 'S', order: order0 + i * 0.06, mode: 'grow' }));
  const roofY = Y + h;
  kit.add(box(w, 0.012, d, cx, roofY - 0.012, cz), { stage: 'S', order: order0 + 0.35, mode: 'drop', drop: 0.25 });
  const cren = [];
  const step = 0.042;
  for (let x = -w / 2 + 0.02; x <= w / 2 - 0.01; x += step) {
    cren.push(box(0.016, 0.02, 0.01, cx + x, roofY, cz - d / 2 + 0.005), box(0.016, 0.02, 0.01, cx + x, roofY, cz + d / 2 - 0.005));
  }
  for (let z = -d / 2 + 0.03; z <= d / 2 - 0.02; z += step) {
    cren.push(box(0.01, 0.02, 0.016, cx - w / 2 + 0.005, roofY, cz + z), box(0.01, 0.02, 0.016, cx + w / 2 - 0.005, roofY, cz + z));
  }
  kit.add(combine(cren), { stage: 'E', order: 0.7, mode: 'pop', edges: false });
  kit.add(cyl(dome * 1.04, dome * 0.38, cx, roofY, cz, 8), { stage: 'E', order: 0.05 + order0 * 0.3, mode: 'drop' });
  kit.add(lathe(domeProfile(dome, dome * 1.2), 28, cx, roofY + dome * 0.38, cz), { stage: 'E', order: 0.2 + order0 * 0.3, mode: 'drop', drop: 0.35, edgeAngle: 40 });
  kit.add(cyl(0.003, dome * 0.4, cx, roofY + dome * 1.58, cz, 4), { stage: 'E', order: 0.45, mode: 'drop', edges: false });
  for (const [dx, dz] of corners) {
    const r = dome * 0.45;
    kit.add(cyl(r * 1.05, r * 0.5, cx + dx, roofY, cz + dz, 8), { stage: 'E', order: 0.3 + order0 * 0.2, mode: 'drop' });
    kit.add(lathe(domeProfile(r, r * 1.2), 20, cx + dx, roofY + r * 0.5, cz + dz), { stage: 'E', order: 0.4 + order0 * 0.2, mode: 'drop', edgeAngle: 40 });
  }
  minaret(kit, minaretAt[0], minaretAt[1], Y, minaretScale, order0 * 0.3);
}

export function buildMosqueSquare(kit, rand) {
  const Y = 0.014;
  kit.add(box(3.8, Y, 2.5), { mat: 'sand', stage: 'F', order: 0, edgeAngle: 40 });
  const grid = [];
  for (let x = -1.8; x <= 1.81; x += 0.2) grid.push(x, Y + 0.0005, -1.2, x, Y + 0.0005, 1.2);
  for (let z = -1.2; z <= 1.21; z += 0.2) grid.push(-1.85, Y + 0.0005, z, 1.85, Y + 0.0005, z);
  kit.addLines(grid, { stage: 'F', order: 0.4 });

  const route = [[-1.38, 0.05], [-1.0, 0.56], [1.0, 0.56], [1.42, 0.0]];
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, az] = route[i];
    const [bx, bz] = route[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const g = box(len + 0.3, 0.005, 0.3, 0, 0, 0, 0);
    g.rotateY(-Math.atan2(bz - az, bx - ax));
    g.translate((ax + bx) / 2, Y, (az + bz) / 2);
    kit.add(g, { mat: 'card', stage: 'F', order: 0.5 + i * 0.1, edges: false });
  }
  const dashed = [];
  for (let i = 0; i < route.length - 1; i++) {
    const [ax, az] = route[i];
    const [bx, bz] = route[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len; s += 0.06) {
      const t0 = s / len;
      const t1 = Math.min((s + 0.03) / len, 1);
      dashed.push(ax + (bx - ax) * t0, Y + 0.0058, az + (bz - az) * t0, ax + (bx - ax) * t1, Y + 0.0058, az + (bz - az) * t1);
    }
  }
  kit.addLines(dashed, { set: 'contour', stage: 'L', order: 0.6 });

  mosque(kit, { cx: 0.0, cz: -0.5, w: 1.0, d: 0.6, h: 0.19, dome: 0.135, corners: [[-0.36, -0.19], [0.36, -0.19], [-0.36, 0.19], [0.36, 0.19]], minaretAt: [0.46, -0.16], minaretScale: 1.12, order0: 0, Y });
  kit.add(box(0.24, 0.27, 0.07, 0, Y, -0.17), { stage: 'S', order: 0.5 });
  const portal = arcadeWall({ length: 0.24, height: 0.27, thickness: 0.02, arches: 1, archWidth: 0.12, spring: 0.13 });
  portal.translate(-0.12, Y, -0.125);
  kit.add(portal, { stage: 'E', order: 0.62, mode: 'drop', drop: 0.25, edgeAngle: 30 });

  mosque(kit, { cx: -1.36, cz: -0.36, w: 0.42, d: 0.36, h: 0.15, dome: 0.1, corners: [], minaretAt: [-1.12, -0.16], minaretScale: 0.78, order0: 0.2, Y });
  mosque(kit, { cx: 1.38, cz: -0.42, w: 0.4, d: 0.34, h: 0.14, dome: 0.095, corners: [], minaretAt: [1.15, -0.23], minaretScale: 0.74, order0: 0.3, Y });

  for (const [x0, i] of [[-1.0, 0], [0.2, 1]]) {
    const piers = [];
    for (let b = 0; b <= 7; b++) piers.push(box(0.016, 0.115, 0.016, x0 + b * (0.8 / 7), Y, 0.215));
    kit.add(combine(piers), { stage: 'S', order: 0.6 + i * 0.12, edges: false });
    const wall = arcadeWall({ length: 0.8, height: 0.125, thickness: 0.02, arches: 7, archWidth: 0.072, spring: 0.066 });
    wall.translate(x0, Y, 0.32);
    kit.add(wall, { stage: 'E', order: 0.3 + i * 0.12, mode: 'drop', drop: 0.25, edgeAngle: 30 });
    kit.add(box(0.82, 0.01, 0.135, x0 + 0.4, Y + 0.125, 0.265), { stage: 'E', order: 0.5 + i * 0.12, mode: 'drop' });
  }

  let n = 0;
  for (let x = -1.65; x <= 1.66; x += 0.3) palm(kit, x, 0.9, { y: Y, order: (n++ % 12) / 12, rand });
  for (const [x, z] of [[-0.65, -0.05], [0.65, -0.05], [-1.7, -0.7], [1.72, -0.8], [-0.8, -0.85], [0.85, -0.9]]) palm(kit, x, z, { y: Y, order: rand(), rand, h: 0.15 });
  const lamps = [];
  for (let x = -0.9; x <= 0.91; x += 0.18) lamps.push(box(0.004, 0.065, 0.004, x, Y + 0.005, 0.72), box(0.016, 0.004, 0.006, x, Y + 0.07, 0.72));
  kit.add(combine(lamps), { stage: 'L', order: 0.4, mode: 'pop', edges: false });
  const benches = [];
  for (let x = -0.81; x <= 0.82; x += 0.36) benches.push(box(0.06, 0.008, 0.018, x, Y + 0.005, 0.44));
  kit.add(combine(benches), { stage: 'L', order: 0.45, mode: 'pop', edges: false });
  const crowd = [];
  for (let i = 0; i < 18; i++) crowd.push([-1.0 + rand() * 2.0, 0.45 + rand() * 0.22]);
  people(kit, crowd, { y: Y + 0.005, h: 0.03, order: 0.7 });
  kit.add(box(3.8, 0.003, 0.18, 0, Y, 1.16), { mat: 'grey', stage: 'F', order: 0.6, edges: false });
  return { height: 0.78 };
}

/* ---------- Coral Beach Village marine works ---------- */

function coralShore(x) {
  return -0.55 + 0.06 * Math.sin(1.7 * x) + 0.04 * Math.sin(4.1 * x + 0.7);
}

function blob(cx, cz, rx, rz, seed, n = 18) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.cos(a * 5 + seed * 2);
    return [cx + Math.cos(a) * rx * k, cz + Math.sin(a) * rz * k];
  });
}

export function buildCoralBeach(kit, rand) {
  const HW = 1.98;
  const HD = 1.43;
  kit.add(box(2 * HW, 0.004, 2 * HD), { mat: 'water', stage: 'F', order: 0, edges: false });

  const shore = [];
  for (let x = HW; x >= -HW - 1e-6; x -= 0.11) shore.push([x, coralShore(x)]);
  const sand = planShape([[-HW, -HD], [HW, -HD], ...shore]);
  const lagoons = [blob(-1.1, -0.86, 0.34, 0.15, 1), blob(0.95, -0.9, 0.3, 0.16, 2)];
  for (const l of lagoons) sand.holes.push(planPath([...l].reverse()));
  kit.add(extrudePlan(sand, 0.022, 0), { mat: 'sand', stage: 'F', order: 0.15, edgeAngle: 40 });
  kit.add(extrudePlan(planShape([[-HW, -HD], [HW, -HD], [HW, -1.12], [-HW, -1.12]]), 0.026, 0.022), { stage: 'F', order: 0.3, edgeAngle: 40 });
  for (let i = 0; i < 14; i++) {
    const x = -1.8 + i * 0.27;
    if (Math.abs(x + 0.3) < 0.15) continue;
    kit.add(combine([box(0.12, 0.045, 0.08, x, 0.048, -1.24), box(0.135, 0.006, 0.095, x, 0.093, -1.24)]), { stage: 'E', order: 0.4 + (i / 14) * 0.5, mode: 'drop', drop: 0.2 });
    kit.add(box(0.09, 0.04, 0.07, x + 0.1, 0.048, -1.36), { stage: 'E', order: 0.45 + (i / 14) * 0.5, mode: 'drop', drop: 0.2 });
  }

  const CH0 = -0.4;
  const CH1 = -0.14;
  const REEF_OUT = 0.74;
  const reefEdge = (x) => REEF_OUT + 0.06 * Math.sin(x * 2.3) + 0.04 * Math.sin(x * 6.1);
  addCoralHeads(kit, rand, { CH0, CH1, reefEdge });

  let chunk = 0;
  for (let z = coralShore(-0.27) + 0.1; z < REEF_OUT + 0.02; z += 0.062) {
    for (let x = CH0 + 0.035; x < CH1 - 0.02; x += 0.065) {
      const g = new THREE.DodecahedronGeometry(0.036 + rand() * 0.01, 0);
      g.scale(1, 0.32, 1);
      g.rotateY(rand() * TAU);
      g.translate(x + (rand() - 0.5) * 0.02, 0.004, z);
      const t = (z - coralShore(-0.27)) / (REEF_OUT - coralShore(-0.27));
      kit.add(g, { mat: 'reef', stage: 'S', order: t * 0.55, mode: 'remove', drop: 0.32, dur: 0.06, edges: false, flat: true });
      chunk++;
    }
  }
  kit.reefChunks = chunk;

  addBreakwaters(kit, rand);
  addPier(kit, coralShore(-0.53));
  addWalkway(kit);

  const barrier = [];
  const ropes = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const x = -1.75 + t * 1.05;
    const z = coralShore(x) + 0.05 + Math.sin(t * Math.PI) * 0.45;
    barrier.push(cyl(0.005, 0.03, x, 0, z, 5));
    ropes.push([x, 0.026, z]);
  }
  kit.add(combine(barrier), { mat: 'wood', stage: 'S', order: 0.75, edges: false });
  kit.addLines(polyline(ropes), { stage: 'E', order: 0.9 });

  const contours = [];
  for (let k = 0; k < 4; k++) {
    const pts = [];
    for (let x = -HW + 0.05; x <= HW - 0.05; x += 0.1) pts.push([x, 0.0045, REEF_OUT + 0.14 + k * 0.13 + 0.025 * Math.sin(x * 2.6 + k)]);
    contours.push(...polyline(pts.filter((p) => p[2] < HD - 0.03)));
  }
  kit.addLines(contours, { set: 'contour', stage: 'F', order: 0.3 });

  let n = 0;
  for (let x = -1.85; x <= 1.8; x += 0.2) {
    if (x > -0.62 && x < 0.0) continue;
    const z = coralShore(x) - 0.12 - rand() * 0.06;
    if (lagoons.some((l) => Math.abs(z + 0.88) < 0.2 && Math.abs(x - (l[0][0] - 0.33)) < 0.36)) continue;
    const umbrella = combine([cyl(0.0025, 0.038, x, 0.022, z, 4), cyl(0.034, 0.016, x, 0.056, z, 9, 0.001)]);
    kit.add(umbrella, { mat: 'wood', stage: 'L', order: (n++ % 14) / 14, mode: 'pop', edges: false });
  }
  for (const [x, z] of [[-1.5, -0.98], [-0.7, -0.95], [0.55, -1.0], [1.35, -0.98], [-1.85, -0.85], [1.82, -0.75], [-0.22, -0.95], [0.2, -1.02]]) palm(kit, x, z, { y: 0.022, order: rand(), rand, h: 0.12 });
  people(kit, [[-1.2, -0.66], [-1.05, -0.62], [0.82, -0.68], [-0.5, coralShore(-0.5) + 0.3]], { y: 0.022, h: 0.026 });
  return { height: 0.2 };
}

function addCoralHeads(kit, rand, { CH0, CH1, reefEdge }) {
  const heads = [];
  for (let tries = 0; tries < 2600 && heads.length < 760; tries++) {
    const x = -1.92 + rand() * 3.84;
    const inner = coralShore(x) + (x < CH0 ? 0.58 : 0.3);
    const z = inner + rand() * (reefEdge(x) - inner);
    if (z < inner || z > 1.38) continue;
    if (x > CH0 - 0.03 && x < CH1 + 0.03) continue;
    if (x > CH1 && x < 0.9 && z < 0.95) continue;
    if (x > 1.1 && x < 1.62 && z < 0.56) continue;
    heads.push([x, z, 0.008 + rand() * 0.018]);
  }
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const matrices = new Float32Array(heads.length * 16);
  const anims = new Float32Array(heads.length * 4);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  heads.forEach(([x, z, s], i) => {
    e.set(0, rand() * TAU, 0);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, 0.002, z), q, new THREE.Vector3(s, s * 0.35, s));
    m.toArray(matrices, i * 16);
    anims.set(instanceAnim('F', 0.3 + rand() * 0.6, 'pop', 0, 0.08), i * 4);
  });
  kit.addInstanced(geo, matrices, anims, { mat: 'reef' });
  const edge = [];
  for (const [xa, xb] of [[-1.94, CH0 - 0.02], [0.92, 1.94]]) {
    const pts = [];
    for (let x = xa; x <= xb + 1e-6; x += 0.06) pts.push([x, 0.0046, reefEdge(x) + 0.04]);
    edge.push(...polyline(pts));
  }
  kit.addLines(edge, { set: 'contour', stage: 'F', order: 0.5 });
}

function addBreakwaters(kit, rand) {
  const lines = [
    [[-0.08, coralShore(-0.08) - 0.02], [-0.06, 0.2], [-0.02, 0.62], [0.06, 0.8]],
    [[0.78, coralShore(0.78) - 0.02], [0.72, 0.1], [0.56, 0.36], [0.22, 0.5]],
  ];
  const rocks = [];
  lines.forEach((pts, li) => {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      segs.push(len);
      total += len;
    }
    const core = [];
    let acc = 0;
    pts.slice(0, -1).forEach(([ax, az], i) => {
      const [bx, bz] = pts[i + 1];
      const g = box(segs[i] + 0.04, 0.012, 0.05);
      g.rotateY(-Math.atan2(bz - az, bx - ax));
      g.translate((ax + bx) / 2, 0, (az + bz) / 2);
      core.push(g);
      const count = Math.round(segs[i] / 0.016);
      for (let k = 0; k < count; k++) {
        const t = k / count;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        const nx = -(bz - az) / segs[i];
        const nz = (bx - ax) / segs[i];
        for (const side of [-1, 0, 1]) {
          const off = side * 0.03 + (rand() - 0.5) * 0.012;
          const s = 0.017 + rand() * 0.012 - Math.abs(side) * 0.003;
          rocks.push({ x: x + nx * off, z: z + nz * off, y: side === 0 ? 0.012 : 0.004, s, order: (acc + segs[i] * t) / total, li });
        }
      }
      acc += segs[i];
    });
    kit.add(combine(core), { mat: 'grey', stage: 'S', order: 0.2 + li * 0.2, mode: 'grow', edges: false });
  });
  const geo = new THREE.DodecahedronGeometry(1, 0);
  geo.computeVertexNormals();
  const matrices = new Float32Array(rocks.length * 16);
  const anims = new Float32Array(rocks.length * 4);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  rocks.forEach((r, i) => {
    e.set(rand() * TAU, rand() * TAU, rand() * TAU);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(r.x, r.y + r.s * 0.4, r.z), q, new THREE.Vector3(r.s, r.s * 0.7, r.s));
    m.toArray(matrices, i * 16);
    anims.set(instanceAnim('S', 0.3 + r.order * 0.55 + r.li * 0.05, 'drop', 0.16, 0.08), i * 4);
  });
  kit.addInstanced(geo, matrices, anims, { mat: 'rock', castShadow: true });
}

function addPier(kit, z0) {
  const x = -0.53;
  const L = 0.62;
  const W = 0.07;
  const deckY = 0.034;
  const piles = [];
  for (let s = 0.04; s <= L; s += 0.062) {
    for (const side of [-1, 1]) piles.push(cyl(0.007, deckY, x + side * 0.026, 0, z0 + s, 6));
  }
  kit.add(combine(piles), { stage: 'S', order: 0.55, edges: false });
  const SEG = 5;
  for (let i = 0; i < SEG; i++) {
    const len = L / SEG;
    kit.add(box(W, 0.01, len, x, deckY, z0 + len * (i + 0.5)), { stage: 'E', order: i / SEG * 0.5, mode: 'drop', drop: 0.22 });
  }
  kit.add(box(0.18, 0.012, 0.1, x, deckY, z0 + L + 0.04), { stage: 'E', order: 0.6, mode: 'drop' });
  kit.add(combine([box(0.07, 0.04, 0.05, x, deckY + 0.012, z0 + L + 0.04), box(0.09, 0.006, 0.07, x, deckY + 0.052, z0 + L + 0.04)]), { stage: 'E', order: 0.75, mode: 'drop' });
}

function addWalkway(kit) {
  const pts = [[1.28, coralShore(1.28) - 0.04], [1.38, -0.18], [1.22, 0.08], [1.44, 0.36]];
  const posts = [];
  const deckY = 0.03;
  pts.slice(0, -1).forEach(([ax, az], i) => {
    const [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const angle = -Math.atan2(bz - az, bx - ax);
    for (let s = 0; s <= len; s += 0.07) {
      const t = s / len;
      posts.push(cyl(0.004, deckY, ax + (bx - ax) * t, 0, az + (bz - az) * t, 5));
    }
    const deck = box(len + 0.04, 0.006, 0.045);
    deck.rotateY(angle);
    deck.translate((ax + bx) / 2, deckY, (az + bz) / 2);
    kit.add(deck, { mat: 'wood', stage: 'E', order: 0.3 + i * 0.12, mode: 'drop', drop: 0.2 });
  });
  kit.add(combine(posts), { mat: 'wood', stage: 'S', order: 0.65, edges: false });
  const [ex, ez] = pts[pts.length - 1];
  kit.add(combine([cyl(0.005, deckY, ex - 0.1, 0, ez + 0.05, 5), cyl(0.005, deckY, ex + 0.1, 0, ez + 0.05, 5), cyl(0.005, deckY, ex, 0, ez + 0.14, 5)]), { mat: 'wood', stage: 'S', order: 0.85, edges: false });
  kit.add(box(0.3, 0.008, 0.2, ex, deckY, ez + 0.08), { mat: 'wood', stage: 'E', order: 0.7, mode: 'drop' });
  for (let i = 0; i < 3; i++) {
    const x = ex - 0.09 + i * 0.09;
    kit.add(combine([cyl(0.0025, 0.035, x, deckY + 0.008, ez + 0.1, 4), cyl(0.03, 0.014, x, deckY + 0.04, ez + 0.1, 9, 0.001)]), { mat: 'wood', stage: 'L', order: 0.5 + i * 0.1, mode: 'pop', edges: false });
  }
}
