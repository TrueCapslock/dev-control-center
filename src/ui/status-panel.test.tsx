import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { StatusPanel } from './status-panel.js';

function makeTask(overrides: Record<string, any> = {}) {
  return {
    id: 'test',
    label: 'Test Task',
    status: 'running',
    output: '',
    startTime: Date.now(),
    ...overrides,
  } as any;
}

describe('StatusPanel', () => {
  const baseProps = {
    tasks: new Map(),
    scrollOffsets: new Map(),
    focusedPane: 'commands' as const,
    width: 60,
    menuRows: 10,
  };

  it('shows no tasks yet when empty', () => {
    const { lastFrame } = render(<StatusPanel {...baseProps} />);
    expect(lastFrame()).toContain('No tasks yet');
  });

  it('displays the task label and status', () => {
    const tasks = new Map([['test', makeTask({ label: 'My Task', status: 'running' })]]);
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    const frame = lastFrame();
    expect(frame).toContain('My Task');
    expect(frame).toContain('RUNNING');
  });

  it('shows success status with green icon', () => {
    const tasks = new Map([['test', makeTask({ status: 'success' })]]);
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    expect(lastFrame()).toContain('PASS');
  });

  it('shows failure status', () => {
    const tasks = new Map([['test', makeTask({ status: 'failure', exitCode: 1 })]]);
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    expect(lastFrame()).toContain('FAIL');
    expect(lastFrame()).toContain('exit 1');
  });

  it('displays output lines', () => {
    const tasks = new Map([['test', makeTask({ output: 'line1\nline2\nline3' })]]) as any;
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    const frame = lastFrame();
    expect(frame).toContain('line1');
    expect(frame).toContain('line2');
    expect(frame).toContain('line3');
  });

  it('shows confirm prompt when confirmingCommand is set', () => {
    const { lastFrame } = render(
      <StatusPanel
        {...baseProps}
        confirmingCommand={{ id: 'deploy', label: 'Deploy', command: 'npm run deploy' } as any}
      />,
    );
    const frame = lastFrame();
    expect(frame).toContain('Run');
    expect(frame).toContain('Deploy');
  });

  it('shows input prompt when inputCommand is set', () => {
    const { lastFrame } = render(
      <StatusPanel
        {...baseProps}
        inputCommand={{ id: 'greet', label: 'Greet', command: 'echo', input: { message: 'Enter name:' } } as any}
      />,
    );
    const frame = lastFrame();
    expect(frame).toContain('Enter name:');
  });

  it('shows input value', () => {
    const { lastFrame } = render(
      <StatusPanel
        {...baseProps}
        inputCommand={{ id: 'greet', label: 'Greet', command: 'echo', input: {} } as any}
        inputValue="hello"
      />,
    );
    expect(lastFrame()).toContain('hello');
  });

  it('sanitizes ANSI escape codes from output', () => {
    const tasks = new Map([['test', makeTask({ output: '\x1B[31mred\x1B[0m' })]]) as any;
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    expect(lastFrame()).not.toContain('\x1B[');
    expect(lastFrame()).toContain('red');
  });

  it('shows duration for completed tasks', () => {
    const now = Date.now();
    const tasks = new Map([
      ['test', makeTask({ startTime: now - 5000, endTime: now, status: 'success' })],
    ]) as any;
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    expect(lastFrame()).toContain('5.0s');
  });

  it('shows watch mode indicator', () => {
    const tasks = new Map([['test', makeTask({ watchMode: true, status: 'running' })]]);
    const { lastFrame } = render(<StatusPanel {...baseProps} tasks={tasks} />);
    expect(lastFrame()).toContain('WATCH');
  });
});
