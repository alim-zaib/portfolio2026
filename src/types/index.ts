export interface PortfolioSection {
  id: string;
  label: string;
  color: string;
  glow: string;
  icon: string;
  items: SectionItem[];
}

export interface SectionItem {
  title: string;
  subtitle: string;
  detail: string;
  link?: string;
}

export interface Orb {
  section: PortfolioSection;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  baseRadius: number;
  pulsePhase: number;
  isHovered: boolean;
  glowIntensity: number;
}

export interface OrbitalParticle {
  parentIndex: number;
  angle: number;
  radius: number;
  baseRadius: number;
  angularVelocity: number;
  size: number;
  alpha: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  /** Previous positions for trail rendering (newest first). */
  trail: { x: number; y: number }[];
}

export interface Star {
  x: number;
  y: number;
  radius: number;
  depth: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

/** Tiny dust mote that drifts in a circular path around an orb core. */
export interface GlowDust {
  orbitRadius: number;
  angle: number;
  angularSpeed: number;
  size: number;
  alpha: number;
  phase: number;
}

/** Expanding ring triggered on hover start. */
export interface RingPulse {
  orbIndex: number;
  progress: number;
  startRadius: number;
}

/** Mutable warp animation state stored in a ref. */
export interface WarpInfo {
  orbIndex: number;
  elapsed: number;
  originX: number;
  originY: number;
}

/** A single particle spawned from a shattering content card. */
export interface DissolveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  r: number;
  g: number;
  b: number;
  /** Which orb this particle will gather toward in Phase 2–3. */
  targetOrbIndex: number;
  /** True once the particle has reached its target orb. */
  arrived: boolean;
  /** The card group this particle belongs to (for staggered spawn). */
  cardGroup: number;
}

/** Mutable dissolve animation state stored in a ref. */
export interface DissolveInfo {
  elapsed: number;
  particles: DissolveParticle[];
  activeSection: number;
  cardCount: number;
  /** Per-orb: elapsed time when reformation flash starts (-1 = not started). */
  orbReformStart: number[];
  /** Per-orb: flash progress 0→1. */
  orbReformFlash: number[];
  /** Elapsed time when every particle arrived (-1 = not yet). */
  allArrivedAt: number;
}

export type AppState = "idle" | "hovering" | "warping_in" | "viewing" | "warping_out";
