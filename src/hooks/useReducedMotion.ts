import { useEffect, useState } from "react";

/** Returns true when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onChange(e: MediaQueryListEvent): void {
      setReduced(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
