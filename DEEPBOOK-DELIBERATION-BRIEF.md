# DeepBook Deliberation Brief — RefiRail (handoff for a fresh chat)
> Written 2026-06-19. Purpose: pick the submission track and (if DeepBook) design the
> MINIMAL-deviation way to make DeepBook genuinely central — straying from the validated
> RefiRail idea as little as possible. Then execute the full fix list and finish the pipeline.
> Working dir: ~/hackathon-toolkit/active/sui-overflow-2026/refirail/

## 0. Prime directive (user's words)
"Find the perfect way to migrate to DeepBook the way we want, but straying away from the
current idea as little as possible." The idea was deliberately validated + scope-locked in
warroom/forge (drift tripwires: "not a trading terminal", "math > theme"). Honor that.
Do NOT break the proven on-chain core. Integrity: real data only, honest empty states.

## 1. CONFIRMED hackathon facts (authoritative — rendered the gated Notion handbook via Playwright)
- **DEADLINE: 2026-06-21 18:00 Pacific = 2026-06-22 01:00 UTC.** (Old "06-20 16:00 UTC" was WRONG. ~2.5 days from 06-19.) Winners announced Aug 27; Demo Day Jul 20–21 (DeFi=Jul 21) for shortlisted only.
- **ONE TRACK ONLY per submission.** Handbook FAQ verbatim: "each submission may only be submitted under one primary track." NO core+specialized stacking. "Core Track checkbox … no separate bounty categories associated." The PULSE "multi-track allowed" note was a STALE 2024 quote — dead.
- **Judging (core track):** Real-World Application **50%** · Product & UX **20%** · Technical Implementation **20%** · Presentation & Vision **10%**. "Meaningful products and ecosystem impact, not just technical demos." → Our 50% (demand/use-case) is our WEAKEST area; our genuine strength (the atomic PTB) is only 20%.
- **Platform: DeepSurge** (deepsurge.xyz). **Demo video: required, YouTube preferred, ≤5 min.** Fields: name, description, logo (1:1 JPG/PNG), public GitHub repo, demo video, website (optional), deployment (testnet/mainnet), Package ID. Eligibility: built May 7–Jun 21; existing projects ok only with substantial new build during the window (we qualify). **Prize 50/50 split, but 100% upfront if already on mainnet (we are).**
- **Per-track competition (272 projects, 2577 participants, snapshot 06-19):** Walrus 79 · Agentic Web 68 · **DeFi & Payments 68** · **DeepBook 47** (fewest).
- **Prize structure:** Core (DeFi & Payments) = 4 places $30k/$15k/$10k/$7.5k = $62.5k. Specialized (DeepBook) = 4 places $35k/$15k/$7.5k/$5k = $62.5k + **$7.5k honorable-mention pool** (# of HM winners UNSPECIFIED/discretionary). Core tracks have NO HM pool.
- **DeepBook problem statement (handbook, BROADER than the "trading apps" tagline):** "Build functional applications, services, vaults, bots, or analytics, single-product or multi-component, in any flavor (consumer, professional, structured, social)." → a DeFi *service* using DeepBook is in-scope; we're "thin," not "off-theme." DeepBook is sponsor-judged (Tony @ Mysten runs office hours).
- **Security prize sponsors: OpenZeppelin + OtterSec** — align with our "no new Move, atomic revert, language-level safety" story (relevant whichever track).

## 2. What RefiRail IS today (the validated product)
One-click ATOMIC lending-position refinance. You have SUI collateral + USDC debt on Navi; Suilend is cheaper. In ONE transaction (reverts if it would ever leave you unhealthy, zero upfront capital):
DeepBook flash-borrow USDC → repay Navi → withdraw SUI → deposit SUI to Suilend → borrow USDC on Suilend → return the flash to DeepBook.
- **PROVEN ON-CHAIN (re-verified vs mainnet this session):** digest `BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK`, 15 MoveCalls, status success. ALL 7 observables (F-001..F-007) pass. debug 90/100, wire WIRED, stress 93/100.
- **DeepBook's role today = the flash loan only** (steps 1 + last: `pool::borrow_flashloan_quote` / `return_flashloan_quote`). It lends capital; it does NOT trade. This is the "thin DeepBook" problem.
- Stack: Next.js 15 + @mysten/dapp-kit 1.1.1 + @mysten/sui 2.18.0 + @suilend/sdk 3.0.4 + @naviprotocol/lending 1.4.6 + @mysten/deepbook-v3 1.5.0. Server builds the PTB (/api/preview), wallet signs client-side. ZERO net-new Move. Demo wallet `0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3` (~1.94 SUI; key in .env.local, gitignored). Alchemy keyed `SUI_RPC_URL` in .env.local (warm /api/preview ~2.5s; cold ~13s).
- Design system locked: DESIGN_SYSTEM.md (Sui-aqua #4DA2FF one-hue, DM Serif Display + IBM Plex Mono, pure-glow, "the Rail" signature). Tier-B craft pass done (commit 38fb82d). Stress done (commit 6ced08d).

## 3. The two end-products, side by side
### A. "Tight RefiRail" → DeFi & Payments track
- Exactly today's product, polished. DeepBook stays the flash-loan (edge helper).
- Fit: DIRECT ("financial primitives / payment rails"). Differentiated: first atomic cross-protocol refinance on Sui.
- Competition 68; pool $62.5k/4 places; lower variance; no new PTB risk.
- Win condition: nail the 50% real-world narrative + 20% UX. Minimal code.

### B. "Widened RefiRail" → DeepBook track
- Same atomic, zero-capital, reverts-if-unhealthy SOUL — but DeepBook graduates from flash-loan to EXECUTION ENGINE: route real swaps through the order book. Reframe: "DeepBook-powered atomic position management" (refinance + collateral/debt-swap + deleverage), each impossible without DeepBook's flash + book.
- Fit: thin-but-valid (broad problem statement). Competition 47 (fewest); pool $62.5k + $7.5k HM/4 places; higher EV IF deepened; HIGHER VARIANCE; sponsor-judged.
- Win condition: DeepBook must be visibly central + real order-book usage, not a price widget. Modifies the proven PTB → real risk; needs fresh mainnet testing.

**The dial:** there's a spectrum between A and B. The user wants the point that makes DeepBook genuinely central while moving the LEAST from the validated idea. Candidate minimal-deviation design: keep "atomic refinance" as the headline; make every refinance ALSO execute a real DeepBook order-book swap (asset reshape) + surface live DeepBook depth/mid/best-execution. Resolve the exact point in deliberation.

## 4. DeepBook deepening — technical path + the GATING spike
- DeepBook v3 primitives available: flash (have it), `swapExactBaseForQuote`/`swapExactQuoteForBase`, limit/market orders via BalanceManager, read-only `midPrice`/`getQuantityOut`/`getLevel2TicksFromMid`/`whitelisted`, DeepBook Indexer REST (volume/OHLCV).
- **Fee blocker + unlock:** non-whitelisted SUI/USDC pool (`0xe05dafb5…4407`) needs DEEP for fees. BUT **DEEP/SUI (`0xb663828d…fc22`) and DEEP/USDC (`0xf948981b…95ce`) are WHITELISTED & FEE-FREE.** Hypothesis: route SUI→DEEP→USDC fee-free through those two whitelisted pools, no DEEP holdings needed.
- **RUN THIS SPIKE FIRST (before committing the track):** verify the whitelisted DEEP-pair two-hop (a) has usable liquidity / acceptable slippage for demo-size amounts, and (b) composes inside our atomic PTB alongside the flash loan. ~30–60 min, dryRun/devInspect only (free). GREEN → DeepBook-core is feasible, go deep. RED → don't gamble the proven core, go DeFi & Payments.

## 5. The full fix list (applies to EITHER track unless noted) — none done yet
**Strategy/narrative (highest leverage — feeds the 50% real-world score):**
- Issue 2 — Reframe pitch + UI hero to **atomicity = risk elimination** ("move a loan with zero upfront capital, in one transaction that reverts if it would ever leave you unhealthy"). Demote "Save X% APR" to a supporting line (also fixes the "$0.01/year" embarrassment). Research: rate-arb is NOT why people refinance (DeFi Saver data) — lead with atomicity/risk, not rate.
- Issue 3 — Frame as "the Navi→Suilend rail" = a proven first route on a generalizable rail (mechanism extends to any protocol pair via SDK composition). Don't claim multi-route in the demo; claim the mechanism generalizes.
**Integrity / value-prop:**
- Issue 4 — APR sides not comparable. Switch Navi to `currentBorrowRate` (raw borrow APR, already the coded fallback) so "save X%" is borrow-cost vs borrow-cost. ~20 min. (lib/position.ts)
- Issue 5 — `healthAfter` shows "—". Compute post-refinance health from the dryRun's resulting Suilend obligation; surface it so "stays safe" is shown. ~1–2h, medium risk.
- Issue 6 — Fabrication audit (DEV-011 was a near-miss). APR path already verified real-sourced; audit collateral/debt/health reads the same way. ~30 min.
**UX / operational:**
- Issue 7 — 12–13s cold latency. Server-side warm the Suilend gRPC client on boot + a real progress UX ("Simulating across DeepBook · Navi · Suilend…", 3 logos lighting up) so the wait narrates value. Partial; cold cost is structural.
- Issue 8 — Single demo wallet / empty for others. Guided empty state — "No position? View the live demo position" read-only mode pointed at the demo address.
- Desktop void (540px column on 1440px+). If DeepBook path: the live order-book pricing/depth panel fills it (depth + void + "really uses DeepBook" in one). If DeFi path: a "how it works / 3-protocol" explainer panel.
**Execution-integrity (my gaps this session):**
- Stress Phases 6/7/8 were marked PASS by INFERENCE, not execution — actually run them (localStorage corruption, network throttle/offline, crash-recovery). Truthful confidence rescore after.
- Hover/focus screenshots were byte-identical (fake evidence) — re-capture correctly.
**Submission (process):**
- Deploy to Vercel + set `SUI_RPC_URL`=Alchemy keyed in Vercel env + pre-warm /api/preview before recording.
- Add LICENSE (MIT). Public GitHub repo. ≤5-min YouTube demo video. Logo (1:1). Package ID. Submit on DeepSurge before 2026-06-22 01:00 UTC.

## 6. Recommended first move in the new chat
1. Update the deadline everywhere first (done in memory; reflect in PULSE if needed).
2. Run the §4 spike (whitelisted DEEP-pair routing). It decides the track on a tested fact, not optimism.
3. If GREEN → design the minimal-deviation DeepBook-core widening (§3 dial), then execute §5 fixes + deepening, then deploy/demo/package.
4. If RED → DeFi & Payments, execute §5 fixes, deploy/demo/package.
5. Either way the §5 strategy/integrity/UX fixes + submission steps still apply.

## 7. Non-negotiables
- Don't break the proven PTB core (lib/refinance.ts legs/amounts/DEV-016 oracle refresh) or the demo-resilient routes. Verify any PTB change with dryRun before live.
- Integrity (Thesis INVARIANT 3 / TASTE U7): real on-chain data, honest empty state. No fabricated numbers.
- Keep the 4 critique elevations (E-1 fee-$0, E-2/E-4 README, E-3 $/yr) honest.
- Never stage .env.local. Commit progressively. Append PULSE on exit of each phase.
