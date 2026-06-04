export default {
  name: 'my-project',
  menuRows: 8,
  // outputRows: 12, // defaults to menuRows

  commands: [
    // --- Simple command ---
    {
      id: 'build',
      label: 'Build',
      description: 'Build the project.',
      command: 'npm run build',
    },

    // --- Toggle (start/stop) ---
    {
      id: 'dev',
      label: 'Watch mode',
      description: 'Start or stop the file watcher.',
      toggle: { start: 'npm run dev' },
    },

    // --- Confirm before running ---
    {
      id: 'deploy',
      label: 'Deploy',
      description: 'Deploy to production.',
      command: 'npm run deploy',
      confirm: true,
    },

    // --- Prompt for input ---
    {
      id: 'bump-version',
      label: 'Bump version',
      description: 'Increment the project version.',
      command: 'npm version {input}',
      confirm: true,
      input: { message: 'Bump type? (patch/minor/major):', placeholder: 'patch', default: 'patch' },
    },

    // --- Conditional follow-up on non-zero exit ---
    {
      id: 'check-outdated',
      label: 'Check outdated deps',
      description: 'List outdated npm dependencies.',
      command: 'npm outdated',
      onNonZeroExit: {
        label: 'Update all',
        command: 'npm update',
      },
    },

    // --- Run in a specific directory ---
    {
      id: 'build-sub',
      label: 'Build sub-package',
      description: 'Build only the sub-package.',
      command: 'npm run build',
      cwd: 'packages/sub',
    },

    // --- Parallel-safe task ---
    {
      id: 'sleep-long',
      label: 'Long task',
      description: 'Demo task that runs 10 seconds.',
      command: 'sleep 10',
      parallel: true,
    },
  ],

  // --- Profiles (override/extend commands for different environments) ---
  profiles: {
    ci: {
      commands: [
        { id: 'build', label: 'Build (CI)', command: 'npm run build' },
        { id: 'lint', label: 'Lint', command: 'npm run lint' },
      ],
    },
  },

  // --- Pipelines (run multiple commands sequentially) ---
  pipelines: [
    {
      id: 'pipeline-full-check',
      label: 'Full check',
      steps: ['lint', 'build', 'test'],
    },
  ],
};
