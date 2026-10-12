// The drafting table under each model: a vellum disc with a faint teal grid that fades into the page,
// a navy shadow catcher, and the teal ring that marks the construction cut while it rises.
import {
  BufferGeometry, CanvasTexture, CircleGeometry, DoubleSide, Float32BufferAttribute, Group, LineBasicMaterial,
  LineLoop, Mesh, MeshBasicMaterial, ShadowMaterial, SRGBColorSpace,
} from 'three';

const GROUND_RADIUS = 2.7;
const TEXTURE_PX = 1024;
const MINOR_STEP = 0.1;
const MAJOR_EVERY = 5;
const SHADOW_OPACITY = 0.2;
const RING_SEGMENTS = 128;
const VELLUM = 'rgb(246, 242, 235)';
const TEAL_MINOR = 'rgba(59, 153, 163, .2)';
const TEAL_MAJOR = 'rgba(59, 153, 163, .38)';
const INK_RING = 'rgba(32, 51, 95, .35)';

function drawGridLines(g, px) {
  const unit = px / (GROUND_RADIUS * 2);
  const lines = Math.ceil(GROUND_RADIUS / MINOR_STEP);
  for (let i = -lines; i <= lines; i += 1) {
    const at = px / 2 + i * MINOR_STEP * unit;
    g.strokeStyle = i % MAJOR_EVERY === 0 ? TEAL_MAJOR : TEAL_MINOR;
    g.lineWidth = i % MAJOR_EVERY === 0 ? 1.6 : 1;
    g.beginPath(); g.moveTo(at, 0); g.lineTo(at, px); g.moveTo(0, at); g.lineTo(px, at); g.stroke();
  }
  g.strokeStyle = INK_RING;
  g.lineWidth = 1.4;
  g.setLineDash([10, 8]);
  g.beginPath(); g.arc(px / 2, px / 2, px * 0.4, 0, Math.PI * 2); g.stroke();
}

function gridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_PX;
  const g = canvas.getContext('2d');
  g.fillStyle = VELLUM;
  g.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);
  drawGridLines(g, TEXTURE_PX);
  const fade = g.createRadialGradient(TEXTURE_PX / 2, TEXTURE_PX / 2, TEXTURE_PX * 0.28, TEXTURE_PX / 2, TEXTURE_PX / 2, TEXTURE_PX / 2);
  fade.addColorStop(0, 'rgba(0, 0, 0, 1)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = fade;
  g.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function flat(mesh, y) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

function ringGeometry() {
  const points = [];
  for (let i = 0; i < RING_SEGMENTS; i += 1) {
    const a = (i / RING_SEGMENTS) * Math.PI * 2;
    points.push(Math.cos(a), 0, Math.sin(a));
  }
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(points, 3));
}

/** The cut marker: a teal ring with a faint fill, scaled to the model and moved to the cut height. */
function createCutRing(teal) {
  const ring = new Group();
  const line = new LineLoop(ringGeometry(), new LineBasicMaterial({ color: teal, transparent: true, toneMapped: false }));
  const fill = flat(new Mesh(new CircleGeometry(1, 96), new MeshBasicMaterial({
    color: teal, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, toneMapped: false,
  })), 0);
  ring.add(line, fill);
  ring.visible = false;
  return {
    object: ring,
    set(y, radius, strength) {
      ring.visible = strength > 0.01;
      ring.position.y = y;
      ring.scale.setScalar(radius);
      line.material.opacity = strength;
      fill.material.opacity = strength * 0.1;
    },
  };
}

export function createGround({ anisotropy, teal }) {
  const group = new Group();
  const disc = flat(new Mesh(new CircleGeometry(GROUND_RADIUS, 128), new MeshBasicMaterial({
    map: gridTexture(), transparent: true, depthWrite: false, toneMapped: false,
  })), -0.002);
  disc.material.map.anisotropy = anisotropy;
  disc.renderOrder = -2;
  const catcher = flat(new Mesh(new CircleGeometry(GROUND_RADIUS * 0.85, 96), new ShadowMaterial({
    color: 0x20335f, opacity: SHADOW_OPACITY, depthWrite: false,
  })), -0.001);
  catcher.receiveShadow = true;
  catcher.renderOrder = -1;
  const cut = createCutRing(teal);
  group.add(disc, catcher, cut.object);
  return { group, cut };
}
