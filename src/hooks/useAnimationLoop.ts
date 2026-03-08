import { useEffect, useRef } from "react";

type FrameCallback = (deltaTime: number, elapsed: number) => void;

/** Runs a requestAnimationFrame loop, providing delta time (seconds) and total elapsed time (seconds). */
export function useAnimationLoop(callback: FrameCallback): void {
  const callbackRef = useRef<FrameCallback>(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let frameId: number;
    let lastTime: number | null = null;
    let elapsed = 0;

    function tick(now: number): void {
      if (lastTime === null) {
        lastTime = now;
        frameId = requestAnimationFrame(tick);
        return;
      }

      // Delta in seconds, capped to avoid spiral-of-death on tab switch
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsed += dt;

      callbackRef.current(dt, elapsed);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);
}
