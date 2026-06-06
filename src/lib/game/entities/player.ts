import type { Entity, World } from '../types.js';

const GRAVITY = 30;
const MOVE_SPEED = 8;
const JUMP_FORCE = 15;
const BULLET_COOLDOWN = 200; // ms
const GRENADE_COOLDOWN = 800; // ms
const INVINCIBILITY_DURATION = 1500; // ms
export const PIT_DEATH_Y = -5;

let nextId = 1;

export interface PlayerEntity extends Entity {
  type: 'player';
  hp: number;
  onGround: boolean;
  invincible: boolean;
  invincibleTimer: number;
  bulletCooldown: number;
  grenadeCooldown: number;
  facingRight: boolean;
}

export function createPlayer(x: number, y: number): PlayerEntity {
  return {
    id: nextId++,
    type: 'player',
    x, y,
    vx: 0, vy: 0,
    w: 1, h: 2,
    alive: true,
    mesh: null,
    hp: 1,
    onGround: false,
    invincible: false,
    invincibleTimer: 0,
    bulletCooldown: 0,
    grenadeCooldown: 0,
    facingRight: true,

    update(dt: number, world: World): void {
      const { actions } = world;

      // movement
      if (actions.left) { this.vx = -MOVE_SPEED; this.facingRight = false; }
      else if (actions.right) { this.vx = MOVE_SPEED; this.facingRight = true; }
      else this.vx = 0;

      // jump
      if (actions.jump && this.onGround) {
        this.vy = JUMP_FORCE;
        this.onGround = false;
        world.emit({ type: 'jump' });
      }

      // gravity
      this.vy -= GRAVITY * (dt / 1000);

      // integrate
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);

      // invincibility timer
      if (this.invincible) {
        this.invincibleTimer -= dt;
        if (this.invincibleTimer <= 0) this.invincible = false;
      }

      // cooldowns
      if (this.bulletCooldown > 0) this.bulletCooldown -= dt;
      if (this.grenadeCooldown > 0) this.grenadeCooldown -= dt;

      // shoot
      if (actions.shoot && this.bulletCooldown <= 0) {
        this.bulletCooldown = BULLET_COOLDOWN;
        this.muzzleFlash = 80;
        const bx = this.x + (this.facingRight ? this.w : -0.5);
        world.spawn({ type: 'bullet-player', x: bx, y: this.y + 0.8, vx: this.facingRight ? 20 : -20, vy: 0, w: 0.5, h: 0.2 });
        world.emit({ type: 'shoot', x: bx, y: this.y + 0.8 });
      }

      // grenade
      if (actions.grenade && this.grenadeCooldown <= 0) {
        this.grenadeCooldown = GRENADE_COOLDOWN;
        world.spawn({ type: 'grenade', x: this.x + 0.5, y: this.y + 1, vx: this.facingRight ? 8 : -8, vy: 6, w: 0.4, h: 0.4 });
        world.emit({ type: 'grenade-throw', x: this.x + 0.5, y: this.y + 1 });
      }

      // muzzle flash countdown
      if (this.muzzleFlash && this.muzzleFlash > 0) this.muzzleFlash -= dt;
    },
  };
}

export function damagePlayer(player: PlayerEntity): void {
  if (!player.invincible) {
    player.invincible = true;
    player.invincibleTimer = INVINCIBILITY_DURATION;
  }
}

export const PLAYER_MOVE_SPEED = MOVE_SPEED;
export const PLAYER_JUMP_FORCE = JUMP_FORCE;
export const PLAYER_BULLET_COOLDOWN = BULLET_COOLDOWN;
