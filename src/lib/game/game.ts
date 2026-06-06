import type { Entity, World, ActionMap } from './types.js';
import type { StageConfig } from './stages/types.js';
import { createEventBus } from './events.js';
import type { GameEvent, GameEventListener } from './events.js';
import { createLoop } from './loop.js';
import { createActionMap, KeyboardAdapter, consumeEdges } from './systems/input.js';
import { processCollisions } from './systems/collision.js';
import { Scoring } from './systems/scoring.js';
import { createSpawnManager } from './systems/spawning.js';
import { createHitStop } from './systems/hitstop.js';
import { createPlayer } from './entities/player.js';
import { createSoldier, createTurret, createDrone } from './entities/enemies.js';
import { createBoss } from './entities/boss.js';
import { createBullet } from './entities/bullet.js';
import { createGrenade } from './entities/grenade.js';
import { createGround, createPlatform } from './entities/terrain.js';
import { PIT_DEATH_Y } from './entities/player.js';
import { gameState, setScreen, addScore, setLives, setBossHp, advanceStage, resetForStage } from './state.svelte.js';
import { stage1 } from './stages/stage-1.js';
import { stage2 } from './stages/stage-2.js';

const STAGES: StageConfig[] = [stage1, stage2];
let entityIdCounter = 10000;

export interface GameInstance {
  start(): void;
  stop(): void;
  getActions(): ActionMap;
  getEntities(): Entity[];
  getCameraX(): number;
  setHalfView(n: number): void;
  onResize(): void;
  subscribe(listener: GameEventListener): () => void;
}

export function createGame(
  canvas: HTMLElement,
  onRender: (entities: Entity[], alpha: number, cameraX: number) => void,
): GameInstance {
  let entities: Entity[] = [];
  let cameraX = 0;
  let halfView = 10;
  const actions = createActionMap();
  const kb = new KeyboardAdapter(actions);
  const bus = createEventBus();
  const hitStop = createHitStop();

  // hit-stop: freeze on enemy/boss death
  bus.subscribe((event) => {
    if (event.type === 'enemy-death') hitStop.freeze(3);
  });

  let scoring = new Scoring(3);
  let stageIndex = 0;
  let bossLocked = false;
  let bossLockX = 0;
  let bossSpawned = false;
  let lastBossPhase = 0;
  let spawnMgr = createSpawnManager([], { onSpawn: () => {} });
  let rafId = 0;
  let lastTime = 0;

  const loop = createLoop({
    onUpdate(dt: number, world: World): void {
      // hit-stop: skip entity updates on frozen frames (render still runs)
      if (hitStop.tick()) return;

      // update all entities
      for (const ent of entities) {
        if (ent.alive) ent.update(dt, world);
      }

      // process collisions
      processCollisions(world, {
        score: scoring.score,
        lives: scoring.lives,
        onScoreChange(pts) { scoring.onEnemyKilled('enemy-soldier'); addScore(pts); },
        onLivesChange(lives) { scoring.lives = lives; setLives(lives); },
        onGameOver() { loop.transition('game-over'); setScreen('game-over'); scoring.saveHiScore(); },
        onStageClear() { handleStageClear(); },
      });

      // spawning
      spawnMgr.update(cameraX);

      // boss trigger
      const stage = STAGES[stageIndex];
      if (!bossSpawned && cameraX >= stage.bossTrigger.x) {
        bossSpawned = true;
        bossLocked = true;
        bossLockX = stage.bossTrigger.bossSpawnX;
        entities.push(createBoss(stage.bossTrigger.bossSpawnX, stage.bossTrigger.bossSpawnY, stage.bossHp, () => handleStageClear()));
        // spawn end-gate entity (collision handler already handles it)
        entities.push({
          id: entityIdCounter++,
          type: 'end-gate',
          x: stage.endGate.x, y: 0, vx: 0, vy: 0, w: 2, h: 4,
          alive: true, mesh: null,
          update() {},
        });
      }

      // boss HP sync + phase-change events
      const boss = entities.find(e => e.type === 'boss' && e.alive) as any;
      if (boss) {
        setBossHp(boss.hp, boss.hpMax);
        if (boss.phase !== lastBossPhase) {
          lastBossPhase = boss.phase;
          bus.emit({ type: 'boss-phase', phase: boss.phase });
        }
      }

      // pit death check
      const player = entities.find(e => e.type === 'player' && e.alive) as any;
      if (player && player.y < PIT_DEATH_Y) {
        world.kill(player);
        const next = scoring.lives - 1;
        scoring.lives = next;
        setLives(next);
        bus.emit({ type: 'player-hit' });
        if (next <= 0) {
          loop.transition('game-over');
          setScreen('game-over');
          scoring.saveHiScore();
          bus.emit({ type: 'game-over' });
        } else {
          // respawn at stage start
          entities.push(createPlayer(5, 1));
        }
      }

      // camera follow (re-find in case of respawn)
      const livePlayer = entities.find(e => e.type === 'player' && e.alive) as any;
      if (livePlayer) {
        const dir = livePlayer.facingRight ? 1 : -1;
        const target = bossLocked
          ? bossLockX
          : Math.max(stage.cameraMinX + halfView, Math.min(stage.cameraMaxX - halfView, livePlayer.x + dir * 3));
        cameraX += (target - cameraX) * 0.1;
      }

      // dead-sweep
      entities = entities.filter(e => e.alive);

      // consume edge inputs
      consumeEdges(actions);
    },

    onRender(alpha: number): void {
      onRender(entities, alpha, cameraX);
    },
  });

  const world: World = {
    get entities() { return entities; },
    actions,
    spawn(template) {
      const ent = buildEntity(template);
      if (ent) entities.push(ent);
    },
    kill(e) { e.alive = false; },
    emit(event: GameEvent) { bus.emit(event); },
    camera: { get x() { return cameraX; } },
  };

  function buildEntity(template: Partial<Entity> & { type: Entity['type'] }): Entity | null {
    const id = entityIdCounter++;
    const base = { id, alive: true, mesh: null, vx: 0, vy: 0, w: 1, h: 1, update: () => {} };
    switch (template.type) {
      case 'bullet-player': return createBullet('bullet-player', template.x ?? 0, template.y ?? 0, template.vx ?? 0, template.vy ?? 0);
      case 'bullet-enemy': return createBullet('bullet-enemy', template.x ?? 0, template.y ?? 0, template.vx ?? 0, template.vy ?? 0);
      case 'grenade': return createGrenade(template.x ?? 0, template.y ?? 0, template.vx ?? 0, template.vy ?? 0);
      default: return null;
    }
  }

  function initStage(idx: number): void {
    stageIndex = idx;
    const stage = STAGES[idx];
    entities = [];
    bossLocked = false;
    bossLockX = 0;
    bossSpawned = false;
    lastBossPhase = 0;
    cameraX = stage.cameraMinX + halfView;

    // spawn terrain entities
    for (const seg of stage.ground) entities.push(createGround(seg));
    for (const p of stage.platforms) entities.push(createPlatform(p));

    entities.push(createPlayer(5, 1));

    spawnMgr = createSpawnManager(stage.spawns, {
      halfView,
      margin: 2,
      onSpawn(entry) {
        for (let i = 0; i < entry.count; i++) {
          const offsetX = i * 2;
          switch (entry.type) {
            case 'enemy-soldier': entities.push(createSoldier(entry.x + offsetX, 1)); break;
            case 'enemy-turret': entities.push(createTurret(entry.x + offsetX, 1)); break;
            case 'enemy-drone': entities.push(createDrone(entry.x + offsetX, 0, entry.altitude ?? 6)); break;
          }
        }
      },
    });

    resetForStage(idx);
    setScreen('playing');
    loop.setScreen('playing');
  }

  function handleStageClear(): void {
    scoring.onStageClear();
    addScore(1000 * scoring.lives);

    if (stageIndex < STAGES.length - 1) {
      loop.transition('stage-clear');
      setScreen('stage-clear');
      setTimeout(() => initStage(stageIndex + 1), 3000);
    } else {
      loop.transition('victory');
      setScreen('victory');
      scoring.saveHiScore();
    }
  }

  function gameLoop(timestamp: number): void {
    const elapsed = lastTime ? timestamp - lastTime : 0;
    lastTime = timestamp;
    loop.tick(elapsed, world);
    rafId = requestAnimationFrame(gameLoop);
  }

  const detachKb = kb.attach(canvas.ownerDocument!);

  return {
    start(): void {
      scoring = new Scoring(3);
      setLives(3);
      addScore(-gameState.score); // reset score
      scoring.score = 0;
      gameState.score = 0;
      gameState.hiScore = scoring.loadHiScore();
      initStage(0);
      lastTime = 0;
      rafId = requestAnimationFrame(gameLoop);
    },

    stop(): void {
      cancelAnimationFrame(rafId);
      detachKb();
      loop.transition('menu');
    },

    getActions: () => actions,
    getEntities: () => entities,
    getCameraX: () => cameraX,
    setHalfView(n: number): void { halfView = n; },
    onResize(): void { /* handled by scene resize */ },
    subscribe: (listener) => bus.subscribe(listener),
  };
}
