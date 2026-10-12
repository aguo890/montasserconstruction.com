// The construction sequence: Plan → Drawing → Print → Built, as a pure function of one progress value
// p ∈ [0, 4]. Stage i runs over [i, i + 1]; p = 1, 2, 3 and 4 are the held states (plan, drawing, printed,
// built). applyBuild(rig, p) sets every uniform, light, pass and visibility for p; poseAt(p, poses) gives the
// scripted camera; createRunner() moves p over time, giving each stage its share of the duration.
import { Color, MathUtils } from 'three';
import { EASE, FOV, defaultPose, fitDistance, fitSheetDistance, mixPose, offsetPose } from './motion.js';

export const BUILT = 4;
const STAGE_MS = [1000, 1000, 1100, 900];
const CUT_MARGIN = 0.01;
const PAINT_SOFT = 0.05;
const FLAT = 0.001;
const PLAN_TONE = 0.4;
const REVEAL_OVERSHOOT = 1.05;
const OPEN = 1e3;
const INK = { drawing: 0.85, ghost: 0.5 };
const AO = { print: 0.75, built: 0.9 };
const SHADOW_OPACITY = 0.22;
const PAINT_GLOW = 0.55;
const GANTRY = { drop: 0.45, lift: 1.4, gone: 0.45 };
const KEY = { print: 1.5, built: 2.3 };
const KEY_NEUTRAL = new Color('#ffffff');
const KEY_WARM = new Color('#ffeedb');
const PLAN = { fov: 14, phi: 0.002, margin: 1.22, zoom: 1.05 };
const AXO = { turn: 26, rise: 6, scale: 1.12, drift: 16 };

const clamp01 = (x) => MathUtils.clamp(x, 0, 1);
/** Local progress of t within [a, b]. */
const win = (t, a, b) => clamp01((t - a) / (b - a));
/** Per-stage local progress for p. */
const locals = (p) => [0, 1, 2, 3].map((i) => clamp01(p - i));
const bandStrength = (t) => MathUtils.smoothstep(t, 0, 0.08) * (1 - MathUtils.smoothstep(t, 0.9, 1));

/* ---------- state ---------- */

function applyPlanAndDrawing({ model, uniforms: u, plan: sheet }, [plan, draw, print]) {
  u.uReveal.value = plan >= 1 ? OPEN : model.radius * REVEAL_OVERSHOOT * EASE.outCubic(win(plan, 0, 0.6));
  const extrude = MathUtils.lerp(FLAT, 1, EASE.inOutCubic(win(draw, 0.08, 0.92)));
  model.group.scale.y = extrude;
  u.uExtrude.value = extrude;
  u.uTone.value = MathUtils.lerp(PLAN_TONE, 1, win(draw, 0.2, 0.9));
  sheet.set(win(plan, 0.12, 1), 1 - win(print, 0, 0.3));
}

const gantryLift = (print, built) => (1 - EASE.outCubic(win(print, 0, 0.12))) * GANTRY.drop + EASE.inCubic(win(built, 0, 0.42)) * GANTRY.lift;

function applyPrint({ uniforms: u, gantry, ground }, [, , print, built], { top, bottom }) {
  const cut = win(print, 0.06, 0.94);
  u.uPrint.value = MathUtils.lerp(bottom, top, EASE.inOutSine(cut));
  u.uBandOn.value = print > 0 && print < 1 ? bandStrength(cut) : 0;
  ground.setBed(win(print, 0, 0.2) * (1 - win(built, 0.25, 0.7)));
  const isGantryShown = print > 0 && built < GANTRY.gone;
  gantry.show(isGantryShown);
  if (!isGantryShown) return;
  const glow = win(print, 0, 0.1) * (1 - win(print, 0.9, 1));
  gantry.set({ y: u.uPrint.value, phase: cut, lift: gantryLift(print, built), glow });
}

function applyBuilt({ uniforms: u, ground, post, key }, [, , print, built], { bottom, reach }) {
  const sweep = win(built, 0.04, 0.62);
  u.uPaint.value = MathUtils.lerp(bottom - PAINT_SOFT, reach + PAINT_SOFT, EASE.inOutCubic(sweep));
  u.uPaintOn.value = built > 0 && built < 1 ? bandStrength(sweep) * PAINT_GLOW : 0;
  u.uLayer.value = 1 - win(built, 0.3, 0.8);
  ground.setShadow(SHADOW_OPACITY * win(built, 0.3, 1));
  post.setAo(AO.print * win(print, 0, 0.3) + (AO.built - AO.print) * win(built, 0.3, 1));
  const warm = win(built, 0.2, 0.9);
  key.intensity = MathUtils.lerp(KEY.print, KEY.built, warm);
  key.color.lerpColors(KEY_NEUTRAL, KEY_WARM, warm);
}

/** Draws only what can show: the drawing until printed, the printed layer while uncovered, each built model. */
function applyVisibility({ model, uniforms: u, post }, p, { top, bottom, reach }) {
  const isPainted = u.uPaint.value > bottom - PAINT_SOFT / 2;
  const hasDrawing = u.uPrint.value < top;
  model.show({
    drawing: hasDrawing,
    printed: u.uPrint.value > bottom && u.uPaint.value < reach + PAINT_SOFT / 2,
    built: isPainted && u.uHqMix.value < 1,
    hq: isPainted && model.hasHq && u.uHqMix.value > 0,
  });
  const [, , print] = locals(p);
  post.setInk(p > 0 && hasDrawing ? MathUtils.lerp(INK.drawing, INK.ghost, win(print, 0, 0.4)) : 0);
}

/** Sets the whole stage for progress p (model, materials, plan, gantry, ground, lights, passes). */
export function applyBuild(rig, p) {
  if (!rig.model) return;
  const top = rig.model.height + CUT_MARGIN;
  // The colour front measures height plus uRadial × distance from the axis, so it ends past the far corners.
  const reach = top + rig.uniforms.uRadial.value * Math.hypot(...rig.model.footprint) / 2;
  const heights = { top, bottom: -CUT_MARGIN, reach };
  const stages = locals(p);
  applyPlanAndDrawing(rig, stages);
  applyPrint(rig, stages, heights);
  applyBuilt(rig, stages, heights);
  applyVisibility(rig, p, heights);
}

/* ---------- camera ---------- */

/**
 * The plan is drawn square to the model: the plan camera looks down along the model axis nearest the
 * axonometric's azimuth, so the swing into Drawing turns at most 45°. quarter is how many 90° turns that is.
 */
export function planAxis(yaw) {
  const axoTheta = offsetPose(defaultPose(1, 0), { azimuth: -AXO.turn }).theta;
  const quarter = Math.round((axoTheta - yaw) / (Math.PI / 2));
  return { theta: yaw + (quarter * Math.PI) / 2, isTurned: Math.abs(quarter) % 2 === 1 };
}

/** The three anchor poses for a model: plan (straight down, narrow), axonometric and home. */
export function posesFor(model, camera, { theta, sheet }) {
  const home = defaultPose(fitDistance(model.radius, camera, FOV), model.height / 2);
  const axo = offsetPose(home, { azimuth: -AXO.turn, elevation: AXO.rise, scale: AXO.scale });
  const plan = { theta, phi: PLAN.phi, radius: fitSheetDistance(sheet, camera, PLAN.fov, PLAN.margin), y: 0, fov: PLAN.fov };
  return { home, axo, plan };
}

/** The scripted camera at progress p: hold the plan, swing to the axonometric, drift, then settle home. */
export function poseAt(p, { plan, axo, home }) {
  const [planT, draw, print, built] = locals(p);
  if (p <= 1) return offsetPose(plan, { scale: MathUtils.lerp(PLAN.zoom, 1, EASE.outCubic(planT)) });
  if (p <= 2) return mixPose(plan, axo, EASE.inOutCubic(draw));
  const drifted = offsetPose(axo, { azimuth: AXO.drift * EASE.inOutSine(print) });
  if (p <= 3) return drifted;
  return mixPose(drifted, home, EASE.outCubic(built));
}

/* ---------- runner ---------- */

/** Milliseconds the stages between a and b take at normal pace. */
function msBetween(a, b) {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return STAGE_MS.reduce((sum, ms, i) => sum + Math.max(0, Math.min(hi, i + 1) - Math.max(lo, i)) * ms, 0);
}

/** Progress after `elapsed` normal-pace milliseconds walking from `from` toward `to`. */
function progressAt(from, to, elapsed) {
  const dir = Math.sign(to - from);
  let p = from;
  let left = elapsed;
  while (dir && left > 0 && p !== to) {
    const stage = dir > 0 ? Math.floor(p) : Math.ceil(p) - 1;
    const edge = dir > 0 ? Math.min(stage + 1, to) : Math.max(stage, to);
    const ms = Math.abs(edge - p) * STAGE_MS[stage];
    if (left < ms) return p + (dir * left) / STAGE_MS[stage];
    left -= ms;
    p = edge;
  }
  return dir ? Math.min(Math.max(p, Math.min(from, to)), Math.max(from, to)) : p;
}

/**
 * Moves p over time. apply(p, elapsedMs) runs for every new value (elapsed is Infinity for jumps);
 * settled(p) runs when a move ends. pace scales the normal stage time; duration overrides it.
 */
export function createRunner({ apply, settled }) {
  const s = { p: BUILT, from: BUILT, to: BUILT, start: 0, total: 0, duration: 0, running: false };

  function land(p) {
    Object.assign(s, { p, from: p, to: p, running: false });
    apply(p, Infinity);
    settled(p);
  }

  function play(to, { from = s.p, pace = 1, duration } = {}) {
    const total = msBetween(from, to);
    Object.assign(s, { from, to, p: from, total, start: performance.now(), duration: duration ?? total * pace });
    s.running = total > 0 && s.duration > 0;
    if (!s.running) { land(to); return; }
    apply(from, 0);
  }

  function step(now) {
    if (!s.running) return false;
    const elapsed = now - s.start;
    const k = clamp01(elapsed / s.duration);
    s.p = progressAt(s.from, s.to, k * s.total);
    if (k >= 1) { land(s.to); return false; }
    apply(s.p, elapsed);
    return true;
  }

  return {
    play,
    step,
    jump: land,
    finish: () => { if (s.running) land(s.to); },
    stop: () => { s.running = false; },
    progress: () => s.p,
    target: () => s.to,
    isRunning: () => s.running,
  };
}
