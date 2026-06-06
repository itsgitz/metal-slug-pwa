# Architecture

## Three-Layer Model

The system splits into three distinct layers with one-way data flow. **Layers never import upward.**

```
┌─────────────────────────────────────────────────┐
│  Svelte UI Layer                                │
│  +page.svelte, HUD components, menus, overlays  │
│  reads: runes store | writes: nothing to core   │
└───────────────────────┬─────────────────────────┘
                        │ runes store (read-only)
┌───────────────────────▼─────────────────────────┐
│  Game Core (plain TypeScript)                   │
│  loop.ts, entities/, systems/, stages/          │
│  NO Svelte imports — bun test-able              │
│  reads: action map | writes: runes store (async)│
└───────────────────────┬─────────────────────────┘
                        │ mesh add/remove/update
┌───────────────────────▼─────────────────────────┐
│  Three.js Render Layer                          │
│  render/scene.ts, render/camera.ts, factories/  │
│  owns <canvas> | reads: entity transforms       │
└─────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Svelte UI Layer**
- Mounts `<canvas>` element; starts/stops game loop via `onMount`/`onDestroy`
- Renders HUD (score, lives, stage name, boss HP bar) using runes store values
- Shows menu screen, stage-clear screen, game-over screen
- Provides touch virtual-button DOM elements (overlaid on canvas)
- Never calls game core functions directly — only reads the runes store

**Game Core (plain TypeScript)**
- Owns the simulation: entity list, systems (collision, spawning, input, score, boss AI)
- Runs the fixed-timestep loop; is framework-agnostic and has no DOM access
- Publishes to the runes store only on meaningful state change (never per-frame)
- Has no knowledge of Three.js — passes mesh handles as opaque references

**Three.js Render Layer**
- Owns the `WebGLRenderer`, `OrthographicCamera`, and scene graph
- Provides factory functions that return `THREE.Mesh` for each entity type
- Called by the loop's `render(alpha)` phase to update mesh positions from entity state
- Manages mesh lifecycle (add on entity creation, dispose on entity death)

## Data Flow

```
Keyboard/Touch events
       │
       ▼
  Action Map  ←────────────────────────── Input adapters (systems/input.ts)
  {left, right, jump, shoot, grenade}
       │
       ▼
  fixed update(dt) ──► entity updates ──► collision resolution ──► score/lives
       │
       ▼ (on change only — not every frame)
  Runes Store  ──────────────────────────► Svelte HUD re-renders
  {screen, score, hiScore, lives,
   stageIndex, bossHp, bossHpMax}
       │
       ▼
  render(alpha) ──► sync mesh positions from entity lerp ──► Three.js draw call
```

## Source Layout

```
src/
  routes/
    +page.svelte              # mounts canvas, HUD, menus — reads runes store
    +layout.svelte            # PWA shell, global CSS
  lib/
    game/
      loop.ts                 # RAF + fixed-timestep loop, start/stop/pause
      state.svelte.ts         # runes store: game→HUD bridge
      entities/
        types.ts              # Entity interface + union type
        player.ts
        enemies.ts            # soldier, turret, drone factories
        boss.ts
        bullet.ts
        grenade.ts
      systems/
        input.ts              # action map + keyboard & touch adapters
        collision.ts          # AABB helpers + pair resolution
        spawning.ts           # stage-driven spawn-as-you-go
        scoring.ts            # score, lives, hi-score localStorage
        boss-ai.ts            # boss phase state machine
      render/
        scene.ts              # Three.js scene, renderer, camera init
        camera.ts             # orthographic follow + clamp logic
        factories/
          player-mesh.ts
          enemy-meshes.ts
          boss-mesh.ts
          terrain-mesh.ts
          fx-mesh.ts          # explosions, muzzle flash (pooled)
      stages/
        types.ts              # StageConfig TypeScript type
        stage-1.ts
        stage-2.ts
  app.html                    # SvelteKit HTML shell
  app.css                     # global styles
static/
  icons/                      # PWA icons (128/192/512px)
  manifest.webmanifest        # generated/copied by @vite-pwa/sveltekit
```

## Key Constraints

**Game core must never import from Svelte.** If a file in `src/lib/game/` imports `from 'svelte'`, it is an architecture violation. `state.svelte.ts` is the only exception — it uses Svelte 5 runes but is treated as a thin bridge, not logic.

**Runes store updates must not happen per frame.** Score, lives, boss HP — push to store only when the value changes, not every `update()` tick. Per-frame `$state` mutation causes unnecessary Svelte reconciliation during the hot game loop.

**Single canvas ownership.** The `WebGLRenderer` canvas is not created by Svelte's template — it is appended to a container div via `renderer.domElement` in `scene.ts`. Svelte manages the container div; Three.js owns the canvas element inside it.
