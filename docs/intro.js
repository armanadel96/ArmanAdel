// =========================================================
// Intro hero: a flipbook animation built directly from an
// 80-frame storyboard (inlined as SVG in index.html, id=
// "introStory") showing the gene continuously transcribing
// cgRNA copies that fold up and float off the right edge of
// the frame.
//
// Each <g class="story-frame" id="frame-N"> is one drawn frame,
// pre-shifted into a shared coordinate system so they all line
// up. This script just plays through them in order with a short
// crossfade between consecutive frames (to smooth out the step
// between hand-drawn poses) and loops seamlessly, since the
// storyboard's last frame already matches its first.
//
// Safe to delete this whole file (and the <section id="intro">
// markup + inline <svg id="introStory"> in index.html) if you'd
// rather the page open straight on the normal content.
// =========================================================
const introReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const frames = Array.from(document.querySelectorAll(".story-frame"));
const FRAME_COUNT = frames.length;

// EDIT ME: playback speed. Each frame is shown for FRAME_MS, with
// CROSSFADE_MS of overlap blended into the next one.
const FRAME_MS = 90;
const CROSSFADE_MS = 40;
const TOTAL = FRAME_COUNT * FRAME_MS;

function ease(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const introStart = performance.now();

function renderIntro(now) {
  const elapsed = (now - introStart) % TOTAL;
  const index = Math.floor(elapsed / FRAME_MS);
  const intoFrame = elapsed - index * FRAME_MS;

  const current = index % FRAME_COUNT;
  const next = (index + 1) % FRAME_COUNT;

  // crossfade only during the tail end of each frame's duration
  const fadeStart = FRAME_MS - CROSSFADE_MS;
  let nextAlpha = 0;
  if (intoFrame > fadeStart) {
    nextAlpha = ease((intoFrame - fadeStart) / CROSSFADE_MS);
  }

  for (let i = 0; i < FRAME_COUNT; i++) {
    if (i === current) frames[i].style.opacity = String(1 - nextAlpha);
    else if (i === next) frames[i].style.opacity = String(nextAlpha);
    else frames[i].style.opacity = "0";
  }
}

function introTick(now) {
  renderIntro(now);
  requestAnimationFrame(introTick);
}

if (introReducedMotion) {
  // show one representative static frame — mid-sequence, with a
  // couple of molecules mid-flight — and stop
  const still = Math.floor(FRAME_COUNT * 0.5);
  frames.forEach((f, i) => { f.style.opacity = i === still ? "1" : "0"; });
} else {
  requestAnimationFrame(introTick);
}
