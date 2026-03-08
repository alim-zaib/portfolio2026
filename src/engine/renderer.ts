import type { Star, WarpInfo } from "../types/index.ts";

const PARALLAX_STRENGTH = 15;

/** Render the entire star field in a single pass.
 *  When warp is provided, stars stretch into radial lines from the warp origin. */
export function renderStars(
  ctx: CanvasRenderingContext2D,
  stars: readonly Star[],
  elapsed: number,
  mouseX: number,
  mouseY: number,
  viewWidth: number,
  viewHeight: number,
  warp?: WarpInfo | null,
  reducedMotion = false,
): void {
  // Mouse offset from centre, normalised to -1..1
  const mx = (mouseX - viewWidth / 2) / (viewWidth / 2);
  const my = (mouseY - viewHeight / 2) / (viewHeight / 2);

  // Warp star-stretch params (disabled in reduced motion)
  const isStretching = !reducedMotion && warp != null && warp.elapsed > 0.1 && warp.elapsed < 1.0;
  const stretchT = isStretching
    ? Math.min(1, (warp!.elapsed - 0.1) / 0.5)
    : 0;

  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];

    // Twinkle (disabled in reduced motion — constant brightness)
    const alpha = reducedMotion
      ? star.brightness * 0.7
      : star.brightness * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase)));

    // Parallax (disabled in reduced motion)
    let px = star.x;
    let py = star.y;
    if (!reducedMotion) {
      const parallax = (1 - star.depth) * PARALLAX_STRENGTH;
      px -= mx * parallax;
      py -= my * parallax;
    }

    if (isStretching) {
      const dx = px - warp!.originX;
      const dy = py - warp!.originY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const streakLen = stretchT * dist * 0.3 * (0.5 + star.depth * 0.5);

      const x1 = px;
      const y1 = py;
      const x2 = px + nx * streakLen;
      const y2 = py + ny * streakLen;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = star.radius * (1 + stretchT);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}
