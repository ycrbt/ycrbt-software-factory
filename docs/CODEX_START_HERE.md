# Start development in Codex

This repository is ready to open in Codex CLI or the Codex app. AGENTS.md contains repo-specific instructions.

## Setup
1. Install Node.js >= 22.13 and Git.
2. Install and log in to Codex CLI: https://github.com/openai/codex
3. Run npm test && npm run validate && npm run demo.
4. Read docs/IMPLEMENTATION_PLAN.md and docs/ARCHITECTURE.md.

## First task for Codex

Read AGENTS.md, README.md, docs/ARCHITECTURE.md and docs/IMPLEMENTATION_PLAN.md. Implement milestone M1 on a new branch, committing small atomic changes. Build a tiny React test repository and run a **real** Codex agent in an isolated worktree; verify structured output, source-change boundaries, sandbox behavior, worktree cleanup and process failures. Ensure reviewer/tester runs cannot silently edit tracked frontend source. Add tests for permission and timeout failures. Do not implement M2 yet. Do not deploy, merge or push changes to the target frontend main.

## Notes
The current scaffold is a working baseline with mocked role execution tests, not a mature autonomous factory. The initial DAG is executed serially.
