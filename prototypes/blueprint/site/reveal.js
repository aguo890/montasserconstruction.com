// Materials for the drawing-to-built reveal. One horizontal cut (uCut, world y) splits every model:
// below it the textured "built" materials render, above it the drawing (a vellum fill with a light
// normal-based ink tone and pen hatching, plus an inverted-hull navy outline). A thin teal band glows
// on the built side of the cut while it moves.
import { BackSide, Color, DoubleSide, ShaderMaterial, Vector2, Vector3 } from 'three';

const INK = '#20335F';
const PAPER = '#F6F2EB';
const TEAL = '#3B99A3';
const BAND_GAIN = 2.4;
const BAND_HEIGHT = 0.035;
const OUTLINE_PX = 1.35;
const LIGHT_DIR = [0.45, 0.8, 0.35];

/** Uniforms shared by every material of the stage; only one model shows at a time. */
export function createRevealUniforms() {
  return {
    uCut: { value: 0 },
    uBand: { value: BAND_HEIGHT },
    uBandOn: { value: 0 },
    uBandColor: { value: new Color(TEAL).multiplyScalar(BAND_GAIN) },
    uInk: { value: new Color(INK) },
    uPaper: { value: new Color(PAPER) },
    uLight: { value: new Vector3(...LIGHT_DIR).normalize() },
    uRes: { value: new Vector2(1, 1) },
    uPx: { value: 1 },
    uWidth: { value: OUTLINE_PX },
  };
}

const CUT_VERTEX = `
varying float vCutY;
`;

/** Built side: discard above the cut and add the teal band just below it. */
export function patchBuiltMaterial(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    ['uCut', 'uBand', 'uBandOn', 'uBandColor'].forEach((k) => { shader.uniforms[k] = uniforms[k]; });
    shader.vertexShader = CUT_VERTEX + shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n  vCutY = (modelMatrix * vec4(transformed, 1.0)).y;',
    );
    shader.fragmentShader = `uniform float uCut;\nuniform float uBand;\nuniform float uBandOn;\nuniform vec3 uBandColor;\n${CUT_VERTEX}`
      + shader.fragmentShader
        .replace('void main() {', 'void main() {\n  if (vCutY > uCut) discard;')
        .replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uBandColor * uBandOn * (1.0 - smoothstep(0.0, uBand, uCut - vCutY));',
        );
  };
  material.customProgramCacheKey = () => 'bp-built-cut';
  material.needsUpdate = true;
}

const DRAW_VERTEX = `
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vCutY;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vCutY = world.y;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const DRAW_FRAGMENT = `
uniform float uCut;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uLight;
uniform float uPx;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vCutY;
void main() {
  if (vCutY < uCut) discard;
  vec3 n = normalize(vNormalW);
  n = faceforward(n, vWorld - cameraPosition, n);
  float tone = clamp(0.5 - 0.5 * dot(n, uLight), 0.0, 1.0);
  float lines = fract((gl_FragCoord.x - gl_FragCoord.y + 0.5) / (5.0 * uPx));
  float hatch = 1.0 - step(smoothstep(0.5, 0.95, tone) * 0.42, lines);
  vec3 color = mix(uPaper, uInk, tone * 0.2 + hatch * 0.38);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

const HULL_VERTEX = `
uniform vec2 uRes;
uniform float uWidth;
uniform float uPx;
varying float vCutY;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vCutY = world.y;
  vec4 clip = projectionMatrix * viewMatrix * world;
  vec4 clipNormal = projectionMatrix * viewMatrix * vec4(normalize(mat3(modelMatrix) * normal), 0.0);
  float len = length(clipNormal.xy);
  if (len > 1e-5) clip.xy += clipNormal.xy / len * (uWidth * uPx * 2.0 / uRes) * clip.w;
  gl_Position = clip;
}`;

const HULL_FRAGMENT = `
uniform float uCut;
uniform vec3 uInk;
varying float vCutY;
void main() {
  if (vCutY < uCut) discard;
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
  return { fill, hull, dispose: () => { fill.dispose(); hull.dispose(); } };
}
