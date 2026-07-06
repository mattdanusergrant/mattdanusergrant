// BLOOM AGAIN — prototype engine (pure, DOM-free).
// "Same geometry, N renderers, solidity = f(geometry, activeStyle)."
// Scenes (vignettes) are data; per-state arrays track which blocks/gaps have been
// transformed. Styles: charcoal + pixel. Vanilla, testable in Node.
// #LLM-generated

// ---- Scene constants (virtual units; portrait). Shared with the renderer. ----
export const W = 112, H = 170;
export const STYLES = ['charcoal', 'pixel'];
export const FIG_R = 3.4;

function seg(x1, y1, x2, y2) { return { x1, y1, x2, y2 }; }
function inRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; }

// ---- Scenes ----
// Each scene authors geometry only; solidity rules are uniform:
//   - blocks: 3-face solid (L, top, R) in BOTH styles until erased (charcoal rub)
//   - gaps:   in charcoal, a fatal hole; in pixel, a shimmering tap-snap target.
//             Snapping spawns the gap's ramp segment, solid in both styles.
//   - doors:  passable outline in charcoal; solid centre-slab in pixel.
//   - staticSegs: always solid.
export const SCENES = {
  // i. The Lantern Frame — one block, one gap, one door.
  lantern: {
    spawn: { x: 16, y: 36 },
    staticSegs: [
      seg(10, 50, 42, 56),    // start ledge (rolls right)
      seg(10, 30, 10, 56),    // left wall
      seg(70, 96, 110, 103),  // landing floor (rolls right toward door/goal)
      seg(110, 80, 110, 103)  // right wall
    ],
    blocks: [{ x: 34, y: 40, w: 8, h: 16 }],
    gaps:   [{ x: 42, y: 52, w: 28, h: 48, ramp: { x1: 42, y1: 57, x2: 70, y2: 97 } }],
    doors:  [{ x: 86, y: 80, w: 8, h: 17 }],
    goal:   { x: 98, y: 86, w: 9, h: 17 }
  },
  // ii. The Lantern, Relit — two blocks bracket a wider gap. Solve = rub → snap → rub.
  relit: {
    spawn: { x: 14, y: 30 },
    staticSegs: [
      seg(8, 28, 8, 60),       // upper left wall
      seg(8, 50, 52, 56),      // top ledge (slopes right)
      seg(8, 96, 8, 138),      // lower left wall
      seg(8, 100, 60, 104),    // mid platform (slopes right, ends at the gap)
      seg(86, 134, 110, 140),  // bottom landing (slopes right toward goal)
      seg(110, 110, 110, 144)  // right wall (stops overshoot)
    ],
    blocks: [
      { x: 50, y: 41, w: 8, h: 14 },   // A — caps the top ledge
      { x: 90, y: 122, w: 6, h: 14 }   // B — sits in front of the goal
    ],
    gaps: [
      { x: 60, y: 100, w: 26, h: 36, ramp: { x1: 60, y1: 104, x2: 86, y2: 134 } }
    ],
    doors: [],
    goal:  { x: 96, y: 124, w: 8, h: 14 }
  }
};

export function getScene(s) {
  return SCENES[typeof s === 'string' ? s : s.sceneId];
}

// ---- State ----
export function createState(sceneId = 'lantern') {
  const id = SCENES[sceneId] ? sceneId : 'lantern';
  const sc = SCENES[id];
  return {
    sceneId: id,
    style: 'charcoal',
    snapped: sc.gaps.map(() => false),   // per-gap: tap-snap committed (persists across styles)
    erased:  sc.blocks.map(() => false), // per-block: rub completed (persists across styles)
    rub:     sc.blocks.map(() => 0),     // per-block: accumulated rub distance
    fig: { x: sc.spawn.x, y: sc.spawn.y, vx: 0, vy: 0, r: FIG_R },
    won: false,
    destab: 0                            // rapid-switching pressure; decays over time
  };
}

export function resetFigure(s) {
  const sp = getScene(s).spawn;
  s.fig.x = sp.x; s.fig.y = sp.y; s.fig.vx = 0; s.fig.vy = 0;
}

// Solidity = f(geometry, activeStyle). Returns the segments the Figure collides with *now*.
export function getSolidSegments(s) {
  const sc = getScene(s);
  const segs = sc.staticSegs.slice();
  sc.blocks.forEach((b, i) => {
    if (s.erased[i]) return;
    segs.push(seg(b.x, b.y, b.x, b.y + b.h));                         // left face
    segs.push(seg(b.x, b.y, b.x + b.w, b.y));                         // top face
    segs.push(seg(b.x + b.w, b.y, b.x + b.w, b.y + b.h));             // right face
  });
  sc.gaps.forEach((g, i) => {
    if (s.snapped[i]) {
      const r = g.ramp;
      segs.push(seg(r.x1, r.y1, r.x2, r.y2));                         // snapped staircase
    }
  });
  if (s.style === 'pixel') {
    sc.doors.forEach(d => {
      segs.push(seg(d.x + d.w / 2, d.y, d.x + d.w / 2, d.y + d.h));   // door slab
    });
  }
  return segs;
}

// ---- Player actions (the two gestures) ----
const RUB_THRESHOLD = 26;

export function tapAt(s, x, y) {            // Pixel gesture: tap-to-snap
  if (s.style !== 'pixel') return false;
  const sc = getScene(s);
  for (let i = 0; i < sc.gaps.length; i++) {
    if (!s.snapped[i] && inRect(x, y, sc.gaps[i])) { s.snapped[i] = true; return true; }
  }
  return false;
}

export function rubAt(s, x, y, dist) {      // Charcoal gesture: rub-to-erase
  if (s.style !== 'charcoal') return false;
  const sc = getScene(s);
  const pad = 3;
  for (let i = 0; i < sc.blocks.length; i++) {
    if (s.erased[i]) continue;
    const b = sc.blocks[i];
    const r = { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
    if (!inRect(x, y, r)) continue;
    s.rub[i] += dist;
    if (s.rub[i] >= RUB_THRESHOLD) { s.erased[i] = true; return true; }
    return false;
  }
  return false;
}

export function cycleStyle(s) {
  const i = STYLES.indexOf(s.style);
  s.style = STYLES[(i + 1) % STYLES.length];
  s.destab = Math.min(1, s.destab + 0.34);
  return s.style;
}

// ---- Physics: a carried Figure (zero direct control). Circle vs. segments, substepped. ----
const G = 190, REST = 0.04, FRICTION = 0.99, MAX_SPEED = 90;

function resolveCircleSeg(f, sg) {
  const ex = sg.x2 - sg.x1, ey = sg.y2 - sg.y1;
  const len2 = ex * ex + ey * ey || 1e-6;
  let t = ((f.x - sg.x1) * ex + (f.y - sg.y1) * ey) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = sg.x1 + t * ex, cy = sg.y1 + t * ey;
  let dx = f.x - cx, dy = f.y - cy;
  let dist = Math.hypot(dx, dy);
  if (dist >= f.r) return;
  if (dist < 1e-5) { dx = 0; dy = -1; dist = 1e-5; }
  const nx = dx / dist, ny = dy / dist;
  f.x = cx + nx * f.r; f.y = cy + ny * f.r;
  const vn = f.vx * nx + f.vy * ny;
  if (vn < 0) { f.vx -= (1 + REST) * vn * nx; f.vy -= (1 + REST) * vn * ny; }
  const tx = -ny, ty = nx;
  let vt = f.vx * tx + f.vy * ty;
  vt *= FRICTION;
  const vnNew = f.vx * nx + f.vy * ny;
  f.vx = vnNew * nx + vt * tx; f.vy = vnNew * ny + vt * ty;
}

export function stepPhysics(s, dt) {
  if (s.won) return;
  s.destab = Math.max(0, s.destab - dt * 0.5);
  const sub = 6, h = dt / sub;
  const sc = getScene(s);
  for (let i = 0; i < sub; i++) {
    const f = s.fig;
    f.vy += G * h;
    const sp = Math.hypot(f.vx, f.vy);
    if (sp > MAX_SPEED) { f.vx *= MAX_SPEED / sp; f.vy *= MAX_SPEED / sp; }
    f.x += f.vx * h; f.y += f.vy * h;
    const segs = getSolidSegments(s);
    for (const sg of segs) resolveCircleSeg(f, sg);
    if (f.y > H + 12 || f.x < 2) { resetFigure(s); break; } // fell into void — soft respawn
  }
  if (inRect(s.fig.x, s.fig.y, sc.goal)) s.won = true;
}

// ---- Headless helper for tests ----
export function simulate(seconds, s) {
  const dt = 1 / 60, steps = Math.round(seconds / dt);
  for (let i = 0; i < steps && !s.won; i++) stepPhysics(s, dt);
  return s;
}
