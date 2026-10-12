// Loading, normalising and disposing site models. The preview GLB drives the Plan, Drawing and Print stages and
// is the first built model; the optional HQ GLB (same coordinate frame, fetched in parallel at low priority)
// replaces it for Built. Both get one transform, computed once per scene from the manifest's bbox (or the
// preview's own bounds): centre on x/z, base at y = 0, largest horizontal extent = 2 units, then the yaw.
import { Box3, Group, MathUtils, Mesh, NoColorSpace, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { INK_LAYER, ROLE, patchBuiltMaterial } from './reveal.js';

const TARGET_EXTENT = 2;
const CACHE_LIMIT = 2;
const MATTE = { metalness: 0, roughness: 0.85 };
const SLOW_NETWORKS = new Set(['slow-2g', '2g', '3g']);

/** Fetches a file as an ArrayBuffer, reporting progress (0–1) when the size is known. */
async function fetchBuffer(url, { priority = 'high', onProgress, signal } = {}) {
  const res = await fetch(url, { priority, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total || !onProgress) return res.arrayBuffer();
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(1, received / total));
  }
  const out = new Uint8Array(received);
  chunks.reduce((offset, c) => { out.set(c, offset); return offset + c.length; }, 0);
  return out.buffer;
}

/** The HQ tier is skipped on Save-Data and on slow connections. */
export function canLoadHq() {
  const connection = navigator.connection;
  return !(connection?.saveData || SLOW_NETWORKS.has(connection?.effectiveType));
}

const DECODE_WORKERS = 2;

/** Meshopt decoding runs in workers, so parsing a model (above all the HQ one) never blocks a frame. */
function createLoader() {
  MeshoptDecoder.useWorkers?.(DECODE_WORKERS);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

const baseOf = (url) => url.slice(0, url.lastIndexOf('/') + 1);
const materialsOf = (mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]);

function meshesOf(root) {
  const list = [];
  root.traverse((o) => { if (o.isMesh) list.push(o); });
  return list;
}

/** The shared transform: from the manifest bbox when present, else from the preview's bounds. */
function frameFrom(box, yawDeg) {
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const scale = TARGET_EXTENT / Math.max(size.x, size.z, 1e-6);
  const fitted = size.clone().multiplyScalar(scale);
  return {
    offset: new Vector3(-centre.x, -box.min.y, -centre.z),
    scale,
    yaw: MathUtils.degToRad(yawDeg),
    height: fitted.y,
    radius: fitted.length() / 2,
    footprint: [fitted.x, fitted.z],
  };
}

const manifestBox = (bbox) => (bbox ? new Box3(new Vector3(...bbox.min), new Vector3(...bbox.max)) : null);

/**
 * Faithful colour from AI textures (their shading is baked): sharp sampling, matte, no metal guesswork. The
 * base colour uploads as plain RGBA8 and the built shader decodes sRGB itself: an sRGB-format upload of a
 * 4K map stalls for ~100 ms on ANGLE/Metal, the plain one takes ~15 ms.
 */
function treatMaterial(material, anisotropy) {
  if (material.map) Object.assign(material.map, { anisotropy, colorSpace: NoColorSpace });
  [material.metalnessMap, material.roughnessMap].forEach((t) => t?.dispose());
  Object.assign(material, { metalnessMap: null, roughnessMap: null, ...MATTE });
}

function prepareBuilt(meshes, kit, role) {
  meshes.forEach((mesh) => {
    if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
    materialsOf(mesh).forEach((m) => { treatMaterial(m, kit.anisotropy); patchBuiltMaterial(m, kit.uniforms, role); });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
  });
}

/** A twin sharing the mesh's geometry and transform, added beside it (so hiding one never hides the other). */
function twinOf(mesh, material) {
  const twin = new Mesh(mesh.geometry, material);
  twin.position.copy(mesh.position);
  twin.quaternion.copy(mesh.quaternion);
  twin.scale.copy(mesh.scale);
  twin.frustumCulled = mesh.frustumCulled;
  twin.userData.isTwin = true;
  mesh.parent.add(twin);
  return twin;
}

function addTwins(meshes, kit) {
  const fill = meshes.map((m) => twinOf(m, kit.drawing.fill));
  const hull = meshes.map((m) => twinOf(m, kit.drawing.hull));
  const printed = meshes.map((m) => twinOf(m, kit.printed));
  fill.forEach((m) => m.layers.enable(INK_LAYER));
  printed.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  return { fill, hull, printed };
}

function disposeMaterial(material) {
  Object.values(material).forEach((value) => { if (value?.isTexture) value.dispose(); });
  material.dispose();
}

/** Frees the GPU resources under a root that this model owns (not the shared stage materials). */
function disposeRoot(root) {
  const geometries = new Set();
  const materials = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    geometries.add(o.geometry);
    if (!o.userData.isTwin) materialsOf(o).forEach((m) => materials.add(m));
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach(disposeMaterial);
}

const setVisible = (list, visible) => list.forEach((m) => { m.visible = visible; });

/** The site model: outer group (extrusion), pivot (yaw and scale), the preview and, later, the HQ root. */
function createSiteModel(root, scene, kit) {
  const frame = frameFrom(manifestBox(scene.bbox) || new Box3().setFromObject(root), scene.yaw);
  const built = meshesOf(root);
  if (!built.length) throw new Error('The model has no meshes.');
  prepareBuilt(built, kit, ROLE.preview);
  const parts = { built, ...addTwins(built, kit), hq: [] };
  root.position.add(frame.offset);
  const pivot = new Group();
  pivot.add(root);
  pivot.scale.setScalar(frame.scale);
  pivot.rotation.y = frame.yaw;
  const group = new Group();
  group.add(pivot);
  const model = { group, ...frame, parts, hasHq: false, isDisposed: false };
  let hqRoot = null;

  /** Shows or hides each layer: drawing (fill and outline), printed, preview built and HQ built. */
  model.show = ({ drawing, printed, built: isBuilt, hq }) => {
    setVisible(parts.fill, drawing);
    setVisible(parts.hull, drawing);
    setVisible(parts.printed, printed);
    setVisible(parts.built, isBuilt);
    setVisible(parts.hq, hq);
  };

  /** Adds the parsed HQ scene with the preview's transform; returns false when the model is already gone. */
  model.attachHq = (root) => {
    if (model.isDisposed) { disposeRoot(root); return false; }
    parts.hq = meshesOf(root);
    prepareBuilt(parts.hq, kit, ROLE.hq);
    root.position.add(frame.offset);
    pivot.add(root);
    hqRoot = root;
    model.hasHq = true;
    return true;
  };

  /** Frees the HQ model (geometry, materials, textures); the preview stays and can take HQ again later. */
  model.detachHq = () => {
    if (!hqRoot) return;
    disposeRoot(hqRoot);
    hqRoot.removeFromParent();
    hqRoot = null;
    parts.hq = [];
    model.hasHq = false;
  };

  model.dispose = () => {
    model.isDisposed = true;
    disposeRoot(pivot);
    group.removeFromParent();
  };
  return model;
}

/**
 * Loads models through a small LRU cache (the current model and the next one). Each entry holds the preview
 * and, for the visible scene only, the HQ request; eviction aborts the HQ download and disposes both.
 * singleHq (touch screens): opening a visible scene also aborts and frees every other scene's HQ, so at most
 * one 4K model is ever resident; previews stay cached. Preloads never start or drop an HQ.
 */
export function createModelStore(kit, { singleHq = false } = {}) {
  const loader = createLoader();
  const cache = new Map();

  /** Aborts an entry's HQ download and frees its HQ model; a later visible load starts a fresh one. */
  function dropHq(entry) {
    entry.abort?.abort();
    Object.assign(entry, { hq: null, abort: null });
    entry.model.then((model) => model.detachHq()).catch(() => {});
  }

  function evict(entry) {
    entry.abort?.abort();
    // A model still on screen is disposed later, by release(), when it leaves the scene.
    entry.model.then((model) => { if (!model.group.parent) model.dispose(); }).catch(() => {});
  }

  function remember(url, entry) {
    cache.delete(url);
    cache.set(url, entry);
    while (cache.size > CACHE_LIMIT) {
      const [oldUrl, old] = cache.entries().next().value;
      cache.delete(oldUrl);
      evict(old);
    }
  }

  async function buildPreview(scene, opts) {
    const buffer = await fetchBuffer(scene.glb, opts);
    const gltf = await loader.parseAsync(buffer, baseOf(scene.glb));
    return createSiteModel(gltf.scene, scene, kit);
  }

  /** Downloads the HQ file in parallel with the preview; parses it only once the preview (its frame) exists. */
  async function buildHq(entry, scene) {
    const controller = entry.abort;
    const { signal } = controller;
    const download = fetchBuffer(scene.hq, { priority: 'low', signal });
    download.catch(() => {});
    const model = await entry.model.catch(() => null);
    if (!model) { controller.abort(); return false; }
    const buffer = await download;
    if (signal.aborted || model.isDisposed) return false;
    const gltf = await loader.parseAsync(buffer, baseOf(scene.hq));
    if (signal.aborted) { disposeRoot(gltf.scene); return false; }
    return model.attachHq(gltf.scene);
  }

  function startHq(entry, scene) {
    if (entry.hq || !scene.hq || !canLoadHq()) return;
    entry.abort = new AbortController();
    entry.hq = buildHq(entry, scene).catch((err) => {
      if (err?.name !== 'AbortError') console.warn(`HQ model unavailable; keeping the preview: ${scene.hq}`, err);
      return false;
    });
  }

  /** The prepared model for a scene; withHq starts the HQ download beside it (never for preloads). */
  function load(scene, { priority = 'high', onProgress, withHq = true } = {}) {
    let entry = cache.get(scene.glb);
    if (!entry) {
      entry = { model: buildPreview(scene, { priority, onProgress }), hq: null, abort: null };
      const failed = entry;
      entry.model.catch(() => { if (cache.get(scene.glb) === failed) cache.delete(scene.glb); });
    }
    remember(scene.glb, entry);
    if (withHq && singleHq) cache.forEach((other) => { if (other !== entry) dropHq(other); });
    if (withHq) startHq(entry, scene);
    return entry.model;
  }

  /** Resolves true once the scene's HQ model is attached, false when there is none; null before it starts. */
  const hqOf = (scene) => cache.get(scene.glb)?.hq || null;

  /** Disposes a model that was evicted while it was on screen, once it leaves the scene. */
  function release(model, url) {
    if (!cache.has(url)) model.dispose();
  }

  return { load, hqOf, release };
}
