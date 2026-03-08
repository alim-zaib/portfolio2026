import type { Orb, GlowDust, OrbitalParticle, RingPulse } from "../types/index.ts";

/** Parse a hex colour like "#00f0ff" into [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Chromatic sub-palettes: [warm inner, deep outer, edge fringe]
const PALETTES: Record<string, [[number,number,number],[number,number,number],[number,number,number]]> = {
  experience: [[220, 240, 255], [10, 30, 80],  [0, 60, 90]],
  education:  [[230, 180, 255], [30, 10, 70],  [50, 10, 80]],
  projects:   [[240, 245, 255], [40, 55, 90],  [30, 50, 70]],
};

/** Render all orbs — Hubble-style: additive bloom, Airy rings, chromatic glow. */
export function renderOrbs(
  ctx: CanvasRenderingContext2D,
  orbs: readonly Orb[],
  elapsed: number,
  dustArrays: readonly (readonly GlowDust[])[],
  reducedMotion = false,
): void {
  for (let i = 0; i < orbs.length; i++) {
    const orb = orbs[i];
    const [r, g, b] = hexToRgb(orb.section.color);
    const pal = PALETTES[orb.section.id] ?? [[220,230,255],[20,30,60],[30,40,60]];
    const [inner, deep, edge] = pal;
    const br = Math.min(255, r + 80);
    const bg = Math.min(255, g + 80);
    const bb = Math.min(255, b + 80);

    const pulse = reducedMotion ? 1 : 1 + 0.08 * Math.sin(elapsed * 1.2 + orb.pulsePhase);
    const gi = orb.glowIntensity;
    const glowMul = 1 + gi * 0.4;
    const coreR = orb.radius * 0.3;
    const glowR = orb.radius * 2.2 * pulse * (1 + gi * 0.3);
    const noise = reducedMotion ? 1 : 0.92 + 0.08 * Math.sin(elapsed * 7.3 + orb.pulsePhase * 3.1);

    ctx.save();

    // =========================================
    // ADDITIVE LAYERS — real light accumulation
    // =========================================
    ctx.globalCompositeOperation = "lighter";

    // --- Bloom pass: wide, soft white glow (simulates CCD bloom) ---
    const bloomR = glowR * 1.1;
    const bloom = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, bloomR);
    bloom.addColorStop(0, `rgba(255, 255, 255, ${0.12 * noise * glowMul})`);
    bloom.addColorStop(0.15, `rgba(${inner[0]}, ${inner[1]}, ${inner[2]}, ${0.06 * noise * glowMul})`);
    bloom.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${0.02 * noise * glowMul})`);
    bloom.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, bloomR, 0, Math.PI * 2);
    ctx.fill();

    // --- Chromatic outer glow (deep colour, offset and drifting) ---
    const outerOff = 1.5 * Math.sin(elapsed * 0.13 + orb.pulsePhase);
    const outerGrad = ctx.createRadialGradient(
      orb.x + outerOff, orb.y + outerOff, orb.radius * 0.4,
      orb.x + outerOff, orb.y + outerOff, glowR,
    );
    outerGrad.addColorStop(0, `rgba(${deep[0]}, ${deep[1]}, ${deep[2]}, ${0.1 * noise * glowMul})`);
    outerGrad.addColorStop(0.5, `rgba(${deep[0]}, ${deep[1]}, ${deep[2]}, ${0.03 * noise * glowMul})`);
    outerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(orb.x + outerOff, orb.y + outerOff, glowR, 0, Math.PI * 2);
    ctx.fill();

    // --- Primary accent mid glow (offset opposite) ---
    const midOff = -1 * Math.sin(elapsed * 0.17 + orb.pulsePhase + 1);
    const midR = orb.radius * 1.5 * pulse;
    const mid = ctx.createRadialGradient(
      orb.x + midOff, orb.y - midOff, coreR * 0.5,
      orb.x + midOff, orb.y - midOff, midR,
    );
    mid.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.25 * noise * glowMul})`);
    mid.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.08 * noise * glowMul})`);
    mid.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.arc(orb.x + midOff, orb.y - midOff, midR, 0, Math.PI * 2);
    ctx.fill();

    // --- Warm-white inner glow ---
    const hotR = orb.radius * 0.75;
    const hot = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, hotR);
    hot.addColorStop(0, `rgba(${inner[0]}, ${inner[1]}, ${inner[2]}, 0.35)`);
    hot.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.15)`);
    hot.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = hot;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, hotR, 0, Math.PI * 2);
    ctx.fill();

    // --- White-hot stellar core (blown-out centre) ---
    const core = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, coreR);
    core.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    core.addColorStop(0.2, "rgba(255, 255, 255, 0.7)");
    core.addColorStop(0.45, `rgba(${br}, ${bg}, ${bb}, 0.4)`);
    core.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, 0.15)`);
    core.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, coreR, 0, Math.PI * 2);
    ctx.fill();

    // --- Airy diffraction rings (concentric, faint) ---
    const airyRadii = [coreR * 1.6, coreR * 2.3, coreR * 3.2];
    const airyAlphas = [0.08, 0.04, 0.02];
    for (let a = 0; a < airyRadii.length; a++) {
      const ar = airyRadii[a] * pulse;
      const aa = airyAlphas[a] * noise;
      const ring = ctx.createRadialGradient(orb.x, orb.y, ar - 1.5, orb.x, orb.y, ar + 1.5);
      ring.addColorStop(0, "rgba(0, 0, 0, 0)");
      ring.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${aa})`);
      ring.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${aa})`);
      ring.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, ar + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Diffraction spikes (8-pointed, rotating) ---
    const spikeLen = coreR * 2.5;
    const spikeRot = reducedMotion ? orb.pulsePhase : elapsed * (Math.PI * 2 / 25) + orb.pulsePhase;

    for (let s = 0; s < 8; s++) {
      const angle = spikeRot + (s * Math.PI) / 4;
      const isPrimary = s % 2 === 0;
      const len = isPrimary ? spikeLen : spikeLen * 0.65;
      const spikePulse = 0.7 + 0.3 * Math.sin(elapsed * 1.8 + s * 1.1 + orb.pulsePhase);
      const alpha = (isPrimary ? 0.3 : 0.12) * spikePulse * noise;

      const tipX = orb.x + Math.cos(angle) * len;
      const tipY = orb.y + Math.sin(angle) * len;

      const grad = ctx.createLinearGradient(orb.x, orb.y, tipX, tipY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
      grad.addColorStop(0.2, `rgba(${br}, ${bg}, ${bb}, ${alpha})`);
      grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = isPrimary ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(orb.x, orb.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }

    // =========================================
    // NORMAL COMPOSITE — subtractive/overlay fx
    // =========================================
    ctx.globalCompositeOperation = "source-over";

    // --- Dark ring (brightness dip — Airy null zone) ---
    const darkRingR = coreR * 1.8;
    const darkRing = ctx.createRadialGradient(orb.x, orb.y, coreR * 1.05, orb.x, orb.y, darkRingR);
    darkRing.addColorStop(0, "rgba(5, 5, 16, 0)");
    darkRing.addColorStop(0.3, "rgba(5, 5, 16, 0.1)");
    darkRing.addColorStop(0.6, "rgba(5, 5, 16, 0.06)");
    darkRing.addColorStop(1, "rgba(5, 5, 16, 0)");
    ctx.fillStyle = darkRing;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, darkRingR, 0, Math.PI * 2);
    ctx.fill();

    // --- Outer colour-fringe bleed ---
    const fringeOuter = glowR * 1.15;
    const fringeGrad = ctx.createRadialGradient(orb.x, orb.y, glowR * 0.75, orb.x, orb.y, fringeOuter);
    fringeGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
    fringeGrad.addColorStop(0.5, `rgba(${edge[0]}, ${edge[1]}, ${edge[2]}, ${0.03 * noise})`);
    fringeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = fringeGrad;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, fringeOuter, 0, Math.PI * 2);
    ctx.fill();

    // --- Micro particle dust ---
    const dust = dustArrays[i];
    if (dust) {
      for (let d = 0; d < dust.length; d++) {
        const mote = dust[d];
        const ma = mote.angle + elapsed * mote.angularSpeed;
        const wobble = 1 + 0.15 * Math.sin(elapsed * 1.5 + mote.phase);
        const dr = mote.orbitRadius * wobble;
        const dx = orb.x + Math.cos(ma) * dr;
        const dy = orb.y + Math.sin(ma) * dr;
        const moteAlpha = mote.alpha * (0.6 + 0.4 * Math.sin(elapsed * 2.3 + mote.phase));
        ctx.globalAlpha = moteAlpha;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(dx, dy, mote.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // --- Label below orb (brightens to white on hover) ---
    const labelR = Math.round(136 + gi * (255 - 136));
    const labelG = Math.round(136 + gi * (255 - 136));
    const labelB = Math.round(170 + gi * (255 - 170));
    const labelA = 0.55 + gi * 0.45;
    ctx.fillStyle = `rgba(${labelR}, ${labelG}, ${labelB}, ${labelA})`;
    ctx.font = `500 ${Math.max(10, orb.radius * 0.32)}px "Space Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(orb.section.label, orb.x, orb.y + orb.radius + 12);

    ctx.restore();
  }
}

/** Render orbital particles with faint trails. */
export function renderOrbitalParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly OrbitalParticle[],
  orbs: readonly Orb[],
): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const orb = orbs[p.parentIndex];
    const [r, g, b] = hexToRgb(orb.section.color);

    // Draw trail (oldest to newest, fading out)
    for (let t = p.trail.length - 1; t >= 0; t--) {
      const trailAlpha = p.alpha * 0.3 * ((p.trail.length - t) / p.trail.length);
      const tp = p.trail[t];
      // Skip zero-position trails (not yet filled)
      if (tp.x === 0 && tp.y === 0) continue;
      ctx.globalAlpha = trailAlpha;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, p.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw particle
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

/** Render a subtle radial gradient at cursor position (gravity field indicator). */
export function renderCursorHalo(
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
  isTouch: boolean,
): void {
  if (isTouch) return; // hidden on touch devices per spec
  const radius = 300;
  const halo = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, radius);
  halo.addColorStop(0, "rgba(255, 255, 255, 0.03)");
  halo.addColorStop(0.5, "rgba(255, 255, 255, 0.01)");
  halo.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Render expanding ring pulses triggered by hover. */
export function renderRingPulses(
  ctx: CanvasRenderingContext2D,
  rings: readonly RingPulse[],
  orbs: readonly Orb[],
): void {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const orb = orbs[ring.orbIndex];
    const [r, g, b] = hexToRgb(orb.section.color);
    const t = ring.progress; // 0→1
    const radius = ring.startRadius + t * orb.baseRadius * 2;
    const alpha = 0.3 * (1 - t);

    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.lineWidth = 1.5 * (1 - t * 0.5);
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
