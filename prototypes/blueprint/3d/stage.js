// One WebGL renderer and one canvas for the whole page. The canvas moves into the project
// sheet in view, swaps to that sheet's study model, and renders only when progress or size changes.
// Models, build shader and materials come from the Maquette prototype (copied into this folder).
import * as THREE from 'three';
import { Kit, patchSolid, patchLines } from './kit.js';
import { buildStadium, buildClub } from './models-a.js';
import { buildFactory, buildUniversity, buildMosqueSquare, buildCoralBeach } from './models-b.js';
import { rng } from './geo.js';

const TEAL = '#3B99A3';
const PLINTH_H = 0.14;
const FOV = 30;
// A gentle turntable tied to build progress (radians).
const TURN_FROM = -0.45;
const TURN_SPAN = 0.9;
const FIT_W = 0.9;
const FIT_H = 1.34;

// Keyed by the Blueprint drawing id; `mid` is the Maquette model id (it seeds the same random layout).
const DEFS = {
  cityclub: { mid: 'club', size: [3.7, 2.7], build: buildClub, az: 0.4, polar: 0.95 },
  stadium: { mid: 'stadium', size: [3.9, 2.9], build: buildStadium, az: -0.42, polar: 0.98 },
  university: { mid: 'university', size: [3.9, 2.9], build: buildUniversity, az: -0.36, polar: 0.92 },
  mosque: { mid: 'mosque', size: [4.0, 2.7], build: buildMosqueSquare, az: 0.22, polar: 0.96 },
  coral: { mid: 'coral', size: [4.0, 2.9], build: buildCoralBeach, az: -0.26, polar: 0.9 },
  factory: { mid: 'factory', size: [3.7, 2.7], build: buildFactory, az: 0.5, polar: 0.95 },
};

const COLORS = {
  card: '#F6F5F1', foam: '#F4F3EF', grey: '#DAD5CB', pitch: '#D6DECB', water: '#C6E1E0', wood: '#D4B88E',
  sand: '#E9DDC6', glass: '#D2DFE2', dark: '#2D3547', court: '#CBD8DD', seat: '#E7E9E7', reef: '#D3D9CE', rock: '#CCC5B8',
};
const ROUGHNESS = { glass: 0.55, water: 0.72, dark: 0.45 };
const ENV_INTENSITY = { water: 0.35, glass: 0.5 };

function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: '#cfc9bf', side: THREE.BackSide }));
  room.position.y = 8;
  env.add(room);
  const softbox = (w, h, x, y, z, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.985, 0.965).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  softbox(16, 10, -6, 16, 6, 3.2);
  softbox(10, 6, 12, 8, -4, 1.4);
  softbox(30, 4, 0, 4, 18, 0.9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.04);
  pmrem.dispose();
  return rt.texture;
}

function contactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.shadowColor = 'rgba(40,30,20,1)';
  ctx.shadowBlur = 256 * 0.09;
  ctx.shadowOffsetX = 256 * 4;
  ctx.fillStyle = '#000';
  const m = 256 * 0.16;
  ctx.fillRect(m - 256 * 4, m, 256 - 2 * m, 256 - 2 * m);
  return new THREE.CanvasTexture(c);
}

function materialFactory(uniforms) {
  const cache = new Map();
  const teal = new THREE.Color(TEAL);
  return (key, kind) => {
    const id = `${key}:${kind}`;
    if (cache.has(id)) return cache.get(id);
    let m;
    if (kind === 'line') {
      const contour = key === 'contour';
      m = new THREE.LineBasicMaterial({ color: contour ? '#2F8C96' : '#24314F', transparent: true, opacity: contour ? 0.72 : 0.42, depthWrite: false });
      patchLines(m, uniforms, { ghostColor: teal, selectColor: teal, ghostAlpha: contour ? 0.6 : 1.7 });
    } else if (kind === 'depth' || kind === 'idepth') {
      m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      patchSolid(m, uniforms, { instanced: kind === 'idepth' });
    } else {
      m = new THREE.MeshStandardMaterial({
        color: COLORS[key] ?? COLORS.card, roughness: ROUGHNESS[key] ?? 0.86, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, flatShading: key === 'rock',
        envMapIntensity: ENV_INTENSITY[key] ?? 1,
      });
      patchSolid(m, uniforms, { instanced: kind === 'isolid' });
    }
    cache.set(id, m);
    return m;
  };
}

function fitDistance(radius, aspect, fracW, fracH) {
  const vf = THREE.MathUtils.degToRad(FOV) / 2;
  const hf = Math.atan(Math.tan(vf) * aspect);
  return Math.max(radius / (Math.tan(hf) * fracW), radius / (Math.tan(vf) * fracH));
}

export function createStage({ canvas, context, mobile = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.62;
  const hemi = new THREE.HemisphereLight('#ffffff', '#cdbfa6', 0.55);
  const key = new THREE.DirectionalLight('#fff7ee', 2.3);
  key.position.set(-4.2, 9.5, 5.6);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 3.5;
  Object.assign(key.shadow.camera, { near: 0.5, far: 30, left: -3, right: 3, top: 3, bottom: -3 });
  key.shadow.camera.updateProjectionMatrix();
  scene.add(hemi, key, key.target);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const shadowTexture = contactShadowTexture();
  const plinthMaterial = new THREE.MeshStandardMaterial({ color: '#F7F6F2', roughness: 0.82, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const plinthEdges = new THREE.LineBasicMaterial({ color: '#24314F', transparent: true, opacity: 0.3, depthWrite: false });

  const models = new Map();
  let current = null;
  let host = null;
  let visible = false;
  let queued = false;
  let width = 1;
  let height = 1;

  function buildModel(id) {
    if (models.has(id)) return models.get(id);
    const def = DEFS[id];
    const [w, d] = def.size;
    const uniforms = { uBuild: { value: 0 }, uSel: { value: 0 } };
    const kit = new Kit();
    def.build(kit, rng(def.mid.length * 97 + 13));
    const group = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, PLINTH_H, d), plinthMaterial);
    plinth.position.y = PLINTH_H / 2;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(plinth.geometry), plinthEdges);
    edges.position.copy(plinth.position);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.32, d * 1.36), new THREE.MeshBasicMaterial({ color: '#000', alphaMap: shadowTexture, transparent: true, opacity: 0.34, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.0015;
    const model = kit.build(materialFactory(uniforms));
    model.position.y = PLINTH_H;
    group.add(shadow, plinth, edges, model);
    group.visible = false;
    scene.add(group);
    const entry = { id, def, group, uniforms, radius: Math.hypot(w, d) / 2 };
    models.set(id, entry);
    return entry;
  }

  function frameCamera() {
    if (!current) return;
    const { def, radius } = current;
    const dist = fitDistance(radius, width / height, FIT_W, FIT_H);
    const target = new THREE.Vector3(0, PLINTH_H + 0.06, 0);
    camera.position.copy(target).add(new THREE.Vector3().setFromSphericalCoords(dist, def.polar, def.az));
    camera.lookAt(target);
  }

  function render() {
    queued = false;
    if (!current || !visible) return;
    renderer.render(scene, camera);
  }

  function requestRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function resize() {
    if (!host) return;
    const r = host.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    frameCamera();
    requestRender();
  }
  const ro = new ResizeObserver(resize);

  function setProgress(id, value) {
    const m = models.get(id);
    if (!m) return;
    const p = Math.min(1, Math.max(0, value / 100));
    m.uniforms.uBuild.value = p;
    m.group.rotation.y = TURN_FROM + p * TURN_SPAN;
    if (m === current) requestRender();
  }

  return {
    attach(el, id, value) {
      visible = true;
      if (el !== host) {
        if (host) ro.unobserve(host);
        host = el;
        el.append(canvas);
        ro.observe(el);
      }
      const next = buildModel(id);
      if (next !== current) {
        if (current) current.group.visible = false;
        current = next;
        current.group.visible = true;
      }
      setProgress(id, value);
      resize();
    },
    setVisible(v) {
      visible = v;
      if (v) requestRender();
    },
    setProgress,
    prebuild(id) { buildModel(id); },
    stats() {
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, models: models.size, current: current?.id };
    },
    dispose() {
      ro.disconnect();
      visible = false;
      current = null;
    },
  };
}
