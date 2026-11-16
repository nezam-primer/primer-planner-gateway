# Draft promotion guard

Incident observed 2026-11-16: PR #1 declared `[DRAFT]` and explicitly said not to merge, but was marked ready and merged before its automated review completed.

GitHub timeline attributed the ready/merge actions to the authenticated `nezam-primer` account; the available event data does not identify which client/session initiated them.

## Defense-in-depth workflow

The guard uses `pull_request_target` so the base repository's narrowly scoped token can act even when a PR originates from a fork or another restricted context.

The write-capable job:
- checks out **only the repository default branch**, never PR code;
- uses job-scoped `contents: read` + `pull-requests: write`;
- re-reads the selected PR's current title/state/draft state immediately before mutation;
- passes those values to the same pure decision function covered by unit tests;
- returns a PR to draft only when its **current** state is OPEN, it is currently ready, and its **current** title begins with `[DRAFT]` or `[HOLD]`.

A separate ordinary `pull_request` job runs the decision tests with read-only permissions. This gives us test evidence for the predicate without granting untrusted PR code a write token.

## What is now testable

The tests cover:
- DRAFT prefix -> REDRAFT;
- HOLD prefix -> REDRAFT;
- marker removed before queued event runs -> NOOP;
- already-draft -> NOOP;
- closed PR -> NOOP;
- non-prefix marker -> NOOP.

## Limitation

This remains **defense in depth, not a hard merge barrier**. A fast or privileged merge can still race the workflow. Hard enforcement requires a repository ruleset / branch-protection requirement that the current GitHub integration cannot configure.

Therefore:
- trusted base-code execution protects the write token from PR code;
- current-state recheck protects against stale-event mutation;
- shared tested predicate reduces logic drift;
- branch ruleset / required status remains the real enforcement gate;
- no claim of hard prevention until that admin gate is configured and tested.
