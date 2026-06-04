import fs from 'fs';
import path from 'path';
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { TaskState, TaskStatus } from '../status/types.js';
import { Panel } from './panel.js';

interface MetricsPanelProps {
  tasks: Map<string, TaskState>;
  menuRows: number;
  width: number;
}
const METRICS_FILE = path.join(process.cwd(), '.developer-control-center', 'metrics.json');

interface MetricsState {
  projectRunning: boolean;
  activeTasks: number;
  latestTest?: {
    label: string;
    status: TaskStatus;
    time?: number;
  };
  latestBuild?: {
    status: TaskStatus;
    time?: number;
  };
  lastGitPush?: {
    label: string;
    time?: number;
  };
  packageVersion: string;
}

const INITIAL_METRICS: MetricsState = {
  projectRunning: false,
  activeTasks: 0,
  packageVersion: loadPackageVersion(),
};

function loadPackageVersion(): string {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
    ) as { version?: string };
    return packageJson.version ?? '-';
  } catch {
    return '-';
  }
}

function loadMetrics(): MetricsState {
  try {
    const persisted = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8')) as MetricsState;
    return {
      ...INITIAL_METRICS,
      latestTest: persisted.latestTest,
      latestBuild: persisted.latestBuild,
      lastGitPush: persisted.lastGitPush,
    };
  } catch {
    return INITIAL_METRICS;
  }
}

function isBumpTask(task: TaskState): boolean {
  return task.id === 'bump-version';
}

function saveMetrics(metrics: MetricsState): void {
  try {
    fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics), 'utf-8');
  } catch {
    // Metrics are useful but non-critical.
  }
}

function isTestTask(task: TaskState): boolean {
  const name = `${task.id} ${task.label}`.toLowerCase();
  return name.includes('test');
}

function isBuildTask(task: TaskState): boolean {
  const name = `${task.id} ${task.label}`.toLowerCase();
  return name.includes('build');
}

function isSuccessfulGitPushTask(task: TaskState): boolean {
  const name = `${task.id} ${task.label}`.toLowerCase();
  return name.includes('push') && task.status === 'success';
}

function formatTimestamp(time?: number): string | null {
  if (!time) return null;
  const date = new Date(time);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatSince(time?: number): string | null {
  if (!time) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ tasks, menuRows, width }) => {
  const [metrics, setMetrics] = useState<MetricsState>(loadMetrics);
  const latestTestTime = formatSince(metrics.latestTest?.time);
  const latestBuildTime = formatSince(metrics.latestBuild?.time);
  const lastGitPushTime = formatTimestamp(metrics.lastGitPush?.time);

  useEffect(() => {
    setMetrics((previous) => {
      const entries = Array.from(tasks.values());

      const hasBumpCompleted = entries.some(
        (t) => isBumpTask(t) && (t.status === 'success' || t.status === 'failure'),
      );

      const running = entries.filter((t) => t.status === 'running');

      const latestTest = entries
        .filter(isTestTask)
        .sort((a, b) => (b.endTime ?? b.startTime ?? 0) - (a.endTime ?? a.startTime ?? 0))[0];

      const latestBuild = entries
        .filter(isBuildTask)
        .sort((a, b) => (b.endTime ?? b.startTime ?? 0) - (a.endTime ?? a.startTime ?? 0))[0];

      const latestPush = entries
        .filter(isSuccessfulGitPushTask)
        .sort((a, b) => (b.endTime ?? b.startTime ?? 0) - (a.endTime ?? a.startTime ?? 0))[0];

      const next: MetricsState = {
        projectRunning: running.length > 0,
        activeTasks: running.length,
        packageVersion: hasBumpCompleted ? loadPackageVersion() : previous.packageVersion,
        latestTest: latestTest?.label && latestTest?.status
          ? {
              label: latestTest.label,
              status: latestTest.status,
              time: latestTest.endTime ?? latestTest.startTime,
            }
          : previous.latestTest,
        latestBuild: latestBuild?.status
          ? {
              status: latestBuild.status,
              time: latestBuild.endTime ?? latestBuild.startTime,
            }
          : previous.latestBuild,
        lastGitPush: latestPush?.label
          ? {
              label: latestPush.label,
              time: latestPush.endTime ?? latestPush.startTime,
            }
          : previous.lastGitPush,
      };

      saveMetrics(next);
      return next;
    });
  }, [tasks]);

  return (
    <Panel title="Status" width={width} height={menuRows + 2}>
      <Box paddingLeft={1}>
        <Text color={metrics.projectRunning ? 'yellow' : 'gray'}>
          Project: {metrics.projectRunning ? 'running' : 'idle'}
        </Text>
      </Box>

      <Box paddingLeft={1}>
        <Text color="gray">
          Active: {metrics.activeTasks}
        </Text>
      </Box>

      <Box paddingLeft={1}>
        <Text color="gray">
          Version: {metrics.packageVersion}
        </Text>
      </Box>

      <Box paddingLeft={1}>
        <Text color="gray">{'\u2500'.repeat(Math.max(0, width - 4))}</Text>
      </Box>

      <Box paddingLeft={1}>
        {!metrics.latestTest ? (
          <Text color="gray">Tests: no run</Text>
        ) : (
          <Text color={metrics.latestTest.status === 'success' ? 'green' :
                       metrics.latestTest.status === 'failure' ? 'red' :
                       metrics.latestTest.status === 'running' ? 'yellow' : 'gray'}
          >
            Tests: {metrics.latestTest.status === 'success' ? 'passed' :
                    metrics.latestTest.status === 'failure' ? 'failed' :
                    metrics.latestTest.status === 'running' ? 'running' : 'idle'}
            {latestTestTime ? <Text color="gray"> - {latestTestTime}</Text> : null}
          </Text>
        )}
      </Box>

      <Box paddingLeft={1}>
        {!metrics.latestBuild ? (
          <Text color="gray">Build: no run</Text>
        ) : (
          <Text color={metrics.latestBuild.status === 'success' ? 'green' :
                       metrics.latestBuild.status === 'failure' ? 'red' :
                       metrics.latestBuild.status === 'running' ? 'yellow' : 'gray'}
          >
            Build: {metrics.latestBuild.status === 'success' ? 'passed' :
                    metrics.latestBuild.status === 'failure' ? 'failed' :
                    metrics.latestBuild.status === 'running' ? 'running' : 'idle'}
            {latestBuildTime ? <Text color="gray"> - {latestBuildTime}</Text> : null}
          </Text>
        )}
      </Box>

      <Box paddingLeft={1}>
        <Text color="gray" wrap="truncate-end">
          Push: {lastGitPushTime ?? '-'}
        </Text>
      </Box>
    </Panel>
  );
};
