# RefiRail — Domain Guide

> Generated from `ARCHITECTURE.md` §15 spec. The shared mental model for anyone touching this
> codebase: what the words mean, what must never break, and where each concept lives in code.
>
> RefiRail does ONE thing: atomically refinance a lending position from **Navi → Suilend** in a
> single programmable transaction block (PTB), funded by a **fee-free DeepBook flash loan**, with
> **zero net-new Move** — pure TypeScript composition over three protocols' SDKs.

---

## 1. Key Concepts (~20)

| # | Concept | What it is | Why RefiRail cares |
|---|---------|------------|--------------------|
| 1 | **PTB (programmable transaction block)** | Sui's unit of execution: an ordered list of commands that succeed or revert together. | The entire refinance is ONE PTB — atomicity comes from Sui, not from custom Move. |
| 2 | **Flash loan** | Borrow + repay an asset within a single transaction; reverts if not repaid. | Provides the USDC to clear the Navi debt before any collateral is freed. |
| 3 | **Hot-potato struct** | A Move struct with no `drop`/`store` ability — it MUST be consumed before the PTB ends. | DeepBook's flash-loan receipt is a hot-potato; it *forces* the repay step to exist, giving atomicity for free. |
| 4 | **Obligation** | Suilend's per-user account that holds collateral and debt. | The refinance creates a *fresh* obligation in the same PTB, deposits the freed SUI, and borrows USDC into it. |
| 5 | **ObligationOwnerCap (non-droppable)** | The capability object proving ownership of an obligation; also has no `drop`. | It MUST be transferred to the user before the PTB ends, or the PTB reverts — this *forces* the cap-transfer step. |
| 6 | **Reserve** | A per-asset pool inside a Suilend lending market (e.g. the SUI reserve, the USDC reserve). | Both reserves' prices must be refreshed before borrowing against the new obligation. |
| 7 | **Reserve array index** | The position of a reserve in the market's reserve array. | Avoided by hardcoding — `refreshAll(tx, undefined, [SUI, USDC])` resolves indices from coin types. |
| 8 | **Pyth price refresh** | Pushing fresh Pyth oracle prices on-chain so a protocol values assets correctly. | Suilend requires fresh prices for BOTH reserves before the in-PTB borrow; stale prices revert. |
| 9 | **`refreshReservePrices`** | The low-level Suilend call that updates a reserve's price from a Pyth `PriceInfoObject`. | Wrapped by `refreshAll`, which also fetches Hermes data and orders calls correctly. |
| 10 | **`addRefreshCalls`** | A flag on Suilend's `borrow(...)` that controls whether it internally re-fetches the obligation + injects its own refresh calls. | MUST be `false` for a fresh same-PTB obligation (see Rule R5). |
| 11 | **Health factor / borrow guard** | The solvency check a lending protocol runs at the end of a borrow; reverts if the position would be unhealthy. | Suilend's borrow guard reverts an unhealthy end-state — RefiRail needs no custom safety Move. |
| 12 | **Atomic revert** | If any command in the PTB fails, the whole PTB reverts; no partial state lands on-chain. | The core safety property: a half-refinanced position is *impossible*. |
| 13 | **Native vs Wormhole USDC** | Sui has Circle-native USDC and a legacy Wormhole-bridged USDC (different coin types). | RefiRail uses **native USDC only**; the Wormhole type is recorded but never used (Rule R4). |
| 14 | **DeepBook quote asset** | In a `SUI_USDC` pool, the *base* is SUI and the *quote* is USDC. | USDC is always the quote → always the `*Quote*` flash-loan functions (`borrowQuoteAsset` / `returnQuoteAsset`). |
| 15 | **Navi asset id** | Navi's global-storage model addresses each asset by an integer id, not a pool object id. | `0` = SUI, `10` = native USDC (id `1` is bridged — never used). |
| 16 | **Suilend Main Pool** | The specific Suilend lending market the refinance targets, identified by its market id + type. | Pinned in `lib/config.ts` (`LENDING_MARKET_ID` / `LENDING_MARKET_TYPE`); resolved on-chain by `initSuilend`. |
| 17 | **Refinance** | The hero flow: move a position's collateral + debt from Navi to Suilend in one click. | The product. `buildRefinancePTB` composes it; `simulateRefinance` previews it. |
| 18 | **Deleverage** | The FLOOR fallback: a Navi-only one-click deleverage in one PTB (guaranteed shippable). | Uses Navi's own flash loan + a DeepBook SUI→USDC swap; ships even if the hero composition fails the gate. |
| 19 | **`devInspect` / `dryRun`** | Sui RPC calls that simulate a transaction for $0 against live state. | `dryRunTransactionBlock` previews the refinance (status + balance changes) before the user signs. |
| 20 | **Buffer bps** | A small over-borrow margin (default 30 bps = 0.30%) added to the read debt. | Navi debt accrues to the block clock (later than read time); the buffer ensures the debt fully clears so all collateral can be withdrawn. |

---

## 2. Rules / Invariants

These are the things that must NEVER break. The five named invariants of RefiRail:

- **R1 — One atomic PTB.** The whole refinance is a single programmable transaction block. Any failed
  command reverts everything (Concept 1, 12). No multi-tx orchestration, no off-chain coordination.
- **R2 — Revert on unhealthy.** The end-state solvency is enforced by Suilend's borrow guard
  (Concept 11). If the new Suilend position would be unhealthy, the borrow — and thus the whole PTB —
  reverts. RefiRail adds no custom safety logic.
- **R3 — Zero net-new Move.** Everything is composed in TypeScript over the three protocols' existing
  on-chain packages and SDKs. No new Move package is written or deployed.
- **R4 — Native USDC only.** Always the Circle-native USDC coin type
  (`0xdba34…::usdc::USDC`); never the Wormhole-bridged type (Concept 13). On Navi, native USDC is asset
  id `10`, never `1`.
- **R5 — Amount reconciliation: flash == Suilend borrow == DeepBook return.** The Suilend borrow amount
  equals the flash-loan amount exactly, so the DeepBook return matches `borrow_quantity` exactly (the
  Move assert). Computed once in `computeFlashAmounts`; the Navi over-repay excess refunds to the user,
  netting near-zero.

Two more hard rules that flow from the invariants:

- **The cap MUST transfer.** The non-droppable `ObligationOwnerCap` (Concept 5) must be transferred to
  the user before the PTB ends, or the PTB reverts. This is step 9 of `buildRefinancePTB`.
- **`addRefreshCalls=false` for a fresh obligation.** When borrowing against an obligation created
  earlier in the *same* PTB, `client.borrow(..., addRefreshCalls=false)` is **mandatory**. With the
  default `true`, `borrow` internally calls `getObligation()`, which returns `null` for a not-yet-on-chain
  obligation and throws. This is the single biggest composed-PTB trap (RISK 1). Prices are instead
  refreshed explicitly via `refreshAll(tx, undefined, [SUI, USDC])` *before* the borrow.

---

## 3. Glossary (domain → code)

| Say this | Means this in code |
|----------|--------------------|
| "refinance" | `buildRefinancePTB` (`lib/refinance.ts`) |
| "preview" / "dry-run" | `simulateRefinance` (`lib/simulate.ts`) |
| "the cap" | the `createObligation` result in `appendSuilendDepositBorrow` (`lib/protocols/suilend.ts`) |
| "flash" / "flash-borrow" | `borrowQuoteAsset` via `appendFlashBorrowUSDC` (`lib/protocols/deepbook.ts`) |
| "return the flash" | `returnQuoteAsset` via `appendFlashRepayUSDC` (`lib/protocols/deepbook.ts`) |
| "repay Navi" | `repayCoinPTB` via `appendNaviRepayUSDC` (`lib/protocols/navi.ts`) |
| "free the collateral" | `withdrawCoinPTB` via `appendNaviWithdrawSUI` (`lib/protocols/navi.ts`) |
| "refresh prices" | `client.refreshAll(tx, undefined, [SUI, USDC])` (`lib/protocols/suilend.ts`) |
| "the buffer" | `computeFlashAmounts(debtAtomic, bufferBps)` (`lib/amounts.ts`) |
| "deleverage" / "the floor" | `lib/deleverage.ts` + `appendSwapSuiToUsdc` / Navi flash helpers |
| "init Suilend" | `initSuilend` → `SuilendClient.initialize(...)` over a `SuiGrpcClient` |
| "the gRPC client" | `makeSuiGrpcClient` (`lib/clients.ts`) — required by `@suilend/sdk` 3.0.x init |
| "the JSON-RPC client" | `makeSuiClient` → `SuiJsonRpcClient` (`lib/clients.ts`) — signing/dryRun |

---

## 4. The Hero Sequence (one PTB, ~10 commands)

`buildRefinancePTB` (`lib/refinance.ts`) composes, in order:

1. **Flash-borrow USDC** (fee-free) from DeepBook `SUI_USDC` (USDC = quote).
2. **Repay the Navi USDC debt** fully with the flash proceeds (excess refunds to sender).
3. **Withdraw the freed SUI collateral** from Navi.
4. **Create a fresh Suilend obligation** → in-PTB owner cap.
5. **Deposit the SUI** into the new obligation.
6. **`refreshAll`** both reserve prices (SUI + USDC).
7. **Borrow USDC** (== flash amount) with `addRefreshCalls=false`.
8. **Return the flash loan** EXACTLY (hot-potato consumed; dust remainder returned).
9. **Transfer the obligation cap** to the user (mandatory — non-droppable).
10. **Sweep any USDC dust** to the user.

Atomicity is free: the DeepBook hot-potato forces step 8, the Suilend borrow guard reverts an
unhealthy end-state (R2), and the non-droppable cap forces step 9.

---

## 5. Source Mapping

| Concept(s) | Source of truth |
|------------|-----------------|
| Suilend init, `createObligation`, `deposit`, `refreshAll`, `borrow(addRefreshCalls=false)` | `TECHNICAL-SPIKE.md` §1 (Suilend — `@suilend/sdk@3.0.4`); `ARCHITECTURE.md` §7 |
| DeepBook flash loan (`borrowQuoteAsset`/`returnQuoteAsset`), quote-asset rule, SUI→USDC swap | `TECHNICAL-SPIKE.md` §1 (DeepBook V3); `ARCHITECTURE.md` §5 |
| Navi repay/withdraw/flashloan helpers, asset ids (0 / 10) | `TECHNICAL-SPIKE.md` §1 (Navi — `@naviprotocol/lending@1.4.6`); `ARCHITECTURE.md` §6 |
| Native vs Wormhole USDC, coin types, decimals | `TECHNICAL-SPIKE.md` §1 (Coin types); `lib/config.ts` `COINS` |
| Pyth refresh / `refreshReservePrices` | `TECHNICAL-SPIKE.md` §1 (Pyth); handled internally by `refreshAll` |
| The hero PTB sequence (~10 commands) | `TECHNICAL-SPIKE.md` §2 (THE HERO PTB); `ARCHITECTURE.md` §8 |
| Buffer bps / amount reconciliation (R5) | `ARCHITECTURE.md` §4 Key Decisions; `lib/amounts.ts` `computeFlashAmounts` |
| `addRefreshCalls=false` trap (R5 / RISK 1) | `TECHNICAL-SPIKE.md` §3 (Unverified/Assumed) + §5 (Day-1 Gate); `ARCHITECTURE.md` §7 Key Decisions |
| dryRun preview | `ARCHITECTURE.md` §10; `lib/simulate.ts` |
| Deleverage floor | `ARCHITECTURE.md` §9; `lib/deleverage.ts` |
