import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskRunner } from './task-runner.js';
import { StatusStore } from '../status/store.js';
import { EventBus } from './event-bus.js';

vi.mock('child_process', () => {
  function createMockChild() {
    const { EventEmitter } = require('events');
    const child = new EventEmitter() as any;
    child.pid = 12345;
    child.stdout = new EventEmitter() as any;
    child.stdout.readable = true;
    child.stderr = new EventEmitter() as any;
    child.stderr.readable = true;
    child.kill = vi.fn();
    child.unref = vi.fn();
    return child;
  }

  return {
    spawn: vi.fn(() => createMockChild()),
    execSync: vi.fn(() => ''),
  };
});

import { spawn as _spawn, execSync as _execSync } from 'child_process';

const spawn = vi.mocked(_spawn);
const execSync = vi.mocked(_execSync);

const mockCommand = (overrides: Record<string, any> = {}) => ({
  id: 'test',
  label: 'Test',
  command: 'echo hello',
  ...overrides,
});

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('TaskRunner', () => {
  let store: StatusStore;
  let bus: EventBus;
  let runner: TaskRunner;

  beforeEach(() => {
    spawn.mockClear();
    execSync.mockClear();
    store = new StatusStore();
    bus = new EventBus();
    runner = new TaskRunner(store, bus);
  });

  afterEach(() => {
    runner?.abortAll();
  });

  describe('run', () => {
    it('spawns a process with the command', async () => {
      const cmd = mockCommand({ command: 'echo hello' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('close', 0);
      await promise;

      expect(spawn).toHaveBeenCalledWith('echo hello', [], {
        shell: true,
        detached: true,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: undefined,
      });
    });

    it('marks the task as success on exit code 0', async () => {
      const cmd = mockCommand({ command: 'true' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('close', 0);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('success');
      expect(task?.exitCode).toBe(0);
    });

    it('marks the task as failure on non-zero exit code', async () => {
      const cmd = mockCommand({ command: 'false' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('close', 1);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('failure');
      expect(task?.exitCode).toBe(1);
    });

    it('does nothing if command string is empty', async () => {
      await runner.run(mockCommand({ command: '' }));
      expect(spawn).not.toHaveBeenCalled();
    });

    it('does nothing if task is already running', async () => {
      store.updateTask('test', { id: 'test', label: 'T', status: 'running' });
      await runner.run(mockCommand({ command: 'echo x' }));
      expect(spawn).not.toHaveBeenCalled();
    });

    it('captures stdout output', async () => {
      const cmd = mockCommand({ command: 'echo hello' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.stdout.emit('data', Buffer.from('hello\n'));
      child.emit('close', 0);
      await promise;

      const task = store.getTask('test');
      expect(task?.output).toBe('hello\n');
    });

    it('captures stderr output', async () => {
      const cmd = mockCommand({ command: 'cmd' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.stderr.emit('data', Buffer.from('error\n'));
      child.emit('close', 1);
      await promise;

      const task = store.getTask('test');
      expect(task?.output).toBe('error\n');
    });

    it('handles spawn error', async () => {
      const cmd = mockCommand({ command: 'bad' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('error', new Error('spawn failed'));
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('failure');
      expect(task?.exitCode).toBe(-1);
      expect(task?.output).toContain('spawn failed');
    });

    it('emits task:start and task:complete events', async () => {
      const events: string[] = [];
      bus.on('task:start', () => events.push('start'));
      bus.on('task:complete', () => events.push('complete'));

      const cmd = mockCommand({ command: 'echo x' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('close', 0);
      await promise;

      expect(events).toEqual(['start', 'complete']);
    });

    it('emits task:error on spawn failure', async () => {
      const events: string[] = [];
      bus.on('task:error', () => events.push('error'));

      const cmd = mockCommand({ command: 'bad' });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('error', new Error('fail'));
      await promise;

      expect(events).toEqual(['error']);
    });

    it('uses toggle.start for toggle commands', async () => {
      const cmd = mockCommand({
        toggle: { start: 'npm run dev' },
        command: 'ignored',
      });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('close', 0);
      await promise;

      expect(spawn).toHaveBeenCalledWith('npm run dev', [], expect.any(Object));
    });

    it('does not mark as complete for toggle.check commands', async () => {
      const cmd = mockCommand({
        toggle: { start: 'npm run dev', check: 'curl localhost' },
      });
      const promise = runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;
      child.emit('close', 0);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('running');
    });
  });

  describe('stop', () => {
    it('kills a running process', async () => {
      const cmd = mockCommand({ command: 'sleep 100' });
      runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;

      runner.stop(cmd);
      child.emit('close', null);

      expect(child.kill).toHaveBeenCalled();
      const task = store.getTask('test');
      expect(task?.status).toBe('success');
    });

    it('spawns toggle.stop command if defined', async () => {
      const cmd = mockCommand({
        toggle: { start: 'npm run dev', stop: 'pkill -f dev' },
      });
      const runPromise = runner.run(cmd);
      await runPromise;

      runner.stop(cmd);

      expect(spawn).toHaveBeenCalledWith('pkill -f dev', {
        shell: true,
        stdio: 'ignore',
        cwd: undefined,
      });
    });

    it('is a no-op if no process is running', () => {
      const cmd = mockCommand({ command: 'echo x' });
      expect(() => runner.stop(cmd)).not.toThrow();
    });
  });

  describe('abort / abortAll', () => {
    it('aborts a single task', async () => {
      const cmd = mockCommand({ command: 'sleep 100' });
      runner.run(cmd);
      await flushMicrotasks();
      const child = spawn.mock.results[0]?.value;

      runner.abort('test');

      expect(child.kill).toHaveBeenCalled();
    });

    it('aborts all running tasks', async () => {
      const cmd1 = mockCommand({ id: 'a', command: 'sleep 1' });
      const cmd2 = mockCommand({ id: 'b', command: 'sleep 2' });
      runner.run(cmd1);
      await flushMicrotasks();
      runner.run(cmd2);
      await flushMicrotasks();
      const child1 = spawn.mock.results[0]?.value;
      const child2 = spawn.mock.results[1]?.value;

      runner.abortAll();

      expect(child1.kill).toHaveBeenCalled();
      expect(child2.kill).toHaveBeenCalled();
    });

    it('abort does nothing for unknown id', () => {
      expect(() => runner.abort('nope')).not.toThrow();
    });
  });

  describe('setCommands', () => {
    it('updates the internal command list', () => {
      const cmds = [mockCommand({ id: 'a' }), mockCommand({ id: 'b' })];
      runner.setCommands(cmds);
    });
  });

  describe('pipeline', () => {
    it('runs pipeline steps sequentially', async () => {
      runner.setCommands([
        mockCommand({ id: 'step1', command: 'echo step1' }),
        mockCommand({ id: 'step2', command: 'echo step2' }),
      ]);

      const cmd = mockCommand({ pipelineSteps: ['step1', 'step2'] });
      const promise = runner.run(cmd);
      await flushMicrotasks();

      const child1 = spawn.mock.results[0]?.value;
      child1.emit('close', 0);
      await flushMicrotasks();

      const child2 = spawn.mock.results[1]?.value;
      child2.emit('close', 0);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('success');
      expect(task?.output).toContain('Pipeline completed');
    });

    it('fails if a step is not found', async () => {
      const cmd = mockCommand({ pipelineSteps: ['missing-step'] });
      await runner.run(cmd);

      const task = store.getTask('test');
      expect(task?.status).toBe('failure');
      expect(task?.output).toContain('not found');
    });

    it('fails pipeline on step failure', async () => {
      runner.setCommands([
        mockCommand({ id: 'ok', command: 'true' }),
        mockCommand({ id: 'bad', command: 'false' }),
      ]);

      const cmd = mockCommand({ pipelineSteps: ['ok', 'bad'] });
      const promise = runner.run(cmd);
      await flushMicrotasks();

      const child1 = spawn.mock.results[0]?.value;
      child1.emit('close', 0);
      await flushMicrotasks();

      const child2 = spawn.mock.results[1]?.value;
      child2.emit('close', 1);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('failure');
      expect(task?.output).toContain('Pipeline failed at step 2');
    });
  });

  describe('parallel steps', () => {
    it('runs steps in parallel and succeeds on all passing', async () => {
      runner.setCommands([
        mockCommand({ id: 'p1', command: 'echo 1' }),
        mockCommand({ id: 'p2', command: 'echo 2' }),
      ]);

      const cmd = mockCommand({ parallelSteps: ['p1', 'p2'] });
      const promise = runner.run(cmd);
      await flushMicrotasks();

      const children = spawn.mock.results;
      children[0]?.value.emit('close', 0);
      children[1]?.value.emit('close', 0);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('success');
      expect(task?.output).toContain('All parallel steps passed');
    });

    it('fails if any step fails', async () => {
      runner.setCommands([
        mockCommand({ id: 'p1', command: 'echo 1' }),
        mockCommand({ id: 'p2', command: 'echo 2' }),
      ]);

      const cmd = mockCommand({ parallelSteps: ['p1', 'p2'] });
      const promise = runner.run(cmd);
      await flushMicrotasks();

      const children = spawn.mock.results;
      children[0]?.value.emit('close', 0);
      children[1]?.value.emit('close', 1);
      await promise;

      const task = store.getTask('test');
      expect(task?.status).toBe('failure');
    });

    it('fails if a step is not found', async () => {
      const cmd = mockCommand({ parallelSteps: ['missing'] });
      await runner.run(cmd);

      const task = store.getTask('test');
      expect(task?.status).toBe('failure');
      expect(task?.output).toContain('not found');
    });
  });
});
