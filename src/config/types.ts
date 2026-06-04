export interface ProkomToggle {
  start: string;
  stop?: string;
  check?: string;
}

export interface ProkomCommand {
  id: string;
  label: string;
  description?: string;
  command?: string;
  toggle?: ProkomToggle;
  confirm?: boolean;
  input?: { message: string; placeholder?: string; default?: string };
  onNonZeroExit?: { label: string; command: string };
  timeout?: number;
  watch?: boolean;
  cwd?: string;
  group?: string;
  parallel?: boolean;
  pipelineSteps?: string[];
  parallelSteps?: string[];
}

export interface ProkomPreset {
  name: string;
  commands: ProkomCommand[];
}

export interface ProkomProfile {
  commands: ProkomCommand[];
}

export interface ProkomPipeline {
  id: string;
  label: string;
  steps: string[];
  confirm?: boolean;
}

export interface ProkomConfig {
  name: string;
  commands: ProkomCommand[];
  presets?: string[];
  plugins?: string[];
  profiles?: Record<string, ProkomProfile>;
  profile?: string;
  baseCommands?: ProkomCommand[];
  notifications?: boolean;
  pipelines?: ProkomPipeline[];
  menuRows?: number;
  outputRows?: number;
}
