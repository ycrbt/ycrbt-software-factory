import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRoles } from '../src/registry.mjs';
import { loadWorkflow, validateWorkflow } from '../src/workflow.mjs';
import { validateIssue, fetchIssue, scanIssues } from '../src/github.mjs';
import { buildPlan, executeWorkflow } from '../src/engine.mjs';
import { validateAgentResult } from '../src/codex.mjs';

const issue = { number: 42, title: 'Keyboard focus', body: 'Focus indicators', labels: ['factory-ready'], authorType: 'User' };
const result = { status: 'passed', summary: 'ok', findings: [], artifacts: [] };

test('load role registry dynamically', async () => {
  const roles = await loadRoles();
  assert.ok(roles.has('accessibility-auditor'));
  assert.equal(roles.get('developer').sandbox, 'workspace-write');
});
test('workflow validates and schedules dependencies', async () => {
  const roles = await loadRoles(); const workflow = await loadWorkflow(roles);
  const order = workflow.steps.map(x => x.id);
  assert.ok(order.indexOf('integrate') > order.indexOf('verify'));
  assert.ok(order.indexOf('integrate') > order.indexOf('review'));
});
test('rejects unknown roles', () => {
  assert.throws(() => validateWorkflow({steps:[{id:'a',role:'alien',dependsOn:[]}]}, new Map()), /Unknown role/);
});
test('rejects cyclic dependencies', () => {
  const roles = new Map([['x', {}]]);
  assert.throws(() => validateWorkflow({steps:[{id:'a',role:'x',dependsOn:['b']},{id:'b',role:'x',dependsOn:['a']}]}, roles), /cycle/);
});
test('human-only and factory-ready issue gate', () => {
  assert.equal(validateIssue(issue).number,42);
  assert.throws(() => validateIssue({...issue,authorType:'Bot'}), /Only human/);
  assert.throws(() => validateIssue({...issue,labels:[]}), /factory-ready/);
  assert.throws(() => validateIssue({...issue,pull_request:{}}), /Only human/);
});
test('agent response validator', () => {
  assert.equal(validateAgentResult(result).status,'passed');
  assert.throws(() => validateAgentResult({...result,status:'whatever'}), /status/);
});
test('plan contains no auto-publish', async () => {
  const roles = await loadRoles(); const workflow = await loadWorkflow(roles);
  const plan = buildPlan(issue,workflow);
  assert.equal(plan.steps.length,5);
  assert.ok(plan.steps.every(s => !/deploy|publish/.test(s.role)));
});
test('GitHub issue fetch verifies author', async () => {
  const request = async () => ({...issue,user:{type:'User'}});
  assert.equal((await fetchIssue('ycrbt/example',42,request)).number,42);
});
test('GitHub scanner ignores bot-created and pull-request entries', async () => {
  const entries = [{...issue,user:{type:'User'}},{...issue,number:43,user:{type:'Bot'}},{...issue,number:44,user:{type:'User'},pull_request:{}}];
  const got = await scanIssues('ycrbt/example',async () => entries);
  assert.deepEqual(got.map(x=>x.number),[42]);
});
test('mocked engine completes all workflow roles without real Codex', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'factory-test-'));
  const roles = await loadRoles(); const workflow = await loadWorkflow(roles);
  const steps = [];
  const out = await executeWorkflow({issue,target:'/example',roles,workflow,root,
    worktreeCreator:async()=>({worktree:root,branch:'factory/42',baseSha:'abc'}),
    codexRunner:async({stepId})=>{steps.push(stepId);return result;},
    integrate:async()=>result
  });
  assert.equal(out.state,'READY_FOR_HUMAN_REVIEW');
  assert.deepEqual(steps,['plan','implement','review','verify']);
  assert.match(await readFile(path.join(out.runDir,'events.jsonl'),'utf8'),/RUN_STOPPED/);
});
test('failing review stops before test and integration', async () => {
  const root = await mkdtemp(path.join(tmpdir(),'factory-test-'));
  const roles = await loadRoles(); const workflow = await loadWorkflow(roles); const steps=[];
  const out = await executeWorkflow({issue,target:'/example',roles,workflow,root,
    worktreeCreator:async()=>({worktree:root,branch:'factory/42',baseSha:'abc'}),
    codexRunner:async({stepId})=>{steps.push(stepId);return stepId==='review'?{...result,status:'changes_requested',findings:['fix UI']}:result;},
    integrate:async()=>{throw Error('should not integrate');}
  });
  assert.equal(out.state,'CHANGES_REQUESTED');
  assert.deepEqual(steps,['plan','implement','review']);
});
test('fresh git worktree isolates changes from target main branch', async () => {
  const {checkedProcess}=await import('../src/process.mjs');
  const {createIsolatedWorktree}=await import('../src/worktree.mjs');
  const {writeFile,mkdir}=await import('node:fs/promises');
  const root=await mkdtemp(path.join(tmpdir(),'factory-git-')); const target=path.join(root,'target');
  await mkdir(target);
  await checkedProcess('git',['-C',target,'init','-b','main']);
  await writeFile(path.join(target,'app.txt'),'original\n');
  await checkedProcess('git',['-C',target,'add','.']);
  await checkedProcess('git',['-C',target,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','-m','init']);
  const isolated=await createIsolatedWorktree(target,path.join(root,'worktrees'),'abcdef-1234-5678',42);
  await writeFile(path.join(isolated.worktree,'app.txt'),'changed\n');
  assert.equal(await readFile(path.join(target,'app.txt'),'utf8'),'original\n');
  assert.equal(await readFile(path.join(isolated.worktree,'app.txt'),'utf8'),'changed\n');
  assert.match(isolated.branch,/factory\/issue-42-/);
});
test('new role can be scheduled without changing orchestrator', async () => {
  const roles=await loadRoles();
  const custom={steps:[{id:'develop',role:'developer',dependsOn:[]},{id:'accessibility',role:'accessibility-auditor',dependsOn:['develop']}]};
  assert.deepEqual(validateWorkflow(custom,roles).map(x=>x.id),['develop','accessibility']);
});
