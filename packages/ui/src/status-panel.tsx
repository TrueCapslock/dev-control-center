import React from 'react';
import { Box, Text } from 'ink';
import { ProkomCommand } from '@prokom-dev/config';
import { TaskState } from '@prokom-dev/status';
import { Panel } from './panel.js';

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
  confirmingCommand?: ProkomCommand | null;
  inputCommand?: ProkomCommand | null;
  inputValue?: string;
  width: number;
  menuRows: number;
}
const TASK_HEADER_ROWS = 1;

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
  confirmingCommand,
  inputCommand,
  inputValue = '',
  width,
  menuRows,
}) => {
  const contentRows = menuRows;
  const outputRows = contentRows - TASK_HEADER_ROWS;
  const entries = Array.from(tasks.values()).sort(
    (a, b) => (b.startTime || 0) - (a.startTime || 0),
  );

  const isFocused = focusedPane === 'status';
  const statusColor = isFocused ? 'cyan' : 'white';
  const task = confirmingCommand || inputCommand ? undefined : entries[0];
  const cleaned = task?.output ? sanitizeOutput(task.output) : '';
  const lines = cleaned ? cleaned.split('\n') : [];
  const offset = task ? (scrollOffsets.get(task.id) ?? 0) : 0;
  const endLine = Math.max(0, lines.length - offset);
  const startLine = Math.max(0, endLine - outputRows);
  const showLines = lines.slice(startLine, endLine);
  const hiddenAbove = startLine;
  const hiddenBelow = offset;
  const titleExtraWidth = hiddenAbove > 0 ? `  ↑ ${hiddenAbove} above`.length : 0;

  return (
    <Panel
      title="Output"
      titleColor={isFocused ? 'cyan' : 'white'}
      borderColor={statusColor}
      width={width}
      height={menuRows + 2}
      hiddenAbove={hiddenAbove}
      hiddenBelow={hiddenBelow}
      titleExtraWidth={titleExtraWidth}
      titleExtra={hiddenAbove > 0 ? (
        <Text color="gray">  ↑ {hiddenAbove} above</Text>
      ) : null}
    >

      {confirmingCommand ? (
        <Box flexDirection="column" paddingLeft={2}>
          <Box>
            <Text color="yellow">Run </Text>
            <Text bold color="cyan">{confirmingCommand.label}</Text>
            <Text color="yellow">?</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Enter or Y to confirm</Text>
          </Box>
          <Box>
            <Text color="gray">Esc or N to cancel</Text>
          </Box>
        </Box>
      ) : null}

      {inputCommand ? (
        <Box flexDirection="column" paddingLeft={2}>
          <Box>
            <Text color="cyan">{inputCommand.input?.message ?? 'Input:'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text wrap="truncate-end">
              <Text>{inputValue}</Text>
              <Text color="gray">{inputValue ? '█' : (inputCommand.input?.placeholder ?? '')}</Text>
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Enter to confirm, Esc to cancel</Text>
          </Box>
        </Box>
      ) : null}

      {!task && !confirmingCommand && !inputCommand && (
        <Box paddingLeft={2}>
          <Text color="gray">No tasks yet</Text>
        </Box>
      )}

      {task ? (() => {
        const style = STATUS_STYLE[task.status];
        const duration = task.startTime
          ? formatDuration((task.endTime ?? Date.now()) - task.startTime)
          : null;

        return (
          <Box key={task.id} flexDirection="column">
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
                <Box paddingLeft={1} flexDirection="column">
                  {showLines.map((line, index) => (
                    <Text key={`${startLine + index}-${line}`} wrap="truncate-end">
                      {line || ' '}
                    </Text>
                  ))}
                </Box>
              </Box>
            ) : null}
          </Box>
        );
      })() : null}
    </Panel>
  );
};
