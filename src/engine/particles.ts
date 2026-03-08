import { randomRange } from "./math.ts";
import type { Star, Orb, GlowDust, OrbitalParticle } from "../types/index.ts";
import type { PortfolioSection } from "../types/index.ts";

/** Calculate star count based on viewport area, clamped to 300–500. */
export function starCount(width: number, height: number): number {
  const area = width * height;
  const count = Math.floor(area / 4000);
  return Math.max(300, Math.min(500, count));
}

/** Create the initial star field, randomly distributed across the viewport. */
export function createStars(width: number, height: number, reducedMotion = false): Star[] {
  const count = reducedMotion ? Math.floor(starCount(width, height) / 2) : starCount(width, height);
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    stars.push({
      x: randomRange(0, width),
      y: randomRange(0, height),
      radius: randomRange(0.3, 1.8),
      depth: randomRange(0, 1),
      brightness: randomRange(0.3, 1),
      twinkleSpeed: randomRange(0.3, 1.5),
      twinklePhase: randomRange(0, Math.PI * 2),
    });
  }

  return stars;
}

/** Create orbs from sections, positioned in a triangular formation. */
export function createOrbs(
  sections: readonly PortfolioSection[],
  viewWidth: number,
  viewHeight: number,
): Orb[] {
  const cx = viewWidth / 2;
  const cy = viewHeight / 2;
  const minDim = Math.min(viewWidth, viewHeight);
  const isMobile = viewWidth < 768;
  const baseRadius = minDim * (isMobile ? 0.045 : 0.055);
  // Spread: distance from centre to each orb (tighter on mobile)
  const spread = minDim * (isMobile ? 0.14 : 0.18);

  // Triangle: top, bottom-left, bottom-right
  const angleOffset = -Math.PI / 2; // start from top
  return sections.map((section, i) => {
    const angle = angleOffset + (i * Math.PI * 2) / sections.length;
    const x = cx + Math.cos(angle) * spread;
    const y = cy + Math.sin(angle) * spread;
    return {
      section,
      x,
      y,
      vx: 0,
      vy: 0,
      baseX: x,
      baseY: y,
      radius: baseRadius,
      baseRadius,
      pulsePhase: randomRange(0, Math.PI * 2),
      isHovered: false,
      glowIntensity: 0,
    };
  });
}

const DUST_PER_ORB = 40;

/** Create micro dust particles for one orb's glow region. */
export function createGlowDust(orbRadius: number, reducedMotion = false): GlowDust[] {
  const dust: GlowDust[] = [];
  const count = reducedMotion ? Math.floor(DUST_PER_ORB / 2) : DUST_PER_ORB;
  for (let i = 0; i < count; i++) {
    dust.push({
      orbitRadius: randomRange(orbRadius * 0.15, orbRadius * 1.8),
      angle: randomRange(0, Math.PI * 2),
      angularSpeed: randomRange(0.05, 0.25) * (Math.random() > 0.5 ? 1 : -1),
      size: randomRange(0.4, 1),
      alpha: randomRange(0.05, 0.15),
      phase: randomRange(0, Math.PI * 2),
    });
  }
  return dust;
}

const TRAIL_LENGTH = 3;

/** Create orbital particles for all orbs. Pre-allocated, no per-frame creation. */
export function createOrbitalParticles(orbCount: number, reducedMotion = false): OrbitalParticle[] {
  const particles: OrbitalParticle[] = [];
  for (let oi = 0; oi < orbCount; oi++) {
    const count = reducedMotion
      ? Math.floor(randomRange(8, 13))
      : Math.floor(randomRange(15, 26));
    for (let p = 0; p < count; p++) {
      const baseRadius = randomRange(55, 105);
      particles.push({
        parentIndex: oi,
        angle: randomRange(0, Math.PI * 2),
        radius: baseRadius,
        baseRadius,
        angularVelocity: randomRange(0.3, 0.9) * (Math.random() > 0.5 ? 1 : -1),
        size: randomRange(0.8, 2.5),
        alpha: randomRange(0.3, 0.8),
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0,
        trail: Array.from({ length: TRAIL_LENGTH }, () => ({ x: 0, y: 0 })),
      });
    }
  }
  return particles;
}

/** Recalculate orb home positions after a resize (preserves velocity/phase). */
export function repositionOrbs(
  orbs: Orb[],
  viewWidth: number,
  viewHeight: number,
): void {
  const cx = viewWidth / 2;
  const cy = viewHeight / 2;
  const minDim = Math.min(viewWidth, viewHeight);
  const isMobile = viewWidth < 768;
  const baseRadius = minDim * (isMobile ? 0.045 : 0.055);
  const spread = minDim * (isMobile ? 0.14 : 0.18);
  const angleOffset = -Math.PI / 2;

  for (let i = 0; i < orbs.length; i++) {
    const angle = angleOffset + (i * Math.PI * 2) / orbs.length;
    orbs[i].baseX = cx + Math.cos(angle) * spread;
    orbs[i].baseY = cy + Math.sin(angle) * spread;
    orbs[i].baseRadius = baseRadius;
    orbs[i].radius = baseRadius;
  }
}
