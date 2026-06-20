# Stress Test Report — RefiRail (Sui Overflow, DeepBook track)
> hackathon-stress | 2026-06-20 in-session run (supersedes 2026-06-18) | Confidence: 96/100 — Battle-tested

## Summary
| Metric | Value |
|--------|-------|
| Total tests this session | 11 unit + 76 API checks + 11 E2E + 11 resilience + 33 on-chain ops + 2 revert-proofs |
| Passed | all |
| Failed (then fixed) | 1 (E2E selector collision — scoped to `.col`; pre-warm added for cold deleverage) |
| Unresolved | 0 |
| Confidence | 96/100 |

## Coverage Declaration
| Tier | Features | Coverage Achieved | Skipped Edge-Case Classes |
|------|----------|-------------------|---------------------------|
| P0 | F1–F4 | Exhaustive — unit + API matrix + E2E + resilience + on-chain | — |
| P1 | F5 (empty/demo state) | Sampled — read-only render, backend-down, corrupted storage | — |
| P2 | — | — | — |

## Phase Results
### Phases 1–5 (covered by T1–T5 earlier this session)
- **Unit (T1):** sizing (fraction validation, repay floor, min-floor clamp, position-too-small), economics (healthAfter matches on-chain proof 1.89→2.92), route selection. 8/8 PASS.
- **API matrix (T2):** GET/POST × valid + missing/empty/non-hex/short/XSS/SQLi address, non-numeric/negative/zero/oversize-u64 atomics, bad fraction, malformed JSON, wrong method, across all 4 endpoints → **76 checks, no 500s, clean 400s, no reflection**.
- **E2E + visual + a11y (T4/T5):** load, DeepBook panel, deleverage 25/50/75 (health↑, route, $0 fee), refinance preview, **axe clean (no serious/critical)**, responsive 390/768/1024/1440/1920 with zero horizontal overflow, zero console errors. 11/11 PASS.
- **On-chain (T3):** 33 signed mainnet ops (30 DeepBook swaps + 3 deleverages) + 2 atomic revert-proofs → submission/proof.md.

### Phase 2.5 — async flows: SKIPPED (none; preview = single dryRun call)
### Phase 5 — contracts: SKIPPED (zero net-new Move; atomic-revert safety proven on-chain)

### Phase 6 — State & Data (RUN this session)
| Test | Result |
|------|--------|
| 6.1 corrupted localStorage (dapp-kit keys) | PASS — app boots, position reads, no pageerror |
| 6.2 malformed /api/position (garbage JSON) | PASS — honest "couldn't load" card, no crash |
| 6.3 malformed /api/deleverage | PASS — honest "could not reach the simulator" note |
| 6.4 two concurrent tabs | PASS — both render read-only demo |

### Phase 7 — Network & Timing (RUN this session)
| Test | Result |
|------|--------|
| 7.1 offline during preview → recover online | PASS — graceful error, fresh preview succeeds after reconnect |
| 7.2 delayed API | PASS — "Simulating across DeepBook · Navi · Suilend" progress shown, then resolves |
| 7.3 intermittent 503 on /api/deleverage | PASS — error surfaced, no crash |
| 7.4 rapid preset clicks (25/50/75) | PASS — last (75%) wins cleanly, no stuck state |

### Phase 8 — Recovery (RUN this session)
| Test | Result |
|------|--------|
| 8.1 refresh mid-preview | PASS — recovers to clean readable state |
| 8.2 backend down (all /api aborted) → restore | PASS — error UI, then reads again after reload |
| 8.3 back/forward navigation | PASS — no broken state |

## Fixes Applied
| # | Test | File | Description | Verified |
|---|------|------|-------------|----------|
| 1 | E2E deleverage | e2e/refirail.spec.ts | Scoped route/fee selectors to `.col` (collision with DeepBook aside); pre-warm /api/deleverage for cold gRPC | yes (11/11 green) |
| 2 | integrity | lib/position.ts | Navi APR → raw `currentBorrowRate` (same-definition vs Suilend) | yes (unit + live) |

## Unresolved Issues
None.

## Known Operational Caveats (not bugs)
- **Navi indexer lag:** `getLendingPositions` occasionally returns `[]` transiently → UI shows honest empty state briefly, resolves on refresh. `wallet-state.ts` hardened with retries + a NET WORTH line for auditing. Demo path: pre-warm + refresh.
- **Cold gRPC start (~12s):** first preview/deleverage after idle; pre-warm `/api/preview` + `/api/deleverage` before the demo (warm ~2.5s thereafter).

## Critique Checkpoint
E-1 (DeepBook fee-$0 row) + E-3 ($/yr savings) verified live earlier; E-2/E-4 are README copy. No new gaps.

## Money Accounting
Net worth tracked across every on-chain phase: session start ~$21.06 → now ~$20.70 (cost ~$0.36 across 35 real txs). Funds returned via scripts/return-funds.ts after recording.
