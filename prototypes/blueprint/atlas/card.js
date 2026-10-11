// The card: a cluster's project list, then a project at a glance (name, owner, place, fact chips) with "More".
import { SECTION_LINKS } from "./config.js";
import { UI, SECTOR_NAMES, STATUS, FACT_CHIPS, tx } from "./strings.js";
import { icon } from "./icons.js";

const MORE_WORDS = 25;
const MAX_CHIPS = 4;
const ASSET_ROOT = new URL("../../../", import.meta.url);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isStated = (pair) => pair && pair.en !== "Not stated";
const photoSrc = (src) => new URL(src, ASSET_ROOT).href;
let uid = 0;

function capWords(text) {
  const first = text.split(/(?<=[.!?؟])\s/)[0];
  const words = first.split(/\s+/);
  return words.length <= MORE_WORDS ? first : `${words.slice(0, MORE_WORDS).join(" ")}…`;
}

export class Card {
  constructor(el, { places, projects, handlers }) {
    this.el = el;
    this.body = el.querySelector("[data-body]");
    this.actions = el.querySelector("[data-actions]");
    this.backBtn = el.querySelector("[data-back]");
    this.closeBtn = el.querySelector("[data-close]");
    this.places = places;
    this.projects = projects;
    this.handlers = handlers;
    this.history = [];
    this.view = null;
    this.closeBtn.addEventListener("click", () => this.close());
    this.backBtn.addEventListener("click", () => this.back());
    this.body.addEventListener("click", (e) => this.onClick(e));
    this.actions.addEventListener("click", (e) => this.onClick(e));
    this.body.addEventListener("pointerover", (e) => this.handlers.onHoverProject?.(e.target.closest("[data-open]")?.dataset.open || null));
  }

  get isOpen() {
    return !this.el.hidden;
  }

  // view: { kind: "cluster" | "list" | "project", ...data }
  show(view, trigger, push = false) {
    if (trigger) this.returnFocus = trigger;
    if (push && this.view) this.history.push(this.view);
    else if (!push) this.history = [];
    this.view = view;
    this.render();
    this.el.hidden = false;
    this.el.dataset.kind = view.kind;
    requestAnimationFrame(() => this.el.classList.add("is-open"));
    this.focusHeading();
    this.handlers.onShow?.(view);
  }

  focusHeading() {
    this.body.querySelector("h3")?.focus({ preventScroll: true });
  }

  render() {
    const moreOpen = this.body.querySelector("[data-more]")?.getAttribute("aria-expanded") === "true";
    this.body.innerHTML = this.html(this.view);
    this.actions.innerHTML = this.view.kind === "project" ? actionHtml(this.view.project) : "";
    if (moreOpen && this.view.kind === "project") this.toggleMore(this.body.querySelector("[data-more]"), true);
    const prev = this.history[this.history.length - 1];
    this.backBtn.hidden = !prev;
    this.backBtn.querySelector("span").textContent = prev ? this.titleOf(prev) : "";
    this.backBtn.setAttribute("aria-label", `${tx(UI.back)}: ${prev ? this.titleOf(prev) : ""}`);
    this.closeBtn.setAttribute("aria-label", tx(UI.close));
  }

  // Re-render in place after a language change, keeping focus inside the card.
  refresh() {
    if (!this.view) return;
    const hadFocus = this.el.contains(document.activeElement);
    this.render();
    if (hadFocus) this.focusHeading();
  }

  html(view) {
    if (view.kind === "project") return this.projectHtml(view.project);
    if (view.kind === "cluster") return this.clusterHtml(view.cluster, view.list);
    return this.listHtml(view.list);
  }

  titleOf(view) {
    if (view.kind === "project") return tx(view.project.t);
    if (view.kind === "cluster") return view.cluster.items.map((it) => tx(it.place)).join(" · ");
    return tx(UI.noPlace);
  }

  back() {
    const prev = this.history.pop();
    if (!prev) return;
    this.view = prev;
    this.render();
    this.el.dataset.kind = prev.kind;
    this.focusHeading();
    this.handlers.onShow?.(prev);
  }

  close({ restoreFocus = true } = {}) {
    if (this.el.hidden) return;
    this.el.classList.remove("is-open");
    this.el.hidden = true;
    this.view = null;
    this.history = [];
    this.handlers.onClose?.();
    if (restoreFocus && this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }

  onClick(e) {
    const open = e.target.closest("[data-open]");
    if (open) return this.showProject(this.projects.get(open.dataset.open), null, true);
    const more = e.target.closest("[data-more]");
    if (more) return this.toggleMore(more);
    const section = e.target.closest("[data-section]");
    if (section) return this.handlers.onOpenProject(section.dataset.section);
    const all = e.target.closest("[data-all]");
    if (all) this.handlers.onShowAllProjects(all.dataset.all);
  }

  toggleMore(btn, force) {
    const on = force ?? btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(on));
    document.getElementById(btn.getAttribute("aria-controls")).hidden = !on;
  }

  showCluster(cluster, list, trigger) {
    this.show({ kind: "cluster", cluster, list }, trigger, false);
  }

  showList(list, trigger) {
    this.show({ kind: "list", list }, trigger, false);
  }

  showProject(project, trigger, push = false) {
    this.show({ kind: "project", project }, trigger, push);
  }

  clusterHtml(cluster, list) {
    const region = cluster.items.some((it) => it.place.region);
    const groups = cluster.items.map((it) => ({ place: it.place, rows: list.filter((p) => p.place === it.place.id) }));
    const rows = groups.map((g) => `${groups.length > 1 ? `<li class="ms-list__head">${esc(tx(g.place))} · ${g.rows.length}</li>` : ""}${g.rows.map(rowHtml).join("")}`).join("");
    return `<p class="ms-card__eyebrow">${icon("place")}<b>${list.length}</b>${region ? `<span class="ms-tag">${esc(tx(UI.regionOnly))}</span>` : ""}</p>
      <h3 id="ms-card-h" tabindex="-1">${esc(this.titleOf({ kind: "cluster", cluster }))}</h3>
      <ol class="ms-list">${rows}</ol>`;
  }

  listHtml(list) {
    return `<p class="ms-card__eyebrow">${icon("unknownPlace")}<b>${list.length}</b></p>
      <h3 id="ms-card-h" tabindex="-1">${esc(tx(UI.noPlace))}</h3><ol class="ms-list">${list.map(rowHtml).join("")}</ol>`;
  }

  projectHtml(p) {
    const place = p.place ? this.places.get(p.place) : null;
    const moreId = `ms-more-${++uid}`;
    const more = this.moreHtml(p);
    const meta = [
      isStated(p.c) ? `<li>${icon("owner")}<span>${esc(tx(p.c))}</span></li>` : "",
      `<li>${icon(place ? "place" : "unknownPlace")}<span>${esc(place ? tx(place) : tx(UI.noPlace))}</span></li>`,
    ].join("");
    return `<p class="ms-card__eyebrow" data-sec="${p.sec}">${icon(p.sec)}<span>${esc(tx(SECTOR_NAMES[p.sec]))}</span></p>
      <h3 id="ms-card-h" tabindex="-1">${esc(tx(p.t))}</h3>
      <ul class="ms-meta">${meta}</ul>
      <ul class="ms-chips">${chipsFor(p).map(chipHtml).join("")}</ul>
      ${more ? `<button type="button" class="ms-more" data-more aria-expanded="false" aria-controls="${moreId}">${icon("more")}<span>${esc(tx(UI.more))}</span></button>
      <div class="ms-more__body" id="${moreId}" hidden>${more}</div>` : ""}`;
  }

  moreHtml(p) {
    const lines = [];
    if (p.sc) lines.push(`<p class="ms-scope">${esc(capWords(tx(p.sc)))}</p>`);
    if (p.st === "conflict") lines.push(`<p class="ms-note">${esc(tx(UI.conflict))}</p>`);
    else if (isStated(p.s) && !PLAIN_STATUS.has(p.s.en)) lines.push(`<p class="ms-note">${icon(p.st)}${esc(tx(p.s))}</p>`);
    return lines.join("") + photosHtml(p);
  }
}

// Status wordings that add nothing to the chip
const PLAIN_STATUS = new Set(["Completed and handed over", "Ongoing", "Under development"]);

function chipsFor(p) {
  const chips = [...(FACT_CHIPS[p.id] || FACT_CHIPS[p.parent] || [])];
  if (p.cap) chips.push({ i: "capacity", n: p.cap.toLocaleString("en-US"), l: UI.perDay });
  chips.push({ i: p.st, l: STATUS[p.st] });
  if (p.img?.length && chips.length < MAX_CHIPS) chips.push({ i: "photo", n: String(p.img.length), l: UI.photos });
  return chips.slice(0, MAX_CHIPS);
}

function chipHtml(c) {
  return `<li class="ms-chip" data-kind="${c.i}">${icon(c.i)}${c.n ? `<b>${esc(tx(c.n))}</b>` : ""}${tx(c.l) ? `<span>${esc(tx(c.l))}</span>` : ""}</li>`;
}

function rowHtml(p) {
  return `<li><button type="button" class="ms-row" data-open="${p.id}" data-sec="${p.sec}">${icon(p.sec)}<span>${esc(tx(p.t))}</span><span class="ms-row__st" data-kind="${p.st}" title="${esc(tx(STATUS[p.st]))}">${icon(p.st)}</span></button></li>`;
}

function photosHtml(p) {
  if (!p.img?.length) return "";
  const n = p.img.length;
  // Thumbnails open the page's shared lightbox (lightbox.js), grouped per project.
  const thumbs = p.img.map((ph, i) => `<li><button type="button" class="ms-thumb" data-lightbox="map-${p.id}" aria-label="${esc(tx(UI.photo))} ${i + 1} / ${n}: ${esc(tx(ph.alt))}"><img src="${photoSrc(ph.src)}" width="${ph.w}" height="${ph.h}" alt="${esc(tx(ph.alt))}" loading="lazy" decoding="async"></button></li>`).join("");
  return `<ul class="ms-thumbs">${thumbs}</ul>`;
}

function actionHtml(p) {
  const section = SECTION_LINKS[p.id] || (p.parent && SECTION_LINKS[p.parent]);
  if (section) return `<button type="button" class="ms-btn" data-section="${section}">${icon("open")}<span>${esc(tx(UI.viewProject))}</span></button>`;
  return `<button type="button" class="ms-btn ms-btn--ghost" data-all="${p.id}">${icon("list")}<span>${esc(tx(UI.seeAll))}</span></button>`;
}
