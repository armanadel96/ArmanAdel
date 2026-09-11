// =========================================================
// Intro hero: crossfades through the exact storyboard artwork
// (inlined as SVG in index.html, id="introStory") depicting:
// transcription -> folding into the "cuffed" loop -> AGO2-RISC
// cleavage -> loading into Cas9.
//
// Every panel in the SVG is a <g class="story-panel" id="panel-XX">
// pre-scaled and centered so they all land in the same screen
// position; this file just crossfades their opacity in sequence
// and updates the caption underneath.
//
// Safe to delete this whole file (and the inline <svg id="introStory">
// + <section id="intro"> markup in index.html) if you'd rather the
// page open straight on the normal content.
// =========================================================
const introCaption = document.getElementById("introCaption");
const introReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// EDIT ME: how long each panel holds, and the caption shown under it.
// Order matches the storyboard: transcription (T) -> folding (F) ->
// cleavage by RISC (C) -> loading into Cas9 (L).
const PANELS = [
  { id: "T1", hold: 500, caption: "Transcribed from the hU6 Pol3 promoter" },
  { id: "T2", hold: 500, caption: "Transcribed from the hU6 Pol3 promoter" },
  { id: "T3", hold: 500, caption: "Transcribed from the hU6 Pol3 promoter" },
  { id: "T4", hold: 700, caption: "Transcribed from the hU6 Pol3 promoter" },
  { id: "F1", hold: 500, caption: "Folds into its \u201ccuffed\u201d pseudo-circular structure" },
  { id: "F2", hold: 500, caption: "Folds into its \u201ccuffed\u201d pseudo-circular structure" },
  { id: "F3", hold: 800, caption: "Folds into its \u201ccuffed\u201d pseudo-circular structure" },
  { id: "C1", hold: 600, caption: "AGO2\u2013RISC, loaded with a target miRNA, approaches the cgRNA" },
  { id: "C2", hold: 500, caption: "AGO2\u2013RISC attaches at the miRT site" },
  { id: "C3", hold: 500, caption: "AGO2\u2013RISC attaches at the miRT site" },
  { id: "C4", hold: 600, caption: "The cgRNA is cleaved" },
  { id: "C5", hold: 900, caption: "The cleaved cgRNA is now linear" },
  { id: "L1", hold: 600, caption: "The linearized cgRNA approaches Cas9" },
  { id: "L2", hold: 1200, caption: "Loaded into Cas9" },
];
// EDIT ME: how long the crossfade between panels takes, in ms
const FADE_MS = 400;

const segments = PANELS.map((p) => ({ ...p, el: document.getElementById(`panel-${p.id}`) }));
const TOTAL = segments.reduce((sum, s) => sum + s.hold + FADE_MS, 0);

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const introStart = performance.now();
let lastCaption = "";

function renderIntro(now) {
  const elapsed = (now - introStart) % TOTAL;

  // find which segment we're in: each segment is [fade-in][hold]
  let t = elapsed;
  let index = 0;
  for (; index < segments.length; index++) {
    const segLen = FADE_MS + segments[index].hold;
    if (t < segLen) break;
    t -= segLen;
  }
  const current = segments[index];
  const prev = segments[(index - 1 + segments.length) % segments.length];

  const fadeProgress = Math.min(1, t / FADE_MS);
  const e = ease(fadeProgress);

  for (const seg of segments) {
    if (!seg.el) continue;
    if (seg === current) seg.el.style.opacity = String(e);
    else if (seg === prev) seg.el.style.opacity = String(1 - e);
    else seg.el.style.opacity = "0";
  }

  const dominant = e > 0.5 ? current : prev;
  if (dominant.caption !== lastCaption) {
    lastCaption = dominant.caption;
    introCaption.textContent = dominant.caption;
  }
}

function introTick(now) {
  renderIntro(now);
  requestAnimationFrame(introTick);
}

if (introReducedMotion) {
  // show one representative frame — the loaded-into-Cas9 state — and stop
  for (const seg of segments) {
    if (!seg.el) continue;
    seg.el.style.opacity = seg.id === "L2" ? "1" : "0";
  }
  introCaption.textContent = "cgRNA loads into Cas9 to enable programmable targeting";
} else {
  requestAnimationFrame(introTick);
}
