# Configuration

## Example

```ts
export default {
  name: 'aim-cms-frontend',

  commands: [
    {
      id: 'build',
      label: 'Build',
      command: 'npm run build'
    },

    {
      id: 'deploy-staging',
      label: 'Deploy staging',
      command: 'npm run deploy:staging',
      confirm: true
    }
  ]
};
```
