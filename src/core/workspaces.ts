import fs from 'fs';
import path from 'path';

export interface WorkspacePackage {
  name: string;
  path: string;
}

export function detectWorkspaces(rootDir: string): WorkspacePackage[] {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'),
    );
    const workspaces = pkg.workspaces;
    if (!workspaces) return [];

    const patterns: string[] = Array.isArray(workspaces)
      ? workspaces
      : workspaces.packages || [];

    const found = new Map<string, WorkspacePackage>();

    for (const pattern of patterns) {
      const starIdx = pattern.indexOf('*');
      if (starIdx !== -1) {
        const prefix = pattern.slice(0, starIdx);
        const fullDir = path.join(rootDir, prefix);
        if (fs.existsSync(fullDir)) {
          for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
              const pkgPath = path.join(rootDir, prefix, entry.name);
              addPackage(found, rootDir, pkgPath, entry.name);
            }
          }
        }
      } else {
        const pkgPath = path.join(rootDir, pattern);
        if (fs.existsSync(pkgPath)) {
          const name = path.basename(pkgPath);
          addPackage(found, rootDir, pkgPath, name);
        }
      }
    }

    return Array.from(found.values());
  } catch {
    return [];
  }
}

function addPackage(
  found: Map<string, WorkspacePackage>,
  rootDir: string,
  pkgPath: string,
  fallbackName: string,
): void {
  const pkgJsonPath = path.join(pkgPath, 'package.json');
  let name = fallbackName;
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      name = pkgJson.name || fallbackName;
    } catch {
      // use fallback
    }
  }
  if (!found.has(name)) {
    found.set(name, {
      name,
      path: path.relative(rootDir, pkgPath),
    });
  }
}
