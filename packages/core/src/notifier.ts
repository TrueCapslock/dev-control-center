import { spawn } from 'child_process';

export interface NotificationOptions {
  enabled: boolean;
}

export function sendNotification(
  title: string,
  message: string,
): void {
  switch (process.platform) {
    case 'linux':
      try {
        spawn('notify-send', [title, message], { timeout: 2000 });
      } catch {
        // notify-send not available
      }
      break;
    case 'darwin':
      try {
        spawn('osascript', ['-e', `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`], { timeout: 2000 });
      } catch {
        // osascript not available
      }
      break;
  }
}
