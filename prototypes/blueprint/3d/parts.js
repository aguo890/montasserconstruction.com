// Reusable model-shop parts: foam trees, palms, scale figures, floodlights, pitch markings.
import * as THREE from 'three';
import { box, cyl, beam, combine, figure, ring, TAU } from './geo.js';

export function tree(kit, x, z, { s = 1, y = 0, order = 0, stage = 'L' } = {}) {
  const trunkH = 0.05 * s;
  kit.add(cyl(0.004 * s, trunkH, x, y, z, 5), { mat: 'wood', stage, order, mode: 'grow', edges: false, dur: 0.06 });
  const canopy = new THREE.IcosahedronGeometry(0.038 * s, 1);
  canopy.scale(1, 0.92, 1);
  canopy.translate(x, y + trunkH + 0.026 * s, z);
  kit.add(canopy, { mat: 'foam', stage, order: Math.min(order + 0.04, 1), mode: 'pop', edges: false, flat: true, dur: 0.07 });
}

export function palm(kit, x, z, { h = 0.13, y = 0, order = 0, stage = 'L', rand = Math.random } = {}) {
  const lean = (rand() - 0.5) * 0.02;
  kit.add(cyl(0.004, h, x, y, z, 5, 0.003), { mat: 'wood', stage, order, mode: 'grow', edges: false, dur: 0.06 });
  const top = [x + lean, y + h, z];
  const fronds = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rand() * 0.4;
    const tip = [top[0] + Math.cos(a) * 0.06, top[1] - 0.022, top[2] + Math.sin(a) * 0.06];
    fronds.push(beam(top, tip, 0.016, 0.003));
  }
  kit.add(combine(fronds), { mat: 'foam', stage, order: Math.min(order + 0.05, 1), mode: 'pop', edges: false, dur: 0.07 });
}

export function people(kit, spots, { h = 0.032, y = 0, stage = 'L', order = 0.5 } = {}) {
  const geos = spots.map(([x, z]) => figure(h, x, y, z));
  kit.add(combine(geos), { mat: 'foam', stage, order, mode: 'pop', edges: false, dur: 0.08 });
}

/** Lighting mast with a head angled toward a target point. */
export function floodlight(kit, x, z, { h, y = 0, target = [0, 0], order = 0 }) {
  kit.add(cyl(0.006, h, x, y, z, 6, 0.004), { stage: 'S', order, mode: 'grow', edges: false });
  const angle = Math.atan2(target[0] - x, target[1] - z);
  const head = box(0.07, 0.035, 0.01, 0, 0, 0);
  head.rotateX(-0.5);
  head.rotateY(angle);
  head.translate(x, y + h - 0.01, z);
  kit.add(head, { stage: 'E', order: Math.min(order + 0.3, 1), mode: 'drop', drop: 0.2 });
}

/** Football pitch markings as one thin raised piece. Pitch length L (x) and width W (z). */
export function pitchMarkings(L, W, cx, cz, y, scale = 1) {
  const t = 0.0035 * scale;
  const h = 0.0015;
  const geos = [
    box(L, h, t, cx, y, cz - W / 2), box(L, h, t, cx, y, cz + W / 2),
    box(t, h, W, cx - L / 2, y, cz), box(t, h, W, cx + L / 2, y, cz),
    box(t, h, W, cx, y, cz),
    ring(W * 0.135 + t / 2, W * 0.135 - t / 2, h, cx, y, cz, 40),
  ];
  for (const side of [-1, 1]) {
    const pd = L * 0.157;
    const pw = W * 0.593;
    const gd = L * 0.052;
    const gw = W * 0.27;
    const ex = cx + side * L / 2;
    geos.push(box(t, h, pw, ex - side * pd, y, cz), box(pd, h, t, ex - side * pd / 2, y, cz - pw / 2), box(pd, h, t, ex - side * pd / 2, y, cz + pw / 2));
    geos.push(box(t, h, gw, ex - side * gd, y, cz), box(gd, h, t, ex - side * gd / 2, y, cz - gw / 2), box(gd, h, t, ex - side * gd / 2, y, cz + gw / 2));
    const gh = 0.02 * scale;
    const gwid = W * 0.108;
    geos.push(box(t, gh, t, ex + side * 0.006, y, cz - gwid / 2), box(t, gh, t, ex + side * 0.006, y, cz + gwid / 2), box(t, t, gwid, ex + side * 0.006, y + gh, cz));
  }
  return combine(geos);
}

/** Court lines (rectangle + centre line) as hairline segments at height y. */
export function courtLines(cx, cz, w, d, y) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  return [
    x0, y, z0, x1, y, z0, x1, y, z0, x1, y, z1, x1, y, z1, x0, y, z1, x0, y, z1, x0, y, z0,
    cx, y, z0, cx, y, z1,
  ];
}
