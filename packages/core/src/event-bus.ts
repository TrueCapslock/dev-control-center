import { ProkomCommand } from '@prokom-dev/config';

export interface EventMap {
  'task:start': [command: ProkomCommand];
  'task:complete': [id: string, exitCode: number | null];
  'task:output': [id: string, text: string];
  'task:error': [id: string, error: Error];
  [event: string]: any[];
}

type Handler<A extends any[]> = (...args: A) => void;

export class EventBus {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on<E extends keyof EventMap>(event: E, handler: Handler<EventMap[E]>): void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(handler as (...args: any[]) => void);
  }

  off<E extends keyof EventMap>(event: E, handler: Handler<EventMap[E]>): void {
    this.listeners.get(event as string)?.delete(handler as (...args: any[]) => void);
  }

  emit<E extends keyof EventMap>(event: E, ...args: EventMap[E]): void {
    this.listeners.get(event as string)?.forEach((h) => h(...args));
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
