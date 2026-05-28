import fs from 'fs';
import path from 'path';
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { TaskState, TaskStatus } from '@prokom-dev/status';
import { Panel } from './panel.js';

interface MetricsPanelProps {
  tasks: Map<string, TaskState>;
}

const PANEL_HEIGHT = 10;
const METRICS_FILE = path.join(process.cwd(), '.prokom', 'metrics.json');

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
}

const INITIAL_METRICS: MetricsState = {
  projectRunning: false,
  activeTasks: 0,
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

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ tasks }) => {
  const [metrics, setMetrics] = useState<MetricsState>(loadMetrics);
  const [packageVersion] = useState(loadPackageVersion);
  const entries = Array.from(tasks.values());
  const runningTasks = entries.filter((task) => task.status === 'running');
  const latestCurrentTest = entries
    .filter(isTestTask)
    .sort((a, b) => (b.endTime ?? b.startTime ?? 0) - (a.endTime ?? a.startTime ?? 0))[0];
  const latestTestLabel = latestCurrentTest?.label;
  const latestTestStatus = latestCurrentTest?.status;
  const latestTestTimeValue = latestCurrentTest?.endTime ?? latestCurrentTest?.startTime;
  const latestTestTime = formatSince(metrics.latestTest?.time);
  const latestCurrentBuild = entries
    .filter(isBuildTask)
    .sort((a, b) => (b.endTime ?? b.startTime ?? 0) - (a.endTime ?? a.startTime ?? 0))[0];
  const latestBuildStatus = latestCurrentBuild?.status;
  const latestBuildTimeValue = latestCurrentBuild?.endTime ?? latestCurrentBuild?.startTime;
  const latestBuildTime = formatSince(metrics.latestBuild?.time);
  const latestGitPush = entries
    .filter(isSuccessfulGitPushTask)
    .sort((a, b) => (b.endTime ?? b.startTime ?? 0) - (a.endTime ?? a.startTime ?? 0))[0];
  const latestGitPushLabel = latestGitPush?.label;
  const latestGitPushTimeValue = latestGitPush?.endTime ?? latestGitPush?.startTime;
  const lastGitPushTime = formatTimestamp(metrics.lastGitPush?.time);

  useEffect(() => {
    setMetrics((previous) => {
      const next: MetricsState = {
        projectRunning: runningTasks.length > 0,
        activeTasks: runningTasks.length,
        latestTest: latestTestLabel && latestTestStatus
          ? {
              label: latestTestLabel,
              status: latestTestStatus,
              time: latestTestTimeValue,
            }
          : previous.latestTest,
        latestBuild: latestBuildStatus
          ? {
              status: latestBuildStatus,
              time: latestBuildTimeValue,
            }
          : previous.latestBuild,
        lastGitPush: latestGitPushLabel
          ? {
              label: latestGitPushLabel,
              time: latestGitPushTimeValue,
            }
          : previous.lastGitPush,
      };

      saveMetrics(next);
      return next;
    });
  }, [latestBuildStatus, latestBuildTimeValue, latestGitPushLabel, latestGitPushTimeValue, latestTestLabel, latestTestStatus, latestTestTimeValue, runningTasks.length]);

  return (
    <Panel title="Status" width={28} height={PANEL_HEIGHT}>
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
          Version: {packageVersion}
        </Text>
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
