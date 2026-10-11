// W-401 water surface, adapted from the Flow prototype's water.js: one raw WebGL2 fragment pass with
// analytic ripples, swells, Voronoi-edge caustics and silt, re-coloured from cyanotype navy into teal.
// It covers one sheet (not the viewport); the selected plant capacity sets current speed and clarity.
const MAX_DROPS = 32;
const DROP_LIFE_S = 3.2;
const DPR_CAP = 2;
const PIXEL_BUDGET_FINE = 1.0e6;
const PIXEL_BUDGET_COARSE = 0.45e6;
const MIN_BUDGET = 0.2e6;
const SLOW_FRAME_MS = 24;
const IDLE_AFTER_MS = 5000;
const IDLE_FRAME_MS = 32;
const RAIN_EVERY_MS = [2600, 4800];
const FLOW_EASE = 0.04;

const VERTEX_SOURCE = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_px;
uniform float u_time;
uniform float u_flow;
uniform float u_drift;
uniform vec4 u_drops[${MAX_DROPS}];
out vec4 outColor;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float lum(vec3 c) { return dot(pow(max(c, 0.0), vec3(2.2)), vec3(0.2126, 0.7152, 0.0722)); }

float cellEdge(vec2 p, float t) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float d1 = 9.0;
  float d2 = 9.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      o = 0.5 + 0.38 * sin(t + 6.2831853 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}

float caustic(vec2 p, float t, float sharp) {
  vec2 w = vec2(noise(p * 0.42 + t * 0.06), noise(p * 0.42 + 19.7 - t * 0.05)) - 0.5;
  vec2 w2 = vec2(noise(p * 1.3 - t * 0.09 + 7.1), noise(p * 1.3 + t * 0.08 + 3.3)) - 0.5;
  p += w * 1.35 + w2 * 0.22;
  float a = cellEdge(p, t * 0.8);
  float b = cellEdge(p * 1.41 + 4.3, t * 0.63 + 2.0);
  return exp(-a * sharp) * 0.6 + exp(-b * sharp * 1.15) * 0.45 + exp(-a * sharp * 0.28) * 0.12 + exp(-b * sharp * 0.3) * 0.08;
}

float specks(vec2 q, float t, float cellSize) {
  vec2 cell = floor(q / cellSize);
  vec2 f = q - cell * cellSize;
  float rnd = hash12(cell);
  vec2 o = (0.2 + 0.6 * hash22(cell + 3.1)) * cellSize;
  o += vec2(sin(t * 0.4 + rnd * 9.0), cos(t * 0.33 + rnd * 7.0)) * 2.5;
  float size = 0.6 + rnd * 1.4;
  return step(0.58, rnd) * smoothstep(size + 1.1, size * 0.25, length(f - o));
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_px;
  vec2 view = u_res / u_px;
  vec2 p = css;
  float t = u_time;
  float k = u_flow;
  float clarity = mix(0.22, 0.72, k);
  float rough = mix(0.3, 0.8, k);
  float silt = (1.0 - k) * 0.7;

  // Cyanotype navy (#123566 / #0E2C57) drifting into a deep teal toward the lower right.
  float v = clamp(css.y / view.y, 0.0, 1.0);
  float gx = clamp(css.x / view.x, 0.0, 1.0);
  vec3 navy = mix(vec3(0.071, 0.208, 0.400), vec3(0.055, 0.173, 0.341), v);
  vec3 water = mix(navy, vec3(0.075, 0.300, 0.370), smoothstep(0.25, 1.1, 0.5 * v + 0.5 * gx) * 0.8);

  float h = 0.0;
  float focus = 0.0;
  vec2 g = vec2(0.0);
  vec2 D[5] = vec2[5](vec2(0.82, 0.57), vec2(-0.45, 0.89), vec2(0.97, -0.24), vec2(-0.71, -0.70), vec2(0.20, 0.98));
  float L[5] = float[5](520.0, 330.0, 210.0, 140.0, 92.0);
  float A[5] = float[5](7.0, 4.5, 3.0, 1.8, 1.1);
  float pace = mix(0.7, 1.5, k);
  for (int i = 0; i < 5; i++) {
    float kk = 6.2831853 / L[i];
    float speed = (0.12 * L[i] + 14.0) * pace;
    float ph = kk * (dot(D[i], p) - speed * t) + float(i) * 1.7;
    float a = A[i] * (0.25 + 0.75 * rough);
    float s = sin(ph);
    h += a * s;
    g += a * kk * cos(ph) * D[i];
    focus += a * kk * kk * s;
  }
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    vec4 d = u_drops[i];
    float age = t - d.z;
    if (d.w <= 0.0 || age < 0.0 || age > ${DROP_LIFE_S.toFixed(1)}) continue;
    vec2 dv = p - d.xy;
    float r = length(dv) + 0.001;
    float front = 8.0 + 230.0 * age;
    float sig = 14.0 + 34.0 * age;
    float x = r - front;
    float env = exp(-x * x / (2.0 * sig * sig));
    float amp = 1.35 * d.w * exp(-1.25 * age) * env / sqrt(1.0 + r * 0.02);
    const float kr = 0.2;
    float s = sin(kr * x);
    float c = cos(kr * x);
    h += amp * s;
    g += amp * (kr * c - x / (sig * sig) * s) * dv / r;
    focus += amp * s * kr * kr;
  }
  vec2 chop = vec2(0.0);
  for (int i = 0; i < 2; i++) {
    vec2 dir = i == 0 ? vec2(0.6, -0.8) : vec2(-0.93, 0.37);
    float kc = i == 0 ? 0.143 : 0.217;
    float ph = kc * (dot(dir, p) - 26.0 * pace * t) + float(i) * 2.3;
    chop += (i == 0 ? 0.32 : 0.2) * (0.3 + 0.7 * rough) * kc * cos(ph) * dir;
  }
  vec3 n = normalize(vec3(-g, 1.0));
  vec3 ns = normalize(vec3(-(g + chop), 1.0));

  // The floor and caustics drift left to right with the schematic's flow.
  float depth = mix(95.0, 32.0, clarity);
  vec2 fp = css - vec2(u_drift, 0.0) + g * depth;
  float sand = noise(fp * 0.018) * 0.6 + noise(fp * 0.05) * 0.4;
  float swell = noise(fp * 0.0024 + vec2(t * 0.012, 0.0));
  vec3 col = water * (0.9 + 0.12 * swell + 0.06 * sand);

  float scale = mix(1.0 / 170.0, 1.0 / 90.0, clarity);
  float sharp = mix(7.0, 19.0, clarity);
  float cau = caustic(fp * scale + n.xy * 0.35, t * 0.55, sharp);
  cau *= 0.5 + 0.9 * noise(fp * 0.0032 + vec2(t * 0.03, -t * 0.02));
  vec3 light = mix(vec3(0.42, 0.74, 0.84), vec3(0.80, 0.93, 1.0), clarity);
  col += light * cau * mix(0.07, 0.16, clarity);
  col += light * clamp(focus * 5.0, -0.3, 0.6) * mix(0.07, 0.3, clarity);

  float sp = specks(fp + vec2(t * 3.0, -t * 5.0) + g * 12.0, t, 22.0) + 0.7 * specks(fp * 0.92 + vec2(-t * 2.0, -t * 3.0), t * 0.8, 34.0);
  col += vec3(0.10, 0.14, 0.16) * sp * silt;
  col += vec3(0.45, 0.70, 0.84) * (1.0 - n.z) * 0.6;
  vec3 hv = normalize(vec3(-0.32, 0.42, 1.0) + vec3(0.0, 0.0, 1.0));
  col += vec3(0.85, 0.95, 1.0) * pow(max(dot(ns, hv), 0.0), 900.0) * 0.4;

  vec2 uv = css / view - 0.5;
  col *= 0.86 + 0.14 * smoothstep(0.95, 0.25, length(uv * vec2(1.0, 1.15)));

  // Contrast guard: the sheet's light and muted text needs a dark ground, so luminance is capped.
  float lc = lum(col);
  col *= pow(min(1.0, 0.072 / max(lc, 1e-4)), 1.0 / 2.2);

  col += (hash12(gl_FragCoord.xy + fract(t) * 61.0) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  const log = gl.getShaderInfoLog(shader);
  gl.deleteShader(shader);
  throw new Error(`Water shader failed to compile: ${log}`);
}

function buildProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE));
  gl.bindAttribLocation(program, 0, 'a_pos');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  return program;
}

export function createSurface({ canvas, coarse = false, onLost }) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'default' });
  if (!gl) throw new Error('WebGL2 is unavailable');

  const drops = new Float32Array(MAX_DROPS * 4);
  const clockStart = performance.now();
  let budget = coarse ? PIXEL_BUDGET_COARSE : PIXEL_BUDGET_FINE;
  let uniforms = null;
  let dropIndex = 0;
  let raf = 0;
  let visible = false;
  let lost = false;
  let lastFrame = 0;
  let lastInput = performance.now();
  let lastRain = performance.now();
  let slowFrames = 0;
  let frameCount = 0;
  let flow = 0.25;
  let flowTarget = 0.25;
  let drift = 0;
  let lastTime = 0;

  const now = () => (performance.now() - clockStart) / 1000;

  function setup() {
    const program = buildProgram(gl);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const names = ['u_res', 'u_px', 'u_time', 'u_flow', 'u_drift', 'u_drops'];
    uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
    resize();
  }

  function resize() {
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const scale = Math.max(0.3, Math.min(dpr, Math.sqrt(budget / (cssW * cssH))));
    const width = Math.round(cssW * scale);
    const height = Math.round(cssH * scale);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function draw(time) {
    const dt = Math.min(Math.max(time - lastTime, 0), 0.1);
    lastTime = time;
    flow += (flowTarget - flow) * Math.min(1, FLOW_EASE * 60 * dt);
    drift += dt * (6 + 26 * flow);
    gl.uniform2f(uniforms.u_res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.u_px, canvas.width / Math.max(1, canvas.clientWidth));
    gl.uniform1f(uniforms.u_time, time);
    gl.uniform1f(uniforms.u_flow, flow);
    gl.uniform1f(uniforms.u_drift, drift);
    gl.uniform4fv(uniforms.u_drops, drops);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function hasLiveDrops(time) {
    for (let i = 0; i < MAX_DROPS; i += 1) {
      if (drops[i * 4 + 3] > 0 && time - drops[i * 4 + 2] < DROP_LIFE_S) return true;
    }
    return false;
  }

  function addDrop(x, y, amp) {
    if (lost) return;
    const i = dropIndex * 4;
    drops[i] = x;
    drops[i + 1] = y;
    drops[i + 2] = now();
    drops[i + 3] = amp;
    dropIndex = (dropIndex + 1) % MAX_DROPS;
  }

  function rain(frameNow) {
    const wait = RAIN_EVERY_MS[0] + Math.random() * (RAIN_EVERY_MS[1] - RAIN_EVERY_MS[0]);
    if (frameNow - lastInput < IDLE_AFTER_MS * 0.6 || frameNow - lastRain < wait) return;
    lastRain = frameNow;
    const r = canvas.getBoundingClientRect();
    const top = Math.max(0, -r.top);
    const bottom = Math.min(r.height, window.innerHeight - r.top);
    if (bottom <= top) return;
    addDrop(r.width * (0.15 + Math.random() * 0.7), top + (bottom - top) * (0.15 + Math.random() * 0.7), 0.5 + Math.random() * 0.5);
  }

  function adapt(delta) {
    frameCount += 1;
    if (delta > SLOW_FRAME_MS && delta < 250) slowFrames += 1;
    if (frameCount < 90) return;
    if (slowFrames > 45 && budget > MIN_BUDGET) {
      budget = Math.max(MIN_BUDGET, budget * 0.72);
      resize();
    }
    frameCount = 0;
    slowFrames = 0;
  }

  function frame(frameNow) {
    raf = requestAnimationFrame(frame);
    const delta = frameNow - lastFrame;
    const time = now();
    const idle = frameNow - lastInput > IDLE_AFTER_MS && !hasLiveDrops(time) && Math.abs(flowTarget - flow) < 0.01;
    if (idle && delta < IDLE_FRAME_MS) return;
    lastFrame = frameNow;
    if (!idle) adapt(delta);
    rain(frameNow);
    draw(time);
  }

  function start() {
    if (raf || lost || !visible || document.hidden) return;
    lastFrame = performance.now();
    lastTime = now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    stop();
    onLost?.();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  const sizeObserver = new ResizeObserver(() => { if (!lost) { resize(); draw(now()); } });
  sizeObserver.observe(canvas);

  setup();
  draw(0);

  return {
    addDrop(x, y, amp) {
      lastInput = performance.now();
      addDrop(x, y, amp);
    },
    setFlow(k) {
      flowTarget = Math.min(1, Math.max(0, k));
      lastInput = performance.now();
    },
    setVisible(v) {
      visible = v;
      if (v) start();
      else stop();
    },
    isRunning: () => raf !== 0,
  };
}
