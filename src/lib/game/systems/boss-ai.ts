interface BossPhase {
  hpThreshold: number; // fraction 0–1
  pattern: 'slow' | 'spread' | 'rush';
  cadence: number; // ms between shots
  speed: number;
}

const PHASES: BossPhase[] = [
  { hpThreshold: 1.0, pattern: 'slow',   cadence: 2000, speed: 1.0 },
  { hpThreshold: 0.66, pattern: 'spread', cadence: 1200, speed: 2.0 },
  { hpThreshold: 0.33, pattern: 'rush',   cadence: 800,  speed: 3.5 },
];

interface BossAIOptions {
  onStageClear?(): void;
}

export interface BossAI {
  phase: number;
  cadence: number;
  speed: number;
  pattern: BossPhase['pattern'];
  update(currentHp: number): void;
}

export function createBossAI(maxHp: number, options: BossAIOptions = {}): BossAI {
  const { onStageClear } = options;
  let phase = 1;
  let cleared = false;

  function phaseFor(hp: number): number {
    const ratio = hp / maxHp;
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (ratio <= PHASES[i].hpThreshold) return i + 1;
    }
    return 1;
  }

  const state: BossAI = {
    phase: 1,
    cadence: PHASES[0].cadence,
    speed: PHASES[0].speed,
    pattern: PHASES[0].pattern,

    update(currentHp: number): void {
      const newPhase = phaseFor(currentHp);
      if (newPhase !== phase) {
        phase = newPhase;
        state.phase = phase;
        const def = PHASES[phase - 1];
        state.cadence = def.cadence;
        state.speed = def.speed;
        state.pattern = def.pattern;
      }

      if (currentHp <= 0 && !cleared) {
        cleared = true;
        onStageClear?.();
      }
    },
  };

  return state;
}
