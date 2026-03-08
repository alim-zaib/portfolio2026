import { useRef } from "react";
import type { AppState } from "../types/index.ts";
import styles from "../styles/hud.module.css";

interface HUDProps {
  appState: AppState;
}

function HUD({ appState }: HUDProps): React.JSX.Element {
  // Once the user hovers an orb, the idle prompt never returns
  const hasHoveredRef = useRef(false);
  if (appState === "hovering") {
    hasHoveredRef.current = true;
  }

  const isViewing = appState === "viewing" || appState === "warping_in" || appState === "warping_out";
  const showPrompt = !isViewing;

  let promptText = "";
  if (appState === "idle" && !hasHoveredRef.current) {
    promptText = "Approach an orb";
  } else if (appState === "hovering") {
    promptText = "Click to explore";
  }

  return (
    <div className={styles.hud}>
      <div className={`${styles.identity} ${isViewing ? styles.identityHidden : ""}`}>
        <div className={styles.name}>Alim Zaib</div>
        <div className={styles.tagline}></div>
      </div>

      <div
        className={`${styles.prompt} ${!showPrompt || !promptText ? styles.promptHidden : ""}`}
      >
        {promptText || "\u00A0"}
      </div>

      <div className={styles.socials}>
        <a
          className={styles.socialLink}
          href="https://github.com/alim-zaib"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          className={styles.socialLink}
          href="https://www.linkedin.com/in/alim-zaib/"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          className={styles.socialLink}
          href="mailto:alimtwiz@gmail.com"
        >
          Email
        </a>
      </div>
    </div>
  );
}

export default HUD;
