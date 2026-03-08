import { useState, useCallback } from "react";
import GravityCanvas from "./components/GravityCanvas.tsx";
import SectionOverlay from "./components/SectionOverlay.tsx";
import HUD from "./components/HUD.tsx";
import { SECTIONS } from "./data/portfolio.ts";
import type { AppState } from "./types/index.ts";

function App(): React.JSX.Element {
  const [appState, setAppState] = useState<AppState>("idle");
  const [activeSection, setActiveSection] = useState<number>(-1);
  const [shatteredCount, setShatteredCount] = useState<number>(0);

  const handleBack = useCallback(() => {
    if (appState !== "viewing") return;
    setShatteredCount(0);
    setAppState("warping_out");
  }, [appState]);

  const handleShatteredCountChange = useCallback((count: number) => {
    setShatteredCount(count);
  }, []);

  const showOverlay = (appState === "viewing" || appState === "warping_out") && activeSection >= 0;

  return (
    <>
      <HUD appState={appState} />
      <GravityCanvas
        appState={appState}
        activeSection={activeSection}
        onAppStateChange={setAppState}
        onActiveSectionChange={setActiveSection}
        onShatteredCountChange={handleShatteredCountChange}
      />
      {showOverlay && (
        <SectionOverlay
          section={SECTIONS[activeSection]}
          onBack={handleBack}
          dissolving={appState === "warping_out"}
          shatteredCount={shatteredCount}
        />
      )}
    </>
  );
}

export default App;
