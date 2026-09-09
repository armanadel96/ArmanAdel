// =========================================================
// Small site interactions: current year + settings panel
// =========================================================
document.getElementById("year").textContent = new Date().getFullYear();

const panelToggle = document.getElementById("panelToggle");
const panelBody = document.getElementById("panelBody");
panelToggle.addEventListener("click", () => {
  const open = panelBody.hidden;
  panelBody.hidden = !open;
  panelToggle.setAttribute("aria-expanded", String(open));
});

// =========================================================
// Background flocking simulation (boids)
// A field of simple agents that steer based on three rules:
// separation, alignment, and cohesion. The three sliders in
// the corner panel control how strongly each rule is applied.
// Purely decorative — safe to delete this whole section (and
// the <canvas id="flock"> element in index.html) if you'd
// rather have a plain background.
// =========================================================
const canvas = document.getElementById("flock");
const ctx = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const sepInput = document.getElementById("sep");
const aliInput = document.getElementById("ali");
const cohInput = document.getElementById("coh");

const settings = {
  separation: parseFloat(sepInput.value),
  alignment: parseFloat(aliInput.value),
  cohesion: parseFloat(cohInput.value),
};

sepInput.addEventListener("input", (e) => (settings.separation = parseFloat(e.target.value)));
aliInput.addEventListener("input", (e) => (settings.alignment = parseFloat(e.target.value)));
cohInput.addEventListener("input", (e) => (settings.cohesion = parseFloat(e.target.value)));

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

class Boid {
  constructor() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * MAX_SPEED;
    this.vy = Math.sin(angle) * MAX_SPEED;
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

function draw() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "#ededea";
  ctx.strokeStyle = "rgba(237, 237, 234, 0.15)";
  ctx.lineWidth = 1;

  for (const boid of boids) {
    ctx.beginPath();
    ctx.arc(boid.x, boid.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // faint connecting lines to nearby neighbors, echoes the
  // "network" feel without being noisy
  for (let i = 0; i < boids.length; i++) {
    for (let j = i + 1; j < boids.length; j++) {
      const dx = boids[i].x - boids[j].x;
      const dy = boids[i].y - boids[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 60) {
        ctx.globalAlpha = 1 - dist / 60;
        ctx.beginPath();
        ctx.moveTo(boids[i].x, boids[i].y);
        ctx.lineTo(boids[j].x, boids[j].y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}

function tick() {
  for (const boid of boids) boid.step(boids);
  draw();
  requestAnimationFrame(tick);
}

if (prefersReducedMotion) {
  // draw a single static frame instead of animating
  draw();
} else {
  tick();
}
