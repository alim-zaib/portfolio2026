# Alim Zaib - Portfolio

A quiet, one-page portfolio built with Astro.

## Built with

- Astro
- TypeScript
- CSS
- Lucide and Font Awesome icons

## Local development

```sh
npm install
npm run dev
```

Create a production build with `npm run build`.

## AI portfolio assistant

The `/ai` page answers questions about Alim using a small, curated profile and
Google's Gemini Developer API. The API key is used only by the server-side
`/api/chat` route and is never included in browser JavaScript.

1. Create a Gemini Developer API key in
   [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env`.
3. Set the environment variable:

   ```text
   GEMINI_API_KEY=your_key_here
   ```

4. Run `npm run dev`, then open `http://localhost:4321/ai`.

The configured model is `gemini-3.6-flash`. Change `MODEL` in
`src/lib/ai-config.ts` to switch models later.

### Deployment

The AI endpoint needs server-side compute, which GitHub Pages does not provide.
The project uses Astro's Vercel adapter so the portfolio pages remain
prerendered while `/api/chat` runs as a serverless function.

To deploy:

1. Import this repository into Vercel as an Astro project.
2. Add `GEMINI_API_KEY` under the project's environment variables for
   Production and Preview.
3. Deploy the project, then attach `alimzaib.com` in Vercel and update the
   domain's DNS records as instructed by Vercel.

The endpoint includes conservative payload, history and output limits plus a
small in-memory per-IP rate limit. Because serverless instances do not share
memory, this is a best-effort guard rather than a global distributed limit. If
traffic grows, add a shared Vercel-compatible rate limiter such as a managed
Redis/KV store.

The previous React portfolio is retained on the
`archive/original-portfolio` Git branch.
