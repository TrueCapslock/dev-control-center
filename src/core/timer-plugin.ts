import fs from 'fs';
import path from 'path';
import type { Plugin } from '../plugins/types.js';
import { PERSISTENCE_DIR } from './persistence.js';

const startTimes = new Map<string, number>();
const TIMINGS_FILE = path.join(process.cwd(), PERSISTENCE_DIR, 'timings.jsonl');

export const timerPlugin: Plugin = {
  id: 'timer',
  name: 'Timer',
  hooks: {
    beforeRun: (command) => {
      startTimes.set(command.id, Date.now());
    },
    afterRun: (command, result) => {
      const start = startTimes.get(command.id);
      if (!start) return;
      startTimes.delete(command.id);
      try {
        fs.mkdirSync(path.dirname(TIMINGS_FILE), { recursive: true });
        fs.appendFileSync(TIMINGS_FILE, JSON.stringify({
          id: command.id,
          label: command.label,
          duration: Date.now() - start,
          exitCode: result.exitCode,
          status: result.status,
          timestamp: new Date().toISOString(),
        }) + '\n');
      } catch {
        // non-critical
      }
    },
  },
};
