// =========================================================
// Small site interactions: current year
// =========================================================
document.getElementById("year").textContent = new Date().getFullYear();

// =========================================================
// Background: an 8-bit DNA-vs-Cas9 field
//
// Two kinds of sprites drift around the page:
//   - "dna"  : a pixel-art double helix, drawn procedurally
//   - "cas9" : a pixel-art Cas9 enzyme, a bilobed "claw"
//              shape generated from two overlapping circles
//
// When a Cas9 gets close enough to a strand of DNA, the
// strand is cut: it flashes, splits into a top and bottom
// half that drift apart and fade out, then a fresh whole
// strand respawns elsewhere.
//
// Purely decorative — safe to delete this whole section (and
// the <canvas id="flock"> element in index.html) if you'd
// rather have a plain background.
// =========================================================
const canvas = document.getElementById("flock");
const ctx = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// EDIT ME: how strongly agents steer toward/away from each other, 0–1.
const settings = {
  separation: 0.4,
  alignment: 0.3,
  cohesion: 0.2,
};

// EDIT ME: population + movement
const DNA_COUNT = 10;
const CAS9_COUNT = 15;
const PIXEL_SIZE = 5;          // size of one "8-bit" pixel, in screen px
const NEIGHBOR_RADIUS = 100;   // how far agents sense each other for flocking
const MAX_SPEED = 1.1;
const COLLISION_DISTANCE = 34; // how close a cas9 must get to cut a strand

// EDIT ME: timing of the cut animation, in ms
const CUT_FLASH_MS = 180;   // how long the cut flashes before splitting
const CUT_DRIFT_MS = 1100;  // how long the two halves drift apart + fade
const CAS9_SNAP_MS = 320;   // how long the enzyme's "mouth" stays shut after a cut

// EDIT ME: colors (dark-on-light, to match the page background)
const COLORS = {
  strandA: "#14140f",
  strandB: "#6f6f68",
  rung: "#b9b9ae",
  flash: "#c0392b",
  cas9Body: "#8f8f86", // the larger, lighter lobe
  cas9Cap: "#1c1c17",  // the smaller, darker lobe on top
};

let width, height;
function resize() {
  width = canvas.width = window.innerWidth * window.devicePixelRatio;
  height = canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener("resize", () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  resize();
});
resize();

// ---------------------------------------------------------
// DNA helix: two crossing pixel strands with periodic
// "rungs" connecting them, drawn procedurally each frame so
// it twists as it drifts. Consecutive rows are bridged with
// a small connecting block so the strand reads as one
// continuous zigzag line rather than scattered dots.
// ---------------------------------------------------------
const HELIX_ROWS = 16;    // how many pixel-rows tall a strand is
const HELIX_SPAN = 3;     // how far the strands swing from center, in pixel-columns
const TWIST_RATE = 0.5;   // how fast the twist changes row-to-row (lower = smoother)
const TWIST_SPEED = 1.0;  // how fast the twist animates over time
const RUNG_EVERY = 2;     // draw a base-pair rung every N rows

// ---------------------------------------------------------
// Cas9: a bilobed "claw" sprite — a larger lighter lobe with
// a smaller darker lobe overlapping it, and a notch cut into
// the side that widens (open) or narrows (closed) to show it
// snapping shut on a strand.
// ---------------------------------------------------------
const CAS9_SIZE = 13;
function buildCas9Sprite(notchRowStart, notchRowEnd, notchColStart) {
  const mainCenter = { r: 8, c: 5 };
  const mainR = 5;
  const capCenter = { r: 4, c: 8 };
  const capR = 3.4;
  const rows = [];
  for (let r = 0; r < CAS9_SIZE; r++) {
    let row = "";
    for (let c = 0; c < CAS9_SIZE; c++) {
      const dCap = Math.hypot(r - capCenter.r, c - capCenter.c);
      const dMain = Math.hypot(r - mainCenter.r, c - mainCenter.c);
      let ch = ".";
      if (dCap <= capR) ch = "1";
      else if (dMain <= mainR) ch = "2";
      if (r >= notchRowStart && r <= notchRowEnd && c >= notchColStart) ch = ".";
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}
// wider/lower notch = jaw open, narrower/higher notch = jaw closed
const CAS9_OPEN = buildCas9Sprite(7, 11, 8);
const CAS9_CLOSED = buildCas9Sprite(8, 9, 10);
const CAS9_COLOR_MAP = {
  "1": COLORS.cas9Cap,
  "2": COLORS.cas9Body,
};

class Agent {
  constructor(kind) {
    this.kind = kind;
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * MAX_SPEED;
    this.vy = Math.sin(angle) * MAX_SPEED;
    this.phase = Math.random() * Math.PI * 2;

    if (kind === "dna") {
      this.state = "alive"; // alive -> cutting -> falling -> (respawns to alive)
      this.cutRow = 0;
    } else {
      this.snapUntil = 0; // timestamp until which the "closed" frame shows
    }
  }

  step(agents, now) {
    if (this.kind === "dna" && this.state !== "alive") {
      this.updateCut(now);
      return;
    }

    // standard flocking: steer based on nearby agents of either kind
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0;
    let cohX = 0, cohY = 0;
    let count = 0;

    for (const other of agents) {
      if (other === this) continue;
      if (other.kind === "dna" && other.state !== "alive") continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist < NEIGHBOR_RADIUS && dist > 0) {
        sepX += dx / dist;
        sepY += dy / dist;
        aliX += other.vx;
        aliY += other.vy;
        cohX += other.x;
        cohY += other.y;
        count++;
      }
    }

    if (count > 0) {
      aliX /= count;
      aliY /= count;
      cohX = cohX / count - this.x;
      cohY = cohY / count - this.y;

      this.vx += sepX * settings.separation * 0.05;
      this.vy += sepY * settings.separation * 0.05;
      this.vx += aliX * settings.alignment * 0.05;
      this.vy += aliY * settings.alignment * 0.05;
      this.vx += cohX * settings.cohesion * 0.001;
      this.vy += cohY * settings.cohesion * 0.001;
    }

    const speed = Math.hypot(this.vx, this.vy) || 1;
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }

    this.x += this.vx;
    this.y += this.vy;

    const w = window.innerWidth, h = window.innerHeight;
    if (this.x < -30) this.x = w + 30;
    if (this.x > w + 30) this.x = -30;
    if (this.y < -30) this.y = h + 30;
    if (this.y > h + 30) this.y = -30;
  }

  updateCut(now) {
    if (this.state === "cutting") {
      if (now - this.cutStart > CUT_FLASH_MS) {
        this.state = "falling";
        this.fallStart = now;
        this.topVX = -0.5 - Math.random() * 0.5;
        this.topVY = -0.7 - Math.random() * 0.5;
        this.bottomVX = 0.5 + Math.random() * 0.5;
        this.bottomVY = 0.7 + Math.random() * 0.5;
      }
    } else if (this.state === "falling") {
      if (now - this.fallStart > CUT_DRIFT_MS) {
        this.respawn();
      }
    }
  }

  triggerCut(now) {
    this.state = "cutting";
    this.cutStart = now;
    // keep at least a few rows on either side of the cut
    this.cutRow = 3 + Math.floor(Math.random() * (HELIX_ROWS - 6));
  }

  respawn() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * MAX_SPEED;
    this.vy = Math.sin(angle) * MAX_SPEED;
    this.state = "alive";
  }
}

const agents = [
  ...Array.from({ length: DNA_COUNT }, () => new Agent("dna")),
  ...Array.from({ length: CAS9_COUNT }, () => new Agent("cas9")),
];

// ---------------------------------------------------------
// drawing
// ---------------------------------------------------------
function drawHelixRows(agent, rowStart, rowEnd, offsetX, offsetY, alpha, time) {
  const top = agent.y - (HELIX_ROWS * PIXEL_SIZE) / 2 + offsetY;
  ctx.globalAlpha = alpha;

  let prevAX = null, prevBX = null;

  for (let r = rowStart; r < rowEnd; r++) {
    const phase = r * TWIST_RATE + agent.phase + time * TWIST_SPEED;
    const aCol = Math.round(Math.sin(phase) * HELIX_SPAN);
    const bCol = -aCol;
    const rowY = top + r * PIXEL_SIZE;
    const aX = agent.x + offsetX + aCol * PIXEL_SIZE;
    const bX = agent.x + offsetX + bCol * PIXEL_SIZE;

    // bridge from the previous row so the strand reads as one
    // continuous line rather than a scatter of dots
    if (prevAX !== null && aX !== prevAX) {
      ctx.fillStyle = COLORS.strandA;
      ctx.fillRect(Math.min(prevAX, aX), rowY, Math.abs(aX - prevAX) + PIXEL_SIZE, PIXEL_SIZE);
    }
    if (prevBX !== null && bX !== prevBX) {
      ctx.fillStyle = COLORS.strandB;
      ctx.fillRect(Math.min(prevBX, bX), rowY, Math.abs(bX - prevBX) + PIXEL_SIZE, PIXEL_SIZE);
    }

    ctx.fillStyle = COLORS.strandA;
    ctx.fillRect(aX, rowY, PIXEL_SIZE, PIXEL_SIZE);
    ctx.fillStyle = COLORS.strandB;
    ctx.fillRect(bX, rowY, PIXEL_SIZE, PIXEL_SIZE);

    // base-pair rung every couple of rows
    if ((r - rowStart) % RUNG_EVERY === 0) {
      const rungLeft = Math.min(aX, bX) + PIXEL_SIZE;
      const rungWidth = Math.max(aX, bX) - rungLeft;
      if (rungWidth > 0) {
        ctx.fillStyle = COLORS.rung;
        ctx.fillRect(rungLeft, rowY, rungWidth, PIXEL_SIZE);
      }
    }

    prevAX = aX;
    prevBX = bX;
  }
  ctx.globalAlpha = 1;
}

function drawDna(agent, time, now) {
  if (agent.state === "alive") {
    drawHelixRows(agent, 0, HELIX_ROWS, 0, 0, 1, time);
    return;
  }

  if (agent.state === "cutting") {
    drawHelixRows(agent, 0, HELIX_ROWS, 0, 0, 1, time);
    // flash across the cut row
    const flashOn = Math.floor((now - agent.cutStart) / 40) % 2 === 0;
    if (flashOn) {
      const top = agent.y - (HELIX_ROWS * PIXEL_SIZE) / 2;
      ctx.fillStyle = COLORS.flash;
      ctx.fillRect(
        agent.x - (HELIX_SPAN + 1) * PIXEL_SIZE,
        top + agent.cutRow * PIXEL_SIZE,
        (HELIX_SPAN + 1) * 2 * PIXEL_SIZE,
        PIXEL_SIZE
      );
    }
    return;
  }

  // falling: two halves drift apart and fade
  const t = (now - agent.fallStart) * 0.06;
  const progress = Math.min((now - agent.fallStart) / CUT_DRIFT_MS, 1);
  const alpha = 1 - progress;
  drawHelixRows(agent, 0, agent.cutRow, agent.topVX * t, agent.topVY * t, alpha, time);
  drawHelixRows(agent, agent.cutRow, HELIX_ROWS, agent.bottomVX * t, agent.bottomVY * t, alpha, time);
}

function drawCas9(agent, now) {
  const frame = now < agent.snapUntil ? CAS9_CLOSED : CAS9_OPEN;
  const half = (CAS9_SIZE * PIXEL_SIZE) / 2;
  for (let row = 0; row < CAS9_SIZE; row++) {
    for (let col = 0; col < CAS9_SIZE; col++) {
      const ch = frame[row][col];
      if (ch === ".") continue;
      ctx.fillStyle = CAS9_COLOR_MAP[ch];
      ctx.fillRect(
        agent.x - half + col * PIXEL_SIZE,
        agent.y - half + row * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    }
  }
}

function checkCollisions(now) {
  for (const cas9 of agents) {
    if (cas9.kind !== "cas9") continue;
    for (const dna of agents) {
      if (dna.kind !== "dna" || dna.state !== "alive") continue;
      const dist = Math.hypot(cas9.x - dna.x, cas9.y - dna.y);
      if (dist < COLLISION_DISTANCE) {
        dna.triggerCut(now);
        cas9.snapUntil = now + CAS9_SNAP_MS;
      }
    }
  }
}

function draw(time, now) {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const agent of agents) {
    if (agent.kind === "dna") drawDna(agent, time, now);
    else drawCas9(agent, now);
  }
}

function tick(rafTime) {
  const now = performance.now();
  checkCollisions(now);
  for (const agent of agents) agent.step(agents, now);
  draw(rafTime / 1000, now);
  requestAnimationFrame(tick);
}

if (prefersReducedMotion) {
  draw(0, performance.now());
} else {
  requestAnimationFrame(tick);
}
