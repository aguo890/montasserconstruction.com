// Drafting primitives. Every builder returns an SVG string; drawable strokes carry
// class "d" and pathLength="1" so CSS can draw them on with stroke-dashoffset.
import { DWG_AR } from './dwg-ar.js';

export const r1 = (n) => Math.round(n * 10) / 10;
const DRAW = 'pathLength="1"';
const isDrawn = (c) => /(^|\s)[de](\s|$)/.test(c);
const pl = (c) => (isDrawn(c) ? DRAW : '');

export const g = (c, inner, extra = '') => `<g class="${c}" ${extra}>${inner}</g>`;

export function line(x1, y1, x2, y2, c = 'l2 d') {
  return `<line class="${c}" ${pl(c)} x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
}

export function rect(x, y, w, h, c = 'l2 d', rx = 0, extra = '') {
  const round = rx ? ` rx="${rx}"` : '';
  return `<rect class="${c}" ${pl(c)} x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${round} ${extra}/>`;
}

export function circle(cx, cy, r, c = 'l2 d', extra = '') {
  return `<circle class="${c}" ${pl(c)} cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" ${extra}/>`;
}

export function ellipse(cx, cy, rx, ry, c = 'l2 d') {
  return `<ellipse class="${c}" ${pl(c)} cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}"/>`;
}

export function path(d, c = 'l2 d', extra = '') {
  return `<path class="${c}" ${pl(c)} d="${d}" ${extra}/>`;
}

export function poly(pts, c = 'l2 d', closed = true) {
  const tag = closed ? 'polygon' : 'polyline';
  const p = pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
  return `<${tag} class="${c}" ${pl(c)} points="${p}"/>`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const FLIP = { start: 'end', end: 'start', middle: 'middle' };

// Labels with an Arabic entry are drawn twice; CSS shows the one for the page language.
// Arabic runs right to left, so its anchor flips to keep the label on the same side of x.
export function text(x, y, str, c = 't', anchor = 'start', rot = 0) {
  const tr = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : '';
  const at = `x="${r1(x)}" y="${r1(y)}"`;
  const ar = DWG_AR[str];
  if (!ar) return `<text class="${c}" ${at} text-anchor="${anchor}"${tr}>${esc(str)}</text>`;
  return `<text class="${c} en" ${at} text-anchor="${anchor}"${tr}>${esc(str)}</text>` +
    `<text class="${c} ar" lang="ar" direction="rtl" ${at} text-anchor="${FLIP[anchor]}"${tr}>${esc(ar)}</text>`;
}

// Architectural dimension: extension lines, slash ticks, and a centred label.
export function dimH(x1, x2, y, label, { ext = 0, c = 'L-dims', below = false } = {}) {
  const ty = below ? y + 18 : y - 8;
  const extLines = ext ? line(x1, y - ext, x1, y + 6, 'l0 d') + line(x2, y - ext, x2, y + 6, 'l0 d') : '';
  return g(`dim ${c}`, extLines +
    line(x1 - 8, y, x2 + 8, y, 'l1 d') +
    line(x1 - 5, y + 5, x1 + 5, y - 5, 'l3 d') +
    line(x2 - 5, y + 5, x2 + 5, y - 5, 'l3 d') +
    text((x1 + x2) / 2, ty, label, 't t-dim', 'middle'));
}

export function dimV(x, y1, y2, label, { ext = 0, c = 'L-dims', right = false } = {}) {
  const tx = right ? x + 18 : x - 10;
  const extLines = ext ? line(x - 6, y1, x + ext, y1, 'l0 d') + line(x - 6, y2, x + ext, y2, 'l0 d') : '';
  return g(`dim ${c}`, extLines +
    line(x, y1 - 8, x, y2 + 8, 'l1 d') +
    line(x - 5, y1 + 5, x + 5, y1 - 5, 'l3 d') +
    line(x - 5, y2 + 5, x + 5, y2 - 5, 'l3 d') +
    text(tx, (y1 + y2) / 2, label, 't t-dim', 'middle', -90));
}

// Leader: dot on the object, dog-leg to a label.
export function leader(x1, y1, x2, y2, label, { c = 'L-anno', side = 'right', sub = '' } = {}) {
  const run = side === 'right' ? 26 : -26;
  const tx = x2 + run + (side === 'right' ? 6 : -6);
  const anchor = side === 'right' ? 'start' : 'end';
  const subText = sub ? text(tx, y2 + 15, sub, 't t-sub', anchor) : '';
  return g(`leader ${c}`,
    circle(x1, y1, 3, 'fill-ink') +
    poly([[x1, y1], [x2, y2], [x2 + run, y2]], 'l1 d', false) +
    text(tx, y2 + 4, label, 't t-lbl', anchor) + subText);
}

export function north(x, y, s = 1) {
  const k = (n) => r1(n * s);
  return g('north L-anno', circle(x, y, k(22), 'l1 d') +
    path(`M${x} ${r1(y - k(30))} L${r1(x + k(9))} ${r1(y + k(12))} L${x} ${r1(y + k(4))} Z`, 'fill-ink') +
    path(`M${x} ${r1(y - k(30))} L${r1(x - k(9))} ${r1(y + k(12))} L${x} ${r1(y + k(4))} Z`, 'l1 d') +
    text(x, r1(y - k(36)), 'N', 't t-north', 'middle'));
}

export function tree(x, y, r = 12, c = 'l1 d') {
  const spokes = [0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return line(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, 'l0 d');
  }).join('');
  return circle(x, y, r, c) + spokes;
}

export function palm(x, y, r = 12) {
  const fronds = [0, 72, 144, 216, 288].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const ex = x + Math.cos(a) * r;
    const ey = y + Math.sin(a) * r;
    const cx = x + Math.cos(a + 0.5) * r * 0.7;
    const cy = y + Math.sin(a + 0.5) * r * 0.7;
    return path(`M${r1(x)} ${r1(y)} Q${r1(cx)} ${r1(cy)} ${r1(ex)} ${r1(ey)}`, 'l1 d');
  }).join('');
  return fronds + circle(x, y, 2, 'fill-ink');
}

export function builtTree(x, y, r = 12) {
  return circle(x + 3, y + 4, r, 'b-shadow') + circle(x, y, r, 'b-tree') + circle(x - r * 0.3, y - r * 0.3, r * 0.45, 'b-tree-hi');
}

// Drawing title: circled number, underlined title, scale note.
export function dwgTitle(x, y, n, title, scale = 'NOT TO SCALE · ILLUSTRATIVE') {
  return g('dwg-title L-anno', circle(x + 16, y - 6, 16, 'l2 d') +
    line(x + 16 - 16, y - 6, x + 32, y - 6, 'l1 d') +
    text(x + 16, y - 10, String(n), 't t-tnum', 'middle') +
    text(x + 16, y + 6, 'A', 't t-tsub', 'middle') +
    text(x + 44, y - 4, title, 't t-title') +
    line(x + 44, y + 2, x + 44 + Math.min(420, title.length * 9.6), y + 2, 'l2 d') +
    text(x + 44, y + 18, scale, 't t-sub'));
}

// Revision cloud around a box, with a redline note.
export function cloud(x, y, w, h, note = 'CONFIRM', { tri = 'Δ' } = {}) {
  const bump = 14;
  const nx = Math.max(2, Math.round(w / bump));
  const ny = Math.max(2, Math.round(h / bump));
  const sx = w / nx;
  const sy = h / ny;
  let d = `M${r1(x)} ${r1(y)}`;
  for (let i = 0; i < nx; i += 1) d += ` a${r1(sx / 2)} ${r1(sx / 2)} 0 0 1 ${r1(sx)} 0`;
  for (let i = 0; i < ny; i += 1) d += ` a${r1(sy / 2)} ${r1(sy / 2)} 0 0 1 0 ${r1(sy)}`;
  for (let i = 0; i < nx; i += 1) d += ` a${r1(sx / 2)} ${r1(sx / 2)} 0 0 1 ${r1(-sx)} 0`;
  for (let i = 0; i < ny; i += 1) d += ` a${r1(sy / 2)} ${r1(sy / 2)} 0 0 1 0 ${r1(-sy)}`;
  return g('cloud L-redl', path(d, 'red d') +
    poly([[x + w - 2, y - 30], [x + w + 14, y - 4], [x + w - 18, y - 4]], 'red-fill') +
    text(x + w - 2, y - 10, tri, 't t-tri', 'middle') +
    text(x + w + 22, y - 10, note, 't t-red'));
}

// Isometric projection helper (x right-down, y left-down, z up).
export function iso(ox, oy, s) {
  const c = Math.cos(Math.PI / 6) * s;
  const k = Math.sin(Math.PI / 6) * s;
  return (x, y, z = 0) => [ox + (x - y) * c, oy + (x + y) * k - z * s];
}

// Capsule (stadium) outline centred on cx,cy with straight half-length hl and radius r.
export function capsule(cx, cy, hl, r) {
  return `M${r1(cx - hl)} ${r1(cy - r)} L${r1(cx + hl)} ${r1(cy - r)} A${r1(r)} ${r1(r)} 0 0 1 ${r1(cx + hl)} ${r1(cy + r)} L${r1(cx - hl)} ${r1(cy + r)} A${r1(r)} ${r1(r)} 0 0 1 ${r1(cx - hl)} ${r1(cy - r)} Z`;
}

export function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

// Shared hatch and material patterns, namespaced per SVG so ids never collide.
export function defs(ns) {
  const p = (id, w, h, inner, extra = '') => `<pattern id="${ns}-${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" ${extra}>${inner}</pattern>`;
  return `<defs>
    ${p('diag', 8, 8, '<path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" class="hatch"/>')}
    ${p('cross', 9, 9, '<path d="M0 0 L9 9 M9 0 L0 9" class="hatch"/>')}
    ${p('dots', 7, 7, '<circle cx="3.5" cy="3.5" r=".9" class="hatch-dot"/>')}
    ${p('earth', 14, 14, '<path d="M0 14 L14 0" class="hatch"/><path d="M0 7 L7 0" class="hatch hatch--faint"/>')}
    ${p('rock', 22, 18, '<path d="M2 6 l5 -4 l6 2 l-1 6 l-7 1 Z M12 13 l5 -2 l4 4 l-4 3 l-5 -1 Z" class="hatch"/>')}
    ${p('reef', 16, 16, '<circle cx="4" cy="4" r="1.6" class="hatch-dot"/><circle cx="12" cy="10" r="1.1" class="hatch-dot"/><circle cx="7" cy="13" r=".8" class="hatch-dot"/>')}
    ${p('wave', 30, 12, '<path d="M0 6 q7.5 -6 15 0 t15 0" class="hatch"/>')}
    ${p('grass', 40, 40, '<rect width="40" height="20" class="b-grass-a"/><rect y="20" width="40" height="20" class="b-grass-b"/>')}
    ${p('grassv', 40, 40, '<rect width="20" height="40" class="b-grass-a"/><rect x="20" width="20" height="40" class="b-grass-b"/>')}
    ${p('pave', 12, 12, '<rect width="12" height="12" class="b-pave"/><path d="M0 0 H12 M0 0 V12" class="b-pave-joint"/>')}
    ${p('plank', 6, 6, '<rect width="6" height="6" class="b-timber"/><path d="M0 0 H6" class="b-timber-joint"/>')}
    ${p('water', 36, 16, '<rect width="36" height="16" class="b-water"/><path d="M2 9 q8 -5 16 0 t16 0" class="b-water-ripple"/>')}
    ${p('sea', 48, 22, '<rect width="48" height="22" class="b-sea"/><path d="M2 12 q11 -6 22 0 t22 0" class="b-water-ripple"/>')}
    ${p('brick', 16, 8, '<rect width="16" height="8" class="b-brick"/><path d="M0 0 H16 M0 4 H16 M4 0 V4 M12 4 V8" class="b-brick-joint"/>')}
    ${p('seatsG', 10, 6, '<rect width="10" height="6" class="b-seat-g"/><path d="M0 5.5 H10" class="b-seat-joint"/>')}
    ${p('seatsS', 10, 6, '<rect width="10" height="6" class="b-seat-s"/><path d="M0 5.5 H10" class="b-seat-joint"/>')}
    <filter id="${ns}-shadow" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="5" dy="7" stdDeviation="3" flood-color="#20335F" flood-opacity=".28"/></filter>
  </defs>`;
}

export const url = (ns, id) => `url(#${ns}-${id})`;
