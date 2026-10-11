// Scroll build-up: the stage pins while its runway scrolls; Next, Back and the arrow keys move the same scroll.

// Next follows the reading direction: right arrow in English, left arrow in Arabic.
const keyStep = (key) => {
  const forward = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const backward = forward === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
  return key === forward ? 1 : key === backward ? -1 : 0;
};

export class BuildController {
  constructor({ runway, stage, last, reduced, onStep }) {
    this.runway = runway;
    this.stage = stage;
    this.last = last;
    this.reduced = reduced;
    this.onStep = onStep;
    this.step = reduced ? last : -1;
    this.queued = false;
    if (reduced) return;
    addEventListener("scroll", () => this.queue(), { passive: true });
    addEventListener("resize", () => this.queue());
    stage.addEventListener("keydown", (e) => this.onKey(e));
    this.queue();
  }

  queue() {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.sync();
    });
  }

  range() {
    const top = this.runway.getBoundingClientRect().top + scrollY;
    const stick = parseFloat(getComputedStyle(this.stage).top) || 0;
    const start = top - stick;
    const end = start + this.runway.offsetHeight - this.stage.offsetHeight;
    return { start, end: Math.max(start + 1, end) };
  }

  progress() {
    const { start, end } = this.range();
    return Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
  }

  sync() {
    const next = Math.round(this.progress() * this.last);
    if (next === this.step) return;
    const prev = this.step;
    this.step = next;
    this.onStep(next, prev);
  }

  goTo(k) {
    const target = Math.max(0, Math.min(this.last, k));
    if (this.reduced) return;
    const { start, end } = this.range();
    const top = start + (target / this.last) * (end - start) + 1;
    scrollTo({ top, behavior: "smooth" });
  }

  onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select, [contenteditable], [data-card], [data-filter-panel]")) return;
    const inSteps = e.target.closest("[data-steps]");
    const step = keyStep(e.key);
    if (step) {
      e.preventDefault();
      this.goTo(this.step + step);
    } else if (inSteps && (e.key === "Home" || e.key === "End")) {
      e.preventDefault();
      this.goTo(e.key === "Home" ? 0 : this.last);
    }
  }
}
