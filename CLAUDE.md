# Metal Slug PWA — Claude Code Instructions

## Runtime & Package Manager

Bun is the **package manager and test runner only**. Vite + SvelteKit own bundling, dev server, and HMR.

- `bun install` — install dependencies
- `bun run dev` — start SvelteKit dev server (delegates to `vite dev`)
- `bun run build` — production build (delegates to `vite build`)
- `bun run preview` — preview production build
- `bun test` — run game-core unit tests (133 tests, all pass)
- `bunx <package> <command>` — instead of npx

Do NOT use `Bun.serve()`, `Bun.build()`, HTML imports, or `bun --hot`. Those patterns are incompatible with SvelteKit.

## Tech Stack

- **UI:** Svelte 5 (runes), SvelteKit, `@sveltejs/adapter-static` (swap to `adapter-vercel` for Vercel deploy)
- **Game core:** plain TypeScript — no Svelte/Three.js imports (keeps it `bun test`-able)
- **Renderer:** Three.js, orthographic camera, procedural geometry
- **PWA:** `@vite-pwa/sveltekit` (Workbox precache)
- **Deploy:** Vercel (https://metal-slug-pwa.vercel.app/)

## Project State (as of Milestone 3)

All core gameplay implemented and working. 133 game-core tests pass.

### What exists

**Game core (`src/lib/game/`)**
- `types.ts` — `Entity`, `World` (with `emit`), `ActionMap`, `Screen`; optional render-hint fields on Entity: `onGround?`, `facingRight?`, `muzzleFlash?`, `phase?`, `invincible?`, `terrainKind?`, `aimAngle?`, `telegraph?`, `alert?`
- `events.ts` — pure `GameEvent` union + `createEventBus()`; `explosion`/`enemy-death` carry optional `kind?: ExplosionKind` (`soldier|turret|drone|boss|grenade`)
- `loop.ts` — fixed-timestep 60 Hz game loop with state machine (NEVER add freeze logic here — hit-stop lives in orchestrator)
- `state.svelte.ts` — thin Svelte 5 runes bridge for HUD values (score, lives, bossHp, screen, stageIndex)
- `entities/player.ts` — physics, shoot (emits `shoot` event, sets `muzzleFlash`), grenade, jump (emits `jump`), invincibility timer; exports `PIT_DEATH_Y = -5`
- `entities/enemies.ts` — soldier (patrol + `alert` state: holds fire until player within `alertRange` 12u), turret (aims: sets `aimAngle` per frame; `telegraph` wind-up before fire), drone (hover + strafe, `telegraph`); exports `TELEGRAPH_MS = 400`
- `entities/boss.ts` — 3-phase AI tank; `hp`/`hpMax`; fire patterns slow/spread/rush; `telegraph` wind-up before each pattern
- `entities/bullet.ts` — linear trajectory, off-screen cull
- `entities/grenade.ts` — arc/bounce/fuse/splash; emits `explosion` with `kind:'grenade'`; `GRENADE_DAMAGE = 50` vs boss
- `entities/terrain.ts` — `createGround(GroundSegment)` / `createPlatform(Platform)` → static `TerrainEntity` with `terrainKind`
- `systems/collision.ts` — `overlaps`, `resolveTerrainLanding` (one-way platforms), `processCollisions`; player hits apply knockback (`KNOCKBACK_VX=8`, `KNOCKBACK_VY=5`) + i-frames (`INVINCIBILITY_DURATION=1500`), damage skipped while `invincible`; `enemy-death` events carry `kind`
- `systems/hitstop.ts` — `createHitStop()`: `freeze(n)` / `tick(): boolean`; wired in game.ts onUpdate (early return on frozen tick, render still runs); freeze(3) on `enemy-death` via bus self-subscription
- `systems/input.ts` — `ActionMap`, `KeyboardAdapter`, `consumeEdges`
- `systems/scoring.ts` — points, lives, hi-score localStorage; `SCORE_TABLE`: soldier 100, turret 200, drone 150, boss 5000
- `systems/boss-ai.ts` — 3-phase (HP thresholds 66%/33%), cadence + speed + pattern per phase
- `systems/spawning.ts` — spawn trigger fires when `spawn.x <= cameraX + halfView + margin` (enemy enters just off right screen edge); `createSpawnManager(spawns, { onSpawn, halfView, margin })`; halfView/margin default 0 = legacy center-crossing
- `stages/types.ts` — `StageConfig` has required `theme: 'jungle' | 'industrial'` (`StageTheme`)
- `stages/stage-1.ts` — Jungle Outpost, 200u, theme jungle, first spawn x:50 (must be > initial right edge ~35.5)
- `stages/stage-2.ts` — Industrial Fortress, 250u, theme industrial, pit gap 100..115
- `audio/sfx.ts` — `createAudioEngine(contextFactory?)` — DI'd AudioContext; gain topology: master(0.3) → sfxGain + musicGain(0.55); ±3% pitch detune on rapid SFX; `StereoPannerNode` per positioned event (pan = (x−cameraX)/18, needs `setCameraX` called per frame); engine API: `setCameraX`, `startMusic(theme)`, `setMusicIntensity('normal'|'boss')`, `stopMusic`
- `audio/music.ts` — `createMusicPlayer(ctx, musicGain)` — chiptune lookahead sequencer (25ms interval, 0.1s schedule-ahead, catch-up clamp for backgrounded tabs); 16-step patterns per theme × intensity; `tick()` exposed for tests

**Render layer (`src/lib/game/render/`)**
- `scene.ts` — `SceneContext`: WebGLRenderer + OrthographicCamera (frustum height 20) + lights; `getHalfWidth()` exposes real half-width (halfH × aspect, updates on resize) — game core needs it via `GameInstance.setHalfView`
- `renderer.ts` — `MeshEntry` animate/parts/local; `shake(intensity, ms)` (transient camera offset, never written back); `setStageTheme(theme)` (terrain textures + background foreground); dying queue: EXPLODABLE entities get 180ms fall/spin death anim then `fxPool.explode(kind)` (page no longer triggers FX on `enemy-death` — renderer owns it); blob shadows acquired/placed per SHADOWED entity; `deepDispose` frees geometry+material+texture on mesh removal; `triggerMuzzleSmoke(x, y)`
- `factories/types.ts` — `AnimState` includes `aimAngle?`, `telegraph?`, `alert?`
- `factories/player-mesh.ts` — hip/shoulder pivots, walk cycle (`local.walkT`), facing flip, jump tuck, invincibility blink, muzzle flash quad
- `factories/enemy-meshes.ts` — soldier (marching hips), turret (barrel rotates to `aimAngle`, recoil along aim, dome emissive pulse on `telegraph`), drone (rotors, banking, engines flash rapid on `telegraph`)
- `factories/boss-mesh.ts` — tread scroll, cannon recoil, phase emissive pulse
- `factories/fx-mesh.ts` — explosion presets per `FXKind` (boss = 4 staggered bursts via internal queue; drone = cyan sparks); `puff(x,y)` muzzle smoke; bullet pool meshes carry parented tracer trail quad (inherits rotation)
- `factories/shadow-mesh.ts` — `createShadowPool(scene, size)`: pooled dark ellipses, `place(id, x, groundY, height)` shrinks/fades with height; ground top assumed y=1
- `factories/terrain-mesh.ts` — themed procedural CanvasTextures (jungle dirt / industrial metal panels, module-cached, cloned per mesh with repeat); platform top edge highlight strip; `createGroundMesh(seg, theme)`
- `factories/background-mesh.ts` — sky gradient, mountains (0.2), buildings (0.45), clouds z=-15 (0.1 + slow drift, needs `dt` in `update`), theme foreground silhouettes z=18 (grass/girders, effective parallax 1.3, toggled by `setTheme`)

**UI (`src/routes/+page.svelte`)**
- Bus wiring: `explosion` → triggerFX(kind) + shake; `shoot` → muzzle smoke; `player-hit` → shake + red damage flash overlay (`flashOpacity` $state, CSS transition decay); `boss-phase` → shake + music intensity
- `$effect` on screen/stageIndex: starts music + sets renderer stage theme when playing, stops music otherwise
- Render callback calls `audio.setCameraX(cameraX)` per frame
- `game.setHalfView(sceneCtx.getHalfWidth())` after create + on resize
- Mute toggle persisted to `localStorage['sfx-muted']`

**game.ts orchestrator**
- `halfView` field (default 10 for headless/tests; real value injected via `setHalfView`); used by camera clamp, initStage cameraX, spawn manager
- Hit-stop: `hitStop.tick()` early-return at top of onUpdate
- Boss spawned at `stage.bossTrigger.x` (camera-gated), end-gate spawned simultaneously
- Pit death check → kill + respawn or game over
- `GameInstance.subscribe(listener)` for bus wiring from outside

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
