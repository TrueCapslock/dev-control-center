# Configuration

## Example

A full sample config is available at `dcc.config.example.js` in the project root. It demonstrates:

- Simple commands
- Toggle (start/stop) commands
- Confirm-before-run commands
- Input prompt commands
- Conditional follow-up on non-zero exit (`onNonZeroExit`)
- Directory-scoped commands (`cwd`)
- Parallel-safe tasks
- Profiles (CI, staging, etc.)
- Pipelines (sequential multi-step)
