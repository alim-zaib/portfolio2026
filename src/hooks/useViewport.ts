import { useEffect, useState } from "react";

interface ViewportInfo {
  width: number;
  height: number;
  dpr: number;
}

/** Returns current viewport dimensions and capped device pixel ratio. */
export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio, 2),
  }));

  useEffect(() => {
    function handleResize(): void {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: Math.min(window.devicePixelRatio, 2),
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}
