# developer-control-center

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
- **Presets** — reusable command collections (node, react)
- **Plugin API** — lifecycle hooks for custom extensions

## Installation

```bash
npm install -g @hartvig/developer-control-center
```

Or run from a local checkout:

```bash
git clone <url>
cd developer-control-center
npm install
npm run build
npm start
```

## Usage

```bash
# Launch in current directory
dcc

# Use a specific config file
dcc ./configs/dcc.config.js

# Use a CI profile
dcc --profile ci

# Show help
dcc --help
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

Create `dcc.config.js` (or `.mjs` / `.cjs`) in your project root:

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
  presets: ['node'],  // loads built-in node preset
  commands: [
    // your project-specific overrides
  ],
};
```

Built-in presets: `node` (test, build, lint, typecheck, clean), `react` (dev, build, test, lint, typecheck, preview).

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

## Development

```bash
npm run dev      # watch mode
npm test         # run tests
npm run build    # compile TypeScript
npm start        # run CLI
```

See [PLUGINS.md](PLUGINS.md) for the plugin API and [docs/architecture.md](docs/architecture.md) for the system architecture.
