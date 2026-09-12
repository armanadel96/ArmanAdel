// =========================================================
// Conferences attended — plots a blue dot on the world map
// for each location below, using the same simple equirectangular
// projection the map itself was generated with.
//
// EDIT ME: add, remove, or change entries here. lat/lon can be
// found by searching "<city name> coordinates" — use the city's
// coordinates, not the venue's exact address, unless you want to
// be that precise.
// =========================================================
const CONFERENCES = [
  { name: "New York City", lat: 40.7128, lon: -74.0060 },
  { name: "Honolulu, Hawaii", lat: 21.3069, lon: -157.8583 },
  { name: "Montreal", lat: 45.5017, lon: -73.5673 },
  { name: "Geneva, Switzerland", lat: 46.2044, lon: 6.1432 },
  { name: "Vancouver", lat: 49.2827, lon: -123.1207 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832 },
];

// EDIT ME: must match the projection the map SVG (world-map path in
// index.html) was generated with — MAP_W is the SVG's viewBox width,
// LAT_MAX is the northernmost latitude the map was cropped to.
const MAP_W = 640;
const LAT_MAX = 83;
const PX_PER_DEG = MAP_W / 360;

const worldMap = document.getElementById("worldMap");

if (worldMap) {
  const svgNS = "http://www.w3.org/2000/svg";
  const dotsGroup = document.createElementNS(svgNS, "g");
  dotsGroup.setAttribute("class", "map-dots");

  for (const loc of CONFERENCES) {
    const x = (loc.lon + 180) * PX_PER_DEG;
    const y = (LAT_MAX - loc.lat) * PX_PER_DEG;

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x.toFixed(2));
    dot.setAttribute("cy", y.toFixed(2));
    dot.setAttribute("r", "3");
    dot.setAttribute("class", "map-dot");

    const title = document.createElementNS(svgNS, "title");
    title.textContent = loc.name;
    dot.appendChild(title);

    dotsGroup.appendChild(dot);
  }

  worldMap.appendChild(dotsGroup);
}
