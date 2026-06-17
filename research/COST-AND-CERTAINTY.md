# RefiRail — Cost Floor + Pyth-Refresh Certainty (resolved)
**Date:** 2026-06-17 | Source-level verification (SDK tarballs, on-chain Move source, Sui RPC docs).

## CAVEAT #2 (Suilend Pyth refresh) — ✅ CONFIRMED WORKS IN ONE PTB
Verified from `@suilend/sdk@3.0.4` source + on-chain `lending_market.move` + production precedent (Suilend ships looping = deposit→borrow→swap→redeposit→borrow, strictly harder than our flow).

**Why it works (no fundamental blocker):**
- `create_obligation` adds the obligation to an `ObjectTable` inside the already-shared `LendingMarket` synchronously — NO separate "share in a prior tx" step.
- `borrow_request` resolves the obligation from that table via the cap reference IN-VM — it never does an off-chain read. A cap minted earlier in the SAME PTB works.
- `refresh_reserve_price` operates on the RESERVE (args: market + reserveIndex + clock + PriceInfoObject) — NO obligation dependency. So you refresh the SUI + USDC reserves without the obligation existing. This sidesteps the entire "new obligation not visible to RPC" problem.

**The EXACT one-PTB sequence (locked for forge):**
1. `cap = createObligation(tx)`
2. `await depositIntoObligation(owner, COLLATERAL, amt, tx, cap)`  (deposit needs no refresh)
3. `pythClient.updatePriceFeeds(tx, await pythConnection.getPriceFeedsUpdateData([collId, borrId]), [collId, borrId])`  — append UNCONDITIONALLY for determinism (SDK fetches the Hermes VAA for you)
4. `await refreshReservePrices(tx, collPriceInfoObjId, collReserveIdx)` AND `await refreshReservePrices(tx, borrPriceInfoObjId, borrReserveIdx)`  — refresh BOTH reserves before borrow
5. `const [coin] = await borrow(cap, "", BORROW_COIN, amt, tx, /*addRefreshCalls=*/ false)`  — **`false` is MANDATORY** (true does an RPC getObligation that returns null on a fresh same-PTB obligation → throws)
6. `tx.transferObjects([coin], owner); tx.transferObjects([cap], owner)`  — cap is non-droppable, must transfer

**Two must-get-right items:** (a) `addRefreshCalls:false` on borrow; (b) refresh BOTH collateral + borrow reserves before the borrow command. Health-revert is free (Suilend's borrow aborts if unhealthy → whole PTB reverts). One honest "unverified": no open-source standalone repo pins this in one named file (Suilend frontend is closed-source) — but source + Move + looping precedent is stronger evidence.

## COST FLOOR — ~$5 outlay, <$0.10 truly spent, $0 dev loop
**There is NO Sui mainnet fork** (confirmed — no Anvil/Foundry equivalent exists; community asked 2023, still unbuilt; Pyth's Hermes/Wormhole dependency would break a fork anyway). So the $0 path is simulation, not forking.

**The dev loop is FREE.** `devInspectTransactionBlock` / `dryRunTransactionBlock` run the full composed PTB against LIVE mainnet state for $0, no funds — returning success/abort `status`, `balanceChanges`, and `events`. Real Suilend/Navi/Pyth behavior (Pyth "just works" — the real mainnet PriceInfoObject already holds a live price). Iterate unlimited times at $0.
- One nuance: to truthfully simulate "refinance MY position," the simulating sender must OWN the position object (owned-object resolution checks real owner even in devInspect; shared protocol pools are fine for any sender). So open ONE tiny real position first.

**Minimums:** Navi = NONE. Suilend = no constant, only `assert > 0` (non-dust). A **~$2-3 SUI collateral / ~$1 USDC borrow is fully valid.**

**Collateral is recovered** (moved Navi→Suilend, still yours, withdrawable). Only money GONE = gas + flash fee.
- **Flash fee = $0** — use **DeepBook V3 flash loan** (fee-free) instead of Navi (6 bps). Drop the fee to exactly zero.
- **Gas:** heavy refinance PTB ≈ 0.01–0.03 SUI ≈ **$0.01–$0.02** (SUI ≈ $0.74).

**No mainnet faucet exists.** Buy ~$5 SUI on a low-fee CEX (Bitget/OKX), withdraw NATIVE SUI directly (no bridge). Of that $5: ~$2-3 = recoverable collateral, ~$1 round-trips as the borrow, ~$0.05 consumed as gas across setup + demo.

## MINIMUM-SPEND PLAN (locked)
1. Buy ~$5 SUI on a CEX → withdraw native SUI to a fresh mainnet wallet. (one-time, mostly recoverable)
2. Open a tiny real position: deposit ~$2-3 SUI on Navi, borrow ~$1 native USDC.
3. Build the refinance PTB; **flash-borrow from DeepBook (free)**.
4. Iterate the ENTIRE dev loop via `dryRun`/`devInspect` against mainnet — $0, unlimited.
5. Record demo: live `dryRun` "Preview Refinance" (labeled "Simulated against live mainnet — $0", showing real balance deltas) → ONE real `executeTransaction` → Suiscan digest as proof.
6. Withdraw collateral after recording.

**TOTAL TRULY SPENT: <$0.10 (gas only). OUTLAY: ~$5 (mostly recovered). DEV LOOP: $0.**
This is as close to free as possible while keeping a verifiable on-chain Suiscan link (the thing that makes the demo credible to judges). Use native USDC everywhere (not wormhole-USDC).

## Net effect on the go/no-go
Both caveats from the feasibility verdict are now RESOLVED: Pyth-refresh has an exact confirmed pattern; cost is ~$5 outlay / pennies spent with a free simulation dev loop. **GO confidence raised.** No dead ends remain for forge.
