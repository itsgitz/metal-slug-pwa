# Game Loop

## Fixed-Timestep with Variable Render

The simulation runs at a fixed 60 Hz tick rate regardless of display frame rate. The renderer interpolates between simulation steps using an `alpha` value for smooth visuals at any frame rate.

```
requestAnimationFrame fires
  elapsed = now - lastTime
  clamp elapsed to 250ms max   ← spiral-of-death guard
  accumulator += elapsed

  while accumulator >= FIXED_DT (16.67ms):
    update(FIXED_DT)            ← simulation step
    accumulator -= FIXED_DT

  alpha = accumulator / FIXED_DT
  render(alpha)                 ← interpolated draw
```

**Why fixed timestep:** collision detection and entity velocities behave consistently regardless of frame rate. A player bullet travels the same distance per simulated second on a 30 Hz phone as on a 120 Hz desktop.

**Spiral-of-death guard:** if the tab loses focus and resumes after several seconds, `elapsed` would be huge and cause thousands of update ticks in one frame. Clamping elapsed to 250ms prevents this at the cost of one brief "slow" frame.

## Loop Lifecycle

```typescript
// Conceptual — not implementation code
let rafId: number
let lastTime: number

function start() {
  lastTime = performance.now()
  rafId = requestAnimationFrame(tick)
}

function tick(now: number) {
  // accumulate + update + render
  rafId = requestAnimationFrame(tick)
}

function stop() {
  cancelAnimationFrame(rafId)
}
```

**SvelteKit integration:** `+page.svelte` calls `start()` in `onMount` and `stop()` in `onDestroy`. The loop function lives entirely in `loop.ts` (game core) — it receives no Svelte arguments.

**Pause on tab blur:** listen to `document.addEventListener('visibilitychange')`. When `document.hidden === true`, stop accumulating time (reset `lastTime` on resume). This prevents accumulated time from causing a burst of ticks when the player returns.

## Game State Machine

The loop only runs the simulation when in the `playing` state. The state machine drives which Svelte screen component is visible.

```
         start()
            │
            ▼
         [menu]
            │  player presses Start
            ▼
        [playing]  ──── player dies (lives=0) ───► [game-over] ──► [menu]
            │                                           ▲
            │  boss defeated (stage 1)                  │
            ▼                                           │
      [stage-clear]                                     │
            │  auto-advance after 3s                    │
            ▼                                           │
        [playing]  ──── player dies (lives=0) ──────────┘
            │
            │  boss defeated (stage 2)
            ▼
        [victory]  ──► [menu]
```

State transitions emit an event that `loop.ts` processes — the loop pauses simulation for non-playing states and resumes on transition to `playing`.

On transition **into** `playing` from `menu`:
- Initialize stage config (stage 1)
- Spawn player at stage start position
- Reset score, lives = 3
- Start camera at stage origin

On transition **into** `playing` from `stage-clear`:
- Advance stage index
- Load stage 2 config
- Carry score and lives forward
- Reset entities (clear all except player; respawn player at stage 2 start)

## Runes Store Bridge

`state.svelte.ts` exports a `$state` object the Svelte HUD reads reactively.

```typescript
// state.svelte.ts — shape only
export const gameState = $state({
  screen: 'menu' as Screen,   // 'menu' | 'playing' | 'stage-clear' | 'game-over' | 'victory'
  score: 0,
  hiScore: 0,
  lives: 3,
  stageIndex: 0,
  bossHp: 0,
  bossHpMax: 0,
})
```

**Update discipline:** game core updates `gameState.*` only when the value changes — not on every `update()` tick. The pattern:

```typescript
// CORRECT — only when score increases
if (newScore !== gameState.score) gameState.score = newScore

// WRONG — per-frame mutation triggers per-frame Svelte reconciliation
gameState.score = currentScore  // inside update() every tick
```

The HUD subscribes reactively to `gameState` fields. Because Svelte 5 runes are fine-grained, only the changed property triggers a HUD re-render.

## Required Tests (see 07-testing-tdd.md)

- Accumulator ticks correct number of `update()` calls for given elapsed time
- Spiral-of-death: elapsed > 250ms clamped, update called at most 15 times
- State machine: all transitions fire correct entry/exit hooks
- State machine: simulation does not run in `menu`, `stage-clear`, `game-over`, `victory` states
- `visibilitychange` pause: `lastTime` reset on resume, no time accumulated during hidden
