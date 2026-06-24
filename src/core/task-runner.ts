import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs';
import { ProkomCommand } from '../config/types.js';
import { StatusStore } from '../status/store.js';
import { PluginManager } from '../plugins/index.js';
import { EventBus } from './event-bus.js';

class FileWatcher {
  private watcher?: fs.FSWatcher;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  watch(dir: string, onChange: () => void): boolean {
    this.stop();
    try {
      this.watcher = fs.watch(dir, { recursive: true }, () => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(onChange, 500);
      });
      return true;
    } catch {
      return false;
    }
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }
  }
}

export class TaskRunner {
  private running = new Map<string, ChildProcess>();
  private watchers = new Map<string, FileWatcher>();
  private checkIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private readonly CHECK_INTERVAL = 5000;

  constructor(
    private statusStore: StatusStore,
    private eventBus: EventBus,
    private pluginManager?: PluginManager,
    private commands: ProkomCommand[] = [],
  ) {}

  setCommands(commands: ProkomCommand[]): void {
    this.commands = commands;
  }

  async run(command: ProkomCommand, skipClear = false): Promise<void> {
    if (command.toggle) {
      command = { ...command, command: command.toggle.start };
    }
    if (command.pipelineSteps) {
      return this.runPipeline(command);
    }
    if (command.parallelSteps) {
      return this.runParallelSteps(command);
    }

    if (!command.command) return;

    const existing = this.statusStore.getTask(command.id);
    if (existing?.status === 'running') {
      return;
    }

    await this.pluginManager?.executeHook('beforeRun', command);

    this.stopWatcher(command.id);
    this.statusStore.pruneCompleted();
    this.statusStore.updateTask(command.id, {
      id: command.id,
      label: command.label,
      status: 'running',
      output: '',
      startTime: Date.now(),
      endTime: undefined,
      exitCode: undefined,
      watchMode: false,
    });

    this.eventBus.emit('task:start', command);

    const child = spawn(command.command, [], {
      shell: true,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: command.cwd,
    });

    this.running.set(command.id, child);

    if (command.toggle?.check) {
      this.startCheck(command);
    }

    let output = '';

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      this.statusStore.updateTask(command.id, { output });
      this.eventBus.emit('task:output', command.id, text);
      this.pluginManager?.executeHook('onOutput', command.id, text);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      this.statusStore.updateTask(command.id, { output });
      this.eventBus.emit('task:output', command.id, text);
      this.pluginManager?.executeHook('onOutput', command.id, text);
    });

    child.on('close', (exitCode) => {
      this.running.delete(command.id);

      if (command.toggle?.check) return;

      const resultStatus = exitCode === 0 ? 'success' as const : 'failure' as const;

      const result = {
        exitCode: exitCode ?? undefined,
        status: resultStatus,
      };

      this.statusStore.updateTask(command.id, {
        status: resultStatus,
        exitCode: result.exitCode,
        endTime: Date.now(),
      });
      this.eventBus.emit('task:complete', command.id, exitCode);
      this.pluginManager?.executeHook('afterRun', command, result);

      if (command.watch) {
        this.startWatcher(command);
      }
    });

    child.on('error', (error) => {
      this.running.delete(command.id);

      const result = {
        exitCode: -1,
        status: 'failure' as const,
      };

      this.statusStore.updateTask(command.id, {
        status: 'failure',
        output: (output || '') + `\nError: ${error.message}`,
        exitCode: -1,
        endTime: Date.now(),
      });
      this.eventBus.emit('task:error', command.id, error);
      this.pluginManager?.executeHook('onError', command.id, error);
      this.pluginManager?.executeHook('afterRun', command, {
        exitCode: -1,
        status: 'failure',
      });
    });
  }

  abort(id: string): void {
    const child = this.running.get(id);
    if (child) {
      this.killChild(child);
      this.running.delete(id);
    }
    this.stopWatcher(id);
    this.stopCheck(id);
  }

  abortAll(): void {
    for (const [id, child] of this.running) {
      this.killChild(child);
      this.running.delete(id);
    }
    for (const [id] of this.watchers) {
      this.stopWatcher(id);
    }
    for (const [id] of this.checkIntervals) {
      this.stopCheck(id);
    }
  }

  stop(command: ProkomCommand): void {
    const child = this.running.get(command.id);
    if (child) {
      child.removeAllListeners('close');
      child.removeAllListeners('error');
      this.killChild(child);
      this.running.delete(command.id);
    }
    this.stopWatcher(command.id);
    this.stopCheck(command.id);
    this.statusStore.updateTask(command.id, {
      status: 'success',
      endTime: Date.now(),
    });
    this.eventBus.emit('task:complete', command.id, 0);
    if (command.toggle?.stop) {
      const stopCmd = process.platform === 'win32'
        ? this.windowsStopCommand(command.toggle.stop)
        : command.toggle.stop;
      spawn(stopCmd, {
        shell: true,
        stdio: 'ignore',
        cwd: command.cwd,
      }).unref();
    }
  }

  private windowsStopCommand(cmd: string): string {
    const pkillMatch = cmd.match(/^pkill\s+-f\s+(.+)$/);
    if (pkillMatch) {
      return `taskkill /F /IM ${pkillMatch[1]}* 2>nul`;
    }
    const killMatch = cmd.match(/^kill\s+-?\d*\s+(\d+)$/);
    if (killMatch) {
      return `taskkill /F /PID ${killMatch[1]} 2>nul`;
    }
    return cmd;
  }

  private async runPipeline(command: ProkomCommand): Promise<void> {
    const existing = this.statusStore.getTask(command.id);
    if (existing?.status === 'running') return;

    await this.pluginManager?.executeHook('beforeRun', command);

    this.statusStore.updateTask(command.id, {
      id: command.id,
      label: command.label,
      status: 'running',
      output: '',
      startTime: Date.now(),
      endTime: undefined,
      exitCode: undefined,
    });

    this.eventBus.emit('task:start', command);

    const steps = command.pipelineSteps!;
    let fullOutput = '';

    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];
      const stepCmd = this.commands.find((c) => c.id === stepId);
      if (!stepCmd) {
        fullOutput += `✗ Step "${stepId}" not found\n`;
        this.finishPipeline(command, fullOutput, -1);
        return;
      }

      fullOutput += `▶ Step ${i + 1}/${steps.length}: ${stepCmd.label}\n`;
      this.statusStore.updateTask(command.id, { output: fullOutput });

      const result = await this.runAndWait(stepCmd);

      if (result.exitCode !== 0) {
        fullOutput += `✗ Pipeline failed at step ${i + 1} (${stepCmd.label})\n`;
        this.finishPipeline(command, fullOutput, result.exitCode ?? -1);
        return;
      }

      fullOutput += `✓ Step ${i + 1} passed\n`;
      this.statusStore.updateTask(command.id, { output: fullOutput });
    }

    fullOutput += '✓ Pipeline completed successfully\n';
    this.finishPipeline(command, fullOutput, 0);
  }

  private async runParallelSteps(command: ProkomCommand): Promise<void> {
    const existing = this.statusStore.getTask(command.id);
    if (existing?.status === 'running') return;

    await this.pluginManager?.executeHook('beforeRun', command);

    this.statusStore.updateTask(command.id, {
      id: command.id,
      label: command.label,
      status: 'running',
      output: '',
      startTime: Date.now(),
      endTime: undefined,
      exitCode: undefined,
    });

    this.eventBus.emit('task:start', command);

    const steps = command.parallelSteps!;
    const stepCommands = steps.map((id) =>
      this.commands.find((c) => c.id === id),
    );

    const missing = stepCommands.findIndex((c) => !c);
    if (missing >= 0) {
      this.statusStore.updateTask(command.id, {
        status: 'failure',
        output: `✗ Step "${steps[missing]}" not found\n`,
        exitCode: -1,
        endTime: Date.now(),
      });
      this.eventBus.emit('task:complete', command.id, -1);
      return;
    }

    const validCmds = stepCommands as ProkomCommand[];
    let fullOutput = `▶ Running ${validCmds.length} steps in parallel\n`;

    for (const cmd of validCmds) {
      fullOutput += `  ▶ ${cmd.label}\n`;
    }
    this.statusStore.updateTask(command.id, { output: fullOutput });

    const results = await Promise.all(
      validCmds.map((cmd) => this.runAndWait(cmd)),
    );

    const failed: number[] = [];
    for (let i = 0; i < results.length; i++) {
      const ok = results[i].exitCode === 0;
      fullOutput += `${ok ? '✓' : '✗'} ${validCmds[i].label} (exit ${results[i].exitCode ?? -1})\n`;
      if (!ok) failed.push(i);
    }

    if (failed.length === 0) {
      fullOutput += '✓ All parallel steps passed\n';
    } else {
      fullOutput += `✗ ${failed.length} step(s) failed\n`;
    }

    this.statusStore.updateTask(command.id, {
      status: failed.length === 0 ? 'success' : 'failure',
      output: fullOutput,
      exitCode: failed.length === 0 ? 0 : -1,
      endTime: Date.now(),
    });
    this.eventBus.emit('task:complete', command.id, failed.length === 0 ? 0 : -1);
    this.pluginManager?.executeHook('afterRun', command, {
      exitCode: failed.length === 0 ? 0 : -1,
      status: failed.length === 0 ? 'success' : 'failure',
    });
  }

  private finishPipeline(
    command: ProkomCommand,
    output: string,
    exitCode: number,
  ): void {
    const status = exitCode === 0 ? 'success' : 'failure';
    this.statusStore.updateTask(command.id, {
      status,
      output,
      exitCode,
      endTime: Date.now(),
    });
    this.eventBus.emit('task:complete', command.id, exitCode);
    this.pluginManager?.executeHook('afterRun', command, {
      exitCode,
      status,
    });
  }

  private runAndWait(
    stepCmd: ProkomCommand,
  ): Promise<{ exitCode: number | undefined }> {
    return new Promise((resolve) => {
      const onComplete = (id: string, exitCode: number | null) => {
        if (id === stepCmd.id) {
          cleanup();
          resolve({ exitCode: exitCode ?? undefined });
        }
      };
      const onError = (id: string) => {
        if (id === stepCmd.id) {
          cleanup();
          resolve({ exitCode: -1 });
        }
      };
      const cleanup = () => {
        if (safetyTimer) clearTimeout(safetyTimer);
        this.eventBus.off('task:complete', onComplete);
        this.eventBus.off('task:error', onError);
      };
      const stepTimeout = stepCmd.timeout ?? 30_000;
      const safetyTimer = stepTimeout > 0
        ? setTimeout(() => {
            cleanup();
            resolve({ exitCode: -1 });
          }, stepTimeout)
        : null;
      this.eventBus.on('task:complete', onComplete);
      this.eventBus.on('task:error', onError);
      this.run(stepCmd, true).catch(() => {
        cleanup();
        resolve({ exitCode: -1 });
      });
    });
  }

  private startWatcher(command: ProkomCommand): void {
    const watcher = new FileWatcher();
    const ok = watcher.watch(process.cwd(), () => {
      this.run(command);
    });
    if (!ok) {
      this.eventBus.emit('task:output', command.id, `watch mode: recursive file watching not supported\n`);
      return;
    }
    this.watchers.set(command.id, watcher);
    this.statusStore.updateTask(command.id, { watchMode: true });
  }

  private killChild(child: ChildProcess): void {
    if (child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
        return;
      } catch {
        // fall through to child.kill()
      }
    }
    try {
      child.kill('SIGTERM');
    } catch {
      // already dead
    }
  }

  private stopWatcher(id: string): void {
    const watcher = this.watchers.get(id);
    if (watcher) {
      watcher.stop();
      this.watchers.delete(id);
    }
  }

  private startCheck(command: ProkomCommand): void {
    const id = command.id;
    if (this.checkIntervals.has(id)) return;

    const checkCmd = command.toggle!.check!;
    const interval = setInterval(() => {
      try {
        execSync(checkCmd, { encoding: 'utf-8', timeout: 3000, stdio: 'pipe' });
      } catch {
        this.statusStore.updateTask(id, {
          status: 'failure',
          endTime: Date.now(),
        });
        this.eventBus.emit('task:complete', id, -1);
        this.stopCheck(id);
      }
    }, this.CHECK_INTERVAL);

    this.checkIntervals.set(id, interval);
  }

  private stopCheck(id: string): void {
    const interval = this.checkIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(id);
    }
  }
}
