import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { CommandList } from './command-list.js';

const baseProps = {
  items: [],
  selectedIndex: 0,
  width: 50,
  menuRows: 10,
};

describe('CommandList', () => {
  it('shows no commands configured when empty', () => {
    const { lastFrame } = render(<CommandList {...baseProps} />);
    expect(lastFrame()).toContain('No commands configured');
  });

  it('renders command items', () => {
    const items = [
      { id: 'build', label: 'Build', command: 'npm run build' },
      { id: 'test', label: 'Test', command: 'npm test' },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    const frame = lastFrame();
    expect(frame).toContain('Build');
    expect(frame).toContain('Test');
  });

  it('shows cursor on selected item', () => {
    const items = [
      { id: 'build', label: 'Build', command: 'npm run build' },
      { id: 'test', label: 'Test', command: 'npm test' },
    ];
    const { lastFrame } = render(
      <CommandList {...baseProps} items={items} selectedIndex={0} />,
    );
    expect(lastFrame()).toContain('❯');
  });

  it('shows group headers', () => {
    const items = [
      { id: 'dev', label: 'Development', count: 2 },
      { id: 'build', label: 'Build', command: 'npm run build' },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    const frame = lastFrame();
    expect(frame).toContain('▶ Development');
  });

  it('renders profile options', () => {
    const items = [
      { kind: 'profile' as const, id: 'p1', label: 'Production', active: false },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    const frame = lastFrame();
    expect(frame).toContain('Production');
    expect(frame).toContain('○');
  });

  it('shows active profile with filled circle', () => {
    const items = [
      { kind: 'profile' as const, id: 'p1', label: 'Default', active: true },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    expect(lastFrame()).toContain('●');
  });

  it('shows multi-select checkboxes', () => {
    const items = [
      { id: 'a', label: 'A', command: 'echo a' },
      { id: 'b', label: 'B', command: 'echo b' },
    ];
    const { lastFrame } = render(
      <CommandList {...baseProps} items={items} multiSelected={new Set(['a'])} />,
    );
    expect(lastFrame()).toContain('[✓]');
  });

  it('shows cwd badge when present', () => {
    const items = [
      { id: 'build', label: 'Build', command: 'npm run build', cwd: '/tmp' },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    expect(lastFrame()).toContain('/tmp');
  });

  it('shows pipeline badge', () => {
    const items = [
      { id: 'pipe', label: 'Pipeline', command: '', pipelineSteps: ['a', 'b'] },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    expect(lastFrame()).toContain('pipeline');
  });

  it('shows watch badge', () => {
    const items = [
      { id: 'w', label: 'Watch', command: 'npm run dev', watch: true },
    ];
    const { lastFrame } = render(<CommandList {...baseProps} items={items} />);
    expect(lastFrame()).toContain('watch');
  });

  it('shows focused border color when focused', () => {
    const items = [
      { id: 'build', label: 'Build', command: 'npm run build' },
    ];
    const { lastFrame } = render(
      <CommandList {...baseProps} items={items} focused={true} />,
    );
    expect(lastFrame()).toContain('Commands');
  });

  it('shows selection count in title', () => {
    const items = [
      { id: 'a', label: 'A', command: 'echo a' },
      { id: 'b', label: 'B', command: 'echo b' },
    ];
    const { lastFrame } = render(
      <CommandList {...baseProps} items={items} selCount={2} multiSelected={new Set(['a', 'b'])} />,
    );
    expect(lastFrame()).toContain('(2 selected)');
  });
});
