// Drafting primitives. Every builder returns an SVG string; drawable strokes carry
// class "d" and pathLength="1" so CSS can draw them on with stroke-dashoffset.
import { DWG_AR } from './dwg-ar.js';

const r1 = (n) => Math.round(n * 10) / 10;
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

// Isometric projection helper (x right-down, y left-down, z up).
export function iso(ox, oy, s) {
  const c = Math.cos(Math.PI / 6) * s;
  const k = Math.sin(Math.PI / 6) * s;
  return (x, y, z = 0) => [ox + (x - y) * c, oy + (x + y) * k - z * s];
}

// Shared hatch patterns, namespaced per SVG so ids never collide.
export function defs(ns) {
  const p = (id, w, h, inner, extra = '') => `<pattern id="${ns}-${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse" ${extra}>${inner}</pattern>`;
  return `<defs>
    ${p('diag', 8, 8, '<path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" class="hatch"/>')}
    ${p('cross', 9, 9, '<path d="M0 0 L9 9 M9 0 L0 9" class="hatch"/>')}
    ${p('earth', 14, 14, '<path d="M0 14 L14 0" class="hatch"/><path d="M0 7 L7 0" class="hatch hatch--faint"/>')}
  </defs>`;
}

export const url = (ns, id) => `url(#${ns}-${id})`;
