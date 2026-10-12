// The site view's 3D stage: one WebGLRenderer for the page, created on first open and reused for every site
// and scene. The construction sequence (sequence.js) sets the whole scene for a progress value; the stage owns
// the renderer, lights, camera, controls, post-processing and the render-on-demand loop. It renders only while
// a sequence, tween, damping or auto-rotate runs, and stops when the view closes or the tab is hidden.
import {
  DirectionalLight, HemisphereLight, MathUtils, NoToneMapping, PCFSoftShadowMap, PerspectiveCamera, PMREMGenerator,
  Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createDrawingMaterials, createInkMaterial, createRevealUniforms } from './reveal.js';
import { createGantry, createPrintedMaterial } from './print.js';
import { createModelStore } from './model.js';
import { createGround } from './ground.js';
import { createPlan } from './plan.js';
import { createPost } from './post.js';
import { BUILT, applyBuild, createRunner, planAxis, poseAt, posesFor } from './sequence.js';
import { EASE, FOV, applyPose, createTweens, mixPose, offsetPose, readPose } from './motion.js';

const PLAN_HOLD = 1;
const PRINT_START = 2;
const PAINT_START = 3;
const SWITCH = { from: 1, duration: 2000 };
const PACE = { forward: 0.65, back: 0.5 };
const CAMERA_CATCHUP_MS = 650;
const HQ_FADE_MS = 300;
const RESET_MS = 700;
const NUDGE_MS = 220;
const IDLE_RESUME_MS = 6000;
const AUTO_ROTATE_SPEED = 0.6;
const MIN_POLAR = MathUtils.degToRad(8);
const MAX_POLAR = MathUtils.degToRad(82);
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.8;
const PIXEL_RATIO_CAP = { fine: 2, coarse: 1.5 };
const SHADOW_MAP = { fine: 2048, coarse: 1024 };
const SUN_DIRECTION = new Vector3(2.6, 4.4, 1.6).normalize();
const SUN_DISTANCE = 6;
const SHADOW_FIT = 1.06;
const HEMI = { sky: 0xfffaf2, ground: 0xb9ab92, intensity: 1.1 };
const ENV_INTENSITY = 0.42;
const SCENE_REACH = 3.4;
const NEAR_MIN = 0.02;
const OUTLINE_PX = { min: 0.8, max: 1.35, perStagePx: 1 / 640 };

function createRenderer(canvas, context) {
  const renderer = new WebGLRenderer({ canvas, context, antialias: false, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  return renderer;
}

/** Hemisphere fill and the shadow-casting key light (fitted to each model by fitShadow). */
function createLights(scene, coarse) {
  scene.add(new HemisphereLight(HEMI.sky, HEMI.ground, HEMI.intensity));
  const key = new DirectionalLight(0xffffff, 0);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(coarse ? SHADOW_MAP.coarse : SHADOW_MAP.fine);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  return key;
}

function addEnvironment(renderer, scene) {
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = ENV_INTENSITY;
  pmrem.dispose();
}

/** A tight orthographic shadow box around the model's bounding sphere, seen from the key light. */
function fitShadow(key, model) {
  const r = model.radius * SHADOW_FIT;
  key.target.position.set(0, model.height / 2, 0);
  key.position.copy(SUN_DIRECTION).multiplyScalar(SUN_DISTANCE).add(key.target.position);
  Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: SUN_DISTANCE - r * 1.5, far: SUN_DISTANCE + r * 1.5 });
  key.shadow.camera.updateProjectionMatrix();
  key.target.updateMatrixWorld();
}

/** Everything the sequence drives, plus the model store. */
function createRig({ renderer, scene, camera, coarse }) {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const uniforms = createRevealUniforms();
  const drawing = createDrawingMaterials(uniforms);
  const printed = createPrintedMaterial(uniforms);
  const ground = createGround({ anisotropy });
  const plan = createPlan({ anisotropy });
  const gantry = createGantry();
  const key = createLights(scene, coarse);
  const post = createPost(renderer, scene, camera, { inkMaterial: createInkMaterial(uniforms), withAo: !coarse });
  // Touch screens keep one HQ model (a 4K base colour is ~90 MB of GPU memory).
  const store = createModelStore({ uniforms, drawing, printed, anisotropy }, { singleHq: coarse });
  scene.add(ground.group, plan.group, gantry.group, gantry.light);
  return { uniforms, ground, plan, gantry, key, post, store, model: null };
}

/** Builds the stage inside `host`, or returns null when WebGL2 is unavailable. */
export function createStage(host, { isReduced, onLost, onProgress }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'site__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!context) return null;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = createRenderer(canvas, context);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.05, 50);
  const rig = createRig({ renderer, scene, camera, coarse });
  const { uniforms } = rig;
  const controls = new OrbitControls(camera, canvas);
  const tweens = createTweens();
  const runner = createRunner({ apply: applyAt, settled: onSettled });
  const s = {
    url: null, running: false, raf: 0, last: 0, idle: 0, lost: false, touched: false, startPose: null, poses: null, axis: null, pendingHq: null,
  };
  addEnvironment(renderer, scene);
  host.append(canvas);

  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.08, enablePan: false, rotateSpeed: 0.7, zoomSpeed: 0.8,
    minPolarAngle: MIN_POLAR, maxPolarAngle: MAX_POLAR, autoRotateSpeed: AUTO_ROTATE_SPEED,
  });

  const pixelRatio = () => Math.min(devicePixelRatio || 1, coarse ? PIXEL_RATIO_CAP.coarse : PIXEL_RATIO_CAP.fine);

  /** Near and far follow the camera distance, so the flattened plan keeps its depth order. */
  function fitClipPlanes() {
    const distance = camera.position.distanceTo(controls.target);
    const near = Math.max(NEAR_MIN, distance - SCENE_REACH);
    const far = distance + SCENE_REACH;
    if (Math.abs(near - camera.near) < 1e-3 && Math.abs(far - camera.far) < 1e-3) return;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
  }

  function render() {
    fitClipPlanes();
    rig.post.render();
  }

  function frame() {
    s.raf = 0;
    if (!s.running) return;
    const now = performance.now();
    const dt = s.last ? Math.min(0.1, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    const building = runner.step(now);
    const tweening = tweens.step(now);
    const moving = building || tweens.has('camera') ? false : controls.update(dt);
    render();
    // controls.update() can already have queued a frame through its 'change' listener; never queue two.
    if (building || tweening || moving || controls.autoRotate) requestRender();
    else if (!s.raf) s.last = 0;
  }

  function requestRender() {
    if (!s.raf && s.running && !s.lost) s.raf = requestAnimationFrame(frame);
  }

  /** The runner's per-value hook: the scene for p, and the camera on its path (eased in from where it was). */
  function applyAt(p, elapsed) {
    applyBuild(rig, p);
    const path = poseAt(p, s.poses);
    const weight = EASE.inOutSine(MathUtils.clamp(elapsed / CAMERA_CATCHUP_MS, 0, 1));
    applyPose(camera, controls.target, weight >= 1 || !s.startPose ? path : mixPose(s.startPose, path, weight));
    if (p > PRINT_START) renderer.shadowMap.needsUpdate = true;
    onProgress?.(p, runner.target());
  }

  function onSettled(p) {
    updateLimits(p);
    renderer.shadowMap.needsUpdate = true;
    if (p >= BUILT) scheduleAutoRotate(0);
    flushHq();
    requestRender();
  }

  /** Starts a move to `to`; snap first puts the camera on the path (fresh models). */
  function play(to, opts = {}, snap = false) {
    tweens.cancel('camera');
    if (snap) applyPose(camera, controls.target, poseAt(opts.from ?? runner.progress(), s.poses));
    s.startPose = readPose(camera, controls.target);
    runner.play(to, opts);
    requestRender();
  }

  function tweenCamera(to, duration, ease = EASE.inOutCubic) {
    tweens.cancel('camera');
    const from = readPose(camera, controls.target);
    tweens.add({ tag: 'camera', duration, ease, update: (t) => applyPose(camera, controls.target, mixPose(from, to, t)) });
  }

  function stopAutoRotate() {
    controls.autoRotate = false;
    clearTimeout(s.idle);
  }

  /** Auto-rotate only turns the built model, never a held stage, and never with reduced motion. */
  function scheduleAutoRotate(delay = 0) {
    clearTimeout(s.idle);
    if (isReduced() || runner.progress() < BUILT) return;
    s.idle = setTimeout(() => { controls.autoRotate = true; requestRender(); }, delay);
  }

  function updateLimits(p) {
    if (!s.poses) return;
    const fit = p <= PLAN_HOLD ? s.poses.plan.radius : s.poses.home.radius;
    controls.minDistance = fit * MIN_ZOOM;
    controls.maxDistance = fit * MAX_ZOOM;
    controls.minPolarAngle = p <= PLAN_HOLD ? 0 : MIN_POLAR;
  }

  function refitPoses() {
    if (rig.model) s.poses = posesFor(rig.model, camera, s.axis);
  }

  /** Fits the plan sheet, bed, gantry, shadow box and camera poses to the current model. */
  function fitRig(title) {
    const { model } = rig;
    const { theta, isTurned } = planAxis(model.yaw);
    const footprint = isTurned ? [model.footprint[1], model.footprint[0]] : model.footprint;
    const sheet = rig.plan.build({ footprint, rotation: theta, title });
    s.axis = { theta, sheet };
    rig.ground.alignGrid(theta);
    rig.ground.fitBed(model.footprint, model.yaw);
    rig.gantry.fit(model.footprint, model.yaw);
    fitShadow(rig.key, model);
    refitPoses();
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    const pr = pixelRatio();
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.post.setSize(w, h, pr);
    uniforms.uRes.value.set(w * pr, h * pr);
    uniforms.uPx.value = pr;
    uniforms.uWidth.value = MathUtils.clamp(Math.min(w, h) * OUTLINE_PX.perStagePx, OUTLINE_PX.min, OUTLINE_PX.max);
    refitPoses();
    if (rig.model && !s.touched && !runner.isRunning() && !tweens.has('camera')) applyPose(camera, controls.target, poseAt(runner.progress(), s.poses));
    if (rig.model) updateLimits(runner.progress());
    // Same task as the layout change: the resized canvas is never shown stretched or blank.
    if (s.running && !s.lost) render();
  }

  function swapModel(model, url) {
    const old = rig.model;
    const oldUrl = s.url;
    old?.group.removeFromParent();
    rig.model = model;
    s.url = url;
    scene.add(model.group);
    if (old && old !== model) rig.store.release(old, oldUrl);
  }

  function setHqMix(value) {
    uniforms.uHqMix.value = value;
    applyBuild(rig, runner.progress());
    renderer.shadowMap.needsUpdate = true;
    requestRender();
  }

  const uploadMaps = (meshes) => meshes.forEach((mesh) => { if (mesh.material.map) renderer.initTexture(mesh.material.map); });

  /** The HQ model is in: before the colour sweep it simply takes over; afterwards it dithers in. */
  function swapToHq(model) {
    uploadMaps(model.parts.hq);
    tweens.cancel('hq');
    if (isReduced() || runner.progress() <= PAINT_START) { setHqMix(1); return; }
    tweens.add({ tag: 'hq', duration: HQ_FADE_MS, ease: EASE.inOutSine, update: setHqMix });
    requestRender();
  }

  /** HQ takes over at once before the colour sweep; one landing mid-sweep waits for the build to settle. */
  function flushHq() {
    const model = s.pendingHq;
    if (!model || (runner.isRunning() && runner.progress() > PAINT_START)) return;
    s.pendingHq = null;
    if (rig.model === model && model.hasHq) swapToHq(model);
  }

  function watchHq(model, scene) {
    tweens.cancel('hq');
    s.pendingHq = null;
    uniforms.uHqMix.value = model.hasHq ? 1 : 0;
    if (model.hasHq) return;
    rig.store.hqOf(scene)?.then((isAttached) => {
      if (!isAttached || rig.model !== model) return;
      s.pendingHq = model;
      flushHq();
    });
  }

  /**
   * Compiles a model's materials (in parallel where the driver allows) and uploads its textures before the
   * build starts, so no stage stalls on first use. Compiled against the post target's colour space.
   */
  function prepare(model) {
    uploadMaps(model.parts.built);
    if (model.hasHq) uploadMaps(model.parts.hq);
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(rig.post.target);
    const ready = renderer.compileAsync(model.group, camera, scene);
    renderer.setRenderTarget(previous);
    return ready.then(() => {}, () => {});
  }

  /** Shows a prepared model: 'entrance' (full build), 'switch' (Drawing → Built) or 'still' (built). */
  function present(model, scene, { mode = 'still', title }) {
    tweens.cancel('camera');
    stopAutoRotate();
    swapModel(model, scene.glb);
    fitRig(title);
    s.touched = false;
    watchHq(model, scene);
    rig.post.warm();
    if (isReduced() || mode === 'still') runner.jump(BUILT);
    else if (mode === 'entrance') play(BUILT, { from: 0 }, true);
    else play(BUILT, { from: SWITCH.from, duration: SWITCH.duration }, true);
    resume();
  }

  /** Stage buttons: Plan, Drawing and Print hold there; Built plays on, or replays the build when built. */
  function goToStage(index) {
    if (!rig.model) return;
    const target = index + 1;
    stopAutoRotate();
    s.touched = false;
    if (isReduced()) { runner.jump(target); requestRender(); return; }
    if (target < BUILT) play(target, { pace: target < runner.progress() ? PACE.back : PACE.forward });
    else if (runner.isRunning() && runner.target() === BUILT) skip();
    else play(BUILT, runner.progress() >= BUILT ? { from: 0 } : { pace: PACE.forward });
  }

  function onUserStart() {
    skip();
    s.touched = true;
    tweens.cancel('camera');
    stopAutoRotate();
  }

  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', onUserStart);
  controls.addEventListener('end', () => scheduleAutoRotate(IDLE_RESUME_MS));
  canvas.addEventListener('dblclick', () => resetView());
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    s.lost = true;
    pause();
    onLost?.();
  }, { once: true });
  new ResizeObserver(resize).observe(host);

  /** Jumps a running sequence to where it was going. */
  function skip() {
    if (!runner.isRunning()) return;
    runner.finish();
    requestRender();
  }

  function resetView() {
    if (!rig.model) return;
    skip();
    stopAutoRotate();
    s.touched = false;
    const pose = poseAt(runner.progress(), s.poses);
    if (isReduced()) applyPose(camera, controls.target, pose);
    else tweenCamera(pose, RESET_MS);
    scheduleAutoRotate(IDLE_RESUME_MS);
    requestRender();
  }

  /** Keyboard rotation and zoom, within the same limits as the pointer. */
  function nudge({ azimuth = 0, elevation = 0, zoom = 1 }) {
    if (!rig.model) return;
    onUserStart();
    const pose = offsetPose(readPose(camera, controls.target), { azimuth, elevation, scale: zoom });
    pose.phi = MathUtils.clamp(pose.phi, Math.max(controls.minPolarAngle, 1e-3), MAX_POLAR);
    pose.radius = MathUtils.clamp(pose.radius, controls.minDistance, controls.maxDistance);
    if (isReduced()) applyPose(camera, controls.target, pose);
    else tweenCamera(pose, NUDGE_MS, EASE.outCubic);
    scheduleAutoRotate(IDLE_RESUME_MS);
    requestRender();
  }

  function pause() {
    s.running = false;
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    s.last = 0;
    clearTimeout(s.idle);
  }

  function resume() {
    if (s.lost) return;
    s.running = true;
    if (!controls.autoRotate && rig.model && !runner.isRunning() && !s.touched) scheduleAutoRotate(0);
    requestRender();
  }

  /** Removes the model from view (a photo scene is showing instead). */
  function clear() {
    runner.stop();
    tweens.cancel('camera', 'hq');
    stopAutoRotate();
    if (rig.model) { rig.model.group.removeFromParent(); rig.store.release(rig.model, s.url); }
    rig.model = null;
    s.url = null;
    rig.plan.clear();
    rig.gantry.show(false);
    rig.ground.setBed(0);
    rig.ground.setShadow(0);
    rig.post.setInk(0);
    rig.post.setAo(0);
  }

  return {
    load: (scene, opts) => rig.store.load(scene, opts),
    preload: (scene) => rig.store.load(scene, { priority: 'low', withHq: false }).catch(() => {}),
    prepare, present, goToStage, resetView, nudge, skip, pause, resume, clear,
    relabel: () => { rig.plan.relabel(); requestRender(); },
    progress: () => runner.progress(),
    target: () => runner.target(),
    isLost: () => s.lost,
    isBusy: () => runner.isRunning(),
  };
}
