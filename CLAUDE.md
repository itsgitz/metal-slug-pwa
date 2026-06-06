# Metal Slug PWA — Claude Code Instructions

## Runtime & Package Manager

Bun is the **package manager and test runner only**. Vite + SvelteKit own bundling, dev server, and HMR.

- `bun install` — install dependencies
- `bun run dev` — start SvelteKit dev server (delegates to `vite dev`)
- `bun run build` — production build (delegates to `vite build`)
- `bun run preview` — preview production build
- `bun test` — run game-core unit tests
- `bunx <package> <command>` — instead of npx

Do NOT use `Bun.serve()`, `Bun.build()`, HTML imports, or `bun --hot`. Those patterns are incompatible with SvelteKit.

## Tech Stack

- **UI:** Svelte 5 (runes), SvelteKit, `@sveltejs/adapter-vercel`
- **Game core:** plain TypeScript — no Svelte/Three.js imports (keeps it `bun test`-able)
- **Renderer:** Three.js, orthographic camera, procedural geometry
- **PWA:** `@vite-pwa/sveltekit` (Workbox precache)
- **Deploy:** Vercel

## Testing

Game-core logic lives in `src/lib/game/`. Test with `bun test`. Tests are colocated (`*.test.ts` next to module).

```ts
import { test, expect } from "bun:test";

test("overlaps: entities sharing area", () => {
  expect(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
});
```

Three.js render layer and Svelte HUD are **not** unit-tested — verified visually.

## Key Constraints

- Game core (`src/lib/game/`) must never import from `svelte` — except `state.svelte.ts` (thin bridge only)
- Never mutate `$state` per frame inside the game loop — push to runes store on value change only
- All game assets are procedural Three.js primitives — no external sprites, GLTF, or copyrighted assets

## Docs

Full architecture, game systems, TDD strategy, and deploy guide: `docs/` directory. Read `docs/00-overview.md` first.
