# Repository working rules

## Performance is a release requirement

- Read and follow [the performance policy](docs/performance-policy.md) when planning, implementing, reviewing, or preparing a release.
- Optimize the design and data access before implementation, then measure the affected paths before calling a change ready. Correctness tests alone do not establish performance or capacity.
- Keep request work, payloads, database reads, concurrency, and caches bounded as content and learner history grow. Preserve the existing learning admission, pool, transaction, and retry safeguards.
- Include the relevant performance evidence and its limits in the handoff. Distinguish locally verified, ready for controlled deployment validation, and verified under deployment constraints. Never label an unmeasured capacity claim as passed.
- Scale verification to the change. Documentation-only work does not require an application benchmark; say that no runtime behavior changed. Follow the policy's release checklist for changes affecting runtime work.

## Implementation and ownership

- Follow TDD red → green for behavior changes and performance regressions. Refactor while green; reuse shared behavior instead of duplicating implementations.
- Keep English and Japanese learning progress independent. Shared infrastructure must preserve each language's grading, progression, and authorization rules.
- Use Impeccable for UI/design work and preserve the established interface unless the user approves an extension or replacement.
- Brandon owns staging, commits, pushes, and deployment unless explicitly delegated in the conversation.

## Process cleanup

- Record session IDs/PIDs and children for task-owned servers, test runners, watchers, and background work.
- Stop them when no longer needed, including after failure or cancellation. Prefer graceful shutdown and terminate only recorded task-owned children if necessary.
- Before handoff, verify owned processes have exited and their ports and task-specific automation resources are released. Never stop unrelated or user-started processes.
- Leave a process running only at the user's explicit request; state what remains running and how to stop it.
