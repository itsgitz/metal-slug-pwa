import type { GameEvent } from '../events.js';

export interface AudioEngine {
  play(event: GameEvent): void;
  resume(): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

type AudioContextFactory = () => AudioContext;

function defaultContextFactory(): AudioContext {
  return new AudioContext();
}

function noise(ctx: AudioContext, duration: number, freq: number): AudioBufferSourceNode {
  const len = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function osc(ctx: AudioContext, type: OscillatorType, freq: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

export function createAudioEngine(contextFactory: AudioContextFactory = defaultContextFactory): AudioEngine {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = false;

  function getCtx(): { ctx: AudioContext; master: GainNode } {
    if (!ctx) {
      ctx = contextFactory();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.3;
      master.connect(ctx.destination);
    }
    return { ctx, master: master! };
  }

  function playShoot(): void {
    const { ctx: c, master: m } = getCtx();
    const o = osc(c, 'square', 280);
    const g = c.createGain();
    g.gain.setValueAtTime(0.4, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
    o.connect(g);
    g.connect(m);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.08);
  }

  function playGrenadeThrow(): void {
    const { ctx: c, master: m } = getCtx();
    const o = osc(c, 'sine', 400);
    const g = c.createGain();
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    o.frequency.linearRampToValueAtTime(180, c.currentTime + 0.18);
    o.connect(g);
    g.connect(m);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.18);
  }

  function playExplosion(): void {
    const { ctx: c, master: m } = getCtx();
    const src = noise(c, 0.5, 0);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.4);
    const g = c.createGain();
    g.gain.setValueAtTime(0.8, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    src.connect(filter);
    filter.connect(g);
    g.connect(m);
    src.start(c.currentTime);
    src.stop(c.currentTime + 0.5);
  }

  function playJump(): void {
    const { ctx: c, master: m } = getCtx();
    const o = osc(c, 'triangle', 180);
    const g = c.createGain();
    g.gain.setValueAtTime(0.3, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    o.frequency.linearRampToValueAtTime(350, c.currentTime + 0.15);
    o.connect(g);
    g.connect(m);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.15);
  }

  function playPlayerHit(): void {
    const { ctx: c, master: m } = getCtx();
    const o = osc(c, 'square', 90);
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    const distFreq = c.createBiquadFilter();
    distFreq.type = 'highpass';
    distFreq.frequency.value = 200;
    o.connect(distFreq);
    distFreq.connect(g);
    g.connect(m);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.2);
  }

  function playEnemyDeath(): void {
    const { ctx: c, master: m } = getCtx();
    const src = noise(c, 0.2, 0);
    const o = osc(c, 'square', 200);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    o.frequency.linearRampToValueAtTime(80, c.currentTime + 0.2);
    o.connect(g);
    src.connect(g);
    g.connect(m);
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.2);
    src.start(c.currentTime);
    src.stop(c.currentTime + 0.2);
  }

  function playBossPhase(): void {
    const { ctx: c, master: m } = getCtx();
    const notes = [300, 250];
    notes.forEach((freq, i) => {
      const o = osc(c, 'sawtooth', freq);
      const g = c.createGain();
      const t = c.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g);
      g.connect(m);
      o.start(t);
      o.stop(t + 0.16);
    });
  }

  function playStageClear(): void {
    const { ctx: c, master: m } = getCtx();
    const notes = [262, 330, 392, 523];
    notes.forEach((freq, i) => {
      const o = osc(c, 'square', freq);
      const g = c.createGain();
      const t = c.currentTime + i * 0.13;
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g);
      g.connect(m);
      o.start(t);
      o.stop(t + 0.12);
    });
  }

  function playGameOver(): void {
    const { ctx: c, master: m } = getCtx();
    const notes = [392, 330, 262, 196];
    notes.forEach((freq, i) => {
      const o = osc(c, 'triangle', freq);
      const g = c.createGain();
      const t = c.currentTime + i * 0.2;
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g);
      g.connect(m);
      o.start(t);
      o.stop(t + 0.18);
    });
  }

  return {
    play(event: GameEvent): void {
      if (muted) return;
      try {
        switch (event.type) {
          case 'shoot': playShoot(); break;
          case 'grenade-throw': playGrenadeThrow(); break;
          case 'explosion': playExplosion(); break;
          case 'jump': playJump(); break;
          case 'player-hit': playPlayerHit(); break;
          case 'enemy-death': playEnemyDeath(); break;
          case 'boss-phase': playBossPhase(); break;
          case 'stage-clear': playStageClear(); break;
          case 'game-over': playGameOver(); break;
        }
      } catch {
        // silently ignore audio errors (context not ready etc.)
      }
    },

    resume(): void {
      if (ctx?.state === 'suspended') ctx.resume();
      if (!ctx) getCtx(); // lazy init on first gesture
    },

    setMuted(m: boolean): void {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.3;
    },

    dispose(): void {
      ctx?.close();
      ctx = null;
      master = null;
    },
  };
}
