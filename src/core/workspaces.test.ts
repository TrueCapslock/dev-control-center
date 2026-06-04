import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { detectWorkspaces } from './workspaces.js';

describe('detectWorkspaces', () => {
  const testDir = '/tmp/dcc-test-workspaces';

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function writePackageJson(dir: string, content: object) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(content));
  }

  it('returns empty when no workspaces defined', () => {
    writePackageJson(testDir, { name: 'root' });
    expect(detectWorkspaces(testDir)).toEqual([]);
  });

  it('discovers packages from glob pattern', () => {
    writePackageJson(testDir, { name: 'root', workspaces: ['packages/*'] });
    writePackageJson(path.join(testDir, 'packages/a'), { name: '@scope/a' });
    writePackageJson(path.join(testDir, 'packages/b'), { name: '@scope/b' });
    const ws = detectWorkspaces(testDir);
    expect(ws.length).toBe(2);
    expect(ws.find((w) => w.name === '@scope/a')).toBeTruthy();
    expect(ws.find((w) => w.name === '@scope/b')).toBeTruthy();
  });

  it('discovers packages from explicit paths', () => {
    writePackageJson(testDir, { name: 'root', workspaces: ['libs/x'] });
    writePackageJson(path.join(testDir, 'libs/x'), { name: 'lib-x' });
    const ws = detectWorkspaces(testDir);
    expect(ws.length).toBe(1);
    expect(ws[0].name).toBe('lib-x');
    expect(ws[0].path).toBe('libs/x');
  });

  it('uses directory name as fallback when no package name', () => {
    writePackageJson(testDir, { name: 'root', workspaces: ['pkgs/*'] });
    fs.mkdirSync(path.join(testDir, 'pkgs/foo'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'pkgs/foo/package.json'), '{}');
    const ws = detectWorkspaces(testDir);
    expect(ws.length).toBe(1);
    expect(ws[0].name).toBe('foo');
  });

  it('returns empty when workspaces glob matches nothing', () => {
    writePackageJson(testDir, { name: 'root', workspaces: ['nowhere/*'] });
    expect(detectWorkspaces(testDir)).toEqual([]);
  });

  it('handles bad JSON gracefully', () => {
    writePackageJson(testDir, { name: 'root', workspaces: ['packages/*'] });
    fs.mkdirSync(path.join(testDir, 'packages/bad'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'packages/bad/package.json'), '{invalid');
    const ws = detectWorkspaces(testDir);
    expect(ws.length).toBe(1);
    expect(ws[0].name).toBe('bad');
  });

  it('handles missing root package.json gracefully', () => {
    expect(detectWorkspaces('/tmp/nonexistent-dir')).toEqual([]);
  });
});
