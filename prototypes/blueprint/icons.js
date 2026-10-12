// One line-icon set for the whole page: 24 × 24, 1.5 px strokes in currentColor, drawn like the linework.
// Static markup uses <i data-icon="name"></i>; JS-built markup calls icon(name).

const P = {
  // sectors
  sports: '<ellipse cx="12" cy="13" rx="9" ry="5.5"/><ellipse cx="12" cy="13" rx="4.6" ry="2.4"/><path d="M3 13v3.5c0 3 4 5 9 5s9-2 9-5V13M12 7.5V2.5l4 1.5-4 1.5"/>',
  clubs: '<path d="M4 21V10l8-5 8 5v11M2.5 21h19M9 21v-6h6v6M12 5V2h3.5L14.5 3l1 1H12"/>',
  education: '<path d="M2 9l10-5 10 5-10 5-10-5ZM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
  banks: '<path d="M3 9.5 12 4l9 5.5M4 9.5h16M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3 17.5h18M2 21h20"/>',
  industry: '<path d="M2 21V11l6 3.5V11l6 3.5V8h3V3h3v18H2ZM6 17.5h2M11 17.5h2M16 17.5h2"/>',
  public: '<path d="M3 21h18M4.5 21v-9M19.5 21v-9M3 12h18M12 3c-3.5 0-6 2.6-6 5.5V12h12V8.5C18 5.6 15.5 3 12 3ZM12 3V1.5M9 21v-5h6v5"/>',
  health: '<path d="M4 21V6h16v15M2 21h20M10 9.5h4M12 7.5v4M8 21v-5h8v5"/>',
  heritage: '<path d="M3 21V11a9 8 0 0 1 18 0v10M7.5 21v-8a4.5 4.5 0 0 1 9 0v8M2 21h20M12 3V1"/>',
  hospitality: '<path d="M12 21V9M12 9C9.5 5 5 5 3 7M12 9c2.5-4 7-4 9-2M12 9c-1-3.5-4-5.5-7-5M12 9c1-3.5 4-5.5 7-5M2 21c3-1.5 6-1.5 10 0s7 1.5 10 0"/>',
  water: '<path d="M12 2.5S5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5ZM8.5 15.5a3.5 3.5 0 0 0 3.5 3.5"/>',
  // services
  design: '<path d="M12 3v3M12 6 6 21M12 6l6 15M8.2 15.5h7.6M12 6a1.6 1.6 0 1 0 0-.01"/><path d="M3.5 21h17"/>',
  execution: '<path d="M6 21V4M6 4h14M6 4 3 7M6 8l4-4M9.5 4v2M17 4v5M15.5 9h3v2.5h-3ZM3 21h7M4 21l2-4 2 4"/>',
  delivery: '<path d="M8.5 11a4.5 4.5 0 1 1 3.2 4.3L10 17H8v2H6v2H3v-3l5.7-5.7A4.6 4.6 0 0 1 8.5 11ZM15 8.5h.01"/>',
  mep: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M13 7 9 13h4l-2 4.5"/><path d="M17 8v8"/>',
  consult: '<path d="M4 4h16v11H9l-5 4V4ZM8 8.5h8M8 11.5h5"/>',
  networks: '<path d="M2 9h20M2 15h20M7 6v12M17 6v12M11 9v6"/>',
  renewable: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  landscape: '<circle cx="8" cy="9" r="4.5"/><circle cx="16.5" cy="12" r="3.5"/><path d="M8 13.5V21M16.5 15.5V21M2 21h20"/>',
  marine: '<path d="M2 18c2.5-1.5 5-1.5 7 0s4.5 1.5 7 0 4.5-1.5 6 0M2 13.5h11v-3M15 4v10M15 5l5 3-5 2"/>',
  // facts
  seats: '<path d="M3 21v-4h4v-4h4V9h4V5h6M3 21h18M21 5v16"/>',
  duration: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 2M9.5 2.5h5M12 2.5V5"/>',
  status: '<circle cx="12" cy="12" r="9"/><path d="m7.8 12.3 2.8 2.8 5.6-5.8"/>',
  underway: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" opacity=".35"/><path d="M12 7v5l3.5 2"/>',
  location: '<path d="M12 21.5s-7-6.6-7-12a7 7 0 0 1 14 0c0 5.4-7 12-7 12Z"/><circle cx="12" cy="9.5" r="2.6"/>',
  client: '<rect x="3" y="7.5" width="18" height="12.5" rx="1"/><path d="M8.5 7.5V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2.5M3 12.5h18M10.5 12.5v2h3v-2"/>',
  standard: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14 -1.5 7.5 5-2.5 5 2.5L15.5 14M9.5 9l1.8 1.8L14.8 7.5"/>',
  first: '<path d="M12 2.5l2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 16.9l-5.6 2.9 1.1-6.2L3 9.2l6.2-.9Z"/>',
  rock: '<path d="M3 19.5 6 11l5-4 6 1.5 4 6.5-2 4.5ZM6 11l5 3 6-5.5M11 14l-2 5.5M11 14l7.5 1"/>',
  channel: '<path d="M2 7c3 1.5 5 1.5 8 0M2 17c3-1.5 5-1.5 8 0M14 7h8M14 17h8M5 12h14M16 9.5 19 12l-3 2.5M8 9.5 5 12l3 2.5"/>',
  pier: '<path d="M2 11h14v3H2ZM5 14v6M10 14v6M15 14v6M2 19c2-1 4-1 6 0s4 1 6 0 4-1 6 0M18 11V4l3 2-3 2"/>',
  route: '<circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="6" r="2.2"/><path d="M7 18h7a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h7"/>',
  phone: '<path d="M7.5 3H5a2 2 0 0 0-2 2c0 8.8 7.2 16 16 16a2 2 0 0 0 2-2v-2.5l-4.5-2-2 2.5a12 12 0 0 1-6.5-6.5l2.5-2Z"/>',
  mobile: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M10.5 18.5h3"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
  flag: '<path d="M5 21V3.5M5 4h12l-2.5 4L17 12H5"/>',
  partner: '<path d="M3 11.5 7.5 7l3 1.5L14 6l7 5.5M3 11.5l5 5 2-1.5 2 2 2-1.5 2 1 4-4.5M10 13.5l2 2M12.5 11.5l2.5 2.5"/>',
  vision: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  mission: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  goals: '<path d="M3 20h18M5.5 20v-5h3v5M10.5 20v-9h3v9M15.5 20V6h3v14M15.5 6 17 3l1.5 3"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5"/><rect x="13.5" y="3" width="7.5" height="7.5"/><rect x="3" y="13.5" width="7.5" height="7.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  map: '<path d="M2.5 6.5 8.5 4l7 2.5 6-2.5v13.5l-6 2.5-7-2.5-6 2.5Z M8.5 4v13.5M15.5 6.5V20"/>',
  cube: '<path d="M12 2.5 20.5 7.2v9.6L12 21.5l-8.5-4.7V7.2ZM3.5 7.2 12 12l8.5-4.8M12 12v9.5"/>',
  photos: '<rect x="2.5" y="5.5" width="15" height="12" rx="1"/><path d="M6.5 2.5h15v12M2.5 15l4-4 3.5 3.5 2.5-2.5 5 5"/><circle cx="7" cy="9" r="1.2"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h12"/>',
};

export function icon(name, cls = 'ico') {
  const body = P[name] || P.grid;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function renderIcons(scope = document) {
  scope.querySelectorAll('i[data-icon]:empty').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
}
