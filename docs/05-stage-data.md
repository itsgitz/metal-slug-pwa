# Stage Data

## StageConfig Type

Stage configurations are TypeScript data files. The type lives in `src/lib/game/stages/types.ts`.

```typescript
interface StageConfig {
  id: number
  name: string
  length: number              // total stage width in world units
  cameraMinX: number          // leftmost camera X (usually 0)
  cameraMaxX: number          // rightmost camera X (usually = length)

  ground: GroundSegment[]     // base terrain
  platforms: Platform[]       // elevated platforms

  background: BackgroundLayer[]

  spawns: SpawnEntry[]        // enemies spawned as player approaches
  bossTrigger: BossTrigger    // when/where boss appears
  endGate: EndGate            // stage completion condition
}

interface GroundSegment {
  x: number       // start X
  width: number   // segment width
  y: number       // ground Y (top surface); usually 0
  height: number  // terrain thickness (visual); usually 2
}

interface Platform {
  x: number
  y: number       // top surface Y
  width: number
  height: number  // usually 1
}

interface BackgroundLayer {
  zDepth: number        // matches layer Z from rendering doc (0 = far, 5 = near)
  parallaxFactor: number  // 0.2 for far, 0.5 for near
  color: number         // hex color for procedural flat plane
  // Optional: tileWidth for repeating background segments
}

interface SpawnEntry {
  x: number               // camera-approach X that triggers spawn
  type: EnemyEntityType
  count: number           // how many to spawn
  formation: 'line' | 'spread' | 'staggered'
  // Optional overrides
  patrolRange?: number    // for soldiers — distance they walk before turning
  altitude?: number       // for drones — hover height above ground
}

interface BossTrigger {
  x: number               // camera X that triggers boss spawn
  lockCamera: boolean     // always true for boss arenas
  bossSpawnX: number      // boss entity spawn X
  bossSpawnY: number
}

interface EndGate {
  x: number               // player must reach this X to clear stage
  type: 'reach' | 'boss-cleared'  // 'boss-cleared' = gate opens after boss dies
}
```

## Spawn-as-You-Go Logic

Spawns are triggered when the camera X position passes a spawn entry's `x` value. The spawning system (`systems/spawning.ts`) iterates pending spawns each `update()` tick:

```typescript
// spawning.ts — conceptual
for (const spawn of pendingSpawns) {
  if (world.camera.x >= spawn.x) {
    createEnemiesFromSpawn(spawn, world)
    pendingSpawns.delete(spawn)
  }
}
```

Already-triggered spawns are removed from the pending set. Spawns are initialized from stage config when the stage loads; reset on stage reload.

## Stage 1 — "Jungle Outpost" (Authoring Guide)

**Setting:** jungle/tropical. Enemy mix: mostly soldiers, 1 turret mid-stage, drone patrol near boss.

**Layout sketch (200 world units):**

```
X:0─────30─────────70──────────120────────160─────────200
       S SS          T S S        D D S        [BOSS ARENA]
Ground: continuous flat at Y=0
Platforms at: x=40 (y=4, w=15), x=85 (y=5, w=10), x=130 (y=3, w=20)
```

| Spawn X | Type | Count | Notes |
|---------|------|-------|-------|
| 30 | soldier | 2 | line formation, patrol |
| 50 | soldier | 1 | |
| 70 | turret | 1 | on platform at x=85 |
| 90 | soldier | 2 | spread |
| 110 | soldier | 1 | |
| 130 | drone | 2 | altitude=6, staggered |
| 145 | soldier | 1 | |

- `bossTrigger.x = 165` — locks camera, spawns boss at x=175
- `endGate.x = 195`, `type = 'boss-cleared'`
- Boss HP: 300. Phase thresholds: P1 at 100%, P2 at 66%, P3 at 33%

## Stage 2 — "Industrial Fortress" (Authoring Guide)

**Setting:** factory/industrial. Denser enemy mix, more turrets, more vertical platforms.

**Layout sketch (250 world units):**

```
X:0────40──────90──────────140────────190──────────250
      ST         D T SS       D D T S     SS         [BOSS ARENA]
Ground: flat Y=0, with a gap at x=100–115 (pit — player must jump across)
Platforms: x=60 (y=4,w=12), x=100 (over pit, y=3,w=10), x=145 (y=6,w=15), x=170 (y=4,w=8)
```

| Spawn X | Type | Count | Notes |
|---------|------|-------|-------|
| 40 | soldier | 2 | |
| 55 | turret | 1 | elevated platform |
| 90 | drone | 1 | altitude=8 |
| 100 | turret | 1 | on pit-spanning platform |
| 110 | soldier | 2 | spread |
| 140 | drone | 2 | staggered |
| 150 | turret | 1 | |
| 160 | soldier | 1 | |
| 190 | soldier | 2 | |

- `bossTrigger.x = 210` — locks camera, spawns boss at x=220
- `endGate.x = 245`, `type = 'boss-cleared'`
- Boss HP: 500 (harder). Same 3-phase thresholds. Faster cadence across all phases.

## Difficulty Pacing Notes

- Stage 1 introduces one enemy type at a time — soldiers first, then turret, then drone
- Stage 2 mixes types earlier, adds verticality and a mandatory pit jump
- Boss arenas: camera locks, brief pause before boss spawns (0.5s) for dramatic effect
- No damage-sponge enemies — soldier = 1 hit, turret = 3 hits, drone = 2 hits

## Validation Conventions

Stage configs should satisfy these invariants:

1. All spawn `x` values < `bossTrigger.x`
2. `bossTrigger.x` < `endGate.x` < `length`
3. All platform `x` + `width` values < `length`
4. Exactly one `bossTrigger` per stage
5. `cameraMaxX` = `length` (default)

These are enforced via `bun test` schema checks in `stages/validate.test.ts`.

## Required Tests (see 07-testing-tdd.md)

- Stage 1 config passes all 5 invariants
- Stage 2 config passes all 5 invariants
- Spawn trigger: spawn at x=50 fires when `camera.x` crosses 50, not before
- Spawn trigger: already-fired spawn does not re-fire on stage reload
- Malformed config (missing endGate, spawn after boss trigger) fails validation with descriptive error
