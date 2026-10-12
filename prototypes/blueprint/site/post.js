// Post-processing for the site stage: the scene renders into a multisampled HalfFloat target (so edges stay
// anti-aliased through the passes), then ambient occlusion (GTAO, desktop only, loaded on demand), screen-space
// ink edges for the drawing stages, and the output pass. Colour stays linear and premultiplied until the end;
// the output un-premultiplies, encodes sRGB and premultiplies again, so the vellum page shows through the
// transparent canvas without halos.
import { Color, HalfFloatType, NearestFilter, ShaderMaterial, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { INK_LAYER } from './reveal.js';

const MSAA_SAMPLES = 4;
const AO_RESOLUTION = 0.5;
const AO_PARAMS = { radius: 0.16, distanceExponent: 1.5, thickness: 1, scale: 1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false };
const AO_DENOISE = { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 };
const INK = '#20335F';
const INK_WIDTH_PER_PX = 0.75;
const EDGE = { normal: [0.2, 0.42], depth: [0.012, 0.03], back: 0.55 };

const QUAD_VERTEX = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

const OUTPUT_FRAGMENT = `
uniform sampler2D tDiffuse;
varying vec2 vUv;
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  if (any(isnan(c))) c = vec4(0.0);
  vec3 straight = c.a > 1e-4 ? clamp(c.rgb / c.a, 0.0, 1.0) : vec3(0.0);
  gl_FragColor = vec4(toSrgb(straight) * c.a, c.a);
}`;

const INK_FRAGMENT = `
uniform sampler2D tDiffuse;
uniform sampler2D tInk;
uniform vec2 uStep;
uniform float uStrength;
uniform vec3 uInkColor;
varying vec2 vUv;
float edgeTo(vec4 c, vec2 offset) {
  vec4 o = texture2D(tInk, vUv + offset);
  if (o.w == 0.0) return 1.0;
  float near = abs(c.w);
  float depthEdge = smoothstep(${EDGE.depth[0]}, ${EDGE.depth[1]}, abs(near - abs(o.w)) / near);
  float normalEdge = smoothstep(${EDGE.normal[0]}, ${EDGE.normal[1]}, 1.0 - dot(c.xyz, o.xyz));
  return max(depthEdge, normalEdge);
}
void main() {
  vec4 color = texture2D(tDiffuse, vUv);
  vec4 c = texture2D(tInk, vUv);
  if (c.w <= 0.0) { gl_FragColor = color; return; }
  float ahead = max(edgeTo(c, vec2(uStep.x, 0.0)), edgeTo(c, vec2(0.0, uStep.y)));
  float behind = max(edgeTo(c, vec2(-uStep.x, 0.0)), edgeTo(c, vec2(0.0, -uStep.y)));
  float e = clamp(max(ahead, behind * ${EDGE.back}), 0.0, 1.0) * uStrength;
  gl_FragColor = mix(color, vec4(uInkColor, 1.0), e);
}`;

/** Degenerate triangles normalise to NaN; GTAO would spread that into black specks. */
function guardNormals(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      '#include <normal_fragment_begin>\n  if (any(isnan(normal))) normal = vec3(0.0, 0.0, 1.0);',
    );
  };
}

function createInkPass(target) {
  const material = new ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null }, tInk: { value: target.texture }, uStep: { value: [1, 1] },
      uStrength: { value: 0 }, uInkColor: { value: new Color(INK) },
    },
    vertexShader: QUAD_VERTEX, fragmentShader: INK_FRAGMENT, depthTest: false, depthWrite: false,
  });
  const pass = new ShaderPass(material);
  pass.enabled = false;
  return pass;
}

function createOutputPass() {
  return new ShaderPass(new ShaderMaterial({
    uniforms: { tDiffuse: { value: null } }, vertexShader: QUAD_VERTEX, fragmentShader: OUTPUT_FRAGMENT,
    depthTest: false, depthWrite: false,
  }));
}

/**
 * The stage's composer. inkMaterial writes normals and depth for the ink edges (drawn from INK_LAYER only);
 * withAo loads GTAO lazily. render() replaces renderer.render(); setAo() and setInk() take 0–1 strengths.
 */
export function createPost(renderer, scene, camera, { inkMaterial, withAo }) {
  const sceneTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: MSAA_SAMPLES });
  const inkTarget = new WebGLRenderTarget(1, 1, { type: HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter });
  const composer = new EffectComposer(renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType }));
  composer.renderTarget2.dispose();
  composer.renderTarget2 = sceneTarget;
  const ink = createInkPass(inkTarget);
  const s = { ao: null, aoStrength: 0, pixelRatio: 0, needsWarm: true };
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(ink);
  composer.addPass(createOutputPass());
  if (withAo) loadAo();

  function loadAo() {
    import('three/addons/postprocessing/GTAOPass.js').then(({ GTAOPass }) => {
      const pass = new GTAOPass(scene, camera, 1, 1, undefined, AO_PARAMS, AO_DENOISE);
      guardNormals(pass.normalMaterial);
      const fullSize = pass.setSize.bind(pass);
      pass.setSize = (w, h) => fullSize(Math.max(1, Math.round(w * AO_RESOLUTION)), Math.max(1, Math.round(h * AO_RESOLUTION)));
      composer.insertPass(pass, 1);
      s.ao = pass;
      setAo(s.aoStrength);
    }).catch((err) => console.warn('Ambient occlusion unavailable.', err));
  }

  function setAo(strength) {
    s.aoStrength = strength;
    if (!s.ao) return;
    s.ao.enabled = strength > 0.001;
    s.ao.blendIntensity = strength;
  }

  function setInk(strength) {
    ink.enabled = strength > 0.001;
    ink.uniforms.uStrength.value = strength;
  }

  function setSize(width, height, pixelRatio) {
    if (pixelRatio !== s.pixelRatio) composer.setPixelRatio(pixelRatio);
    s.pixelRatio = pixelRatio;
    composer.setSize(width, height);
    inkTarget.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    const step = Math.max(1, Math.round(pixelRatio * INK_WIDTH_PER_PX));
    ink.uniforms.uStep.value = [step / (width * pixelRatio), step / (height * pixelRatio)];
  }

  function renderInkBuffer() {
    const layers = camera.layers.mask;
    camera.layers.set(INK_LAYER);
    scene.overrideMaterial = inkMaterial;
    renderer.setRenderTarget(inkTarget);
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.mask = layers;
  }

  /** The next frame runs every pass once (at no visible strength), so their shaders compile up front. */
  function warm() {
    s.needsWarm = true;
  }

  function render() {
    // The scene always renders into the multisampled target, however many passes swapped last frame.
    composer.readBuffer = sceneTarget;
    composer.writeBuffer = composer.renderTarget1;
    const isWarming = s.needsWarm && s.ao;
    if (isWarming) s.ao.enabled = true;
    if (ink.enabled) renderInkBuffer();
    composer.render();
    if (!isWarming) return;
    s.needsWarm = false;
    setAo(s.aoStrength);
  }

  return { render, setSize, setAo, setInk, warm, target: sceneTarget };
}
