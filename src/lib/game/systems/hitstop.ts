export interface HitStop {
  freeze(ticks: number): void;
  tick(): boolean;
}

export function createHitStop(): HitStop {
  let remaining = 0;

  return {
    freeze(ticks: number): void {
      remaining = Math.max(remaining, ticks);
    },

    tick(): boolean {
      if (remaining > 0) {
        remaining--;
        return true;
      }
      return false;
    },
  };
}
