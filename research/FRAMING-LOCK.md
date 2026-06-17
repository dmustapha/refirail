# RefiRail — LOCKED FRAMING (research target)
**Locked:** 2026-06-17 | **Status:** FROZEN before feasibility research. Research validates THIS exact target. No scope drift until the go/no-go verdict.

## One-line
One-click **atomic lending-position refinance** on Sui: move an open borrow position from a higher-rate lending market to a lower-rate one in a SINGLE programmable transaction block (PTB), using a flash loan, reverting entirely if the resulting position is unhealthy.

## The hero flow (the ONE thing that must work)
A user has: collateral C (e.g. SUI) + debt D (e.g. USDC) on **Source** lending market at rate R1. **Destination** market offers the same debt at R2 < R1. One click executes, in ONE PTB:
1. **Flash-borrow** amount = D (the debt asset).
2. **Repay** the full debt on Source.
3. **Withdraw** the freed collateral C from Source.
4. **Deposit** C into Destination (create obligation if needed).
5. **Borrow** D from Destination.
6. **Repay the flash loan** (+ fee) with the newly borrowed D.
If any step fails or the end position is unhealthy → the whole PTB reverts; user is never exposed.

## Locked protocol/stack choices (research confirms or swaps)
- **Source lending:** Navi (has its OWN flash loan + TS SDK with PTB helpers).
- **Destination lending:** Suilend (TS SDK, NFT-obligation model).
- **Flash-loan source:** PREFER Navi's own flash loan (fewer moving parts → effectively a 2-protocol build). DeepBook flash loan = fallback if Navi's is unsuitable.
- **Frontend:** Next.js + @mysten/dapp-kit + @mysten/sui (TS SDK) + wallet-kit. zkLogin OPTIONAL, not core.
- **Net-new Move:** TARGET ZERO. Compose the PTB entirely in TypeScript via each SDK's PTB-fragment helpers; rely on protocols' own health checks + flash-loan hot-potato for atomic safety. A thin Move wrapper is allowed ONLY if research proves atomic min-health enforcement is otherwise impossible.

## Demo (locked)
Connect wallet → a real OPEN position on Source at the higher rate is shown → click "Refinance to {Destination}" → ONE explorer transaction → position now on Destination at the lower rate, collateral intact, health factor shown before/after, single tx hash listing all legs.
- **Environment:** testnet IF Navi+Suilend+flash-loan all work there with liquidity; ELSE mainnet with ~$20 real funds. (Research decides — this is a hard input.)

## Scope ladder (locked)
- **L0 — proof-of-magic (guaranteed demo):** a single flash loan in one PTB (borrow → trivial op → repay). Proves the atomic primitive even if the rest slips.
- **L1 — HEADLINE:** full Navi→Suilend refinance for ONE pair (SUI collateral / USDC debt).
- **L2 — stretch (only if time):** multi-asset, reverse direction, live rate-comparison UI across Navi/Suilend/Scallop.
- **FALLBACK (if cross-protocol composition snags):** single-protocol "one-click deleverage / collateral-swap on Navi" using Navi's own flash loan — still shows the wow, rock-solid buildable.

## Invariants (locked)
1. The refinance is ONE atomic PTB — never a multi-tx sequence that leaves the user exposed.
2. Reverts on unhealthy end-state — never leaves a worse/liquidatable position.
3. Real protocols + real liquidity (testnet or mainnet-small) — no mocked lending.
4. Minimal/zero net-new Move — TS PTB composition IS the build.

## Out of scope (locked)
Building our own lending market; supporting every asset/market; cross-chain; a rate-alerts/oracle engine (L2 at most); taking custody of funds.

## THE MAKE-OR-BREAK QUESTION (research must answer definitively)
Do the Navi and Suilend TS SDKs expose functions that **APPEND commands to a caller-supplied `Transaction` (PTB) object** — so all 6 legs compose into ONE atomic PTB — or do they each **build-and-submit their own transaction** (which would break atomicity and force calling the underlying Move entry functions directly)? If composition is impossible at the SDK level, what is the exact fallback (direct Move calls / move-call targets / a thin wrapper), and is THAT 3-day-feasible? This single answer determines go/no-go.
