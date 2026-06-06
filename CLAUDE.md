# Metal Slug PWA — Claude Code Instructions

## Runtime & Package Manager

Bun is the **package manager and test runner only**. Vite + SvelteKit own bundling, dev server, and HMR.

- `bun install` — install dependencies
- `bun run dev` — start SvelteKit dev server (delegates to `vite dev`)
- `bun run build` — production build (delegates to `vite build`)
- `bun run preview` — preview production build
- `bun test` — run game-core unit tests (108 tests, all pass)
- `bunx <package> <command>` — instead of npx

Do NOT use `Bun.serve()`, `Bun.build()`, HTML imports, or `bun --hot`. Those patterns are incompatible with SvelteKit.

## Tech Stack

- **UI:** Svelte 5 (runes), SvelteKit, `@sveltejs/adapter-static` (swap to `adapter-vercel` for Vercel deploy)
- **Game core:** plain TypeScript — no Svelte/Three.js imports (keeps it `bun test`-able)
- **Renderer:** Three.js, orthographic camera, procedural geometry
- **PWA:** `@vite-pwa/sveltekit` (Workbox precache)
- **Deploy:** Vercel (https://metal-slug-pwa.vercel.app/)

## Project State (as of Milestone 2)

All core gameplay is implemented and working. 108 game-core tests pass.

### What exists

**Game core (`src/lib/game/`)**
- `types.ts` — `Entity`, `World` (with `emit`), `ActionMap`, `Screen`; optional render-hint fields on Entity: `onGround?`, `facingRight?`, `muzzleFlash?`, `phase?`, `invincible?`, `terrainKind?`
- `events.ts` — pure `GameEvent` union + `createEventBus()` (subscribe/emit, no browser deps)
- `loop.ts` — fixed-timestep 60 Hz game loop with state machine
- `state.svelte.ts` — thin Svelte 5 runes bridge for HUD values (score, lives, bossHp, screen, stageIndex)
- `entities/player.ts` — physics, shoot (emits `shoot` event, sets `muzzleFlash`), grenade, jump (emits `jump`), invincibility timer; exports `PIT_DEATH_Y = -5`
- `entities/enemies.ts` — soldier (patrol), turret (shoot timer), drone (hover + strafe)
- `entities/boss.ts` — 3-phase AI tank; `hp`/`hpMax` fields; fire patterns slow/spread/rush
- `entities/bullet.ts` — linear trajectory, off-screen cull
- `entities/grenade.ts` — arc/bounce/fuse/splash; emits `explosion`; uses `GRENADE_DAMAGE = 50` vs boss (not instant kill)
- `entities/terrain.ts` — `createGround(GroundSegment)` / `createPlatform(Platform)` → static `TerrainEntity` with `terrainKind`
- `systems/collision.ts` — `overlaps`, `resolveTerrainLanding` (one-way platforms), `processCollisions`; `BULLET_DAMAGE = 10`, `GRENADE_DAMAGE = 50` exported; boss takes damage not instant kill; emits `player-hit`, `enemy-death`, `game-over`, `stage-clear` on world
- `systems/input.ts` — `ActionMap`, `KeyboardAdapter`, `consumeEdges`
- `systems/scoring.ts` — points, lives, hi-score localStorage; `SCORE_TABLE`: soldier 100, turret 200, drone 150, boss 5000
- `systems/boss-ai.ts` — 3-phase (HP thresholds 66%/33%), cadence + speed + pattern per phase
- `systems/spawning.ts` — camera-gated spawn trigger
- `stages/stage-1.ts` — Jungle Outpost, 200u, ground y:0 h:1, 3 platforms, bossTrigger x:165, bossHp 300
- `stages/stage-2.ts` — Industrial Fortress, 250u, 2 ground segments (pit gap 100..115), 4 platforms, bossTrigger x:210, bossHp 500
- `audio/sfx.ts` — `createAudioEngine(contextFactory?)` — DI'd AudioContext for testability; synthesized oscillator/noise SFX for all `GameEvent` types; lazy init + mute

**Render layer (`src/lib/game/render/`)**
- `scene.ts` — `SceneContext`: WebGLRenderer + OrthographicCamera (frustum height 20) + HemisphereLight + ambient (cool) + directional (warm key); exposes `background: Background`
- `renderer.ts` — `MeshEntry` has `animate/parts/local`; calls `animate` per frame; skips terrain in interpolation; fires `fxPool.explode` on enemy/boss mesh removal; bullet rotation to travel angle; `renderFrame(entities, alpha, cameraX, dt?)` signature
- `factories/types.ts` — `AnimatedParts`, `AnimState`, `AnimateFn`, `AnimLocal`
- `factories/player-mesh.ts` — hip/shoulder pivots, walk cycle (sin-based, time-driven, `local.walkT`), facing flip (`group.scale.x`), jump tuck, invincibility blink, muzzle flash quad
- `factories/enemy-meshes.ts` — soldier (marching hip pivots), turret (barrel recoil pivot), drone (spinning rotors, engine emissive pulse, banking)
- `factories/boss-mesh.ts` — tread scroll, cannon recoil pivot, phase emissive pulse on core
- `factories/fx-mesh.ts` — multi-shard burst (8 per explode), `transparent: true`, flash quad, gravity on shards; `createBulletMeshPool` with emissive material
- `factories/terrain-mesh.ts` — `createGroundMesh(GroundSegment)`, `createPlatformMesh(Platform)` (factory self-positions the mesh; renderer skips terrain in interpolation loop)
- `factories/background-mesh.ts` — `createBackground(scene, frustumH, aspect)` → parallax layers (mountains z=-10, buildings z=-2) at `position.x = cameraX * factor`; sky gradient via `CanvasTexture`

**UI (`src/routes/+page.svelte`)**
- Subscribes to game event bus; wires `explosion`/`enemy-death` → `renderer.triggerFX` AND `audio.play`
- `audio.resume()` called on START button click (autoplay policy)
- Mute toggle button in HUD, persisted to `localStorage['sfx-muted']`

**game.ts orchestrator**
- Boss spawned at `stage.bossTrigger.x` (camera-gated, `bossSpawned` flag), end-gate entity spawned simultaneously
- Terrain entities spawned in `initStage` from `stage.ground` + `stage.platforms`
- Pit death check: `player.y < PIT_DEATH_Y` → kill + respawn or game over
- Boss phase-change events emitted via bus
- `GameInstance.subscribe(listener)` exposed for bus wiring from outside

## Key Constraints

- Game core (`src/lib/game/`) must never import from `svelte` or `three` — except `state.svelte.ts` (thin bridge) and `audio/sfx.ts` (presentation layer, WebAudio OK)
- Never mutate `$state` per frame inside the game loop — push to runes store on value change only
- All game assets are procedural Three.js primitives — no external sprites, GLTF, or copyrighted assets
- No audio files — all SFX synthesized via WebAudio oscillators/noise buffers

## Testing

Game-core logic lives in `src/lib/game/`. Test with `bun test`. Tests colocated (`*.test.ts` next to module).

```ts
import { test, expect } from "bun:test";
```

Three.js render layer and Svelte HUD are **not** unit-tested — verified visually.

When adding `makeWorld` in tests, include the `emit` field:
```ts
function makeWorld(entities: Entity[]): World {
  return {
    entities,
    actions: { left: false, right: false, jump: false, shoot: false, grenade: false },
    spawn: () => {},
    kill: (e) => { e.alive = false; },
    emit: () => {},
    camera: { x: 0 },
  };
}
```

## Animation Architecture

Mesh factories store animation data on `group.userData`:
```ts
group.userData.parts = { hipL, hipR, shoulder, muzzle, ... };  // AnimatedParts
group.userData.animate = animatePlayer;                          // AnimateFn
```

Renderer reads these into `MeshEntry.animate/parts/local` and calls:
```ts
entry.animate(entry.mesh, entry.parts, { vx, vy, grounded, facingRight, muzzleFlash, phase, tMs }, dt, entry.local);
```

Walk cycles use `local.walkT` (persistent per-mesh accumulator, not entity x-position).

Facing flip: `group.scale.x = facingRight ? 1 : -1` — mirrors the whole group.

## Docs

Full architecture, game systems, TDD strategy, and deploy guide: `docs/` directory. Read `docs/00-overview.md` first. Progress tracker: `docs/08-progress.md`.
