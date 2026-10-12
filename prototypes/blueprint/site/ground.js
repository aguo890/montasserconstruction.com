// The drafting table under each model: a vellum disc with a faint teal grid that fades into the page, the
// print bed for the Print stage (a light grey plate with a fine teal grid, sized to the model's footprint),
// and a navy shadow catcher that comes up when the model is built.
import {
  BufferGeometry, CanvasTexture, CircleGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineLoop, Mesh,
  MeshBasicMaterial, PlaneGeometry, RepeatWrapping, ShadowMaterial, SRGBColorSpace,
} from 'three';

const GROUND_RADIUS = 2.7;
const TEXTURE_PX = 1024;
const MINOR_STEP = 0.1;
const MAJOR_EVERY = 5;
const SHADOW_COLOR = 0x20335f;
const VELLUM = 'rgb(246, 242, 235)';
const TEAL_MINOR = 'rgba(59, 153, 163, .2)';
const TEAL_MAJOR = 'rgba(59, 153, 163, .38)';
const INK_RING = 'rgba(32, 51, 95, .35)';
const BED = { tilePx: 256, tile: 0.25, minorPerTile: 5, margin: 0.16, fill: '#E4E6E8', edge: 0x20335f, edgeOpacity: 0.45 };
const BED_MINOR = 'rgba(59, 153, 163, .32)';
const BED_MAJOR = 'rgba(59, 153, 163, .62)';
const LEVELS = { disc: -0.003, bed: -0.002, catcher: -0.001 };

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

function canvasOf(px) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  return canvas;
}

function vellumTexture() {
  const canvas = canvasOf(TEXTURE_PX);
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

/** One repeating tile of the bed: grey plate, fine teal lines, a stronger line on the tile edge. */
function bedTexture() {
  const px = BED.tilePx;
  const canvas = canvasOf(px);
  const g = canvas.getContext('2d');
  g.fillStyle = BED.fill;
  g.fillRect(0, 0, px, px);
  const step = px / BED.minorPerTile;
  for (let i = 0; i < BED.minorPerTile; i += 1) {
    g.strokeStyle = i ? BED_MINOR : BED_MAJOR;
    g.lineWidth = i ? 1 : 2;
    const at = i * step + (i ? 0.5 : 1);
    g.beginPath(); g.moveTo(at, 0); g.lineTo(at, px); g.moveTo(0, at); g.lineTo(px, at); g.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

function flat(mesh, y) {
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

function squareOutline() {
  const corners = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5];
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(corners, 3));
}

function createBed(anisotropy) {
  const map = bedTexture();
  map.anisotropy = anisotropy;
  const plate = flat(new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({
    map, transparent: true, opacity: 0, depthWrite: false,
  })), 0);
  const edge = new LineLoop(squareOutline(), new LineBasicMaterial({ color: BED.edge, transparent: true, opacity: 0 }));
  const group = new Group();
  group.add(plate, edge);
  group.position.y = LEVELS.bed;
  group.visible = false;
  plate.renderOrder = -2;
  return { group, plate, edge, map };
}

/** The ground: fitBed() once per model; setBed() and setShadow() each frame of the sequence. */
export function createGround({ anisotropy }) {
  const group = new Group();
  const disc = flat(new Mesh(new CircleGeometry(GROUND_RADIUS, 128), new MeshBasicMaterial({
    map: vellumTexture(), transparent: true, depthWrite: false,
  })), LEVELS.disc);
  disc.material.map.anisotropy = anisotropy;
  disc.renderOrder = -3;
  const catcher = flat(new Mesh(new CircleGeometry(GROUND_RADIUS * 0.85, 96), new ShadowMaterial({
    color: SHADOW_COLOR, opacity: 0, depthWrite: false,
  })), LEVELS.catcher);
  catcher.receiveShadow = true;
  catcher.renderOrder = -1;
  const bed = createBed(anisotropy);
  group.add(disc, bed.group, catcher);

  /** Squares the vellum grid to the plan (theta: the plan camera's azimuth). */
  function alignGrid(theta) {
    disc.rotation.z = theta;
  }

  function fitBed([width, depth], yaw) {
    const w = width + BED.margin * 2;
    const d = depth + BED.margin * 2;
    bed.group.rotation.y = yaw;
    bed.plate.scale.set(w, d, 1);
    bed.edge.scale.set(w, 1, d);
    bed.map.repeat.set(w / BED.tile, d / BED.tile);
  }

  function setBed(amount) {
    bed.group.visible = amount > 0.001;
    bed.plate.material.opacity = amount;
    bed.edge.material.opacity = amount * BED.edgeOpacity;
  }

  function setShadow(opacity) {
    catcher.material.opacity = opacity;
    catcher.visible = opacity > 0.001;
  }

  return { group, alignGrid, fitBed, setBed, setShadow };
}
