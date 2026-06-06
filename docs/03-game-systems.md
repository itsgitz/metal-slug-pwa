# Game Systems

## Entity Model

All game objects are plain objects conforming to the `Entity` interface stored in a flat array. No ECS framework — at the scale of dozens of entities, a flat array with a dead-sweep is simpler and fast enough.

```typescript
interface Entity {
  id: number
  type: EntityType
  x: number
  y: number
  vx: number           // velocity x (world units/sec)
  vy: number           // velocity y
  w: number            // AABB width
  h: number            // AABB height
  alive: boolean
  mesh: unknown        // opaque Three.js mesh handle — game core does not import Three
  update(dt: number, world: World): void
}

type EntityType =
  | 'player'
  | 'enemy-soldier'
  | 'enemy-turret'
  | 'enemy-drone'
  | 'bullet-player'
  | 'bullet-enemy'
  | 'grenade'
  | 'boss'
  | 'terrain'
```

`World` is a lightweight context object passed to every `update()` call:

```typescript
interface World {
  entities: Entity[]
  actions: ActionMap         // current input state
  spawn(template: EntityTemplate): void
  kill(entity: Entity): void
  camera: { x: number }     // for spawn-as-you-go decisions
}
```

**Dead-sweep:** at the end of each `update()` pass, filter `entities` to remove `alive === false` entries. The render layer's dead-sweep hook then calls `dispose()` on their mesh handles.

## AABB Collision

All collision uses axis-aligned bounding boxes. No rotation, no complex geometry — sufficient for a side-scrolling MVP.

```typescript
function overlaps(a: Entity, b: Entity): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}
```

### Collision Pair Matrix

Only meaningful pairs are tested. Brute-force O(n²) over ~50 entities is negligible.

| A | B | Effect |
|---|---|--------|
| `player` | `enemy-*` | Player loses life; enemy knockback |
| `player` | `boss` | Player loses life |
| `bullet-player` | `enemy-*` | Enemy takes damage; bullet dies |
| `bullet-player` | `boss` | Boss takes damage; bullet dies |
| `bullet-enemy` | `player` | Player loses life; bullet dies |
| `grenade` (radius) | `enemy-*` / `boss` | Splash damage to all in radius; grenade dies |
| `player` | `terrain` | Platform landing / wall stop (resolve overlap, zero velocity component) |
| `player` | `end-gate` | Trigger stage-clear |

**Terrain resolution:** when player overlaps terrain from above, set `player.y = terrain.y + terrain.h` and `player.vy = 0` (landing). Side and ceiling collisions use equivalent axis resolution.

**Grenade splash:** grenade uses a radius check (circle approximation), not AABB:
```typescript
function inSplashRadius(grenade: Entity, target: Entity, radius: number): boolean {
  const cx = grenade.x + grenade.w / 2
  const cy = grenade.y + grenade.h / 2
  const tx = target.x + target.w / 2
  const ty = target.y + target.h / 2
  return Math.hypot(cx - tx, cy - ty) <= radius
}
```

## Input System

### Action Map

Unified abstraction decoupling input source from game logic:

```typescript
interface ActionMap {
  left: boolean
  right: boolean
  jump: boolean        // edge: true only first frame key is pressed
  shoot: boolean       // held: true while key held
  grenade: boolean     // edge: true only first frame
}
```

**Held vs edge semantics:**
- `left`, `right`, `shoot` — held (true while key/button is down)
- `jump`, `grenade` — edge (true for exactly one `update()` tick after press; reset after consumed)

Game core reads only `ActionMap` — it never calls `addEventListener` or reads DOM touch state directly.

### Keyboard Adapter

```
ArrowLeft / A  →  actions.left
ArrowRight / D →  actions.right
ArrowUp / W / Space → actions.jump (edge)
Z / X          →  actions.shoot
C              →  actions.grenade (edge)
```

Listens to `keydown`/`keyup`. Sets held flags immediately. For edge actions, sets flag on `keydown` and expects game core to consume (reset) it after one tick.

### Touch Adapter

On-screen buttons rendered as Svelte DOM elements overlaid on the canvas. Each button fires `touchstart`/`touchend` events that write to the same `ActionMap`. Button layout:

```
[←] [→]     [JUMP] [SHOOT] [GRENADE]   (landscape)
left side    right side
```

Touch adapter writes the same `ActionMap` as keyboard — game core is unaware of the input source.

## Boss State Machine

Boss has HP with phase thresholds. Each phase changes attack pattern and cadence.

```typescript
interface BossPhase {
  hpThreshold: number      // enter phase when hp drops below this %
  attackPattern: 'slow' | 'spread' | 'rush'
  bulletCadenceMs: number
  movementSpeed: number
}

const PHASES: BossPhase[] = [
  { hpThreshold: 1.00, attackPattern: 'slow',   bulletCadenceMs: 2000, movementSpeed: 1 },
  { hpThreshold: 0.66, attackPattern: 'spread', bulletCadenceMs: 1200, movementSpeed: 2 },
  { hpThreshold: 0.33, attackPattern: 'rush',   bulletCadenceMs: 800,  movementSpeed: 3.5 },
]
```

Phase transition check runs each `update()` tick after HP is modified:

```typescript
const hpRatio = boss.hp / boss.hpMax
const newPhase = PHASES.findLast(p => hpRatio <= p.hpThreshold) ?? PHASES[0]
if (newPhase !== currentPhase) enterPhase(newPhase)
```

Boss death (hp ≤ 0) → triggers stage-clear (or victory for stage 2) via `World`.

**Boss camera lock:** when boss spawns, camera stops horizontal scrolling and the arena is bounded. Player cannot scroll past the boss spawn point. This is set as a flag in the stage config's `bossTrigger`.

## Score & Lives

### Scoring

| Event | Points |
|-------|--------|
| Kill enemy-soldier | 100 |
| Kill enemy-turret | 200 |
| Kill enemy-drone | 150 |
| Boss damage hit | 50 |
| Boss defeated | 5000 |
| Stage clear bonus | 1000 × lives remaining |

### Lives

- Player starts with 3 lives
- On hit: invincibility frames (1.5s), then if lives reach 0 → game-over
- No respawning during boss fight — player has one attempt per boss encounter per run

### High Score (localStorage)

```typescript
const LS_KEY = 'metalSlugPwa:hiScore'

function loadHiScore(): number {
  try {
    return parseInt(localStorage.getItem(LS_KEY) ?? '0', 10) || 0
  } catch {
    return 0  // private browsing / storage blocked
  }
}

function saveHiScore(score: number): void {
  try {
    localStorage.setItem(LS_KEY, String(score))
  } catch {
    // ignore — game continues without persistence
  }
}
```

Hi-score is loaded at page mount and saved on game-over and victory. Never blocks gameplay if storage is unavailable.

## Required Tests (see 07-testing-tdd.md)

- `overlaps()` correct for all four non-overlapping edge cases and overlapping center
- Collision pairs: player+enemy triggers life loss; bullet-player+enemy triggers entity death
- Grenade splash hits targets within radius, misses targets outside
- Terrain resolution: player lands on platform, vy zeroed
- Action map edge semantics: `jump` true for exactly 1 tick after keydown
- Keyboard adapter: keydown sets flag, keyup clears flag
- Boss phase transitions at correct HP thresholds
- Boss death triggers stage-clear hook
- `loadHiScore` returns 0 when storage empty; returns saved value after `saveHiScore`
- `saveHiScore` does not throw when localStorage unavailable (mocked to throw)
