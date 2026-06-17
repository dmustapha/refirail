# RefiRail — Product Requirements Document

**Hackathon:** Sui Overflow 2026
**Track:** Special–DeepBook ($70k, flash-loan leg) + DeFi & Payments ($62.5k core) — multi-track single submission
**Deadline:** 2026-06-20 16:00 UTC (3 days remaining; ~2.5 build days, Day 3 reserved for demo video + submission)
**Version:** V1
**Scope mode:** rush (MVP = L1 headline refinance + guaranteed floor; L2 stretch cut)

---

## 1. Project Overview

### One-Liner
RefiRail moves your crypto loan from a pricey lender to a cheaper one in a single click — and a single atomic transaction that reverts if it would ever leave you worse off.

### Problem Statement
On-chain borrowers overpay. Moving a debt position from a higher-rate lender to a lower-rate one means repaying debt you no longer have the cash for (you borrowed and spent it), and any manual unwind exposes you to liquidation in the gap between repay and re-borrow. So borrowers just… stay put and bleed interest.

**The one shocking number:** Sui has **$450M+ in lending TVL across Navi, Suilend, and Scallop** and **zero** tools to move a position between them. The canonical flash-loan-in-one-transaction move — the thing Sui's programmable transaction blocks are uniquely built for — has never been packaged as a product on Sui.

### Solution
RefiRail is "DeFi Saver / Summer.fi refinance" for Sui — a proven Ethereum product that does not exist here. A borrower with collateral on Navi at 8% clicks one button and their position moves to Suilend at 5%, in ONE programmable transaction block (PTB): flash-borrow the debt asset, repay the source loan, withdraw the freed collateral, deposit it on the destination, re-borrow, and repay the flash loan — all atomic. If the resulting position is unhealthy, the whole transaction reverts and the user is never exposed. The flash loan is sourced fee-free from a DeepBook V3 pool; the entire flow is composed in pure TypeScript with **zero net-new Move code**.

### Why This Wins
| Judging Criterion | Weight | How We Excel |
|---|:---:|---|
| Problem-Solution Fit / Real-world use | 25% | Real recurring need — borrowers chase better rates constantly. Plugs into existing $450M+ liquidity and real open positions; no market to bootstrap. |
| Technical Execution (working demo, clean code) | 25% | Composes THREE live mainnet protocols (Navi, Suilend, DeepBook) into ONE atomic PTB; source-verified SDKs; a real on-chain Suiscan digest as proof, not a simulation. |
| Originality / Innovation | 20% | The canonical Sui-only flash-loan-in-1-PTB move, packaged as a cross-protocol refinance product nobody ships on Sui. |
| Sui-native depth (object model, composability) | 20% | The atomic cross-protocol PTB **is** the product — flash-loan hot-potato + per-protocol health guards make atomic refinance a *language guarantee*, impossible to replicate as one tx on account-model chains. |
| Usability / UX / Presentation | 10% | One button, one transaction, a visceral before/after of rate + health factor, and a clickable on-chain proof. |

**Warroom V4 Round-0 criteria-weighted total: 8.01 — decisive #1 of 6, top-2 on every lens.**

---

## 2. System Architecture Overview

### System Diagram
```
                          ┌─────────────────────────────────────────────┐
                          │          Browser (Next.js + dapp-kit)         │
                          │                                               │
  user clicks ──────────▶ │  PositionCard → RefinanceButton → BeforeAfter │
                          │       │                  │            ▲       │
                          └───────┼──────────────────┼────────────┼───────┘
                                  │ GET /api/position │ POST       │ tx digest
                                  ▼                   │ /api/preview (dryRun)
                          ┌───────────────────────────┴───────────┐
                          │      Next.js API routes (server)        │
                          │  position reader  │  PTB builder + sim  │
                          └───────┬───────────┴──────────┬─────────┘
                                  │ read                  │ build + dryRun
                                  ▼                       ▼
                          ┌───────────────────────────────────────────────┐
                          │   refinance.ts  (THE atomic PTB composer)       │
                          │   navi.ts │ suilend.ts │ deepbook.ts adapters   │
                          └───────┬───────────┬───────────────┬────────────┘
                 flash-borrow USDC│  repay+withdraw│  deposit+borrow         │ updatePriceFeeds
                                  ▼           ▼               ▼              ▼
                          ┌──────────┐ ┌──────────┐    ┌──────────┐   ┌──────────┐
                          │ DeepBook │ │   Navi   │    │ Suilend  │   │   Pyth   │
                          │ V3 pool  │ │ lending  │    │ lending  │   │ (Hermes) │
                          │(SUI_USDC)│ │ (source) │    │  (dest)  │   │ price    │
                          └──────────┘ └──────────┘    └──────────┘   └──────────┘
                                  │ all 6 legs thread into ONE PTB │
                                  └───────────────────────────────┘
   execute leg (real tx): Browser wallet signs the SAME composed PTB ──▶ Sui mainnet ──▶ Suiscan digest
```

### Component Table
| Component | Type | Purpose | Key Dependencies |
|-----------|------|---------|-----------------|
| `lib/refinance.ts` | Core TS library | Composes the 10-command atomic refinance PTB | navi/suilend/deepbook adapters, `@mysten/sui` |
| `lib/protocols/navi.ts` | Adapter | Read Navi position; append repay + withdraw (+ flashloan for floor) | `@naviprotocol/lending` |
| `lib/protocols/suilend.ts` | Adapter | Init client; append createObligation + deposit + refreshAll + borrow | `@suilend/sdk`, `@mysten/sui/grpc` |
| `lib/protocols/deepbook.ts` | Adapter | Append fee-free flash borrow + return (quote=USDC) | `@mysten/deepbook-v3` |
| `lib/position.ts` | Reader | Read collateral/debt/rate/health on Navi + comparison rate on Suilend | `@naviprotocol/lending`, `@suilend/sdk` |
| `lib/simulate.ts` | Simulator | `dryRun`/`devInspect` the composed PTB; parse status + balanceChanges → preview deltas | `@mysten/sui` |
| `lib/deleverage.ts` | Floor | Navi-only one-click deleverage (Navi flash loan + DeepBook SUI→USDC swap) | `@naviprotocol/lending`, `@mysten/deepbook-v3` |
| `lib/config.ts` | Config | All mainnet object IDs, coin types, feed IDs | TECHNICAL-SPIKE.md |
| `app/api/position/route.ts` | API route | Server-side position read | `lib/position.ts` |
| `app/api/preview/route.ts` | API route | Server-side dryRun preview of the refinance | `lib/refinance.ts`, `lib/simulate.ts` |
| `app/page.tsx` + components | Frontend | Connect wallet, show position, one Refinance button, before/after, tx link | `@mysten/dapp-kit` |
| `scripts/open-position.ts` | Script | Open the tiny real Navi position for the demo | `lib/protocols/navi.ts` |
| `scripts/refine-dryrun.ts` | Script | Day-1 gate: headless dryRun of the refinance leg-by-leg | `lib/refinance.ts`, `lib/simulate.ts` |
| `scripts/refine-execute.ts` | Script | Execute ONE real mainnet refinance; capture Suiscan digest | `lib/refinance.ts` |
| `scripts/seed-demo.ts` | Script | Idempotent demo state setup (ensures a live Navi position exists) | `scripts/open-position.ts` |

### Data Flow
The user connects a wallet in the browser. `GET /api/position` reads their open Navi position (collateral amount, debt amount, current borrow APR) and the comparable Suilend borrow APR, returning a before/after rate delta and current health factor. When the user clicks **Refinance to Suilend**, `POST /api/preview` builds the exact composed PTB and runs `dryRunTransactionBlock` against live mainnet — returning the simulated balance changes and abort/success status for $0, no signature. If the preview is healthy, the browser builds the *identical* PTB client-side, the wallet signs and executes it as ONE transaction, and the UI shows the new Suilend position with the lower rate plus a clickable Suiscan digest listing all six legs. Atomicity is enforced by the chain, not our code: the DeepBook flash-loan hot-potato forces repayment, the Suilend borrow guard reverts on an unhealthy end-state, and the non-droppable obligation cap forces a clean transfer.

#### Problem-statement quality check
GOOD (ours): "Sui has $450M+ in lending TVL across Navi/Suilend/Scallop and zero tools to move a position between them" — quantified, specific, names the mechanism gap. Not "lending is expensive, we fix it with blockchain."

---

## 3. User Flows

### Flow 1: Refinance (the HERO flow — must work end to end)
1. User opens the app and clicks **Connect Wallet** (dapp-kit).
2. App reads the user's open Navi position and displays: collateral (e.g. 3.5 SUI), debt (e.g. 1.00 USDC), current Navi borrow APR (e.g. 8.1%), health factor, and the comparable Suilend APR (e.g. 5.2%) with the delta highlighted ("Save 2.9% APR").
3. User clicks **Refinance to Suilend**.
4. App calls `/api/preview` → shows a "Simulated against live mainnet — $0" panel with projected balance changes and the post-refinance health factor.
5. User confirms; the wallet prompts to sign ONE transaction.
6. The single PTB executes: flash-borrow USDC (DeepBook) → repay Navi → withdraw SUI collateral → create Suilend obligation + deposit SUI → refresh Pyth prices → borrow USDC (Suilend) → repay flash loan → transfer obligation cap to user.
7. App shows the new position on Suilend at the lower rate, collateral intact, the before/after health factor, and a clickable **View on Suiscan** link to the transaction digest.

### Flow 2: Preview-only (no funds, no signature)
1. User connects (or uses a read-only address) and views their position.
2. User clicks **Preview Refinance**.
3. App runs `dryRun` server-side and shows the exact projected outcome — rate change, health factor, balance deltas — labeled as a $0 live-mainnet simulation. No wallet signature required.

### Flow 3: Unhealthy revert (proof of safety — shown in demo)
1. A position is deliberately constructed so the end-state would be unhealthy (or the destination borrow would exceed safe LTV).
2. User clicks Refinance.
3. The PTB aborts atomically; the UI surfaces "Refinance reverted — your position is unchanged and safe," and no state moved (only gas spent). This proves the revert-on-unhealthy invariant on-chain.

### Flow 4: Floor — Navi-only deleverage (fallback product, ships by Day 2)
1. User with a leveraged Navi position clicks **Deleverage**.
2. ONE PTB: Navi flash-borrow USDC → repay Navi debt → withdraw a slice of SUI collateral → swap SUI→USDC via the DeepBook SUI_USDC pool → repay flash loan.
3. Position is de-risked in one transaction. (This is the guaranteed-shippable product if the cross-protocol leg slips.)

### Sequence Diagram — Hero refinance
```
User    -> Frontend: click "Refinance to Suilend"
Frontend-> /api/preview: { address, position }
/api/preview -> refinance.ts: buildRefinancePTB(...)
refinance.ts -> Sui RPC: dryRunTransactionBlock(ptb)
Sui RPC -> /api/preview: { status: success, balanceChanges }
/api/preview -> Frontend: preview deltas + post-health
Frontend-> User: show $0 simulated outcome
User    -> Frontend: confirm
Frontend-> refinance.ts: buildRefinancePTB(...) [identical]
Frontend-> Wallet: signAndExecuteTransaction(ptb)
Wallet  -> Sui mainnet: ONE atomic PTB (6 protocol legs)
Sui mainnet -> Frontend: { digest, effects }
Frontend-> User: new Suilend position + Suiscan link
```

---

## 4. Technical Specifications

### `lib/refinance.ts` — Atomic PTB Composer (CORE)
- **Purpose:** Build the single `Transaction` that performs the full cross-protocol refinance.
- **Interface:**
  ```ts
  interface RefinanceParams {
    sender: string;
    collateralType: string;   // SUI
    debtType: string;         // native USDC
    debtAmountHuman: number;   // e.g. 1.00 (USDC); flash + Suilend borrow
    collateralAmountAtomic: bigint; // SUI withdrawn from Navi
    flashBufferBps?: number;  // small over-borrow buffer for accrued interest
  }
  function buildRefinancePTB(params: RefinanceParams): Promise<Transaction>;
  ```
- **Key Data Structures:** `Transaction` (`@mysten/sui/transactions`); per-leg `TransactionResult` coin/cap handles threaded between legs.
- **Dependencies:** navi, suilend, deepbook adapters; `lib/config.ts`.
- **Constraints:** ≤ ~10 PTB commands (limit is 1024); all legs APPEND to one caller-owned `Transaction`; obligation cap MUST be transferred before the block ends.

### `lib/protocols/suilend.ts` — Suilend adapter
- **Purpose:** Initialize `SuilendClient` and append the create→deposit→refresh→borrow legs.
- **Interface:** `initSuilend(grpc): Promise<SuilendClient>`; `appendSuilendDepositBorrow(client, tx, { suiCoin, collateralType, debtType, borrowHuman, sender }): Promise<{ borrowedCoin, cap }>`.
- **Key calls:** `createObligation(tx)`, `deposit(coin, type, cap, tx)`, `refreshAll(tx, undefined, [SUI, USDC])`, `borrow(cap, "", USDC, amt, tx, false)`. (`""` obligationId + `addRefreshCalls=false` mandatory for a fresh same-PTB obligation.)
- **Constraints:** ⚠️ 3.0.x init takes a `SuiGrpcClient`, not a `SuiClient`.

### `lib/protocols/navi.ts` — Navi adapter
- **Purpose:** Read the source position; append repay + withdraw (+ flash for the floor).
- **Interface:** `readNaviPosition(client, address): Promise<NaviPosition>`; `appendNaviRepayWithdraw(tx, { usdcCoin, debtAtomic, collateralAtomic }): Promise<{ suiCoin }>`.
- **Key calls:** `repayCoinPTB(tx, 10, usdcCoin, { amount })`, `withdrawCoinPTB(tx, 0, collateralAtomic)` → returns SUI coin handle. Asset IDs: SUI=0, native USDC=10.

### `lib/protocols/deepbook.ts` — Flash-loan adapter
- **Purpose:** Append the fee-free flash borrow + return.
- **Interface:** `appendFlashBorrow(db, tx, amountHuman): [usdcCoin, flashLoan]`; `appendFlashRepay(db, tx, amountHuman, coin, flashLoan): void`.
- **Key calls:** `tx.add(db.flashLoans.borrowQuoteAsset('SUI_USDC', amt))` → `[coin, flashLoan]`; `tx.add(db.flashLoans.returnQuoteAsset('SUI_USDC', amt, coin, flashLoan))`. Fee = 0; USDC is the QUOTE asset.

### `lib/simulate.ts` — Simulation/preview
- **Purpose:** Run the composed PTB through `dryRunTransactionBlock`/`devInspectTransactionBlock` and parse the result.
- **Interface:** `simulateRefinance(suiClient, tx, sender): Promise<{ ok: boolean; abortReason?: string; balanceChanges: BalanceChange[]; healthAfter?: number }>`.
- **Constraints:** To simulate "refinance MY position," the sender must OWN the position (owned-object resolution checks real owner even in dryRun). Shared protocol pools resolve for any sender.

### `lib/position.ts` — Position reader
- **Purpose:** Surface collateral, debt, current Navi APR, Suilend comparison APR, and health factor.
- **Interface:** `getPositionView(address): Promise<PositionView>`.
- **Constraints:** Read-only; tolerant of "no position" (returns a guided empty state directing the user to `seed-demo`/open-position).

### `lib/deleverage.ts` — Floor
- **Purpose:** Navi-only one-click deleverage PTB (the guaranteed product).
- **Interface:** `buildDeleveragePTB({ sender, repayHuman, collateralSliceAtomic }): Promise<Transaction>`.
- **Key calls:** `flashloanPTB(tx, 10, amt)` → `[balance, receipt]`; repay Navi; `withdrawCoinPTB`; DeepBook `swapExactBaseForQuote` (SUI→USDC); `repayFlashLoanPTB(tx, 10, receipt, coin)`.

### `lib/config.ts` — Config
- **Purpose:** Single source for all verified mainnet object ids, coin types, asset ids, and Pyth feed ids (from TECHNICAL-SPIKE.md).
- **Interface:** named exports — `SUILEND`, `DEEPBOOK`, `NAVI`, `COINS`, `PYTH`, `RPC`.
- **Constraints:** runtime-resolved values (Suilend reserve indices, Navi pool ids) are fetched at startup, NOT hardcoded.

### `app/api/position/route.ts` — Position API
- **Purpose:** Server-side read of the user's Navi position + Suilend comparison rate.
- **Interface:** `GET ?address=` → `PositionView` JSON (see §5).
- **Dependencies:** `lib/position.ts`.

### `app/api/preview/route.ts` — Preview API
- **Purpose:** Server-side `dryRun` of the composed refinance PTB; returns balance deltas + abort status.
- **Interface:** `POST { address, debtAmountHuman, collateralAmountAtomic }` → preview JSON (see §5).
- **Dependencies:** `lib/refinance.ts`, `lib/simulate.ts`.

### `app/page.tsx` + components (PositionCard, RefinanceButton, BeforeAfterPanel, PreviewPanel, TxLink)
- **Purpose:** The single-screen UI: connect wallet, show position + rate delta, one Refinance button, before/after, Suiscan link.
- **Interface:** React components consuming `/api/position` + `/api/preview`; execute via dapp-kit `useSignAndExecuteTransaction`.
- **Constraints:** read-only/preview works with no wallet; only the real execute is wallet-gated.

### `scripts/open-position.ts` — Demo position opener
- **Purpose:** Deposit ~3 SUI collateral + borrow ~1.00 native USDC on Navi for the demo wallet.
- **Interface:** CLI; reads `DEMO_PRIVATE_KEY`; idempotent (no-op if position exists).
- **Dependencies:** `lib/protocols/navi.ts`.

### `scripts/refine-dryrun.ts` — Day-1 gate script
- **Purpose:** Headless `devInspect`/`dryRun` of the refinance PTB leg-by-leg; the Day-1 GREEN gate.
- **Interface:** CLI; prints per-leg status + final balanceChanges.
- **Dependencies:** `lib/refinance.ts`, `lib/simulate.ts`.

### `scripts/refine-execute.ts` — Real execution script
- **Purpose:** Execute ONE real mainnet refinance; write digest + effects to `submission/proof.md`.
- **Interface:** CLI; reads `DEMO_PRIVATE_KEY`; prints the Suiscan URL.
- **Dependencies:** `lib/refinance.ts`.

### `scripts/seed-demo.ts` — Demo seed
- **Purpose:** Idempotent demo-state setup (ensures the demo Navi position exists per PRD §6).
- **Interface:** CLI; orchestrates `open-position.ts`.
- **Constraints:** safe to run repeatedly; produces the §6 seed table state from scratch.

---

## 5. API Contracts

RefiRail is mostly client-side (the wallet signs in the browser). External services it calls:

### External API: Sui Mainnet RPC
- **Base URL:** `https://fullnode.mainnet.sui.io:443` (JSON-RPC, for `SuiClient` signing/execution/dryRun); gRPC endpoint for `SuiGrpcClient` (Suilend SDK init).
- **Authentication:** none (public). A paid RPC (e.g. a key'd endpoint) is optional for rate-limit headroom during the demo.
- **Rate Limits:** public node throttles bursts; the demo issues few calls. Optional `SUI_RPC_URL` override.
- **Key methods used:** `dryRunTransactionBlock`, `devInspectTransactionBlock`, `signAndExecuteTransaction` (via wallet), object reads.

### External API: Pyth Hermes
- **Base URL:** `https://hermes.pyth.network`
- **Authentication:** none.
- **Usage:** Suilend's `refreshAll` fetches `getPriceFeedsUpdateData([SUI/USD, USDC/USD])` internally and appends `updatePriceFeeds` to the PTB. RefiRail does not call Hermes directly for the hero leg.

### External API: Navi Open Config
- **Base URL:** `https://open-api.naviprotocol.io/api/navi/config`
- **Authentication:** none.
- **Usage:** resolve Navi asset/pool ids at startup (SUI=0, native USDC=10) rather than hardcoding pool object ids.

### Internal Route: `GET /api/position?address={addr}`
- **Auth:** none (read-only).
- **Response (200):**
  ```json
  {
    "hasPosition": true,
    "collateral": { "type": "0x2::sui::SUI", "amountHuman": 3.5, "usd": 2.59 },
    "debt": { "type": "0xdba3...::usdc::USDC", "amountHuman": 1.0, "usd": 1.0 },
    "naviAprPct": 8.1,
    "suilendAprPct": 5.2,
    "aprDeltaPct": 2.9,
    "healthFactor": 1.84
  }
  ```
- **Errors:** `400` missing/invalid address; `200` with `hasPosition:false` when no Navi position exists; `503` RPC unavailable.

### Internal Route: `POST /api/preview`
- **Auth:** none.
- **Request:**
  ```json
  { "address": "0x...", "debtAmountHuman": 1.0, "collateralAmountAtomic": "3500000000" }
  ```
- **Response (200):**
  ```json
  {
    "ok": true,
    "balanceChanges": [{ "coinType": "0x2::sui::SUI", "amount": "-30000000" }],
    "healthAfter": 2.10,
    "naviAprPct": 8.1,
    "suilendAprPct": 5.2
  }
  ```
- **Errors:** `200` with `{ "ok": false, "abortReason": "..." }` when the PTB would abort (e.g. unhealthy end-state); `400` invalid params; `503` RPC unavailable.

---

## 6. Demo Script

**Total Duration:** 3 minutes (target; confirm exact max in the Sui Overflow handbook — see Downstream Items).
**Format:** screen recording with voiceover; one real on-chain transaction shown live.

<!-- [CRITIQUE E-4] Scene 1 leads with the shocking number; [CRITIQUE E-3] position card shows annualized $ savings. -->
### Scene 1: The problem (0:00–0:25)
**Screen:** RefiRail landing — a single position card showing "Navi · 3.5 SUI collateral · 1.00 USDC borrowed · 8.1% APR" with a red "You're overpaying" badge, "Suilend offers 5.2%," and an annualized "≈ $X/year saved" figure.
**Voiceover:** "Sui has over $450 million in lending liquidity across Navi, Suilend, and Scallop — and zero tools to move a position between them. This wallet borrows at 8%; the same loan is 5% one protocol over. On every chain, moving it means repaying debt you've already spent — and risking liquidation in the gap. So people just overpay. RefiRail fixes that in one click."
**Action:** cursor hovers the rate delta; "Save 2.9% APR" highlights.

<!-- [CRITIQUE E-1] Preview panel surfaces the fee-free DeepBook flash row (pool net USDC delta == 0). -->
### Scene 2: Preview — $0, live mainnet (0:25–0:55)
**Screen:** click **Preview Refinance** → a panel slides in: "Simulated against live Sui mainnet — $0, no signature," listing projected balance changes, "Health factor 1.84 → 2.10," and a **"DeepBook flash loan — fee $0"** row (the SUI_USDC pool's net USDC change is exactly zero — fee-free vs ~0.05–0.09% typical flash fees elsewhere).
**Voiceover:** "Before spending anything, RefiRail dry-runs the entire move against live mainnet for free — real Navi, real Suilend, real Pyth prices. The flash loan that makes it atomic comes from a DeepBook pool, fee-free. You see the exact outcome first."
**Action:** the preview populates with real numbers from `dryRun`.

### Scene 3: The one-click atomic move (0:55–1:50)
**Screen:** click **Refinance to Suilend** → wallet prompts ONE transaction → approve → spinner → success.
**Voiceover:** "One click. One transaction. Behind it, six steps thread into a single programmable transaction block: flash-borrow the USDC from a DeepBook pool — fee-free — repay Navi, withdraw the collateral, deposit it on Suilend, re-borrow, and repay the flash loan. If the end position were ever unhealthy, the whole thing reverts. This is the move Sui is built for — and it's pure TypeScript, zero new smart contracts."
**Action:** an animated 6-leg trace lights up as the tx confirms.
**Floor variant (demonstrates Flow 4):** if the cross-protocol leg slipped to the guaranteed floor, Scene 3 instead shows the Navi-only one-click **Deleverage** — the identical one-button UX and a single atomic PTB (Navi flash-borrow → repay → withdraw → DeepBook SUI→USDC swap → flash-repay) — so the demo's hero moment holds either way.

### Scene 4: Proof on-chain (1:50–2:25)
**Screen:** the position card now reads "Suilend · 3.5 SUI · 1.00 USDC · 5.2% APR," health factor updated, and a **View on Suiscan** button.
**Voiceover:** "Done. The loan now lives on Suilend at 5%, the collateral is intact, and here's the on-chain proof — a single digest listing all six legs."
**Action:** click View on Suiscan → the real transaction page loads showing the six protocol calls in one transaction.

### Scene 5: Safety + close (2:25–3:00)
**Screen:** quick cut to the unhealthy-revert case — "Refinance reverted — your position is unchanged and safe" — then back to the rate saved.
**Voiceover:** "It can never leave you worse off — Suilend's own borrow guard reverts the entire transaction atomically. RefiRail is DeFi Saver for Sui: $450 million in lending liquidity, and finally a one-click rail to move between it. Built on Navi, Suilend, and DeepBook."
**Action:** end card: "RefiRail · one-click atomic refinance on Sui."

### Demo Prerequisites

**Seed State Table** — exact state that must exist before recording begins. `scripts/seed-demo.ts` implements this and is idempotent.

| Item | Value | Network / Location | Created By |
|------|-------|-------------------|------------|
| Demo wallet | fresh mainnet address, ~$5 native SUI | Sui mainnet | manual CEX withdrawal (one-time) |
| Open Navi position | deposit ~3 SUI collateral, borrow ~1.00 native USDC | Navi (mainnet) | seed-demo.ts → open-position.ts |
| Native USDC only | coin type `0xdba3...::usdc::USDC` (NOT wormhole) | demo wallet | open-position.ts |
| Suilend reserves live | SUI + native USDC reserves exist on Main Pool | Suilend (mainnet) | pre-existing protocol state |
| DeepBook SUI_USDC pool | holds ≥ borrow amount in USDC | DeepBook (mainnet) | pre-existing protocol state |

**Invariant:** `npx tsx scripts/seed-demo.ts` from project root produces this exact state from scratch and is idempotent (re-running when the position already exists is a no-op). **TASTE U7:** the demo state is *earned* (a real position opened with real funds), never fabricated — the Suiscan digest is the credibility anchor.

---

## 7. Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation | Decision Tree |
|---|------|----------|-----------|--------|------------|:---:|
| 1 | Suilend Pyth price-refresh ordering inside the PTB (borrow aborts without an in-PTB refresh of BOTH reserves) | CRITICAL | MEDIUM | Hero leg fails; no cross-protocol story | Source-verified pattern: `refreshAll(tx, undefined, [SUI,USDC])` then `borrow(...,addRefreshCalls=false)`. **Day-1 dry-run gate in isolation before wiring flash loan.** | Plan Phase 1 |
| 2 | Suilend SDK 3.0.x requires `SuiGrpcClient` (not `SuiClient`) for init — silent type/runtime failure | HIGH | MEDIUM | Suilend leg won't initialize | Construct `new SuiGrpcClient(...)` for SDK init; keep separate `SuiClient` for signing. Verified in spike. | Plan Phase 1 |
| 3 | Mainnet-only demo (Suilend has no testnet) + wrong coin type (wormhole vs native USDC) | CRITICAL | MEDIUM | Demo can't run / silent wrong-asset failure | Native USDC `0xdba3...::usdc::USDC` everywhere (verified ×4); ~$5 real funds, tiny amounts; `devInspect` every leg. | Plan Phase 2 |
| 4 | Cross-SDK object threading (flash coin → repay → withdraw → deposit → borrow → repay) misorders handles | HIGH | MEDIUM | PTB aborts | All three SDKs append to one `Transaction`; build leg-by-leg with `devInspect` after each leg. | Plan Phase 1 |
| 5 | Exact-amount reconciliation: flash amount vs Navi debt + accrued interest vs Suilend borrow vs flash repay (must be exact) | HIGH | HIGH | Off-by-dust abort | Flash slightly > debt (buffer bps); repay Navi in full; Suilend borrow = flash repay amount; sweep remainder to user. Tune via `dryRun` `balanceChanges`. | Plan Phase 2 |
| 6 | DeepBook track depth bar ("real CLOB integration, not a wrapper") — flash loan is lighter than order-routing | MEDIUM | MEDIUM | Weaker DeepBook track scoring | DeepBook builder-hub **explicitly lists "flash loans in one PTB"** as a sanctioned ask; lead DeFi & Payments as primary track, DeepBook as the multi-track anchor; surface the fee-free flash leg prominently in the demo. | Plan Phase 3 |
| 7 | Scope creep into custom Move or polished UI before the PTB works | HIGH | MEDIUM | Burn build time, miss the headline | Headless script first (Day 1); UI is Day 3 only; custom Move wrapper explicitly OUT of scope. | Plan Phase 1 |
| 8 | Navi pool/asset id drift or config-API change | MEDIUM | LOW | Repay/withdraw target wrong pool | Resolve via SDK `getPools()`/config at startup (don't hardcode pool object ids); asset ids SUI=0/USDC=10 verified. | Plan Phase 1 |
| 9 | Public Sui RPC / gRPC **or Pyth Hermes** rate-limit or downtime during live demo (any external API unavailable) | MEDIUM | MEDIUM | Demo stalls / preview fails | `SUI_RPC_URL` override to a key'd endpoint; Suilend `refreshAll` retries Hermes; pre-warm preview; record a backup take. | Plan Phase 3 |
| 10 | Cross-protocol leg not green by EOD Day 1 | HIGH | MEDIUM | Headline at risk | **Drop to the FLOOR** (Navi-only deleverage) — guaranteed shippable by Day 2; still a legit demo. | Plan Phase 1 gate |
| 11 | Competitor ships a similar refinance during the window | LOW | LOW | Originality dilution | Pattern doesn't exist on Sui today; depth + real on-chain proof + multi-track is the moat. | — |
| 12 | DeepBook SDK constants pinned to HEAD may rotate on package upgrade | MEDIUM | LOW | Wrong package/pool id | Verify installed `node_modules/@mysten/deepbook-v3` constants match spike before paste; pass poolKey string, let SDK resolve. | Plan Phase 0 |

### Risk Categories Covered
- [x] Technical risks (1, 2, 3, 4, 5, 8, 12)
- [x] Competitive risks (11)
- [x] Time risks (7, 10)
- [x] Demo risks (3, 9, 10)
- [x] Judging risks (6)
- [x] Scope risks (7)

---

## 7.5 Judge Experience (first-visit plan)

- **First-visit state:** the live URL opens on the demo wallet's real Navi position pre-loaded (read-only view): collateral, debt, "8.1% → 5.2%, save 2.9% APR," and a glowing **Refinance to Suilend** button. No empty state, no "connect to continue" wall — a read-only address renders the full position card immediately, and **Preview Refinance** works with no wallet.
- **Seed script requirements:** `scripts/seed-demo.ts` guarantees a live Navi position exists for the demo address (≈3 SUI collateral / ≈1.00 native USDC borrowed). Idempotent; re-running is a no-op when the position is present. The frontend reads a `NEXT_PUBLIC_DEMO_ADDRESS` so judges see real data on first paint.
- **10-second test:** the hero line "Move your loan to a cheaper rate in one click" + the live 8.1%→5.2% delta tells a judge exactly what this does.
- **30-second test:** clicking **Preview Refinance** shows the real $0 dry-run outcome — judges see core value (the atomic move's projected result) without spending or signing.
- **60-second test:** the primary CTA **Refinance to Suilend** runs the real transaction; the **View on Suiscan** link is the proof. (For a judge without funds, Preview is the safe try-it path.)
- **Landing page content:** position card + rate delta + preview are all visible/usable with no login. The only wallet-gated action is the real execute.

**Demo-Insurance Invariant Check:** the product's claim is *verifiability* (a real on-chain refinance). Per Thesis INVARIANT 3 + TASTE U7, fabricated state is **forbidden** — the demo position is a real position opened with real funds, and the proof is a real Suiscan digest. The only "insurance" allowed is the free `dryRun` preview (explicitly labeled as simulation) and a pre-recorded backup take of the real transaction.

## 7.6 Judge Proof Artifacts

- **Proof surface:** a `/proof` section in the README and an in-app **View on Suiscan** link.
- **Required artifacts:**
  - The real refinance transaction **digest** (Suiscan URL) showing all six protocol calls in one transaction.
  - The deliberate **unhealthy-revert** transaction digest (proves the atomic safety guard on-chain).
  - The demo wallet address (so judges can independently inspect the before/after position).
  - Protocol object ids used (Suilend Main Pool, DeepBook SUI_USDC pool, Navi asset ids) with explorer links.
- **Proof generation:** `scripts/refine-execute.ts` runs the real refinance and writes the digest + effects to `submission/proof.md`. A second run against a deliberately-unhealthy position captures the revert digest.
- **Explorer link pattern:** `https://suiscan.xyz/mainnet/tx/{digest}` and `https://suiscan.xyz/mainnet/object/{id}`.

---

## 8. Day-by-Day Build Plan

| Day | Date | Primary Objective | Secondary Objective | Deliverable |
|:---:|------|------------------|--------------------|-----------  |
| 1 | 2026-06-17 (today, partial) | Scaffold + headless dry-run of the Suilend create→deposit→refreshAll→borrow leg GREEN in isolation; open the tiny real Navi position | Wire DeepBook flash + Navi repay/withdraw into one PTB; full refinance `dryRun` GREEN | `scripts/refine-dryrun.ts` green; **Day-1 gate decision** (proceed vs floor) |
| 2 | 2026-06-18 | Execute ONE real mainnet refinance; capture Suiscan digest; exact-amount/dust math; deliberate unhealthy-revert proof | Floor (`deleverage.ts`) shippable as backstop | `scripts/refine-execute.ts` real digest in `submission/proof.md` |
| 3 (AM) | 2026-06-19 | Next.js + dapp-kit UI: connect → position → Refinance button → before/after → Suiscan link; `/api/position` + `/api/preview` | Preview panel polish; deploy to Vercel | Live URL with working preview + real execute |
| 3 (PM) → deadline | 2026-06-19 PM / 2026-06-20 AM | Record demo video; write README + `/proof`; submit on DeepSurge before 16:00 UTC | Backup demo take | Submission complete |

### Buffer Allocation
The riskiest unknown (Suilend Pyth refresh) is front-loaded to Day 1 morning with a hard EOD gate; failing it drops to the floor immediately rather than burning Day 2. ~3 hours of Day 3 PM is reserved as submission buffer before the 16:00 UTC cutoff.

---

## 9. Dependencies & Prerequisites

### External Services
| Service | URL | Auth Required | Status |
|---------|-----|:---:|---|
| Sui mainnet JSON-RPC | `https://fullnode.mainnet.sui.io:443` | no | live |
| Sui mainnet gRPC (Suilend init) | mainnet gRPC endpoint | no | live |
| Pyth Hermes | `https://hermes.pyth.network` | no | live |
| Navi open config | `https://open-api.naviprotocol.io/api/navi/config` | no | live |
| Vercel (frontend host) | vercel.com | yes (deploy) | account ready |

### Development Tools
| Tool | Version | Purpose | Install Command |
|------|---------|---------|----------------|
| Node | ≥ 20 | runtime | nvm install 20 |
| pnpm or npm | latest | package manager | `npm i -g pnpm` |
| tsx | latest | run TS scripts | `npm i -D tsx` |
| Next.js | 15.x | frontend | `npx create-next-app@latest` |

### Accounts & Credentials
| Account | Purpose | How to Get |
|---------|---------|-----------|
| Demo Sui wallet (mainnet) | hold ~$5 SUI, open the demo position | generate keypair; fund via CEX (Bitget/OKX) native SUI withdrawal |
| Vercel | host the live URL | existing account |

### On-Chain Addresses (verified — full table in ARCHITECTURE.md)
| Item | Address | Network | Source |
|------|---------|---------|--------|
| Suilend LENDING_MARKET_ID | `0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1` | mainnet | `@suilend/sdk@3.0.4` tarball |
| DeepBook SUI_USDC pool | `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407` | mainnet | `@mysten/deepbook-v3` constants |
| Native USDC coin type | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` | mainnet | verified ×4 |
| Navi asset ids | SUI=0, native USDC=10 | mainnet | navi config |

---

## 10. Concerns Compliance

| # | Severity | Concern | How PRD Addresses It |
|---|:---:|---------|----------------------|
| 1 | C→relaxed | Time NOT a constraint (OVERRIDDEN this run) | Buildability scored: zero net-new Move, source-verified SDKs, Day-1 gate, guaranteed floor — 3-day-feasible by design. |
| 2 | I | Mocks fine; TASTE U7 earned demo state | NO mocked lending — real mainnet position + real Suiscan digest; only the labeled `dryRun` preview is simulation. |
| 3 | C | Uniqueness non-negotiable | Cross-protocol atomic refinance does not exist on Sui; "DeFi Saver for Sui" is the novel wedge. |
| 5 | C | "Does this help real humans?" | Borrowers save real APR on real positions; recurring need as rates move. |
| 8 | C | Cumulative corrections | Reflects V1→V4 lineage: ecosystem-relevance lead gate (rejected clever-but-useless, derivative, bootstrap-market shapes). |
| 9 | C | Significant real problem + builder conviction | $450M+ idle-to-move lending TVL; a tool Dami would use without a prize. |
| 13 | C | Serve users who exist TODAY | Navi/Suilend borrowers exist now with live positions and rate gaps. |
| 14 | I | Demo must feel like the real product | The demo IS the real product — a real on-chain transaction, not a staged mock. |
| 15 | C | No self-duplication (shipped + in-flight) | Not the AgentMesh (agent/x402) or AlphaAttest (commit-resolve-attest) shape; a DeFi PTB-composition product. |
| C-PH1 | C | Identity = low-competition specialized track + core | DeepBook ($70k, flash-loan leg) specialized + DeFi & Payments core via multi-track. |
| C-PH2 | C | Demo-perfect is the win condition; reserve Day 3 | Day 3 reserved for video + submission; demo script + seed + backup take planned. |
| C-PH5 | C | Real day-1 demand + recurring DO action | Borrower's action = refinance (a DO, not a dashboard look); returns when rates move. Not a forensic/check-once shape. |
| I-PH3 | I | Minimize net-new Move | ZERO net-new Move — pure-TS PTB composition. |
| I-PH4 | I | No clones of winners/incumbents | Not a 2025 winner clone; novel cross-protocol refinance. |
| 4 | A | Fresh ideas allowed | — acknowledged. |
| 6,7 | I | Read all research / be extensive | Built from FRAMING-LOCK + FEASIBILITY + COST + spike. |
| 10,11 | I | Focused product, broad problem; winning AND impact | One button (focused); rate optimization across $450M (broad); both. |
| 12 | A | Reframing on the table | Framing frozen pre-research (FRAMING-LOCK) — intentionally not reframing. |

All [C] critical concerns are addressed. No critical concern is left unaddressed → PRD is complete.
