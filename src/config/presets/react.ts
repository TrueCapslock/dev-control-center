export default {
  name: 'react',
  commands: [
    {
      id: 'react-dev',
      label: 'Dev server',
      command: 'npm run dev',
    },
    {
      id: 'react-build',
      label: 'Build',
      command: 'npm run build',
    },
    {
      id: 'react-test',
      label: 'Test',
      command: 'npm test',
    },
    {
      id: 'react-lint',
      label: 'Lint',
      command: 'npm run lint',
    },
    {
      id: 'react-typecheck',
      label: 'TypeCheck',
      command: 'npx tsc --noEmit',
    },
    {
      id: 'react-preview',
      label: 'Preview build',
      command: 'npm run preview',
    },
  ],
};
