import type { PortfolioSection } from "../types/index.ts";
import styles from "../styles/overlay.module.css";

interface SectionOverlayProps {
  section: PortfolioSection;
  onBack: () => void;
  dissolving: boolean;
  shatteredCount: number;
}

function SectionOverlay({ section, onBack, dissolving, shatteredCount }: SectionOverlayProps): React.JSX.Element {
  const totalCards = section.items.length;
  // Shatter order: bottom card first (last in array), then upward, title last.
  // Card at DOM index i shatters at group = (totalCards - 1 - i).
  // Title shatters at group = totalCards.

  return (
    <div className={`${styles.overlay} ${dissolving ? styles.dissolving : ""}`}>
      <button
        className={styles.backButton}
        onClick={onBack}
        aria-label="Go back"
      >
        ← Back
      </button>

      <h1
        className={`${styles.sectionTitle} ${dissolving && shatteredCount <= totalCards ? styles.cardExiting : ""}`}
        style={{
          color: section.color,
          animationDelay: dissolving ? `${totalCards * 80}ms` : undefined,
          visibility: dissolving && shatteredCount > totalCards ? "hidden" : "visible",
        }}
        data-dissolve-title=""
      >
        {section.label}
      </h1>

      <div className={styles.cardGrid}>
        {section.items.map((item, i) => {
          // This card's shatter group index (bottom card = group 0)
          const shatterGroup = totalCards - 1 - i;
          const isShattered = dissolving && shatteredCount > shatterGroup;

          return (
            <div
              key={item.title}
              className={`${styles.card} ${dissolving && !isShattered ? styles.cardExiting : ""}`}
              style={{
                animationDelay: dissolving
                  ? `${shatterGroup * 80}ms`
                  : `${(i + 1) * 50}ms`,
                borderColor: undefined,
                visibility: isShattered ? "hidden" : "visible",
              }}
              onMouseEnter={dissolving ? undefined : (e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = section.color;
              }}
              onMouseLeave={dissolving ? undefined : (e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "";
              }}
              data-dissolve-card=""
            >
              <div className={styles.cardTitle}>{item.title}</div>
              <div className={styles.cardSubtitle}>{item.subtitle}</div>
              <div className={styles.cardDetail}>{item.detail}</div>
              {item.link && (
                <a
                  className={styles.cardLink}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: section.color }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: "-2px", marginRight: "6px" }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.63 7.63 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                  View Project
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SectionOverlay;
