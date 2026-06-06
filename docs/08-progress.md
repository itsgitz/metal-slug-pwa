# Metal Slug PWA — Build Progress

## How to Run Locally

```bash
bun install        # first time only
bun run dev        # dev server at http://localhost:5173
bun run build      # production build → build/
bun run preview    # serve production build at http://localhost:4173
bun test           # run game-core unit tests
```

> **Node version note:** `bun run dev` and `bun run build` work on any Node version.
> `@sveltejs/adapter-vercel` requires Node ≤22 locally — we use `adapter-static` for now.
> Before Vercel deploy, swap back per `docs/06-pwa-deploy.md`.

---

## Implementation Status

### Phase 0 — Scaffold ✅
| Item | Status |
|------|--------|
| Feature branch `feat/mvp-scaffold` | ✅ |
| `package.json` (bun scripts, all deps) | ✅ |
| `vite.config.ts` (sveltekit + SvelteKitPWA) | ✅ |
| `svelte.config.js` (adapter-static) | ✅ |
| `tsconfig.json` (extends `.svelte-kit/tsconfig.json`) | ✅ |
| `src/app.html`, `src/app.d.ts` | ✅ |
| Stub `+page.svelte`, `+layout.svelte`, `+page.ts` | ✅ |
| `.gitignore` updated (.svelte-kit, build, .vercel) | ✅ |

### Phase 1 — Foundation ✅
| Item | Status |
|------|--------|
| `src/lib/game/types.ts` — Entity, World, ActionMap, Screen | ✅ |
| `src/lib/game/state.svelte.ts` — runes store bridge | ✅ |
| `src/lib/game/loop.ts` + `loop.test.ts` | ✅ 11 tests |

### Phase 2 — Systems ✅
| Item | Tests | Status |
|------|-------|--------|
| `systems/collision.ts` — overlaps, pairs, terrain, splash | 15 | ✅ |
| `systems/input.ts` — ActionMap, KeyboardAdapter, edge | 11 | ✅ |
| `systems/scoring.ts` — points, lives, hi-score localStorage | 13 | ✅ |
| `systems/boss-ai.ts` — 3-phase state machine | 7 | ✅ |
| `systems/spawning.ts` — camera-gated spawn trigger | 4 | ✅ |

### Phase 3 — Entities + Stages ✅
| Item | Status |
|------|--------|
| `entities/player.ts` — move/jump/shoot/grenade/invincibility | ✅ |
| `entities/enemies.ts` — soldier, turret, drone | ✅ |
| `entities/boss.ts` — 3-phase + slow/spread/rush bullets | ✅ |
| `entities/bullet.ts` — trajectory + off-screen cull | ✅ |
| `entities/grenade.ts` — arc, bounce, fuse, splash kill | ✅ |
| `stages/types.ts` — StageConfig interface | ✅ |
| `stages/validate.ts` + test — 5 invariants | ✅ |
| `stages/stage-1.ts` — Jungle Outpost (200u, HP=300) | ✅ |
| `stages/stage-2.ts` — Industrial Fortress (250u, pit, HP=500) | ✅ |

**Total game-core tests: 88 pass / 0 fail**

### Phase 4 — Render Layer ✅
| Item | Status |
|------|--------|
| `render/scene.ts` — WebGLRenderer, OrthographicCamera, lighting | ✅ |
| `render/camera.ts` — follow + look-ahead + boss lock | ✅ |
| `render/factories/player-mesh.ts` | ✅ |
| `render/factories/enemy-meshes.ts` — soldier, turret, drone | ✅ |
| `render/factories/boss-mesh.ts` — phase tints | ✅ |
| `render/factories/terrain-mesh.ts` — ground, platforms, bg | ✅ |
| `render/factories/fx-mesh.ts` — pooled FX shards + bullets | ✅ |
| `render/renderer.ts` — entity→mesh lifecycle, interpolated render | ✅ |

### Phase 5 — UI + PWA ✅
| Item | Status |
|------|--------|
| `src/lib/game/game.ts` — main orchestrator | ✅ |
| `+page.svelte` — canvas, HUD, overlays, touch buttons | ✅ |
| `+layout.svelte` — PWA update banner | ✅ |
| `+page.ts` — `prerender=true`, `ssr=false` | ✅ |
| `vercel.json` — no-cache headers for sw.js + manifest | ✅ |
| `static/icons/` — 128/192/512px placeholder PNGs | ✅ |
| `scripts/gen-icons.ts` — PNG generator script | ✅ |

### Phase 6 — Verify ✅
| Check | Result |
|-------|--------|
| `bun test` | ✅ 88/88 pass |
| `bun run build` | ✅ succeeds |
| PWA manifest + sw.js generated | ✅ |
| Preview HTTP 200 on HTML/manifest/icons/sw.js | ✅ |

---

## Fixed Issues

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Browser crash: `TypeError: Cannot read properties of null (reading 'r')` at `onDestroy` | `@sveltejs/vite-plugin-svelte@4` peer-requires vite 5; project uses vite 6. Vite prebundled TWO copies of Svelte runtime — `onDestroy` from one copy read `component_context` (null) owned by the other | Bumped plugin to `^5.0.0` (vite 6 compatible). Verified: single `component_context` across all prebundled chunks |

## Known Gaps / Next Steps

| Item | Priority | Notes |
|------|----------|-------|
| Visual play-through (browser test) | High | Headless browsers unavailable in env (missing system libs, needs sudo) — verify manually in browser |
| `svelte-check` type audit | Medium | Run `bun run check` and fix any type errors surfaced by Svelte compiler |
| Real boss damage (bullet→boss HP) | High | `processCollisions` calls `kill(boss)` instead of decrementing `boss.hp`; needs patch |
| Terrain entity spawn | Medium | Ground/platform entities not currently added to `world.entities`; terrain collision won't fire |
| Camera world-unit calibration | Low | Camera halfView is hardcoded 10; should derive from frustum + aspect ratio |
| Swap to `adapter-vercel` for deploy | Low | Switch back before deploying; requires Node ≤22 locally OR Vercel CI handles it |
| Custom icons (non-placeholder) | Low | Replace solid-color PNGs with actual Metal Slug-style art |

---

## Commit History

```
4391f17 feat(ui+pwa): Phase 5 - game orchestrator, HUD, PWA config, icons
a708465 feat(render): Phase 4 - Three.js render layer
c37361e feat(game-core): Phase 3 - entities, stages, validation (TDD)
6347d8c feat(game-core): Phase 1+2 - types, loop, and all game systems (TDD)
0992ecb chore(scaffold): initialize SvelteKit + Vite stack
```
