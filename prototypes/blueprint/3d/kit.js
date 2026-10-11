// Model-building kit: every piece of a maquette is merged into one mesh per material,
// and a shared vertex shader lifts, grows or lowers each piece into place from a single
// per-model `uBuild` uniform (0 = bare plinth, 1 = finished model).
import * as THREE from 'three';

export const STAGES = { F: [0.0, 0.26], S: [0.26, 0.56], E: [0.56, 0.84], L: [0.84, 1.0] };
export const STAGE_ORDER = ['F', 'S', 'E', 'L'];
const MODES = { grow: 0, drop: 1, pop: 2, remove: 3 };
const DEFAULT_DROP = 0.42;
// Pieces are displaced in the vertex shader, so culling bounds get headroom for the largest drop.
const BOUNDS_PAD = 0.5;

const GLSL_HEAD = /* glsl */ `
uniform float uBuild;
attribute vec4 aAnim;
float mqEaseOutCubic(float t) { float k = 1.0 - t; return 1.0 - k * k * k; }
float mqEaseOutBack(float t) { float k = t - 1.0; return 1.0 + 2.5 * k * k * k + 1.5 * k * k; }
float mqProgress(vec4 anim) { return clamp((uBuild - anim.x) / max(anim.y, 1e-4), 0.0, 1.0); }
vec3 mqTransform(vec3 p, vec3 pivot, vec4 anim) {
  float t = mqProgress(anim);
  vec3 rel = p - pivot;
  if (anim.z < 0.5) {
    rel.y *= max(mqEaseOutCubic(t), 1e-4);
    rel.xz *= step(1e-4, t);
  } else if (anim.z < 1.5) {
    float k = 1.0 - t;
    float squash = 1.0 - 0.08 * sin(clamp((t - 0.7) / 0.3, 0.0, 1.0) * 3.14159);
    rel *= max(smoothstep(0.0, 0.16, t), 1e-4);
    rel.y *= squash;
    rel.y += k * k * k * anim.w;
  } else if (anim.z < 2.5) {
    rel *= t <= 0.0 ? 1e-4 : mqEaseOutBack(t);
  } else {
    rel *= max(1.0 - smoothstep(0.3, 1.0, t), 1e-4);
    rel.y += t * t * anim.w;
  }
  return pivot + rel;
}
`;

function solidVertexHead(instanced, shaded) {
  return `${GLSL_HEAD}
${instanced ? '' : 'attribute vec3 aPivot;'}
${shaded ? 'varying float vMqBaseH; varying float vMqUp;' : ''}`;
}

function solidVertexBody(instanced, shaded) {
  const pivot = instanced ? 'vec3(0.0)' : 'aPivot';
  return `
transformed = mqTransform(transformed, ${pivot}, aAnim);
${shaded ? `vMqBaseH = position.y - ${pivot}.y; vMqUp = abs(objectNormal.y);` : ''}`;
}

const AO_FRAGMENT = /* glsl */ `
#include <color_fragment>
float mqAo = mix(0.7, 1.0, smoothstep(0.0, 0.075, vMqBaseH));
diffuseColor.rgb *= mix(1.0, mqAo, 1.0 - vMqUp);
`;

/** Patch a mesh or depth material so it follows the build animation. */
export function patchSolid(material, uniforms, { instanced = false } = {}) {
  const shaded = material.isMeshStandardMaterial === true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBuild = uniforms.uBuild;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${solidVertexHead(instanced, shaded)}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${solidVertexBody(instanced, shaded)}`);
    if (shaded) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vMqBaseH; varying float vMqUp;')
        .replace('#include <color_fragment>', AO_FRAGMENT);
    }
  };
  material.customProgramCacheKey = () => `mq-solid-${instanced ? 'i' : 'm'}-${shaded ? 's' : 'd'}`;
  return material;
}

/** Patch a line material: lines stay at rest and fade from a teal "ghost" drawing to built ink. */
export function patchLines(material, uniforms, { ghostColor, selectColor, ghostAlpha = 0.5 }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uBuild: uniforms.uBuild,
      uSel: uniforms.uSel,
      uGhost: { value: ghostColor },
      uSelColor: { value: selectColor },
      uGhostAlpha: { value: ghostAlpha },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_HEAD}\nvarying float vMqBuilt; varying float vMqGhost;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float mqT = mqProgress(aAnim);
bool mqRemoving = aAnim.z > 2.5;
vMqBuilt = mqRemoving ? 1.0 - smoothstep(0.0, 0.6, mqT) : smoothstep(0.55, 1.0, mqT);
vMqGhost = mqRemoving ? 0.0 : 1.0;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uGhost; uniform vec3 uSelColor; uniform float uSel; uniform float uGhostAlpha;
varying float vMqBuilt; varying float vMqGhost;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(uGhost, diffuseColor.rgb, vMqBuilt);
diffuseColor.rgb = mix(diffuseColor.rgb, uSelColor, uSel * 0.9);
diffuseColor.a *= mix(uGhostAlpha * vMqGhost, 1.0, vMqBuilt) * (1.0 + uSel * 0.6);`);
  };
  material.customProgramCacheKey = () => 'mq-lines';
  return material;
}

function pieceAnim(stage, order, mode, drop, dur) {
  const [s0, s1] = STAGES[stage];
  const length = s1 - s0;
  const duration = dur ?? length * 0.5;
  const start = s0 + Math.min(Math.max(order, 0), 1) * Math.max(length - duration, 0);
  return [start, duration, MODES[mode], drop];
}

function prepare(geo, flat) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (flat) g.computeVertexNormals();
  else if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

function mergeItems(items, withNormals) {
  let count = 0;
  for (const item of items) count += item.geo.attributes.position.count;
  const position = new Float32Array(count * 3);
  const normal = withNormals ? new Float32Array(count * 3) : null;
  const pivot = new Float32Array(count * 3);
  const anim = new Float32Array(count * 4);
  let offset = 0;
  for (const { geo, pivot: p, anim: a } of items) {
    const n = geo.attributes.position.count;
    position.set(geo.attributes.position.array, offset * 3);
    if (withNormals) normal.set(geo.attributes.normal.array, offset * 3);
    for (let k = 0; k < n; k++) {
      pivot.set(p, (offset + k) * 3);
      anim.set(a, (offset + k) * 4);
    }
    offset += n;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  if (withNormals) merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.setAttribute('aPivot', new THREE.BufferAttribute(pivot, 3));
  merged.setAttribute('aAnim', new THREE.BufferAttribute(anim, 4));
  merged.computeBoundingSphere();
  return merged;
}

export class Kit {
  constructor() {
    this.solids = new Map();
    this.lineSets = new Map();
    this.instanced = [];
    this.height = 0;
  }

  /**
   * Add one piece. `stage` is F/S/E/L, `order` (0..1) staggers it inside the stage,
   * `mode` is grow | drop | pop | remove.
   */
  add(geo, { mat = 'card', stage = 'S', order = 0, mode = 'grow', drop = DEFAULT_DROP, dur, edges = true, edgeAngle = 28, flat = false, lines = 'edge' } = {}) {
    const g = prepare(geo, flat);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    this.height = Math.max(this.height, bb.max.y);
    const pivot = [(bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2];
    const anim = pieceAnim(stage, order, mode, drop, dur);
    if (!this.solids.has(mat)) this.solids.set(mat, []);
    this.solids.get(mat).push({ geo: g, pivot, anim });
    if (edges) this.pushLines(lines, new THREE.EdgesGeometry(g, edgeAngle), pivot, anim);
    return anim;
  }

  /** Add hairlines from a flat [x,y,z, x,y,z, …] segment list. */
  addLines(segments, { set = 'edge', stage = 'L', order = 0, mode = 'grow', dur } = {}) {
    if (!segments.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments), 3));
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const pivot = [(bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2];
    this.pushLines(set, g, pivot, pieceAnim(stage, order, mode, 0, dur));
  }

  pushLines(set, geo, pivot, anim) {
    if (!this.lineSets.has(set)) this.lineSets.set(set, []);
    this.lineSets.get(set).push({ geo, pivot, anim });
  }

  /** Instanced parts (seats, rocks): `anims` is a Float32Array of 4 values per instance. */
  addInstanced(geo, matrices, anims, { mat = 'card', castShadow = false } = {}) {
    this.instanced.push({ geo, matrices, anims, mat, castShadow });
  }

  /** Build the THREE objects. `materials(key, kind)` returns a material for 'solid' | 'depth' | 'line' | 'isolid' | 'idepth'. */
  build(materials) {
    const group = new THREE.Group();
    for (const [key, items] of this.solids) {
      const mesh = new THREE.Mesh(mergeItems(items, true), materials(key, 'solid'));
      mesh.customDepthMaterial = materials(key, 'depth');
      mesh.castShadow = key !== 'water' && key !== 'pitch';
      mesh.receiveShadow = true;
      mesh.geometry.boundingSphere.radius += BOUNDS_PAD;
      group.add(mesh);
    }
    for (const [set, items] of this.lineSets) {
      const lines = new THREE.LineSegments(mergeItems(items, false), materials(set, 'line'));
      lines.renderOrder = 2;
      group.add(lines);
    }
    for (const { geo, matrices, anims, mat, castShadow } of this.instanced) {
      const count = matrices.length / 16;
      const g = geo.clone();
      g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(anims, 4));
      const mesh = new THREE.InstancedMesh(g, materials(mat, 'isolid'), count);
      mesh.instanceMatrix.array.set(matrices);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.customDepthMaterial = materials(mat, 'idepth');
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.boundingSphere.radius += BOUNDS_PAD;
      group.add(mesh);
    }
    return group;
  }
}

/** Animation vector for an instanced part, for callers that fill instance buffers. */
export function instanceAnim(stage, order, mode = 'pop', drop = DEFAULT_DROP, dur) {
  return pieceAnim(stage, order, mode, drop, dur);
}
