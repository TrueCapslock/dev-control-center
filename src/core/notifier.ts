import { spawn, ChildProcess } from 'child_process';

const children = new Set<ChildProcess>();

export function sendNotification(
  title: string,
  message: string,
): void {
  let child: ChildProcess | undefined;

  switch (process.platform) {
    case 'linux':
      child = spawn('notify-send', [title, message], {
        stdio: 'ignore',
      });
      break;
    case 'darwin': {
      const escaped = (s: string) => s.replace(/"/g, '\\"');
      child = spawn('osascript', ['-e',
        `display notification "${escaped(message)}" with title "${escaped(title)}"`,
      ], { stdio: 'ignore' });
      break;
    }
  }

  if (child) {
    children.add(child);
    child.on('error', () => { /* notification failed, non-critical */ });
    child.on('close', () => {
      children.delete(child!);
    });
    child.unref();
  }
}
