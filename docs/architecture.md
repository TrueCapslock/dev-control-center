# Architecture

## Package Structure

```txt
packages/
  cli/
  core/
  ui/
  config/
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
