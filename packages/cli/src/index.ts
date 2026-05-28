#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { loadConfig } from '@prokom-dev/config';
import { Runtime, detectCI } from '@prokom-dev/core';
import { startUI } from '@prokom-dev/ui';

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
prokom-dev v${VERSION}

Usage: prokom [command] [options]

Commands:
  init                     Scaffold a prokom.config.js file
  completion <shell>       Generate shell completion script (bash|zsh|fish)

Options:
  --profile <name>         Use a specific environment profile
  --help, -h               Show this help message
  --version, -v            Show version number

Environment:
  PROKOM_PROFILE           Default profile name (overridden by --profile)

Examples:
  prokom                   Launch the TUI
  prokom init              Create prokom.config.js in current directory
  prokom completion bash   Generate bash completions
`);
}

function printInitHelp(): void {
  const config = `export default {
  name: '${path.basename(process.cwd())}',
  commands: [
    {
      id: 'dev',
      label: 'Dev server',
      command: 'npm run dev',
      watch: true,
      group: 'Development',
    },
    {
      id: 'test',
      label: 'Test',
      command: 'npm test',
      group: 'Development',
    },
    {
      id: 'lint',
      label: 'Lint',
      command: 'npm run lint',
      group: 'Development',
    },
    {
      id: 'build',
      label: 'Build',
      command: 'npm run build',
      group: 'Build',
    },
    {
      id: 'typecheck',
      label: 'Type check',
      command: 'npm run typecheck',
      group: 'Build',
    },
    {
      id: 'deploy-staging',
      label: 'Deploy to staging',
      command: 'npm run deploy:staging',
      confirm: true,
      group: 'Deploy',
    },
    {
      id: 'deploy-production',
      label: 'Deploy to production',
      command: 'npm run deploy:production',
      confirm: true,
      group: 'Deploy',
    },
  ],
};
`;
  fs.writeFileSync('prokom.config.js', config, 'utf-8');
  console.log('Created prokom.config.js');
}

function printCompletion(shell: string): void {
  const bin = 'prokom';

  const bash = `_${bin}() {
  local cur words
  cur="\${COMP_WORDS[COMP_CWORD]}"
  words="init completion bash zsh fish --profile --help --version"

  if [[ $COMP_CWORD -eq 1 ]]; then
    mapfile -t COMPREPLY < <(compgen -W "$words" -- "$cur")
  elif [[ $COMP_CWORD -eq 2 && "\${COMP_WORDS[1]}" == "completion" ]]; then
    mapfile -t COMPREPLY < <(compgen -W "bash zsh fish" -- "$cur")
  fi
}
complete -F _${bin} ${bin}
`;

  const zsh = `#compdef ${bin}
_${bin}() {
  local -a subcommands
  subcommands=(
    'init:Scaffold a config file'
    'completion:Generate shell completion script'
  )

  _arguments \\
    '--profile[Use a specific profile]:profile' \\
    '--help[Show help]' \\
    '--version[Show version]' \\
    '1: :->command' \\
    '*: :->args'

  case $state in
    command)
      _describe 'command' subcommands
      ;;
    args)
      case $words[1] in
        completion)
          _arguments '2:shell:(bash zsh fish)'
          ;;
      esac
      ;;
  esac
}
compdef _${bin} ${bin}
`;

  const fish = `function _${bin}
  set -l commands init completion

  complete -c ${bin} -f

  complete -c ${bin} -n "not __fish_seen_subcommand_from $commands" \\
    -a init -d "Scaffold a config file"
  complete -c ${bin} -n "not __fish_seen_subcommand_from $commands" \\
    -a completion -d "Generate shell completion script"
  complete -c ${bin} -n "not __fish_seen_subcommand_from $commands" \\
    -l profile -d "Use a specific profile" -r
  complete -c ${bin} -n "not __fish_seen_subcommand_from $commands" \\
    -l help -s h -d "Show help"
  complete -c ${bin} -n "not __fish_seen_subcommand_from $commands" \\
    -l version -s v -d "Show version"

  complete -c ${bin} -n "__fish_seen_subcommand_from completion" \\
    -a bash -d "Bash completions"
  complete -c ${bin} -n "__fish_seen_subcommand_from completion" \\
    -a zsh -d "Zsh completions"
  complete -c ${bin} -n "__fish_seen_subcommand_from completion" \\
    -a fish -d "Fish completions"
end
`;

  switch (shell) {
    case 'bash':
      console.log(bash.trimEnd());
      break;
    case 'zsh':
      console.log(zsh.trimEnd());
      break;
    case 'fish':
      console.log(fish.trimEnd());
      break;
    default:
      console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
      process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  let profile: string | undefined;

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    process.exit(0);
  }

  if (args[0] === 'init') {
    printInitHelp();
    process.exit(0);
  }

  if (args[0] === 'completion') {
    printCompletion(args[1] || 'bash');
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && i + 1 < args.length) {
      profile = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      configPath = args[i];
    }
  }

  profile = profile || process.env.PROKOM_PROFILE;

  const ci = detectCI();
  if (!profile && ci.isCI) {
    profile = 'ci';
  }

  const config = await loadConfig(configPath, profile);
  const runtime = new Runtime(config);
  await runtime.start();

  if (ci.isCI) {
    console.error(`[prokom] detected ${ci.name}, profile: ${config.profile || 'none'}`);
  }

  if (!process.stdin.isTTY) {
    console.error('prokom requires an interactive terminal');
    process.exit(1);
  }
  console.clear();
  await startUI(config, runtime);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
