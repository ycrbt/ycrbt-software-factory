# Codex instructions — Agentic Frontend Factory

This repository implements a local-first, frontend-only agentic software factory. Authoritative work requests must be **human-created GitHub Issues** explicitly labeled **factory-ready**. Do not build autonomous ideation, feature requests or unattended production deployments.

## Architecture
- Generic deterministic orchestrator. Never hardcode role names in the scheduler.
- Role definitions live in roles/<id>/role.json and prompt.md; execution graph lives in workflows/frontend.json.
- Initial model runtime is Codex CLI behind an adapter. Future runtimes must not require scheduler changes.
- Operate on frontend target repositories through isolated Git worktrees; never modify target main.
- Agent results must follow schemas/agent-result.schema.json.
- Reviewer and Tester verify independently. Human approval is required for publishing to main.

## Development rules
1. Read docs/IMPLEMENTATION_PLAN.md and docs/ARCHITECTURE.md first.
2. Work on one milestone and a dedicated branch at a time.
3. Test scheduler, workflow, permissions, failure and restart paths.
4. Run npm test, npm run validate, npm run demo.
5. Never claim to have tested live Codex execution without real CLI credentials and a fixture.
6. Never use dangerous approval bypass, auto-merge, deploy, or push to the target main.

## First objective
Complete M1: harden Codex execution and Git worktree lifecycle. Then tackle M2: persisted state and bounded retries.
