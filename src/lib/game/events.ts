export type ExplosionKind = 'soldier' | 'turret' | 'drone' | 'boss' | 'grenade';

export type GameEvent =
  | { type: 'shoot'; x: number; y: number }
  | { type: 'grenade-throw'; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; kind?: ExplosionKind }
  | { type: 'jump' }
  | { type: 'player-hit' }
  | { type: 'enemy-death'; x: number; y: number; kind?: ExplosionKind }
  | { type: 'boss-phase'; phase: number }
  | { type: 'stage-clear' }
  | { type: 'game-over' };

export type GameEventListener = (event: GameEvent) => void;

export interface EventBus {
  emit(event: GameEvent): void;
  subscribe(listener: GameEventListener): () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Set<GameEventListener>();

  return {
    emit(event) {
      for (const fn of listeners) fn(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
