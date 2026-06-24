import { execSync } from 'child_process';
import { ProkomConfig } from '../config/index.js';
import { StatusStore } from '../status/index.js';
import { PluginManager } from '../plugins/index.js';
import { EventBus } from './event-bus.js';
import { TaskRunner } from './task-runner.js';
import { detectWorkspaces, WorkspacePackage } from './workspaces.js';
import { sendNotification } from './notifier.js';
import { detectCI, CIInfo } from './ci.js';
import { timerPlugin } from './timer-plugin.js';
import { PERSISTENCE_DIR } from './persistence.js';

function getGitBranch(): string | undefined {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      timeout: 2000,
      stdio: 'pipe',
    }).trim();
  } catch {
    return undefined;
  }
}

export class Runtime {
  readonly eventBus = new EventBus();
  readonly statusStore = new StatusStore();
  readonly taskRunner: TaskRunner;
  readonly pluginManager = new PluginManager(
    (msg: string, err: unknown) => {
      this.eventBus.emit('task:output' as any, '_plugins', `${msg}: ${err instanceof Error ? err.message : String(err)}\n`);
    },
  );
  readonly gitBranch: string | undefined;
  readonly workspaces: WorkspacePackage[];
  readonly ci: CIInfo;

  private persistenceDir = PERSISTENCE_DIR;
  private unsubPersistence?: () => void;
  private unsubNotifier?: () => void;

  constructor(readonly config: ProkomConfig) {
    this.taskRunner = new TaskRunner(
      this.statusStore,
      this.eventBus,
      this.pluginManager,
      config.commands,
    );
    this.pluginManager.register(timerPlugin);
    this.gitBranch = getGitBranch();
    this.workspaces = detectWorkspaces(process.cwd());
    this.ci = detectCI();
  }

  async start(): Promise<void> {
    this.statusStore.loadDir(this.persistenceDir);
    this.unsubPersistence = this.statusStore.subscribe(() => {
      try {
        this.statusStore.saveDir(this.persistenceDir);
      } catch {
        // non-critical
      }
    });

    await this.pluginManager.loadFromConfig(this.config.plugins);

    if (this.config.notifications !== false) {
      this.unsubNotifier = this.startNotifier();
    }
  }

  stop(): void {
    this.taskRunner.abortAll();
    this.eventBus.removeAll();
    this.unsubPersistence?.();
    this.unsubNotifier?.();
  }

  private startNotifier(): () => void {
    const onComplete = (id: string, exitCode: number | null) => {
      const task = this.statusStore.getTask(id);
      if (!task) return;
      const ok = exitCode === 0;
      sendNotification(
        ok ? 'Task completed' : 'Task failed',
        `${task.label} — ${ok ? 'success' : `exit ${exitCode}`}`,
      );
    };

    const onError = (id: string) => {
      const task = this.statusStore.getTask(id);
      if (!task) return;
      sendNotification('Task error', `${task.label} — failed with error`);
    };

    this.eventBus.on('task:complete', onComplete);
    this.eventBus.on('task:error', onError);

    return () => {
      this.eventBus.off('task:complete', onComplete);
      this.eventBus.off('task:error', onError);
    };
  }
}
