import { test, expect, describe } from 'bun:test';
import { createEventBus } from './events.js';

describe('createEventBus()', () => {
  test('subscriber receives emitted event', () => {
    const bus = createEventBus();
    const received: string[] = [];
    bus.subscribe(e => received.push(e.type));
    bus.emit({ type: 'jump' });
    expect(received).toEqual(['jump']);
  });

  test('multiple subscribers all fire', () => {
    const bus = createEventBus();
    let a = 0, b = 0;
    bus.subscribe(() => a++);
    bus.subscribe(() => b++);
    bus.emit({ type: 'shoot', x: 0, y: 0 });
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  test('unsubscribe stops delivery', () => {
    const bus = createEventBus();
    const received: string[] = [];
    const unsub = bus.subscribe(e => received.push(e.type));
    bus.emit({ type: 'jump' });
    unsub();
    bus.emit({ type: 'game-over' });
    expect(received).toEqual(['jump']);
  });

  test('emit with payload passes event data', () => {
    const bus = createEventBus();
    let captured: any = null;
    bus.subscribe(e => { captured = e; });
    bus.emit({ type: 'explosion', x: 5, y: 3 });
    expect(captured).toEqual({ type: 'explosion', x: 5, y: 3 });
  });
});
