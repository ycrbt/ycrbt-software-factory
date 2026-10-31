# Architecture

## Pipeline

Human GitHub Issue (factory-ready) -> GitHub issue validator -> deterministic workflow scheduler -> role registry -> Codex CLI adapter -> isolated target Git worktree -> Reviewer + Tester -> deterministic integration gate -> artifact for human PR review.

The scheduler manages dependencies and state; it does not make product decisions or interpret the content of role-specific instructions.

## Modules

- src/registry.mjs — role discovery, prompt loading, manifest validation.
- src/workflow.mjs — validate and topologically order the workflow DAG.
- src/github.mjs — read and validate human-created issues and required label.
- src/codex.mjs — run Codex CLI with structured-output schema and sandbox settings.
- src/worktree.mjs — isolate target repo changes in a dedicated Git worktree.
- src/engine.mjs — orchestrate steps with JSONL run events and result summaries.
- src/integration.mjs — deterministic verification gate.
- src/cli.mjs — commands for diagnostics, validation, scanning and execution.

## Role contract

Each role consists of a versioned roles/ROLE_ID/role.json manifest plus prompt.md. The manifest declares runtime, sandbox and purpose. Agent results conform to schemas/agent-result.schema.json: status (passed, changes_requested, blocked), summary, findings and artifacts. An integration gate is a built-in deterministic step, not an LLM role.

## Security

Treat issue bodies, source repository and agent outputs as untrusted data. The runtime is restricted to a declared Codex sandbox; this is **not** equivalent to hard container isolation. Do not place credentials in prompts. GitHub credentials are used only for read-only issue retrieval. Do not auto-push, auto-merge, deploy or bypass approval controls.

Current integration scripts run in a trusted environment; target repo commands may still be dangerous. Use only trusted target repositories until sandboxing is hardened.

## Future state machine

NEW -> PLANNING -> READY -> IMPLEMENTING -> REVIEWING -> TESTING -> INTEGRATING -> READY_FOR_PR -> HUMAN_APPROVAL -> DONE; also BLOCKED, FAILED, CHANGES_REQUESTED and CANCELLED.

Current starter supports a sequential subset, no durable job queue or background polling. Persistent SQLite state is required before enabling concurrency, retries or unattended processing.
