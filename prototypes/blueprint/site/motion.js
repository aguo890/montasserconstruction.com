// Camera poses (spherical around the model's vertical axis, with a field of view) and a small time-based tween
// runner. Blending two poses keeps the framed size continuous while the field of view changes, so the narrow,
// near-orthographic plan view opens into the axonometric without a zoom jolt.
import { MathUtils, Spherical, Vector3 } from 'three';

export const FOV = 35;
const AZIMUTH_DEG = 35;
const ELEVATION_DEG = 28;
const FIT_MARGIN = 1.15;
const deg = MathUtils.degToRad;
const halfTan = (fov) => Math.tan(deg(fov / 2));

export const EASE = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/** Distance at which a sphere of this radius fits the view with a 15% margin, at the given field of view. */
export function fitDistance(radius, camera, fov = camera.fov) {
  const half = deg(fov / 2);
  const horizontal = Math.atan(Math.tan(half) * camera.aspect);
  return (radius * FIT_MARGIN) / Math.sin(Math.min(half, horizontal));
}

/** Distance at which a flat width × depth sheet seen from straight above fills the view, with a margin. */
export function fitSheetDistance([width, depth], camera, fov, margin) {
  const tan = halfTan(fov);
  return (Math.max(depth / 2, width / 2 / camera.aspect) * margin) / tan;
}

/** The default view: azimuth +35° (from +Z toward +X), elevation 28°, looking at the model centre. */
export function defaultPose(distance, centreY) {
  return { theta: deg(AZIMUTH_DEG), phi: deg(90 - ELEVATION_DEG), radius: distance, y: centreY, fov: FOV };
}

/** The same pose moved by degrees of azimuth and elevation and scaled in distance. */
export function offsetPose(pose, { azimuth = 0, elevation = 0, scale = 1 }) {
  return { ...pose, theta: pose.theta + deg(azimuth), phi: pose.phi - deg(elevation), radius: pose.radius * scale };
}

const sph = new Spherical();
const offset = new Vector3();

export function applyPose(camera, target, pose) {
  target.set(0, pose.y, 0);
  sph.set(pose.radius, pose.phi, pose.theta);
  camera.position.copy(target).add(offset.setFromSpherical(sph));
  camera.lookAt(target);
  if (pose.fov !== camera.fov) {
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
}

export function readPose(camera, target) {
  sph.setFromVector3(offset.copy(camera.position).sub(target));
  return { theta: sph.theta, phi: sph.phi, radius: sph.radius, y: target.y, fov: camera.fov };
}

export function mixPose(a, b, t) {
  let dTheta = (b.theta - a.theta) % (Math.PI * 2);
  if (dTheta > Math.PI) dTheta -= Math.PI * 2;
  if (dTheta < -Math.PI) dTheta += Math.PI * 2;
  const fov = MathUtils.lerp(a.fov, b.fov, t);
  const framed = MathUtils.lerp(a.radius * halfTan(a.fov), b.radius * halfTan(b.fov), t);
  return {
    theta: a.theta + dTheta * t,
    phi: MathUtils.lerp(a.phi, b.phi, t),
    radius: framed / halfTan(fov),
    y: MathUtils.lerp(a.y, b.y, t),
    fov,
  };
}

/** Tweens keyed by tag; step(now) advances them and reports whether any are still running. */
export function createTweens() {
  const list = new Set();

  function add({ tag, duration, delay = 0, ease = EASE.inOutCubic, update, done }) {
    const tween = { tag, duration, delay, ease, update, done, start: performance.now() };
    list.add(tween);
    return tween;
  }

  function end(tween, apply) {
    list.delete(tween);
    if (apply) tween.update(1);
    tween.done?.();
  }

  function step(now) {
    [...list].forEach((tween) => {
      const t = Math.min(1, Math.max(0, (now - tween.start - tween.delay) / tween.duration));
      if (now - tween.start < tween.delay) return;
      tween.update(tween.ease(t));
      if (t >= 1) end(tween, false);
    });
    return list.size > 0;
  }

  const matching = (tags) => [...list].filter((tw) => tags.includes(tw.tag));

  return {
    add,
    step,
    has: (...tags) => matching(tags).length > 0,
    finish: (...tags) => matching(tags).forEach((tw) => end(tw, true)),
    cancel: (...tags) => matching(tags).forEach((tw) => list.delete(tw)),
  };
}
