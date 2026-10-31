import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectFile } from './paths.mjs';

const namePattern = /^[a-z][a-z0-9-]*$/;
const sandboxPolicies = new Set(['read-only', 'workspace-write']);

export function validateRole(role) {
  if (!role || !namePattern.test(role.id || '')) throw new Error('Invalid role id');
  if (typeof role.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(role.version)) throw new Error('Invalid version for ' + role.id);
  if (role.runtime !== 'codex') throw new Error('Unsupported runtime: ' + role.runtime);
  if (!sandboxPolicies.has(role.sandbox)) throw new Error('Unsupported sandbox for ' + role.id);
  if (role.prompt !== 'prompt.md') throw new Error('Role ' + role.id + ' must use local prompt.md');
  if (typeof role.purpose !== 'string' || !role.purpose.trim()) throw new Error('Role ' + role.id + ' lacks purpose');
  return role;
}

export async function loadRoles(rolesRoot = projectFile('roles')) {
  const registry = new Map();
  for (const dir of (await readdir(rolesRoot, { withFileTypes: true })).filter(x => x.isDirectory())) {
    const base = path.join(rolesRoot, dir.name);
    const role = validateRole(JSON.parse(await readFile(path.join(base, 'role.json'), 'utf8')));
    if (role.id !== dir.name || registry.has(role.id)) throw new Error('Role id and folder mismatch: ' + dir.name);
    const prompt = await readFile(path.join(base, role.prompt), 'utf8');
    if (!prompt.trim()) throw new Error('Empty prompt: ' + role.id);
    registry.set(role.id, { ...role, promptText: prompt });
  }
  return registry;
}
