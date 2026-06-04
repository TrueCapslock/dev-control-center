import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectCI } from './ci.js';

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  // Clear CI-related env vars
  for (const key of Object.keys(process.env)) {
    if (['GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'JENKINS_URL', 'CI'].includes(key)) {
      delete process.env[key];
    }
  }
});

afterEach(() => {
  Object.assign(process.env, ORIG_ENV);
});

describe('detectCI', () => {
  it('returns not CI when no CI env vars', () => {
    expect(detectCI()).toEqual({ isCI: false });
  });

  it('detects GitHub Actions', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(detectCI()).toEqual({ isCI: true, name: 'GitHub Actions' });
  });

  it('detects GitLab CI', () => {
    process.env.GITLAB_CI = 'true';
    expect(detectCI()).toEqual({ isCI: true, name: 'GitLab CI' });
  });

  it('detects CircleCI', () => {
    process.env.CIRCLECI = 'true';
    expect(detectCI()).toEqual({ isCI: true, name: 'CircleCI' });
  });

  it('detects Jenkins', () => {
    process.env.JENKINS_URL = 'http://jenkins.example.com';
    expect(detectCI()).toEqual({ isCI: true, name: 'Jenkins' });
  });

  it('detects generic CI', () => {
    process.env.CI = 'true';
    expect(detectCI()).toEqual({ isCI: true, name: 'CI' });
  });

  it('prefers specific CI over generic', () => {
    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = 'true';
    expect(detectCI()).toEqual({ isCI: true, name: 'GitHub Actions' });
  });
});
