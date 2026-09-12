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
      { event: "CIFAR MacMillan Multiscale Human Spring 2024 Program Meeting", date: "April 2024", description: "Student short talk." }
    ],
  },
  {
    city: "Honolulu",
    lat: 21.3069,
    lon: -157.8583,
    events: [{ event: "International SynBYSS Conference", date: "December 2024", description: "Poster presentation-Award received." }],
  },
  {
    city: "Montreal",
    lat: 45.5017,
    lon: -73.5673,
    events: [{ event: "ISSCR 2026 Annual Meeting", date: "July 2026", description: "Poster presentation" }],
  },
  {
    city: "Geneva",
    lat: 46.2044,
    lon: 6.1432,
    events: [{ event: "CIFAR MacMillan Multiscale Human Spring 2025", date: "May 2025", description: "Attendance" }],
  },
  {
    city: "Vancouver",
    lat: 49.2827,
    lon: -123.1207,
    events: [{ event: "Graduate School: PhD", date: "September 2020-Present", description: "The University of British Columbia, School of Biomedical Engineering" },
             { event: "Cascadia Advanced Genomics Technologies", date: "June 2025", description: "Research Talk" },
             { event: "GSC Collaborator Forum", date: "October 2025", description: "Poster presentation-Award received" },
             { event: "MASSIV 1.0", date: "January 2026", description: "Research Talk" }],
  },
  {
    city: "Seattle",
    lat: 47.6062,
    lon: -122.3321,
    events: [{ event: "Cascadia Advanced Genomics Technologies", date: "May 2026", description: "Poster presentation and flash talk" }],
  },
  {
    city: "Tokyo",
    lat: 35.6762,
    lon: 139.6503,
    events: [{ event: "Graduate School: MSc", date: "April 2019", description: "The University of Tokyo, School of Science. Transferred to The University of British Columbia in September 2020." }],
  },
  {
    city: "Toronto",
    lat: 43.6532,
    lon: -79.3832,
    events: [{ event: "Bachelor's Degree", date: "Month Year", description: "Major in Biochemistry and Ecology and Evolutionary Biology" }],
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
const allToggle = document.getElementById("allConferencesToggle");
const allPanel = document.getElementById("allConferencesPanel");
const allList = document.getElementById("allConferencesList");

let activeDot = null;

function showInfo(cluster, dot) {
  hideAllConferences();
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

// EDIT ME: turns a date string ("April 2024", "September 2020-Present",
// "Month Year") into something sortable. Ranges are sorted by their
// start date. Entries that can't be parsed as a real date (like an
// unedited "Month Year" placeholder) sort to the very back — replace
// the placeholder with a real "Month Year" to have it sort correctly.
function parseDateForSort(dateStr) {
  if (!dateStr) return new Date(0);
  const start = dateStr.split(/[-\u2013\u2014]/)[0].trim();
  const parsed = new Date(start);
  return isNaN(parsed) ? new Date(0) : parsed;
}

// EDIT ME: change to (a, b) => a.sortDate - b.sortDate for oldest-first.
function sortAllEvents(a, b) {
  return b.sortDate - a.sortDate;
}

function buildAllEvents() {
  const flat = [];
  for (const loc of LOCATIONS) {
    for (const ev of loc.events) {
      flat.push({ city: loc.city, ...ev, sortDate: parseDateForSort(ev.date) });
    }
  }
  flat.sort(sortAllEvents);
  return flat;
}

function showAllConferences() {
  hideInfo();
  allList.innerHTML = "";
  for (const item of buildAllEvents()) {
    const li = document.createElement("li");
    li.className = "all-conf-item";

    const header = document.createElement("p");
    header.className = "all-conf-header";
    header.innerHTML = `<span class="all-conf-date">${item.date}</span> &middot; <span class="all-conf-city">${item.city}</span>`;
    li.appendChild(header);

    const eventName = document.createElement("p");
    eventName.className = "all-conf-event";
    eventName.textContent = item.event;
    li.appendChild(eventName);

    if (item.description) {
      const desc = document.createElement("p");
      desc.className = "all-conf-desc";
      desc.textContent = item.description;
      li.appendChild(desc);
    }

    allList.appendChild(li);
  }
  allPanel.hidden = false;
  allToggle.textContent = "Hide all conferences";
  allToggle.setAttribute("aria-expanded", "true");
}

function hideAllConferences() {
  allPanel.hidden = true;
  allToggle.textContent = "View all conferences";
  allToggle.setAttribute("aria-expanded", "false");
}

if (allToggle) {
  allToggle.setAttribute("aria-expanded", "false");
  allToggle.addEventListener("click", () => {
    if (allPanel.hidden) showAllConferences();
    else hideAllConferences();
  });
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
