# prokom-dev

A project-local developer control center — a TUI launcher for commands, builds, pipelines, and status tracking.

## Features

- **Command menu** — keyboard-navigable list of project commands
- **Search** — press `/` to filter commands by name
- **Parallel execution** — run multiple tasks simultaneously
- **Pipelines** — chain commands with sequential step execution
- **Watch mode** — auto-re-run commands on file changes
- **Confirmation prompts** — guard destructive commands with `confirm: true`
- **Status panel** — live output, exit codes, duration, scrollable history
- **Environment profiles** — switch command sets with `--profile`
- **Workspace detection** — auto-detect monorepo packages
- **Git branch** — shows current branch in header
- **CI integration** — auto-detects CI environments, applies `ci` profile
- **Desktop notifications** — alerts on task completion/failure
- **Presets** — reusable command collections (`prokom-preset-*`)
- **Plugin API** — lifecycle hooks for custom extensions

## Installation

```bash
npm install -g @prokom-dev/cli
```

Or run from a local checkout:

```bash
git clone <url>
cd prokom-dev
npm install
npm run build
npm start
```

## Usage

```bash
# Launch in current directory
prokom

# Use a specific config file
prokom ./configs/prokom.config.js

# Use a CI profile
prokom --profile ci

# Show help
prokom --help
```

### Keyboard Controls

| Key | Action |
|-----|--------|
| `↑`/`↓` | Navigate commands / scroll status |
| `Enter` | Run selected command |
| `/` | Enter search mode |
| `Tab` | Focus status panel |
| `Esc` | Back to commands / exit search |
| `y`/`n` | Confirm / cancel (confirmation prompts) |
| `Ctrl+C` / `Esc` (in command mode) | Quit |

## Configuration

Create `prokom.config.js` (or `.mjs` / `.cjs`) in your project root:

```js
export default {
  name: 'my-project',
  commands: [
    {
      id: 'build',
      label: 'Build',
      command: 'npm run build',
    },
    {
      id: 'deploy',
      label: 'Deploy to staging',
      command: 'npm run deploy:staging',
      confirm: true,
    },
    {
      id: 'dev-watch',
      label: 'Dev server',
      command: 'npm run dev',
      watch: true,
    },
  ],
};
```

### Presets

```js
export default {
  presets: ['node'],  // loads prokom-preset-node
  commands: [
    // your project-specific overrides
  ],
};
```

### Profiles

```js
export default {
  profiles: {
    ci: {
      commands: [
        { id: 'build', label: 'Build (CI)', command: 'npm run build' },
      ],
    },
  },
};
```

### Pipelines

```js
export default {
  pipelines: [
    {
      id: 'deploy-all',
      label: 'Build, test, deploy',
      steps: ['build', 'test', 'deploy'],
    },
  ],
};
```

Full options documented in [docs/config.md](docs/config.md).

## Packages

| Package | Description |
|---------|-------------|
| `@prokom-dev/cli` | CLI entrypoint |
| `@prokom-dev/core` | Runtime, TaskRunner, EventBus, CI detection, notifier |
| `@prokom-dev/ui` | Ink-based terminal UI |
| `@prokom-dev/config` | Config loading & types |
| `@prokom-dev/status` | Observable task state store |
| `@prokom-dev/plugins` | Plugin manager & hook system |

## Extending

See [PLUGINS.md](PLUGINS.md) for the plugin API and [docs/architecture.md](docs/architecture.md) for the system architecture.

## Development

```bash
npm run dev      # watch mode
npm test         # run tests
npm run build    # build all packages
npm start        # run CLI
```
