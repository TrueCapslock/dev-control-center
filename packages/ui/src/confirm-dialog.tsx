import React from 'react';
import { Box, Text } from 'ink';
import { ProkomCommand } from '@prokom-dev/config';

interface ConfirmDialogProps {
  command: ProkomCommand;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ command }) => (
  <Box
    borderStyle="double"
    borderColor="yellow"
    paddingX={1}
    marginBottom={1}
  >
    <Text>
      <Text color="yellow">⚠</Text>
      {' '}Run{' '}
      <Text bold color="cyan">{command.label}</Text>
      <Text>? </Text>
      <Text color="green">Y</Text>
      <Text color="gray">/</Text>
      <Text color="red">n</Text>
      <Text color="gray"> — Enter or Y to confirm, Esc or N to cancel</Text>
    </Text>
  </Box>
);
