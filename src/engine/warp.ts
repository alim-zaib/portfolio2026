import type { Orb, OrbitalParticle, WarpInfo } from "../types/index.ts";

// Warp phase boundaries (seconds)
const PHASE1_END = 0.3;
const PHASE2_END = 0.8;
const PHASE3_END = 1.4;
export const WARP_DURATION = PHASE3_END;

/** Ease-in cubic. */
function easeIn(t: number): number {
  return t * t * t;
}

/** Ease-out cubic. */
function easeOut(t: number): number {
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

/** Collapse orbital particles toward the warp origin during Phase 1. */
export function updateWarpParticles(
  particles: OrbitalParticle[],
  orbs: readonly Orb[],
  warp: WarpInfo,
): void {
  if (warp.elapsed > PHASE1_END) return;
  const t = warp.elapsed / PHASE1_END; // 0→1
  const pull = easeIn(t);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const orb = orbs[p.parentIndex];
    // Pull toward the warp origin
    p.x = p.x + (warp.originX - p.x) * pull * 0.15;
    p.y = p.y + (warp.originY - p.y) * pull * 0.15;
    // Also collapse orbital radius
    p.radius = p.baseRadius * (1 - pull * 0.7);
    // Speed up angular velocity for a swirl effect
    p.angle += p.angularVelocity * 0.05 * (1 + pull * 4);
    // Update world position
    const orbX = Math.cos(p.angle) * p.radius;
    const orbY = Math.sin(p.angle) * p.radius;
    p.x = orb.x + orbX + p.offsetX;
    p.y = orb.y + orbY + p.offsetY;
  }
}

/** Render star-streaks during Phase 2 (warp speed effect). */
export function renderWarpStars(
  ctx: CanvasRenderingContext2D,
  warp: WarpInfo,
  viewWidth: number,
  viewHeight: number,
): void {
  if (warp.elapsed < PHASE1_END || warp.elapsed > PHASE3_END) return;

  const phaseT = (warp.elapsed - PHASE1_END) / (PHASE2_END - PHASE1_END);
  const t = Math.min(1, phaseT);
  const streakLen = easeIn(t) * Math.max(viewWidth, viewHeight) * 0.4;
  const alpha = 0.6 * (t < 0.5 ? easeIn(t * 2) : 1);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Generate deterministic streaks radiating from warp origin
  const ox = warp.originX;
  const oy = warp.originY;
  const streakCount = 80;

  for (let i = 0; i < streakCount; i++) {
    // Deterministic angle + distance from a seed
    const seed = i * 7919; // prime for distribution
    const angle = ((seed % 6283) / 1000); // pseudo-random angle in radians
    const baseDist = 40 + ((seed * 3) % 400);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const startDist = baseDist * (0.3 + t * 0.7);
    const endDist = startDist + streakLen * (0.5 + ((seed % 100) / 200));

    const x1 = ox + cos * startDist;
    const y1 = oy + sin * startDist;
    const x2 = ox + cos * endDist;
    const y2 = oy + sin * endDist;

    const streakAlpha = alpha * (0.3 + ((seed % 70) / 100));
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, `rgba(200, 220, 255, 0)`);
    grad.addColorStop(0.3, `rgba(200, 220, 255, ${streakAlpha})`);
    grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 0.5 + ((seed % 30) / 20);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Render the expanding orb during Phase 2. */
export function renderWarpOrb(
  ctx: CanvasRenderingContext2D,
  warp: WarpInfo,
  orbs: readonly Orb[],
  viewWidth: number,
  viewHeight: number,
): void {
  if (warp.elapsed < PHASE1_END) return;

  const orb = orbs[warp.orbIndex];
  const [r, g, b] = hexToRgb(orb.section.color);

  if (warp.elapsed <= PHASE2_END) {
    // Phase 2: orb rapidly expands
    const t = (warp.elapsed - PHASE1_END) / (PHASE2_END - PHASE1_END);
    const maxR = Math.max(viewWidth, viewHeight) * 0.8;
    const expandR = orb.baseRadius + easeIn(t) * maxR;
    const alpha = 0.3 + t * 0.4;

    const grad = ctx.createRadialGradient(
      warp.originX, warp.originY, 0,
      warp.originX, warp.originY, expandR,
    );
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(0, 0, 0, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(warp.originX, warp.originY, expandR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Render the bright flash at peak expansion (transition from Phase 2 to 3). */
export function renderWarpFlash(
  ctx: CanvasRenderingContext2D,
  warp: WarpInfo,
  viewWidth: number,
  viewHeight: number,
): void {
  // Flash peaks at PHASE2_END and fades through Phase 3
  const flashStart = PHASE2_END - 0.1;
  const flashEnd = PHASE3_END;
  if (warp.elapsed < flashStart || warp.elapsed > flashEnd) return;

  let alpha: number;
  if (warp.elapsed < PHASE2_END) {
    // Ramp up
    alpha = (warp.elapsed - flashStart) / (PHASE2_END - flashStart);
  } else {
    // Fade out
    const t = (warp.elapsed - PHASE2_END) / (flashEnd - PHASE2_END);
    alpha = 1 - easeOut(t);
  }

  alpha = Math.min(1, alpha * 0.85);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
  ctx.fillRect(0, 0, viewWidth, viewHeight);
  ctx.restore();
}

/** Get the warp phase (1, 2, or 3) based on elapsed time. */
export function getWarpPhase(elapsed: number): 1 | 2 | 3 {
  if (elapsed < PHASE1_END) return 1;
  if (elapsed < PHASE2_END) return 2;
  return 3;
}

/** Should orbs and orbitals be rendered (hidden after Phase 2 of warp-in)? */
export function shouldRenderOrbs(warp: WarpInfo | null, isWarping: boolean): boolean {
  if (!isWarping || !warp) return true;
  return warp.elapsed < PHASE2_END;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
