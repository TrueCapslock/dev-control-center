import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('emits to registered listeners', () => {
    const calls: string[] = [];
    bus.on('test', (msg: string) => calls.push(msg));
    bus.emit('test', 'hello');
    expect(calls).toEqual(['hello']);
  });

  it('emits to multiple listeners', () => {
    const results: number[] = [];
    bus.on('count', (n: number) => results.push(n * 2));
    bus.on('count', (n: number) => results.push(n * 3));
    bus.emit('count', 5);
    expect(results).toEqual([10, 15]);
  });

  it('supports off/unsubscribe', () => {
    const calls: string[] = [];
    const fn = (x: string) => calls.push(x);
    bus.on('e', fn);
    bus.emit('e', 'a');
    bus.off('e', fn);
    bus.emit('e', 'b');
    expect(calls).toEqual(['a']);
  });

  it('removeAll clears all listeners', () => {
    const calls: string[] = [];
    bus.on('x', () => calls.push('x'));
    bus.on('y', () => calls.push('y'));
    bus.removeAll();
    bus.emit('x');
    bus.emit('y');
    expect(calls).toEqual([]);
  });

  it('does nothing for unregistered events', () => {
    expect(() => bus.emit('nothing')).not.toThrow();
  });

  it('passes multiple arguments', () => {
    const args: any[] = [];
    bus.on('multi', (...a: any[]) => args.push(a));
    bus.emit('multi', 1, 'two', true);
    expect(args).toEqual([[1, 'two', true]]);
  });
});
