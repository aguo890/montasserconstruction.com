// Small geometry vocabulary for card-and-foam maquettes. All helpers place the piece
// with its base on y (model space: plinth top is y = 0, +z faces the viewer).
import * as THREE from 'three';

export const TAU = Math.PI * 2;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function box(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

export function cyl(r, h, x = 0, y = 0, z = 0, seg = 24, rTop = r, open = false) {
  const g = new THREE.CylinderGeometry(rTop, r, h, seg, 1, open);
  g.translate(x, y + h / 2, z);
  return g;
}

/** Horizontal cylinder (pipe) between two points. */
export function pipe(a, b, r, seg = 12) {
  const start = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(start);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.rotateX(Math.PI / 2);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, dir.clone().normalize()));
  g.translate(start.x + dir.x / 2, start.y + dir.y / 2, start.z + dir.z / 2);
  return g;
}

/** Rectangular member between two points (rafters, braces, masts). */
export function beam(a, b, w, h) {
  const start = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(start);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, h, len);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Z_AXIS, dir.clone().normalize()));
  g.translate(start.x + dir.x / 2, start.y + dir.y / 2, start.z + dir.z / 2);
  return g;
}

/** Shape from plan points given as [x, z]. */
export function planShape(points) {
  const s = new THREE.Shape();
  points.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  return s;
}

export function planPath(points) {
  const p = new THREE.Path();
  points.forEach(([x, z], i) => (i ? p.lineTo(x, -z) : p.moveTo(x, -z)));
  p.closePath();
  return p;
}

/** Extrude a plan shape upward by h from y. */
export function extrudePlan(shape, h, y = 0, curveSegments = 28) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

export function polygonPoints(n, r, cx = 0, cz = 0, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + (i / n) * TAU;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });
}

export function ring(rOuter, rInner, h, x = 0, y = 0, z = 0, seg = 48) {
  const s = new THREE.Shape();
  s.absarc(0, 0, rOuter, 0, TAU, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, rInner, 0, TAU, true);
  s.holes.push(hole);
  const g = extrudePlan(s, h, y, seg);
  g.translate(x, 0, z);
  return g;
}

export function lathe(profile, seg = 24, x = 0, y = 0, z = 0) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  g.translate(x, y, z);
  return g;
}

/** Slightly pointed dome profile, radius r and height h. */
export function domeProfile(r, h, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI / 2;
    const radius = r * Math.cos(a) * (1 - 0.06 * Math.sin(a * 2));
    pts.push([Math.max(radius, 0.0005), h * Math.sin(a) ** 0.92]);
  }
  pts[pts.length - 1][0] = 0;
  return pts;
}

/** Prism with a profile given as [z, y] points, extruded along x and centred on x. */
export function prismX(profile, length) {
  const s = new THREE.Shape();
  profile.forEach(([z, y], i) => (i ? s.lineTo(-z, y) : s.moveTo(-z, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-length / 2, 0, 0);
  return g;
}

/** Merge several geometries into one (position + normal), keeping their flat or smooth normals. */
export function combine(geos, flat = false) {
  const parts = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (flat || !n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  let count = 0;
  for (const p of parts) count += p.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    o += p.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/** Line segments for a polyline of [x, y, z] points. */
export function polyline(points, closed = false) {
  const out = [];
  const n = points.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  }
  return out;
}

/**
 * Point on a "stadium" curve (two straights of half-length a joined by semicircles of radius r),
 * at arc length s from the front-left. Returns [x, z, nx, nz] with an outward normal.
 */
export function stadiumPoint(a, r, s) {
  const straight = 2 * a;
  const arc = Math.PI * r;
  const perimeter = 2 * straight + 2 * arc;
  let t = ((s % perimeter) + perimeter) % perimeter;
  if (t < straight) return [-a + t, r, 0, 1];
  t -= straight;
  if (t < arc) {
    const phi = Math.PI / 2 - t / r;
    return [a + r * Math.cos(phi), r * Math.sin(phi), Math.cos(phi), Math.sin(phi)];
  }
  t -= arc;
  if (t < straight) return [a - t, -r, 0, -1];
  t -= straight;
  const phi = -Math.PI / 2 - t / r;
  return [-a + r * Math.cos(phi), r * Math.sin(phi), Math.cos(phi), Math.sin(phi)];
}

export function stadiumPerimeter(a, r) {
  return 4 * a + TAU * r;
}

export function stadiumShape(a, r, holeR = null) {
  const s = new THREE.Shape();
  s.moveTo(-a, -r);
  s.lineTo(a, -r);
  s.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-a, r);
  s.absarc(-a, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  if (holeR !== null) {
    const h = new THREE.Path();
    h.moveTo(-a, -holeR);
    h.absarc(-a, 0, holeR, Math.PI * 1.5, Math.PI / 2, true);
    h.lineTo(a, holeR);
    h.absarc(a, 0, holeR, Math.PI / 2, -Math.PI / 2, true);
    h.lineTo(-a, -holeR);
    s.holes.push(h);
  }
  return s;
}

/** Wall in the XY plane (length along x, from x0) with pointed-arch openings, thickness along z. */
export function arcadeWall({ length, height, thickness, arches, archWidth, spring }) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(length, 0);
  s.lineTo(length, height);
  s.lineTo(0, height);
  s.closePath();
  const bay = length / arches;
  const r = archWidth * 0.82;
  const apex = Math.acos((r - archWidth / 2) / r);
  const sill = Math.min(0.008, height * 0.06);
  for (let i = 0; i < arches; i++) {
    const cx = bay * (i + 0.5);
    const x0 = cx - archWidth / 2;
    const x1 = cx + archWidth / 2;
    const h = new THREE.Path();
    h.moveTo(x0, sill);
    h.lineTo(x1, sill);
    h.lineTo(x1, spring);
    h.absarc(x1 - r, spring, r, 0, apex, false);
    h.absarc(x0 + r, spring, r, Math.PI - apex, Math.PI, false);
    h.lineTo(x0, sill);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -thickness / 2);
  return g;
}

/** Capsule scale figure, about human height `h`. */
export function figure(h, x, y, z) {
  const r = h * 0.16;
  const g = new THREE.CapsuleGeometry(r, h - 2 * r, 2, 6);
  g.translate(x, y + h / 2, z);
  return g;
}
