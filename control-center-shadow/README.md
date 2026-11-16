# PRIMER Control Center — Shadow v0.1

Read-only control surface for PRIMER operational state.

## Purpose

Expose mission, owner, verification layers, open gates, review queue, and evidence without adding execution authority.

## Invariants

- P-PRIMER remains the execution owner.
- MEGA coordinates; it does not become the execution owner.
- VIRA/VAKIL acceptance remains independent.
- MISSION != RECENT_ACTIVITY.
- TEST_PASS != REAL_WORLD_SUCCESS.
- BRANCH_SUCCESS != MISSION_SUCCESS.
- CHECKPOINT != STOP.
- No deploy, merge, approval, owner-change, or mutation controls exist in this shadow UI.

## Data contract

The UI reads `data.sample.json` only. Production wiring is intentionally absent. A later Sites/MCP or canonical backend integration must preserve source provenance and freshness and must fail closed when status is unavailable.

## Promotion gate

Shadow -> live control center requires:
1. canonical data source contract,
2. freshness/staleness behavior,
3. authentication and owner boundaries,
4. consumer-path validation,
5. independent review,
6. explicit owner approval for any write-capable controls.

This branch is safe to review without changing the existing Planner front door.
