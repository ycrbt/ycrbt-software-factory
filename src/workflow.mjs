import { readFile } from 'node:fs/promises';
import { projectFile } from './paths.mjs';

export function validateWorkflow(workflow, roles) {
  if (!workflow || !Array.isArray(workflow.steps) || workflow.steps.length === 0) throw new Error('Workflow must contain steps');
  const ids = new Set();
  for (const step of workflow.steps) {
    if (typeof step.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(step.id) || ids.has(step.id)) throw new Error('Invalid or duplicate step: ' + step.id);
    ids.add(step.id);
    if (!roles.has(step.role) && step.role !== 'builtin:integration-gate') throw new Error('Unknown role: ' + step.role);
    if (!Array.isArray(step.dependsOn)) throw new Error('Missing dependencies: ' + step.id);
  }
  for (const step of workflow.steps) {
    for (const dep of step.dependsOn) if (!ids.has(dep) || dep === step.id) throw new Error('Invalid dependency ' + dep + ' in ' + step.id);
    if (new Set(step.dependsOn).size !== step.dependsOn.length) throw new Error('Duplicate dependency in ' + step.id);
  }
  const seen = new Set();
  const remaining = new Map(workflow.steps.map(step => [step.id, step]));
  const ordered = [];
  while (remaining.size) {
    const ready = [...remaining.values()].filter(step => step.dependsOn.every(dep => seen.has(dep)));
    if (!ready.length) throw new Error('Workflow contains a dependency cycle');
    for (const step of ready) { ordered.push(step); seen.add(step.id); remaining.delete(step.id); }
  }
  return ordered;
}

export async function loadWorkflow(roles, file = projectFile('workflows', 'frontend.json')) {
  const workflow = JSON.parse(await readFile(file, 'utf8'));
  return { ...workflow, steps: validateWorkflow(workflow, roles) };
}
