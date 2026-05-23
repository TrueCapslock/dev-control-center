import { describe, it, expect, beforeEach } from 'vitest';
import { PluginManager } from './manager.js';
import type { Plugin } from './types.js';

describe('PluginManager', () => {
  let pm: PluginManager;

  beforeEach(() => {
    pm = new PluginManager();
  });

  it('registers and retrieves a plugin', () => {
    pm.register({ id: 'p1', name: 'Plugin 1' });
    expect(pm.get('p1')?.name).toBe('Plugin 1');
  });

  it('returns all plugins', () => {
    pm.register({ id: 'a', name: 'A' });
    pm.register({ id: 'b', name: 'B' });
    expect(pm.getAll().length).toBe(2);
  });

  it('removes a plugin', () => {
    pm.register({ id: 'x', name: 'X' });
    expect(pm.remove('x')).toBe(true);
    expect(pm.get('x')).toBeUndefined();
  });

  it('returns false when removing nonexistent plugin', () => {
    expect(pm.remove('nope')).toBe(false);
  });

  it('executes a hook on all registered plugins', async () => {
    const calls: string[] = [];
    pm.register({
      id: 'a',
      name: 'A',
      hooks: { beforeRun: () => { calls.push('a-before'); } },
    });
    pm.register({
      id: 'b',
      name: 'B',
      hooks: { beforeRun: () => { calls.push('b-before'); } },
    });
    await pm.executeHook('beforeRun', { id: 'test', label: 'T', command: 't' });
    expect(calls).toEqual(['a-before', 'b-before']);
  });

  it('handles async hooks', async () => {
    const order: number[] = [];
    pm.register({
      id: 'slow',
      name: 'Slow',
      hooks: {
        beforeRun: async () => {
          await new Promise((r) => setTimeout(r, 10));
          order.push(1);
        },
      },
    });
    pm.register({
      id: 'fast',
      name: 'Fast',
      hooks: { beforeRun: () => { order.push(2); } },
    });
    await pm.executeHook('beforeRun', { id: 'x', label: 'X', command: 'x' });
    expect(order).toEqual([1, 2]);
  });

  it('does not throw when a hook fails', async () => {
    pm.register({
      id: 'bad',
      name: 'Bad',
      hooks: { beforeRun: () => { throw new Error('fail'); } },
    });
    await expect(
      pm.executeHook('beforeRun', { id: 'x', label: 'X', command: 'x' }),
    ).resolves.toBeUndefined();
  });

  it('skips plugin with no hooks for the requested hook', async () => {
    pm.register({ id: 'none', name: 'None' });
    await pm.executeHook('beforeRun', { id: 'x', label: 'X', command: 'x' });
  });

  it('loads nothing when pluginNames is empty', async () => {
    await pm.loadFromConfig();
    await pm.loadFromConfig([]);
    expect(pm.getAll().length).toBe(0);
  });
});
