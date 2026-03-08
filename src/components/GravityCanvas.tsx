import { useRef, useCallback, useEffect, useState } from "react";
import { useViewport } from "../hooks/useViewport.ts";
import { useMousePosition } from "../hooks/useMousePosition.ts";
import { useAnimationLoop } from "../hooks/useAnimationLoop.ts";
import { useReducedMotion } from "../hooks/useReducedMotion.ts";
import { createStars, createOrbs, repositionOrbs, createGlowDust, createOrbitalParticles } from "../engine/particles.ts";
import { renderStars } from "../engine/renderer.ts";
import { renderOrbs, renderOrbitalParticles, renderCursorHalo, renderRingPulses } from "../engine/orbRenderer.ts";
import { updateOrbPhysics, updateOrbitalPhysics } from "../engine/physics.ts";
import { WARP_DURATION, updateWarpParticles, renderWarpStars, renderWarpOrb, renderWarpFlash, shouldRenderOrbs } from "../engine/warp.ts";
import { createConstellations, renderConstellations } from "../engine/constellations.ts";
import {
  createDissolveParticles,
  updateDissolveAnimation,
  renderDissolveParticles,
  renderOrbReformationFlash,
  getShatteredCardCount,
  shouldRenderOrbsDuringDissolve,
  getInactiveOrbFadeIn,
} from "../engine/dissolve.ts";
import type { ConstellationSet } from "../engine/constellations.ts";
import { SECTIONS } from "../data/portfolio.ts";
import type { Star, Orb, GlowDust, OrbitalParticle, RingPulse, WarpInfo, DissolveInfo, AppState } from "../types/index.ts";

const RING_DURATION = 0.8;
const FADE_DURATION = 0.4; // reduced-motion instant fade (seconds)

interface GravityCanvasProps {
  appState: AppState;
  activeSection: number;
  onAppStateChange: (state: AppState) => void;
  onActiveSectionChange: (index: number) => void;
  onShatteredCountChange: (count: number) => void;
}

function GravityCanvas({
  appState,
  activeSection,
  onAppStateChange,
  onActiveSectionChange,
  onShatteredCountChange,
}: GravityCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const orbsRef = useRef<Orb[]>([]);
  const dustRef = useRef<GlowDust[][]>([]);
  const orbitalsRef = useRef<OrbitalParticle[]>([]);
  const ringsRef = useRef<RingPulse[]>([]);
  const constellationsRef = useRef<ConstellationSet | null>(null);
  const warpRef = useRef<WarpInfo | null>(null);
  const dissolveRef = useRef<DissolveInfo | null>(null);
  const fadeRef = useRef<number>(0); // reduced-motion fade progress 0→1
  const lastShatteredRef = useRef<number>(0);
  const { width, height, dpr } = useViewport();
  const mouse = useMousePosition();
  const reducedMotion = useReducedMotion();

  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
  const [buttonPositions, setButtonPositions] = useState<{ x: number; y: number; r: number }[]>([]);

  const appStateRef = useRef(appState);
  appStateRef.current = appState;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // Recreate particles when reducedMotion changes
  useEffect(() => {
    starsRef.current = createStars(width, height, reducedMotion);
    constellationsRef.current = createConstellations(width, height);

    if (orbsRef.current.length === 0) {
      orbsRef.current = createOrbs(SECTIONS, width, height);
      dustRef.current = orbsRef.current.map(orb => createGlowDust(orb.baseRadius, reducedMotion));
      orbitalsRef.current = createOrbitalParticles(orbsRef.current.length, reducedMotion);
    } else {
      repositionOrbs(orbsRef.current, width, height);
    }
  }, [width, height, reducedMotion]);

  const lastButtonUpdate = useRef(0);

  const handleOrbClick = useCallback((index: number) => {
    const state = appStateRef.current;
    if (state !== "idle" && state !== "hovering") return;

    const orb = orbsRef.current[index];
    if (reducedMotionRef.current) {
      // Instant fade instead of warp
      fadeRef.current = 0;
    }
    warpRef.current = {
      orbIndex: index,
      elapsed: 0,
      originX: orb.x,
      originY: orb.y,
    };
    onAppStateChange("warping_in");
    onActiveSectionChange(index);
  }, [onAppStateChange, onActiveSectionChange]);

  // Trigger dissolve when appState changes to warping_out (back button)
  useEffect(() => {
    if (appState === "warping_out" && !dissolveRef.current) {
      if (reducedMotion) {
        // Reduced motion: use existing fade mechanism (only init once)
        if (!warpRef.current) {
          fadeRef.current = 0;
          const orb = orbsRef.current[activeSection];
          if (orb) {
            warpRef.current = {
              orbIndex: activeSection,
              elapsed: 0,
              originX: orb.baseX,
              originY: orb.baseY,
            };
          }
        }
        return;
      }

      // Clear stale warp from warp-in (it's never nulled when warping_in → viewing)
      warpRef.current = null;

      // Capture card rects from the DOM
      const cardEls = Array.from(document.querySelectorAll("[data-dissolve-card]"));
      const titleEl = document.querySelector("[data-dissolve-title]");

      // Build rects in shatter order: bottom card first, then upward, title last
      const shatterOrder = [...cardEls].reverse();
      if (titleEl) shatterOrder.push(titleEl);

      const rects = shatterOrder.map(el => {
        const rect = el.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });

      if (rects.length > 0 && orbsRef.current.length > 0) {
        const orb = orbsRef.current[activeSection];
        dissolveRef.current = createDissolveParticles(
          rects,
          orb.section.color,
          orbsRef.current,
          activeSection,
        );
        lastShatteredRef.current = 0;

        // Snap orbs to base positions (they may be displaced from warp-in)
        for (const o of orbsRef.current) {
          o.x = o.baseX;
          o.y = o.baseY;
          o.vx = 0;
          o.vy = 0;
          o.isHovered = false;
          o.glowIntensity = 0;
          o.radius = o.baseRadius;
        }

        // Reset orbital particles with proper initial positions
        orbitalsRef.current = createOrbitalParticles(orbsRef.current.length, reducedMotion);
        for (const p of orbitalsRef.current) {
          const parentOrb = orbsRef.current[p.parentIndex];
          const orbX = Math.cos(p.angle) * p.radius;
          const orbY = Math.sin(p.angle) * p.radius;
          p.x = parentOrb.x + orbX;
          p.y = parentOrb.y + orbY;
          for (const t of p.trail) {
            t.x = p.x;
            t.y = p.y;
          }
        }
      }
    }
  }, [appState, activeSection, reducedMotion]);

  // Keyboard: Escape to go back
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape" && appStateRef.current === "viewing") {
        onAppStateChange("warping_out");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onAppStateChange]);

  const render = useCallback(
    (dt: number, elapsed: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width * dpr, height * dpr);
      ctx.scale(dpr, dpr);

      const mx = mouse.current.x;
      const my = mouse.current.y;
      const state = appStateRef.current;
      const rm = reducedMotionRef.current;
      const isWarping = state === "warping_in" || state === "warping_out";
      const isViewing = state === "viewing";
      const warp = warpRef.current;
      const dissolve = dissolveRef.current;

      // --- Reduced motion: simple fade transition ---
      if (rm && isWarping && warp) {
        fadeRef.current += dt / FADE_DURATION;
        if (fadeRef.current >= 1) {
          fadeRef.current = 1;
          if (state === "warping_in") {
            onAppStateChange("viewing");
          } else {
            warpRef.current = null;
            onAppStateChange("idle");
            onActiveSectionChange(-1);
          }
        }

        // Render stars normally
        renderStars(ctx, starsRef.current, elapsed, mx, my, width, height, null, rm);
        if (constellationsRef.current) {
          renderConstellations(ctx, constellationsRef.current, elapsed, mx, my, width, height, false, rm);
        }

        // Fade overlay
        const fadeAlpha = state === "warping_in" ? fadeRef.current : 1 - fadeRef.current;
        if (fadeAlpha < 1) {
          renderOrbs(ctx, orbsRef.current, elapsed, dustRef.current, rm);
          renderOrbitalParticles(ctx, orbitalsRef.current, orbsRef.current);
        }
        ctx.fillStyle = `rgba(5, 5, 16, ${fadeAlpha * 0.7})`;
        ctx.fillRect(0, 0, width, height);
        return;
      }

      // --- Dissolve exit animation (non-reduced-motion warping_out) ---
      if (!rm && state === "warping_out" && dissolve) {
        const complete = updateDissolveAnimation(dissolve, dt, orbsRef.current);

        // Update shattered card count for DOM hiding
        const newShattered = getShatteredCardCount(dissolve.elapsed, dissolve.cardCount);
        if (newShattered !== lastShatteredRef.current) {
          lastShatteredRef.current = newShattered;
          onShatteredCountChange(newShattered);
        }

        if (complete) {
          dissolveRef.current = null;
          lastShatteredRef.current = 0;
          onAppStateChange("idle");
          onActiveSectionChange(-1);
          // Render one final idle frame
          renderStars(ctx, starsRef.current, elapsed, mx, my, width, height, null, rm);
          if (constellationsRef.current) {
            renderConstellations(ctx, constellationsRef.current, elapsed, mx, my, width, height, true, rm);
          }
          renderCursorHalo(ctx, mx, my, mouse.current.isTouch);
          renderOrbitalParticles(ctx, orbitalsRef.current, orbsRef.current);
          renderOrbs(ctx, orbsRef.current, elapsed, dustRef.current, rm);
          return;
        }

        // Render star field (visible throughout)
        renderStars(ctx, starsRef.current, elapsed, mx, my, width, height, null, rm);
        if (constellationsRef.current) {
          renderConstellations(ctx, constellationsRef.current, elapsed, mx, my, width, height, false, rm);
        }

        // Dark overlay: stays during Phase 1 (cards still on screen), fades during Phase 2
        const overlayFadeStart = 0.35;
        const overlayFadeDuration = 0.4;
        let overlayAlpha: number;
        if (dissolve.elapsed < overlayFadeStart) {
          overlayAlpha = 0.6;
        } else {
          const fadeT = Math.min(1, (dissolve.elapsed - overlayFadeStart) / overlayFadeDuration);
          overlayAlpha = 0.6 * (1 - fadeT);
        }
        if (overlayAlpha > 0.01) {
          ctx.fillStyle = `rgba(5, 5, 16, ${overlayAlpha})`;
          ctx.fillRect(0, 0, width, height);
        }

        // Render dissolve particles (the coloured dust cloud)
        renderDissolveParticles(ctx, dissolve);

        // Render orbs during Phase 3 (reformation)
        if (shouldRenderOrbsDuringDissolve(dissolve)) {
          const active = dissolve.activeSection;

          // Inactive orbs: simple 300ms glow-up fade-in
          for (let oi = 0; oi < orbsRef.current.length; oi++) {
            if (oi === active) continue;
            const fadeIn = getInactiveOrbFadeIn(dissolve, oi);
            if (fadeIn <= 0) continue;
            ctx.save();
            ctx.globalAlpha = fadeIn;
            renderOrbs(ctx, [orbsRef.current[oi]], elapsed, [dustRef.current[oi]], rm);
            const orbParticles = orbitalsRef.current.filter(p => p.parentIndex === oi);
            renderOrbitalParticles(ctx, orbParticles, orbsRef.current);
            ctx.restore();
          }

          // Active orb: appears after particle reformation flash
          if (dissolve.orbReformFlash[active] > 0) {
            renderOrbs(ctx, [orbsRef.current[active]], elapsed, [dustRef.current[active]], rm);
            const activeParticles = orbitalsRef.current.filter(p => p.parentIndex === active);
            renderOrbitalParticles(ctx, activeParticles, orbsRef.current);
          }
        }

        // Render reformation flash on active orb
        renderOrbReformationFlash(ctx, dissolve, orbsRef.current);

        return;
      }

      // --- Normal warp animation (warping_in only now, warping_out uses dissolve) ---
      if (!rm && isWarping && warp) {
        warp.elapsed += dt;

        if (state === "warping_in" && warp.elapsed >= WARP_DURATION) {
          warp.elapsed = WARP_DURATION;
          onAppStateChange("viewing");
        } else if (state === "warping_out" && warp.elapsed >= WARP_DURATION) {
          // Fallback for warping_out without dissolve (shouldn't happen normally)
          warp.elapsed = WARP_DURATION;
          warpRef.current = null;
          onAppStateChange("idle");
          onActiveSectionChange(-1);
        }
      }

      // Compute effective warp for reverse animation
      let effectiveWarp: WarpInfo | null = null;
      if (warp) {
        if (state === "warping_out") {
          effectiveWarp = {
            ...warp,
            elapsed: WARP_DURATION - warp.elapsed,
          };
        } else {
          effectiveWarp = warp;
        }
      }

      // Physics (only when not warping or viewing)
      if (!isWarping && !isViewing) {
        const newlyHovered = updateOrbPhysics(orbsRef.current, dt, mx, my);
        updateOrbitalPhysics(orbitalsRef.current, orbsRef.current, dt, mx, my);

        for (let i = 0; i < newlyHovered.length; i++) {
          const oi = newlyHovered[i];
          ringsRef.current.push({
            orbIndex: oi,
            progress: 0,
            startRadius: orbsRef.current[oi].radius,
          });
        }
      }

      // Warp particle collapse during Phase 1 of warp-in
      if (state === "warping_in" && effectiveWarp) {
        updateWarpParticles(orbitalsRef.current, orbsRef.current, effectiveWarp);
      }

      // Ring pulses
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        ringsRef.current[i].progress += dt / RING_DURATION;
        if (ringsRef.current[i].progress >= 1) {
          ringsRef.current.splice(i, 1);
        }
      }

      // Hover tracking (only in idle/hovering)
      if (!isWarping && !isViewing) {
        let currentHover = -1;
        for (let i = 0; i < orbsRef.current.length; i++) {
          if (orbsRef.current[i].isHovered) { currentHover = i; break; }
        }
        if (currentHover !== hoveredIndex) {
          setHoveredIndex(currentHover);
        }
        if (currentHover >= 0 && state === "idle") {
          onAppStateChange("hovering");
        } else if (currentHover < 0 && state === "hovering") {
          onAppStateChange("idle");
        }
      }

      // Throttled button position sync
      if (!isWarping && !isViewing && elapsed - lastButtonUpdate.current > 0.1) {
        lastButtonUpdate.current = elapsed;
        setButtonPositions(
          orbsRef.current.map(o => ({ x: o.x, y: o.y, r: o.baseRadius }))
        );
      }

      // --- Render ---
      const showOrbs = shouldRenderOrbs(effectiveWarp, isWarping || isViewing);

      renderStars(ctx, starsRef.current, elapsed, mx, my, width, height,
        isWarping ? effectiveWarp : null, rm);

      // Constellations: only cycle during idle/hovering
      if (constellationsRef.current) {
        const constellationActive = !isWarping && !isViewing;
        renderConstellations(ctx, constellationsRef.current, elapsed, mx, my, width, height, constellationActive, rm);
      }

      if (!isWarping && !isViewing) {
        renderCursorHalo(ctx, mx, my, mouse.current.isTouch);
      }

      if (showOrbs) {
        renderOrbitalParticles(ctx, orbitalsRef.current, orbsRef.current);
        renderOrbs(ctx, orbsRef.current, elapsed, dustRef.current, rm);
        renderRingPulses(ctx, ringsRef.current, orbsRef.current);
      }

      if (isWarping && effectiveWarp) {
        renderWarpStars(ctx, effectiveWarp, width, height);
        renderWarpOrb(ctx, effectiveWarp, orbsRef.current, width, height);
        renderWarpFlash(ctx, effectiveWarp, width, height);
      }

      if (isViewing) {
        ctx.fillStyle = "rgba(5, 5, 16, 0.6)";
        ctx.fillRect(0, 0, width, height);
      }
    },
    [width, height, dpr, mouse, hoveredIndex, onAppStateChange, onActiveSectionChange, onShatteredCountChange],
  );

  useAnimationLoop(render);

  const isInputDisabled = appState === "warping_in" || appState === "warping_out";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width, height }}>
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "block",
          cursor: hoveredIndex >= 0 && !isInputDisabled ? "pointer" : "default",
        }}
      />
      {!isInputDisabled && appState !== "viewing" && buttonPositions.map((pos, i) => (
        <button
          key={SECTIONS[i].id}
          aria-label={`View ${SECTIONS[i].label} section`}
          onClick={() => handleOrbClick(i)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOrbClick(i);
            }
          }}
          style={{
            position: "absolute",
            left: pos.x - pos.r,
            top: pos.y - pos.r,
            width: pos.r * 2,
            height: pos.r * 2,
            borderRadius: "50%",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            outline: "none",
            padding: 0,
          }}
          tabIndex={0}
        />
      ))}
    </div>
  );
}

export default GravityCanvas;
