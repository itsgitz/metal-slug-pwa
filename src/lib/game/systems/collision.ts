import type { Entity, World } from '../types.js';

type DamageablePlayer = Entity & { invincibleTimer?: number };

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

const SNAP_TOLERANCE = 0.5;

export function resolveTerrainLanding(player: Entity, terrain: Entity): void {
  const isGround = terrain.terrainKind === 'ground';
  const playerBottom = player.y;
  const terrainTop = terrain.y + terrain.h;

  // one-way platforms: only land when falling (vy <= 0) and coming from above
  if (!isGround && (player.vy > 0 || playerBottom < terrainTop - SNAP_TOLERANCE)) return;

  player.y = terrainTop;
  player.vy = 0;
  player.onGround = true;
}

export interface CollisionContext {
  score: number;
  lives: number;
  onScoreChange(points: number): void;
  onLivesChange(lives: number): void;
  onGameOver(): void;
  onStageClear?(): void;
}

export const BULLET_DAMAGE = 10;
export const GRENADE_DAMAGE = 50;
export const KNOCKBACK_VX = 8;
export const KNOCKBACK_VY = 5;
export const INVINCIBILITY_DURATION = 1500;

const SCORE_TABLE: Partial<Record<Entity['type'], number>> = {
  'enemy-soldier': 100,
  'enemy-turret': 200,
  'enemy-drone': 150,
  'boss': 5000,
};

const triggeredGates = new WeakSet<Entity>();

function deathKind(type: Entity['type']): 'soldier' | 'turret' | 'drone' | 'boss' {
  if (type === 'boss') return 'boss';
  return type.replace('enemy-', '') as 'soldier' | 'turret' | 'drone';
}

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
        // player bullet kills regular enemy
        case 'bullet-player|enemy-soldier':
        case 'bullet-player|enemy-turret':
        case 'bullet-player|enemy-drone': {
          world.kill(a);
          world.kill(b);
          world.emit({ type: 'enemy-death', x: b.x + b.w / 2, y: b.y + b.h / 2, kind: deathKind(b.type) });
          const pts = SCORE_TABLE[b.type as Entity['type']];
          if (pts) ctx.onScoreChange(pts);
          break;
        }
        case 'enemy-soldier|bullet-player':
        case 'enemy-turret|bullet-player':
        case 'enemy-drone|bullet-player': {
          world.kill(b);
          world.kill(a);
          world.emit({ type: 'enemy-death', x: a.x + a.w / 2, y: a.y + a.h / 2, kind: deathKind(a.type) });
          const pts = SCORE_TABLE[a.type as Entity['type']];
          if (pts) ctx.onScoreChange(pts);
          break;
        }

        // player bullet hits boss — decrement HP
        case 'bullet-player|boss': {
          world.kill(a);
          const boss = b as Entity & { hp: number };
          boss.hp -= BULLET_DAMAGE;
          if (boss.hp <= 0) {
            world.kill(boss);
            world.emit({ type: 'enemy-death', x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, kind: 'boss' });
            ctx.onScoreChange(SCORE_TABLE['boss']!);
            ctx.onStageClear?.();
          }
          break;
        }
        case 'boss|bullet-player': {
          world.kill(b);
          const boss = a as Entity & { hp: number };
          boss.hp -= BULLET_DAMAGE;
          if (boss.hp <= 0) {
            world.kill(boss);
            world.emit({ type: 'enemy-death', x: boss.x + boss.w / 2, y: boss.y + boss.h / 2, kind: 'boss' });
            ctx.onScoreChange(SCORE_TABLE['boss']!);
            ctx.onStageClear?.();
          }
          break;
        }

        // enemy bullet hits player
        case 'bullet-enemy|player':
        case 'player|bullet-enemy': {
          const bullet = a.type === 'bullet-enemy' ? a : b;
          const player = a.type === 'player' ? a : b;
          if (player.invincible) { world.kill(bullet); break; }
          world.kill(bullet);
          // knockback — push away from bullet travel direction
          const kbDir = bullet.vx >= 0 ? -1 : 1;
          player.vx = kbDir * KNOCKBACK_VX;
          player.vy = KNOCKBACK_VY;
          // i-frames
          player.invincible = true;
          (player as DamageablePlayer).invincibleTimer = INVINCIBILITY_DURATION;
          world.emit({ type: 'player-hit' });
          const next = ctx.lives - 1;
          ctx.onLivesChange(next);
          if (next <= 0) { ctx.onGameOver(); world.emit({ type: 'game-over' }); }
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
          const player = a.type === 'player' ? a : b;
          const enemy = a.type !== 'player' ? a : b;
          if (player.invincible) break;
          // knockback — push player away from enemy
          const kbDir = player.x < enemy.x ? -1 : 1;
          player.vx = kbDir * KNOCKBACK_VX;
          player.vy = KNOCKBACK_VY;
          player.invincible = true;
          (player as DamageablePlayer).invincibleTimer = INVINCIBILITY_DURATION;
          world.emit({ type: 'player-hit' });
          const next = ctx.lives - 1;
          ctx.onLivesChange(next);
          if (next <= 0) { ctx.onGameOver(); world.emit({ type: 'game-over' }); }
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
