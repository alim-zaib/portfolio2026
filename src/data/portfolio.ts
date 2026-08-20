export const person = {
  name: "Alim Zaib",
  location: "United Kingdom",
  introduction:
    "I enjoy building thoughtful, useful software and understanding the systems behind it, with my current work focused on production-ready AI agents and multi-agent systems that automate complex workflows",
} as const;

export const experience = [
  {
    company: "NatWest Group",
    logo: "/logos/natwest-group.svg",
    role: "D&A Graduate (Machine Learning Engineer)",
    dates: "Sep 2025 - Present",
    description:
      "Built an AI-assisted customer onboarding platform combining document processing, LLM reasoning and real-time event streaming to automate application verification",
    descriptionLink: null,
    highlights: [
      "Refactored Python microservices around Pydantic models and integrated offline/online LLM evaluations, structured logging and Splunk alerting, while reducing evaluation and persistence time by ~76%",
      "Built the monitoring stage for a time-series forecasting pipeline, publishing weekly performance metrics to Comet MPM and supporting model evaluation in AWS SageMaker",
    ],
    detailPlaceholders: [],
  },
  {
    company: "IBM",
    logo: "/logos/ibm.svg",
    role: "Graduate Software Engineer",
    dates: "Mar 2025 - Aug 2025",
    description:
      "Built full-stack product features with Java, TypeScript and React for IBM Event Automation (Event endpoint management)",
    descriptionLink: {
      label: "IBM Event Automation (Event endpoint management)",
      href: "https://www.ibm.com/products/event-automation/event-endpoint-management",
    },
    highlights: [
      "Developed Java/Vert.x REST APIs for certificate management and collaborator access control, with validation and automated tests",
      "Prototyped a Node.js/Docker build pipeline to transform IBM documentation into structured in-product content for air-gapped deployments",
    ],
    detailPlaceholders: [],
  },
] as const;

export const education = {
  institution: "University of Manchester",
  logo: "/logos/university-of-manchester.png",
  qualification: "BSc(Hons) Computer Science (Artificial Intelligence)",
  dates: "2021 - 2024",
  focus: "Artificial Intelligence and Machine Learning",
} as const;

export const featuredProjects = [
  {
    title: "Minecraft GPT Mod",
    technologies: ["Java", "OpenAI API"],
    description:
      "An in-game AI assistant for real-time answers and suggestions",
    detail:
      "A Minecraft mod integrating GPT models to provide real-time gameplay information, suggestions and insights",
    href: "https://github.com/alim-zaib/minecraft_gpt_assistant_mod",
  },
  {
    title: "Hex Game AI",
    technologies: ["Python"],
    description:
      "A Hex agent using minimax, alpha-beta pruning and graph heuristics",
    detail:
      "An AI agent for the Hex board game using minimax with alpha-beta pruning and Dijkstra-based heuristics for move selection and performance optimisation",
    href: "https://github.com/alim-zaib/hex_agent",
  },
  {
    title: "Fungi",
    technologies: ["Java", "JUnit"],
    description:
      "A terminal version of the two-player board game, built in Java",
    detail:
      "A terminal-based version of the board game Fungi, developed in Java and tested with JUnit",
    href: "https://github.com/alim-zaib/fungi",
  },
] as const;

export const additionalProjects = [
  {
    title: "Spam Detector",
    technologies: ["Python", "Pandas", "NumPy", "Matplotlib"],
    detail:
      "A Naive Bayes classifier that categorises text messages as spam or ham",
    href: "https://github.com/alim-zaib/spam_detector",
  },
] as const;

export const contactLinks = {
  github: "https://github.com/alim-zaib",
  linkedin: "https://www.linkedin.com/in/alim-zaib/",
  email: "mailto:alimtwiz@gmail.com",
} as const;
