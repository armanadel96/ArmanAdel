// =========================================================
// Intro hero: an animated explainer of the cgRNA mechanism
//
// Loops through five stages, forever:
//   1. transcribe — the strand is synthesized from the hU6
//      Pol3 promoter
//   2. fold       — it folds into its "cuffed" pseudo-circular
//      secondary structure
//   3. cleave     — AGO2–RISC, loaded with a target miRNA,
//      cleaves it at the miRT site
//   4. load       — the now-linear cgRNA loads into a Cas9
//      enzyme, which closes around it
//   5. hold       — a brief pause before fading out and
//      looping back to stage 1
//
// Everything here is independent of script.js's ambient
// background field — safe to delete this whole file (and the
// <section id="intro"> markup in index.html) if you'd rather
// the page open directly on the normal content.
// =========================================================
const introCanvas = document.getElementById("introCanvas");
const introCtx = introCanvas.getContext("2d");
const introCaption = document.getElementById("introCaption");
const introReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// EDIT ME: colors for each RNA domain + the supporting sprites
const ICOLORS = {
  tracr: "#d9a441", // tracrRNA — gold
  mirt: "#c96a56", // miRT (miRNA target site) — red
  spacer: "#5f9bc9", // spacer — blue
  dr: "#7a6aa8", // direct repeat — purple
  riscBody: "#b7b7ae",
  riscDark: "#8c8c84",
  flash: "#c0392b",
  cas9Body: "#8f8f86",
  cas9Cap: "#1c1c17",
  promoterFill: "#e7e7e1",
  promoterBorder: "#14140f",
  text: "#14140f",
  textDim: "#6f6f68",
};

// EDIT ME: how long each stage takes, in ms
const DUR = {
  transcribe: 3000,
  fold: 2200,
  cleave: 2600,
  load: 2600,
  hold: 1600,
  fade: 500,
};
const T1 = DUR.transcribe;
const T2 = T1 + DUR.fold;
const T3 = T2 + DUR.cleave;
const T4 = T3 + DUR.load;
const T5 = T4 + DUR.hold;
const TOTAL = T5 + DUR.fade;

// ---------------------------------------------------------
// the cgRNA strand: a chain of colored sample points,
// grouped into domains in transcription order
// ---------------------------------------------------------
const DOMAINS = [
  { name: "tracr", color: ICOLORS.tracr, count: 9 },
  { name: "mirt", color: ICOLORS.mirt, count: 5 },
  { name: "spacer", color: ICOLORS.spacer, count: 5 },
  { name: "dr", color: ICOLORS.dr, count: 3 },
];
const N = DOMAINS.reduce((sum, d) => sum + d.count, 0);
const POINT_COLOR = [];
DOMAINS.forEach((d) => {
  for (let i = 0; i < d.count; i++) POINT_COLOR.push(d.color);
});
// where the AGO2–RISC cut lands — the middle of the miRT domain
const CUT_INDEX = 11;

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpPt(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

// ---------------------------------------------------------
// layouts — pure functions returning N points for a given
// arrangement of the strand
// ---------------------------------------------------------
function layoutLinear(cx, cy, spacing) {
  const startX = cx - ((N - 1) * spacing) / 2;
  const pts = [];
  for (let i = 0; i < N; i++) {
    pts.push({ x: startX + i * spacing, y: cy + Math.sin(i * 0.8) * 5 });
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

// ---------------------------------------------------------
// the Cas9 "claw" sprite — two overlapping lobes with a
// notch on the left (facing the incoming strand) that
// narrows when it closes around the loaded RNA
// ---------------------------------------------------------
const INTRO_CAS9_SIZE = 17;
const CAS9_MAIN_CENTER = { r: 11, c: 8 };
const CAS9_MAIN_R = 7;
const CAS9_CAP_CENTER = { r: 5, c: 11 };
const CAS9_CAP_R = 4.6;

function buildCas9(notchRowStart, notchRowEnd, notchColEnd) {
  const rows = [];
  for (let r = 0; r < INTRO_CAS9_SIZE; r++) {
    let row = "";
    for (let c = 0; c < INTRO_CAS9_SIZE; c++) {
      const dCap = Math.hypot(r - CAS9_CAP_CENTER.r, c - CAS9_CAP_CENTER.c);
      const dMain = Math.hypot(r - CAS9_MAIN_CENTER.r, c - CAS9_MAIN_CENTER.c);
      let ch = ".";
      if (dCap <= CAS9_CAP_R) ch = "1";
      else if (dMain <= CAS9_MAIN_R) ch = "2";
      if (r >= notchRowStart && r <= notchRowEnd && c <= notchColEnd) ch = ".";
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}
// wider notch = jaw open, narrower notch = jaw closed
const INTRO_CAS9_OPEN = buildCas9(9, 13, 4);
const INTRO_CAS9_CLOSED = buildCas9(10, 12, 1);
const INTRO_CAS9_COLOR_MAP = { 1: ICOLORS.cas9Cap, 2: ICOLORS.cas9Body };
// EDIT ME: how chunky the Cas9 sprite's pixels are
const CAS9_PIXEL = 6;

// ---------------------------------------------------------
// canvas sizing
// ---------------------------------------------------------
let iw = window.innerWidth;
let ih = window.innerHeight;
function resizeIntro() {
  iw = window.innerWidth;
  ih = window.innerHeight;
  introCanvas.width = iw * window.devicePixelRatio;
  introCanvas.height = ih * window.devicePixelRatio;
  introCanvas.style.width = iw + "px";
  introCanvas.style.height = ih + "px";
  introCtx.setTransform(1, 0, 0, 1, 0, 0);
  introCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener("resize", resizeIntro);
resizeIntro();

// ---------------------------------------------------------
// drawing helpers
// ---------------------------------------------------------
function drawRibbon(ctx, pts, opts) {
  const { skipIndex, wraparoundAlpha, alpha } = opts;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  for (let i = 0; i < N - 1; i++) {
    if (skipIndex !== null && i === skipIndex) continue;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = POINT_COLOR[i];
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.stroke();
  }
  if (wraparoundAlpha > 0) {
    ctx.globalAlpha = alpha * wraparoundAlpha;
    ctx.strokeStyle = POINT_COLOR[N - 1];
    ctx.beginPath();
    ctx.moveTo(pts[N - 1].x, pts[N - 1].y);
    ctx.lineTo(pts[0].x, pts[0].y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPromoter(ctx, x, y, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ICOLORS.promoterFill;
  ctx.strokeStyle = ICOLORS.promoterBorder;
  ctx.lineWidth = 2;
  const w = 92, h = 34;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ICOLORS.text;
  ctx.font = "12px 'IBM Plex Mono', 'SF Mono', Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("hU6 Pol3", x, y);
  // small arrow pointing toward the ribbon
  ctx.beginPath();
  ctx.moveTo(x + w / 2 + 6, y);
  ctx.lineTo(x + w / 2 + 20, y);
  ctx.lineTo(x + w / 2 + 14, y - 5);
  ctx.moveTo(x + w / 2 + 20, y);
  ctx.lineTo(x + w / 2 + 14, y + 5);
  ctx.strokeStyle = ICOLORS.textDim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRisc(ctx, x, y, alpha, attachAngle) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const r = 27;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, ICOLORS.riscBody);
  grad.addColorStop(1, ICOLORS.riscDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // a few short dashes radiating toward the strand, standing in
  // for the loaded guide-miRNA base-pairing with the miRT site
  ctx.strokeStyle = ICOLORS.textDim;
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    const a = attachAngle + i * 0.18;
    const x1 = x + Math.cos(a) * (r - 12);
    const y1 = y + Math.sin(a) * (r - 12);
    const x2 = x + Math.cos(a) * (r + 6);
    const y2 = y + Math.sin(a) * (r + 6);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.fillStyle = ICOLORS.text;
  ctx.font = "11px 'IBM Plex Mono', 'SF Mono', Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText("AGO2–RISC", x, y + r + 16);
  ctx.globalAlpha = 1;
}

function drawIntroCas9(ctx, cx, cy, frame, alpha) {
  const half = (INTRO_CAS9_SIZE * CAS9_PIXEL) / 2;
  ctx.globalAlpha = alpha;
  for (let row = 0; row < INTRO_CAS9_SIZE; row++) {
    for (let col = 0; col < INTRO_CAS9_SIZE; col++) {
      const ch = frame[row][col];
      if (ch === ".") continue;
      ctx.fillStyle = INTRO_CAS9_COLOR_MAP[ch];
      ctx.fillRect(
        cx - half + col * CAS9_PIXEL,
        cy - half + row * CAS9_PIXEL,
        CAS9_PIXEL,
        CAS9_PIXEL
      );
    }
  }
  ctx.fillStyle = ICOLORS.textDim;
  ctx.font = "11px 'IBM Plex Mono', 'SF Mono', Menlo, monospace";
  ctx.textAlign = "center";
  ctx.fillText("Cas9", cx, cy + half + 18);
  ctx.globalAlpha = 1;
}

function drawFlash(ctx, x, y, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ICOLORS.flash;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------
// main per-frame render, driven purely by elapsed time so
// the whole thing is stateless and just loops forever
// ---------------------------------------------------------
const introStart = performance.now();

function renderIntro(now) {
  const elapsed = (now - introStart) % TOTAL;

  const cx = iw * 0.4;
  const cy = ih * 0.5;
  const cas9X = Math.min(iw * 0.82, iw - 90);
  const cas9Y = ih * 0.5;
  const promoterX = Math.max(iw * 0.1, 90);
  const promoterY = cy;
  const loopR = Math.max(60, Math.min(140, Math.min(iw, ih) * 0.16));
  const linearWidth = Math.min(iw * 0.5, 640);
  const spacing = linearWidth / (N - 1);
  const clusterAnchor = {
    x: cas9X - (INTRO_CAS9_SIZE * CAS9_PIXEL) / 2 + 2 * CAS9_PIXEL,
    y: cas9Y + (11 - INTRO_CAS9_SIZE / 2) * CAS9_PIXEL,
  };
  const cutPoint = layoutLoop(cx, cy, loopR)[CUT_INDEX];
  const cutPoint2 = layoutLoop(cx, cy, loopR)[(CUT_INDEX + 1) % N];
  const riscTarget = {
    x: (cutPoint.x + cutPoint2.x) / 2,
    y: (cutPoint.y + cutPoint2.y) / 2,
  };
  const riscAttachAngle = Math.atan2(riscTarget.y - cy, riscTarget.x - cx);
  const riscStart = { x: riscTarget.x, y: riscTarget.y + loopR * 2.6 };

  let stage, t;
  if (elapsed < T1) {
    stage = "transcribe";
    t = elapsed / DUR.transcribe;
  } else if (elapsed < T2) {
    stage = "fold";
    t = (elapsed - T1) / DUR.fold;
  } else if (elapsed < T3) {
    stage = "cleave";
    t = (elapsed - T2) / DUR.cleave;
  } else if (elapsed < T4) {
    stage = "load";
    t = (elapsed - T3) / DUR.load;
  } else if (elapsed < T5) {
    stage = "hold";
    t = (elapsed - T4) / DUR.hold;
  } else {
    stage = "fade";
    t = (elapsed - T5) / DUR.fade;
  }

  introCtx.clearRect(0, 0, iw, ih);

  let pts, skipIndex = null, wraparoundAlpha = 0;
  let promoterAlpha = 0, riscAlpha = 0, flashAlpha = 0;
  let cas9Frame = INTRO_CAS9_OPEN, sceneAlpha = 1;
  let caption = "";

  if (stage === "transcribe") {
    const full = layoutLinear(cx, cy, spacing);
    const visible = Math.max(2, Math.ceil(ease(t) * N));
    pts = full;
    skipIndex = null;
    // only draw up to the visible count by hiding the rest off-canvas
    for (let i = visible; i < N; i++) pts[i] = { x: -9999, y: -9999 };
    // avoid drawing a stray segment from the last visible point to a hidden one
    skipIndex = visible - 1 < N - 1 ? visible - 1 : null;
    promoterAlpha = 1;
    caption = "Transcribed from the hU6 Pol3 promoter";
  } else if (stage === "fold") {
    const from = layoutLinear(cx, cy, spacing);
    const to = layoutLoop(cx, cy, loopR);
    const e = ease(t);
    pts = from.map((p, i) => lerpPt(p, to[i], e));
    wraparoundAlpha = e;
    promoterAlpha = 1 - t;
    caption = "Folds into its \u201ccuffed\u201d pseudo-circular structure";
  } else if (stage === "cleave") {
    const from = layoutLoop(cx, cy, loopR);
    const to = layoutOpen(cx, cy, loopR, CUT_INDEX, (85 * Math.PI) / 180);
    const e = ease(t);
    pts = from.map((p, i) => lerpPt(p, to[i], e));
    wraparoundAlpha = 1;
    const cleavePoint = 0.45;
    skipIndex = t > cleavePoint ? CUT_INDEX : null;
    riscAlpha = t < 0.55 ? Math.min(1, t / 0.35) : Math.max(0, 1 - (t - 0.55) / 0.45);
    flashAlpha = Math.max(0, 1 - Math.abs(t - cleavePoint) / 0.06);
    caption = "AGO2\u2013RISC, loaded with a target miRNA, cleaves the miRT site";
  } else if (stage === "load") {
    const from = layoutOpen(cx, cy, loopR, CUT_INDEX, (85 * Math.PI) / 180);
    const to = layoutLoop(clusterAnchor.x, clusterAnchor.y, 9);
    const e = ease(t);
    pts = from.map((p, i) => lerpPt(p, to[i], e));
    wraparoundAlpha = 1;
    skipIndex = CUT_INDEX;
    cas9Frame = t > 0.82 ? INTRO_CAS9_CLOSED : INTRO_CAS9_OPEN;
    caption = "Linearized cgRNA loads into Cas9";
  } else if (stage === "hold") {
    pts = layoutLoop(clusterAnchor.x, clusterAnchor.y, 9);
    wraparoundAlpha = 1;
    skipIndex = CUT_INDEX;
    cas9Frame = INTRO_CAS9_CLOSED;
    caption = "Ready to guide Cas9 to its target";
  } else {
    pts = layoutLoop(clusterAnchor.x, clusterAnchor.y, 9);
    wraparoundAlpha = 1;
    skipIndex = CUT_INDEX;
    cas9Frame = INTRO_CAS9_CLOSED;
    sceneAlpha = 1 - ease(t);
    caption = "Ready to guide Cas9 to its target";
  }

  // cas9 is present from the very start, waiting on the right
  drawIntroCas9(introCtx, cas9X, cas9Y, cas9Frame, sceneAlpha);
  drawPromoter(introCtx, promoterX, promoterY, promoterAlpha * sceneAlpha);
  drawRibbon(introCtx, pts, { skipIndex, wraparoundAlpha, alpha: sceneAlpha });

  if (stage === "cleave") {
    const risc = lerpPt(riscStart, riscTarget, Math.min(1, t / 0.4));
    drawRisc(introCtx, risc.x, risc.y, riscAlpha * sceneAlpha, riscAttachAngle + Math.PI);
    drawFlash(introCtx, riscTarget.x, riscTarget.y, flashAlpha * sceneAlpha);
  }

  if (stage === "fold" || stage === "cleave") {
    introCtx.globalAlpha = sceneAlpha * (stage === "cleave" ? 1 - t : 1);
    introCtx.fillStyle = ICOLORS.textDim;
    introCtx.font = "italic 13px 'IBM Plex Mono', 'SF Mono', Menlo, monospace";
    introCtx.textAlign = "center";
    introCtx.fillText("cuffed", cx, cy + 4);
    introCtx.globalAlpha = 1;
  }

  if (introCaption.textContent !== caption) {
    introCaption.textContent = caption;
  }
}

function introTick(now) {
  renderIntro(now);
  requestAnimationFrame(introTick);
}

if (introReducedMotion) {
  // draw one representative frame — the folded "cuffed" loop — and stop
  renderIntro(introStart + T1 + DUR.fold);
} else {
  requestAnimationFrame(introTick);
}
