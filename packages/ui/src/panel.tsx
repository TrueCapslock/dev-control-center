import React, { ReactNode } from 'react';
import { Box, Text } from 'ink';

interface PanelProps {
  title: string;
  titleColor?: string;
  borderColor?: string;
  titleExtra?: ReactNode;
  titleExtraWidth?: number;
  hiddenAbove?: number;
  hiddenBelow?: number;
  children: ReactNode;
  height: number;
  width: number;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  titleColor = 'cyan',
  borderColor = 'white',
  titleExtra,
  titleExtraWidth = 0,
  hiddenAbove,
  hiddenBelow,
  children,
  height,
  width,
}) => {
  const contentHeight = Math.max(0, height - 2);
  const innerWidth = Math.max(0, width - 2);

  const showAbove = hiddenAbove != null && hiddenAbove > 0;
  const showBelow = hiddenBelow != null && hiddenBelow > 0;
  const aboveText = showAbove ? `↑${hiddenAbove} more` : '';
  const belowText = showBelow ? `↓${hiddenBelow} more` : '';
  const aboveLen = showAbove ? aboveText.length + 1 : 0;
  const belowLen = showBelow ? belowText.length + 1 : 0;

  const topFillWidth = Math.max(0, width - title.length - titleExtraWidth - aboveLen - 5);
  const bottomFillWidth = Math.max(0, width - belowLen - 2);

  return (
    <Box flexDirection="column" height={height} width={width}>
      <Box width={width}>
        <Text color={borderColor}>╭─ </Text>
        <Text color={titleColor}>{title}</Text>
        {titleExtra}
        <Text color={borderColor}> </Text>
        <Text color={borderColor}>{'─'.repeat(topFillWidth)}</Text>
        {aboveText ? <Text color="gray">{aboveText}</Text> : null}
        <Text color={borderColor}>{aboveText ? '─' : ''}╮</Text>
      </Box>
      <Box height={contentHeight} width={width}>
        <Box flexDirection="column" width={1}>
          {Array.from({ length: contentHeight }).map((_, index) => (
            <Text key={`left-${index}`} color={borderColor}>│</Text>
          ))}
        </Box>
        <Box flexDirection="column" width={innerWidth} height={contentHeight} overflow="hidden">
          {children}
        </Box>
        <Box flexDirection="column" width={1}>
          {Array.from({ length: contentHeight }).map((_, index) => (
            <Text key={`right-${index}`} color={borderColor}>│</Text>
          ))}
        </Box>
      </Box>
      <Box width={width}>
        <Text color={borderColor}>╰</Text>
        <Text color={borderColor}>{'─'.repeat(bottomFillWidth)}</Text>
        {belowText ? <Text color="gray">{belowText}</Text> : null}
        <Text color={borderColor}>{belowText ? '─' : ''}╯</Text>
      </Box>
    </Box>
  );
};
