import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

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
