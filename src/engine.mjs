import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateIssue } from './github.mjs';
import { createIsolatedWorktree } from './worktree.mjs';
import { runCodexRole } from './codex.mjs';
import { integrationGate } from './integration.mjs';
import { projectFile } from './paths.mjs';

function recordEvent(runDir, event) {
  return appendFile(path.join(runDir, 'events.jsonl'), JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n', 'utf8');
}

export function buildPlan(issue, workflow) {
  validateIssue(issue);
  return { issue: issue.number, steps: workflow.steps.map(step => ({ id: step.id, role: step.role, dependsOn: step.dependsOn })) };
}

export async function executeWorkflow({ issue, target, roles, workflow, runId = randomUUID(), codexRunner = runCodexRole, worktreeCreator = createIsolatedWorktree, integrate = integrationGate, root = projectFile('.factory') }) {
  const plan = buildPlan(issue, workflow);
  const runDir = path.join(root, 'runs', runId);
  await mkdir(runDir, { recursive: true });
  const results = {};
  await recordEvent(runDir, { type: 'RUN_STARTED', plan, target });
  let isolation;
  try {
    isolation = await worktreeCreator(target, path.join(root, 'worktrees'), runId, issue.number);
    await recordEvent(runDir, { type: 'WORKTREE_CREATED', branch: isolation.branch, worktree: isolation.worktree, baseSha: isolation.baseSha });
    for (const step of workflow.steps) {
      if (!step.dependsOn.every(dep => results[dep]?.status === 'passed')) {
        throw new Error('Step ' + step.id + ' has unsatisfied dependencies');
      }
      await recordEvent(runDir, { type: 'STEP_STARTED', step: step.id, role: step.role });
      const result = step.role === 'builtin:integration-gate'
        ? await integrate(isolation.worktree)
        : await codexRunner({ role: roles.get(step.role), issue, workspace: isolation.worktree, runDir, stepId: step.id, priorResults: results, baseSha: isolation.baseSha });
      results[step.id] = result;
      await recordEvent(runDir, { type: 'STEP_COMPLETED', step: step.id, ...result });
      if (result.status !== 'passed') {
        const state = result.status === 'blocked' ? 'BLOCKED' : 'CHANGES_REQUESTED';
        await recordEvent(runDir, { type: 'RUN_STOPPED', state, at: step.id });
        await writeFile(path.join(runDir, 'summary.json'), JSON.stringify({ state, issue: issue.number, isolation, results }, null, 2));
        return { state, runDir, isolation, results };
      }
    }
    const state = 'READY_FOR_HUMAN_REVIEW';
    await recordEvent(runDir, { type: 'RUN_STOPPED', state });
    await writeFile(path.join(runDir, 'summary.json'), JSON.stringify({ state, issue: issue.number, isolation, results }, null, 2));
    return { state, runDir, isolation, results };
  } catch (error) {
    await recordEvent(runDir, { type: 'RUN_FAILED', error: String(error?.message ?? error) });
    await writeFile(path.join(runDir, 'summary.json'), JSON.stringify({ state: 'FAILED', issue: issue.number, isolation, results, error: String(error?.message ?? error) }, null, 2));
    throw error;
  }
}
