// The site view's 3D stage: one WebGLRenderer for the page, created on first open and reused for every
// site and scene. It renders on demand (only while a sequence, damping or auto-rotate runs) and stops
// when the view closes or the tab is hidden. Sequences: the entrance (drawing, construction scan, dolly
// and orbit, ~2.6 s), the shorter scene switch (~1.2 s) and the Drawing / Built toggle.
import {
  ACESFilmicToneMapping, Color, DirectionalLight, HemisphereLight, MathUtils, PCFSoftShadowMap,
  PerspectiveCamera, PMREMGenerator, Scene, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createDrawingMaterials, createRevealUniforms } from './reveal.js';
import { createModelStore } from './model.js';
import { createGround } from './ground.js';
import { EASE, FOV, applyPose, createTweens, defaultPose, fitDistance, mixPose, offsetPose, readPose } from './motion.js';

const TEAL = '#3B99A3';
const ENTRANCE = { camera: 2600, cutDelay: 800, cut: 1500 };
const SWITCH = { camera: 1200, cutDelay: 150, cut: 950 };
const TOGGLE_MS = 900;
const RESET_MS = 700;
const NUDGE_MS = 220;
const IDLE_RESUME_MS = 6000;
const AUTO_ROTATE_SPEED = 0.6;
const CUT_MARGIN = 0.01;
const ENTRANCE_START = { azimuth: -20, elevation: 10, scale: 1.55 };
const SWITCH_START = { azimuth: -8, elevation: 4, scale: 1.15 };
const MIN_POLAR = MathUtils.degToRad(8);
const MAX_POLAR = MathUtils.degToRad(82);
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 1.8;
const SUN_POSITION = [2.6, 4.4, 1.6];
const SHADOW_EXTENT = 1.9;
const OUTLINE_PX = { min: 0.8, max: 1.35, perStagePx: 1 / 640 };
const bandStrength = (t) => MathUtils.smoothstep(t, 0, 0.08) * (1 - MathUtils.smoothstep(t, 0.9, 1));

function createRenderer(canvas, context) {
  const renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  return renderer;
}

function createLights(scene, coarse) {
  scene.add(new HemisphereLight(0xfffaf2, 0xb9ab92, 0.85));
  const sun = new DirectionalLight(0xfff3e0, 2.1);
  sun.position.set(...SUN_POSITION);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -SHADOW_EXTENT, right: SHADOW_EXTENT, top: SHADOW_EXTENT, bottom: -SHADOW_EXTENT, near: 0.5, far: 12 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
}

function addEnvironment(renderer, scene) {
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
}

/** Builds the stage inside `host`, or returns null when WebGL2 is unavailable. */
export function createStage(host, { isReduced, onLost }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'site__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!context) return null;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const renderer = createRenderer(canvas, context);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.01, 100);
  const uniforms = createRevealUniforms();
  const drawing = createDrawingMaterials(uniforms);
  const store = createModelStore({ uniforms, drawing });
  const ground = createGround({ anisotropy: renderer.capabilities.getMaxAnisotropy(), teal: new Color(TEAL) });
  const controls = new OrbitControls(camera, canvas);
  const tweens = createTweens();
  const s = { model: null, url: null, fit: 5, running: false, raf: 0, last: 0, isBuilt: true, idle: 0, lost: false, touched: false };
  createLights(scene, coarse);
  addEnvironment(renderer, scene);
  scene.add(ground.group);
  host.append(canvas);

  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.08, enablePan: false, rotateSpeed: 0.7, zoomSpeed: 0.8,
    minPolarAngle: MIN_POLAR, maxPolarAngle: MAX_POLAR, autoRotateSpeed: AUTO_ROTATE_SPEED,
  });

  const pixelRatio = () => Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2);
  const cutTop = () => (s.model ? s.model.height + CUT_MARGIN : 1);
  const cutBottom = () => -CUT_MARGIN;
  const homePose = () => defaultPose(s.fit, (s.model?.height || 0) / 2);
  const isCameraTween = () => tweens.has('camera');

  function render() {
    renderer.render(scene, camera);
  }

  function frame() {
    s.raf = 0;
    if (!s.running) return;
    const now = performance.now();
    const dt = s.last ? Math.min(0.1, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    const tweening = tweens.step(now);
    const moving = isCameraTween() ? false : controls.update(dt);
    render();
    // controls.update() can already have queued a frame through its 'change' listener; never queue two.
    if (tweening || moving || controls.autoRotate) requestRender();
    else if (!s.raf) s.last = 0;
  }

  function requestRender() {
    if (!s.raf && s.running && !s.lost) s.raf = requestAnimationFrame(frame);
  }

  function setCut(y, strength = 0) {
    uniforms.uCut.value = y;
    uniforms.uBandOn.value = strength;
    const height = s.model?.height || 0;
    ground.cut.set(y, (s.model?.radius || 1) * 0.92, y > 0 && y < height ? strength : 0);
    s.model?.showDrawing(y < height);
  }

  function tweenCut(to, { duration, delay = 0, tag = 'cut' }) {
    const from = uniforms.uCut.value;
    tweens.add({
      tag, duration, delay, ease: EASE.inOutSine,
      update: (t) => setCut(MathUtils.lerp(from, to, t), bandStrength(t)),
      done: () => setCut(uniforms.uCut.value, 0),
    });
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

  function scheduleAutoRotate(delay = 0) {
    clearTimeout(s.idle);
    if (isReduced()) return;
    s.idle = setTimeout(() => { controls.autoRotate = true; requestRender(); }, delay);
  }

  function updateLimits() {
    if (!s.model) return;
    s.fit = fitDistance(s.model.radius, camera);
    controls.minDistance = s.fit * MIN_ZOOM;
    controls.maxDistance = s.fit * MAX_ZOOM;
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
    uniforms.uRes.value.set(w * pr, h * pr);
    uniforms.uPx.value = pr;
    uniforms.uWidth.value = MathUtils.clamp(Math.min(w, h) * OUTLINE_PX.perStagePx, OUTLINE_PX.min, OUTLINE_PX.max);
    updateLimits();
    if (s.model && !s.touched && !tweens.has('camera', 'cut')) applyPose(camera, controls.target, homePose());
    requestRender();
  }

  function swapModel(model, url) {
    const old = s.model;
    const oldUrl = s.url;
    if (old) old.pivot.removeFromParent();
    s.model = model;
    s.url = url;
    scene.add(model.pivot);
    if (old && old !== model) store.release(old, oldUrl);
    updateLimits();
  }

  function runSequence(timing, startPose) {
    const end = homePose();
    applyPose(camera, controls.target, startPose);
    setCut(cutBottom());
    tweenCamera(end, timing.camera, timing === ENTRANCE ? EASE.outCubic : EASE.inOutCubic);
    tweenCut(cutTop(), { duration: timing.cut, delay: timing.cutDelay });
    tweens.add({ tag: 'camera', duration: timing.camera, update: () => {}, done: () => scheduleAutoRotate(0) });
  }

  /** Shows a prepared model: 'entrance', 'switch' or 'still' (reduced motion always shows it still). */
  function present(model, url, mode = 'still') {
    tweens.cancel('camera', 'cut');
    stopAutoRotate();
    swapModel(model, url);
    s.isBuilt = true;
    s.touched = false;
    if (isReduced() || mode === 'still') {
      applyPose(camera, controls.target, homePose());
      setCut(cutTop());
      scheduleAutoRotate(0);
    } else if (mode === 'entrance') {
      runSequence(ENTRANCE, offsetPose(homePose(), ENTRANCE_START));
    } else {
      runSequence(SWITCH, offsetPose(homePose(), SWITCH_START));
    }
    resume();
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

  /** Jumps a running entrance or switch to its end state. */
  function skip() {
    if (!tweens.has('camera', 'cut')) return;
    tweens.finish('camera', 'cut');
    requestRender();
  }

  function setBuilt(isBuilt) {
    if (!s.model) return;
    s.isBuilt = isBuilt;
    tweens.cancel('cut');
    const to = isBuilt ? cutTop() : cutBottom();
    if (isReduced()) setCut(to);
    else tweenCut(to, { duration: TOGGLE_MS });
    requestRender();
  }

  function resetView() {
    if (!s.model) return;
    skip();
    stopAutoRotate();
    s.touched = false;
    if (isReduced()) applyPose(camera, controls.target, homePose());
    else tweenCamera(homePose(), RESET_MS);
    scheduleAutoRotate(IDLE_RESUME_MS);
    requestRender();
  }

  /** Keyboard rotation and zoom, within the same limits as the pointer. */
  function nudge({ azimuth = 0, elevation = 0, zoom = 1 }) {
    if (!s.model) return;
    onUserStart();
    const pose = offsetPose(readPose(camera, controls.target), { azimuth, elevation, scale: zoom });
    pose.phi = MathUtils.clamp(pose.phi, MIN_POLAR, MAX_POLAR);
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
    if (controls.autoRotate === false && s.model && !tweens.has('camera', 'cut') && !s.touched) scheduleAutoRotate(0);
    requestRender();
  }

  /** Removes the model from view (a photo scene is showing instead). */
  function clear() {
    tweens.cancel('camera', 'cut');
    stopAutoRotate();
    if (s.model) { s.model.pivot.removeFromParent(); store.release(s.model, s.url); }
    s.model = null;
    s.url = null;
  }

  return {
    load: (scene, opts) => store.load(scene, opts),
    preload: (scene) => store.load(scene, { priority: 'low' }).catch(() => {}),
    present, setBuilt, resetView, nudge, skip, pause, resume, clear,
    isBuilt: () => s.isBuilt,
    isLost: () => s.lost,
    isBusy: () => tweens.has('camera', 'cut'),
  };
}
