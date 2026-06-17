# FINAL VERDICT — Sui Overflow 2026 Warroom V4
**Date:** 2026-06-17 | Deadline 2026-06-20 16:00 UTC | **Winner: RefiRail** (Round-0 weighted 8.01)

## The 4-version journey (each correction refined the criteria)
- **V1** → Slippage Court (execution-audit). KILLED: "no use case" — forensic post-mortem, no decision attached.
- **V2** → Predict (social betting). KILLED: real demand but derivative/surface recombination.
- **V3** → SeatSwap (access-resale). KILLED: "ignoring demand — this is a real market we plug into" (bootstrapping a new two-sided market = no day-1 liquidity).
- **V4** → **RefiRail.** Lead gate = ECOSYSTEM RELEVANCE (plug into existing liquidity + real existing participants). Decisive #1 (8.01), top-2 on every lens.

## Winner: RefiRail — one-click atomic lending refinance
Move a borrow position Navi→Suilend in ONE PTB (flash-borrow → repay → withdraw → deposit → borrow → flash-repay), reverts if unhealthy. Plugs into $450M+ existing lending TVL + DeepBook flash liquidity. The canonical Sui flash-loan-in-1-PTB move as a product nobody ships.

## Feasibility: source-verified GO (not assumed)
- Both lending SDKs APPEND to a caller-supplied Transaction → 6 legs compose into ONE atomic PTB, ZERO net-new Move.
- Suilend Pyth-refresh: CONFIRMED one-PTB pattern (reserve-level refresh sidesteps the new-obligation problem; addRefreshCalls:false).
- Cost: ~$5 outlay (mostly recoverable), <$0.10 truly spent, $0 dryRun dev loop. DeepBook flash = free.
- Precedent ships (Current "Multiply", Navi/Suilend looping). Guaranteed Navi-only floor. Confidence ~70% full / ~90% good demo.

## Outputs for forge
WINNER-BRIEF.md (Thesis + locked build/cost/risk) · research/{FRAMING-LOCK,FEASIBILITY-VERDICT,COST-AND-CERTAINTY,ecosystem-deep-scan}.md · warroom/deliberation-transcript.md (4 versions).
Runner-ups: YieldPay 7.38, Structured 7.19.
