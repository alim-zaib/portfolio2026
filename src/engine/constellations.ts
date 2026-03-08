import { randomRange } from "./math.ts";
import type { Star } from "../types/index.ts";

// --- Letter definitions: [x, y] normalized, width is relative to height=1 ---

interface LetterDef {
  stars: [number, number][];
  lines: [number, number][];
  width: number;
}

const A: LetterDef = {
  stars: [[0, 1], [0.18, 0.5], [0.4, 0.02], [0.62, 0.5], [0.8, 1]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 3]],
  width: 0.8,
};

const L: LetterDef = {
  stars: [[0, 0], [0.02, 0.35], [0, 0.7], [0.03, 1], [0.5, 0.98]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  width: 0.5,
};

const I: LetterDef = {
  stars: [[0.05, 0], [0.03, 0.28], [0.06, 0.52], [0.04, 0.76], [0.05, 1]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  width: 0.1,
};

const M: LetterDef = {
  stars: [[0, 1], [0.05, 0], [0.42, 0.55], [0.78, 0.03], [0.85, 1]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  width: 0.85,
};

const Z: LetterDef = {
  stars: [[0, 0.02], [0.52, 0], [0.28, 0.48], [0.03, 0.97], [0.55, 1]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  width: 0.55,
};

const B: LetterDef = {
  stars: [[0, 0], [0.42, 0.18], [0.05, 0.48], [0.45, 0.78], [0.03, 1]],
  lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  width: 0.45,
};

const WORD_ALIM: LetterDef[] = [A, L, I, M];
const WORD_ZAIB: LetterDef[] = [Z, A, I, B];

// --- Cycle timing (seconds) ---
const REVEAL_DURATION = 8.5;
const COOLDOWN = 5.5;
const CYCLE_DURATION = REVEAL_DURATION + COOLDOWN; // ~14s

// Within a reveal window:
const T_STAR_BRIGHT = 1.0;
const T_LINE_IN = 1.5;
const T_HOLD_END = 5.5;
const T_LINE_OUT = 7.0;
// T_STAR_DIM = REVEAL_DURATION (8.5)

// --- Data structure for a built constellation ---
export interface ConstellationWord {
  stars: Star[];
  lines: [number, number][];
}

export interface ConstellationSet {
  words: [ConstellationWord, ConstellationWord];
}

/** Build constellation star positions for the current viewport. */
export function createConstellations(
  viewWidth: number,
  viewHeight: number,
): ConstellationSet {
  const letterH = viewHeight * 0.08;
  const spacing = letterH * 0.55;

  // Per-letter y jitter for organic feel (pre-seeded for stability)
  const jitterSeed = [3.5, -2.8, 4.6, -1.2, 2.1, -3.8, 1.5, -2.0];

  function buildWord(
    letters: LetterDef[],
    anchorX: number,
    anchorY: number,
    jitterOffset: number,
    rotationDeg: number,
  ): ConstellationWord {
    // Total word width
    let totalWidth = 0;
    for (let i = 0; i < letters.length; i++) {
      totalWidth += letters[i].width * letterH;
      if (i < letters.length - 1) totalWidth += spacing;
    }

    const allStars: Star[] = [];
    const allLines: [number, number][] = [];
    let cursorX = -totalWidth / 2; // relative to anchor
    let starOffset = 0;

    const rot = (rotationDeg * Math.PI) / 180;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    for (let li = 0; li < letters.length; li++) {
      const letter = letters[li];
      const lw = letter.width * letterH;
      const jy = jitterSeed[(li + jitterOffset) % jitterSeed.length];

      for (let si = 0; si < letter.stars.length; si++) {
        const [sx, sy] = letter.stars[si];
        // Position relative to anchor (before rotation)
        const rx = cursorX + sx * letterH;
        const ry = sy * letterH + jy;
        // Rotate around anchor
        const finalX = anchorX + rx * cosR - ry * sinR;
        const finalY = anchorY + rx * sinR + ry * cosR;

        allStars.push({
          x: finalX,
          y: finalY,
          radius: randomRange(0.3, 1.8),
          depth: randomRange(0.85, 1),
          brightness: randomRange(0.3, 1),
          twinkleSpeed: randomRange(0.3, 1.5),
          twinklePhase: randomRange(0, Math.PI * 2),
        });
      }

      for (const [a, b] of letter.lines) {
        allLines.push([a + starOffset, b + starOffset]);
      }

      starOffset += letter.stars.length;
      cursorX += lw + spacing;
    }

    return { stars: allStars, lines: allLines };
  }

  const word0 = buildWord(WORD_ALIM, viewWidth * 0.19, viewHeight * 0.18, 0, 15);
  const word1 = buildWord(WORD_ZAIB, viewWidth * 0.81, viewHeight * 0.80, 4, -14);

  return { words: [word0, word1] };
}

/** Compute reveal animation progress for both words simultaneously. Returns null during cooldown. */
function getRevealState(
  elapsed: number,
  isActive: boolean,
): { starMul: number; lineAlpha: number } | null {
  if (!isActive) return null;

  const localT = elapsed % CYCLE_DURATION;
  if (localT >= REVEAL_DURATION) return null; // cooldown

  // Star brightness multiplier: 1 = normal, peaks at ~1.4
  let starMul = 1;
  if (localT < T_STAR_BRIGHT) {
    starMul = 1 + 0.4 * (localT / T_STAR_BRIGHT);
  } else if (localT < T_LINE_OUT) {
    starMul = 1.4;
  } else {
    const dimT = (localT - T_LINE_OUT) / (REVEAL_DURATION - T_LINE_OUT);
    starMul = 1.4 - 0.4 * Math.min(1, dimT);
  }

  // Line alpha: 0 → 0.18 → 0.18 → 0
  let lineAlpha = 0;
  if (localT >= T_STAR_BRIGHT && localT < T_LINE_IN) {
    lineAlpha = 0.18 * ((localT - T_STAR_BRIGHT) / (T_LINE_IN - T_STAR_BRIGHT));
  } else if (localT >= T_LINE_IN && localT < T_HOLD_END) {
    lineAlpha = 0.18;
  } else if (localT >= T_HOLD_END && localT < T_LINE_OUT) {
    lineAlpha = 0.18 * (1 - (localT - T_HOLD_END) / (T_LINE_OUT - T_HOLD_END));
  }

  return { starMul, lineAlpha };
}

const PARALLAX_STRENGTH = 15;

/** Render constellation stars and lines. Call after renderStars. */
export function renderConstellations(
  ctx: CanvasRenderingContext2D,
  constellations: ConstellationSet,
  elapsed: number,
  mouseX: number,
  mouseY: number,
  viewWidth: number,
  viewHeight: number,
  isActive: boolean,
  reducedMotion: boolean,
): void {
  const reveal = getRevealState(elapsed, isActive);

  const mx = (mouseX - viewWidth / 2) / (viewWidth / 2);
  const my = (mouseY - viewHeight / 2) / (viewHeight / 2);

  // Render all constellation stars (they always look like normal stars)
  for (let wi = 0; wi < 2; wi++) {
    const word = constellations.words[wi];
    const isRevealing = reveal !== null;
    const brightMul = isRevealing ? reveal.starMul : 1;

    for (let si = 0; si < word.stars.length; si++) {
      const star = word.stars[si];

      const twinkle = reducedMotion
        ? star.brightness * 0.7
        : star.brightness * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(
            elapsed * star.twinkleSpeed + star.twinklePhase)));
      const alpha = Math.min(1, twinkle * brightMul);

      let px = star.x;
      let py = star.y;
      if (!reducedMotion) {
        const parallax = (1 - star.depth) * PARALLAX_STRENGTH;
        px -= mx * parallax;
        py -= my * parallax;
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw constellation lines during reveal
    if (isRevealing && reveal.lineAlpha > 0.001) {
      ctx.globalAlpha = reveal.lineAlpha;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.6;

      for (const [a, b] of word.lines) {
        const sa = word.stars[a];
        const sb = word.stars[b];
        let ax = sa.x, ay = sa.y, bx = sb.x, by = sb.y;
        if (!reducedMotion) {
          const pa = (1 - sa.depth) * PARALLAX_STRENGTH;
          const pb = (1 - sb.depth) * PARALLAX_STRENGTH;
          ax -= mx * pa; ay -= my * pa;
          bx -= mx * pb; by -= my * pb;
        }
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
}
