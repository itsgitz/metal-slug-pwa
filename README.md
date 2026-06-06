# Metal Slug PWA

Browser-based 2.5D side-scrolling run-and-gun game in the spirit of Metal Slug. Runs offline as a Progressive Web App. No server, no login — open the URL and play instantly.

**Live:** https://metal-slug-pwa.vercel.app/

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | Svelte 5 (runes) + SvelteKit |
| Game core | Plain TypeScript (no framework deps) |
| Renderer | Three.js, orthographic camera, procedural geometry |
| Build | Vite via SvelteKit |
| Package manager / test runner | Bun |
| PWA | `@vite-pwa/sveltekit` (Workbox) |
| Deploy | Vercel + `@sveltejs/adapter-static` |

---

## Getting Started

```bash
bun install       # install deps (first time only)
bun run dev       # dev server → http://localhost:5173
bun test          # run game-core unit tests
bun run build     # production build → build/
bun run preview   # serve production build → http://localhost:4173
```

### Controls

| Key | Action |
|-----|--------|
| A / ← | Move left |
| D / → | Move right |
| W / ↑ / Space | Jump |
| Z | Shoot |
| X | Throw grenade |

Touch controls appear on mobile.

---

## Project Structure

```
src/
  lib/game/
    types.ts              — Entity, World, ActionMap interfaces
    events.ts             — Pure event bus (GameEvent union, subscribe/emit)
    state.svelte.ts       — Runes store bridge (HUD ↔ game core)
    loop.ts               — Fixed-timestep game loop (60 Hz)
    entities/
      player.ts           — Player physics, shoot, grenade, muzzle flash timer
      enemies.ts          — Soldier (patrol), turret (aim), drone (hover)
      boss.ts             — 3-phase tank boss, fire patterns
      bullet.ts           — Trajectory + off-screen cull
      grenade.ts          — Arc, bounce, fuse, splash (GRENADE_DAMAGE vs boss)
      terrain.ts          — Static ground/platform entity factories
    systems/
      collision.ts        — AABB overlaps, terrain landing, processCollisions
      input.ts            — ActionMap, KeyboardAdapter, edge detection
      scoring.ts          — Points, lives, hi-score localStorage
      boss-ai.ts          — 3-phase state machine (HP thresholds)
      spawning.ts         — Camera-gated spawn trigger
    stages/
      stage-1.ts          — Jungle Outpost (200u, boss HP 300)
      stage-2.ts          — Industrial Fortress (250u, pit gap, boss HP 500)
      types.ts            — StageConfig, GroundSegment, Platform, SpawnEntry
      validate.ts         — Stage invariant checks
    render/
      scene.ts            — WebGLRenderer, OrthographicCamera, lighting
      renderer.ts         — Entity→mesh lifecycle, interpolation, animation hook
      factories/
        types.ts          — AnimatedParts, AnimState, AnimateFn, AnimLocal
        player-mesh.ts    — Articulated player (hip/shoulder pivots, walk cycle)
        enemy-meshes.ts   — Soldier (marching), turret (recoil), drone (rotors)
        boss-mesh.ts      — Tank (tread scroll, cannon pivot, phase emissive)
        fx-mesh.ts        — Explosion shard pool, bullet pool, flash quad
        terrain-mesh.ts   — Ground and platform box meshes
        background-mesh.ts — Parallax mountains + buildings, sky gradient
    audio/
      sfx.ts              — Procedural WebAudio SFX engine (DI AudioContext)
  routes/
    +page.svelte          — Canvas, HUD, overlays, touch controls, event bus wiring
    +layout.svelte        — PWA update banner
```

---

## Architecture Highlights

### Game Core is Framework-Free

Everything in `src/lib/game/` (except `state.svelte.ts`) is plain TypeScript with no browser, Svelte, or Three.js imports. This keeps the game-core `bun test`-able in isolation. The render layer and audio engine subscribe to the same event bus that the core emits on.

### Event Bus

`events.ts` exposes a `GameEvent` union and `createEventBus()`. The game core emits events (`shoot`, `explosion`, `enemy-death`, `boss-phase`, etc.) that the render layer (FX triggers) and audio engine both subscribe to. Presentation never reaches into core; core never knows about audio or Three.js.

### Entity Lifecycle

Entities are plain objects with an `update(dt, world)` method. `World.spawn()` and `World.kill()` mutate the entity list. After each fixed-step update, dead entities are swept out. The renderer's `syncEntities()` mirrors this — it adds meshes for new entities and removes + explodes meshes for dead ones.

### Animation

Mesh factories return `THREE.Group` with named pivot sub-groups and attach `parts` + `animate` to `group.userData`. The renderer reads these when creating a `MeshEntry` and calls `animate(root, parts, animState, dt, local)` each render frame. Walk cycles are time-driven (not position-driven) to avoid interpolation jitter.

### Terrain & Collision

Ground segments and platforms from stage configs are spawned as static `TerrainEntity` objects. One-way platforms: snap only when `vy ≤ 0` and player's bottom is within the top slab tolerance. Ground is always solid. Falling below `y < -5` triggers pit death.

---

## Game Systems

| System | Description |
|--------|-------------|
| Boss HP | Bullet deals `BULLET_DAMAGE = 10`, grenade deals `GRENADE_DAMAGE = 50`; boss spawns at camera trigger position |
| Scoring | Enemy kills: soldier 100, turret 200, drone 150, boss 5000; stage clear bonus |
| Lives | 3 lives; enemy bullet / contact / pit fall deducts 1; game over at 0 |
| Parallax | Two background layers (mountains + buildings) at different `x = cameraX * factor` |
| Audio | WebAudio synthesized SFX; lazy `AudioContext` init; mute toggle persisted to `localStorage` |

---

## Test Coverage

108 tests across 11 files (all game-core logic). Three.js render layer and Svelte HUD verified visually per project convention.

```bash
bun test
# 108 pass / 0 fail
```

---

## Docs

Full architecture, game loop, systems, rendering, stage data, PWA deploy, and TDD strategy: [`docs/`](docs/) directory. Start with [`docs/00-overview.md`](docs/00-overview.md).
