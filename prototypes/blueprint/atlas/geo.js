// Lambert conformal conic projection and decoding of the delta-encoded map layers into SVG paths (km units).

const DEG = Math.PI / 180;

export function createProjection({ R, lat1, lat2, lat0, lon0 }) {
  const t = (p) => Math.tan(Math.PI / 4 + p / 2);
  const p1 = lat1 * DEG;
  const p2 = lat2 * DEG;
  const n = Math.log(Math.cos(p1) / Math.cos(p2)) / Math.log(t(p2) / t(p1));
  const F = (Math.cos(p1) * t(p1) ** n) / n;
  const rho0 = (R * F) / t(lat0 * DEG) ** n;
  const project = (lon, lat) => {
    const rho = (R * F) / t(lat * DEG) ** n;
    const th = n * (lon - lon0) * DEG;
    return [rho * Math.sin(th), -(rho0 - rho * Math.cos(th))];
  };
  return { project };
}

function decode(deltas, q) {
  let x = 0;
  let y = 0;
  const parts = [];
  for (let i = 0; i < deltas.length; i += 2) {
    x += deltas[i];
    y += deltas[i + 1];
    parts.push(`${(x / q).toFixed(1)} ${(y / q).toFixed(1)}`);
  }
  return parts;
}

export function linesToD(lines, q) {
  return lines.map((l) => `M${decode(l, q).join("L")}`).join("");
}

export function polysToD(polys, q) {
  return polys.flatMap((rings) => rings.map((r) => `M${decode(r, q).join("L")}Z`)).join("");
}

export function boxOf(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function projectBox(proj, { lon, lat }) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const lo = lon[0] + ((lon[1] - lon[0]) * i) / 8;
    const la = lat[0] + ((lat[1] - lat[0]) * i) / 8;
    pts.push(proj.project(lo, lat[0]), proj.project(lo, lat[1]), proj.project(lon[0], la), proj.project(lon[1], la));
  }
  return boxOf(pts);
}

// Fit a box into a w × h frame with padding; returns px per km and the view origin in km.
export function fitBox(box, w, h, pad) {
  const s = Math.min((w - pad.l - pad.r) / (box.x1 - box.x0), (h - pad.t - pad.b) / (box.y1 - box.y0));
  const cx = (box.x0 + box.x1) / 2 - (pad.l - pad.r) / 2 / s;
  const cy = (box.y0 + box.y1) / 2 - (pad.t - pad.b) / 2 / s;
  return { s, x: cx - w / 2 / s, y: cy - h / 2 / s, w: w / s, h: h / s };
}
