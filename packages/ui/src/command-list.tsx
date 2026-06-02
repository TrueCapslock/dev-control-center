import React from 'react';
import { Box, Text } from 'ink';
import { ProkomCommand } from '@prokom-dev/config';
import { TaskState } from '@prokom-dev/status';
import { Panel } from './panel.js';

export interface MenuGroup {
  id: string;
  label: string;
  count: number;
}

export interface ProfileOption {
  kind: 'profile';
  id: string;
  label: string;
  profile?: string;
  active: boolean;
}

export type MenuItem = ProkomCommand | MenuGroup | ProfileOption;

interface CommandListProps {
  items: MenuItem[];
  selectedIndex: number;
  multiSelected?: Set<string>;
  selCount?: number;
  breadcrumb?: string;
  tasks?: ReadonlyMap<string, TaskState>;
  width: number;
  focused?: boolean;
  menuRows: number;
}

function isGroup(item: MenuItem): item is MenuGroup {
  return 'count' in item;
}

function isProfileOption(item: MenuItem): item is ProfileOption {
  return 'kind' in item && item.kind === 'profile';
}

export const CommandList: React.FC<CommandListProps> = ({
  items,
  selectedIndex,
  multiSelected,
  selCount,
  breadcrumb,
  tasks,
  width,
  focused = false,
  menuRows,
}) => {
  const contentRows = menuRows;
  const panelHeight = menuRows + 2;
  const total = items.length;
  const half = Math.floor(contentRows / 2);
  let start = Math.max(0, selectedIndex - half);
  start = Math.min(start, Math.max(0, total - contentRows));
  const visible = items.slice(start, start + contentRows);
  const hiddenAbove = start;
  const hiddenBelow = total - (start + visible.length);
  const noCommands = total === 0;
  const padRows = Math.max(0, contentRows - (hiddenAbove > 0 ? 1 : 0) - visible.length - (hiddenBelow > 0 ? 1 : 0) - (noCommands ? 1 : 0));

  function getLabel(item: ProkomCommand): string {
    if (!item.toggle) return item.label;
    const task = tasks?.get(item.id);
    return task?.status === 'running' ? `Stop ${item.label}` : `Start ${item.label}`;
  }

  return (
    <Panel
      title="Commands"
      titleColor={focused ? 'cyan' : 'white'}
      borderColor={focused ? 'cyan' : 'white'}
      height={panelHeight}
      width={width}
      titleExtraWidth={(selCount && selCount > 0 ? ` (${selCount} selected)`.length : 0) + (breadcrumb ? ` ${breadcrumb}`.length : 0)}
      titleExtra={(
        <>
          {selCount && selCount > 0 ? (
            <Text color="green"> ({selCount} selected)</Text>
          ) : null}
          {breadcrumb ? (
            <Text color="gray"> {breadcrumb}</Text>
          ) : null}
        </>
      )}
    >
      {total === 0 && (
        <Box paddingLeft={1}>
          <Text color="gray">No commands configured</Text>
        </Box>
      )}
      {hiddenAbove > 0 && (
        <Box paddingLeft={1}>
          <Text color="gray">↑ {hiddenAbove} more</Text>
        </Box>
      )}
      {visible.map((item, i) => {
        const actualIndex = start + i;
        const isCursor = actualIndex === selectedIndex;
        const cursor = isCursor ? '❯' : ' ';

        if (isProfileOption(item)) {
          return (
            <Box key={item.id} paddingLeft={1}>
              <Text color={isCursor ? 'green' : item.active ? 'cyan' : undefined}>
                {cursor} {item.active ? '●' : '○'} {item.label}
              </Text>
            </Box>
          );
        }

        if (!isGroup(item)) {
          const checked = multiSelected?.has(item.id);
          const sel = checked ? '\u2713' : ' ';
          const prefix = `${cursor}[${sel}]`;
          return (
            <Box key={item.id} paddingLeft={1}>
              <Text color={isCursor ? 'green' : undefined}>
                {prefix} {getLabel(item)}
                {item.cwd ? (
                  <Text color={isCursor ? 'green' : 'gray'}>
                    {' ['}{item.cwd}{']'}
                  </Text>
                ) : null}
                {item.parallel ? (
                  <Text color="yellow"> [parallel]</Text>
                ) : null}
                {item.pipelineSteps ? (
                  <Text color="cyan"> [pipeline]</Text>
                ) : null}
                {item.parallelSteps ? (
                  <Text color="yellow"> [parallel {item.parallelSteps.length}]</Text>
                ) : null}
                {item.watch ? (
                  <Text color="magenta"> [watch]</Text>
                ) : null}
              </Text>
            </Box>
          );
        }

        const group = item as MenuGroup;
        return (
          <Box key={group.id} paddingLeft={1}>
            <Text color={isCursor ? 'green' : 'yellow'}>
              {cursor}  <Text bold>▶ {group.label}</Text>
              {' '}
              <Text color={isCursor ? 'green' : 'gray'}>
                ({group.count})
              </Text>
            </Text>
          </Box>
        );
      })}
      {hiddenBelow > 0 && (
        <Box paddingLeft={1}>
          <Text color="gray">↓ {hiddenBelow} more</Text>
        </Box>
      )}

      {Array.from({ length: padRows }).map((_, i) => (
        <Box key={`pad-${i}`} height={1}><Text> </Text></Box>
      ))}
    </Panel>
  );
};
