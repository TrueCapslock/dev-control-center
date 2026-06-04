# Architecture

## Package Structure

```txt
src/
  cli.ts
  config/
  core/
  ui/
  status/
  plugins/
```

## Runtime Flow

```txt
CLI
 ↓
Config Loader
 ↓
Core Runtime
 ├── Task Runner
 ├── Status Store
 ├── Event Bus
 └── Plugin Manager
 ↓
Ink UI
```
