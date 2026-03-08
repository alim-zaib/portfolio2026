import { useEffect, useRef } from "react";

interface MouseInfo {
  x: number;
  y: number;
  isTouch: boolean;
}

const SMOOTHING = 0.15;

/** Tracks mouse/touch position with exponential smoothing. */
export function useMousePosition(): React.RefObject<MouseInfo> {
  const raw = useRef<MouseInfo>({ x: 0, y: 0, isTouch: false });
  const smoothed = useRef<MouseInfo>({ x: 0, y: 0, isTouch: false });

  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      raw.current.x = e.clientX;
      raw.current.y = e.clientY;
      raw.current.isTouch = false;
    }

    function onTouchMove(e: TouchEvent): void {
      const touch = e.touches[0];
      if (!touch) return;
      raw.current.x = touch.clientX;
      raw.current.y = touch.clientY;
      raw.current.isTouch = true;
    }

    function onTouchStart(e: TouchEvent): void {
      const touch = e.touches[0];
      if (!touch) return;
      raw.current.x = touch.clientX;
      raw.current.y = touch.clientY;
      raw.current.isTouch = true;
      // Snap smoothed position on first touch so there's no lag
      smoothed.current.x = touch.clientX;
      smoothed.current.y = touch.clientY;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  // The animation loop reads raw and writes smoothed each frame via tick()
  // We expose smoothed as the public ref, and attach tick as a method consumers
  // can call per-frame. To keep the hook simple, we do the smoothing externally:
  // the animation loop should call tickMouseSmoothing().

  // Actually, let's do the smoothing inside a rAF so it's self-contained.
  useEffect(() => {
    let frameId: number;

    function tick(): void {
      smoothed.current.x += (raw.current.x - smoothed.current.x) * SMOOTHING;
      smoothed.current.y += (raw.current.y - smoothed.current.y) * SMOOTHING;
      smoothed.current.isTouch = raw.current.isTouch;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return smoothed;
}
