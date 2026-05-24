import React from 'react';
import { Box, Text } from 'ink';
import { ProkomCommand } from '@prokom-dev/config';

interface InputPromptProps {
  command: ProkomCommand;
  value: string;
}

export const InputPrompt: React.FC<InputPromptProps> = ({ command, value }) => {
  return (
    <Box flexDirection="column" marginY={1} paddingX={2}>
      <Box>
        <Text color="cyan">✎ </Text>
        <Text>{command.input?.message ?? 'Input:'}</Text>
      </Box>
      <Box marginTop={1} borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text>
          <Text>{value}</Text>
          <Text color="gray">{value ? '█' : (command.input?.placeholder ?? '')}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Enter to confirm, Esc to cancel</Text>
      </Box>
    </Box>
  );
};
