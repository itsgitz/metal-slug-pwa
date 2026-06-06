// Procedural chiptune background music — WebAudio lookahead scheduler
// ("tale of two clocks" pattern: setInterval drives scheduling against
// AudioContext.currentTime; every note is a fresh oscillator).

export type MusicTheme = 'jungle' | 'industrial';
export type MusicIntensity = 'normal' | 'boss';

export interface MusicPlayer {
  start(theme: MusicTheme): void;
  stop(): void;
  setIntensity(level: MusicIntensity): void;
  /** Advance the scheduler manually — called by the interval timer; exposed for tests. */
  tick(): void;
  dispose(): void;
}

interface Pattern {
  tempo: number;    // BPM
  lead: number[];   // 16 steps — freq in Hz, 0 = rest
  bass: number[];   // 16 steps — freq in Hz, 0 = rest
  hats: number[];   // 16 steps — 1 = hit, 0 = rest
}

// Note freqs (Hz)
const C3 = 131, E3 = 165, F3 = 175, G3 = 196, A3 = 220;
const C4 = 262, D4 = 294, E4 = 330, G4 = 392, A4 = 440;
const C5 = 523, D5 = 587, E5 = 659;

const PATTERNS: Record<MusicTheme, Record<MusicIntensity, Pattern>> = {
  jungle: {
    normal: {
      tempo: 140,
      lead: [C4, 0, E4, 0, G4, 0, A4, 0, G4, 0, E4, 0, D4, 0, C4, 0],
      bass: [C3, 0, 0, 0, G3, 0, 0, 0, A3, 0, 0, 0, G3, 0, 0, 0],
      hats: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    },
    boss: {
      tempo: 160,
      lead: [C5, 0, A4, C5, G4, 0, A4, 0, C5, D5, C5, A4, G4, 0, E4, G4],
      bass: [C3, C3, 0, C3, G3, G3, 0, G3, A3, A3, 0, A3, G3, G3, F3, F3],
      hats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
  },
  industrial: {
    normal: {
      tempo: 120,
      lead: [A3, 0, 0, C4, 0, 0, E4, 0, D4, 0, 0, C4, 0, 0, A3, 0],
      bass: [A3 / 2, 0, 0, 0, A3 / 2, 0, 0, 0, G3 / 2, 0, 0, 0, G3 / 2, 0, 0, 0],
      hats: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
    },
    boss: {
      tempo: 145,
      lead: [A4, 0, C5, A4, E5, 0, D5, C5, A4, 0, C5, D5, E5, D5, C5, A4],
      bass: [A3 / 2, A3 / 2, 0, A3 / 2, A3 / 2, A3 / 2, 0, A3 / 2, G3 / 2, G3 / 2, 0, G3 / 2, E3 / 2, E3 / 2, 0, E3 / 2],
      hats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
  },
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const CATCHUP_CLAMP_S = 0.5; // tab-background backlog guard

export function createMusicPlayer(ctx: AudioContext, musicGain: GainNode): MusicPlayer {
  let theme: MusicTheme = 'jungle';
  let intensity: MusicIntensity = 'normal';
  let playing = false;
  let step = 0;
  let nextNoteTime = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  function noteOn(type: OscillatorType, freq: number, t: number, dur: number, vol: number): void {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + dur);
  }

  function hatOn(t: number): void {
    const len = Math.ceil(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(filter);
    filter.connect(g);
    g.connect(musicGain);
    src.start(t);
    src.stop(t + 0.05);
  }

  function scheduleStep(s: number, t: number, pattern: Pattern): void {
    const stepDur = 60 / pattern.tempo / 4;
    if (pattern.lead[s] > 0) noteOn('square', pattern.lead[s], t, stepDur * 0.9, 0.16);
    if (pattern.bass[s] > 0) noteOn('triangle', pattern.bass[s], t, stepDur * 1.8, 0.28);
    if (pattern.hats[s] === 1) hatOn(t);
  }

  function tick(): void {
    if (!playing) return;
    const pattern = PATTERNS[theme][intensity];
    // clamp catch-up after tab backgrounding — don't schedule a backlog
    if (ctx.currentTime - nextNoteTime > CATCHUP_CLAMP_S) {
      nextNoteTime = ctx.currentTime;
    }
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      scheduleStep(step, nextNoteTime, pattern);
      nextNoteTime += 60 / pattern.tempo / 4;
      step = (step + 1) % 16;
    }
  }

  return {
    start(t: MusicTheme): void {
      theme = t;
      intensity = 'normal';
      step = 0;
      nextNoteTime = ctx.currentTime + 0.05;
      playing = true;
      if (!timer) timer = setInterval(tick, LOOKAHEAD_MS);
    },

    stop(): void {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
    },

    setIntensity(level: MusicIntensity): void {
      intensity = level;
    },

    tick,

    dispose(): void {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
    },
  };
}
