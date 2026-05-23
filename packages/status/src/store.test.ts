import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { StatusStore } from './store.js';

describe('StatusStore', () => {
  let store: StatusStore;

  beforeEach(() => {
    store = new StatusStore();
  });

  it('starts empty', () => {
    expect(store.getAllTasks().size).toBe(0);
  });

  it('stores and retrieves a task', () => {
    store.updateTask('build', {
      id: 'build',
      label: 'Build',
      status: 'running',
      output: '',
    });
    const task = store.getTask('build');
    expect(task?.label).toBe('Build');
    expect(task?.status).toBe('running');
  });

  it('updates an existing task', () => {
    store.updateTask('build', {
      id: 'build',
      label: 'Build',
      status: 'running',
      output: 'start',
    });
    store.updateTask('build', { output: 'start\nprogress' });
    expect(store.getTask('build')?.output).toBe('start\nprogress');
  });

  it('clears all tasks', () => {
    store.updateTask('a', { id: 'a', label: 'A', status: 'running' });
    store.updateTask('b', { id: 'b', label: 'B', status: 'success' });
    expect(store.getAllTasks().size).toBe(2);
    store.clear();
    expect(store.getAllTasks().size).toBe(0);
  });

  it('prunes completed tasks but keeps running ones', () => {
    store.updateTask('running-task', { id: 'running-task', label: 'Running', status: 'running' });
    store.updateTask('done-task', { id: 'done-task', label: 'Done', status: 'success' });
    store.updateTask('failed-task', { id: 'failed-task', label: 'Failed', status: 'failure' });
    expect(store.getAllTasks().size).toBe(3);
    store.pruneCompleted();
    expect(store.getAllTasks().size).toBe(1);
    expect(store.getTask('running-task')).toBeDefined();
    expect(store.getTask('done-task')).toBeUndefined();
    expect(store.getTask('failed-task')).toBeUndefined();
  });

  it('pruneCompleted removes nothing when all tasks are running', () => {
    store.updateTask('a', { id: 'a', label: 'A', status: 'running' });
    store.updateTask('b', { id: 'b', label: 'B', status: 'running' });
    store.pruneCompleted();
    expect(store.getAllTasks().size).toBe(2);
  });

  it('notifies subscribers on update', () => {
    const updates: number[] = [];
    store.subscribe((tasks) => updates.push(tasks.size));
    store.updateTask('x', { id: 'x', label: 'X', status: 'running' });
    expect(updates).toEqual([1]);
  });

  it('unsubscribes correctly', () => {
    const updates: number[] = [];
    const unsub = store.subscribe((tasks) => updates.push(tasks.size));
    unsub();
    store.updateTask('x', { id: 'x', label: 'X', status: 'running' });
    expect(updates).toEqual([]);
  });

  it('persists and loads from directory', () => {
    const dir = '/tmp/prokom-test-store';
    fs.mkdirSync(dir, { recursive: true });
    store.updateTask('persist', {
      id: 'persist',
      label: 'Persist',
      status: 'success',
      exitCode: 0,
    });
    store.saveDir(dir);

    const store2 = new StatusStore();
    store2.loadDir(dir);
    const task = store2.getTask('persist');
    expect(task?.label).toBe('Persist');
    expect(task?.status).toBe('success');

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
