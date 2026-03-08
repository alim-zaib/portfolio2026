import type { Orb, OrbitalParticle } from "../types/index.ts";

const SPRING_STIFFNESS = 0.03;
const DAMPING = 0.85;
const CURSOR_INFLUENCE_RADIUS = 250;
const CURSOR_G = 800;
const CURSOR_MAX_FORCE = 1.5;
const REPULSION_STRENGTH = 5000;

/** Apply anchor spring, cursor gravity, and inter-orb repulsion.
 *  Returns indices of orbs that just started being hovered this frame. */
export function updateOrbPhysics(
  orbs: Orb[],
  dt: number,
  mouseX: number,
  mouseY: number,
): number[] {
  const newlyHovered: number[] = [];
  for (let i = 0; i < orbs.length; i++) {
    const orb = orbs[i];

    // --- Anchor spring ---
    const dxAnchor = orb.baseX - orb.x;
    const dyAnchor = orb.baseY - orb.y;
    orb.vx += dxAnchor * SPRING_STIFFNESS;
    orb.vy += dyAnchor * SPRING_STIFFNESS;

    // --- Cursor gravitational pull + hover detection ---
    const dxCursor = mouseX - orb.x;
    const dyCursor = mouseY - orb.y;
    const distCursorSq = dxCursor * dxCursor + dyCursor * dyCursor;
    const distCursor = Math.sqrt(distCursorSq);

    // Hover: cursor within orb radius (use baseRadius for consistent hit area)
    const wasHovered = orb.isHovered;
    orb.isHovered = distCursor < orb.baseRadius;
    if (orb.isHovered && !wasHovered) newlyHovered.push(i);

    // Lerp glowIntensity toward target (0 or 1) for smooth transitions
    const targetGlow = orb.isHovered ? 1 : 0;
    orb.glowIntensity += (targetGlow - orb.glowIntensity) * Math.min(1, dt * 6);

    // Lerp radius toward hover-scaled or base
    const targetRadius = orb.isHovered ? orb.baseRadius * 1.15 : orb.baseRadius;
    orb.radius += (targetRadius - orb.radius) * Math.min(1, dt * 6);

    if (distCursor < CURSOR_INFLUENCE_RADIUS && distCursor > 1) {
      const forceMag = Math.min(CURSOR_G / distCursorSq, CURSOR_MAX_FORCE);
      orb.vx += (dxCursor / distCursor) * forceMag;
      orb.vy += (dyCursor / distCursor) * forceMag;
    }

    // --- Inter-orb repulsion ---
    for (let j = i + 1; j < orbs.length; j++) {
      const other = orbs[j];
      const dxOrb = orb.x - other.x;
      const dyOrb = orb.y - other.y;
      const distOrbSq = dxOrb * dxOrb + dyOrb * dyOrb;
      const distOrb = Math.sqrt(distOrbSq);
      const minDist = (orb.baseRadius + other.baseRadius) * 2;

      if (distOrb < minDist && distOrb > 1) {
        const force = REPULSION_STRENGTH / distOrbSq;
        const nx = dxOrb / distOrb;
        const ny = dyOrb / distOrb;
        orb.vx += nx * force;
        orb.vy += ny * force;
        other.vx -= nx * force;
        other.vy -= ny * force;
      }
    }

    // --- Damping + integrate ---
    orb.vx *= DAMPING;
    orb.vy *= DAMPING;
    orb.x += orb.vx * (dt * 60); // normalise to ~60fps feel
    orb.y += orb.vy * (dt * 60);
  }

  return newlyHovered;
}

const ORBITAL_CURSOR_PUSH = 120;
const ORBITAL_CURSOR_RADIUS = 80;
const ORBITAL_SPRING_BACK = 3;

/** Update orbital particle positions: orbit, cursor disruption, spring-back. */
export function updateOrbitalPhysics(
  particles: OrbitalParticle[],
  orbs: readonly Orb[],
  dt: number,
  mouseX: number,
  mouseY: number,
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const orb = orbs[p.parentIndex];

    // Advance orbit angle
    p.angle += p.angularVelocity * dt;

    // Base orbital position (relative to orb centre)
    const orbX = Math.cos(p.angle) * p.radius;
    const orbY = Math.sin(p.angle) * p.radius;

    // Cursor disruption: push outward from cursor
    const worldX = orb.x + orbX + p.offsetX;
    const worldY = orb.y + orbY + p.offsetY;
    const dxC = worldX - mouseX;
    const dyC = worldY - mouseY;
    const distC = Math.sqrt(dxC * dxC + dyC * dyC);

    if (distC < ORBITAL_CURSOR_RADIUS && distC > 1) {
      const pushForce = (1 - distC / ORBITAL_CURSOR_RADIUS) * ORBITAL_CURSOR_PUSH;
      p.offsetX += (dxC / distC) * pushForce * dt;
      p.offsetY += (dyC / distC) * pushForce * dt;
    }

    // Spring offset back toward zero (~1 second return)
    p.offsetX += -p.offsetX * ORBITAL_SPRING_BACK * dt;
    p.offsetY += -p.offsetY * ORBITAL_SPRING_BACK * dt;

    // Shift trail (newest at index 0)
    for (let t = p.trail.length - 1; t > 0; t--) {
      p.trail[t].x = p.trail[t - 1].x;
      p.trail[t].y = p.trail[t - 1].y;
    }
    p.trail[0].x = p.x;
    p.trail[0].y = p.y;

    // Final world position
    p.x = orb.x + orbX + p.offsetX;
    p.y = orb.y + orbY + p.offsetY;

    // Keep radius from drifting (not needed, radius is constant, but clamp offset)
    const maxOffset = p.baseRadius * 0.8;
    const offMag = Math.sqrt(p.offsetX * p.offsetX + p.offsetY * p.offsetY);
    if (offMag > maxOffset) {
      const scale = maxOffset / offMag;
      p.offsetX *= scale;
      p.offsetY *= scale;
    }
  }
}
