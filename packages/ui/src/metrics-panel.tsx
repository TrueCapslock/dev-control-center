import fs from 'fs';
import path from 'path';
import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { TaskState, TaskStatus } from '@prokom-dev/status';

interface MetricsPanelProps {
  tasks: Map<string, TaskState>;
}

const PANEL_HEIGHT = 11;
const METRICS_FILE = path.join(process.cwd(), '.prokom', 'metrics.json');

interface MetricsState {
  projectRunning: boolean;
  activeTasks: number;
  latestTest?: {
    label: string;
    status: TaskStatus;
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
    return { ...INITIAL_METRICS, latestTest: persisted.latestTest };
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
      };

      saveMetrics(next);
      return next;
    });
  }, [latestTestLabel, latestTestStatus, latestTestTimeValue, runningTasks.length]);

  return (
    <Box
      flexDirection="column"
      width={28}
      height={PANEL_HEIGHT}
      borderStyle="round"
      borderColor="white"
    >
      <Box paddingLeft={1}>
        <Text color="cyan">Status</Text>
      </Box>

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
        ) : metrics.latestTest.status === 'success' ? (
          <Text color="green">Tests: passed</Text>
        ) : metrics.latestTest.status === 'failure' ? (
          <Text color="red">Tests: failed</Text>
        ) : metrics.latestTest.status === 'running' ? (
          <Text color="yellow">Tests: running</Text>
        ) : (
          <Text color="gray">Tests: idle</Text>
        )}
      </Box>

      <Box paddingLeft={1}>
        <Text color="gray">
          Latest: {metrics.latestTest ? metrics.latestTest.label : '-'}
        </Text>
      </Box>

      <Box paddingLeft={1}>
        <Text color="gray">
          When: {latestTestTime ?? '-'}
        </Text>
      </Box>
    </Box>
  );
};
