# ycrbt-software-factory

A local-first, extensible **agentic software factory for frontend development**, initially powered by the Codex CLI.

> Status: experimental starter. The local workflow and mock tests are implemented; live Codex runs, automatic PRs, merge and deployment have not been validated or implemented.

## Principles
- Only human-created GitHub Issues labeled **factory-ready** can initiate work.
- A deterministic orchestrator schedules a declarative workflow; AI agents cannot invent product requirements.
- All roles use versioned manifests and structured outputs. The orchestrator does not hardcode role names.
- Target repositories are modified only in isolated Git worktrees.
- Planner, Developer, Reviewer and Tester are the initial AI roles; integration is a deterministic quality gate.
- The initial process is sequential. Parallel scheduling, durable SQLite state and PR publishing are roadmap items.
- A human reviews and approves any changes to main. No automatic push, merge or deployment.

## Requirements

Node.js >= 22.13, Git, and an installed/authenticated Codex CLI for real runs. The system executes locally but the model may use remote inference.

## Getting started

~~~bash
npm test
npm run validate
npm run roles
npm run demo
node src/cli.mjs scan --github OWNER/FRONTEND_REPO
node src/cli.mjs run --target /path/to/frontend-repo --issue-file examples/example-issue.json --dry-run
node src/cli.mjs run --target /path/to/frontend-repo --github OWNER/FRONTEND_REPO --issue 42
~~~

Only process approved tasks from the **target frontend repo**, not this factory's development backlog. Output and run logs are local in .factory/. No commits are pushed.

## Adding a role

Create roles/ROLE_ID/role.json and prompt.md, then add a step to workflows/frontend.json. Specify dependencies; the scheduler discovers role definitions automatically. See docs/ARCHITECTURE.md.

## Project docs

- [Architecture](docs/ARCHITECTURE.md)
- [Milestone roadmap](docs/IMPLEMENTATION_PLAN.md)
- [Codex first task](docs/CODEX_START_HERE.md)
- [Initial backlog](docs/ISSUES_TO_CREATE.md)
- [Architectural decision](docs/ADR-0001.md)

This project is intentionally not yet production-ready. In particular: no crash recovery, retry loop, persistent SQLite scheduler, parallel worktrees, visual baselines, automatic PRs or hardened container isolation.
