// Loading, normalising and disposing site models. Contract with the asset pipeline: centre on x/z, base at
// y = 0, scale so the largest horizontal extent is 2 units, then rotate by the manifest's yaw (degrees).
import { Box3, Group, MathUtils, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { patchBuiltMaterial } from './reveal.js';

const TARGET_EXTENT = 2;
const CACHE_LIMIT = 2;

/** Fetches a file as an ArrayBuffer, reporting progress (0–1) when the size is known. */
async function fetchBuffer(url, { priority = 'high', onProgress } = {}) {
  const res = await fetch(url, { priority });
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

function createLoader() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

function meshesOf(root) {
  const list = [];
  root.traverse((o) => { if (o.isMesh) list.push(o); });
  return list;
}

/** Adds the drawing twins (fill and outline) as children sharing the mesh's geometry; returns them. */
function addDrawing(mesh, drawing) {
  if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mesh.userData.builtMaterials = materials;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const fill = new Mesh(mesh.geometry, drawing.fill);
  const hull = new Mesh(mesh.geometry, drawing.hull);
  [fill, hull].forEach((m) => { m.userData.isDrawing = true; m.frustumCulled = mesh.frustumCulled; });
  mesh.add(fill, hull);
  return [fill, hull];
}

function normalise(root, yaw) {
  const box = new Box3().setFromObject(root);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  root.position.x -= centre.x;
  root.position.y -= box.min.y;
  root.position.z -= centre.z;
  const scale = TARGET_EXTENT / Math.max(size.x, size.z, 1e-6);
  const pivot = new Group();
  pivot.add(root);
  pivot.scale.setScalar(scale);
  pivot.rotation.y = MathUtils.degToRad(yaw);
  const s = size.clone().multiplyScalar(scale);
  return { pivot, height: s.y, radius: s.length() / 2, footprint: [s.x, s.z] };
}

function countTriangles(meshes) {
  return meshes.reduce((n, m) => n + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
}

/** Prepares a parsed glTF scene: built materials get the cut, each mesh gets drawing twins, then it is normalised. */
function prepare(root, { yaw, uniforms, drawing }) {
  const meshes = meshesOf(root);
  if (!meshes.length) throw new Error('The model has no meshes.');
  meshes.forEach((mesh) => {
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => patchBuiltMaterial(mat, uniforms));
  });
  const fitted = normalise(root, yaw);
  const twins = meshes.flatMap((mesh) => addDrawing(mesh, drawing));
  let isDrawingShown = true;
  /** Hides the drawing twins once the model is fully built, so auto-rotate draws each triangle once. */
  const showDrawing = (shown) => {
    if (shown === isDrawingShown) return;
    isDrawingShown = shown;
    twins.forEach((m) => { m.visible = shown; });
  };
  return { ...fitted, tris: countTriangles(meshes), showDrawing };
}

function disposeMaterial(material) {
  Object.values(material).forEach((value) => { if (value?.isTexture) value.dispose(); });
  material.dispose();
}

/** Frees the GPU resources a model owns (not the shared drawing materials). */
function disposeModel(model) {
  const geometries = new Set();
  const materials = new Set();
  model.pivot.traverse((o) => {
    if (!o.isMesh) return;
    geometries.add(o.geometry);
    if (!o.userData.isDrawing) (o.userData.builtMaterials || [o.material]).forEach((m) => materials.add(m));
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach(disposeMaterial);
  model.pivot.removeFromParent();
}

/** Loads models through a small LRU cache (the current model and the next one). */
export function createModelStore({ uniforms, drawing }) {
  const loader = createLoader();
  const cache = new Map();

  function remember(url, entry) {
    cache.delete(url);
    cache.set(url, entry);
    while (cache.size > CACHE_LIMIT) {
      const [oldUrl, old] = cache.entries().next().value;
      cache.delete(oldUrl);
      // A model still on screen is disposed later, by release(), when it leaves the scene.
      old.then((model) => { if (!model.pivot.parent) disposeModel(model); }).catch(() => {});
    }
  }

  async function build(url, yaw, opts) {
    const buffer = await fetchBuffer(url, opts);
    const gltf = await loader.parseAsync(buffer, url.slice(0, url.lastIndexOf('/') + 1));
    return prepare(gltf.scene, { yaw, uniforms, drawing });
  }

  /** The prepared model for a scene; low priority for a preload. */
  function load(scene, { priority = 'high', onProgress } = {}) {
    const hit = cache.get(scene.glb);
    if (hit) { remember(scene.glb, hit); return hit; }
    const entry = build(scene.glb, scene.yaw, { priority, onProgress });
    entry.catch(() => cache.delete(scene.glb));
    remember(scene.glb, entry);
    return entry;
  }

  /** Disposes a model that was evicted while it was on screen, once it leaves the scene. */
  function release(model, url) {
    if (!cache.has(url)) disposeModel(model);
  }

  return { load, release };
}
