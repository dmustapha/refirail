# Stress Test Plan — RefiRail (Sui Overflow, DeepBook track)
> hackathon-stress | 2026-06-20 in-session run (supersedes 2026-06-18) | dev server :3000
> project_type: full-stack (no custom contracts)

## Coverage already established (T1–T5, this session)
| Layer | Where | Result |
|-------|-------|--------|
| P0 unit (sizing/economics/route math) | tests/unit/deleverage.test.ts (8 tests) | PASS |
| P0 unit (APR field paths) | tests/unit/position-apr.test.ts | PASS |
| P0 API edge-case matrix (4 endpoints × malformed/malicious) | tests/api-matrix.mjs (76 checks) | PASS — no 500s, clean 400s, no reflection |
| P0 E2E flows + a11y + responsive | e2e/refirail.spec.ts + visual.spec.ts (11 tests) | PASS — axe clean, 390–1920, zero console errors |
| P0 on-chain (33 signed ops + 2 revert-proofs) | scripts/onchain-campaign.ts → submission/proof.md | PASS |

## Features (P0)
| # | Feature | Component | Endpoint |
|---|---------|-----------|----------|
| F1 | Read position | PositionCard | GET /api/position |
| F2 | Refinance preview→sign | PreviewPanel/ActionButton | POST /api/preview |
| F3 | Deleverage preview→sign | DeleveragePanel | POST /api/deleverage |
| F4 | Live DeepBook panel | DeepBookPanel | GET /api/deepbook |
| F5 | Empty / demo read-only state | page.tsx | — |

## Resilience phases RUN this session (gaps not covered by T1–T5) → e2e/resilience.spec.ts
### Phase 6 — State & Data
- 6.1 Corrupted localStorage (dapp-kit keys) → app still boots, position still reads
- 6.2 Malformed /api/position response (garbage JSON) → error boundary, no crash
- 6.3 Malformed /api/deleverage response → honest abort message, no crash
- 6.4 Two concurrent tabs (read-only demo) → both render

### Phase 7 — Network & Timing
- 7.1 Offline during preview → graceful "could not reach" message; recovers when back online
- 7.2 Throttled / delayed API → loading state shows then resolves
- 7.3 Intermittent 503 on /api/deleverage → error surfaced, no crash
- 7.4 Rapid sequential preset clicks (25/50/75) → no stuck state, consistent final preview

### Phase 8 — Recovery
- 8.1 Browser refresh mid-preview → recovers to clean readable state
- 8.2 Backend-down simulation (all /api aborted) → error UI; restore + reload → recovers
- 8.3 Back/forward navigation → no broken state

## Skipped (documented)
- Phase 2.5 async flows — SKIPPED: none (request/response; preview = single dryRun).
- Phase 5 contracts — SKIPPED: zero custom Move; atomic-revert safety proven via T3 revert-proofs.
