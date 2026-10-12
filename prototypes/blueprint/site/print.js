// The 3D-print stage: the matte "printed" material (fine layer lines on world height, the glowing teal band at
// the cut) and the print-head gantry (corner posts, two rails, a crossbar, a carriage and a nozzle with a small
// teal light), fitted to each model's footprint and driven by the cut height and a zig-zag phase.
import {
  BoxGeometry, Color, ConeGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight,
  SphereGeometry,
} from 'three';
import { GLSL, addWorldPos, shareUniforms } from './reveal.js';

const PRINT_WHITE = '#ECEAE4';
const PRINT_ROUGHNESS = 0.92;
const LINE_DARKNESS = 0.2;
const FRAME_COLOR = '#20335F';
const CARRIAGE_COLOR = '#9AA3B2';
const NOZZLE_COLOR = '#2A2F38';
const TEAL = '#3B99A3';
const RAIL = 0.028;
const POST = 0.022;
const CROSSBAR = 0.032;
const CARRIAGE = [0.085, 0.06, 0.07];
const NOZZLE = { radius: 0.018, height: 0.06 };
const GLOW_RADIUS = 0.011;
const CLEARANCE = 0.11;
const RAIL_GAP = 0.09;
const RAIL_OVERHANG = 0.08;
const LIGHT = { intensity: 0.05, distance: 0.4, decay: 2 };
const PASSES = { across: 26, along: 3 };

const PRINTED_PARS = `
uniform float uPrint;
uniform float uPaint;
uniform float uSoft;
uniform float uRadial;
uniform float uBand;
uniform float uBandOn;
uniform vec3 uBandColor;
uniform float uLayer;
uniform float uLayerH;
uniform float uExposure;
varying vec3 vWorldPos;
${GLSL.noise}
${GLSL.neutral}
bool bpHidden() {
  return bpPaintMetric(vWorldPos, uRadial) <= bpPaintFront(uPaint, uSoft) || vWorldPos.y > uPrint;
}
float bpLayerLine() {
  float coord = vWorldPos.y / uLayerH;
  float w = fwidth(coord);
  float d = abs(fract(coord + 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.06, 0.06 + w * 1.5, d);
  return line * (1.0 - smoothstep(0.3, 0.7, w));
}
`;

const PRINTED_UNIFORMS = ['uPrint', 'uPaint', 'uSoft', 'uRadial', 'uBand', 'uBandOn', 'uBandColor', 'uLayer', 'uLayerH', 'uExposure'];

/** Matte off-white between the paint front and the cut, with layer lines and the teal band just below the cut. */
export function createPrintedMaterial(uniforms) {
  const material = new MeshStandardMaterial({ color: PRINT_WHITE, roughness: PRINT_ROUGHNESS, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shareUniforms(shader, uniforms, PRINTED_UNIFORMS);
    addWorldPos(shader);
    shader.fragmentShader = PRINTED_PARS + shader.fragmentShader
      .replace('void main() {', 'void main() {\n  if (bpHidden()) discard;')
      .replace('#include <normal_fragment_begin>', GLSL.safeNormal)
      .replace('#include <color_fragment>', `#include <color_fragment>\n  diffuseColor.rgb *= 1.0 - ${LINE_DARKNESS.toFixed(2)} * uLayer * bpLayerLine();`)
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uBandColor * uBandOn * (1.0 - smoothstep(0.0, uBand, uPrint - vWorldPos.y));',
      )
      .replace('#include <tonemapping_fragment>', GLSL.toneMap);
  };
  material.customProgramCacheKey = () => 'bp-printed';
  return material;
}

/** Triangle wave in [0, 1] with period 2. */
const zigzag = (x) => 1 - Math.abs(2 * (x / 2 - Math.floor(x / 2)) - 1);

function createParts() {
  const box = new BoxGeometry(1, 1, 1);
  const frame = new MeshStandardMaterial({ color: FRAME_COLOR, metalness: 0.35, roughness: 0.45 });
  const carriage = new MeshStandardMaterial({ color: CARRIAGE_COLOR, metalness: 0.5, roughness: 0.35 });
  const nozzle = new MeshStandardMaterial({ color: NOZZLE_COLOR, metalness: 0.6, roughness: 0.3 });
  const glow = new MeshBasicMaterial({ color: new Color(TEAL).multiplyScalar(1.6) });
  return {
    rails: [new Mesh(box, frame), new Mesh(box, frame)],
    posts: [0, 1, 2, 3].map(() => new Mesh(box, frame)),
    crossbar: new Mesh(box, frame),
    carriage: new Mesh(box, carriage),
    nozzle: new Mesh(new ConeGeometry(NOZZLE.radius, NOZZLE.height, 20).rotateX(Math.PI), nozzle),
    glow: new Mesh(new SphereGeometry(GLOW_RADIUS, 16, 12), glow),
    light: new PointLight(TEAL, 0, LIGHT.distance, LIGHT.decay),
  };
}

/**
 * The gantry: fit() sizes it to a footprint once per model, set() moves it each frame. Its teal light lives
 * outside the group (add `light` to the scene once), so hiding the gantry never changes the light count and
 * never recompiles the lit materials.
 */
export function createGantry() {
  const group = new Group();
  const head = new Group();
  const p = createParts();
  const dims = { x: 1, z: 1 };
  head.add(p.carriage, p.nozzle, p.glow);
  group.add(...p.rails, ...p.posts, p.crossbar, head);
  group.visible = false;

  function fit([width, depth], yaw) {
    dims.x = width / 2 + RAIL_GAP;
    dims.z = depth / 2 + RAIL_OVERHANG;
    group.rotation.y = yaw;
    p.rails.forEach((rail, i) => { rail.scale.set(RAIL, RAIL, dims.z * 2); rail.position.x = (i ? 1 : -1) * dims.x; });
    p.posts.forEach((post, i) => post.position.set((i % 2 ? 1 : -1) * dims.x, 0, (i < 2 ? 1 : -1) * dims.z));
    p.crossbar.scale.set(dims.x * 2 + RAIL, CROSSBAR, CROSSBAR);
    p.carriage.scale.set(...CARRIAGE);
  }

  /** y: the cut height; phase: print progress (0–1) for the zig-zag; lift: extra height; glow: light (0–1). */
  function set({ y, phase, lift, glow }) {
    const railY = y + CLEARANCE + lift;
    const along = MathUtils.lerp(-dims.z + RAIL_OVERHANG, dims.z - RAIL_OVERHANG, zigzag(phase * PASSES.along));
    const across = MathUtils.lerp(-dims.x + RAIL_GAP, dims.x - RAIL_GAP, zigzag(phase * PASSES.across));
    p.rails.forEach((rail) => { rail.position.y = railY; });
    p.posts.forEach((post) => { post.scale.set(POST, railY, POST); post.position.y = railY / 2; });
    p.crossbar.position.set(0, railY, along);
    head.position.set(across, railY, along);
    p.nozzle.position.y = -CARRIAGE[1] / 2 - NOZZLE.height / 2;
    p.glow.position.y = -CLEARANCE + GLOW_RADIUS;
    p.glow.visible = glow > 0.01;
    group.updateMatrixWorld(true);
    p.glow.getWorldPosition(p.light.position);
    p.light.intensity = group.visible ? LIGHT.intensity * glow : 0;
  }

  function show(visible) {
    group.visible = visible;
    if (!visible) p.light.intensity = 0;
  }

  return { group, light: p.light, fit, set, show };
}
