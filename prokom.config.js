export default {
  name: 'prokom-dev',

  // Available presets (use: presets: ['node'] or presets: ['react']):
  //   node  — Test, Build, Lint, TypeCheck, Clean (npm run / npm test)
  //   react — Dev server, Build, Test, Lint, TypeCheck, Preview build
  // To use both: presets: ['node', 'react']

  commands: [
    {
      id: 'dev',
      label: 'Watch mode',
      command: 'npm run dev',
      group: 'Development',
    },
    {
      id: 'test',
      label: 'Test all packages',
      command: 'npm test',
      group: 'Development',
    },
    {
      id: 'clean',
      label: 'Clean builds',
      command: 'npm run clean',
      group: 'Development',
    },
    {
      id: 'build',
      label: 'Build all packages',
      command: 'npm run build',
      group: 'Build',
    },
    {
      id: 'build-core',
      label: 'Core package',
      command: 'npm run build',
      cwd: 'packages/core',
      group: 'Build',
    },
    {
      id: 'build-ui',
      label: 'UI package',
      command: 'npm run build',
      cwd: 'packages/ui',
      group: 'Build',
    },
    {
      id: 'parallel-demo',
      label: 'Parallel demo (sleep 3)',
      command: 'sleep 3',
      parallel: true,
      group: 'Demo',
    },
    {
      id: 'parallel-demo-2',
      label: 'Parallel demo (sleep 5)',
      command: 'sleep 5',
      parallel: true,
      group: 'Demo',
    },
    {
      id: 'parallel-steps-demo',
      label: 'Parallel steps (sleep 3 + 5)',
      command: '',
      parallelSteps: ['parallel-demo', 'parallel-demo-2'],
      group: 'Demo',
    },
    {
      id: 'status-git',
      label: 'Git status',
      command: 'git status --short',
      group: 'Management',
    },
    {
      id: 'git-commit-push',
      label: 'Commit & push',
      command: 'git add -A && git commit -m "update $(date +%H:%M)" && git push',
      group: 'Management',
      confirm: true,
    },
    {
      id: 'git-push',
      label: 'Git push',
      command: 'git push',
      group: 'Management',
    },
    {
      id: 'status-outdated',
      label: 'Check outdated deps',
      command: 'npm outdated',
      group: 'Management',
    },
    {
      id: 'status-packages',
      label: 'List workspace packages',
      command: 'npm ls --depth=0',
      group: 'Management',
    },
  ],
  profiles: {
    ci: {
      commands: [
        {
          id: 'build',
          label: 'Build (CI)',
          command: 'npm run build',
        },
        {
          id: 'status-git',
          label: 'Check git diff',
          command: 'git diff --stat',
        },
      ],
    },
  },
  pipelines: [
    {
      id: 'pipeline-build-clean',
      label: 'Build then clean',
      steps: ['build', 'clean'],
    },
    {
      id: 'pipeline-status',
      label: 'Full status check',
      steps: ['status-git', 'status-outdated', 'status-packages'],
    },
  ],
};
