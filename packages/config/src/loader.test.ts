import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './loader.js';

describe('loadConfig', () => {
  const configPath = path.resolve(
    fileURLToPath(new URL('../../../prokom.config.js', import.meta.url)),
  );

  it('returns default config when no config file exists', async () => {
    const cwd = process.cwd;
    process.cwd = () => '/tmp/nonexistent' as any;
    const config = await loadConfig();
    expect(config.name).toBe('nonexistent');
    expect(config.commands).toEqual([]);
    process.cwd = cwd;
  });

  it('loads config from a custom path', async () => {
    const config = await loadConfig(configPath);
    expect(config.name).toBe('prokom-dev');
    expect(config.commands.length).toBeGreaterThan(0);
  });

  it('applies profile when specified', async () => {
    const config = await loadConfig(configPath, 'ci');
    expect(config.profile).toBe('ci');
  });
});
