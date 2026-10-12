// The model manifest (site/models.json, written by the asset pipeline) and the scenes it gives a site.
// Keys are project ids; each list starts with the site model. Missing projects fall back to a photo.
// An entry may add a high-quality file (hq) and the preview's world bounds (bbox) so both share one frame.
import { photoByBase, photosOf } from './sites.js';

const MANIFEST_URL = new URL('./models.json', import.meta.url);
const MAX_SCENES = 3;
let manifest = null;

/** Fetches the manifest once; a missing or broken file counts as "no models yet". */
export function loadManifest() {
  manifest ||= fetch(MANIFEST_URL, { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data) => data?.projects || {})
    .catch((err) => {
      console.warn('3D model list unavailable; the site view shows photos.', err);
      return {};
    });
  return manifest;
}

const resolve = (path) => (path ? new URL(path, MANIFEST_URL).href : null);

/** A bbox is usable when both corners are three finite numbers. */
function readBox(bbox) {
  const isCorner = (c) => Array.isArray(c) && c.length === 3 && c.every(Number.isFinite);
  return bbox && isCorner(bbox.min) && isCorner(bbox.max) ? { min: bbox.min, max: bbox.max } : null;
}

function toScene(site, entry) {
  return {
    id: entry.id,
    kind: entry.kind || 'scene',
    label: entry.label || site.title,
    photo: photoByBase(site, entry.photo),
    glb: resolve(entry.glb),
    hq: entry.glb ? resolve(entry.hq) : null,
    bbox: readBox(entry.bbox),
    yaw: Number(entry.yaw) || 0,
  };
}

function photoScene(site) {
  return { id: `${site.id}-photo`, kind: 'photo', label: site.title, photo: photosOf(site)[0], glb: null, hq: null, bbox: null, yaw: 0 };
}

/** The site's scenes: up to three manifest entries in order, or one photo scene when none exist yet. */
export async function scenesFor(site) {
  const projects = await loadManifest();
  const entries = site.models.flatMap((key) => (Array.isArray(projects[key]) ? projects[key] : []));
  if (!entries.length) return [photoScene(site)];
  return entries.slice(0, MAX_SCENES).map((entry) => toScene(site, entry));
}
