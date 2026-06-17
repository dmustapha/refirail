# RefiRail — Feature Observables

One verifiable observable per P0/P1 feature. An observable PROVES the feature works (not just that code exists). Stress/debug verify each; the sentinel string is the failure tell.

| ID | Feature | Observable | Test Command | Sentinel Fail | Verified By |
|----|---------|-----------|--------------|---------------|-------------|
| F-001 | One-click ATOMIC refinance | A single tx digest with `status:success` whose effects contain DeepBook **and** Navi **and** Suilend moveCalls (one PTB, three protocols) | `npm run execute` then inspect digest on Suiscan | only one protocol's calls present, OR multiple separate tx digests | stress.e2e_refinance |
| F-002 | $0 live preview (no signature) | `/api/preview` returns `ok:true` with non-empty `balanceChanges` and a `txB64`, with NO wallet signature | `curl -XPOST .../api/preview -d '{...}'` → `.ok==true && .txB64!=null` | `ok:false` for a healthy position, or `txB64` null when ok | stress.preview_smoke |
| F-003 | Atomic revert on unhealthy end-state | The unhealthy variant returns `ok:false` with an `abortReason`, and the position balances are UNCHANGED afterward | `npx tsx scripts/refine-execute.ts --unhealthy` | partial execution: any balance moved, or a `success` status | stress.revert_proof |
| F-004 | Collateral recovered, not spent | Post-refinance net SUI balanceChange ≈ −gas only (collateral now in the Suilend obligation, not gone) | inspect `balanceChanges` from `npm run dryrun` | SUI net change ≈ −(collateral) (collateral actually spent) | stress.collateral_intact |
| F-005 | Fee-free DeepBook flash loan | The DeepBook pool's net USDC change across borrow+return == 0 (repay exactly equals borrow_quantity) | inspect `balanceChanges` for the pool object in the dryRun | a negative USDC delta on the pool (a fee was charged) | stress.flash_fee_zero |
| F-006 | First-paint judge position | `GET /api/position?address=$DEMO` returns `hasPosition:true` with numeric `naviAprPct` + `suilendAprPct` (not fallback null) | `curl ".../api/position?address=$NEXT_PUBLIC_DEMO_ADDRESS"` | `hasPosition:false` or APRs null on the live demo URL | wire.landing_verify |
| F-007 | Native USDC only (no wormhole) | Every USDC coin type appearing in the refinance tx == `0xdba3...::usdc::USDC` | grep the tx effects coin types | any `0x5d4b302506645c37...::coin::COIN` (wormhole) present | stress.coin_type_check |

**Sentinel principle:** F-001's strongest sentinel is "multiple separate tx digests" — that would mean the atomic-PTB invariant broke and the refinance degraded to a multi-tx sequence (Thesis INVARIANT 1 violation). F-003's sentinel ("any balance moved on an unhealthy attempt") guards INVARIANT 2 (reverts on unhealthy). F-007 guards the native-USDC non-negotiable.
