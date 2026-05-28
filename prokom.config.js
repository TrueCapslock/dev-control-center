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
      description: 'Start or stop the TypeScript project-reference watcher.',
      toggle: { start: 'npm run dev', stop: 'pkill -f "tsc -b" 2>/dev/null || true' },
      group: 'Development',
    },
    {
      id: 'test',
      label: 'Test all packages',
      description: 'Run the full Vitest suite once.',
      command: 'npm test',
      group: 'Development',
    },
    {
      id: 'clean',
      label: 'Clean builds',
      description: 'Remove TypeScript project-reference build output.',
      command: 'npm run clean',
      group: 'Development',
    },
    {
      id: 'build',
      label: 'Build all packages',
      description: 'Compile every workspace package with TypeScript.',
      command: 'npm run build',
      group: 'Build',
    },
    {
      id: 'build-core',
      label: 'Core package',
      description: 'Build only the core runtime package.',
      command: 'npm run build',
      cwd: 'packages/core',
      group: 'Build',
    },
    {
      id: 'build-ui',
      label: 'UI package',
      description: 'Build only the Ink UI package.',
      command: 'npm run build',
      cwd: 'packages/ui',
      group: 'Build',
    },
    {
      id: 'deploy-dry-run',
      label: 'Publish dry run',
      description: 'Preview npm workspace publishing without publishing packages.',
      command: 'npm publish --workspaces --dry-run',
      group: 'Deploy',
    },
    {
      id: 'deploy-publish',
      label: 'Publish packages',
      description: 'Publish all workspace packages to npm after confirmation.',
      command: 'npm publish --workspaces',
      group: 'Deploy',
      confirm: true,
    },
    {
      id: 'dev-server-toggle',
      label: 'Dev server',
      description: 'Demo toggle command that simulates a long-running server.',
      toggle: { start: 'sleep 60', stop: 'echo "server stopped"' },
      group: 'Demo',
    },
    {
      id: 'parallel-demo',
      label: 'Parallel demo (sleep 3)',
      description: 'Demo command that can run alongside other parallel tasks.',
      command: 'sleep 3',
      parallel: true,
      group: 'Demo',
    },
    {
      id: 'parallel-demo-2',
      label: 'Parallel demo (sleep 5)',
      description: 'Second demo command for parallel execution.',
      command: 'sleep 5',
      parallel: true,
      group: 'Demo',
    },
    {
      id: 'parallel-steps-demo',
      label: 'Parallel steps (sleep 3 + 5)',
      description: 'Run both demo sleep tasks concurrently as one command.',
      command: '',
      parallelSteps: ['parallel-demo', 'parallel-demo-2'],
      group: 'Demo',
    },
    {
      id: 'status-git',
      label: 'Git status',
      description: 'Show concise git working-tree status.',
      command: 'git status --short',
      group: 'Management',
    },
    {
      id: 'git-commit-push',
      label: 'Commit & push',
      description: 'Prompt for a commit message, commit all changes, then push.',
      command: 'git add -A && git commit --allow-empty -m "{input}" && git push',
      group: 'Management',
      confirm: true,
      input: { message: 'Commit message:', placeholder: 'type a message…' },
    },
    {
      id: 'git-push',
      label: 'Git push',
      description: 'Push the current branch to its configured remote.',
      command: 'git push',
      group: 'Management',
    },
    {
      id: 'status-outdated',
      label: 'Check outdated deps',
      description: 'List outdated npm dependencies.',
      command: 'npm outdated',
      group: 'Management',
    },
    {
      id: 'status-packages',
      label: 'List workspace packages',
      description: 'List installed top-level workspace packages.',
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
