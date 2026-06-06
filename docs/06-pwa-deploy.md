# PWA & Deployment

## PWA via @vite-pwa/sveltekit

Install:
```bash
bun add -d @vite-pwa/sveltekit vite-plugin-pwa
```

Configure in `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'prompt',   // show "update available" UI, don't auto-reload
      manifest: {
        name: 'Metal Slug PWA',
        short_name: 'MetalSlug',
        description: 'Run-and-gun side-scroller. Plays offline.',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
```

### Why `registerType: 'prompt'`

Auto-update (`autoUpdate`) silently reloads the game mid-session if a new version is deployed. For a game, this is disruptive. `prompt` shows a banner ("New version available — reload?") that the player can dismiss or act on. Implement the banner in `+layout.svelte` using the `useRegisterSW` hook from `virtual:pwa-register/svelte`.

## Offline Play

Because the game has **no backend API** and **all assets are procedural** (generated in JS/Three.js), the only files needed for a full offline session are the built JS, CSS, and HTML. Workbox precaching the `**/*.{js,css,html}` glob covers the complete app.

There is no runtime caching strategy needed — nothing is fetched at runtime. Once the service worker is installed and the shell is precached, the game runs fully offline forever (until a new version prompts update).

## Web App Manifest Notes

- `orientation: 'landscape'` — prevents portrait lock prompts on mobile for a side-scroller
- `display: 'standalone'` — hides browser chrome when installed; maximizes canvas area
- Icons must exist in `static/icons/`. Generate from a single source PNG using any icon generator (squoosh, pwa-asset-generator). At MVP, even a placeholder colored square suffices for installability.

## Vercel Deployment

### SvelteKit Config

```typescript
// svelte.config.ts
import adapter from '@sveltejs/adapter-vercel'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
}
```

### Game Route: Prerendered, No SSR

The game route (`src/routes/+page.svelte`) is a pure client-side canvas app. Disable SSR and enable prerendering:

```typescript
// src/routes/+page.ts
export const prerender = true
export const ssr = false
```

`prerender = true` tells SvelteKit to emit a static HTML shell at build time. `ssr = false` skips server-side rendering (Three.js and `window`/`document` would fail on the server anyway). Combined result: Vercel serves a static HTML file; the browser hydrates and runs the game client-side.

### Deploy Steps

```bash
# 1. Install dependencies
bun install

# 2. Build
bun run build   # delegates to vite build via SvelteKit

# 3. Deploy to Vercel (first time — link project)
bunx vercel

# 4. Subsequent deploys
bunx vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deploys on push to `main`. Vercel auto-detects SvelteKit via `@sveltejs/adapter-vercel`.

### Caching Headers Warning

Vercel's default long-cache headers (`Cache-Control: max-age=31536000`) are correct for hashed JS/CSS files but **must not apply to:**

- `/sw.js` — service worker must be served with `Cache-Control: no-cache` so browsers always check for updates
- `/manifest.webmanifest` — same; browsers cache manifests aggressively

Configure in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

## Install Prompt (Optional MVP Enhancement)

Add a native "Add to Home Screen" prompt using the `beforeinstallprompt` event in `+layout.svelte`. Display a small banner encouraging install. Not required for MVP but improves PWA completeness score.
