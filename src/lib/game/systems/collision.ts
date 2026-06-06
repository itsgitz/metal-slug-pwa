import type { Entity, World } from '../types.js';

export function overlaps(a: Entity, b: Entity): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function inSplashRadius(grenade: Entity, target: Entity, radius: number): boolean {
  const cx = grenade.x + grenade.w / 2;
  const cy = grenade.y + grenade.h / 2;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;
  return Math.hypot(cx - tx, cy - ty) <= radius;
}

export function resolveTerrainLanding(player: Entity, terrain: Entity): void {
  player.y = terrain.y + terrain.h;
  player.vy = 0;
}

export interface CollisionContext {
  score: number;
  lives: number;
  onScoreChange(points: number): void;
  onLivesChange(lives: number): void;
  onGameOver(): void;
  onStageClear?(): void;
}

const SCORE_TABLE: Partial<Record<Entity['type'], number>> = {
  'enemy-soldier': 100,
  'enemy-turret': 200,
  'enemy-drone': 150,
};

const triggeredGates = new WeakSet<Entity>();

export function processCollisions(world: World, ctx: CollisionContext): void {
  const { entities } = world;

  for (let i = 0; i < entities.length; i++) {
    const a = entities[i];
    if (!a.alive) continue;

    for (let j = i + 1; j < entities.length; j++) {
      const b = entities[j];
      if (!b.alive) continue;
      if (!overlaps(a, b)) continue;

      const pair = `${a.type}|${b.type}`;

      switch (pair) {
        // player bullet kills enemy
        case 'bullet-player|enemy-soldier':
        case 'bullet-player|enemy-turret':
        case 'bullet-player|enemy-drone':
        case 'bullet-player|boss': {
          world.kill(a);
          world.kill(b);
          const pts = SCORE_TABLE[b.type as Entity['type']];
          if (pts) ctx.onScoreChange(pts);
          break;
        }
        case 'enemy-soldier|bullet-player':
        case 'enemy-turret|bullet-player':
        case 'enemy-drone|bullet-player':
        case 'boss|bullet-player': {
          world.kill(b);
          world.kill(a);
          const pts = SCORE_TABLE[a.type as Entity['type']];
          if (pts) ctx.onScoreChange(pts);
          break;
        }

        // enemy bullet hits player
        case 'bullet-enemy|player':
        case 'player|bullet-enemy': {
          const bullet = a.type === 'bullet-enemy' ? a : b;
          world.kill(bullet);
          const next = ctx.lives - 1;
          ctx.onLivesChange(next);
          if (next <= 0) ctx.onGameOver();
          break;
        }

        // player touches enemy
        case 'player|enemy-soldier':
        case 'player|enemy-turret':
        case 'player|enemy-drone':
        case 'player|boss':
        case 'enemy-soldier|player':
        case 'enemy-turret|player':
        case 'enemy-drone|player':
        case 'boss|player': {
          const next = ctx.lives - 1;
          ctx.onLivesChange(next);
          if (next <= 0) ctx.onGameOver();
          break;
        }

        // terrain landing
        case 'player|terrain':
        case 'terrain|player': {
          const player = a.type === 'player' ? a : b;
          const terrain = a.type === 'terrain' ? a : b;
          resolveTerrainLanding(player, terrain);
          break;
        }

        // end gate
        case 'player|end-gate':
        case 'end-gate|player': {
          const gate = a.type === 'end-gate' ? a : b;
          if (!triggeredGates.has(gate)) {
            triggeredGates.add(gate);
            ctx.onStageClear?.();
          }
          break;
        }
      }
    }
  }
}
