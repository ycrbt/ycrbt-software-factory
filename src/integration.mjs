import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runProcess, checkedProcess } from './process.mjs';

export async function integrationGate(workspace, runner = runProcess) {
  const findings = [];
  const artifacts = [];
  const diff = await checkedProcess('git', ['-C', workspace, 'status', '--porcelain']);
  if (!diff.trim()) findings.push('No file modifications found in isolated worktree');
  else artifacts.push('git status --porcelain');
  const check = await runner('git', ['-C', workspace, 'diff', '--check'], { cwd: workspace });
  if (check.code !== 0) findings.push('git diff --check failed');
  let scripts = {};
  try { const pkg = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8')); scripts = pkg.scripts || {}; }
  catch { findings.push('No readable package.json; frontend automated checks unavailable'); }
  for (const script of ['lint', 'test:ci', 'build']) {
    if (!scripts[script]) continue;
    const result = await runner('npm', ['run', script], { cwd: workspace, timeoutMs: 180000, env: { ...process.env, CI: 'true' } });
    artifacts.push('npm run ' + script + ': exit ' + result.code);
    if (result.code !== 0) findings.push('npm run ' + script + ' failed: ' + result.stderr.slice(-450));
  }
  if (!scripts['test:ci'] && scripts.test) {
    const result = await runner('npm', ['test'], { cwd: workspace, timeoutMs: 180000, env: { ...process.env, CI: 'true' } });
    artifacts.push('npm test: exit ' + result.code);
    if (result.code !== 0) findings.push('npm test failed: ' + result.stderr.slice(-450));
  }
  return { status: findings.length ? 'changes_requested' : 'passed', summary: findings.length ? 'Integration gates failed' : 'Local integration gates passed; human approval still required', findings, artifacts };
}
