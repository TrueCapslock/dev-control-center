export type TaskStatus = 'idle' | 'running' | 'success' | 'failure';

export interface TaskState {
  id: string;
  label: string;
  status: TaskStatus;
  output?: string;
  exitCode?: number;
  startTime?: number;
  endTime?: number;
  watchMode?: boolean;
}
