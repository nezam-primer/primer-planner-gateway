# PRIMER Control Center — Shadow v0.1

Read-only control-surface prototype for PRIMER.

## Critical status

**The bundled `data.sample.json` is an explicit static example and MUST NOT be interpreted as current PRIMER status.**

The browser UI also keeps live rendering **disabled** even for a syntactically valid `meta.live=true` payload. A future change must integrate and verify an authenticated canonical adapter before enabling live rendering.

## Data contract

The pure browser-compatible `data-contract.mjs` validates required provenance and a bounded freshness window:
- source pointer;
- source version;
- generated timestamp;
- expiry timestamp;
- current time inside the window with explicit 30-second skew;
- owner, role and mission fields.

Expired, future-generated, inverted-window, or provenance-missing live payloads fail closed.

`validate-data.mjs` is only the CLI wrapper; the browser imports the same pure validator. Tests cover stale/future data and ensure shadow mode refuses live rendering by default.

## Purpose

Validate the information architecture for mission, owner, verification layers, open gates, review queue, and evidence without adding execution authority.

## Invariants

- P-PRIMER remains the execution owner.
- MEGA coordinates; it does not become the execution owner.
- VIRA/VAKIL acceptance remains independent.
- MISSION != RECENT_ACTIVITY.
- TEST_PASS != REAL_WORLD_SUCCESS.
- BRANCH_SUCCESS != MISSION_SUCCESS.
- CHECKPOINT != STOP.
- No deploy, merge, approval, owner-change, or mutation controls exist in this shadow UI.

## Live-data gate

Shadow -> live Control Center requires:
1. authenticated canonical data adapter,
2. source provenance in every payload,
3. bounded freshness/staleness behavior,
4. fail-closed UNKNOWN behavior,
5. authentication and owner boundaries,
6. consumer-path validation,
7. independent review,
8. explicit owner approval for any write-capable control.

Until then, this directory is a UI contract prototype only.
