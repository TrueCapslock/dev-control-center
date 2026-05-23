import React from 'react';
import { Box, Text } from 'ink';
import { TaskState } from '@prokom-dev/status';

function sanitizeOutput(text: string): string {
  return text
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

interface StatusPanelProps {
  tasks: Map<string, TaskState>;
  scrollOffsets: Map<string, number>;
  focusedPane: 'commands' | 'status';
}

const STATUS_STYLE: Record<TaskState['status'], { icon: string; color: string; label: string }> = {
  idle:    { icon: '\u25CB', color: 'gray',   label: 'IDLE' },
  running: { icon: '\u25CF', color: 'yellow', label: 'RUNNING' },
  success: { icon: '\u2713', color: 'green',  label: 'PASS' },
  failure: { icon: '\u2717', color: 'red',    label: 'FAIL' },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m${s}s`;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  tasks,
  scrollOffsets,
  focusedPane,
}) => {
  const entries = Array.from(tasks.values()).sort(
    (a, b) => (b.startTime || 0) - (a.startTime || 0),
  );

  const isFocused = focusedPane === 'status';

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor={isFocused ? 'cyan' : 'gray'}
    >
      <Box paddingLeft={1}>
        <Text color={isFocused ? 'cyan' : undefined}>
          Status
        </Text>
        {isFocused ? (
          <Text color="cyan">  [Tab to switch]</Text>
        ) : (
          <Text color="gray">  [Tab to focus]</Text>
        )}
      </Box>

      {entries.length === 0 && (
        <Box paddingLeft={2}>
          <Text color="gray">No tasks yet</Text>
        </Box>
      )}

      {entries.map((task) => {
        const style = STATUS_STYLE[task.status];
        const isActive = task.status === 'running';
        const cleaned = task.output ? sanitizeOutput(task.output) : '';
        const lines = cleaned ? cleaned.split('\n') : [];
        const baseLimit = isActive ? 50 : 10;
        const offset = scrollOffsets.get(task.id) ?? 0;

        const endLine = Math.max(0, lines.length - offset);
        const startLine = Math.max(0, endLine - baseLimit);
        const showLines = lines.slice(startLine, endLine);
        const hiddenAbove = startLine;
        const hiddenBelow = offset;

        const duration = task.startTime
          ? formatDuration((task.endTime ?? Date.now()) - task.startTime)
          : null;

        return (
          <Box key={task.id} flexDirection="column" marginBottom={1}>
            <Box paddingLeft={1}>
              <Text color={style.color}>
                {style.icon} {task.label}
              </Text>
              <Text color={style.color}>
                {' ['}{style.label}{']'}
              </Text>
              {duration ? (
                <Text color="gray"> ({duration})</Text>
              ) : null}
              {task.exitCode !== undefined && task.exitCode !== 0 ? (
                <Text color="red"> exit {task.exitCode}</Text>
              ) : null}
              {task.watchMode && (
                <Text color="magenta"> [WATCH]</Text>
              )}
            </Box>
            {task.output ? (
              <Box paddingLeft={2} flexDirection="column">
                {hiddenAbove > 0 && (
                  <Text color="gray">
                    ↑ {hiddenAbove} lines above
                  </Text>
                )}
                <Box paddingLeft={1}>
                  <Text>{showLines.join('\n')}</Text>
                </Box>
                {hiddenBelow > 0 && (
                  <Text color="gray">
                    ↓ {hiddenBelow} lines below
                  </Text>
                )}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
};
