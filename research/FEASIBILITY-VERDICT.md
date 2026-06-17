# RefiRail — Feasibility Verdict
**Date:** 2026-06-17 | **Method:** 4 parallel deep-dives reading actual SDK source (npm tarballs), cloned contract manifests, and Sui protocol config — not docs prose.

## BOTTOM LINE: 🟢 GO — ACHIEVABLE-WITH-DESCOPE
- **Full Navi→Suilend refinance in 3 days: ~70% confidence.**
- **Guaranteed-impressive Navi-only deleverage floor: ~90% confidence.**
- **Zero net-new Move required** — the entire flow composes in pure TypeScript.
- The make-or-break question (can all legs compose into ONE atomic PTB?) = **CONFIRMED YES** at the source level for all three SDKs.

## Per-leg verdicts (all cited)
| Leg | SDK | Verdict | Evidence |
|---|---|---|---|
| Flash loan | `@naviprotocol/lending@1.4.6` (`flashloanPTB`/`repayFlashLoanPTB`) OR `@mysten/deepbook-v3` (`borrowBaseAsset`/`returnBaseAsset`) | 🟢 | Both append to caller's `Transaction`; return hot-potato receipt enforcing atomicity. DeepBook fee = **0%**; Navi = **0.06%**. |
| Repay + withdraw (source) | `@naviprotocol/lending` (`repayCoinPTB`, `withdrawCoinPTB`) | 🟢 | PTB-builder helpers; `withdrawCoinPTB` returns a chainable coin. Global Storage model, account cap optional. |
| Deposit + borrow (dest) | `@suilend/sdk@3.0.4` (`createObligation`/`depositIntoObligation`/`refreshAll`/`borrow`) | 🟢 | All take `transaction: Transaction` and append. `createObligation` returns an in-PTB cap → straight into deposit. `borrow` returns the borrowed Coin handle. |
| PTB composition | `@mysten/sui` Transaction + `@mysten/dapp-kit` | 🟢 | Sui PTB limit = **1024 commands** (we use ~8-12), 128 KiB, 2048 input objects — huge headroom. Cross-package calls + long-lived hot-potato threading are first-class. dapp-kit submits the composed PTB unchanged. |

## THE MAKE-OR-BREAK ANSWER (resolved)
**Both Navi and Suilend SDKs APPEND to a caller-supplied `Transaction` — they do NOT build-and-submit.** Proof: `@mysten/sui` is a *peer dependency* in both (you own the tx instance), every helper's first param is `tx`/`transaction`, and the bodies only call `tx.moveCall(...)` / return `TransactionResult` handles — no `signAndExecuteTransaction` inside. So all 6 legs thread into ONE atomic block. The flash-loan hot-potato (no-ability struct) forces repayment at the Move-verifier level — atomicity is a language guarantee, not our code.

## Obligation-migration crux (resolved)
Suilend's `borrow()` defaults `addRefreshCalls=true` and appends Pyth `updatePriceFeeds` + reserve-refresh into the **same** PTB before the borrow. For a fresh same-PTB create→deposit→borrow, set `addRefreshCalls=false` and append `refreshAll`/`refreshReservePrices` manually (the auto path does an RPC read that can't see a not-yet-on-chain obligation). Workaroundable; this is the one ordering nuance.

## TWO HARD CONSTRAINTS (the honest caveats)
1. **DEMO MUST BE ON MAINNET.** Suilend is mainnet-only (confirmed from cloned `Published.toml` — only `[published.mainnet]`; the "beta market" is a 2nd mainnet package; Pyth/Switchboard have no testnet feeds for these reserves). Navi's testnet is stale (2023). → Demo on **Sui mainnet with ~$25 real funds**: deposit ~$25 SUI on Navi, borrow ~$10 native USDC, refinance. Cost per run ≈ pennies (gas + 0.06% flash fee on $10 = <$0.01). A failed PTB reverts atomically (burns only gas, never principal). Navi has $120M+ USDC, Suilend is the largest Sui lender — $25 is dust, liquidity is a non-issue.
2. **Suilend Pyth-price-refresh-in-PTB** is the #1 build risk — the under-documented step where a Move-novice TS dev burns hours not realizing `borrow` aborts without an in-PTB price refresh. Mitigation: dry-run the Suilend borrow leg in isolation (via `devInspectTransactionBlock`) on Day 1 BEFORE wiring the flash loan.

## Flash-loan source decision
Use **DeepBook's flash loan** for the full refinance (free + independent of both lending legs → no shared-state interaction with Navi/Suilend). Use **Navi's own flash loan** for the deleverage fallback (single-protocol, simplest).

## PRECEDENT (de-risk — the pattern ships in production)
- **Current "Multiply"** (Sui DeFi Moonshots winner) — one-tx atomic leveraged looping on mainnet. Strongest precedent for our exact flash-loan+lending pattern.
- **Navi 1-click LST Leverage** — polished one-click flash-loan looping UX, shipped.
- **SuiFlash** — multi-protocol flash-loan aggregator (Navi/Bucket/Scallop) in one PTB (devnet).
Nobody ships a cross-protocol *refinance* ("DeFi Saver for Sui") → that's the novel wedge. Mechanism proven; product doesn't exist.

## 3-DAY BUILD PLAN (riskiest unknown front-loaded)
- **Day 1 — prove the atomic PTB headless (no UI).** Node script: open the Navi position; build the refinance PTB leg-by-leg, `devInspect` after each leg. KILL THE #1 UNKNOWN: get Suilend `refreshAll`+`borrow` to dry-run green inside the PTB. If green by EOD → de-risked. If not → fall to the floor immediately.
- **Day 2 — execute for real on mainnet + harden.** Real tx, capture the Suiscan link, handle dust/exact-fee math, ObligationOwnerCap threading, deliberately trigger the unhealthy-revert to prove atomicity.
- **Day 3 — UI + demo.** Next.js + wallet-kit: connect → show Navi position → one "Refinance to Suilend" button → before/after rate + health + tx link. Record demo. Reserve for video + submission.

## THE FLOOR (guaranteed-shippable fallback, locked from hour one)
**Navi-only one-click deleverage** using Navi's own flash loan: flash-borrow USDC → repay Navi debt → withdraw SUI collateral → swap a slice via Cetus/aggregator → repay flash loan. 100% TS, no Suilend, no cross-protocol threading, no Pyth-refresh surprise. **Ship this by Day 2 no matter what** — it's a legit demo on its own. The Suilend leg upgrades it from "deleverage" to "cross-protocol refinance."

## TOP 3 RISKS (ranked)
1. Suilend Pyth-refresh-in-PTB (med-high likelihood; blocks the cross-protocol story) → dry-run Day 1; fall to floor if not green.
2. Mainnet-only logistics + coin-type correctness (native USDC everywhere, not wormhole) → tiny amounts, `devInspect` every leg.
3. Scope creep into Move or polished UI before the PTB works → headless script first; UI Day 3 only; Move wrapper explicitly OUT.

## What this means for forge
Forge inherits: confirmed SDKs + versions, the exact PTB leg order, the mainnet-$25 demo env, the zero-Move decision, the Day-1 dry-run gate, and the locked floor. No dead ends — the floor guarantees a demo.
