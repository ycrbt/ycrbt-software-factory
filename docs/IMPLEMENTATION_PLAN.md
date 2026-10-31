# Implementation plan

## Product
Local-first, frontend-only issue-to-PR software factory. Human-created GitHub Issues labeled factory-ready are the sole source of feature requests. Initial agent runtime is Codex CLI. New roles must be addable through manifests and workflows, without scheduler changes. Human approves the resulting PR; no automatic merge or deployment.

## M0 — Foundation (starter)
- Local CLI with doctor, roles, validate, scan, run and dry-run.
- Role registry, role prompts, typed JSON result contract, workflow DAG.
- GitHub human-author and factory-ready gate, dedicated Git worktrees.
- Codex noninteractive adapter, JSONL execution traces and deterministic integration checks.
- Unit tests and fake agent execution. Not a proven end-to-end Codex integration.

## M1 — Harden Codex execution and worktrees
- Test against a local frontend fixture with real Codex.
- Robust output schema errors, timeouts, cancellations, crashes and retryable failures.
- Protect source from Reviewer and Tester writes. Keep secrets out of agent prompts.
- Worktree cleanup, verified diffs and artifact integrity.
**Exit:** successful React feature patch while target main remains untouched.

## M2 — Durable orchestration
- SQLite persistence, idempotency, run state transitions, restart recovery.
- Bounded Reviewer/Tester -> Developer rework loop with re-verification.
- DAG parallelism with per-task worktrees, conflict detection and budgets.
**Exit:** restart/resume without duplicated work or lost progress.

## M3 — Frontend quality
- Integrate target's Vitest, ESLint, TypeScript, Playwright.
- Browser console, mobile/desktop, accessibility and screenshot validation.
- Human-approved visual baselines and reproducible test artifacts.
**Exit:** real visual/behavioral regressions reliably block integration.

## M4 — GitHub PR workflow
- Integrate branches on latest base with safeguards; prepare draft PR.
- Include original issue, diff summary, test results and screenshots.
- Human approval before merge; no autonomous production deployments.
**Exit:** traceable draft PR prepared for human review.

## M5 — Extensibility and visibility
- Plugin capability permissions and versioned role contracts.
- Alternative model runtimes and local dashboard.
- Controlled issue polling and benchmarking of agent workflows.
**Exit:** add accessibility auditor or new runtime without editing scheduler.

## Benchmarking
Use 10-20 curated human frontend issues. Compare single Codex agent with multi-role pipeline under equal model/token/time budgets. Measure task success, wall-clock time, total tokens, costs, human intervention and regression frequency.

## Non-goals
Autonomous product requirements, backend services, unattended merges or deployments, unrestricted tools/network access.
