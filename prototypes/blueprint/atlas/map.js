// Map module: Egypt inks itself in, projects are built onto it sector by sector, then city clusters open to cards.
import { PROJECTS, PLACES } from "./data.js";
import { SECTOR_ORDER, EGYPT_BOUNDS, DETAIL_BOUNDS } from "./config.js";
import { UI, SECTOR_NAMES, tx, getLang } from "./strings.js";
import { icon } from "./icons.js";
import { createProjection } from "./geo.js";
import { MapView, buildPaths } from "./view.js";
import { Markers } from "./markers.js";
import { Card } from "./card.js";
import { BuildController } from "./build.js";

const DATA_URL = new URL("./map/map-data.json", import.meta.url);
const LAST = SECTOR_ORDER.length + 1;
const BUILD_MS = 700;
const LENS_MIN_PX = 14;
const LENS_PX_PER_SQRT = 0.5;

const viewMarkup = (kind) => `
  <div class="ms-view ms-view--${kind}" data-view="${kind}">
    <svg class="ms-map" aria-hidden="true" focusable="false"></svg>
    <div class="ms-layer" data-lens></div>
    <div class="ms-layer" data-lots></div>
    <div class="ms-layer" data-fan></div>
    <div class="ms-layer ms-layer--pins" data-pins></div>
    ${kind === "detail" ? `<p class="ms-view__label" data-t="insetLabel"></p>` : `<div class="ms-scale" aria-hidden="true"><i data-scale-bar></i><span data-scale-label></span></div>
    <svg class="ms-north" viewBox="0 0 24 32" aria-hidden="true"><path d="M12 2l6 20-6-4-6 4z"/><text x="12" y="31" text-anchor="middle">N</text></svg>`}
  </div>`;

const stepButton = (sec, i) => `<li><button type="button" class="ms-step" data-step="${i + 1}" data-sec="${sec}">${icon(sec)}<span class="ms-step__name" data-sector-name="${sec}"></span><b data-sector-count="${sec}"></b></button></li>`;
const filterButton = (sec) => `<button type="button" class="ms-fbtn" data-filter="${sec}" data-sec="${sec}" aria-pressed="true">${icon(sec)}<span data-sector-name="${sec}"></span><b data-sector-count="${sec}"></b></button>`;

const TEMPLATE = `
<div class="ms">
  <header class="ms-head">
    <p class="ms-kicker"><svg class="ms-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4zM3.5 7.4L12 12.3l8.5-4.9M12 12.3v9.2M7.5 9.7v7.2M16.5 9.7v7.2"/></svg><span data-t="kicker"></span></p>
    <h2 class="ms-title" id="ms-title" data-t="title"></h2>
  </header>
  <div class="ms-runway" data-runway>
    <div class="ms-stage" data-stage>
      <div class="ms-plate" role="group" data-plate>
        ${viewMarkup("main")}
        ${viewMarkup("detail")}
      </div>
      <div class="ms-rail">
        <p class="ms-now" aria-live="polite" data-now></p>
        <div class="ms-ctrl" data-steps>
          <button type="button" class="ms-cbtn" data-prev>${icon("back", "ms-ico ms-dir")}<span data-t="back"></span></button>
          <button type="button" class="ms-cbtn ms-cbtn--fill" data-next><span data-t="next"></span>${icon("next", "ms-ico ms-dir")}</button>
          <button type="button" class="ms-cbtn ms-cbtn--quiet" data-skip><span data-t="showAll"></span></button>
        </div>
        <ol class="ms-steps" data-step-list>${SECTOR_ORDER.map(stepButton).join("")}</ol>
        <div class="ms-foot">
          <button type="button" class="ms-hold" data-hold>${icon("unknownPlace")}<span data-t="noPlace"></span><b data-hold-count></b><span class="ms-hold__lots" data-hold-lots aria-hidden="true"></span></button>
          <div class="ms-filter">
            <button type="button" class="ms-cbtn ms-cbtn--quiet" data-filter-toggle aria-expanded="false" aria-controls="ms-filter-panel">${icon("filter")}<span data-t="filter"></span></button>
            <div class="ms-filter__panel" id="ms-filter-panel" data-filter-panel hidden>
              <button type="button" class="ms-fbtn ms-fbtn--all" data-filter-all aria-pressed="true">${icon("all")}<span data-t="allSectors"></span></button>
              ${SECTOR_ORDER.map(filterButton).join("")}
              <button type="button" class="ms-fbtn ms-fbtn--lens" data-lens-toggle aria-pressed="false">${icon("capacity")}<span data-t="capacity"></span></button>
            </div>
          </div>
        </div>
      </div>
      <aside class="ms-card" data-card aria-labelledby="ms-card-h" hidden>
        <div class="ms-card__bar">
          <button type="button" class="ms-card__back" data-back hidden>${icon("back", "ms-ico ms-dir")}<span></span></button>
          <button type="button" class="ms-card__close" data-close>${icon("close")}</button>
        </div>
        <div class="ms-card__body" data-body></div>
        <div class="ms-card__actions" data-actions></div>
      </aside>
    </div>
  </div>
</div>`;

export function mountMap(rootEl, { onOpenProject = () => {}, onShowAllProjects = () => {} } = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  rootEl.hidden = false;
  rootEl.classList.add("ms-root");
  rootEl.classList.toggle("is-reduced", reduced);
  rootEl.innerHTML = TEMPLATE;
  if (!rootEl.hasAttribute("aria-labelledby")) rootEl.setAttribute("aria-labelledby", "ms-title");
  const app = new MapModule(rootEl, { reduced, onOpenProject, onShowAllProjects });
  const ready = fetch(DATA_URL).then((r) => {
    if (!r.ok) throw new Error(`Map data ${r.status}`);
    return r.json();
  }).then((data) => app.start(data));
  ready.catch((err) => {
    console.error(err);
    rootEl.classList.add("is-failed");
  });
  return { ready, destroy: () => app.destroy() };
}

class MapModule {
  constructor(root, { reduced, onOpenProject, onShowAllProjects }) {
    this.root = root;
    this.reduced = reduced;
    this.callbacks = { onOpenProject, onShowAllProjects };
    this.q = (sel) => root.querySelector(sel);
    this.projects = new Map(PROJECTS.map((p) => [p.id, p]));
    this.sectorCount = Object.fromEntries(SECTOR_ORDER.map((s) => [s, PROJECTS.filter((p) => p.sec === s).length]));
    this.located = PROJECTS.filter((p) => p.place).length;
    this.filter = new Set(SECTOR_ORDER);
    this.lensOn = false;
    this.step = reduced ? LAST : 0;
    this.onLang = () => this.applyLang();
    this.onKeydown = (e) => this.handleKeydown(e);
    this.applyLang();
  }

  start(data) {
    const proj = createProjection(data.proj);
    const paths = buildPaths(data);
    this.places = new Map(PLACES.map((p) => [p.id, { ...p, xy: proj.project(p.lng, p.lat) }]));
    this.views = {
      main: new MapView(this.q('[data-view="main"]'), { kind: "main", proj, paths, bounds: EGYPT_BOUNDS }),
      detail: new MapView(this.q('[data-view="detail"]'), { kind: "detail", proj, paths, bounds: DETAIL_BOUNDS }),
    };
    this.markers = new Markers({
      views: this.views,
      places: this.places,
      projects: PROJECTS,
      holdEl: this.q("[data-hold]"),
      handlers: {
        onCluster: (c, btn) => this.openCluster(c, btn),
        onProject: (id, trigger) => this.card.showProject(this.projects.get(id), trigger, this.card.view?.kind === "cluster"),
        onHoverProject: (id) => this.markers.setHot(id),
      },
    });
    this.card = new Card(this.q("[data-card]"), {
      places: this.places,
      projects: this.projects,
      handlers: {
        onShow: (view) => this.onCardShow(view),
        onClose: () => this.markers.closeCluster(),
        onOpenProject: (id) => this.callbacks.onOpenProject(id),
        onShowAllProjects: (id) => this.callbacks.onShowAllProjects(id),
      },
    });
    this.layout();
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.q("[data-plate]"));
    this.bindControls();
    this.build = new BuildController({
      runway: this.q("[data-runway]"),
      stage: this.q("[data-stage]"),
      last: LAST,
      reduced: this.reduced,
      onStep: (k, prev) => this.setStep(k, prev),
    });
    this.setStep(this.step, -1);
    this.inkWhenSeen();
    addEventListener("montaser:langchange", this.onLang);
    this.root.classList.add("is-ready");
  }

  destroy() {
    removeEventListener("montaser:langchange", this.onLang);
    this.resizeObserver?.disconnect();
    this.inkObserver?.disconnect();
  }

  inkWhenSeen() {
    if (this.reduced || !("IntersectionObserver" in window)) {
      this.root.classList.add("is-inked");
      return;
    }
    this.inkObserver = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      this.root.classList.add("is-inked");
      this.inkObserver.disconnect();
    }, { threshold: 0.25 });
    this.inkObserver.observe(this.q("[data-plate]"));
  }

  layout() {
    const vb = this.views.detail.layout();
    this.views.main.layout();
    this.views.main.setDetailFrame(vb);
    this.markers.layout();
    this.drawLens();
  }

  bindControls() {
    this.q("[data-next]").addEventListener("click", () => this.build.goTo(this.step + 1));
    this.q("[data-prev]").addEventListener("click", () => this.build.goTo(this.step - 1));
    this.q("[data-skip]").addEventListener("click", () => this.build.goTo(this.step === LAST ? 0 : LAST));
    this.q("[data-step-list]").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-step]");
      if (btn) this.build.goTo(Number(btn.dataset.step));
    });
    this.q("[data-hold]").addEventListener("click", (e) => this.showHold(e.currentTarget));
    const toggle = this.q("[data-filter-toggle]");
    toggle.addEventListener("click", () => this.setFilterOpen(toggle.getAttribute("aria-expanded") !== "true"));
    this.q("[data-filter-panel]").addEventListener("click", (e) => this.onFilterClick(e));
    this.root.addEventListener("keydown", this.onKeydown);
  }

  handleKeydown(e) {
    if (e.key !== "Escape") return;
    if (this.card?.isOpen) {
      e.stopPropagation();
      this.card.close();
    } else if (!this.q("[data-filter-panel]").hidden) {
      e.stopPropagation();
      this.setFilterOpen(false);
      this.q("[data-filter-toggle]").focus();
    }
  }

  // k: 0 arrive, 1..n one sector each, LAST all built and grouped by city
  setStep(k, prev) {
    this.step = k;
    const built = new Set(SECTOR_ORDER.slice(0, Math.min(k, SECTOR_ORDER.length)));
    const ids = new Set(PROJECTS.filter((p) => built.has(p.sec)).map((p) => p.id));
    const animate = !this.reduced && k > prev && prev >= 0;
    const changed = PROJECTS.filter((p) => ids.has(p.id) && !this.markers.lots.get(p.id).classList.contains("is-built")).length;
    this.markers.setBuilt(ids, animate && changed ? Math.min(60, BUILD_MS / changed) : 0);
    this.markers.setCurrent(k >= 1 && k <= SECTOR_ORDER.length ? SECTOR_ORDER[k - 1] : null);
    if ((k === LAST) !== this.markers.merged) this.markers.setMerged(k === LAST);
    if (k !== LAST && this.card.isOpen) this.card.close({ restoreFocus: false });
    this.root.dataset.step = String(k);
    this.renderNow();
    this.renderSteps(built);
    this.renderHold(ids);
  }

  renderNow() {
    const k = this.step;
    const now = this.q("[data-now]");
    if (k === 0) now.innerHTML = `${icon("next", "ms-ico ms-dir")}<span class="ms-now__hint">${tx(UI.scroll)}</span>`;
    else if (k === LAST) now.innerHTML = `${icon("place")}<b>${this.located}</b><span>${tx(UI.across)}</span>`;
    else {
      const sec = SECTOR_ORDER[k - 1];
      now.innerHTML = `${icon(sec)}<b>${this.sectorCount[sec]}</b><span>${tx(SECTOR_NAMES[sec])}</span>`;
    }
    now.dataset.sec = k >= 1 && k < LAST ? SECTOR_ORDER[k - 1] : "";
    this.q("[data-prev]").disabled = k === 0;
    this.q("[data-next]").disabled = k === LAST;
    this.q("[data-skip] span").textContent = tx(k === LAST ? UI.replay : UI.showAll);
  }

  renderSteps(built) {
    this.root.querySelectorAll("[data-step]").forEach((btn) => {
      const sec = btn.dataset.sec;
      btn.classList.toggle("is-built", built.has(sec));
      btn.disabled = this.reduced;
      if (Number(btn.dataset.step) === this.step) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
    });
  }

  renderHold(builtIds) {
    const visible = PROJECTS.filter((p) => !p.place && this.filter.has(p.sec));
    const shown = this.step === LAST ? visible.length : visible.filter((p) => builtIds.has(p.id)).length;
    this.q("[data-hold-count]").textContent = shown ? String(shown) : "";
  }

  showHold(trigger) {
    const list = PROJECTS.filter((p) => !p.place && this.filter.has(p.sec));
    this.markers.closeCluster();
    this.card.showList(list, trigger);
  }

  openCluster(c, btn) {
    if (this.markers.openKey === c.key && this.card.isOpen) {
      this.card.close();
      return;
    }
    this.markers.openCluster(c);
    this.card.showCluster(c, this.markers.clusterProjects(c), btn);
  }

  onCardShow(view) {
    if (view.kind === "cluster") this.markers.openCluster(view.cluster);
    if (view.kind !== "project") return;
    const c = this.markers.clusterOf(view.project.id);
    if (c) this.markers.openCluster(c);
    this.markers.setHot(view.project.id);
  }

  setFilterOpen(on) {
    this.q("[data-filter-toggle]").setAttribute("aria-expanded", String(on));
    this.q("[data-filter-panel]").hidden = !on;
    this.root.classList.toggle("is-filtering", on);
  }

  onFilterClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.hasAttribute("data-lens-toggle")) {
      this.lensOn = !this.lensOn;
      btn.setAttribute("aria-pressed", String(this.lensOn));
      this.drawLens();
      return;
    }
    if (btn.hasAttribute("data-filter-all")) this.filter = new Set(SECTOR_ORDER);
    else {
      const next = new Set(this.filter);
      const sec = btn.dataset.filter;
      if (next.size === SECTOR_ORDER.length) next.clear();
      if (next.has(sec)) next.delete(sec);
      else next.add(sec);
      this.filter = next.size ? next : new Set(SECTOR_ORDER);
    }
    this.applyFilter();
  }

  applyFilter() {
    const all = this.filter.size === SECTOR_ORDER.length;
    this.q("[data-filter-all]").setAttribute("aria-pressed", String(all));
    this.root.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(!all && this.filter.has(b.dataset.filter))));
    this.card.close({ restoreFocus: false });
    this.markers.setVisible(new Set(PROJECTS.filter((p) => this.filter.has(p.sec)).map((p) => p.id)));
    this.setStep(this.step, this.step);
  }

  // Desalination capacity circles: area proportional to stated m³/day, summed per place.
  drawLens() {
    if (!this.views) return;
    for (const v of Object.values(this.views)) v.root.querySelector("[data-lens]").replaceChildren();
    this.root.classList.toggle("has-lens", this.lensOn);
    if (!this.lensOn) return;
    const byPlace = new Map();
    for (const p of PROJECTS) if (p.cap && p.place) byPlace.set(p.place, (byPlace.get(p.place) || 0) + p.cap);
    for (const [id, cap] of byPlace) {
      const place = this.places.get(id);
      const d = Math.round(LENS_MIN_PX + Math.sqrt(cap) * LENS_PX_PER_SQRT) * 2;
      const ring = document.createElement("span");
      ring.className = "ms-ring";
      Object.assign(ring.style, { left: `${place.px[0]}px`, top: `${place.px[1]}px`, width: `${d}px`, height: `${d}px` });
      ring.innerHTML = `<b>${cap.toLocaleString("en-US")}</b><small>${tx(UI.perDay)}</small>`;
      this.views[place.view].root.querySelector("[data-lens]").append(ring);
    }
  }

  applyLang() {
    const r = this.root;
    r.querySelectorAll("[data-t]").forEach((n) => { n.textContent = tx(UI[n.dataset.t]); });
    r.querySelectorAll("[data-sector-name]").forEach((n) => { n.textContent = tx(SECTOR_NAMES[n.dataset.sectorName]); });
    r.querySelectorAll("[data-sector-count]").forEach((n) => { n.textContent = String(this.sectorCount[n.dataset.sectorCount]); });
    r.querySelectorAll("[data-step]").forEach((b) => b.setAttribute("aria-label", `${tx(SECTOR_NAMES[b.dataset.sec])}: ${this.sectorCount[b.dataset.sec]}`));
    this.q("[data-plate]").setAttribute("aria-label", tx(UI.mapLabel));
    this.q("[data-steps]").setAttribute("aria-label", tx(UI.steps));
    r.dataset.lang = getLang();
    if (!this.views) return;
    for (const v of Object.values(this.views)) {
      v.drawLabels();
      v.updateScale();
    }
    this.markers.recluster();
    this.renderNow();
    this.drawLens();
    this.card.refresh();
  }
}
