import { test, expect, describe } from 'bun:test';
import { createMusicPlayer } from './music.js';

function makeMockContext() {
  const nodes: any[] = [];

  const ctx: any = {
    currentTime: 0,
    sampleRate: 44100,
    createGain() {
      const g = {
        gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
      };
      nodes.push({ type: 'gain', node: g });
      return g;
    },
    createOscillator() {
      const o = {
        type: 'sine',
        frequency: { value: 440 },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
      nodes.push({ type: 'oscillator', node: o });
      return o;
    },
    createBiquadFilter() {
      const f = { type: 'lowpass', frequency: { value: 0 }, connect: () => {} };
      nodes.push({ type: 'filter', node: f });
      return f;
    },
    createBuffer(_ch: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() {
      const s = { buffer: null, connect: () => {}, start: () => {}, stop: () => {} };
      nodes.push({ type: 'source', node: s });
      return s;
    },
  };

  const musicGain: any = { connect: () => {}, gain: { value: 1 } };

  return { ctx, musicGain, nodes };
}

describe('createMusicPlayer', () => {
  test('tick before start schedules nothing', () => {
    const { ctx, musicGain, nodes } = makeMockContext();
    const m = createMusicPlayer(ctx, musicGain);
    m.tick();
    expect(nodes.length).toBe(0);
    m.dispose();
  });

  test('start + tick schedules oscillator notes', () => {
    const { ctx, musicGain, nodes } = makeMockContext();
    const m = createMusicPlayer(ctx, musicGain);
    m.start('jungle');
    m.tick();
    // jungle normal step 0 has lead + bass + hat
    const oscs = nodes.filter(n => n.type === 'oscillator');
    expect(oscs.length).toBeGreaterThan(0);
    m.dispose();
  });

  test('stop halts scheduling', () => {
    const { ctx, musicGain, nodes } = makeMockContext();
    const m = createMusicPlayer(ctx, musicGain);
    m.start('jungle');
    m.tick();
    m.stop();
    const count = nodes.length;
    ctx.currentTime += 1;
    m.tick();
    expect(nodes.length).toBe(count);
    m.dispose();
  });

  test('catch-up clamp prevents backlog after long gap', () => {
    const { ctx, musicGain, nodes } = makeMockContext();
    const m = createMusicPlayer(ctx, musicGain);
    m.start('industrial');
    m.tick();
    const before = nodes.length;
    // simulate tab backgrounded 30s — without clamp this would schedule ~960 steps
    ctx.currentTime += 30;
    m.tick();
    const scheduled = nodes.length - before;
    // only the ~0.1s lookahead window should be scheduled (few steps, each ≤3 nodes + gains)
    expect(scheduled).toBeLessThan(30);
    m.dispose();
  });

  test('setIntensity does not throw and scheduling continues', () => {
    const { ctx, musicGain, nodes } = makeMockContext();
    const m = createMusicPlayer(ctx, musicGain);
    m.start('jungle');
    m.tick();
    m.setIntensity('boss');
    ctx.currentTime += 0.2;
    m.tick();
    expect(nodes.length).toBeGreaterThan(0);
    m.dispose();
  });
});
