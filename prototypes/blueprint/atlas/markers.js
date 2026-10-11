// Lots (one per project) for the build-up, city cluster buttons once built, and the fan of an opened cluster.
import { icon } from "./icons.js";
import { UI, SECTOR_NAMES, tx } from "./strings.js";

const LOT_PITCH = { wide: 9, narrow: 7 };
const CLUSTER_PX = { wide: 30, narrow: 26 };
const FAN_RADIUS = { wide: 46, narrow: 38 };
const FAN_STEP = 2.5;
const EDGE = 14;
const NARROW_PX = 560;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const countText = (n) => `${n} ${tx(n === 1 ? UI.project : UI.projects)}`;

export class Markers {
  constructor({ views, places, projects, holdEl, handlers }) {
    this.views = views;
    this.places = places;
    this.projects = projects;
    this.holdEl = holdEl;
    this.handlers = handlers;
    this.lots = new Map();
    this.clusters = [];
    this.visible = new Set(projects.map((p) => p.id));
    this.openKey = null;
    this.merged = false;
    this.createLots();
  }

  createLots() {
    const holdRow = this.holdEl.querySelector("[data-hold-lots]");
    for (const p of this.projects) {
      const lot = document.createElement("span");
      lot.className = "ms-lot";
      lot.dataset.id = p.id;
      lot.dataset.sec = p.sec;
      if (!p.place) holdRow.append(lot);
      this.lots.set(p.id, lot);
    }
  }

  get narrow() {
    return this.views.main.size.w < NARROW_PX;
  }

  // Assign each place to the view that shows it, then position lots and clusters.
  layout() {
    this.pitch = LOT_PITCH[this.narrow ? "narrow" : "wide"];
    this.radius = CLUSTER_PX[this.narrow ? "narrow" : "wide"];
    for (const place of this.places.values()) {
      place.view = this.views.detail.contains(place.xy, 4) ? "detail" : "main";
      place.px = this.views[place.view].toPx(place.xy);
    }
    this.placeLots();
    this.recluster();
  }

  placeLots() {
    const byPlace = new Map();
    for (const p of this.projects) if (p.place) byPlace.set(p.place, [...(byPlace.get(p.place) || []), p]);
    for (const [placeId, list] of byPlace) {
      const place = this.places.get(placeId);
      const layer = this.views[place.view].root.querySelector("[data-lots]");
      const cols = Math.ceil(Math.sqrt(list.length));
      const rows = Math.ceil(list.length / cols);
      list.forEach((p, i) => {
        const lot = this.lots.get(p.id);
        Object.assign(lot.style, { left: `${place.px[0].toFixed(1)}px`, top: `${place.px[1].toFixed(1)}px` });
        lot.style.setProperty("--dx", `${((i % cols) - (cols - 1) / 2) * this.pitch}px`);
        lot.style.setProperty("--dy", `${(Math.floor(i / cols) - (rows - 1) / 2) * this.pitch}px`);
        if (lot.parentElement !== layer) layer.append(lot);
      });
    }
  }

  // stagger in ms between lots; 0 lands everything at once. Returns the number of lots that changed.
  setBuilt(ids, stagger = 0) {
    let i = 0;
    for (const [id, lot] of this.lots) {
      const on = ids.has(id);
      if (on === lot.classList.contains("is-built")) continue;
      lot.style.setProperty("--d", on ? `${(i++) * stagger}ms` : "0ms");
      lot.classList.toggle("is-built", on);
    }
    return i;
  }

  setCurrent(sec) {
    for (const lot of this.lots.values()) lot.classList.toggle("is-current", lot.dataset.sec === sec);
  }

  setMerged(on) {
    this.merged = on;
    for (const v of Object.values(this.views)) v.root.classList.toggle("is-merged", on);
    if (!on) this.closeCluster();
    this.recluster();
  }

  setVisible(ids) {
    this.visible = ids;
    for (const [id, lot] of this.lots) lot.classList.toggle("is-filtered", !ids.has(id));
    this.closeCluster();
    this.recluster();
  }

  recluster() {
    const counts = new Map();
    for (const p of this.projects) if (p.place && this.visible.has(p.id)) counts.set(p.place, (counts.get(p.place) || 0) + 1);
    const clusters = [];
    const ordered = [...counts].map(([id, n]) => ({ place: this.places.get(id), n })).sort((a, b) => b.n - a.n);
    for (const { place, n } of ordered) {
      const hit = clusters.find((c) => c.view === place.view && Math.hypot(c.px[0] - place.px[0], c.px[1] - place.px[1]) < this.radius);
      if (hit) hit.items.push({ place, n });
      else clusters.push({ view: place.view, px: place.px, items: [{ place, n }] });
    }
    for (const c of clusters) {
      c.key = c.items.map((it) => it.place.id).sort().join("+");
      c.total = c.items.reduce((a, it) => a + it.n, 0);
    }
    // Reading order: the Egypt plan north to south, then the inset north to south.
    this.clusters = clusters.sort((a, b) => (a.view === b.view ? a.px[1] - b.px[1] : a.view === "main" ? -1 : 1));
    this.renderPins();
  }

  clusterName(c) {
    return c.items.map((it) => tx(it.place)).join(" · ");
  }

  renderPins() {
    const focusedKey = document.activeElement?.closest?.(".ms-pin")?.dataset.key;
    for (const v of Object.values(this.views)) v.root.querySelector("[data-pins]").replaceChildren();
    for (const c of this.clusters) {
      const btn = this.pinButton(c);
      this.views[c.view].root.querySelector("[data-pins]").append(btn);
      if (c.key === focusedKey) btn.focus({ preventScroll: true });
    }
    const open = this.clusters.find((c) => c.key === this.openKey);
    if (this.openKey && !open) this.closeCluster();
    else if (open) this.openCluster(open);
  }

  pinButton(c) {
    const btn = document.createElement("button");
    const view = this.views[c.view];
    btn.type = "button";
    btn.className = `ms-pin${c.items[0].place.region ? " is-region" : ""}`;
    if (c.px[0] > view.size.w * 0.62) btn.classList.add("is-flip");
    btn.dataset.key = c.key;
    btn.tabIndex = this.merged ? 0 : -1;
    btn.style.left = `${c.px[0].toFixed(1)}px`;
    btn.style.top = `${c.px[1].toFixed(1)}px`;
    btn.style.setProperty("--size", `${Math.round((this.narrow ? 20 : 22) + Math.sqrt(c.total) * 2.6)}px`);
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", `${this.clusterName(c)}: ${countText(c.total)}`);
    btn.innerHTML = `<span class="ms-pin__dot" aria-hidden="true">${c.total}</span><span class="ms-pin__name" aria-hidden="true">${esc(this.clusterName(c))}</span>`;
    btn.addEventListener("click", () => this.handlers.onCluster(c, btn));
    return btn;
  }

  clusterOf(projectId) {
    const p = this.projects.find((x) => x.id === projectId);
    return p?.place ? this.clusters.find((c) => c.items.some((it) => it.place.id === p.place)) || null : null;
  }

  pinFor(key) {
    for (const v of Object.values(this.views)) {
      const hit = [...v.root.querySelectorAll(".ms-pin")].find((b) => b.dataset.key === key);
      if (hit) return hit;
    }
    return null;
  }

  eachPin(fn) {
    for (const v of Object.values(this.views)) v.root.querySelectorAll(".ms-pin").forEach(fn);
  }

  openCluster(c) {
    this.openKey = c.key;
    this.eachPin((b) => {
      const on = b.dataset.key === c.key;
      b.setAttribute("aria-expanded", String(on));
      b.classList.toggle("is-open", on);
    });
    for (const v of Object.values(this.views)) v.root.classList.add("has-open");
    this.drawFan(c);
  }

  closeCluster() {
    this.openKey = null;
    this.eachPin((b) => {
      b.setAttribute("aria-expanded", "false");
      b.classList.remove("is-open");
    });
    for (const v of Object.values(this.views)) {
      v.root.classList.remove("has-open");
      v.root.querySelector("[data-fan]").replaceChildren();
    }
  }

  clusterProjects(c) {
    const ids = new Set(c.items.map((it) => it.place.id));
    return this.projects.filter((p) => ids.has(p.place) && this.visible.has(p.id));
  }

  drawFan(c) {
    for (const v of Object.values(this.views)) v.root.querySelector("[data-fan]").replaceChildren();
    const list = this.clusterProjects(c);
    const view = this.views[c.view];
    const layer = view.root.querySelector("[data-fan]");
    const r = FAN_RADIUS[this.narrow ? "narrow" : "wide"] + list.length * FAN_STEP;
    list.forEach((p, i) => {
      const a = -Math.PI / 2 + (i / list.length) * Math.PI * 2;
      const x = clamp(c.px[0] + Math.cos(a) * r, EDGE, view.size.w - EDGE);
      const y = clamp(c.px[1] + Math.sin(a) * r, EDGE, view.size.h - EDGE);
      layer.append(this.fanItem(p, c.px, [x, y], i));
    });
  }

  // Pointer shortcut only; the card's list is the keyboard path to the same projects.
  fanItem(p, from, to, i) {
    const item = document.createElement("span");
    item.className = "ms-fan";
    item.dataset.id = p.id;
    item.style.setProperty("--i", i);
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
    item.innerHTML = `<i class="ms-fan__leader" style="left:${from[0].toFixed(1)}px;top:${from[1].toFixed(1)}px;width:${len.toFixed(1)}px;transform:rotate(${ang.toFixed(3)}rad)"></i>
      <button type="button" class="ms-fan__mark" tabindex="-1" aria-hidden="true" data-sec="${p.sec}" style="left:${to[0].toFixed(1)}px;top:${to[1].toFixed(1)}px" title="${esc(tx(p.t))} · ${esc(tx(SECTOR_NAMES[p.sec]))}">${icon(p.sec)}</button>`;
    const mark = item.querySelector("button");
    mark.addEventListener("click", () => this.handlers.onProject(p.id, this.pinFor(this.openKey)));
    mark.addEventListener("pointerenter", () => this.handlers.onHoverProject?.(p.id));
    mark.addEventListener("pointerleave", () => this.handlers.onHoverProject?.(null));
    return item;
  }

  setHot(projectId) {
    for (const v of Object.values(this.views)) v.root.querySelectorAll(".ms-fan").forEach((f) => f.classList.toggle("is-hot", f.dataset.id === projectId));
  }
}
