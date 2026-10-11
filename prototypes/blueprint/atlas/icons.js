// Line icons for the map: 24 px grid, 1.5 px rounded strokes in ink. A local copy so the module stands alone.

const PATHS = {
  // sectors
  water: "M12 3.5c3 3.6 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5.4 5-9zM9.6 13.4a2.5 2.5 0 0 0 2.4 2.1",
  sports: "M3.5 12c0-2.5 3.8-4.5 8.5-4.5s8.5 2 8.5 4.5-3.8 4.5-8.5 4.5-8.5-2-8.5-4.5zM12 7.5v9M7.5 12a4.5 2.2 0 0 0 9 0a4.5 2.2 0 0 0-9 0",
  clubs: "M4 20.5h16M5.5 20.5v-8h13v8M3.5 12.5L12 6l8.5 6.5M12 6V2.5l3.5 1.5L12 5.5M10 20.5v-4h4v4",
  education: "M2.5 9.5L12 5l9.5 4.5L12 14zM6.5 11.5v4.5c1.5 1.6 9.5 1.6 11 0v-4.5M21.5 9.5v5",
  banks: "M3 9.5L12 4.5l9 5zM5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17",
  industry: "M3 20.5v-9l5 3v-3l5 3v-3l5 3V4h2.5v16.5zM3 20.5h18",
  public: "M2.5 16.5h19M4 16.5c1.5-5 4.5-7.5 8-7.5s6.5 2.5 8 7.5M8 16.5v-5M12 16.5V9M16 16.5v-5M5 20h14",
  health: "M12 20.5S4 15.8 4 10a4 4 0 0 1 8-1.2A4 4 0 0 1 20 10c0 5.8-8 10.5-8 10.5zM12 10.5v5M9.5 13h5",
  hospitality: "M12 21V10M12 10c-1-3.5-4.5-4-6.5-2M12 10c1-3.5 4.5-4 6.5-2M12 10c-2.5-.8-5 .4-5.5 3M12 10c2.5-.8 5 .4 5.5 3M8 21h8",
  // facts
  done: "M4.5 12.5l4.5 4.5 10.5-10.5",
  ongoing: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2",
  conflict: "M4.5 8.5h13l-3-3M19.5 15.5h-13l3 3",
  unstated: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 0 1 0-17zM8.5 12h7",
  seats: "M5 20.5v-6h14v6M5 14.5V10a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4.5M3 20.5h18M9 8V5.5M15 8V5.5",
  duration: "M12 4.5a8 8 0 1 1 0 16a8 8 0 0 1 0-16zM12 8.5V12.5h3.5M9.5 2.5h5",
  standard: "M12 3.5l2.5 5 5.5.8-4 3.9.9 5.5L12 16.1l-4.9 2.6.9-5.5-4-3.9 5.5-.8z",
  capacity: "M12 3.5c3 3.6 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 2-5.4 5-9zM9 14.5h6",
  length: "M3 9.5h18v5H3zM7 9.5v2.5M11 9.5v2.5M15 9.5v2.5M19 9.5v2.5",
  volume: "M12 3.5l8 4.5v8L12 20.5 4 16V8zM4 8l8 4.5L20 8M12 12.5v8",
  place: "M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z",
  owner: "M4 20.5V8.5l8-5 8 5v12M4 20.5h16M9 20.5v-5h6v5M9 11h.01M15 11h.01",
  photo: "M3.5 7.5h4l1.5-2h6l1.5 2h4v11h-17zM12 10a3 3 0 1 1 0 6a3 3 0 0 1 0-6z",
  // controls
  next: "M9 5.5l6.5 6.5L9 18.5",
  back: "M15 5.5L8.5 12l6.5 6.5",
  close: "M6 6l12 12M18 6L6 18",
  filter: "M3.5 5.5h17l-6.5 7.5v6l-4 1.5v-7.5z",
  more: "M6 9.5l6 6 6-6",
  all: "M4 4.5h6.5v6.5H4zM13.5 4.5H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z",
  open: "M14 4.5h5.5V10M19.5 4.5L11 13M17.5 14v5.5h-13v-13H10",
  list: "M8.5 6.5h12M8.5 12h12M8.5 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01",
  unknownPlace: "M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM10.2 8.6a1.9 1.9 0 1 1 2.6 1.8c-.6.3-.8.7-.8 1.3M12 14h.01",
};

export function icon(name, cls = "ms-ico") {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${PATHS[name] || PATHS.unstated}"/></svg>`;
}
