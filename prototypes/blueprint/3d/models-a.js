// Maquettes: Matrouh Stadium and City Club (from prototypes/maquette, desalination plant removed).
import * as THREE from 'three';
import { instanceAnim } from './kit.js';
import {
  box, cyl, combine, extrudePlan, polyline, stadiumPoint, stadiumPerimeter, stadiumShape,
} from './geo.js';
import { tree, people, floodlight, pitchMarkings, courtLines } from './parts.js';

/* ---------- Stadium ---------- */

const MATROUH_SEATS = 26800;

/** Point on a stadium curve by section parameter u in [0, 4): straight, arc, straight, arc. */
function sectionPoint(a, r, u) {
  const q = ((u % 4) + 4) % 4;
  const i = Math.floor(q);
  const f = q - i;
  if (i === 0) return [-a + 2 * a * f, r, 0, 1];
  if (i === 2) return [a - 2 * a * f, -r, 0, -1];
  const phi = i === 1 ? Math.PI / 2 - f * Math.PI : -Math.PI / 2 - f * Math.PI;
  const cx = i === 1 ? a : -a;
  return [cx + r * Math.cos(phi), r * Math.sin(phi), Math.cos(phi), Math.sin(phi)];
}

function pushQuad(pos, nor, corners, normals) {
  const [a, b, c] = corners;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const n = normals[0];
  const flip = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0;
  const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
  for (const i of order) {
    pos.push(...corners[i]);
    nor.push(...normals[i]);
  }
}

function terraceGeometry({ a, r0, rowDepth, rows, rowY, baseY, topY, u0, u1, samples }) {
  const pos = [];
  const nor = [];
  const up = [0, 1, 0];
  const r1 = r0 + rows * rowDepth;
  for (let s = 0; s < samples; s++) {
    const ua = u0 + ((u1 - u0) * s) / samples;
    const ub = u0 + ((u1 - u0) * (s + 1)) / samples;
    for (let k = 0; k < rows; k++) {
      const ri = r0 + k * rowDepth;
      const ro = ri + rowDepth;
      const y = rowY(k);
      const yPrev = k === 0 ? baseY : rowY(k - 1);
      const ai = sectionPoint(a, ri, ua);
      const bi = sectionPoint(a, ri, ub);
      const ao = sectionPoint(a, ro, ua);
      const bo = sectionPoint(a, ro, ub);
      pushQuad(pos, nor, [[ai[0], y, ai[1]], [bi[0], y, bi[1]], [bo[0], y, bo[1]], [ao[0], y, ao[1]]], [up, up, up, up]);
      const na = [-ai[2], 0, -ai[3]];
      const nb = [-bi[2], 0, -bi[3]];
      pushQuad(pos, nor, [[ai[0], yPrev, ai[1]], [bi[0], yPrev, bi[1]], [bi[0], y, bi[1]], [ai[0], y, ai[1]]], [na, nb, nb, na]);
    }
    const lastY = rowY(rows - 1);
    const pa = sectionPoint(a, r1, ua);
    const pb = sectionPoint(a, r1, ub);
    const pia = sectionPoint(a, r1 - 0.01, ua);
    const pib = sectionPoint(a, r1 - 0.01, ub);
    const oa = [pa[2], 0, pa[3]];
    const ob = [pb[2], 0, pb[3]];
    pushQuad(pos, nor, [[pa[0], baseY, pa[1]], [pb[0], baseY, pb[1]], [pb[0], topY, pb[1]], [pa[0], topY, pa[1]]], [oa, ob, ob, oa]);
    const ia = [-pa[2], 0, -pa[3]];
    const ib = [-pb[2], 0, -pb[3]];
    pushQuad(pos, nor, [[pia[0], lastY, pia[1]], [pib[0], lastY, pib[1]], [pib[0], topY, pib[1]], [pia[0], topY, pia[1]]], [ia, ib, ib, ia]);
    pushQuad(pos, nor, [[pia[0], topY, pia[1]], [pib[0], topY, pib[1]], [pb[0], topY, pb[1]], [pa[0], topY, pa[1]]], [up, up, up, up]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

function sectionLine(a, r, y, u0, u1, samples) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const p = sectionPoint(a, r, u0 + ((u1 - u0) * i) / samples);
    pts.push([p[0], y, p[1]]);
  }
  return polyline(pts);
}

function seatGeometry() {
  const g = new THREE.BoxGeometry(0.0066, 0.0028, 0.0058);
  g.translate(0, 0.0014, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) < 0 && p.getY(i) > 0.001) p.setY(i, p.getY(i) + 0.0042);
  }
  g.computeVertexNormals();
  return g;
}

export function buildStadium(kit) {
  const A = 0.5;
  const R_TRACK_IN = 0.36;
  const R_TRACK_OUT = 0.465;
  const R0 = 0.52;
  const ROW_DEPTH = 0.013;
  const SEAT_PITCH = 0.0092;
  const RISE = 0.0082;
  const PODIUM_H = 0.035;
  const FIRST_ROW_Y = PODIUM_H + 0.012;
  const AISLE = 26;

  const rows = [];
  let total = 0;
  while (total < MATROUH_SEATS) {
    const r = R0 + (rows.length + 0.5) * ROW_DEPTH;
    const perimeter = stadiumPerimeter(A, r);
    const slots = Math.floor(perimeter / SEAT_PITCH);
    const seats = slots - Math.floor(slots / AISLE);
    rows.push({ r, perimeter, slots, seats });
    total += seats;
  }
  const ROWS = rows.length;
  const R1 = R0 + ROWS * ROW_DEPTH;
  const rowY = (k) => FIRST_ROW_Y + k * RISE;
  const TOP_Y = rowY(ROWS - 1) + 0.022;
  const R_PODIUM = R1 + 0.13;

  kit.add(extrudePlan(stadiumShape(A, R_PODIUM), PODIUM_H, 0, 40), { stage: 'F', order: 0, edgeAngle: 20 });
  kit.add(extrudePlan(stadiumShape(A, R_TRACK_IN), 0.004, PODIUM_H, 40), { mat: 'pitch', stage: 'F', order: 0.55, edgeAngle: 20 });
  kit.add(extrudePlan(stadiumShape(A, R_TRACK_OUT, R_TRACK_IN), 0.005, PODIUM_H, 40), { mat: 'grey', stage: 'F', order: 0.7, edgeAngle: 20 });
  const laneLines = [];
  for (let l = 1; l < 4; l++) {
    const r = R_TRACK_IN + ((R_TRACK_OUT - R_TRACK_IN) * l) / 4;
    for (let part = 0; part < 4; part++) laneLines.push(...sectionLine(A, r, PODIUM_H + 0.0055, part, part + 1, part % 2 ? 24 : 1));
  }
  kit.addLines(laneLines, { stage: 'L', order: 0.1 });
  kit.add(pitchMarkings(1.0, 0.64, 0, 0, PODIUM_H + 0.004), { stage: 'L', order: 0.05, mode: 'pop', edges: false });

  const pieces = [];
  for (let part = 0; part < 4; part++) {
    const isArc = part % 2 === 1;
    const n = isArc ? 5 : 3;
    for (let j = 0; j < n; j++) pieces.push([part + j / n, part + (j + 1) / n, isArc ? 5 : 1]);
  }
  pieces.forEach(([u0, u1, samples], i) => {
    const order = i / pieces.length;
    const geo = terraceGeometry({ a: A, r0: R0, rowDepth: ROW_DEPTH, rows: ROWS, rowY, baseY: PODIUM_H, topY: TOP_Y, u0, u1, samples });
    kit.add(geo, { stage: 'S', order, mode: 'grow', edges: false });
    const lines = [...sectionLine(A, R1, TOP_Y, u0, u1, samples), ...sectionLine(A, R0, FIRST_ROW_Y, u0, u1, samples)];
    for (let k = 6; k < ROWS; k += 6) lines.push(...sectionLine(A, R0 + k * ROW_DEPTH, rowY(k), u0, u1, samples));
    kit.addLines(lines, { stage: 'S', order });
  });

  addSeats(kit, { A, R0, ROW_DEPTH, rows, rowY, AISLE });
  addStadiumFacade(kit, { A, R1, PODIUM_H, TOP_Y });
  addStadiumCanopy(kit, { R0, R1, PODIUM_H, TOP_Y });

  const screen = combine([
    box(0.012, 0.11, 0.36, A + R1 - 0.03, TOP_Y + 0.03, 0),
    box(0.008, 0.035, 0.008, A + R1 - 0.025, TOP_Y - 0.005, -0.12),
    box(0.008, 0.035, 0.008, A + R1 - 0.025, TOP_Y - 0.005, 0.12),
  ]);
  kit.add(screen, { stage: 'E', order: 0.75, mode: 'drop', drop: 0.3 });
  kit.add(box(0.004, 0.096, 0.344, A + R1 - 0.0375, TOP_Y + 0.037, 0), { mat: 'dark', stage: 'E', order: 0.85, mode: 'pop', edges: false });

  const k = (R1 + 0.075) * 0.71;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    floodlight(kit, sx * (A + k), sz * k, { h: TOP_Y + 0.36, y: PODIUM_H, target: [0, 0], order: 0.85 });
  }

  const gateZ = R1 + 0.085;
  const gateSpots = [[0, gateZ, 0], [0, -gateZ, 0], [A + gateZ, 0, Math.PI / 2], [-A - gateZ, 0, Math.PI / 2]];
  gateSpots.forEach(([gx, gz, rot], i) => {
    const parts = [box(0.2, 0.006, 0.05, 0, 0.055, 0), box(0.008, 0.055, 0.008, -0.09, 0, 0), box(0.008, 0.055, 0.008, 0.09, 0, 0)];
    for (let t = 0; t < 5; t++) parts.push(box(0.006, 0.018, 0.022, -0.05 + t * 0.025, 0, 0));
    const g = combine(parts);
    g.rotateY(rot);
    g.translate(gx, PODIUM_H, gz);
    kit.add(g, { stage: 'E', order: 0.55 + i * 0.08, mode: 'drop', drop: 0.18 });
  });

  kit.add(box(0.26, 0.003, 1.45 - R_PODIUM + 0.02, 0, 0, (1.45 + R_PODIUM) / 2), { mat: 'grey', stage: 'F', order: 0.9, edges: false });
  let t = 0;
  for (let x = -1.75; x <= 1.76; x += 0.175) {
    if (Math.abs(x) < 0.2) continue;
    tree(kit, x, 1.3, { s: 0.95, order: (t++ % 20) / 20 });
  }
  for (let z = -1.15; z <= 1.0; z += 0.19) {
    tree(kit, -1.8, z, { s: 0.9, order: 0.2 + (t % 10) / 14 });
    tree(kit, 1.8, z, { s: 0.9, order: 0.25 + (t++ % 10) / 14 });
  }
  return { height: TOP_Y + 0.38, rows: ROWS };
}

function addSeats(kit, { A, R0, ROW_DEPTH, rows, rowY, AISLE }) {
  const geo = seatGeometry();
  const matrices = new Float32Array(MATROUH_SEATS * 16);
  const anims = new Float32Array(MATROUH_SEATS * 4);
  const m = new THREE.Matrix4();
  let placed = 0;
  rows.forEach((row, k) => {
    const isLast = k === rows.length - 1;
    const want = isLast ? MATROUH_SEATS - placed : row.seats;
    let seatIndex = 0;
    const step = row.perimeter / row.slots;
    for (let j = 0; j < row.slots && placed < MATROUH_SEATS; j++) {
      if (j % AISLE === AISLE - 1) continue;
      const keep = Math.floor(((seatIndex + 1) * want) / row.seats) > Math.floor((seatIndex * want) / row.seats);
      seatIndex++;
      if (!keep) continue;
      const s = (j + 0.5) * step;
      const [x, z, nx, nz] = stadiumPoint(A, R0 + (k + 0.5) * ROW_DEPTH, s);
      m.makeRotationY(Math.atan2(-nx, -nz));
      m.setPosition(x, rowY(k), z);
      m.toArray(matrices, placed * 16);
      const order = 0.78 * (s / row.perimeter) + 0.22 * (k / rows.length);
      anims.set(instanceAnim('E', order, 'pop', 0, 0.045), placed * 4);
      placed++;
    }
  });
  kit.addInstanced(geo, matrices, anims, { mat: 'seat' });
  kit.seatCount = placed;
}

function addStadiumFacade(kit, { A, R1, PODIUM_H, TOP_Y }) {
  const rFin = R1 + 0.018;
  const perimeter = stadiumPerimeter(A, rFin);
  const count = 168;
  const groups = 14;
  const finH = TOP_Y + 0.045 - PODIUM_H;
  for (let gi = 0; gi < groups; gi++) {
    const fins = [];
    for (let i = gi; i < count; i += groups) {
      const [x, z, nx, nz] = stadiumPoint(A, rFin, (i / count) * perimeter);
      fins.push(box(0.0055, finH, 0.03, x, PODIUM_H, z, Math.atan2(nx, nz)));
    }
    kit.add(combine(fins), { stage: 'E', order: gi / groups * 0.6, mode: 'grow', edges: false });
  }
  kit.add(extrudePlan(stadiumShape(A, R1 + 0.042, R1 - 0.004), 0.012, TOP_Y + 0.045, 48), { stage: 'E', order: 0.72, mode: 'drop', drop: 0.3, edgeAngle: 20 });
}

function addStadiumCanopy(kit, { R0, R1, PODIUM_H, TOP_Y }) {
  const front = -(R0 + 0.15);
  const back = -(R1 + 0.03);
  const y = TOP_Y + 0.11;
  kit.add(box(1.3, 0.007, Math.abs(back - front), 0, y, (front + back) / 2), { stage: 'E', order: 0.95, mode: 'drop', drop: 0.35 });
  const mastZ = -(R1 + 0.075);
  const mastTop = y + 0.16;
  const cables = [];
  for (let i = 0; i < 6; i++) {
    const x = -0.6 + i * 0.24;
    kit.add(cyl(0.0055, mastTop - PODIUM_H, x, PODIUM_H, mastZ, 6, 0.004), { stage: 'S', order: 0.75 + i * 0.04, mode: 'grow', edges: false });
    cables.push(x, mastTop, mastZ, x, y, front + 0.01, x, mastTop, mastZ, x, y, (front + back) / 2, x, mastTop, mastZ, x, PODIUM_H, mastZ - 0.06);
  }
  kit.addLines(cables, { stage: 'E', order: 1 });
}

/* ---------- City Club ---------- */

export function buildClub(kit, rand) {
  const Y = 0.012;
  kit.add(box(3.5, Y, 2.5), { mat: 'grey', stage: 'F', order: 0, edgeAngle: 40 });
  kit.add(box(3.5, 0.004, 0.24, 0, Y, 1.1), { mat: 'pitch', stage: 'F', order: 0.25, edges: false });

  clubhouse(kit, -0.55, -0.78, Y);
  sportsHall(kit, 0.85, -0.7, Y);

  const px = -0.82;
  const pz = 0.4;
  kit.add(box(1.06, 0.006, 0.62, px, Y, pz), { mat: 'pitch', stage: 'F', order: 0.4 });
  kit.add(pitchMarkings(0.98, 0.56, px, pz, Y + 0.006, 0.8), { stage: 'L', order: 0.1, mode: 'pop', edges: false });
  const fence = [];
  const fx = 0.56;
  const fz = 0.34;
  for (const [side, len, horiz] of [[-fz, fx, true], [fz, fx, true], [-fx, fz, false], [fx, fz, false]]) {
    const posts = [];
    for (let s = -len; s <= len + 1e-6; s += 0.08) {
      const x = horiz ? px + s : px + side;
      const z = horiz ? pz + side : pz + s;
      posts.push(box(0.004, 0.05, 0.004, x, Y, z));
    }
    kit.add(combine(posts), { stage: 'S', order: 0.2 + fence.length * 0.05, edges: false });
    fence.push(side);
  }
  const rail = Y + 0.05;
  kit.addLines(polyline([[px - fx, rail, pz - fz], [px + fx, rail, pz - fz], [px + fx, rail, pz + fz], [px - fx, rail, pz + fz]], true), { stage: 'E', order: 0.2 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    floodlight(kit, px + sx * (fx + 0.04), pz + sz * (fz + 0.04), { h: 0.3, y: Y, target: [px, pz], order: 0.6 });
  }

  padelCourts(kit, Y);

  const courts = [];
  for (const cx of [0.72, 1.06]) {
    kit.add(box(0.3, 0.004, 0.17, cx, Y, -0.2), { mat: 'court', stage: 'F', order: 0.6, edges: false });
    courts.push(...courtLines(cx, -0.2, 0.28, 0.15, Y + 0.0045));
    kit.add(combine([box(0.004, 0.035, 0.004, cx - 0.135, Y, -0.2), box(0.004, 0.035, 0.004, cx + 0.135, Y, -0.2)]), { stage: 'L', order: 0.3, mode: 'pop', edges: false });
  }
  kit.addLines(courts, { stage: 'L', order: 0.2 });

  pool(kit, 0.02, 0.72, Y);

  kit.add(box(0.22, 0.004, 0.6, -0.08, Y, -0.25), { mat: 'card', stage: 'F', order: 0.5, edges: false });
  let n = 0;
  for (let x = -1.65; x <= 1.66; x += 0.165) tree(kit, x, 1.22, { order: (n++ % 18) / 18 });
  for (let z = -1.1; z <= 0.9; z += 0.2) {
    tree(kit, -1.7, z, { s: 0.9, order: (n % 10) / 12 });
    tree(kit, 1.7, z, { s: 0.9, order: (n++ % 10) / 12 });
  }
  for (const [x, z] of [[-0.18, 0.15], [-0.18, 0.4], [0.32, 0.12], [0.45, 0.4], [0.3, -0.05]]) tree(kit, x, z, { s: 1.1, order: rand() });
  people(kit, [[-0.4, -0.38], [-0.33, -0.36], [-0.02, -0.4], [0.2, 0.58], [-0.22, 0.62], [0.95, 0.03], [1.0, 0.07], [-0.62, -0.42]], { y: Y, h: 0.03 });
  return { height: 0.42 };
}

function clubhouse(kit, cx, cz, Y) {
  const W = 1.2;
  const D = 0.42;
  kit.add(box(W + 0.1, 0.018, D + 0.1, cx, Y, cz), { stage: 'F', order: 0.2 });
  const y0 = Y + 0.018;
  const floors = [y0, y0 + 0.124];
  floors.forEach((fy, f) => {
    for (let i = 0; i < 7; i++) {
      for (const sz of [-1, 1]) {
        kit.add(box(0.016, 0.11, 0.016, cx - W / 2 + 0.03 + i * ((W - 0.06) / 6), fy, cz + sz * (D / 2 - 0.02)), { stage: 'S', order: f * 0.5 + i * 0.04, edges: false });
      }
    }
    kit.add(box(W + 0.02, 0.014, D + 0.02, cx, fy + 0.11, cz), { stage: 'S', order: f * 0.5 + 0.35, mode: 'drop' });
    kit.add(box(W - 0.06, 0.11, D - 0.07, cx, fy, cz), { mat: 'glass', stage: 'E', order: f * 0.2, edges: true });
  });
  const fins = [];
  for (let i = 0; i <= 34; i++) fins.push(box(0.005, 0.11, 0.03, cx - W / 2 + 0.02 + i * ((W - 0.04) / 34), floors[1], cz + D / 2 + 0.01));
  kit.add(combine(fins), { stage: 'E', order: 0.45, mode: 'drop', drop: 0.25, edges: false });
  kit.add(box(W + 0.34, 0.012, D + 0.24, cx + 0.05, floors[1] + 0.126, cz + 0.04), { stage: 'E', order: 0.8, mode: 'drop' });
  kit.add(box(0.34, 0.008, 0.16, cx + 0.1, Y + 0.11, cz + D / 2 + 0.1), { stage: 'E', order: 0.9, mode: 'drop' });
  kit.add(combine([box(0.006, 0.11, 0.006, cx - 0.06, Y, cz + D / 2 + 0.17), box(0.006, 0.11, 0.006, cx + 0.26, Y, cz + D / 2 + 0.17)]), { stage: 'E', order: 0.85, edges: false });
}

function sportsHall(kit, cx, cz, Y) {
  const L = 0.9;
  const R = 0.28;
  const wallH = 0.075;
  kit.add(box(L + 0.06, 0.016, 2 * R + 0.06, cx, Y, cz), { stage: 'F', order: 0.3 });
  const y0 = Y + 0.016;
  kit.add(box(L, wallH, 0.014, cx, y0, cz - R + 0.007), { stage: 'S', order: 0.1 });
  kit.add(box(L, wallH, 0.014, cx, y0, cz + R - 0.007), { stage: 'S', order: 0.15 });
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.TorusGeometry(R - 0.004, 0.006, 4, 20, Math.PI);
    rib.rotateY(Math.PI / 2);
    rib.scale(1, 0.55, 1);
    rib.translate(cx - L / 2 + 0.04 + i * ((L - 0.08) / 5), y0 + wallH, cz);
    kit.add(rib, { stage: 'S', order: 0.3 + i * 0.1, mode: 'grow', edges: false });
  }
  const shell = new THREE.CylinderGeometry(R, R, L, 30, 1, true, 0, Math.PI);
  shell.rotateZ(Math.PI / 2);
  shell.scale(1, 0.55, 1);
  shell.translate(cx, y0 + wallH, cz);
  kit.add(shell, { stage: 'E', order: 0.35, mode: 'drop', drop: 0.4, edgeAngle: 20 });
  for (const side of [-1, 1]) {
    const gable = new THREE.CircleGeometry(R, 24, 0, Math.PI);
    gable.scale(1, 0.55, 1);
    gable.rotateY(side * Math.PI / 2);
    gable.translate(cx + side * L / 2, y0 + wallH, cz);
    kit.add(gable, { mat: 'glass', stage: 'E', order: 0.55, mode: 'drop', edgeAngle: 20 });
    kit.add(box(0.014, wallH, 2 * R, cx + side * (L / 2 - 0.007), y0, cz), { stage: 'S', order: 0.2 });
  }
}

function padelCourts(kit, Y) {
  const lines = [];
  for (const cx of [0.75, 1.13]) {
    for (const cz of [0.25, 0.47]) {
      const w = 0.32;
      const d = 0.16;
      kit.add(box(w, 0.004, d, cx, Y, cz), { mat: 'court', stage: 'F', order: 0.65, edges: false });
      const posts = [];
      for (const sx of [-1, -0.5, 0.5, 1]) for (const sz of [-1, 1]) posts.push(box(0.004, 0.045, 0.004, cx + (sx * w) / 2, Y, cz + (sz * d) / 2));
      kit.add(combine(posts), { stage: 'S', order: 0.5 + cx * 0.2, edges: false });
      const glass = [
        box(0.004, 0.04, d, cx - w / 2, Y, cz), box(0.004, 0.04, d, cx + w / 2, Y, cz),
        box(0.08, 0.04, 0.004, cx - w / 2 + 0.04, Y, cz - d / 2), box(0.08, 0.04, 0.004, cx + w / 2 - 0.04, Y, cz - d / 2),
        box(0.08, 0.04, 0.004, cx - w / 2 + 0.04, Y, cz + d / 2), box(0.08, 0.04, 0.004, cx + w / 2 - 0.04, Y, cz + d / 2),
      ];
      kit.add(combine(glass), { mat: 'glass', stage: 'E', order: 0.3 + cz * 0.4, mode: 'drop', drop: 0.2 });
      kit.add(box(0.003, 0.01, d, cx, Y, cz), { stage: 'L', order: 0.4, mode: 'pop', edges: false });
      lines.push(...courtLines(cx, cz, w * 0.7, d, Y + 0.0045));
    }
  }
  kit.addLines(lines, { stage: 'L', order: 0.3 });
}

function pool(kit, cx, cz, Y) {
  const W = 0.5;
  const D = 0.22;
  kit.add(box(0.7, 0.012, 0.42, cx, Y, cz), { stage: 'F', order: 0.45 });
  const y0 = Y + 0.012;
  kit.add(box(W, 0.004, D, cx, y0, cz), { mat: 'water', stage: 'L', order: 0.0, mode: 'pop', edges: false });
  const coping = [
    box(W + 0.02, 0.01, 0.01, cx, y0, cz - D / 2 - 0.005), box(W + 0.02, 0.01, 0.01, cx, y0, cz + D / 2 + 0.005),
    box(0.01, 0.01, D, cx - W / 2 - 0.005, y0, cz), box(0.01, 0.01, D, cx + W / 2 + 0.005, y0, cz),
  ];
  kit.add(combine(coping), { stage: 'S', order: 0.6 });
  const lanes = [];
  for (let i = 1; i < 8; i++) {
    const z = cz - D / 2 + (D * i) / 8;
    lanes.push(cx - W / 2 + 0.01, y0 + 0.0045, z, cx + W / 2 - 0.01, y0 + 0.0045, z);
  }
  kit.addLines(lanes, { set: 'contour', stage: 'L', order: 0.15 });
  for (let i = 0; i < 5; i++) {
    const x = cx - 0.26 + i * 0.13;
    const umbrella = combine([cyl(0.002, 0.04, x, y0, cz + 0.17, 4), cyl(0.028, 0.012, x, y0 + 0.036, cz + 0.17, 8, 0.002)]);
    kit.add(umbrella, { stage: 'L', order: 0.4 + i * 0.08, mode: 'pop', edges: false });
  }
}
