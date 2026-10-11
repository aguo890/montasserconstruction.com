// One map view (the Egypt plan or the Delta inset): an SVG survey plate in km units, fitted to its frame.
import { linesToD, polysToD, projectBox, fitBox } from "./geo.js";
import { RASTERS, LABELS } from "./config.js";
import { getLang, tx, UI } from "./strings.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const MAP_DIR = new URL("./map/", import.meta.url).href;
const SCALE_STEPS = [10, 20, 25, 50, 100, 200, 250, 500];
const SCALE_MIN_PX = 64;
const GRAT_STEP = { main: 2, detail: 1 };
const PAD = {
  wide: { t: 24, r: 24, b: 24, l: 24 },
  narrow: { t: 10, r: 8, b: 10, l: 8 },
};

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
};

// Shared path data, decoded once for both views
export function buildPaths(data) {
  const q = data.proj.q;
  const bands = { minor: [], index: [], low: [], bathy: [] };
  for (const c of data.contours) {
    const band = c.z < 0 && c.z > -150 ? "low" : c.z < 0 ? "bathy" : c.z % 500 === 0 ? "index" : "minor";
    bands[band].push(...c.lines);
  }
  return {
    coast: linesToD(data.coast, q),
    border: linesToD(data.border, q),
    gov: linesToD(data.gov, q),
    nile: linesToD(data.nile, q),
    branch: linesToD(data.branch, q),
    canal: linesToD(data.canal, q),
    lakes: polysToD(data.lakes, q),
    egypt: polysToD(data.egypt, q),
    contours: Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, linesToD(v, q)])),
  };
}

export class MapView {
  constructor(root, { kind, proj, paths, bounds }) {
    this.root = root;
    this.kind = kind;
    this.proj = proj;
    this.box = projectBox(proj, bounds);
    this.svg = root.querySelector("svg.ms-map");
    this.scaleBar = root.querySelector("[data-scale-bar]");
    this.scaleLabel = root.querySelector("[data-scale-label]");
    this.vb = { s: 1, x: 0, y: 0, w: 1, h: 1 };
    this.drawPlate(paths);
  }

  drawPlate(paths) {
    const relief = el("g", { class: "ms-relief" }, this.svg);
    for (const r of RASTERS) {
      el("image", { href: MAP_DIR + r.src, x: r.x0, y: r.y0, width: r.x1 - r.x0, height: r.y1 - r.y0, preserveAspectRatio: "none" }, relief);
    }
    const contours = el("g", { class: "ms-contours" }, this.svg);
    for (const [band, d] of Object.entries(paths.contours)) el("path", { d, class: `ms-c ms-c--${band}` }, contours);
    el("path", { d: paths.lakes, class: "ms-lakes", "fill-rule": "evenodd" }, this.svg);
    el("path", { d: paths.gov, class: "ms-gov" }, this.svg);
    this.gratEl = el("g", { class: "ms-grat" }, this.svg);
    el("path", { d: paths.border, class: "ms-border" }, this.svg);
    for (const k of ["coast", "egypt", "nile", "branch", "canal"]) el("path", { d: paths[k], class: `ms-ink ms-${k}`, pathLength: 1 }, this.svg);
    this.frameEl = el("g", { class: "ms-frame" }, this.svg);
    this.lensEl = el("g", { class: "ms-lens" }, this.svg);
    this.labelsEl = el("g", { class: "ms-labels" }, this.svg);
    this.drawLabels();
  }

  drawLabels() {
    const group = this.labelsEl;
    const ar = getLang() === "ar";
    group.replaceChildren();
    for (const l of LABELS.filter((x) => x.view === this.kind)) {
      const pts = (l.path || [l.at]).map(([lon, lat]) => this.proj.project(lon, lat));
      const [x, y] = pts.length > 1 ? [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2] : pts[0];
      const angle = pts.length > 1 ? (Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) * 180) / Math.PI : 0;
      const g = el("g", { class: `ms-lbl ms-lbl--${l.kind}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})` }, group);
      const text = el("text", { class: ar ? "ms-lbl__ar" : "ms-lbl__en", "text-anchor": "middle" }, g);
      if (ar) text.setAttribute("lang", "ar");
      text.textContent = ar ? l.ar : l.en;
    }
  }

  // Fit the view to its frame. The detail view grows its box to the frame's shape; returns the view box in km.
  layout() {
    const w = Math.max(1, this.root.clientWidth);
    const h = Math.max(1, this.root.clientHeight);
    const narrow = w < 560;
    const pad = this.kind === "detail" ? { t: 6, r: 6, b: 6, l: 6 } : PAD[narrow ? "narrow" : "wide"];
    this.size = { w, h };
    this.vb = fitBox(this.box, w, h, pad);
    const { x, y, w: vw, h: vh, s } = this.vb;
    this.svg.setAttribute("viewBox", `${x.toFixed(2)} ${y.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
    this.svg.style.setProperty("--k", (1 / s).toFixed(4));
    this.drawGraticule();
    this.updateScale();
    return this.vb;
  }

  toPx([x, y]) {
    return [(x - this.vb.x) * this.vb.s, (y - this.vb.y) * this.vb.s];
  }

  contains(xy, inset = 0) {
    const [px, py] = this.toPx(xy);
    return px >= inset && py >= inset && px <= this.size.w - inset && py <= this.size.h - inset;
  }

  // Inset boundary drawn on the Egypt plan
  setDetailFrame(vb) {
    this.frameEl.replaceChildren();
    if (!vb) return;
    el("rect", { x: vb.x, y: vb.y, width: vb.w, height: vb.h, class: "ms-frame__rect" }, this.frameEl);
    this.detailVb = vb;
  }

  drawGraticule() {
    const step = GRAT_STEP[this.kind];
    const lines = [];
    for (let lon = 20; lon <= 40; lon += step) lines.push(this.sample((t) => [lon, 18 + t * 18]));
    for (let lat = 18; lat <= 36; lat += step) lines.push(this.sample((t) => [20 + t * 20, lat]));
    this.gratEl.replaceChildren();
    for (const pts of lines) el("path", { d: `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L")}`, class: "ms-grat__line" }, this.gratEl);
  }

  sample(fn) {
    return Array.from({ length: 49 }, (_, i) => this.proj.project(...fn(i / 48)));
  }

  updateScale() {
    if (!this.scaleBar) return;
    const s = this.vb.s;
    const km = SCALE_STEPS.find((k) => k * s >= SCALE_MIN_PX) || SCALE_STEPS[SCALE_STEPS.length - 1];
    this.scaleBar.style.width = `${(km * s).toFixed(1)}px`;
    this.scaleLabel.textContent = `${km} ${tx(UI.km)}`;
  }
}
