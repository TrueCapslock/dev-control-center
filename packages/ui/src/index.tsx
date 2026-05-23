import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { Runtime } from '@prokom-dev/core';
import { ProkomConfig } from '@prokom-dev/config';

export function startUI(config: ProkomConfig, runtime: Runtime) {
  const { waitUntilExit } = render(<App config={config} runtime={runtime} />);
  return waitUntilExit();
}
