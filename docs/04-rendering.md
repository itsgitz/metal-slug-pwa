# Rendering

## Three.js Setup

```typescript
// Conceptual configuration — render/scene.ts
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))  // cap at 2x for performance
renderer.setSize(containerWidth, containerHeight)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87CEEB)  // sky blue placeholder
```

The renderer's `domElement` canvas is appended to a container div by `+page.svelte`. Svelte never owns this canvas element.

## Orthographic Camera

Side-scrolling 2.5D uses an orthographic (no perspective distortion) camera positioned along the Z-axis looking at the XY plane.

```typescript
// World units: 1 unit = 1 meter equivalent
const FRUSTUM_HEIGHT = 20  // visible vertical world units
const aspect = containerWidth / containerHeight

const camera = new THREE.OrthographicCamera(
  -FRUSTUM_HEIGHT * aspect / 2,   // left
   FRUSTUM_HEIGHT * aspect / 2,   // right
   FRUSTUM_HEIGHT / 2,            // top
  -FRUSTUM_HEIGHT / 2,            // bottom
  0.1, 100
)
camera.position.set(0, 0, 50)
camera.lookAt(0, 0, 0)
```

**World unit convention:** 1 world unit = ~1 meter. Player height = ~2 units. Stage length = 200–300 units. All terrain, spawn coordinates, and camera values share this convention.

### Camera Follow

Camera tracks player horizontally with:
- **Clamped bounds:** camera X stays within `[stageStart + halfView, stageEnd - halfView]` to avoid showing void
- **Look-ahead:** camera leads slightly in the movement direction (`targetX = player.x + direction * 3`)
- **Smoothing:** lerp toward target position (`camera.x += (target - camera.x) * 0.1`) for smooth follow
- **Boss arena lock:** when boss is active, horizontal scroll stops; camera is fixed at boss spawn X

```typescript
// Per render frame — render/camera.ts
function updateCamera(camera: THREE.OrthographicCamera, player: Entity, stage: StageConfig) {
  const halfView = (camera.right - camera.left) / 2
  const lookAhead = player.vx > 0 ? 3 : player.vx < 0 ? -3 : 0
  const targetX = player.x + lookAhead
  const clampedX = clamp(targetX, stage.cameraMinX + halfView, stage.cameraMaxX - halfView)
  camera.position.x += (clampedX - camera.position.x) * 0.1
}
```

## Scene Layer Structure

Layers are separated by Z-depth to control draw order without manual sorting.

| Z position | Layer | Contents |
|-----------|-------|----------|
| 0 | Background 1 (far) | Sky color, distant hills — scrolls at 0.2× camera speed |
| 5 | Background 2 (near) | Buildings, foliage — scrolls at 0.5× camera speed |
| 10 | Terrain | Ground, platforms, walls |
| 15 | Gameplay | Player, enemies, bullets, grenades, boss |
| 20 | FX/Foreground | Muzzle flash, explosions, particles |

Parallax scrolling: background layer positions are updated each render frame as a fraction of the camera's X offset from origin.

## Procedural Mesh Recipes

All geometry is generated from Three.js primitives — no external assets. Each entity type has a factory function in `render/factories/`.

### Player

```
Head:    BoxGeometry(0.8, 0.8, 0.8) — tan/skin color
Body:    BoxGeometry(1.0, 1.2, 0.8) — olive green
Legs:    BoxGeometry(0.4, 0.8, 0.6) × 2 — dark brown
Gun:     BoxGeometry(1.2, 0.2, 0.2) — dark gray, offset right
```

Group all parts into a `THREE.Group` anchored at foot level. Flip group scaleX when facing left.

### Enemy: Soldier

```
Head:    BoxGeometry(0.7, 0.7, 0.7) — tan, with CylinderGeometry helmet
Body:    BoxGeometry(0.9, 1.1, 0.8) — dark olive
Gun:     BoxGeometry(0.9, 0.15, 0.15) — dark gray
```

### Enemy: Turret

```
Base:    CylinderGeometry(0.6, 0.8, 0.5, 8) — dark gray, static
Barrel:  BoxGeometry(1.4, 0.25, 0.25) — gray, rotates to aim at player
```

Barrel is a child of the turret Group; rotate it each frame toward player using `Math.atan2`.

### Enemy: Drone

```
Body:    BoxGeometry(1.0, 0.4, 0.6) — metallic gray
Wing L:  BoxGeometry(0.6, 0.1, 0.8) — dark gray, offset left
Wing R:  same, offset right
Engine:  CylinderGeometry(0.2, 0.2, 0.3, 6) × 2 — orange emissive
```

Drone hovers (sinusoidal Y oscillation each frame).

### Boss

Large composite group, phase 3 tints change as HP drops:

```
Core body:    BoxGeometry(3, 2.5, 1.5) — dark olive
Turret top:   CylinderGeometry(0.8, 1.0, 1.0, 8) — gray
Cannon:       BoxGeometry(3.5, 0.4, 0.4) — dark gray, rotates
Treads L/R:   BoxGeometry(0.4, 0.6, 1.8) × 2 — black
Phase 2 tint: emissive orange on body
Phase 3 tint: emissive red on body
```

### Terrain

```
Platform:  BoxGeometry(width, 1, 1) — brown/gray, MeshLambertMaterial
Ground:    BoxGeometry(stageLength, 2, 1) — earthy brown
```

### FX (Explosions / Muzzle Flash)

Pooled meshes reused across frames. Each "explosion" is 6–8 small `BoxGeometry` shards with randomized initial velocities, fading opacity over 300ms then returned to pool.

## Lighting

Minimal — avoids expensive shadows at this scale:

```typescript
const ambient = new THREE.AmbientLight(0xffffff, 0.8)
const directional = new THREE.DirectionalLight(0xffffff, 0.6)
directional.position.set(10, 20, 15)
scene.add(ambient, directional)
```

`MeshLambertMaterial` for most entities (reacts to lighting cheaply). Emissive materials for FX and boss phase indicators.

## Mesh Lifecycle

**Creation:** when an entity is added to the world, its factory function creates the mesh, adds it to the scene, and returns the mesh handle stored in `entity.mesh`.

**Update:** each `render(alpha)` call syncs mesh position from entity's interpolated position:
```typescript
mesh.position.x = lerp(entity.prevX, entity.x, alpha)
mesh.position.y = lerp(entity.prevY, entity.y, alpha)
```

**Destruction:** when `entity.alive === false`, the dead-sweep hook calls:
```typescript
scene.remove(mesh)
mesh.traverse(child => {
  if (child instanceof THREE.Mesh) {
    child.geometry.dispose()
    child.material.dispose()
  }
})
```

**Bullet pooling (recommended):** bullets are created and destroyed frequently. Maintain a pool of ~30 pre-created bullet meshes; `visible = false` when inactive, `visible = true` when assigned to a new bullet entity. Avoids GC pressure from frequent geometry allocation.

## Resize Handling

```typescript
function onResize(width: number, height: number) {
  renderer.setSize(width, height)
  const aspect = width / height
  camera.left   = -FRUSTUM_HEIGHT * aspect / 2
  camera.right  =  FRUSTUM_HEIGHT * aspect / 2
  camera.updateProjectionMatrix()
}
```

Listen to container's ResizeObserver (not `window.resize`) for accurate container dimensions. Pixel ratio cap stays at 2x.
