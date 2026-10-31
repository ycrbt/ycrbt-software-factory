#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { loadRoles } from './registry.mjs';
import { loadWorkflow } from './workflow.mjs';
import { fetchIssue, scanIssues, validateIssue } from './github.mjs';
import { buildPlan, executeWorkflow } from './engine.mjs';
import { runProcess } from './process.mjs';

function opt(args, name) { const pos = args.indexOf(name); return pos < 0 ? undefined : args[pos + 1]; }
function help() {
  return ['Agentic Frontend Factory (experimental)','',
    'Commands:',
    '  doctor                                   Check tools (git/node/codex)',
    '  roles                                    Discover registered roles',
    '  validate                                 Validate roles and workflow DAG',
    '  scan --github OWNER/REPO                 List human-created factory-ready issues',
    '  run --target PATH --issue-file FILE      Run factory on local issue definition',
    '  run --target PATH --github O/R --issue N  Run factory on GitHub issue',
    '  run ... --dry-run                         Show plan without invoking agents or editing Git',
    '',
    'No automatic push, merge, issue creation or deployment.'
  ].join('\n');
}

export async function main(args = process.argv.slice(2)) {
  const command = args[0] || 'help';
  if (['help', '-h', '--help'].includes(command)) { console.log(help()); return; }
  if (command === 'doctor') {
    for (const [name, bin, argv] of [['git', 'git', ['--version']], ['node', 'node', ['--version']], ['codex', process.env.CODEX_BIN || 'codex', ['--version']]]) {
      try { const res = await runProcess(bin, argv, { timeoutMs: 8000 }); console.log(name + ': ' + (res.code === 0 ? 'OK ' + res.stdout.trim() : 'ERROR')); }
      catch { console.log(name + ': NOT FOUND'); }
    }
    return;
  }
  const roles = await loadRoles();
  const workflow = await loadWorkflow(roles);
  if (command === 'roles') { for (const role of roles.values()) console.log(role.id + '@' + role.version + ' | ' + role.runtime + ' | ' + role.sandbox); return; }
  if (command === 'validate') { console.log('Validated ' + roles.size + ' roles and ' + workflow.steps.length + ' workflow steps'); return; }
  if (command === 'scan') {
    const github = opt(args, '--github');
    if (!github) throw new Error('Missing --github OWNER/REPO');
    console.log(JSON.stringify(await scanIssues(github), null, 2));
    return;
  }
  if (command === 'run') {
    const target = opt(args, '--target');
    const github = opt(args, '--github');
    const file = opt(args, '--issue-file');
    const issueNumber = Number(opt(args, '--issue'));
    if (!target || Boolean(file) === Boolean(github)) throw new Error('Use --target and exactly one of --issue-file or --github with --issue');
    const issue = file ? validateIssue(JSON.parse(await readFile(file, 'utf8'))) : await fetchIssue(github, issueNumber);
    if (args.includes('--dry-run')) { console.log(JSON.stringify(buildPlan(issue, workflow), null, 2)); return; }
    const result = await executeWorkflow({ issue, target, roles, workflow });
    console.log(JSON.stringify({ state: result.state, branch: result.isolation?.branch, worktree: result.isolation?.worktree, logs: result.runDir }, null, 2));
    return;
  }
  throw new Error('Unknown command: ' + command + '\n' + help());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => { console.error('Error: ' + err.message); process.exitCode = 1; });
}
