import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { ProkomCommand } from '@prokom-dev/config';

export interface MenuGroup {
  id: string;
  label: string;
  count: number;
}

export type MenuItem = ProkomCommand | MenuGroup;

interface CommandListProps {
  items: MenuItem[];
  selectedIndex: number;
  multiSelected?: Set<string>;
  selCount?: number;
  breadcrumb?: string;
  maxHeight?: number;
}

export const CommandList: React.FC<CommandListProps> = ({
  items,
  selectedIndex,
  multiSelected,
  selCount,
  breadcrumb,
  maxHeight: maxHeightProp,
}) => {
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const maxHeight = maxHeightProp ?? Math.max(5, rows - 6);
  const total = items.length;
  const half = Math.floor(maxHeight / 2);
  let start = Math.max(0, selectedIndex - half);
  start = Math.min(start, Math.max(0, total - maxHeight));
  const visible = items.slice(start, start + maxHeight);
  const hiddenAbove = start;
  const hiddenBelow = total - (start + visible.length);

  return (
    <Box flexDirection="column" minWidth={30} borderStyle="round" borderColor="gray">
      <Box paddingLeft={1}>
        <Text color="cyan">Commands</Text>
        {selCount && selCount > 0 ? (
          <Text color="green"> ({selCount} selected)</Text>
        ) : null}
        {breadcrumb ? (
          <Text color="gray"> {breadcrumb}</Text>
        ) : null}
      </Box>

      {total === 0 && (
        <Box paddingLeft={2}>
          <Text color="gray">No commands configured</Text>
        </Box>
      )}
      {hiddenAbove > 0 && (
        <Box paddingLeft={2}>
          <Text color="gray">↑ {hiddenAbove} more</Text>
        </Box>
      )}
      {visible.map((item, i) => {
        const actualIndex = start + i;
        const isCursor = actualIndex === selectedIndex;
        const cursor = isCursor ? '❯' : ' ';

        if ('command' in item) {
          const checked = multiSelected?.has(item.id);
          const sel = checked ? '\u2713' : ' ';
          const prefix = `${cursor}[${sel}]`;
          return (
            <Box key={item.id} paddingLeft={1}>
              <Text color={isCursor ? 'green' : undefined}>
                {prefix} {item.label}
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

        return (
          <Box key={item.id} paddingLeft={1}>
            <Text color={isCursor ? 'green' : 'yellow'}>
              {cursor}  <Text bold>▸ {item.label}</Text>
              {' '}
              <Text color={isCursor ? 'green' : 'gray'}>
                ({item.count})
              </Text>
            </Text>
          </Box>
        );
      })}
      {hiddenBelow > 0 && (
        <Box paddingLeft={2}>
          <Text color="gray">↓ {hiddenBelow} more</Text>
        </Box>
      )}
    </Box>
  );
};
