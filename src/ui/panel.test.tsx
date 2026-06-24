import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import { Panel } from './panel.js';

describe('Panel', () => {
  it('renders the title in the top border', () => {
    const { lastFrame } = render(
      <Panel title="Test" width={20} height={5}>
        <React.Fragment />
      </Panel>,
    );
    const frame = lastFrame();
    expect(frame).toContain('╭─ Test');
  });

  it('renders proper bottom border', () => {
    const { lastFrame } = render(
      <Panel title="Test" width={20} height={5}>
        <React.Fragment />
      </Panel>,
    );
    const frame = lastFrame();
    expect(frame).toContain('╰');
  });

  it('renders side borders for each content row', () => {
    const { lastFrame } = render(
      <Panel title="Test" width={20} height={5}>
        <React.Fragment />
      </Panel>,
    );
    const frame = lastFrame()!;
    const lines = frame.split('\n');
    expect(lines.length).toBe(5);
    expect(lines[1].startsWith('│')).toBe(true);
    expect(lines[1].endsWith('│')).toBe(true);
    expect(lines[2].startsWith('│')).toBe(true);
    expect(lines[2].endsWith('│')).toBe(true);
    expect(lines[3].startsWith('│')).toBe(true);
    expect(lines[3].endsWith('│')).toBe(true);
  });

  it('renders children in the content area', () => {
    const { lastFrame } = render(
      <Panel title="Test" width={20} height={5}>
        <Box><Text>hello</Text></Box>
      </Panel>,
    );
    const frame = lastFrame();
    expect(frame).toContain('hello');
  });

  it('shows "↑N more" when hiddenAbove is set', () => {
    const { lastFrame } = render(
      <Panel title="Test" width={30} height={5} hiddenAbove={3}>
        <React.Fragment />
      </Panel>,
    );
    const frame = lastFrame();
    expect(frame).toContain('↑3 more');
  });

  it('shows "↓N more" when hiddenBelow is set', () => {
    const { lastFrame } = render(
      <Panel title="Test" width={30} height={5} hiddenBelow={2}>
        <React.Fragment />
      </Panel>,
    );
    const frame = lastFrame();
    expect(frame).toContain('↓2 more');
  });

  it('renders titleExtra next to the title', () => {
    const { lastFrame } = render(
      <Panel title="Main" width={30} height={5} titleExtra={<Text> [extra]</Text>}>
        <React.Fragment />
      </Panel>,
    );
    const frame = lastFrame();
    expect(frame).toContain('[extra]');
  });
});
