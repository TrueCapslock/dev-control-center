import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Runtime } from '@prokom-dev/core';
import { ProkomConfig, ProkomCommand } from '@prokom-dev/config';
import { TaskState } from '@prokom-dev/status';
import { CommandList, MenuGroup, MenuItem } from './command-list.js';
import { StatusPanel } from './status-panel.js';
import { ConfirmDialog } from './confirm-dialog.js';

interface AppProps {
  config: ProkomConfig;
  runtime: Runtime;
}

type Mode = 'normal' | 'search' | 'confirm';
type Pane = 'commands' | 'status';

export const App: React.FC<AppProps> = ({ config, runtime }) => {
  const { exit } = useApp();
  const [mode, setMode] = useState<Mode>('normal');
  const [focusedPane, setFocusedPane] = useState<Pane>('commands');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tasks, setTasks] = useState<Map<string, TaskState>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingCmd, setConfirmingCmd] = useState<ProkomCommand | null>(
    null,
  );
  const [scrollOffsets, setScrollOffsets] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const confirmingCmdRef = useRef(confirmingCmd);
  confirmingCmdRef.current = confirmingCmd;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    const unsub = runtime.statusStore.subscribe((updated) => {
      setTasks(new Map(updated));
    });
    return unsub;
  }, [runtime]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const result: MenuGroup[] = [];
    for (const cmd of config.commands) {
      if (cmd.group && !seen.has(cmd.group)) {
        seen.add(cmd.group);
        const count = config.commands.filter(
          (c) => c.group === cmd.group,
        ).length;
        result.push({ id: `__group_${cmd.group}`, label: cmd.group, count });
      }
    }
    return result;
  }, [config.commands]);

  const hasGroups = groups.length > 0;

  const menuItems = useMemo((): MenuItem[] => {
    if (!hasGroups) return config.commands;

    if (currentGroup) {
      return config.commands.filter((c) => c.group === currentGroup);
    }

    const ungrouped = config.commands.filter((c) => !c.group);
    return [...groups, ...ungrouped];
  }, [config.commands, groups, hasGroups, currentGroup]);

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
    ? `› ${currentGroup}`
    : undefined;

  const selCount = multiSelected.size;

  const runSingle = useCallback((cmd: ProkomCommand) => {
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
    } else {
      runtime.taskRunner.run(cmd);
    }
  }, [runtime]);

  function selectItem(item: MenuItem): void {
    if (!('command' in item)) {
      setCurrentGroup(item.label);
      setSelectedIndex(0);
      return;
    }
    runSingle(item);
  }

  function runMultiSelected(): void {
    const selected = new Set(multiSelected);
    setMultiSelected(new Set());
    for (const cmd of config.commands) {
      if (selected.has(cmd.id)) {
        if (!cmd.confirm) {
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
        setMode('normal');
        if (cmd) {
          runtime.taskRunner.run(cmd).catch((e: unknown) => {
            process.stderr.write(`[prokom] run error: ${e}\n`);
          });
        }
      } else if (input === 'n' || input === 'N' || key.escape) {
        setConfirmingCmd(null);
        setMode('normal');
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
        setSelectedIndex((i) =>
          Math.min(filteredItems.length - 1, i + 1),
        );
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
      setSelectedIndex((i) =>
        Math.min(filteredItems.length - 1, i + 1),
      );
    } else if (key.return) {
      if (multiSelected.size > 0) {
        runMultiSelected();
      } else {
        const item = filteredItems[selectedIndex];
        if (item) selectItem(item);
      }
    } else if (input === ' ') {
      const item = filteredItems[selectedIndex];
      if (item && 'command' in item) {
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
        setCurrentGroup(item.label);
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
        {config.profile && (
          <Text>
            <Text color="gray"> </Text>
            <Text color="yellow">⚙ {config.profile}</Text>
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

      {mode === 'confirm' && confirmingCmd && (
        <ConfirmDialog command={confirmingCmd} />
      )}

      <Box marginTop={1}>
        <CommandList
          items={filteredItems}
          tasks={tasks}
          selectedIndex={selectedIndex}
          multiSelected={multiSelected}
          selCount={selCount}
          breadcrumb={breadcrumb}
        />
        <Box width={1} />
        <StatusPanel
          tasks={tasks}
          scrollOffsets={scrollOffsets}
          focusedPane={focusedPane}
        />
      </Box>
    </Box>
  );
};
