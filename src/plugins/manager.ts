import { Plugin, PluginHooks } from './types.js';

type HookName = keyof PluginHooks;

export class PluginManager {
  private plugins = new Map<string, Plugin>();

  constructor(
    private onError?: (msg: string, err: unknown) => void,
  ) {}

  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  remove(id: string): boolean {
    return this.plugins.delete(id);
  }

  async executeHook<K extends HookName>(
    hook: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<void> {
    for (const plugin of this.plugins.values()) {
      const fn = plugin.hooks?.[hook] as
        | ((...a: any[]) => void | Promise<void>)
        | undefined;
      if (fn) {
        try {
          await Promise.resolve(fn(...args));
        } catch (e) {
          this.onError?.(`Plugin ${plugin.id} ${hook} error`, e);
        }
      }
    }
  }

  async loadFromConfig(pluginNames?: string[]): Promise<void> {
    if (!pluginNames?.length) return;
    for (const name of pluginNames) {
      try {
        const mod = await import(name);
        const p: Plugin = mod.default || mod;
        this.register(p);
      } catch (e) {
        this.onError?.(`Failed to load plugin "${name}"`, e);
      }
    }
  }
}
