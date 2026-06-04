# Plugin Author Guide

developer-control-center supports a plugin system that hooks into the task lifecycle. Plugins are npm packages loaded at startup.

## Plugin Interface

A plugin is a module that exports an object conforming to `ProkomPlugin`:

```ts
interface ProkomPlugin {
  name: string;
  hooks: {
    beforeRun?: (command: ProkomCommand) => void | Promise<void>;
    afterRun?: (command: ProkomCommand, result: { exitCode?: number; status: string }) => void | Promise<void>;
    onOutput?: (taskId: string, text: string) => void | Promise<void>;
    onError?: (taskId: string, error: Error) => void | Promise<void>;
  };
}
```

### Hook Reference

| Hook | Arguments | When |
|------|-----------|------|
| `beforeRun` | `(command)` | Before a command starts executing |
| `afterRun` | `(command, result)` | After a command finishes (success or failure) |
| `onOutput` | `(taskId, text)` | On each chunk of stdout/stderr |
| `onError` | `(taskId, error)` | On spawn errors |

## Creating a Plugin

### 1. Create the package

```
my-dcc-plugin/
├── package.json
├── index.js
└── README.md
```

### 2. Implement the hooks

```js
// index.js
export default {
  name: 'my-plugin',
  hooks: {
    beforeRun(command) {
      console.log(`[my-plugin] starting: ${command.label}`);
    },
    afterRun(command, result) {
      console.log(`[my-plugin] finished: ${command.label} (exit ${result.exitCode})`);
    },
  },
};
```

### 3. Use it in config

```js
// dcc.config.js
export default {
  plugins: ['my-dcc-plugin'],
  commands: [ /* ... */ ],
};
```

### Plugin Resolution

- Plugins are resolved via `require()`, so they must be installed or linked.
- Use npm/yarn workspaces for local plugins: `"my-plugin": "file:./plugins/my-plugin"`.

## Using Hooks

### Simple Observer

```js
export default {
  name: 'logger',
  hooks: {
    onOutput(taskId, text) {
      // stream output to a log file
      fs.appendFileSync(`logs/${taskId}.log`, text);
    },
  },
};
```

### Guard Plugin (prevent execution)

```js
export default {
  name: 'time-guard',
  hooks: {
    beforeRun(command) {
      const hour = new Date().getHours();
      if (command.id === 'deploy' && (hour < 9 || hour > 17)) {
        throw new Error('Deployments only allowed during working hours');
      }
    },
  },
};
```

### Plugin with State

```js
export default {
  name: 'stats',
  hooks: {
    beforeRun() { this.startTime = Date.now(); },
    afterRun(command, result) {
      const elapsed = Date.now() - this.startTime;
      console.log(`[stats] ${command.id}: ${elapsed}ms`);
    },
  },
};
```

## Presets

Presets are reusable command collections. Built-in presets are `node` and `react`.

A preset exports a `ProkomPreset`:

```ts
interface ProkomPreset {
  name: string;
  commands: ProkomCommand[];
}
```

Example:

```js
export default {
  name: 'node',
  commands: [
    { id: 'test', label: 'Test', command: 'npm test' },
    { id: 'build', label: 'Build', command: 'npm run build' },
  ],
};
```

Built-in presets: `node`, `react`.
