# Metal Slug PWA — Overview

## Pitch

Browser-based 2.5D side-scrolling run-and-gun game in the spirit of Metal Slug. Runs offline as a Progressive Web App. Stateless — no server, no database, no login. Anyone can open the URL and play immediately, like the Chrome dinosaur game.

## MVP Feature List

| Feature | In Scope |
|---------|----------|
| Player: move left/right, jump | ✓ |
| Player: shoot, throw grenade | ✓ |
| Enemy types: soldier, turret, drone | ✓ |
| End-of-stage boss with HP phases | ✓ |
| Score counter, lives (3 lives) | ✓ |
| 2 stages (linear progression, in-memory) | ✓ |
| High score persisted in `localStorage` | ✓ |
| Keyboard + touch virtual-button controls | ✓ |
| PWA: installable, offline play | ✓ |
| Vercel deployment | ✓ |

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| UI framework | Svelte 5 (runes) + SvelteKit | Menus, HUD, PWA shell |
| Game core | Plain TypeScript | No framework imports — `bun test`-able |
| 3D renderer | Three.js | Orthographic camera, procedural geometry |
| Build/bundler | Vite (via SvelteKit) | HMR dev, optimized prod build |
| Package manager | Bun | Also runs `bun test` for game core |
| PWA plugin | `@vite-pwa/sveltekit` | Workbox precache, manifest injection |
| Deploy | Vercel + `@sveltejs/adapter-vercel` | Static/prerendered output |

## Non-Goals

- No backend server, database, or API
- No WebSockets or real-time multiplayer
- No user sessions, accounts, or auth
- No copyrighted Metal Slug assets (sprites, audio) — all assets procedural geometry + colors
- No GLTF/OBJ model loading pipeline in MVP
- No ECS (entity-component system) — flat entity array is sufficient at this scale

## Glossary

| Term | Meaning |
|------|---------|
| **Entity** | A game object (player, enemy, bullet, boss) with position, velocity, update logic, and a Three.js mesh |
| **Action map** | Unified input abstraction `{left, right, jump, shoot, grenade}` fed by keyboard or touch adapters |
| **Fixed timestep** | Simulation ticks at a constant rate (60 Hz) regardless of frame rate; avoids physics jitter |
| **App shell** | The minimal HTML/JS/CSS bundle precached by the service worker for instant offline load |
| **Parallax layer** | Background layer that scrolls slower than the camera, creating depth illusion |
| **Runes store** | Svelte 5 `$state` variables in `state.svelte.ts` that bridge game-core values to HUD components |
| **Stage config** | TypeScript data file describing terrain, spawn points, boss trigger, and end gate for one stage |
| **World units** | Consistent spatial unit used across stage data, collision math, and Three.js scene — 1 unit = ~1 meter |

## Doc Index & Reading Order

| Order | File | Read When |
|-------|------|-----------|
| 1 | `00-overview.md` (this file) | Start here |
| 2 | `01-architecture.md` | Before touching any code |
| 3 | `02-game-loop.md` | When implementing the loop or state machine |
| 4 | `03-game-systems.md` | When implementing entities, collision, input, boss |
| 5 | `04-rendering.md` | When implementing the Three.js render layer |
| 6 | `05-stage-data.md` | When authoring or modifying stage configs |
| 7 | `06-pwa-deploy.md` | When setting up PWA or deploying |
| 8 | `07-testing-tdd.md` | Before writing any game-core code |

## Known Conflict: CLAUDE.md

The current `CLAUDE.md` (root) is the stock `bun init` template. It instructs using `Bun.serve()` + HTML imports instead of Vite, and React instead of Svelte. **This must be rewritten before scaffolding begins.** The updated `CLAUDE.md` should state:

- Bun = package manager (`bun install`, `bun test`) and test runner only
- Vite + SvelteKit own the dev server, bundler, and HMR
- `bun run dev` / `bun run build` delegate to SvelteKit scripts
