// =========================================================
// Small site interactions: current year + settings panel
// =========================================================
document.getElementById("year").textContent = new Date().getFullYear();

// =========================================================
// Background flocking simulation (boids)
// A field of simple agents that steer based on three rules:
// separation, alignment, and cohesion. Drawn to look like a
// loose field of drifting cells rather than plain dots.
// Purely decorative — safe to delete this whole section (and
// the <canvas id="flock"> element in index.html) if you'd
// rather have a plain background.
// =========================================================
const canvas = document.getElementById("flock");
const ctx = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// EDIT ME: how strongly each rule is applied, 0–1.
const settings = {
  separation: 0.4,
  alignment: 0.3,
  cohesion: 0.2,
};

// EDIT ME: how many agents. Fewer = calmer / faster.
const BOID_COUNT = 70;
const NEIGHBOR_RADIUS = 90;
const MAX_SPEED = 1.4;

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

// EDIT ME: cell size range, in pixels.
const MIN_RADIUS = 6;
const MAX_RADIUS = 12;

class Boid {
  constructor() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * MAX_SPEED;
    this.vy = Math.sin(angle) * MAX_SPEED;

    // cell look: a base size that gently pulses, and a nucleus
    // sitting off-center so cells don't look like perfect circles
    this.baseRadius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.6 + Math.random() * 0.6;
    const nucleusAngle = Math.random() * Math.PI * 2;
    const nucleusDist = this.baseRadius * 0.25;
    this.nucleusX = Math.cos(nucleusAngle) * nucleusDist;
    this.nucleusY = Math.sin(nucleusAngle) * nucleusDist;
  }

  step(boids) {
    let sepX = 0, sepY = 0;
    let aliX = 0, aliY = 0;
    let cohX = 0, cohY = 0;
    let count = 0;

    for (const other of boids) {
      if (other === this) continue;
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

    // wrap around edges
    const w = window.innerWidth, h = window.innerHeight;
    if (this.x < -10) this.x = w + 10;
    if (this.x > w + 10) this.x = -10;
    if (this.y < -10) this.y = h + 10;
    if (this.y > h + 10) this.y = -10;
  }
}

const boids = Array.from({ length: BOID_COUNT }, () => new Boid());

function drawCell(boid, time) {
  const r = boid.baseRadius + Math.sin(time * boid.pulseSpeed + boid.pulsePhase) * 1.2;

  // soft membrane: a radial gradient fading from translucent
  // center out to nothing at the edge
  const membrane = ctx.createRadialGradient(boid.x, boid.y, 0, boid.x, boid.y, r);
  membrane.addColorStop(0, "rgba(237, 237, 234, 0.30)");
  membrane.addColorStop(1, "rgba(237, 237, 234, 0)");
  ctx.fillStyle = membrane;
  ctx.beginPath();
  ctx.arc(boid.x, boid.y, r, 0, Math.PI * 2);
  ctx.fill();

  // membrane outline
  ctx.strokeStyle = "rgba(237, 237, 234, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(boid.x, boid.y, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  // nucleus, offset from center
  ctx.fillStyle = "rgba(237, 237, 234, 0.85)";
  ctx.beginPath();
  ctx.arc(boid.x + boid.nucleusX, boid.y + boid.nucleusY, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function draw(time) {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const boid of boids) drawCell(boid, time);
}

function tick(time) {
  for (const boid of boids) boid.step(boids);
  draw(time / 1000);
  requestAnimationFrame(tick);
}

if (prefersReducedMotion) {
  // draw a single static frame instead of animating
  draw(0);
} else {
  requestAnimationFrame(tick);
}
