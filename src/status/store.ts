import fs from 'fs';
import path from 'path';
import { TaskState } from './types.js';

type Listener = (tasks: ReadonlyMap<string, TaskState>) => void;

export class StatusStore {
  private tasks = new Map<string, TaskState>();
  private listeners = new Set<Listener>();

  getTask(id: string): TaskState | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): ReadonlyMap<string, TaskState> {
    return new Map(this.tasks);
  }

  updateTask(id: string, update: Partial<TaskState>): void {
    const existing = this.tasks.get(id) ?? {
      id,
      label: id,
      status: 'idle' as const,
    };
    this.tasks.set(id, { ...existing, ...update });
    this.notify();
  }

  clear(): void {
    this.tasks.clear();
    this.notify();
  }

  removeTask(id: string): void {
    this.tasks.delete(id);
    this.notify();
  }

  pruneCompleted(): void {
    let changed = false;
    for (const [id, task] of this.tasks) {
      if (task.status !== 'running') {
        this.tasks.delete(id);
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  saveDir(dir: string): void {
    const filePath = path.join(dir, 'status.json');
    const data = JSON.stringify(Array.from(this.tasks.entries()));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data, 'utf-8');
  }

  loadDir(dir: string): void {
    const filePath = path.join(dir, 'status.json');
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as [string, TaskState][];
      const tasks = new Map(raw);
      let changed = false;
      for (const [id] of tasks) {
        const task = tasks.get(id)!;
        if (task.status === 'running') {
          tasks.set(id, { ...task, status: 'failure', endTime: Date.now() });
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(Array.from(tasks.entries())), 'utf-8');
      }
      this.tasks = tasks;
      this.notify();
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(new Map(this.tasks));
    }
  }
}
