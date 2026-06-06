# Testing & TDD

## Discipline: Test-First

All game-core code is written test-first: **red → green → refactor**. The cycle for every function, system, and state machine:

1. Write a failing test describing the behavior
2. Run `bun test` — confirm it fails (red)
3. Write minimum code to pass the test (green)
4. Refactor if needed; tests must stay green

This is enforced by architecture: the game core (`src/lib/game/`) has no Svelte or Three.js imports, making every function unit-testable with plain `bun test`.

## What Is and Is Not Tested

### In scope (TDD required)

- All functions in `systems/` — collision, input, scoring, boss-ai, spawning
- Entity `update()` logic — movement, velocity, alive flag
- `loop.ts` — accumulator tick count, spiral-of-death clamp, state machine transitions
- `stages/` — stage config validation (invariants from 05-stage-data.md)
- `state.svelte.ts` — store shape and value correctness (use Svelte's `$state` in test context)

### Out of scope (visual/manual verification)

- Three.js render layer (`render/`) — mesh creation, camera position, dispose — no headless WebGL in MVP tests
- Svelte HUD components — verify visually in browser; optionally add Playwright smoke tests post-MVP
- Touch adapter DOM events — verify manually on device; unit-test action map side effects only

## Test Runner

```bash
bun test                        # run all tests
bun test --watch                # watch mode during development
bun test src/lib/game/systems/  # run a specific directory
```

## File Convention

Tests are colocated next to the module they test:

```
src/lib/game/
  systems/
    collision.ts
    collision.test.ts     ← tests for collision.ts
    input.ts
    input.test.ts
    scoring.ts
    scoring.test.ts
    boss-ai.ts
    boss-ai.test.ts
  loop.ts
  loop.test.ts
  stages/
    types.ts
    validate.ts
    validate.test.ts
    stage-1.ts            (data only — validated by validate.test.ts)
    stage-2.ts
```

## Test Checklist by Module

### `systems/collision.ts`

- `overlaps()` — all 4 non-overlapping cases: left, right, above, below
- `overlaps()` — overlapping in center, partial overlap each side
- Player + enemy collision: player loses life, invincibility frames set
- Player-bullet + enemy: enemy `alive = false`, bullet `alive = false`
- Enemy-bullet + player: player loses life, bullet `alive = false`
- `inSplashRadius()` — target inside radius: true; target outside: false; target exactly on radius edge: true
- Grenade splash: kills all entities within radius, leaves entities outside radius alive
- Terrain resolution: player overlapping from above → `player.y` snapped, `player.vy = 0`
- Terrain resolution: player overlapping from right wall → `player.x` snapped, `player.vx = 0`
- End-gate overlap → triggers stage-clear callback once (not on every tick)

### `systems/input.ts`

- Keyboard adapter: `keydown` ArrowLeft → `actions.left = true`
- Keyboard adapter: `keyup` ArrowLeft → `actions.left = false`
- Jump edge: `actions.jump = true` for exactly 1 tick after keydown; `false` next tick after consumed
- Grenade edge: same edge semantics as jump
- Shoot held: `actions.shoot` remains `true` across multiple ticks while key held
- Touch adapter: `touchstart` on jump button → `actions.jump = true` (edge)
- Touch adapter: `touchend` on left button → `actions.left = false`
- Keyboard and touch can both write to same ActionMap without collision

### `systems/scoring.ts`

- Kill soldier: score += 100
- Kill turret: score += 200
- Kill drone: score += 150
- Boss hit: score += 50
- Boss defeat: score += 5000
- Stage clear: score += 1000 × lives remaining
- Life lost: lives decrements from 3 to 2
- Lives reach 0: triggers game-over callback
- `loadHiScore`: returns 0 when localStorage empty
- `loadHiScore`: returns saved integer after `saveHiScore(1234)`
- `saveHiScore`: does not throw when localStorage.setItem mocked to throw
- `loadHiScore`: returns 0 (graceful) when localStorage.getItem mocked to throw

### `systems/boss-ai.ts`

- Boss spawns in phase 1 (P1) at full HP
- HP drops to 66%: transitions to phase 2 (spread pattern)
- HP drops to 33%: transitions to phase 3 (rush pattern)
- HP drops to 0: `boss.alive = false`, stage-clear callback fires
- Phase transition does not fire again if HP fluctuates around threshold (idempotent)
- Boss bullet cadence in P3 faster than P1

### `loop.ts`

- elapsed = 33ms (2 ticks @ 60Hz): `update()` called exactly 2 times
- elapsed = 16ms (1 tick): `update()` called once
- elapsed = 8ms (< 1 tick): `update()` not called; accumulator holds remainder
- Spiral-of-death: elapsed = 1000ms: `update()` called at most 15 times (250ms / 16.67ms ≈ 15)
- State machine in `menu`: `update()` not called
- State machine in `playing`: `update()` called each frame
- State machine in `game-over`: `update()` not called
- Transition `menu → playing`: initializes stage, entities, resets score/lives
- Transition `playing → stage-clear` (stage 1): advances stageIndex, carries score/lives
- Transition `playing → game-over` (lives = 0): fires game-over, stops loop
- `visibilitychange` hidden: `lastTime` reset on next visible event (no burst ticks)

### `stages/validate.ts`

- Stage 1 config: passes all 5 invariants (see 05-stage-data.md)
- Stage 2 config: passes all 5 invariants
- Config with spawn.x > bossTrigger.x: fails invariant 1 with descriptive message
- Config with endGate.x > length: fails invariant 2
- Config with 0 bossTriggers: fails invariant 4
- Config with 2 bossTriggers: fails invariant 4

## Example Test Pattern (bun:test)

```typescript
// collision.test.ts
import { test, expect } from 'bun:test'
import { overlaps } from './collision'

const entity = (x: number, y: number, w = 1, h = 1) =>
  ({ x, y, w, h } as any)

test('non-overlapping: b is to the right of a', () => {
  expect(overlaps(entity(0, 0), entity(2, 0))).toBe(false)
})

test('overlapping: a and b share area', () => {
  expect(overlaps(entity(0, 0, 2, 2), entity(1, 1, 2, 2))).toBe(true)
})
```

## Coverage Target

No hard coverage percentage — prefer meaningful tests over coverage theater. Every public function in `systems/` and `loop.ts` must have at least one test covering its primary behavior and one covering an edge/error case.
