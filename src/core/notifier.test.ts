import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => {
  const spawn = vi.fn(() => {
    const child = { on: vi.fn(), unref: vi.fn(), stdout: null, stderr: null };
    child.on.mockReturnValue(child);
    return child;
  });
  return { spawn, execSync: vi.fn() };
});

import { sendNotification } from './notifier.js';

describe('sendNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw when called', () => {
    expect(() => sendNotification('Test', 'Hello')).not.toThrow();
  });

  it('handles special characters in title', () => {
    expect(() => sendNotification('Test "quote"', 'Message')).not.toThrow();
  });

  it('handles special characters in message', () => {
    expect(() => sendNotification('Test', 'Message with "quotes" and $ymbols')).not.toThrow();
  });
});
