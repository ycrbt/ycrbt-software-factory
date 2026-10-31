import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { checkedProcess } from './process.mjs';

export async function createIsolatedWorktree(targetRepo, worktreesDir, runId, issueNumber) {
  const repoPath = path.resolve(targetRepo);
  const trueRepo = await checkedProcess('git', ['-C', repoPath, 'rev-parse', '--show-toplevel']);
  if (path.resolve(trueRepo) !== repoPath) throw new Error('Use the target repository root as --target');
  const baseSha = await checkedProcess('git', ['-C', repoPath, 'rev-parse', 'HEAD']);
  const branch = 'factory/issue-' + issueNumber + '-' + runId.slice(0, 8);
  await mkdir(worktreesDir, { recursive: true });
  const worktree = path.join(worktreesDir, runId);
  await checkedProcess('git', ['-C', repoPath, 'worktree', 'add', '-b', branch, worktree, baseSha]);
  return { worktree, branch, baseSha, targetRepo: repoPath };
}
