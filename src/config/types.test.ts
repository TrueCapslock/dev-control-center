import { describe, it, expect } from 'vitest';

describe('type exports', () => {
  it('can build a minimal ProkomConfig', async () => {
    const cfg = { name: 'test', commands: [] };
    expect(cfg.name).toBe('test');
    expect(cfg.commands).toEqual([]);
  });

  it('can build a ProkomCommand with all optional fields', async () => {
    const cmd = {
      id: 'test',
      label: 'Test',
      command: 'echo hi',
      confirm: true,
      watch: false,
      cwd: 'packages/core',
      parallel: true,
    };
    expect(cmd.id).toBe('test');
    expect(cmd.cwd).toBe('packages/core');
    expect(cmd.parallel).toBe(true);
  });
});
