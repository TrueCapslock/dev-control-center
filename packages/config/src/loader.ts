import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ProkomConfig, ProkomCommand, ProkomPreset } from './types.js';

const CONFIG_CANDIDATES = [
  'prokom.config.mjs',
  'prokom.config.cjs',
  'prokom.config.js',
];

function findConfigFile(cwd: string): string | null {
  for (const file of CONFIG_CANDIDATES) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

async function resolvePreset(
  name: string,
  cwd: string,
): Promise<ProkomPreset> {
  if (name.startsWith('.') || name.startsWith('/')) {
    const resolved = pathToFileURL(path.resolve(cwd, name)).href;
    const mod = await import(resolved);
    return mod.default || mod;
  }

  try {
    const mod = await import(`prokom-preset-${name}`);
    return mod.default || mod;
  } catch {
    const mod = await import(name);
    return mod.default || mod;
  }
}

function mergeCommands(
  base: ProkomCommand[],
  overrides: ProkomCommand[],
): ProkomCommand[] {
  const overrideMap = new Map<string, ProkomCommand>();
  for (const cmd of overrides) {
    overrideMap.set(cmd.id, cmd);
  }

  const seen = new Set<string>();
  const merged: ProkomCommand[] = [];

  for (const cmd of base) {
    seen.add(cmd.id);
    merged.push(overrideMap.get(cmd.id) ?? cmd);
  }

  for (const cmd of overrides) {
    if (!seen.has(cmd.id)) {
      seen.add(cmd.id);
      merged.push(cmd);
    }
  }

  return merged;
}

export async function loadConfig(
  configPath?: string,
  profile?: string,
): Promise<ProkomConfig> {
  const cwd = process.cwd();
  const resolved = configPath || findConfigFile(cwd);

  if (!resolved) {
    return { name: path.basename(cwd), commands: [] };
  }

  const configFileDir = path.dirname(resolved);
  let mod;
  try {
    mod = await import(pathToFileURL(resolved).href);
  } catch (err) {
    console.error(`prokom: failed to load config file ${resolved}`);
    console.error(err instanceof Error ? err.message : String(err));
    return { name: path.basename(cwd), commands: [] };
  }
  const config: ProkomConfig = mod.default || mod;

  if (config.presets && config.presets.length > 0) {
    const presetList: ProkomPreset[] = [];
    for (const presetName of config.presets) {
      const preset = await resolvePreset(presetName, configFileDir);
      presetList.push(preset);
    }

    const allPresetCommands = presetList.flatMap((p) => p.commands);
    config.commands = mergeCommands(allPresetCommands, config.commands);
  }

  config.baseCommands = [...config.commands];

  if (profile && config.profiles?.[profile]) {
    config.commands = mergeCommands(
      config.commands,
      config.profiles[profile].commands,
    );
    config.profile = profile;
  }

  if (config.pipelines) {
    for (const pipeline of config.pipelines) {
      config.commands.push({
        id: pipeline.id,
        label: `▶ ${pipeline.label}`,
        description: `Run pipeline: ${pipeline.steps.join(' → ')}`,
        command: '',
        confirm: pipeline.confirm,
        pipelineSteps: pipeline.steps,
      });
    }
  }

  return config;
}
