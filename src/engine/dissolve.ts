import type { DissolveParticle, DissolveInfo, Orb } from "../types/index.ts";
import { randomRange, clamp } from "./math.ts";

// Phase boundaries (seconds)
const PHASE1_END = 0.4;
const PHASE2_DRIFT_END = 0.6;
const PHASE2_END = 1.0;
const PHASE3_END = 1.5;

export const DISSOLVE_DURATION = PHASE3_END;

/** Stagger delay between each card's shatter (seconds). */
const CARD_STAGGER = 0.08;

/** Particles spawned per card/title element. */
const PARTICLES_PER_ELEMENT = 50;

/** Ease-in cubic (slow start, fast finish). */
function easeIn(t: number): number {
  return t * t * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface CardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pre-allocate all shatter particles from card bounding rects. */
export function createDissolveParticles(
  cardRects: CardRect[],
  sectionColor: string,
  orbs: readonly Orb[],
  activeSection: number,
): DissolveInfo {
  const [r, g, b] = hexToRgb(sectionColor);
  const totalParticles = cardRects.length * PARTICLES_PER_ELEMENT;
  const particles: DissolveParticle[] = new Array(totalParticles);

  for (let ci = 0; ci < cardRects.length; ci++) {
    const rect = cardRects[ci];
    const baseIdx = ci * PARTICLES_PER_ELEMENT;

    for (let pi = 0; pi < PARTICLES_PER_ELEMENT; pi++) {
      // Random position within the card rect
      const px = rect.x + Math.random() * rect.width;
      const py = rect.y + Math.random() * rect.height;

      // Burst velocity: outward from card centre with randomness
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = randomRange(80, 250);
      const vx = (dx / dist) * speed + randomRange(-60, 60);
      const vy = (dy / dist) * speed + randomRange(-60, 60);

      // All particles reform into the active section's orb
      const targetOrbIndex = activeSection;

      particles[baseIdx + pi] = {
        x: px,
        y: py,
        vx,
        vy,
        size: randomRange(1, 3),
        alpha: randomRange(0.2, 0.8),
        r: clamp(r + Math.round(randomRange(-20, 20)), 0, 255),
        g: clamp(g + Math.round(randomRange(-20, 20)), 0, 255),
        b: clamp(b + Math.round(randomRange(-20, 20)), 0, 255),
        targetOrbIndex,
        arrived: false,
        cardGroup: ci,
      };
    }
  }

  return {
    elapsed: 0,
    particles,
    activeSection,
    cardCount: cardRects.length,
    orbReformStart: orbs.map(() => -1),
    orbReformFlash: orbs.map(() => 0),
    allArrivedAt: -1,
  };
}

/** Get the stagger time for a given card group index. */
function getCardShatterTime(groupIndex: number): number {
  return groupIndex * CARD_STAGGER;
}

/** Update dissolve animation each frame. Returns true when complete. */
export function updateDissolveAnimation(
  dissolve: DissolveInfo,
  dt: number,
  orbs: readonly Orb[],
): boolean {
  dissolve.elapsed += dt;
  const t = dissolve.elapsed;

  for (let i = 0; i < dissolve.particles.length; i++) {
    const p = dissolve.particles[i];
    if (p.arrived) continue;

    const shatterTime = getCardShatterTime(p.cardGroup);
    // Not yet shattered — keep at spawn position
    if (t < shatterTime) continue;

    if (t < PHASE1_END) {
      // Phase 1: burst outward from card position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
    } else if (t < PHASE2_DRIFT_END) {
      // Phase 2 early: drift with slight random motion
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx += randomRange(-30, 30) * dt;
      p.vy += randomRange(-30, 30) * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
    } else if (t < PHASE2_END) {
      // Phase 2 late: gravitational pull toward target orb (slow→fast easing)
      const orb = orbs[p.targetOrbIndex];
      const dx = orb.baseX - p.x;
      const dy = orb.baseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const gatherT = (t - PHASE2_DRIFT_END) / (PHASE2_END - PHASE2_DRIFT_END);
      const gatherForce = easeIn(gatherT) * 2500;
      const force = gatherForce / Math.max(dist, 30);

      p.vx += (dx / dist) * force * dt;
      p.vy += (dy / dist) * force * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    } else {
      // Phase 3+: strong compression into orb core (keeps running until all arrive)
      const orb = orbs[p.targetOrbIndex];
      const dx = orb.baseX - p.x;
      const dy = orb.baseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      if (dist < 5) {
        p.arrived = true;
        p.alpha = 0;
        continue;
      }

      // compressT ramps from 0→1 over Phase 3, then clamps at 1 for stragglers
      const compressT = Math.min(1, (t - PHASE2_END) / (PHASE3_END - PHASE2_END));
      const compressForce = 3000 + easeIn(compressT) * 8000;

      p.vx += (dx / dist) * compressForce * dt;
      p.vy += (dy / dist) * compressForce * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;

      // Fade out as approaching core
      if (dist < 30) {
        p.alpha *= 0.9;
      }
    }
  }

  // Track orb reformation during Phase 3
  if (t >= PHASE2_END) {
    const active = dissolve.activeSection;

    // Active orb: dramatic particle-arrival flash
    let arrivedCount = 0;
    let totalForOrb = 0;
    for (let i = 0; i < dissolve.particles.length; i++) {
      totalForOrb++;
      if (dissolve.particles[i].arrived) arrivedCount++;
    }
    if (dissolve.orbReformStart[active] < 0 && totalForOrb > 0 && arrivedCount / totalForOrb > 0.5) {
      dissolve.orbReformStart[active] = t;
    }
    if (dissolve.orbReformStart[active] >= 0) {
      const flashAge = t - dissolve.orbReformStart[active];
      dissolve.orbReformFlash[active] = Math.min(1, flashAge / 0.15);
    }

    // Other orbs: simple glow-up, no flash (orbReformStart used for fade-in timing)
    for (let oi = 0; oi < orbs.length; oi++) {
      if (oi === active) continue;
      if (dissolve.orbReformStart[oi] < 0) {
        dissolve.orbReformStart[oi] = t;
      }
    }
  }

  // Check if all particles have arrived
  if (dissolve.allArrivedAt < 0) {
    let allDone = true;
    for (let i = 0; i < dissolve.particles.length; i++) {
      if (!dissolve.particles[i].arrived) {
        allDone = false;
        break;
      }
    }
    if (allDone) {
      dissolve.allArrivedAt = t;
    }
  }

  // Complete after all particles arrived + 250ms hold for stillness
  const HOLD_DURATION = 0.25;
  return dissolve.allArrivedAt >= 0 && t >= dissolve.allArrivedAt + HOLD_DURATION;
}

/** Render dissolve particles on the canvas. */
export function renderDissolveParticles(
  ctx: CanvasRenderingContext2D,
  dissolve: DissolveInfo,
): void {
  const t = dissolve.elapsed;

  for (let i = 0; i < dissolve.particles.length; i++) {
    const p = dissolve.particles[i];
    if (p.arrived || p.alpha < 0.01) continue;

    const shatterTime = getCardShatterTime(p.cardGroup);
    if (t < shatterTime) continue;

    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/** Render reformation flash on the active orb only. */
export function renderOrbReformationFlash(
  ctx: CanvasRenderingContext2D,
  dissolve: DissolveInfo,
  orbs: readonly Orb[],
): void {
  const oi = dissolve.activeSection;
  const flash = dissolve.orbReformFlash[oi];
  if (flash <= 0) return;

  const orb = orbs[oi];
  const [r, g, b] = hexToRgb(orb.section.color);

  // Bright burst that peaks then fades
  const alpha = flash < 0.5 ? flash * 2 : 2 * (1 - flash);
  const flashR = orb.baseRadius * (1.2 + flash * 0.6);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const grad = ctx.createRadialGradient(
    orb.baseX, orb.baseY, 0,
    orb.baseX, orb.baseY, flashR,
  );
  grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
  grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(orb.baseX, orb.baseY, flashR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Get the fade-in progress (0–1) for a non-active orb during dissolve. */
export function getInactiveOrbFadeIn(dissolve: DissolveInfo, orbIndex: number): number {
  if (orbIndex === dissolve.activeSection) return -1; // active orb uses particle reformation
  const start = dissolve.orbReformStart[orbIndex];
  if (start < 0) return 0;
  return Math.min(1, (dissolve.elapsed - start) / 0.3);
}

/** How many card groups have shattered (for hiding DOM cards). */
export function getShatteredCardCount(elapsed: number, totalCards: number): number {
  let count = 0;
  for (let i = 0; i < totalCards; i++) {
    // Card is "gone" 60ms after its shatter starts
    if (elapsed >= getCardShatterTime(i) + 0.06) {
      count++;
    }
  }
  return Math.min(count, totalCards);
}

/** Whether orbs should be rendered during dissolve (Phase 3 only). */
export function shouldRenderOrbsDuringDissolve(dissolve: DissolveInfo): boolean {
  // Show orbs once Phase 3 starts + small buffer for flash buildup
  return dissolve.elapsed >= PHASE2_END + 0.05;
}
