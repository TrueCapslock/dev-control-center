import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { render } from 'ink-testing-library';
import fs from 'fs';
import { MetricsPanel } from './metrics-panel.js';

function makeMetricsData(overrides: Record<string, any> = {}) {
  return JSON.stringify({
    version: '1.0.0',
    latestTest: { label: 'Unit Tests', status: 'success', time: Date.now() - 60000 },
    latestBuild: { status: 'failure', time: Date.now() - 120000 },
    ...overrides,
  });
}

vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn(() => makeMetricsData()),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
  },
  readFileSync: vi.fn(() => makeMetricsData()),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
}));

const mockReadFileSync = () => vi.mocked(fs).readFileSync;

const mockTasks = (entries: Record<string, any>): Map<string, any> =>
  new Map(Object.entries(entries)) as Map<string, any>;

describe('MetricsPanel', () => {
  const baseProps = {
    tasks: new Map(),
    width: 28,
    menuRows: 10,
  };

  beforeEach(() => {
    mockReadFileSync().mockReturnValue(makeMetricsData());
  });

  it('shows idle status when no tasks are running', () => {
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('idle');
  });

  it('displays the package version', () => {
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Version: 1.0.0');
  });

  it('shows active task count for running tasks', async () => {
    const tasks = mockTasks({
      build: { id: 'build', label: 'Build', status: 'running', startTime: Date.now() },
      test: { id: 'test', label: 'Test', status: 'running', startTime: Date.now() },
    });
    const { lastFrame, rerender } = render(<MetricsPanel {...baseProps} />);
    await act(async () => {
      rerender(<MetricsPanel {...baseProps} tasks={tasks} />);
    });
    const frame = lastFrame();
    expect(frame).toContain('Active: 2');
    expect(frame).toContain('running');
  });

  it('shows test passed status with time ago', () => {
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    const frame = lastFrame();
    expect(frame).toContain('Tests: passed');
    expect(frame).toContain('1m ago');
  });

  it('shows test failure status', () => {
    mockReadFileSync().mockReturnValue(makeMetricsData({
      latestTest: { label: 'Tests', status: 'failure', time: Date.now() - 30000 },
    }));
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Tests: failed');
  });

  it('shows no test run when no test data', () => {
    mockReadFileSync().mockReturnValue(makeMetricsData({ latestTest: undefined }));
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Tests: no run');
  });

  it('shows build failed status', () => {
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Build: failed');
  });

  it('shows build passed status', () => {
    mockReadFileSync().mockReturnValue(makeMetricsData({
      latestBuild: { status: 'success', time: Date.now() - 300000 },
    }));
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Build: passed');
  });

  it('shows no build run when no build data', () => {
    mockReadFileSync().mockReturnValue(makeMetricsData({ latestBuild: undefined }));
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Build: no run');
  });

  it('shows last git push timestamp', () => {
    const pushTime = new Date('2026-06-24T10:00:00').getTime();
    mockReadFileSync().mockReturnValue(makeMetricsData({
      lastGitPush: { label: 'main', time: pushTime },
    }));
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('2026-06-24 10:00');
  });

  it('shows push dash when no push data', () => {
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Push: -');
  });

  it('shows version dash when package.json is missing', () => {
    mockReadFileSync().mockImplementation(() => { throw new Error('ENOENT'); });
    const { lastFrame } = render(<MetricsPanel {...baseProps} />);
    expect(lastFrame()).toContain('Version: -');
  });
});
