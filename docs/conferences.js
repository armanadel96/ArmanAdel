// =========================================================
// Conferences attended — plots a dot on the world map for each
// location below, using the same simple equirectangular
// projection the map itself was generated with.
//
// Each location can list multiple events. The dot's radius grows
// with how many events are at that location, and locations that
// project too close together on the map (e.g. Seattle and
// Vancouver, at this map's scale) are automatically combined into
// a single dot covering all of them.
//
// Click (or tab to + press Enter/Space on) a dot to open a details
// box below the map listing that dot's city (or cities) and events.
//
// EDIT ME: add, remove, or change entries — and their events —
// here. lat/lon can be found by searching "<city name> coordinates"
// — use the city's coordinates, not the venue's exact address,
// unless you want to be that precise. "description" is optional —
// leave it as "" to omit that line for a given event.
// =========================================================
const LOCATIONS = [
  {
    city: "New York City",
    lat: 40.7128,
    lon: -74.0060,
    events: [
      { event: "Add your conference name here", date: "Month Year", description: "A sentence or two about what you presented or attended." },
      { event: "Add another conference name here", date: "Month Year", description: "" },
    ],
  },
  {
    city: "Honolulu, Hawaii",
    lat: 21.3069,
    lon: -157.8583,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
  {
    city: "Montreal",
    lat: 45.5017,
    lon: -73.5673,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
  {
    city: "Geneva, Switzerland",
    lat: 46.2044,
    lon: 6.1432,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
  {
    city: "Vancouver",
    lat: 49.2827,
    lon: -123.1207,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
  {
    city: "Seattle, Washington",
    lat: 47.6062,
    lon: -122.3321,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
  {
    city: "Tokyo",
    lat: 35.6762,
    lon: 139.6503,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
  {
    city: "Toronto",
    lat: 43.6532,
    lon: -79.3832,
    events: [{ event: "Add your conference name here", date: "Month Year", description: "" }],
  },
];

// EDIT ME: must match the projection the map SVG (world-map path in
// index.html) was generated with — MAP_W is the SVG's viewBox width,
// LAT_MAX is the northernmost latitude the map was cropped to.
const MAP_W = 640;
const LAT_MAX = 83;
const PX_PER_DEG = MAP_W / 360;

// EDIT ME: locations whose projected positions land within this many
// map units of each other are combined into a single dot. Raise this
// if nearby cities you'd rather keep separate are merging; lower it
// if cities you'd rather combine aren't.
const CLUSTER_DISTANCE = 6;

// EDIT ME: dot sizing — BASE is the radius for a single-event dot;
// GROWTH controls how much bigger a dot gets per extra event (using
// a square-root curve, so the growth tapers off rather than exploding
// for locations with a lot of events).
const DOT_BASE_RADIUS = 3;
const DOT_GROWTH = 1.5;

function project(lon, lat) {
  return {
    x: (lon + 180) * PX_PER_DEG,
    y: (LAT_MAX - lat) * PX_PER_DEG,
  };
}

function dotRadius(eventCount) {
  return DOT_BASE_RADIUS + DOT_GROWTH * (Math.sqrt(eventCount) - 1);
}

// group locations whose projected points fall within CLUSTER_DISTANCE
// of each other into a single marker
function clusterLocations(locations) {
  const points = locations.map((loc) => ({ loc, ...project(loc.lon, loc.lat) }));
  const used = new Array(points.length).fill(false);
  const clusters = [];

  for (let i = 0; i < points.length; i++) {
    if (used[i]) continue;
    const group = [points[i]];
    used[i] = true;
    for (let j = 0; j < points.length; j++) {
      if (used[j]) continue;
      // compare against every point already in the group, not just
      // the first, so a chain of nearby points merges together
      const closeToGroup = group.some(
        (p) => Math.hypot(p.x - points[j].x, p.y - points[j].y) < CLUSTER_DISTANCE
      );
      if (closeToGroup) {
        group.push(points[j]);
        used[j] = true;
      }
    }
    clusters.push(group);
  }

  return clusters.map((group) => ({
    cities: group.map((p) => p.loc),
    x: group.reduce((sum, p) => sum + p.x, 0) / group.length,
    y: group.reduce((sum, p) => sum + p.y, 0) / group.length,
    eventCount: group.reduce((sum, p) => sum + p.loc.events.length, 0),
  }));
}

const worldMap = document.getElementById("worldMap");
const infoBox = document.getElementById("conferenceInfo");
const infoContent = document.getElementById("conferenceInfoContent");
const infoClose = document.getElementById("conferenceInfoClose");

let activeDot = null;

function showInfo(cluster, dot) {
  if (activeDot) activeDot.classList.remove("map-dot--active");
  activeDot = dot;
  dot.classList.add("map-dot--active");

  infoContent.innerHTML = "";
  for (const city of cluster.cities) {
    const cityBlock = document.createElement("div");
    cityBlock.className = "conference-city";

    const cityName = document.createElement("p");
    cityName.className = "conference-city-name";
    cityName.textContent = city.city;
    cityBlock.appendChild(cityName);

    const list = document.createElement("ul");
    list.className = "conference-events";
    for (const ev of city.events) {
      const item = document.createElement("li");

      const eventName = document.createElement("p");
      eventName.className = "conference-info-event";
      eventName.textContent = ev.event;
      item.appendChild(eventName);

      const eventDate = document.createElement("p");
      eventDate.className = "conference-info-date";
      eventDate.textContent = ev.date;
      item.appendChild(eventDate);

      if (ev.description) {
        const eventDesc = document.createElement("p");
        eventDesc.className = "conference-info-desc";
        eventDesc.textContent = ev.description;
        item.appendChild(eventDesc);
      }

      list.appendChild(item);
    }
    cityBlock.appendChild(list);
    infoContent.appendChild(cityBlock);
  }

  infoBox.hidden = false;
}

function hideInfo() {
  if (activeDot) activeDot.classList.remove("map-dot--active");
  activeDot = null;
  infoBox.hidden = true;
}

if (worldMap) {
  const svgNS = "http://www.w3.org/2000/svg";
  const dotsGroup = document.createElementNS(svgNS, "g");
  dotsGroup.setAttribute("class", "map-dots");

  const clusters = clusterLocations(LOCATIONS);

  for (const cluster of clusters) {
    const label = cluster.cities.map((c) => c.city).join(" & ");
    const radius = dotRadius(cluster.eventCount);

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", cluster.x.toFixed(2));
    dot.setAttribute("cy", cluster.y.toFixed(2));
    dot.setAttribute("r", radius.toFixed(2));
    dot.setAttribute("class", "map-dot");
    dot.setAttribute("tabindex", "0");
    dot.setAttribute("role", "button");
    dot.setAttribute(
      "aria-label",
      `${label} — view ${cluster.eventCount} event${cluster.eventCount === 1 ? "" : "s"}`
    );

    const title = document.createElementNS(svgNS, "title");
    title.textContent = `${label} (${cluster.eventCount} event${cluster.eventCount === 1 ? "" : "s"})`;
    dot.appendChild(title);

    dot.addEventListener("click", () => {
      if (activeDot === dot) {
        hideInfo();
      } else {
        showInfo(cluster, dot);
      }
    });
    dot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (activeDot === dot) {
          hideInfo();
        } else {
          showInfo(cluster, dot);
        }
      }
    });

    dotsGroup.appendChild(dot);
  }

  worldMap.appendChild(dotsGroup);
}

if (infoClose) {
  infoClose.addEventListener("click", hideInfo);
}
