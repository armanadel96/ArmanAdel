// =========================================================
// Intro hero: a fluid, continuously-animated explainer of the
// cgRNA mechanism, built from your actual storyboard artwork.
//
// The hairpin, RISC blob, Cas9 blob, and gene diagram are your
// exact vector shapes (defined once in index.html's <defs> and
// reused here via <use>). The connecting "tail" strand is
// generated procedurally each frame from a set of sample points
// so it can grow, fold into a loop, split open, and shrink into
// Cas9 smoothly, rather than jumping between fixed illustrations.
//
// Safe to delete this whole file (and the <section id="intro">
// markup + its <defs> in index.html) if you'd rather the page
// open straight on the normal content.
// =========================================================
const introSvg = document.getElementById("introStory");
const introReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const geneUse = document.getElementById("geneUse");
const hairpinUse = document.getElementById("hairpinUse");
const riscUse = document.getElementById("riscUse");
const cas9Use = document.getElementById("cas9Use");
const tailA = document.getElementById("tailA");
const tailB = document.getElementById("tailB");
const tailC = document.getElementById("tailC");

// EDIT ME: the three tones used along the tail, matching your
// artwork's grey palette (near-gene -> middle -> near-hairpin)
const TAIL_COLORS = ["#808285", "#e6e7e8", "#bcbec0"];
tailA.setAttribute("stroke", TAIL_COLORS[0]);
tailB.setAttribute("stroke", TAIL_COLORS[1]);
tailC.setAttribute("stroke", TAIL_COLORS[2]);

// EDIT ME: layout, in the SVG's local units (viewBox="-170 -70 340 160")
const GENE_ANCHOR = { x: -140, y: 15 };
const GENE_EXIT_LOCAL_X = 74.33; // where the gene diagram's own art ends (see intro-defs)
const GENE_EXIT = { x: GENE_ANCHOR.x + GENE_EXIT_LOCAL_X, y: GENE_ANCHOR.y };
const LOOP_CENTER = { x: -25, y: -10 };
const LOOP_RADIUS = 32;
const LOOP_TOP = { x: LOOP_CENTER.x, y: LOOP_CENTER.y - LOOP_RADIUS };
const CAS9_ANCHOR = { x: 85, y: -5 };
const CAS9_NOTCH = { x: CAS9_ANCHOR.x + 10, y: CAS9_ANCHOR.y + 8 };
const N = 34; // tail sample point count
const CUT_INDEX = Math.round(N / 2); // opposite the hairpin — where RISC cuts
const CLEAVE_TRIGGER = 0.45; // fraction into the cleave stage when the cut actually happens

geneUse.setAttribute("transform", `translate(${GENE_ANCHOR.x},${GENE_ANCHOR.y})`);

// EDIT ME: how long each stage takes, in ms
const DUR = {
  transcribe: 2200,
  fold: 1800,
  cleave: 2200,
  load: 2000,
  hold: 1200,
  fade: 400,
};
const T1 = DUR.transcribe;
const T2 = T1 + DUR.fold;
const T3 = T2 + DUR.cleave;
const T4 = T3 + DUR.load;
const T5 = T4 + DUR.hold;
const TOTAL = T5 + DUR.fade;

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpPt(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}
function quadBezier(p0, c, p1, t) {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y;
  return { x, y };
}

// ---------------------------------------------------------
// layouts — pure functions returning N points
// ---------------------------------------------------------
const GROWTH_CONTROL = {
  x: (GENE_EXIT.x + LOOP_TOP.x) / 2,
  y: Math.min(GENE_EXIT.y, LOOP_TOP.y) - 45,
};
function layoutGrowth() {
  const pts = [];
  for (let i = 0; i < N; i++) {
    pts.push(quadBezier(GENE_EXIT, GROWTH_CONTROL, LOOP_TOP, i / (N - 1)));
  }
  return pts;
}
function layoutLoop(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
}
function layoutOpen(cx, cy, r, cutIdx, gapAngle) {
  const pts = new Array(N);
  const cutAngle = ((cutIdx + 0.5) / N) * Math.PI * 2 - Math.PI / 2;
  const sweep = Math.PI * 2 - gapAngle;
  for (let k = 0; k < N; k++) {
    const idx = (cutIdx + 1 + k) % N;
    const angle = cutAngle + gapAngle / 2 + (k / (N - 1)) * sweep;
    pts[idx] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  }
  return pts;
}

const TRANSCRIBE_PATH = layoutGrowth();
const LOOP_PATH = layoutLoop(LOOP_CENTER.x, LOOP_CENTER.y, LOOP_RADIUS);
const OPEN_PATH = layoutOpen(LOOP_CENTER.x, LOOP_CENTER.y, LOOP_RADIUS, CUT_INDEX, (85 * Math.PI) / 180);
const CLUSTER_PATH = layoutLoop(CAS9_NOTCH.x, CAS9_NOTCH.y, 7);

// ---------------------------------------------------------
// drawing
// ---------------------------------------------------------
function pointsToSubpath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)}`;
  }
  return d;
}

// build a path string for the point range [start, end) of the full N-point
// tail, breaking into two disconnected subpaths if cutIndex falls inside
// the range (so the strand visually separates once it's been cleaved)
function rangeToPath(pts, start, end, cutIndex) {
  if (cutIndex !== null && start <= cutIndex && cutIndex + 1 < end) {
    const a = pts.slice(start, cutIndex + 1);
    const b = pts.slice(cutIndex + 1, end);
    return `${pointsToSubpath(a)} ${pointsToSubpath(b)}`;
  }
  return pointsToSubpath(pts.slice(start, end));
}

function drawTail(pts, visibleCount, cutIndex) {
  const third = Math.max(2, Math.floor(N / 3));
  const end = Math.min(visibleCount, N);
  const aEnd = Math.min(end, third + 1);
  const bEnd = Math.min(end, 2 * third + 1);
  tailA.setAttribute("d", rangeToPath(pts, 0, aEnd, cutIndex));
  tailB.setAttribute("d", aEnd < end ? rangeToPath(pts, third, bEnd, cutIndex) : "");
  tailC.setAttribute("d", bEnd < end ? rangeToPath(pts, 2 * third, end, cutIndex) : "");
}

function setUse(el, x, y, opacity, scale) {
  el.setAttribute("transform", `translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${scale || 1})`);
  el.style.opacity = String(opacity);
}

// ---------------------------------------------------------
// main per-frame render
// ---------------------------------------------------------
const introStart = performance.now();

function renderIntro(now) {
  const elapsed = (now - introStart) % TOTAL;

  let stage, t;
  if (elapsed < T1) { stage = "transcribe"; t = elapsed / DUR.transcribe; }
  else if (elapsed < T2) { stage = "fold"; t = (elapsed - T1) / DUR.fold; }
  else if (elapsed < T3) { stage = "cleave"; t = (elapsed - T2) / DUR.cleave; }
  else if (elapsed < T4) { stage = "load"; t = (elapsed - T3) / DUR.load; }
  else if (elapsed < T5) { stage = "hold"; t = (elapsed - T4) / DUR.hold; }
  else { stage = "fade"; t = (elapsed - T5) / DUR.fade; }

  let pts, hairpinPt, geneAlpha = 0, riscAlpha = 0, sceneAlpha = 1;

  if (stage === "transcribe") {
    const visible = Math.max(2, Math.ceil(ease(t) * N));
    pts = TRANSCRIBE_PATH;
    drawTail(pts, visible, null);
    hairpinPt = pts[visible - 1];
    geneAlpha = 1;
  } else if (stage === "fold") {
    const e = ease(t);
    pts = TRANSCRIBE_PATH.map((p, i) => lerpPt(p, LOOP_PATH[i], e));
    drawTail(pts, N, null);
    hairpinPt = pts[N - 1];
    geneAlpha = 1 - t;
  } else if (stage === "cleave") {
    const e = ease(t);
    pts = LOOP_PATH.map((p, i) => lerpPt(p, OPEN_PATH[i], e));
    const cutIndex = t > CLEAVE_TRIGGER ? CUT_INDEX : null;
    drawTail(pts, N, cutIndex);
    hairpinPt = pts[N - 1];
    riscAlpha = t < 0.55 ? Math.min(1, t / 0.35) : Math.max(0, 1 - (t - 0.55) / 0.45);
  } else if (stage === "load") {
    const e = ease(t);
    pts = OPEN_PATH.map((p, i) => lerpPt(p, CLUSTER_PATH[i], e));
    drawTail(pts, N, CUT_INDEX);
    hairpinPt = pts[N - 1];
  } else if (stage === "hold") {
    pts = CLUSTER_PATH;
    drawTail(pts, N, CUT_INDEX);
    hairpinPt = pts[N - 1];
  } else {
    pts = CLUSTER_PATH;
    drawTail(pts, N, CUT_INDEX);
    hairpinPt = pts[N - 1];
    sceneAlpha = 1 - ease(t);
  }

  geneUse.setAttribute("transform", `translate(${GENE_ANCHOR.x},${GENE_ANCHOR.y})`);
  geneUse.style.opacity = String(geneAlpha * sceneAlpha);

  setUse(hairpinUse, hairpinPt.x, hairpinPt.y, sceneAlpha, 1);
  setUse(cas9Use, CAS9_ANCHOR.x, CAS9_ANCHOR.y, sceneAlpha, 1);

  if (stage === "cleave") {
    const cutMid = lerpPt(LOOP_PATH[CUT_INDEX], LOOP_PATH[(CUT_INDEX + 1) % N], 0.5);
    const riscStart = { x: cutMid.x, y: cutMid.y + LOOP_RADIUS * 2.2 };
    const riscPos = lerpPt(riscStart, cutMid, Math.min(1, t / 0.4));
    setUse(riscUse, riscPos.x, riscPos.y, riscAlpha * sceneAlpha, 1);
  } else {
    riscUse.style.opacity = "0";
  }

  tailA.style.opacity = String(sceneAlpha);
  tailB.style.opacity = String(sceneAlpha);
  tailC.style.opacity = String(sceneAlpha);
}

function introTick(now) {
  renderIntro(now);
  requestAnimationFrame(introTick);
}

if (introReducedMotion) {
  // draw a single static frame — the folded loop — and stop
  renderIntro(introStart + T1 + DUR.fold);
} else {
  requestAnimationFrame(introTick);
}
