export interface ProkomToggle {
  start: string;
  stop?: string;
}

export interface ProkomCommand {
  id: string;
  label: string;
  command?: string;
  toggle?: ProkomToggle;
  confirm?: boolean;
  input?: { message: string; placeholder?: string };
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
  notifications?: boolean;
  pipelines?: ProkomPipeline[];
}
