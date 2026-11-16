# Draft promotion guard

Incident observed 2026-11-16: PR #1 declared `[DRAFT]` and explicitly said not to merge, but was marked ready and merged before its automated review completed.

GitHub timeline attributed the ready/merge actions to the authenticated `nezam-primer` account; the available event data does not identify which client/session initiated them.

## Defense-in-depth workflow

The guard uses `pull_request_target` so the base repository's narrowly scoped token can act even when a PR originates from a fork or another restricted context. It intentionally **does not checkout or execute PR code**.

Immediately before any mutation it re-reads the selected PR's current:
- title,
- open/closed state,
- draft state.

It returns the PR to draft only when the **current** PR is still OPEN, currently ready, and its **current** title begins with `[DRAFT]` or `[HOLD]`. This prevents a queued or re-run old event from re-drafting a PR whose hold marker was later removed.

## Limitation

This remains **defense in depth, not a hard merge barrier**. A fast or privileged merge can still race the workflow. Hard enforcement requires a repository ruleset / branch-protection requirement that the current GitHub integration cannot configure.

Therefore:
- trusted event context fixes fork-token write denial;
- current-state recheck fixes stale-event mutation;
- workflow guard reduces accidental promotion;
- branch ruleset / required status remains the real enforcement gate;
- no claim of hard prevention until that admin gate is configured and tested.
