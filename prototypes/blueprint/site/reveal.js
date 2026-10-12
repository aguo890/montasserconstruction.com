// Materials for the build sequence. Two fronts split every model: above the print cut uPrint (world y) the
// drawing renders (a vellum fill with ink tone and pen hatching, plus an inverted-hull navy outline); below
// it the matte printed material (print.js), until the colour front uPaint reaches it and the textured "built"
// materials take over. The colour front spreads from the centre and upward (height + uRadial × distance
// from the axis) and is dithered; the HQ model replaces the preview through a complementary dither
// (uHqMix), so no pixel ever shows both. Built and printed materials tone-map themselves (three's Neutral curve); the drawing,
// ground and annotations keep their exact paper and ink colours.
import { BackSide, Color, DoubleSide, ShaderMaterial, Vector2, Vector3 } from 'three';

const INK = '#20335F';
const PAPER = '#F6F2EB';
const TEAL = '#3B99A3';
const BAND_GAIN = 2.4;
const BAND_HEIGHT = 0.014;
const PAINT_SOFT = 0.05;
const PAINT_RADIAL = 0.6;
const OUTLINE_PX = 1.35;
const LAYER_HEIGHT = 0.014;
const EXPOSURE = 1;
const LIGHT_DIR = [0.45, 0.8, 0.35];
const OPEN = 1e3;
// Pushes the outline behind the fill while the model is flattened (NDC units), so the plan never z-fights.
const HULL_FLAT_BIAS = 0.0012;
export const INK_LAYER = 1;
export const ROLE = { preview: 0, hq: 1 };

/** Uniforms shared by every material of the stage; only one model shows at a time. */
export function createRevealUniforms() {
  return {
    uPrint: { value: OPEN },
    uPaint: { value: OPEN },
    uSoft: { value: PAINT_SOFT },
    uRadial: { value: PAINT_RADIAL },
    uBand: { value: BAND_HEIGHT },
    uBandOn: { value: 0 },
    uPaintOn: { value: 0 },
    uBandColor: { value: new Color(TEAL).multiplyScalar(BAND_GAIN) },
    uInk: { value: new Color(INK) },
    uPaper: { value: new Color(PAPER) },
    uLight: { value: new Vector3(...LIGHT_DIR).normalize() },
    uRes: { value: new Vector2(1, 1) },
    uPx: { value: 1 },
    uWidth: { value: OUTLINE_PX },
    uTone: { value: 1 },
    uReveal: { value: OPEN },
    uExtrude: { value: 1 },
    uHqMix: { value: 0 },
    uLayer: { value: 1 },
    uLayerH: { value: LAYER_HEIGHT },
    uExposure: { value: EXPOSURE },
  };
}

/** GLSL shared by the patched materials: a screen-space dither and three's Neutral tone curve (r170). */
export const GLSL = {
  noise: `
float bpNoise(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float bpPaintFront(float paint, float soft) { return paint + (bpNoise(gl_FragCoord.xy + 37.0) - 0.5) * soft; }
float bpPaintMetric(vec3 world, float radial) { return world.y + radial * length(world.xz); }`,
  neutral: `
vec3 bpNeutral(vec3 color) {
  const float startCompression = 0.8 - 0.04;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < startCompression) return color;
  float d = 1.0 - startCompression;
  float newPeak = 1.0 - d * d / (peak + d - startCompression);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}`,
  toneMap: 'gl_FragColor.rgb = bpNeutral(gl_FragColor.rgb * uExposure);',
  // AI meshes carry degenerate triangles whose normals normalise to NaN (black specks); use the face normal.
  safeNormal: `#include <normal_fragment_begin>
  if (any(isnan(normal)) || dot(vNormal, vNormal) < 1e-12) {
    normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
    nonPerturbedNormal = normal;
  }`,
};

/** Adds a world-position varying (vWorldPos) to a built-in material's vertex shader. */
export function addWorldPos(shader) {
  shader.vertexShader = `varying vec3 vWorldPos;\n${shader.vertexShader.replace(
    '#include <project_vertex>',
    '#include <project_vertex>\n  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
  )}`;
}

export function shareUniforms(shader, uniforms, names) {
  names.forEach((name) => { shader.uniforms[name] = uniforms[name]; });
}

const BUILT_PARS = `
uniform float uPaint;
uniform float uSoft;
uniform float uRadial;
uniform float uHqMix;
uniform float uRole;
uniform float uBand;
uniform float uPaintOn;
uniform vec3 uBandColor;
uniform float uExposure;
varying vec3 vWorldPos;
${GLSL.noise}
${GLSL.neutral}
vec3 bpSrgbToLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
bool bpHidden() {
  float swap = bpNoise(gl_FragCoord.xy);
  bool replaced = uRole < 0.5 ? swap < uHqMix : swap >= uHqMix;
  return replaced || bpPaintMetric(vWorldPos, uRadial) > bpPaintFront(uPaint, uSoft);
}
float bpFrontGlow() { return 1.0 - smoothstep(0.0, uBand, abs(uPaint - bpPaintMetric(vWorldPos, uRadial))); }
`;

const BUILT_UNIFORMS = ['uPaint', 'uSoft', 'uRadial', 'uHqMix', 'uBand', 'uPaintOn', 'uBandColor', 'uExposure'];

const MAP_DECODED = `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);
  sampledDiffuseColor.rgb = bpSrgbToLinear(sampledDiffuseColor.rgb);
  diffuseColor *= sampledDiffuseColor;
#endif`;

/**
 * Built side: shows below the paint front with a faint teal edge while it sweeps; role picks preview or HQ.
 * Its base colour map is stored without an sRGB format (see model.js) and decoded here.
 */
export function patchBuiltMaterial(material, uniforms, role) {
  material.onBeforeCompile = (shader) => {
    shareUniforms(shader, uniforms, BUILT_UNIFORMS);
    shader.uniforms.uRole = { value: role };
    addWorldPos(shader);
    shader.fragmentShader = BUILT_PARS + shader.fragmentShader
      .replace('void main() {', 'void main() {\n  if (bpHidden()) discard;')
      .replace('#include <map_fragment>', MAP_DECODED)
      .replace('#include <normal_fragment_begin>', GLSL.safeNormal)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uBandColor * uPaintOn * bpFrontGlow();')
      .replace('#include <tonemapping_fragment>', GLSL.toneMap);
  };
  material.customProgramCacheKey = () => 'bp-built';
  material.needsUpdate = true;
}

// World normal with the extrusion (outer scale.y) undone, so the flattened plan keeps its roof-plan shading.
const REST_NORMAL = `
uniform float uExtrude;
vec3 bpRestNormal() {
  vec3 n = mat3(modelMatrix) * normal;
  n.y /= max(uExtrude, 1e-3);
  return dot(n, n) > 1e-12 ? normalize(n) : vec3(0.0, 1.0, 0.0);
}`;

const DRAW_VERTEX = `
${REST_NORMAL}
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = bpRestNormal();
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const DRAW_FRAGMENT = `
uniform float uPrint;
uniform float uReveal;
uniform float uTone;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uLight;
uniform float uPx;
varying vec3 vNormalW;
varying vec3 vWorld;
float hatch(float coord, float spacing, float density) {
  float f = fract(coord / spacing);
  float w = fwidth(coord / spacing);
  return density <= 0.0 ? 0.0 : 1.0 - smoothstep(density - w, density + w, f);
}
void main() {
  if (vWorld.y < uPrint || length(vWorld.xz) > uReveal) discard;
  vec3 n0 = dot(vNormalW, vNormalW) > 1e-12 ? normalize(vNormalW) : vec3(0.0, 1.0, 0.0);
  vec3 n = faceforward(n0, vWorld - cameraPosition, n0);
  float tone = clamp(0.5 - 0.5 * dot(n, uLight), 0.0, 1.0);
  float single = hatch(gl_FragCoord.x - gl_FragCoord.y, 5.0 * uPx, smoothstep(0.42, 0.9, tone) * 0.42);
  float cross = hatch(gl_FragCoord.x + gl_FragCoord.y, 6.0 * uPx, smoothstep(0.7, 1.0, tone) * 0.36);
  float ink = (tone * 0.16 + max(single, cross) * 0.42) * uTone;
  gl_FragColor = vec4(mix(uPaper, uInk, ink), 1.0);
  #include <colorspace_fragment>
}`;

const HULL_VERTEX = `
uniform vec2 uRes;
uniform float uWidth;
uniform float uPx;
uniform float uExtrude;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 clip = projectionMatrix * viewMatrix * world;
  vec4 clipNormal = projectionMatrix * viewMatrix * vec4(normalize(mat3(modelMatrix) * normal), 0.0);
  float len = length(clipNormal.xy);
  if (len > 1e-5) clip.xy += clipNormal.xy / len * (uWidth * uPx * 2.0 / uRes) * clip.w;
  clip.z += (1.0 - smoothstep(0.0, 0.25, uExtrude)) * ${HULL_FLAT_BIAS} * clip.w;
  gl_Position = clip;
}`;

const HULL_FRAGMENT = `
uniform float uPrint;
uniform float uReveal;
uniform vec3 uInk;
varying vec3 vWorld;
void main() {
  if (vWorld.y < uPrint || length(vWorld.xz) > uReveal) discard;
  gl_FragColor = vec4(uInk, 1.0);
  #include <colorspace_fragment>
}`;

/** The drawing's two shared materials: the toned vellum fill and the back-face outline. */
export function createDrawingMaterials(uniforms) {
  const fill = new ShaderMaterial({
    uniforms, vertexShader: DRAW_VERTEX, fragmentShader: DRAW_FRAGMENT, side: DoubleSide, toneMapped: false,
  });
  const hull = new ShaderMaterial({
    uniforms, vertexShader: HULL_VERTEX, fragmentShader: HULL_FRAGMENT, side: BackSide, toneMapped: false,
  });
  return { fill, hull };
}

const INK_VERTEX = `
${REST_NORMAL}
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 view = viewMatrix * world;
  vWorld = world.xyz;
  vNormalV = mat3(viewMatrix) * bpRestNormal();
  vViewDir = -view.xyz;
  gl_Position = projectionMatrix * view;
}`;

// Normal (xyz) and view depth (w) for the ink-edge pass; depth is negative on the printed part, so edges stay
// on the drawing while printed surfaces still hide what is behind them.
const INK_FRAGMENT = `
uniform float uPrint;
uniform float uReveal;
varying vec3 vNormalV;
varying vec3 vViewDir;
varying vec3 vWorld;
void main() {
  if (length(vWorld.xz) > uReveal) discard;
  vec3 n = dot(vNormalV, vNormalV) > 1e-12 ? normalize(vNormalV) : vec3(0.0, 0.0, 1.0);
  if (dot(n, vViewDir) < 0.0) n = -n;
  float depth = length(vViewDir);
  gl_FragColor = vec4(n, vWorld.y >= uPrint ? depth : -depth);
}`;

/** Override material that writes the drawing's normals and depth for the screen-space ink edges. */
export function createInkMaterial(uniforms) {
  return new ShaderMaterial({ uniforms, vertexShader: INK_VERTEX, fragmentShader: INK_FRAGMENT, side: DoubleSide });
}
