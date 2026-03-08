import type { PortfolioSection } from "../types/index.ts";

export const SECTIONS: readonly PortfolioSection[] = [
  {
    id: "experience",
    label: "Experience",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.35)",
    icon: "\u25C8",
    items: [
      {
        title: "D&A Graduate",
        subtitle: "NatWest Group \u00B7 September 2025 \u2013 Present",
        detail:
          "Worked on an AI-powered customer onboarding platform, combining document processing, LLM-based reasoning, and real-time event streaming to automate verification workflows.",
      },
      {
        title: "Software Developer",
        subtitle: "IBM \u00B7 March 2025 \u2013 August 2025",
        detail:
          "Full-stack role working with Java, TypeScript and React, within IBM Event Automation.",
      },
    ],
  },
  {
    id: "education",
    label: "Education",
    color: "#c850ff",
    glow: "rgba(200, 80, 255, 0.35)",
    icon: "\u25B3",
    items: [
      {
        title: "BSc(Hons) Computer Science (Artificial Intelligence)",
        subtitle: "University of Manchester \u00B7 2021 \u2013 2024",
        detail:
          "Focused on Artificial Intelligence and Machine Learning.",
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    color: "#e0f0ff",
    glow: "rgba(200, 220, 255, 0.35)",
    icon: "\u2B21",
    items: [
      {
        title: "Minecraft GPT Mod",
        subtitle: "Java \u00B7 OpenAI API",
        detail:
          "A Minecraft mod integrating GPT models to create an AI assistant that enhances gameplay by providing real-time information, suggestions, and insights.",
        link: "https://github.com/alim-zaib/minecraft_gpt_assistant_mod",
      },
      {
        title: "Fungi",
        subtitle: "Java \u00B7 JUnit",
        detail:
          "A terminal-based version of the classic board game Fungi, developed using Java and tested with JUnit.",
        link: "https://github.com/alim-zaib/fungi",
      },
      {
        title: "Hex Game AI Bot",
        subtitle: "Python",
        detail:
          "An AI agent for the Hex board game, using minimax with alpha-beta pruning and Dijkstra-based heuristics for strategic move selection and performance optimisation.",
        link: "https://github.com/alim-zaib/hex_agent",
      },
      {
        title: "Spam Detector",
        subtitle: "Python \u00B7 Pandas \u00B7 NumPy \u00B7 Matplotlib",
        detail:
          "A Naive Bayes spam detector that classifies text messages as either spam or ham (non-spam).",
        link: "https://github.com/alim-zaib/spam_detector",
      },
    ],
  },
] as const;
