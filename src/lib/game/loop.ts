import type { Screen, World } from './types.js';

const FIXED_DT = 16; // ~60Hz, integer ms for clean accumulator math
const MAX_ELAPSED = 250;     // spiral-of-death guard

export interface LoopOptions {
  onUpdate?: (dt: number, world: World) => void;
  onRender?: (alpha: number, world: World) => void;
}

export interface LoopState {
  tick(elapsed: number, world: World): void;
  setScreen(screen: Screen): void;
  getScreen(): Screen;
  transition(screen: Screen): void;
  onResume(): void;
}

export function createLoop(options: LoopOptions): LoopState {
  const { onUpdate, onRender } = options;
  let screen: Screen = 'playing';
  let accumulator = 0;

  return {
    tick(elapsed: number, world: World): void {
      if (screen !== 'playing') return;

      const clamped = Math.min(elapsed, MAX_ELAPSED);
      accumulator += clamped;

      while (accumulator >= FIXED_DT) {
        onUpdate?.(FIXED_DT, world);
        accumulator -= FIXED_DT;
      }

      const alpha = accumulator / FIXED_DT;
      onRender?.(alpha, world);
    },

    setScreen(s: Screen): void {
      screen = s;
    },

    getScreen(): Screen {
      return screen;
    },

    transition(s: Screen): void {
      screen = s;
    },

    onResume(): void {
      accumulator = 0;
    },
  };
}
