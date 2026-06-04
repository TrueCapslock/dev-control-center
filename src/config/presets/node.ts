export default {
  name: 'node',
  commands: [
    {
      id: 'node-test',
      label: 'Test',
      command: 'npm test',
    },
    {
      id: 'node-build',
      label: 'Build',
      command: 'npm run build',
    },
    {
      id: 'node-lint',
      label: 'Lint',
      command: 'npm run lint',
    },
    {
      id: 'node-typecheck',
      label: 'TypeCheck',
      command: 'npx tsc --noEmit',
    },
    {
      id: 'node-clean',
      label: 'Clean',
      command: 'rm -rf dist',
    },
  ],
};
