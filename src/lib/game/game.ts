import type { Entity, World, ActionMap } from './types.js';
import type { StageConfig } from './stages/types.js';
import { createLoop } from './loop.js';
import { createActionMap, KeyboardAdapter, consumeEdges } from './systems/input.js';
import { processCollisions } from './systems/collision.js';
import { Scoring } from './systems/scoring.js';
import { createSpawnManager } from './systems/spawning.js';
import { createPlayer } from './entities/player.js';
import { createSoldier, createTurret, createDrone } from './entities/enemies.js';
import { createBoss } from './entities/boss.js';
import { createBullet } from './entities/bullet.js';
import { createGrenade } from './entities/grenade.js';
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
  onResize(): void;
}

export function createGame(
  canvas: HTMLElement,
  onRender: (entities: Entity[], alpha: number, cameraX: number) => void,
): GameInstance {
  let entities: Entity[] = [];
  let cameraX = 0;
  const actions = createActionMap();
  const kb = new KeyboardAdapter(actions);

  let scoring = new Scoring(3);
  let stageIndex = 0;
  let bossLocked = false;
  let bossLockX = 0;
  let spawnMgr = createSpawnManager([], { onSpawn: () => {} });
  let rafId = 0;
  let lastTime = 0;

  const loop = createLoop({
    onUpdate(dt: number, world: World): void {
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

      // boss HP sync
      const boss = entities.find(e => e.type === 'boss' && e.alive) as any;
      if (boss) setBossHp(boss.hp, boss.hpMax);

      // camera follow
      const player = entities.find(e => e.type === 'player' && e.alive) as any;
      if (player) {
        const stage = STAGES[stageIndex];
        const dir = player.facingRight ? 1 : -1;
        const halfView = 10;
        const target = bossLocked
          ? bossLockX
          : Math.max(stage.cameraMinX + halfView, Math.min(stage.cameraMaxX - halfView, player.x + dir * 3));
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
    cameraX = stage.cameraMinX + 10;

    entities.push(createPlayer(5, 1));

    spawnMgr = createSpawnManager(stage.spawns, {
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
    onResize(): void { /* handled by scene resize */ },
  };
}
