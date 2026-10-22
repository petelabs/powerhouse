import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskManager } from './tasks.js';
import { MemoryService } from './memory.js';

test('MemoryService gets and updates repository conventions', () => {
  const repo = 'test-owner/test-repo';
  const mem = MemoryService.get(repo);
  assert.equal(mem.repo, repo);

  MemoryService.update(repo, {
    framework: 'Next.js 15',
    conventions: ['App Router', 'Server Actions'],
  });

  const updated = MemoryService.get(repo);
  assert.equal(updated.framework, 'Next.js 15');
  assert.equal(updated.conventions.length, 2);

  MemoryService.clear(repo);
  const cleared = MemoryService.get(repo);
  assert.equal(cleared.conventions.length, 0);
});

test('TaskManager creates task with initial queued status and activity event', () => {
  const task = TaskManager.createTask({
    prompt: 'Unit test task creation',
    repo: 'test-org/test-project',
    branch: 'main',
    personality: 'builder',
    mode: 'implement',
    thinkingEnabled: false,
    autoRun: false,
  });

  assert.ok(task.id);
  assert.equal(task.status, 'queued');
  assert.equal(task.personality, 'builder');
  assert.equal(task.mode, 'implement');
  assert.ok(task.events.length >= 1);
  assert.equal(task.events[0].stage, 'task_accepted');

  // Clean up
  TaskManager.deleteTask(task.id);
});

test('TaskManager cancellation marks task as cancelled', () => {
  const task = TaskManager.createTask({
    prompt: 'Unit test cancellation task',
    repo: 'test-org/test-project',
    branch: 'main',
    personality: 'architect',
    mode: 'plan',
    thinkingEnabled: false,
    autoRun: false,
  });

  const cancelled = TaskManager.cancelTask(task.id);
  assert.equal(cancelled, true);

  const fetched = TaskManager.getTask(task.id);
  assert.equal(fetched?.status, 'cancelled');

  // Clean up
  TaskManager.deleteTask(task.id);
  setTimeout(() => process.exit(0), 50);
});
