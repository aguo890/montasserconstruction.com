// The site plan drawn on the ground for the Plan stage: structural grid lines with bubbles (A, B, C… / 1, 2,
// 3…), two dimension lines with ticks and no figures, a north arrow and a title block centred under the plan
// (clear of the stage's scenes rail and note in either reading direction). Strokes draw themselves
// in: a second canvas stores, per pixel, when (0–1) the pen reaches it, and the shader shows the ink once that
// time has passed. The sheet is drawn in the plan camera's screen frame (x right, y down) and laid flat.
import { CanvasTexture, Color, Group, MathUtils, Mesh, PlaneGeometry, ShaderMaterial } from 'three';

const INK = '#20335F';
const MAX_PX = 2048;
const PLAN_Y = 0.0025;
const MARGIN = 0.66;
const LINE = 0.0058;
const ORDER_PAD_PX = 2.5;
const FADE_IN = 30;
const GRID = { step: 0.42, min: 3, max: 6, ext: 0.13, bubble: 0.048, stagger: 0.035, draw: 0.3, alpha: 0.5 };
const GRID_DASH = [0.05, 0.014, 0.008, 0.014];
const DIM = { offset: 0.24, over: 0.05, tick: 0.034, alpha: 0.85, at: [0.42, 0.5], draw: 0.24 };
const NORTH = { radius: 0.075, at: 0.7 };
const TITLE = { width: 0.86, height: 0.25, gap: 0.12, pad: 0.035, split: 0.6, at: 0.74, draw: 0.16 };
const LETTERS = 'ABCDEFGH';
const T = { title: { en: 'SITE PLAN', ar: 'مخطط الموقع' }, north: { en: 'N', ar: 'ش' } };
const FONTS = {
  mono: '"IBM Plex Mono", ui-monospace, monospace',
  sans: '"Archivo", system-ui, sans-serif',
  ar: '"IBM Plex Sans Arabic", "Geeza Pro", sans-serif',
};

const lang = () => (document.documentElement.lang === 'ar' ? 'ar' : 'en');
const gray = (t) => { const g = Math.round(MathUtils.clamp(t, 0, 1) * 254); return `rgb(${g}, ${g}, ${g})`; };

function context(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext('2d');
}

/** Two same-size canvases: ink coverage (alpha) and draw order (grey = time), mapped from plan units. */
function createSheet(width, depth) {
  const ppu = MAX_PX / Math.max(width, depth);
  const w = Math.round(width * ppu);
  const h = Math.round(depth * ppu);
  const ink = context(w, h);
  const order = context(w, h);
  order.fillStyle = '#fff';
  order.fillRect(0, 0, w, h);
  order.globalCompositeOperation = 'darken';
  [ink, order].forEach((g) => { g.lineCap = 'round'; g.lineJoin = 'round'; });
  return { ink, order, ppu, at: ([u, v]) => [(u + width / 2) * ppu, (v + depth / 2) * ppu] };
}

function inkStroke(sheet, path, { alpha = 1, width = LINE, dash = null }) {
  const { ink, ppu } = sheet;
  ink.save();
  ink.globalAlpha = alpha;
  ink.lineWidth = width * ppu;
  ink.setLineDash(dash ? dash.map((d) => d * ppu) : []);
  path(ink);
  ink.stroke();
  ink.restore();
}

function orderStroke(sheet, path, style, width = LINE) {
  const { order, ppu } = sheet;
  order.save();
  order.strokeStyle = style;
  order.lineWidth = width * ppu + ORDER_PAD_PX * 2;
  path(order);
  order.stroke();
  order.restore();
}

/** A straight stroke that draws from its first point (time t0) to its second (time t1). */
function line(sheet, from, to, { t0, t1 = t0, ...style }) {
  const a = sheet.at(from);
  const b = sheet.at(to);
  const path = (g) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); };
  inkStroke(sheet, path, style);
  const ramp = sheet.order.createLinearGradient(...a, ...b);
  ramp.addColorStop(0, gray(t0));
  ramp.addColorStop(1, gray(t1));
  orderStroke(sheet, path, ramp, style.width);
}

/** A circle drawn round from the top between t0 and t1. */
function circle(sheet, centre, radius, { t0, t1 = t0, ...style }) {
  const [x, y] = sheet.at(centre);
  const path = (g) => { g.beginPath(); g.arc(x, y, radius * sheet.ppu, 0, Math.PI * 2); };
  inkStroke(sheet, path, style);
  if (!sheet.order.createConicGradient) { orderStroke(sheet, path, gray(t0), style.width); return; }
  const sweep = sheet.order.createConicGradient(-Math.PI / 2, x, y);
  sweep.addColorStop(0, gray(t0));
  sweep.addColorStop(1, gray(t1));
  orderStroke(sheet, path, sweep, style.width);
}

function fillShape(sheet, points, t) {
  const path = (g) => { g.beginPath(); points.map(sheet.at).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  path(sheet.ink);
  sheet.ink.fill();
  path(sheet.order);
  sheet.order.fillStyle = gray(t);
  sheet.order.fill();
}

/** Text that appears at time t; it shrinks to maxWidth (plan units) when needed. */
function text(sheet, label, at, { t, size, font, weight = 600, align = 'center', stretch = 'normal', maxWidth = 0 }) {
  const [x, y] = sheet.at(at);
  const isAr = /[\u0600-\u06FF]/.test(label);
  [sheet.ink, sheet.order].forEach((g) => {
    g.save();
    g.font = `${weight} ${Math.round(size * sheet.ppu)}px ${font}`;
    g.fontStretch = stretch;
    g.direction = isAr ? 'rtl' : 'ltr';
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillStyle = g === sheet.order ? gray(t) : '#000';
    g.fillText(label, x, y, maxWidth ? maxWidth * sheet.ppu : undefined);
    g.restore();
  });
}

const gridAt = (length) => {
  const n = MathUtils.clamp(Math.round(length / GRID.step) + 1, GRID.min, GRID.max);
  return Array.from({ length: n }, (_, i) => -length / 2 + (length * i) / (n - 1));
};

function bubble(sheet, centre, label, t) {
  circle(sheet, centre, GRID.bubble, { t0: t, t1: t + 0.12 });
  text(sheet, label, centre, { t: t + 0.08, size: GRID.bubble * 1.1, font: FONTS.mono });
}

function drawGrid(sheet, [w, d]) {
  const cols = gridAt(w);
  const rows = gridAt(d);
  const style = { alpha: GRID.alpha, dash: GRID_DASH };
  cols.forEach((u, i) => {
    const t0 = i * GRID.stagger;
    line(sheet, [u, -d / 2 - GRID.ext], [u, d / 2 + DIM.offset + DIM.over], { t0, t1: t0 + GRID.draw, ...style });
    bubble(sheet, [u, -d / 2 - GRID.ext - GRID.bubble], LETTERS[i], t0);
  });
  rows.forEach((v, j) => {
    const t0 = 0.06 + j * GRID.stagger;
    line(sheet, [-w / 2 - GRID.ext, v], [w / 2 + DIM.offset + DIM.over, v], { t0, t1: t0 + GRID.draw, ...style });
    bubble(sheet, [-w / 2 - GRID.ext - GRID.bubble, v], String(j + 1), t0);
  });
  return { cols, rows };
}

function tick(sheet, [u, v], t) {
  const k = DIM.tick / 2;
  line(sheet, [u - k, v + k], [u + k, v - k], { t0: t, width: LINE * 1.7 });
}

/** One dimension line through the grid positions, with a tick at each; the axis picks horizontal or vertical. */
function dimension(sheet, marks, fixed, isHorizontal, start) {
  const point = (s) => (isHorizontal ? [s, fixed] : [fixed, s]);
  line(sheet, point(marks[0] - DIM.over), point(marks.at(-1) + DIM.over), { t0: start, t1: start + DIM.draw, alpha: DIM.alpha });
  marks.forEach((m, i) => tick(sheet, point(m), start + (DIM.draw * i) / (marks.length - 1)));
}

function drawNorth(sheet, [u, v]) {
  const r = NORTH.radius;
  circle(sheet, [u, v], r, { t0: NORTH.at, t1: NORTH.at + 0.1, alpha: 0.9 });
  fillShape(sheet, [[u, v - r * 0.8], [u + r * 0.42, v + r * 0.62], [u, v + r * 0.3]], NORTH.at + 0.08);
  line(sheet, [u, v - r * 0.8], [u - r * 0.42, v + r * 0.62], { t0: NORTH.at + 0.06 });
  line(sheet, [u - r * 0.42, v + r * 0.62], [u, v + r * 0.3], { t0: NORTH.at + 0.08 });
  text(sheet, T.north[lang()], [u, v - r * 1.55], { t: NORTH.at + 0.12, size: r * 0.85, font: lang() === 'ar' ? FONTS.ar : FONTS.mono });
}

function drawTitle(sheet, [centre, top], title) {
  const { width: w, height: h, pad, split, at, draw } = TITLE;
  const left = centre - w / 2;
  const right = centre + w / 2;
  const corners = [[left, top], [right, top], [right, top + h], [left, top + h]];
  corners.forEach((c, i) => line(sheet, c, corners[(i + 1) % 4], { t0: at + (draw * i) / 4, t1: at + (draw * (i + 1)) / 4 }));
  line(sheet, [left, top + h * split], [right, top + h * split], { t0: at + draw, alpha: 0.6 });
  const isAr = lang() === 'ar';
  const x = isAr ? right - pad : left + pad;
  const align = isAr ? 'right' : 'left';
  const name = isAr ? title.ar : title.en.toUpperCase();
  const nameFont = isAr ? { font: FONTS.ar, weight: 700 } : { font: FONTS.sans, weight: 800, stretch: 'extra-condensed' };
  text(sheet, name, [x, top + (h * split) / 2], { t: at + draw, size: h * 0.3, align, maxWidth: w - pad * 2, ...nameFont });
  const kind = isAr ? { font: FONTS.ar, weight: 600 } : { font: FONTS.mono, weight: 600 };
  text(sheet, T.title[lang()], [x, top + h * (1 + split) / 2], { t: at + draw + 0.04, size: h * 0.18, align, maxWidth: w - pad * 2, ...kind });
}

function drawPlan(sheet, size, title) {
  const [w, d] = size;
  const { cols, rows } = drawGrid(sheet, size);
  dimension(sheet, cols, d / 2 + DIM.offset, true, DIM.at[0]);
  dimension(sheet, rows, w / 2 + DIM.offset, false, DIM.at[1]);
  drawNorth(sheet, [w / 2 + DIM.offset, -d / 2 - GRID.ext - GRID.bubble]);
  drawTitle(sheet, [0, d / 2 + DIM.offset + TITLE.gap], title);
}

const FRAGMENT = `
uniform sampler2D tInk;
uniform sampler2D tOrder;
uniform float uProgress;
uniform float uOpacity;
uniform vec3 uInk;
varying vec2 vUv;
void main() {
  float order = texture2D(tOrder, vUv).r;
  float shown = uProgress >= 1.0 ? 1.0 : clamp((uProgress - order) * ${FADE_IN.toFixed(1)}, 0.0, 1.0);
  float alpha = texture2D(tInk, vUv).a * shown * uOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(uInk, alpha);
  #include <colorspace_fragment>
}`;

const VERTEX = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

function createMaterial() {
  return new ShaderMaterial({
    uniforms: { tInk: { value: null }, tOrder: { value: null }, uProgress: { value: 0 }, uOpacity: { value: 1 }, uInk: { value: new Color(INK) } },
    vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false, toneMapped: false,
  });
}

const FONT_SAMPLES = () => [`600 20px ${FONTS.mono}`, `800 20px ${FONTS.sans}`, ...(lang() === 'ar' ? [`700 20px ${FONTS.ar}`] : [])];

/** The plan annotations: build() per model (returns the sheet's extent), set() per frame, relabel() per language. */
export function createPlan({ anisotropy }) {
  const material = createMaterial();
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = PLAN_Y;
  mesh.renderOrder = -1.5;
  const group = new Group();
  group.add(mesh);
  group.visible = false;
  const s = { size: null, title: null, version: 0 };

  function texture(canvas) {
    const t = new CanvasTexture(canvas);
    t.anisotropy = anisotropy;
    return t;
  }

  function draw() {
    const [w, d] = s.size;
    const sheet = createSheet(w + MARGIN * 2, d + MARGIN * 2);
    drawPlan(sheet, s.size, s.title);
    material.uniforms.tInk.value?.dispose();
    material.uniforms.tOrder.value?.dispose();
    material.uniforms.tInk.value = texture(sheet.ink.canvas);
    material.uniforms.tOrder.value = texture(sheet.order.canvas);
  }

  /** Draws now, and once more when a web font was still loading (fonts are usually ready already). */
  function drawWhenFontsReady() {
    draw();
    const missing = FONT_SAMPLES().filter((f) => !document.fonts.check(f));
    if (!missing.length) return;
    const version = s.version;
    Promise.all(missing.map((f) => document.fonts.load(f))).then(() => { if (version === s.version && s.size) draw(); }).catch(() => {});
  }

  function build({ footprint, rotation, title }) {
    s.size = footprint;
    s.title = title;
    s.version += 1;
    group.rotation.y = rotation;
    mesh.scale.set(footprint[0] + MARGIN * 2, footprint[1] + MARGIN * 2, 1);
    drawWhenFontsReady();
    return [footprint[0] + MARGIN * 2, footprint[1] + MARGIN * 2];
  }

  function set(progress, opacity) {
    material.uniforms.uProgress.value = progress;
    material.uniforms.uOpacity.value = opacity;
    group.visible = Boolean(s.size) && progress > 0 && opacity > 0.001;
  }

  function relabel() {
    if (!s.size) return;
    s.version += 1;
    drawWhenFontsReady();
  }

  function clear() {
    s.size = null;
    s.version += 1;
    group.visible = false;
    ['tInk', 'tOrder'].forEach((k) => { material.uniforms[k].value?.dispose(); material.uniforms[k].value = null; });
  }

  return { group, build, set, relabel, clear };
}
