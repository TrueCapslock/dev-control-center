# AGENTS.md

## Build & Run

- Build all packages: `npm run build` (runs `tsc -b` at root)
- Watch mode: `npm run dev` (`tsc -b -w`)
- Clean builds: `npm run clean` (`tsc -b --clean`)
- Run CLI: `npm start` (or `node packages/cli/dist/index.js`)
- Run tests: `npm test` (`vitest --run`)
- Watch tests: `npm run test:watch` (`vitest`)
- **ESM-only**: all packages use `"type": "module"`. Config files can be `.mjs`, `.cjs`, or `.js` (with `"type": "module"` context).

## Monorepo Structure

- npm workspaces with 6 packages under `packages/*`.
- TypeScript project references; root `tsc -b` builds all.
- Base tsconfig at `tsconfig.base.json`; each package extends it.

Package dependency order (bottom-up):
- `config/` — standalone, loads `dcc.config.js` (CJS/ESM)
- `status/` — standalone, `StatusStore` with subscribe pattern
- `plugins/` — standalone, plugin registry
- `core/` — depends on config + status + plugins; owns `Runtime`, `EventBus`, `TaskRunner`
- `ui/` — depends on core + config + status; Ink 7 + React 19, renders `App` component
- `cli.ts` — depends on config + core + ui; bin entrypoint

## Architecture

- Runtime flow: `CLI -> Config Loader -> Core Runtime -> Ink UI`
- Core runtime owns `TaskRunner` (spawns child processes), `StatusStore` (observable task state), `EventBus` (typed events), and `PluginManager`.
- Config is project-local `dcc.config.{mjs,cjs,js}` using `export default` (ESM) or `module.exports` (CJS); see `docs/config.md`.
- MVP scope per `docs/mvp.md`; CI/cloud/plugin-marketplace are out of scope.

## Design Docs

- `docs/*.md` describe planned intent, not necessarily what is implemented.
- Current Phase 2: search/filter (`/` key), confirmation prompts for `confirm: true` commands, scrollable output (50 lines active / 10 inactive), git branch in header, status persistence in `.developer-control-center/status.json`.
- Phase 1 delivered: foundation monorepo, command execution, config loading, Ink UI shell with keyboard nav.

## Config

```js
// dcc.config.js
export default {
  name: 'my-project',
  commands: [
    { id: 'build', label: 'Build', command: 'npm run build' },
    { id: 'deploy', label: 'Deploy', command: 'npm run deploy', confirm: true },
  ],
};
```
