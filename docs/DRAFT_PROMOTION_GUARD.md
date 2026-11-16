# Draft promotion guard

Incident observed 2026-11-16: PR #1 declared `[DRAFT]` and explicitly said not to merge, but was marked ready and merged before its automated review completed.

GitHub timeline attributed the ready/merge actions to the authenticated `nezam-primer` account; the available event data does not identify which client/session initiated them.

This guard returns a PR to draft if its title still begins with `[DRAFT]` or `[HOLD]` when it becomes ready.

## Limitation

This is **not a hard merge barrier** without a repository ruleset / branch-protection requirement. A fast or privileged merge can race the workflow. Hard enforcement requires repository administration controls that the current GitHub integration cannot configure.

Therefore:
- workflow guard = defense in depth;
- branch ruleset / required status = real enforcement gate;
- no claim of hard prevention until that admin gate is configured and tested.
