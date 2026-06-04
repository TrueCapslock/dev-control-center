import { render } from 'ink';
import React from 'react';
import { App } from './app.js';
import { Runtime } from '../core/index.js';
import { ProkomConfig } from '../config/index.js';

export function startUI(config: ProkomConfig, runtime: Runtime) {
  const { waitUntilExit } = render(<App config={config} runtime={runtime} />);
  return waitUntilExit();
}
