import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { render } from 'ink-testing-library';
import { App } from './app.js';
import { EventBus } from '../core/event-bus.js';
import { StatusStore } from '../status/store.js';

function createMockRuntime() {
  const eventBus = new EventBus();
  const statusStore = new StatusStore();
  const taskRunner = {
    run: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    abortAll: vi.fn(),
    setCommands: vi.fn(),
    abort: vi.fn(),
  };
  return {
    eventBus,
    statusStore,
    taskRunner,
    pluginManager: { register: vi.fn(), executeHook: vi.fn(), loadFromConfig: vi.fn() },
    gitBranch: 'main',
    workspaces: [] as { name: string; path: string }[],
    ci: { isCI: false, name: undefined as string | undefined },
    stop: vi.fn(),
  };
}

const baseConfig = {
  name: 'test-project',
  commands: [
    { id: 'build', label: 'Build', command: 'npm run build', description: 'Build the project' },
    { id: 'test', label: 'Test', command: 'npm test' },
  ],
};

describe('App', () => {
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    runtime = createMockRuntime() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the project name in the header', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('test-project');
  });

  it('shows the git branch', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('⎇ main');
  });

  it('renders command items', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    const frame = lastFrame();
    expect(frame).toContain('Build');
    expect(frame).toContain('Test');
  });

  it('shows no tasks yet in output panel', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('No tasks yet');
  });

  it('shows selected command description in footer', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('Build the project');
  });

  it('renders with groups', () => {
    const config = {
      name: 'test',
      commands: [
        { id: 'build', label: 'Build', command: 'npm run build', group: 'Build' },
        { id: 'test', label: 'Test', command: 'npm test', group: 'Test' },
      ],
    };
    const { lastFrame } = render(<App config={config} runtime={runtime as any} />);
    expect(lastFrame()).toContain('▶ Build');
    expect(lastFrame()).toContain('▶ Test');
  });

  it('shows active profile in header', () => {
    const config = {
      name: 'test',
      commands: [{ id: 'build', label: 'Build', command: 'npm run build' }],
      profiles: { prod: { commands: [] } },
      profile: 'prod',
    };
    const { lastFrame } = render(<App config={config} runtime={runtime as any} />);
    expect(lastFrame()).toContain('⚙ prod');
  });

  it('shows workspace count when present', () => {
    runtime.workspaces = [{ name: 'pkg-a', path: '/pkg-a' }];
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('⊞ 1');
  });

  it('handles status store updates', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    act(() => {
      runtime.statusStore.updateTask('build', {
        id: 'build',
        label: 'Build',
        status: 'running',
        output: 'compiling...',
      });
    });
    const frame = lastFrame();
    expect(frame).toContain('compiling...');
  });

  it('shows confirm prompt for confirm commands', () => {
    const config = {
      name: 'test',
      commands: [
        { id: 'deploy', label: 'Deploy', command: 'npm run deploy', confirm: true },
      ],
    };
    const { lastFrame, stdin } = render(<App config={config} runtime={runtime as any} />);
    act(() => { stdin.write('\r'); });
    const frame = lastFrame();
    expect(frame).toContain('⚠');
  });

  it('shows DCC in header', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('DCC');
  });

  it('shows status pane (middle panel)', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('Status');
  });

  it('shows output pane (right panel)', () => {
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('Output');
  });

  it('shows CI badge when in CI environment', () => {
    runtime.ci = { isCI: true, name: 'GitHub Actions' };
    const { lastFrame } = render(<App config={baseConfig} runtime={runtime as any} />);
    expect(lastFrame()).toContain('⊡ GitHub Actions');
  });

  it('switches pane focus on Tab', () => {
    const { lastFrame, stdin } = render(<App config={baseConfig} runtime={runtime as any} />);
    act(() => { stdin.write('\t'); });
    const frame = lastFrame();
    expect(frame).toContain('Output');
  });

  it('enters search mode on / key', () => {
    const { lastFrame, stdin } = render(<App config={baseConfig} runtime={runtime as any} />);
    act(() => { stdin.write('/'); });
    expect(lastFrame()).toContain('🔍');
  });

  it('shows default footer hint for command without description', () => {
    const config = {
      name: 'test',
      commands: [
        { id: 'foo', label: 'Foo', command: 'echo foo' },
      ],
    };
    const { lastFrame } = render(<App config={config} runtime={runtime as any} />);
    expect(lastFrame()).toContain('Enter to run');
  });
});
