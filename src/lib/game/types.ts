import type { GameEvent } from './events.js';

export type EntityType =
  | 'player'
  | 'enemy-soldier'
  | 'enemy-turret'
  | 'enemy-drone'
  | 'bullet-player'
  | 'bullet-enemy'
  | 'grenade'
  | 'boss'
  | 'terrain'
  | 'end-gate';

export interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  alive: boolean;
  mesh: unknown;
  update(dt: number, world: World): void;
  // render hints (optional — consumed only by the render layer)
  onGround?: boolean;
  facingRight?: boolean;
  muzzleFlash?: number;
  phase?: number;
  invincible?: boolean;
  terrainKind?: 'ground' | 'platform';
  aimAngle?: number;
  telegraph?: boolean;
  alert?: boolean;
}

export interface ActionMap {
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
  grenade: boolean;
}

export interface World {
  entities: Entity[];
  actions: ActionMap;
  spawn(template: Partial<Entity> & { type: EntityType }): void;
  kill(entity: Entity): void;
  emit(event: GameEvent): void;
  camera: { x: number };
}

export type Screen = 'menu' | 'playing' | 'stage-clear' | 'game-over' | 'victory';
