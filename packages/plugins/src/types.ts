import { ProkomCommand } from '@prokom-dev/config';

export interface PluginHooks {
  beforeRun?: (command: ProkomCommand) => void | Promise<void>;
  afterRun?: (
    command: ProkomCommand,
    result: { exitCode?: number; status: string },
  ) => void | Promise<void>;
  onOutput?: (commandId: string, text: string) => void | Promise<void>;
  onError?: (commandId: string, error: Error) => void | Promise<void>;
}

export interface Plugin {
  id: string;
  name: string;
  version?: string;
  hooks?: PluginHooks;
}
