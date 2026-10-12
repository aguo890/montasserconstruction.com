// The model manifest (site/models.json, written by the asset pipeline) and the scenes it gives a site.
// Keys are project ids; each list starts with the site model. Missing projects fall back to a photo.
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

function toScene(site, entry) {
  return {
    id: entry.id,
    kind: entry.kind || 'scene',
    label: entry.label || site.title,
    photo: photoByBase(site, entry.photo),
    glb: entry.glb ? new URL(entry.glb, MANIFEST_URL).href : null,
    yaw: Number(entry.yaw) || 0,
  };
}

function photoScene(site) {
  return { id: `${site.id}-photo`, kind: 'photo', label: site.title, photo: photosOf(site)[0], glb: null, yaw: 0 };
}

/** The site's scenes: up to three manifest entries in order, or one photo scene when none exist yet. */
export async function scenesFor(site) {
  const projects = await loadManifest();
  const entries = site.models.flatMap((key) => (Array.isArray(projects[key]) ? projects[key] : []));
  if (!entries.length) return [photoScene(site)];
  return entries.slice(0, MAX_SCENES).map((entry) => toScene(site, entry));
}
