# Alim Zaib - Portfolio

[alimzaib.com](https://alimzaib.com)

A minimal personal portfolio built with Astro, including an AI assistant for
questions about my experience, skills and projects.

## Stack

- Astro
- TypeScript
- CSS
- Google Gemini Developer API
- Vercel

## Local development

```sh
npm install
npm run dev
```

To use the AI assistant locally, copy `.env.example` to `.env` and add a
[Gemini API key](https://aistudio.google.com/apikey):

```text
GEMINI_API_KEY=your_key_here
```

The key is read only by the server-side `/api/chat` route. The model can be
changed in `src/lib/ai-config.ts`.

## Deployment

Vercel deploys the `main` branch. `GEMINI_API_KEY` must be configured for the
Production and Preview environments.

The previous React portfolio is retained on the
`archive/original-portfolio` Git branch.
