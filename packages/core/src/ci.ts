export interface CIInfo {
  isCI: boolean;
  name?: string;
}

export function detectCI(): CIInfo {
  if (process.env.GITHUB_ACTIONS) {
    return { isCI: true, name: 'GitHub Actions' };
  }
  if (process.env.GITLAB_CI) {
    return { isCI: true, name: 'GitLab CI' };
  }
  if (process.env.CIRCLECI) {
    return { isCI: true, name: 'CircleCI' };
  }
  if (process.env.JENKINS_URL) {
    return { isCI: true, name: 'Jenkins' };
  }
  if (process.env.CI) {
    return { isCI: true, name: 'CI' };
  }
  return { isCI: false };
}
