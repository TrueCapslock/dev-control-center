import { execSync } from 'child_process';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { Runtime } from '@prokom-dev/core';
import { ProkomConfig, ProkomCommand } from '@prokom-dev/config';
import { TaskState } from '@prokom-dev/status';
import { CommandList, MenuGroup, MenuItem, ProfileOption } from './command-list.js';
import { MetricsPanel } from './metrics-panel.js';
import { StatusPanel } from './status-panel.js';

interface AppProps {
  config: ProkomConfig;
  runtime: Runtime;
}

type Mode = 'normal' | 'search' | 'confirm' | 'input';
type Pane = 'commands' | 'status';

const PROFILE_GROUP_ID = '__profiles';
const GROUP_ORDER = ['Development', 'Build', 'Deploy', 'Management', 'Demo'];

function mergeCommands(base: ProkomCommand[], overrides: ProkomCommand[]): ProkomCommand[] {
  const overrideMap = new Map(overrides.map((cmd) => [cmd.id, cmd]));
  const seen = new Set<string>();
  const merged: ProkomCommand[] = [];

  for (const cmd of base) {
    seen.add(cmd.id);
    merged.push(overrideMap.get(cmd.id) ?? cmd);
  }

  for (const cmd of overrides) {
    if (!seen.has(cmd.id)) merged.push(cmd);
  }

  return merged;
}

function commandsForProfile(config: ProkomConfig, profile?: string): ProkomCommand[] {
  const base = config.baseCommands ?? config.commands;
  const profileCommands = profile ? (config.profiles?.[profile]?.commands ?? []) : [];
  const commands = profile ? mergeCommands(base, profileCommands) : [...base];

  for (const pipeline of config.pipelines ?? []) {
    commands.push({
      id: pipeline.id,
      label: `▶ ${pipeline.label}`,
      description: `Run pipeline: ${pipeline.steps.join(' → ')}`,
      command: '',
      confirm: pipeline.confirm,
      pipelineSteps: pipeline.steps,
    });
  }

  return commands;
}

function isProfileOption(item: MenuItem): item is ProfileOption {
  return 'kind' in item && item.kind === 'profile';
}

export const App: React.FC<AppProps> = ({ config, runtime }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [mode, setMode] = useState<Mode>('normal');
  const [focusedPane, setFocusedPane] = useState<Pane>('commands');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tasks, setTasks] = useState<Map<string, TaskState>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingCmd, setConfirmingCmd] = useState<ProkomCommand | null>(
    null,
  );
  const [inputCmd, setInputCmd] = useState<ProkomCommand | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [scrollOffsets, setScrollOffsets] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [activeProfile, setActiveProfile] = useState<string | undefined>(config.profile);
  const menuRows = config.menuRows ?? 8;
  const terminalColumns = stdout?.columns ?? 120;
  const availablePaneWidth = Math.max(90, terminalColumns - 4);
  const statusPaneWidth = 28;
  const commandPaneWidth = Math.min(52, Math.max(34, Math.floor(availablePaneWidth * 0.34)));
  const outputPaneWidth = Math.max(30, availablePaneWidth - commandPaneWidth - statusPaneWidth - 2);

  const activeCommands = useMemo(
    () => commandsForProfile(config, activeProfile),
    [activeProfile, config],
  );

  useEffect(() => {
    runtime.taskRunner.setCommands(activeCommands);
  }, [activeCommands, runtime]);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const confirmingCmdRef = useRef(confirmingCmd);
  confirmingCmdRef.current = confirmingCmd;
  const inputCmdRef = useRef(inputCmd);
  inputCmdRef.current = inputCmd;
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    const unsub = runtime.statusStore.subscribe((updated) => {
      const map = new Map(updated);
      setTasks(map);
      setScrollOffsets((prev) => {
        const next = new Map(prev);
        for (const id of next.keys()) {
          if (!map.has(id)) next.delete(id);
        }
        return next;
      });
    });
    return unsub;
  }, [runtime]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const result: MenuGroup[] = [];
    for (const cmd of activeCommands) {
      if (cmd.group && !seen.has(cmd.group)) {
        seen.add(cmd.group);
        const count = activeCommands.filter(
          (c) => c.group === cmd.group,
        ).length;
        result.push({ id: `__group_${cmd.group}`, label: cmd.group, count });
      }
    }
    return result.sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a.label);
      const bi = GROUP_ORDER.indexOf(b.label);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [activeCommands]);

  const hasGroups = groups.length > 0;
  const profileNames = Object.keys(config.profiles ?? {});
  const hasProfiles = profileNames.length > 0;

  const menuItems = useMemo((): MenuItem[] => {
    if (currentGroup === PROFILE_GROUP_ID) {
      const defaultProfile: ProfileOption = {
        kind: 'profile',
        id: '__profile_default',
        label: 'Default',
        active: !activeProfile,
      };
      return [
        defaultProfile,
        ...profileNames.map((profile): ProfileOption => ({
          kind: 'profile',
          id: `__profile_${profile}`,
          label: profile,
          profile,
          active: activeProfile === profile,
        })),
      ];
    }

    const profileGroup: MenuGroup[] = hasProfiles
      ? [{ id: PROFILE_GROUP_ID, label: 'Profiles', count: profileNames.length + 1 }]
      : [];

    const pipelines = activeCommands.filter((c) => c.pipelineSteps);
    const ungrouped = activeCommands.filter((c) => !c.group && !c.pipelineSteps);

    if (!hasGroups) return [...ungrouped, ...profileGroup, ...pipelines];

    if (currentGroup) {
      return activeCommands.filter((c) => c.group === currentGroup);
    }

    return [...groups, ...ungrouped, ...profileGroup, ...pipelines];
  }, [activeCommands, activeProfile, currentGroup, groups, hasGroups, hasProfiles, profileNames]);

  const filteredItems = useMemo((): MenuItem[] => {
    if (!searchQuery) return menuItems;
    return menuItems.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [menuItems, searchQuery]);

  useEffect(() => {
    if (selectedIndex >= filteredItems.length && filteredItems.length > 0) {
      setSelectedIndex(filteredItems.length - 1);
    }
  }, [filteredItems.length, selectedIndex]);

  const breadcrumb = hasGroups && currentGroup
    ? `› ${currentGroup === PROFILE_GROUP_ID ? 'Profiles' : currentGroup}`
    : undefined;

  const selCount = multiSelected.size;
  const selectedItem = filteredItems[selectedIndex];
  const footerText = selectedItem
    ? isProfileOption(selectedItem)
      ? selectedItem.active
        ? `Active profile: ${selectedItem.label}`
        : `Switch to ${selectedItem.label} profile`
      : 'count' in selectedItem
        ? `Open ${selectedItem.label}`
        : selectedItem.description ?? 'Enter to run, Space to select, / to search, Tab to focus output'
    : 'Enter to run, Space to select, / to search, Tab to focus output';

  function ensureNpmLogin(): boolean {
    try {
      execSync('npm whoami 2>/dev/null', { stdio: 'inherit' });
      return true;
    } catch {
      try {
        execSync('npm login', { stdio: 'inherit' });
        return true;
      } catch {
        return false;
      } finally {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
          process.stdin.setRawMode(true);
        }
      }
    }
  }

  const runSingle = useCallback((cmd: ProkomCommand) => {
    if (cmd.id === 'deploy-publish' || cmd.id === 'deploy-dry-run') {
      if (!ensureNpmLogin()) return;
    }
    if (cmd.toggle) {
      const task = tasksRef.current.get(cmd.id);
      if (task?.status === 'running') {
        runtime.taskRunner.stop(cmd);
      } else {
        runtime.taskRunner.run(cmd);
      }
    } else if (cmd.confirm) {
      setConfirmingCmd(cmd);
      setMode('confirm');
    } else if (cmd.input) {
      setInputCmd(cmd);
      setInputValue('');
      setMode('input');
    } else {
      runtime.taskRunner.run(cmd);
    }
  }, [runtime]);

  function selectItem(item: MenuItem): void {
    if (isProfileOption(item)) {
      setActiveProfile(item.profile);
      setCurrentGroup(null);
      setSelectedIndex(0);
      setMultiSelected(new Set());
      return;
    }

    if ('count' in item) {
      setCurrentGroup(item.id === PROFILE_GROUP_ID ? PROFILE_GROUP_ID : item.label);
      setSelectedIndex(0);
      return;
    }
    runSingle(item);
  }

  function runMultiSelected(): void {
    const selected = new Set(multiSelected);
    setMultiSelected(new Set());
    for (const cmd of activeCommands) {
      if (selected.has(cmd.id)) {
        if (!cmd.confirm && !cmd.input) {
          runtime.taskRunner.run(cmd);
        }
      }
    }
  }

  useInput((input, key) => {
    if (modeRef.current === 'confirm') {
      if (input === 'y' || input === 'Y' || key.return || input === '\r') {
        const cmd = confirmingCmdRef.current;
        setConfirmingCmd(null);
        if (cmd) {
          if (cmd.input) {
            setInputCmd(cmd);
            setInputValue('');
            setMode('input');
          } else {
            setMode('normal');
            runtime.taskRunner.run(cmd).catch((e: unknown) => {
              process.stderr.write(`[prokom] run error: ${e}\n`);
            });
          }
        } else {
          setMode('normal');
        }
      } else if (input === 'n' || input === 'N' || key.escape) {
        setConfirmingCmd(null);
        setMode('normal');
      }
      return;
    }

    if (modeRef.current === 'input') {
      const cmd = inputCmdRef.current;
      if (key.escape) {
        setInputCmd(null);
        setInputValue('');
        setMode('normal');
      } else if (key.return || input === '\r') {
        setInputCmd(null);
        setMode('normal');
        if (cmd && cmd.command) {
          let msg = inputValueRef.current;
          if (!msg && cmd.input?.default) msg = cmd.input.default;
          runtime.taskRunner.run(
            { ...cmd, command: cmd.command.replace(/\{input\}/g, msg) },
          ).catch((e: unknown) => {
            process.stderr.write(`[prokom] run error: ${e}\n`);
          });
        }
      } else if (key.backspace || key.delete) {
        setInputValue((v) => v.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        if (input >= ' ' && input !== '\x7f') {
          setInputValue((v) => v + input);
        }
      }
      return;
    }

    if (mode === 'search') {
      if (key.escape) {
        setSearchQuery('');
        setMode('normal');
      } else if (key.return) {
        const item = filteredItems[selectedIndex];
        if (item) selectItem(item);
        setSearchQuery('');
        setMode('normal');
      } else if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta && input.length === 1) {
        if (input >= ' ' && input !== '\x7f') {
          setSearchQuery((q) => q + input);
        }
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => {
          const max = Math.max(0, filteredItems.length - 1);
          return Math.min(max, i + 1);
        });
      }
      return;
    }

    if (key.tab) {
      setFocusedPane((p) => (p === 'commands' ? 'status' : 'commands'));
      return;
    }

    if (focusedPane === 'status') {
      if (key.escape) {
        setFocusedPane('commands');
      } else if (key.upArrow) {
        setScrollOffsets((prev) => {
          const next = new Map(prev);
          const entries = Array.from(tasks.values()).sort(
            (a, b) => (b.startTime || 0) - (a.startTime || 0),
          );
          const target = entries[0];
          if (target) {
            const current = next.get(target.id) ?? 0;
            next.set(target.id, current + 1);
          }
          return next;
        });
      } else if (key.downArrow) {
        setScrollOffsets((prev) => {
          const next = new Map(prev);
          const entries = Array.from(tasks.values()).sort(
            (a, b) => (b.startTime || 0) - (a.startTime || 0),
          );
          const target = entries[0];
          if (target) {
            const current = next.get(target.id) ?? 0;
            next.set(target.id, Math.max(0, current - 1));
          }
          return next;
        });
      } else if (key.pageUp) {
        setScrollOffsets((prev) => {
          const next = new Map(prev);
          const entries = Array.from(tasks.values()).sort(
            (a, b) => (b.startTime || 0) - (a.startTime || 0),
          );
          const target = entries[0];
          if (target) {
            const current = next.get(target.id) ?? 0;
            next.set(target.id, current + 10);
          }
          return next;
        });
      } else if (key.pageDown) {
        setScrollOffsets((prev) => {
          const next = new Map(prev);
          const entries = Array.from(tasks.values()).sort(
            (a, b) => (b.startTime || 0) - (a.startTime || 0),
          );
          const target = entries[0];
          if (target) {
            const current = next.get(target.id) ?? 0;
            next.set(target.id, Math.max(0, current - 10));
          }
          return next;
        });
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => {
        const max = Math.max(0, filteredItems.length - 1);
        return Math.min(max, i + 1);
      });
    } else if (key.return) {
      if (multiSelected.size > 0) {
        runMultiSelected();
      } else {
        const item = filteredItems[selectedIndex];
        if (item) selectItem(item);
      }
    } else if (input === ' ') {
      const item = filteredItems[selectedIndex];
      if (item && isProfileOption(item)) {
        selectItem(item);
      } else if (item && !('count' in item)) {
        setMultiSelected((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      } else if (item) {
        setCurrentGroup(item.id === PROFILE_GROUP_ID ? PROFILE_GROUP_ID : item.label);
        setSelectedIndex(0);
      }
    } else if (input === '/') {
      setSearchQuery('');
      setMode('search');
    } else if (key.escape) {
      if (multiSelected.size > 0) {
        setMultiSelected(new Set());
      } else if (hasGroups && currentGroup) {
        setCurrentGroup(null);
        setSelectedIndex(0);
      } else {
        runtime.stop();
        exit();
      }
    } else if (key.ctrl && input === 'c') {
      runtime.stop();
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">Prokom</Text>
        <Text color="gray"> in </Text>
        <Text bold>{config.name}</Text>
        {runtime.gitBranch && (
          <Text>
            <Text color="gray"> </Text>
            <Text color="cyan">⎇ {runtime.gitBranch}</Text>
          </Text>
        )}
        {runtime.workspaces.length > 0 && (
          <Text>
            <Text color="gray"> </Text>
            <Text color="magenta">⊞ {runtime.workspaces.length}</Text>
          </Text>
        )}
        {activeProfile && (
          <Text>
            <Text color="gray"> </Text>
            <Text color="yellow">⚙ {activeProfile}</Text>
          </Text>
        )}
        {runtime.ci.isCI && (
          <Text>
            <Text color="gray"> </Text>
            <Text color="red">⊡ {runtime.ci.name}</Text>
          </Text>
        )}
      </Box>

      {mode === 'search' && (
        <Box marginY={1}>
          <Text color="cyan">🔍</Text>
          <Text> {searchQuery}</Text>
          <Text color="gray"> ({filteredItems.length})</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <CommandList
          items={filteredItems}
          width={commandPaneWidth}
          tasks={tasks}
          selectedIndex={selectedIndex}
          multiSelected={multiSelected}
          selCount={selCount}
          breadcrumb={breadcrumb}
          focused={focusedPane === 'commands'}
          menuRows={menuRows}
        />
        <Box width={1} />
        <MetricsPanel tasks={tasks} menuRows={menuRows} />
        <Box width={1} />
        <StatusPanel
          tasks={tasks}
          width={outputPaneWidth}
          scrollOffsets={scrollOffsets}
          focusedPane={focusedPane}
          confirmingCommand={mode === 'confirm' ? confirmingCmd : null}
          inputCommand={mode === 'input' ? inputCmd : null}
          inputValue={inputValue}
          menuRows={menuRows}
        />
      </Box>

      <Box>
        <Text color="gray">{footerText}</Text>
      </Box>
    </Box>
  );
};
