// Yard line icons: 24 px grid, round caps and joins, drawn in currentColor. Stroke width comes from CSS (--yd-sw)
// with non-scaling strokes, so a 64 px sector icon keeps the same ink weight as a 16 px chip icon.

const PATHS = {
  // Sectors
  sports: '<ellipse cx="12" cy="10.5" rx="9" ry="4.5"/><ellipse cx="12" cy="10.5" rx="4.5" ry="1.8"/><path d="M3 10.5v3.5c0 2.5 4 4.5 9 4.5s9-2 9-4.5v-3.5"/>',
  clubs: '<circle cx="9.5" cy="9.5" r="5.5"/><path d="m13.4 13.4 5.6 5.6M6.5 9.5h6M9.5 6.5v6"/><circle cx="18.5" cy="5.5" r="1.6"/>',
  education: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3V11M21.5 9v5.5"/>',
  banks: '<path d="M3 9.5 12 4l9 5.5zM4.5 20h15M3 20.5h18M6.5 11v7M10 11v7M14 11v7M17.5 11v7"/>',
  industry: '<path d="M3 20.5V10l5 3v-3l5 3v-3l5 3V4h3v16.5zM6.5 17h2M11.5 17h2"/>',
  public: '<path d="M3.5 20.5h17M5.5 20.5V12h13v8.5M8 12a4 4 0 0 1 8 0M12 8V3.5l3 1.2-3 1.2M9 20.5v-5M12 20.5v-5M15 20.5v-5"/>',
  health: '<path d="M5 20.5V10a7 7 0 0 1 14 0v10.5M3.5 20.5h17M12 9.5v5.5M9.2 12.2h5.6"/>',
  hospitality: '<path d="M11 20.5c0-4.5.6-7.5 2.2-10.5M13.2 10C11.5 7.6 8.6 7.2 6 8.7c2.6.2 4.5 1 7.2 1.3zM13.2 10c1-2.8 3.9-4 6.5-3-2.3.7-4 1.6-6.5 3zM13.2 10c2.8-.2 5.1 1.4 5.7 3.9-1.9-1.5-3.6-2.6-5.7-3.9zM3.5 20.5h17"/>',
  water: '<path d="M12 3.5c3 3.6 6 7.1 6 10.5a6 6 0 0 1-12 0c0-3.4 3-6.9 6-10.5z"/><path d="M8.5 15c1.2.8 2.3.8 3.5 0s2.3-.8 3.5 0"/>',
  // Facts
  seats: '<path d="M7 3.5v9h10.5M7 12.5 5.5 20.5M17.5 12.5l1.5 8M6.2 16.5h12.2"/>',
  standard: '<path d="M12 3.5 19 6v5.5c0 4.2-3 7.5-7 9-4-1.5-7-4.8-7-9V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  done: '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.5 5-5.2"/>',
  underway: '<path d="M7.5 20.5v-16M4.5 20.5h6M7.5 4.5h12.5M7.5 8.5l4-4M17 4.5v5M15.5 9.5h3V12h-3z"/>',
  duration: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  first: '<path d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>',
  record: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3.5M9.5 16.5h5V20h-5zM8 20.5h8"/>',
  mep: '<path d="M13 3 6 13.5h5.2L10.5 21 18 10.5h-5.3z"/>',
  fire: '<path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-9-1.6 1.6-2.2 3.3-2 5-1.4-.8-2.2-2-2.5-3.5C8 9.5 6 12 6 15a6 6 0 0 0 6 6z"/>',
  screen: '<rect x="3" y="4.5" width="18" height="11" rx="1"/><path d="M8 20h8M12 15.5V20"/>',
  gate: '<path d="M5 20.5v-16h3v16M16 20.5v-16h3v16M8 10.5h8M8 13.5h4"/>',
  renovate: '<path d="M14.5 4.2a4.5 4.5 0 0 0-5.3 6L3.8 15.6a1.9 1.9 0 0 0 2.7 2.7l5.4-5.4a4.5 4.5 0 0 0 6-5.3l-2.7 2.7-2.4-.4-.4-2.4z"/>',
  build: '<path d="M4 20.5h16M6 20.5V8l6-4 6 4v12.5M10 20.5v-4h4v4M9 10.5h1.5M13.5 10.5H15M9 13.5h1.5M13.5 13.5H15"/>',
  volume: '<path d="M12 3.5 19.5 7.5v9L12 20.5 4.5 16.5v-9zM4.5 7.5 12 11.5l7.5-4M12 11.5v9"/>',
  length: '<path d="M3.5 12h17M3.5 8.5v7M20.5 8.5v7M6.5 10l-2 2 2 2M17.5 10l2 2-2 2"/>',
  pier: '<path d="M3 9.5h18M6 9.5v7M12 9.5v7M18 9.5v7M3 19c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/>',
  wave: '<path d="M3 9c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M3 14.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/>',
  landscape: '<path d="M12 20.5V13M12 3.5a5 5 0 0 0-5 5c0 2.6 2.2 4.7 5 4.7s5-2.1 5-4.7a5 5 0 0 0-5-5zM5 20.5h14"/>',
  heritage: '<path d="M3.5 20.5h17M5.5 20.5v-6h11v6M6.5 14.5a4.5 4.5 0 0 1 9 0M11 10V8M19 20.5V9l.75-1.8.75 1.8v11.5"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
  conflict: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.3v.2"/>',
  pin: '<path d="M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  // Controls
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z"/>',
};

/** Inline SVG for a named icon; decorative unless the caller labels it. */
export function icon(name, cls = '') {
  const body = PATHS[name] ?? PATHS.plus;
  return `<svg class="yd-i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** The Montaser cube mark (assets/brand/logo-mark.svg), navy and teal. */
export const LOGO_MARK = '<svg class="yd-mark" viewBox="0 0 455 500" aria-hidden="true" focusable="false"><polygon fill="#20335F" points="227.5,0 5.8,120 101.7,191.8 227.5,124.2 353.3,191.8 449.2,120"/><polygon fill="#3B99A3" points="0,129.7 227.5,297.2 455,129.7 455,423.2 374.3,500 343.2,500 343.2,344.1 227.5,448.9 111.8,344.1 111.8,500 80.7,500 0,423.2"/></svg>';
