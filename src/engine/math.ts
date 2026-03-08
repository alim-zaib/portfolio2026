/** 2D vector represented as a plain object for easy pooling/reuse. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Create a new Vec2. */
export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

/** Add two vectors, returning a new Vec2. */
export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract b from a, returning a new Vec2. */
export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a vector by a scalar. */
export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

/** Linear interpolation between a and b by factor t. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Euclidean distance between two points. */
export function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Distance squared (avoids sqrt when only comparing distances). */
export function distSq(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Normalize a vector to unit length. Returns zero vector if length is ~0. */
export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len < 1e-8) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Random float in [min, max). */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
