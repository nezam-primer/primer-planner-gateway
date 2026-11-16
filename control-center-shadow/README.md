# PRIMER Control Center — Shadow v0.1

Read-only control-surface prototype for PRIMER.

## Critical status

**The bundled `data.sample.json` is an explicit static example and MUST NOT be interpreted as current PRIMER status.**

The UI now fails visibly into SAMPLE/UNKNOWN semantics unless a future authenticated canonical adapter explicitly marks the payload as live.

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
1. authenticated canonical data source,
2. source provenance in every payload,
3. freshness/staleness behavior,
4. fail-closed UNKNOWN behavior,
5. authentication and owner boundaries,
6. consumer-path validation,
7. independent review,
8. explicit owner approval for any write-capable control.

Until then, this directory is a UI contract prototype only.
