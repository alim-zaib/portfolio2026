const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function getOuterHeight(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  return (
    element.getBoundingClientRect().height +
    Number.parseFloat(styles.marginTop) +
    Number.parseFloat(styles.marginBottom)
  );
}

if (!prefersReducedMotion) {
  for (const disclosure of document.querySelectorAll<HTMLDetailsElement>(
    ".experience-item",
  )) {
    const summary = disclosure.querySelector<HTMLElement>(
      ":scope > .experience-summary",
    );
    const content = disclosure.querySelector<HTMLElement>(
      ":scope > .experience-details",
    );

    if (!summary || !content) continue;

    let targetOpen = disclosure.open;
    let heightAnimation: Animation | null = null;
    let contentAnimation: Animation | null = null;

    const finish = (open: boolean, animation: Animation) => {
      if (heightAnimation !== animation || targetOpen !== open) return;

      disclosure.open = open;
      disclosure.classList.remove("is-closing");
      disclosure.style.removeProperty("height");
      disclosure.style.removeProperty("overflow");
      heightAnimation = null;
      contentAnimation?.cancel();
      contentAnimation = null;
    };

    const animate = (open: boolean) => {
      const currentHeight = disclosure.getBoundingClientRect().height;
      const currentOpacity = disclosure.open
        ? Number.parseFloat(window.getComputedStyle(content).opacity)
        : 0;
      heightAnimation?.cancel();
      contentAnimation?.cancel();

      disclosure.style.height = `${currentHeight}px`;
      disclosure.style.overflow = "hidden";
      disclosure.classList.toggle("is-closing", !open);

      if (open) disclosure.open = true;

      const collapsedHeight = getOuterHeight(summary);
      const expandedHeight = collapsedHeight + getOuterHeight(content);
      const endHeight = open ? expandedHeight : collapsedHeight;
      const duration = open ? 260 : 190;
      const easing = open
        ? "cubic-bezier(0.22, 1, 0.36, 1)"
        : "cubic-bezier(0.4, 0, 0.2, 1)";

      const animation = disclosure.animate(
        { height: [`${currentHeight}px`, `${endHeight}px`] },
        { duration, easing },
      );
      heightAnimation = animation;

      contentAnimation = content.animate(
        { opacity: [currentOpacity, open ? 1 : 0] },
        {
          duration: open ? 190 : 120,
          delay: open ? 35 : 0,
          easing,
          fill: "both",
        },
      );

      animation.addEventListener("finish", () => finish(open, animation), {
        once: true,
      });
    };

    summary.addEventListener("click", (event) => {
      event.preventDefault();
      targetOpen = !targetOpen;
      animate(targetOpen);
    });
  }
}
