# WINNER-BRIEF — Sui Overflow 2026
**Idea:** RefiRail | **Track:** Special–DeepBook ($70k, flash-loan leg) + DeFi & Payments ($62.5k) core | **Warroom Version:** V4 | **Date:** 2026-06-17

> **Forge: read these first (full context lives in `research/`):**
> - `research/FRAMING-LOCK.md` — the frozen product definition (hero flow, scope ladder, invariants, out-of-scope).
> - `research/FEASIBILITY-VERDICT.md` — per-leg SDK verdicts, PTB limits, precedent, 3-day plan, the guaranteed floor.
> - `research/COST-AND-CERTAINTY.md` — the exact 6-step Suilend PTB sequence (Pyth-refresh confirmed) + minimum-spend plan.
> - `research/ecosystem-deep-scan.md` — Sui 2026 protocol/primitive map + sponsor asks + white space.
> - `research/chain-dna.md`, `research/research-brief.md` — chain + hackathon context.

---

## Chosen Idea
**RefiRail** — one-click **atomic lending-position refinance** on Sui. A user with a borrow position on a higher-rate lending market (Navi at 8%) moves it to a lower-rate one (Suilend at 5%) in a SINGLE programmable transaction block (PTB), using a flash loan, reverting entirely if the resulting position is unhealthy. It is "DeFi Saver / Summer.fi refinance" — a proven Ethereum product — that **does not exist on Sui**.

## Problem Statement
On-chain borrowers are stuck paying higher rates than necessary because moving a debt position between lenders manually requires spare capital to repay (which you've already borrowed and spent) and leaves you exposed to liquidation in the gap. **The one shocking number:** Sui has **$450M+ in lending TVL across Navi/Suilend/Scallop** and **zero** tools to move a position between them — the canonical flash-loan-in-one-PTB move, which Sui is uniquely built for, has never been packaged as a product.

## Why It Won (V4 Round-0)
| Criterion | Weight | Round-0 | Rationale |
|-----------|:------:|:-----:|-----------|
| Problem-Solution / ecosystem relevance | 25% | 8.0 | Real recurring use; borrowers chase better rates constantly. Plugs into EXISTING liquidity + positions — no market to bootstrap. |
| Technical Execution | 25% | 7.25 | SHIP #1 — composes three live, SDK'd mainnet protocols; bounded debugging, not unknowns; zero net-new Move. |
| Originality | 20% | 7.75 | Canonical Sui-only move, packaged as a product nobody ships. |
| Sui-native depth | 20% | 9.5 | The atomic cross-protocol PTB IS the product — "dies on port." |
| Usability / Presentation | 10% | 7.5 | One button, one tx, visceral before/after. |
**Round-0 criteria-weighted total: 8.01 (decisive #1 of 6; top-2 on every lens).**

## Key Deliberation Arguments
1. **Satisfies the full criteria journey** that killed every prior winner: real use (vs V1's clever-but-useless), not a clone (vs V2's derivative), plugs into existing liquidity/no bootstrap (vs V3's market-creation fantasies), deeply ecosystem-relevant (V4 lead gate). WILD: *"memorable BECAUSE it's right."* NATIVE 9.5: *"the PTB IS the product."*
2. **Feasibility is source-verified, not assumed.** Both lending SDKs (`@naviprotocol/lending@1.4.6`, `@suilend/sdk@3.0.4`) APPEND to a caller-supplied `Transaction` (confirmed: `@mysten/sui` is a peer dep in both) → all 6 legs compose into ONE atomic PTB in pure TypeScript, **zero net-new Move**. Sui PTB limit is 1024 commands (we use ~10). The flash-loan hot-potato enforces atomicity at the compiler level.
3. **The pattern ships in production** — Current "Multiply" (a Sui DeFi Moonshots winner) does one-tx atomic looping; Navi ships one-click flash-loan looping; Suilend ships looping. Nobody ships a cross-protocol *refinance* → the novel wedge.

## Thesis
WINNING ARGUMENT: RefiRail is the only idea that satisfies the entire criteria journey at once — real recurring use, not a clone, plugs into existing on-chain liquidity (no market to bootstrap), deeply ecosystem-relevant — and its feasibility is source-verified as buildable in pure TypeScript with zero net-new Move.
EVIDENCE:
1. V4 Round-0 #1 at 8.01, top-2 on every lens (real-demand + buildable + deepest-native + most-memorable). | 2. Source-verified: both lending SDKs compose into ONE atomic PTB; Pyth-refresh pattern confirmed from source + Move; the floor is ~$5 outlay / pennies spent with a free `dryRun` dev loop. | 3. Plugs into existing $450M+ lending TVL + DeepBook flash liquidity — the canonical Sui flash-loan-in-1-PTB move as a product nobody ships.
DEMO OBLIGATION: In 3 minutes the judge must WITNESS a real lending position move from one protocol to a cheaper one in ONE atomic transaction — a single Suiscan digest showing flash-borrow → repay source → withdraw collateral → deposit destination → borrow → flash-repay — with before/after rate + health factor, and the collateral provably intact (recovered, not spent).
HERO FLOW: connect wallet → see your Navi position at the higher rate → one click "Refinance to Suilend" → one atomic PTB → position now at the lower rate.
INVARIANTS:
- The refinance is ONE atomic PTB — never a multi-tx sequence that leaves the user exposed.
- Reverts on unhealthy end-state — never leaves a worse/liquidatable position.
- Real protocols + real liquidity (mainnet, small amounts) — no mocked lending; the demo proof is a real Suiscan digest.
- Minimal/zero net-new Move — TypeScript PTB composition IS the build.
DRIFT TRIPWIRES:
- if it becomes a generic lending dashboard / rate-aggregator instead of the one-click atomic MOVE, that is drift.
- if a custom Move wrapper is built before the pure-TS PTB works end-to-end, that is drift.
- if the demo is only a simulation with no real on-chain transaction, that is drift (the Suiscan link is the credibility anchor).

## Locked Build Plan (from FEASIBILITY-VERDICT + COST-AND-CERTAINTY)
- **Flash-loan source:** DeepBook V3 (FEE-FREE) for the full refinance; Navi's own flash loan for the deleverage floor.
- **The exact Suilend leg (one PTB):** `createObligation` → `depositIntoObligation` → append Pyth `updatePriceFeeds` (SDK fetches the Hermes VAA) → `refreshReservePrices` for BOTH the collateral + borrow reserves → `borrow(..., addRefreshCalls: false)` ← `false` is MANDATORY → transfer the (non-droppable) ObligationOwnerCap to the user.
- **Day 1 (de-risk first):** headless Node script; build the PTB leg-by-leg, `devInspectTransactionBlock` after each leg; get the Suilend `refreshReservePrices`+`borrow` to dry-run GREEN inside the PTB before wiring the flash loan. If not green by EOD → drop to the floor.
- **Day 2:** execute one real mainnet tx, capture the Suiscan digest, handle dust/exact-fee, deliberately trigger the unhealthy-revert to prove atomicity, build the `dryRun`-powered "Preview Refinance" panel.
- **Day 3:** Next.js + dapp-kit UI (connect → show position → one Refinance button → before/after rate+health → tx link); record demo + submission.

## Cost (locked — answers "spend as little as possible")
- **Dev loop: $0** — `dryRun`/`devInspect` against live mainnet RPC (real Navi/Suilend/Pyth behavior, no funds).
- **Outlay: ~$5 of SUI** (one low-fee CEX withdrawal of native SUI — no mainnet faucet exists), of which ~$2-3 is recoverable collateral.
- **Truly spent: <$0.10** (gas only; DeepBook flash fee = $0). Use a ~$2-3 SUI collateral / ~$1 native-USDC position (both protocols accept it; no minimums).

## Top Risks + Mitigations
| # | Risk | Severity | Mitigation |
|---|------|:--------:|-----------|
| 1 | Suilend Pyth price-refresh ordering inside the PTB | MED (resolved) | Exact pattern confirmed: refresh BOTH reserves + Pyth update before borrow; `addRefreshCalls:false`. Dry-run the Suilend leg in isolation Day 1. |
| 2 | Mainnet-only demo (Suilend has no testnet) + coin-type correctness | MED | ~$5 real funds, tiny amounts, **native USDC everywhere** (not wormhole), `devInspect` every leg before sending. |
| 3 | Cross-SDK object threading (flash-loan coin → repay → withdraw → deposit → borrow → repay) | MED | All three SDKs are append-to-PTB; bounded debugging. Build leg-by-leg with dry-run after each. |
| 4 | Scope creep into Move or polished UI before the PTB works | HIGH | Headless script first; UI is Day 3 only; custom Move wrapper is explicitly OUT. |

## Non-Negotiables (Must Be In Build)
- ONE atomic PTB; reverts on unhealthy end-state (free from Suilend's borrow guard).
- Zero net-new Move for the core demo (pure-TS PTB composition).
- DeepBook flash loan (free) for the full refinance.
- Real on-chain demo: a verifiable Suiscan digest of one real refinance (plus a free `dryRun` "Preview" panel).
- Native USDC throughout.

## Explicit Out-of-Scope
- Custom Move wrapper / min-health-buffer contract (stretch only; almost certainly skip).
- Multi-asset / every-market support (one pair: SUI collateral / USDC debt).
- Rate-alerts / oracle engine, cross-chain, building our own lending market, custody of funds.
- Testnet (Suilend is mainnet-only; do not depend on a Navi testnet faucet).

## Guaranteed Floor (ship by Day 2 no matter what)
**Navi-only one-click deleverage** using Navi's own flash loan: flash-borrow USDC → repay Navi debt → withdraw SUI collateral → swap a slice via Cetus → repay flash loan. 100% TS, no Suilend, no cross-protocol threading, no Pyth surprise. A legit demo on its own; the Suilend leg upgrades it to a cross-protocol refinance.

## Minority Dissent (Unresolved Concerns)
None blocking. Niche-DeFi audience (sophisticated borrowers) was noted but accepted — the user's lodestar is ecosystem relevance + plug-into-existing-liquidity, which RefiRail maximizes. The single live risk is the Suilend Pyth-refresh ordering, now resolved with a source-verified exact pattern + a Day-1 dry-run gate + the floor.
