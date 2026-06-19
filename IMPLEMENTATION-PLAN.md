# RefiRail — DeepBook-core widening: locked implementation plan

> Single source of truth for the build (2026-06-19 → deadline **2026-06-22 01:00 UTC**).
> Supersedes ad-hoc notes; complements `DELEVERAGE-SCOPE.md` (decision rationale). Track = **DeepBook**.
> Status: deliberation LOCKED · deleverage engine **dryRun-GREEN on mainnet** (commit 5c9e9df).
> Discipline: refinance core FROZEN · verify every PTB change with dryRun before live · real data only ·
> never stage .env.local · commit progressively · append PULSE on phase exit.

## 0. What is already done (do not redo)
- Spike GREEN: DEEP_SUI + DEEP_USDC whitelisted, 0 DEEP fee; SUI→DEEP→USDC composes atomically; <2% slip ≥0.5 SUI.
- `lib/protocols/deepbook.ts`: `appendSwapSuiToUsdcTwoHop` added; false "whitelisted" comment corrected; old swap → `appendSwapSuiToUsdcDirect` (reference only).
- `lib/deleverage.ts`: rewritten (DeepBook flash → oracle refresh → repay → withdraw → two-hop swap → return flash → sweep). Proven via `scripts/deleverage-dryrun.ts`.
- Scripts: `deepbook-spike.ts`, `deleverage-dryrun.ts`, `wallet-state.ts`. tsc clean.

## 1. Funding + demo position  (OWNER: user-input gated)
- Received **20 USDC** (not SUI). Wallet: 0.797 SUI free, 20.2 USDC free, Navi 1.0 SUI / 0.30 USDC / health 1.89.
- **Decision pending:** (a) user sends ~25–30 SUI → cheap round-trip; or (b) use the 20 USDC → convert USDC→SUI on DeepBook (returns ~$19.4 after round-trip slip+gas). Plan works either way; only sizing differs.
- **Demo-position target** (once funding settles): ~18–20 SUI collateral / ~5–7 USDC debt, health ~1.8–2.0.
  Makes refinance ($5–7 debt to move) AND deleverage (sell ~3–4 SUI ≥ floor, ~0.3% slip) read well.
- **NEW script `scripts/demo-setup.ts`** (run once): [if USDC path] swap ~14 USDC→SUI via DeepBook two-hop (USDC→DEEP→SUI) → deposit SUI collateral + borrow USDC on Navi (reuse open-position.ts legs). dryRun before sign.
- **NEW script `scripts/return-funds.ts`** (end): unwind (repay+withdraw) → [if needed] swap SUI→USDC → transfer to user's address. dryRun before sign. Print final returned amount.
- Acceptance: `wallet-state.ts` shows the target position; all 7 original observables still pass.

## 2. Doc-sync  (OWNER: build — do FIRST, integrity-gated, ~25 min)
- **FEATURE-OBSERVABLES.md** — add: F-008 deleverage executes atomically (one PTB, success on-chain); F-009 DeepBook two-hop routes fee-free (deepRequired 0); F-010 health rises after deleverage; F-011 live DeepBook panel shows real mid/route/depth; F-012 route comparison (two-hop vs direct) shown. Keep F-001..F-007.
- **PRD.md** — append `## Change Record (2026-06-19): DeepBook track + deleverage` (track decision, two-ops-one-engine, tagline, link to DELEVERAGE-SCOPE.md). No body rewrite.
- **ARCHITECTURE.md** — append `## Addendum: deleverage engine + DeepBook routing` (the 6 legs, the corrected whitelist fact, the two-hop route, sizing approach). No body rewrite.
- README rewritten at deploy (§10), not now.

## 3. Engine completion  (OWNER: build) — TASK #5
- **NEW `lib/deleverageQuote.ts`**: `sizeDeleverage(db, { debtAtomic, fraction })` → `{ repayAtomic, collateralAtomic, quotedUsdcOut, suiToSell, slippagePct }`.
  - repayAtomic = floor(debtAtomic × fraction). repayHuman = repayAtomic/1e6.
  - targetUsdc = repayHuman × 1.05 (surplus so the flash return can't underflow).
  - Quote: q1 = `db.getQuantityOut("DEEP_SUI", 0, 1)` then `db.getQuantityOut("DEEP_USDC", q1.baseOut, 0)` → usdcPer1Sui. suiNeeded = targetUsdc / usdcPer1Sui.
  - Apply slippage buffer (×1.02) + **clamp to ≥ MIN_SUI (0.35)** (two-hop floor). collateralAtomic = ceil(suiNeeded × 1e9).
  - Re-quote at suiNeeded to confirm yield ≥ repayHuman; if short, bump once. Return real numbers (no fabrication).
  - Guard: if user has < MIN_SUI collateral or debt below a dust floor → return a typed "position too small" result (UI shows honest message).
- Acceptance: `deleverage-dryrun.ts` updated to use `sizeDeleverage` → dryRun GREEN with collateral sized (not hardcoded 0.5).

## 4. Backend  (OWNER: build) — TASK #6
### POST `/api/deleverage`  (mirror /api/preview, app/api/deleverage/route.ts)
- Body `{ address, debtAtomic, fraction }` (fraction ∈ {0.25,0.5,0.75} or 0<f≤0.9).
- Validate: address regex (reuse), debtAtomic BigInt + u64 ceiling, fraction finite ∈ (0,0.9]. Malformed → 400. RPC/build fail → 503.
- Flow: `sizeDeleverage` → `buildDeleveragePTB` → `simulateRefinance` (rename later to `simulatePTB`) → if ok, build txB64.
- Compute **healthAfter** (deleverage, Navi-side, §7) + before/after debt & collateral USD.
- Response `{ ok, txB64, healthBefore, healthAfter, debtBeforeUsd, debtAfterUsd, collatBeforeUsd, collatAfterUsd, suiSold, usdcRepaid, surplusUsdc, route, feeUsd:0, abortReason }`.
### GET `/api/deepbook`  (app/api/deepbook/route.ts, read-only, force-dynamic)
- Returns: `{ midSuiUsdc, twoHop:{ usdcOut, deepFee:0, slippagePct }, direct:{ usdcOut, deepFee, available }, best:"twoHop", depth:{ bids:[{price,qty}], asks:[...] } }` for a reference size (e.g. 1 SUI).
- Uses `db.midPrice`, `db.getQuantityOut` (both routes), `db.getLevel2TicksFromMid("SUI_USDC", 8)` (parsed bid/ask). Cache 5s.
### Warm (Issue 7)
- On first API hit, fire-and-cache `initSuilend()` + a DeepBook mid read so the first preview isn't a 12s cold-start. (Module-level memoized promise.)
- Acceptance: both endpoints return 200 with live data; malformed inputs → clean 400 (extend stress later).

## 5. Frontend  (OWNER: build) — TASK #7  (app/)
- **page.tsx**: add `mode: 'refinance' | 'deleverage'` state + a segmented toggle ("Move to cheaper rate" | "Reduce my risk"). Keep refinance path exactly as is.
- **NEW `DeleveragePanel.tsx`**: 25/50/75 preset buttons (M2) → POST /api/deleverage → preview card: Debt ↓, Collateral ↓, **Health ↑** (big), surplus, "DeepBook fee $0", route `SUI→DEEP→USDC`. Min-size honest message if too small (M4). Enforced-minOut note ("reverts if price slips past tolerance", M3/M5).
- **NEW `DeepBookPanel.tsx`** (desktop-void filler, S1 proof): polls GET /api/deepbook every 5s — live mid, **route comparison** (two-hop fee-free vs direct needs-DEEP, highlight winner), depth bars (top bids/asks), "0 DEEP fee" badge. Collapses below on mobile.
- **Generalize `RefinanceButton.tsx` → `ActionButton.tsx`** (signs any txB64, label + onDone) used by both ops. Keep TxLink.
- **Reuse `BeforeAfterPanel.tsx`** for deleverage (Debt/Collateral/Health rows; healthAfter now populated).
- **Empty state (Issue 8)**: no position → guided "No loan? View the live demo position" → read-only DEMO view.
- **Progress UX (Issue 7)**: during preview, "Simulating across DeepBook · Navi · Suilend" with 3 marks lighting in sequence.
- **Copy (Issues 2/3)**: hero → atomicity-first (see §6). Tagline "manage your loan in one click — move it or de-risk it."
- Token system FROZEN (DESIGN_SYSTEM.md): Sui-aqua one-hue, pure-glow, DM Serif + IBM Plex Mono. No new hues. Run ui-revamp audit.js → must pass.
- Acceptance: `tsc` 0, `next build` 0, craft audit pass, both flows work against live APIs, zero console errors at 320/768/1024/1440/1920.

## 6. Narrative + integrity fixes  (OWNER: build) — TASK #8
- **Issue 2 (atomicity-first):** hero + PreviewPanel lead with "one atomic transaction · zero upfront capital · reverts if it would ever leave you unhealthy." Demote "save X%" to a supporting line. Kills the "$0.01/yr" look.
- **Issue 3 (the rail):** README + a UI subline: "Navi→Suilend is the proven first route; the mechanism generalizes to any lender pair via SDK composition." Don't claim multi-route in the demo.
- **Issue 4 (APR same-definition):** `lib/position.ts` — Navi APR uses `currentBorrowRate` (raw borrow APR) so it's borrow-cost vs borrow-cost vs Suilend's borrow APR. (~20 min)
- **Issue 6 (fabrication audit):** confirm collateral/debt/health/APR all real-sourced; no hardcoded numbers anywhere in components. (~30 min)
- Acceptance: every on-screen number traces to a live read; APR delta is like-for-like.

## 7. healthAfter computation  (OWNER: build, part of §4)
- **Deleverage (Navi-side, EASY, do this):** from real values — `liqThreshold = health × debtUsd / collatUsd`; after slice: `collatUsd' = collatUsd − soldUsd`, `debtUsd' = debtUsd − repaidUsd`; `health' = collatUsd' × liqThreshold / debtUsd'`. Honest, derived from live reads. This is the hero metric (health rises).
- **Refinance (Suilend-side, HARDER):** best-effort via Suilend SUI reserve open-LTV; if not cleanly available, leave honest "—" (current behavior) and do NOT narrate a post-number. Not a blocker.
- Acceptance: deleverage preview shows a correct, rising healthAfter; refinance either shows a sourced number or honest "—".

## 8. Real on-chain proof tx  (OWNER: build) — M7, after §1 demo position
- Run ONE real deleverage on mainnet (extend deleverage script with an `--execute` guard, dryRun-gated like refine-execute.ts). Capture the digest for README + demo.
- Acceptance: a successful deleverage digest on Suiscan; observables F-008/F-010 proven on-chain.

## 9. Real stress 6/7/8 + screenshots  (OWNER: stress) — TASK #9
- Actually RUN (not infer): Phase 6 localStorage corruption, Phase 7 network throttle/offline, Phase 8 crash-recovery — against both refinance + deleverage flows. Truthful rescore.
- Re-capture hover/focus screenshots correctly (prior set was byte-identical/fake). Add deleverage + DeepBook-panel shots.
- Acceptance: STRESS-TEST-REPORT updated with real evidence; confidence rescored honestly.

## 10. Deploy  (OWNER: deploy) — part of TASK #4
- Vercel: set `SUI_RPC_URL` + `SUI_GRPC_URL` (Alchemy keyed) + `NEXT_PUBLIC_DEMO_ADDRESS` + (server-only) demo key NOT needed in prod (signing is client-side; preview/deleverage build server-side but sender = connected wallet or DEMO read). Confirm no secret leaks.
- Pre-warm /api/preview + /api/deleverage + /api/deepbook after deploy (covers cold gRPC).
- Add **LICENSE (MIT)**. Public GitHub repo. Remove any Claude traces per portfolio standard.
- Acceptance: live URL loads, connect works, both previews return warm ~2.5s, panel live.

## 11. Demo video  (OWNER: demo) — ≤5 min, YouTube
- Arc (S2 — deleverage leads the DeepBook story): hook (loan risk) → **Reduce my risk**: pick 50%, show live DeepBook panel (route + 0 fee + depth), one click, health jumps, one atomic tx on Suiscan → then "same engine also moves your loan cheaper" (refinance, proven digest) → close on "DeepBook-powered atomic position management, zero upfront capital, reverts if unsafe."
- Human script, constant motion, app-matched design (per demo-video memory). Acceptance: ≤5:00, real on-screen txs, no fabricated UI.

## 12. Package / submission  (OWNER: package) — TASK #4
- DeepSurge fields: name (RefiRail), description, logo 1:1 JPG/PNG, public GitHub, YouTube demo, website (Vercel), deployment=mainnet, **Package ID** (we deploy zero net-new Move → use the DeepBook/Suilend/Navi package context; provide the app/repo + the proof digests; if a Package ID field is mandatory, supply the primary on-chain dependency or clarify "no custom Move — composition only" in the description). Submit before **2026-06-22 01:00 UTC**.
- Acceptance: submission accepted; all required fields populated; 100% prize-upfront (already mainnet).

## 13. Sequence (critical path) to 06-22 01:00 UTC
1. Doc-sync (§2) — now.
2. Sizing helper (§3) + re-prove dryRun.
3. Backend (§4) /api/deleverage + /api/deepbook + warm.
4. Frontend (§5) two-action UI + DeepBook panel + healthAfter + empty/progress.
5. Narrative/integrity (§6).
6. [gated on funding] demo-setup → real deleverage proof tx (§1, §8).
7. Real stress 6/7/8 + screenshots (§9).
8. Deploy (§10) → demo video (§11) → package/submit (§12).
9. return-funds.ts after recording (§1).

## 14. Risks / freezes
- FROZEN: lib/refinance.ts legs/amounts + DEV-016 refresh; demo-resilient routes; design tokens.
- Every new PTB (sizing, deleverage with real size, demo-setup, return) dryRun-gated before sign.
- Two-hop floor ~0.35 SUI enforced; min-size honest message. minOut enforced (atomic safety).
- Refinance healthAfter may stay "—" (honest) — acceptable.
- Package ID field ambiguity (zero custom Move) — resolve in submission copy.

## 15. Comprehensive test scheme  (OWNER: build/stress) — supersedes §9
> Goal: prove the WHOLE app from every angle AND build a real, honest on-chain footprint with the
> funded wallet. 5 layers. Integrity: real ops only, truthful counts, never frame test volume as organic.
> **Gas-reserve policy: keep ≥ 5 SUI free at all times** (campaign aborts below it). Est. cost ~$1–2.

### T1 — Unit (lib, free)
- `tests/unit/`: sizing (`deleverageQuote.sizeDeleverage` — repay/collateral/min-floor/slippage), `amounts`, healthAfter formula (§7), route selection (two-hop vs direct). Assert against known values. Extend existing position-apr.test.ts. Run: `tsx` per file (or vitest if added).

### T2 — Backend / API (free, dryRun + HTTP)
- Every PTB dry-runs GREEN: refinance, deleverage @25/50/75, demo-setup, return, swaps.
- API matrix across /api/position, /api/preview, /api/deleverage, /api/deepbook — valid + full malformed set (missing/empty/non-hex/wrong-len address, XSS, SQLi, bad JSON, non-numeric/negative/zero/oversize/u64 atomics, bad fraction, wrong HTTP method) → clean 400/405, no 500s, no reflection. (Absorbs old stress Phases 6 validation.)

### T3 — On-chain campaign (REAL txs, ~$1–2) — `scripts/onchain-campaign.ts`
- **Gas guard:** read free SUI; abort if < RESERVE (5 SUI). Re-check each iteration.
- **Happy-path ops** (each dryRun-gated → executed → digest logged):
  * deleverage @ 25/50/75% (×N) with re-leverage (borrow back) between to reset the position
  * refinance Navi→Suilend, then unwind-from-Suilend + re-open-on-Navi to cycle (×N)
  * DeepBook swaps SUI↔USDC at varied sizes (×N) — real order-book volume
- **Revert-proofs (safety on-chain, reuse revert-proof.ts):** impossible-minOut deleverage REVERTS; below-min-size REJECTED; unhealthy refinance REVERTS. Each captured as a proof.
- **Target ≈ 50 successful ops** (env-dialable `CAMPAIGN_N`). Updates `submission/proof.md`: categorized digests + Suiscan links + summary table (X deleverages / Y refinances / Z swaps / W revert-proofs / total $ routed through DeepBook).
- HONESTY: legitimate operations only; report as "N test operations on mainnet"; DeepBook volume is real but never framed as third-party usage.

### T4 — E2E Playwright (frontend-as-user, free) — `playwright.config.ts` + `e2e/`
- Against `next dev` :3000. Flows: load → position read (demo read-only) → toggle modes → Preview Refinance (hits real /api/preview) → Deleverage @25/50/75 (hits /api/deleverage) → assert Debt↓ / Collateral↓ / **Health↑** + route `SUI→DEEP→USDC` + "$0 fee" badge → DeepBook panel updates (poll) → empty-state guided demo → error-state (API 503 mock) → responsive 390/768/1024/1440/1920 → **zero console errors** assertion → **axe a11y** scan.
- Boundary (honest): wallet-signing not automated (extension) → covered by T3 real scripts. T4 proves the read/preview/UI/panel layer end-to-end.

### T5 — Visual / a11y (free)
- Playwright screenshots at each breakpoint + hover/focus states + axe → `screenshots/`. Replaces the byte-identical faked set (real evidence).

### Acceptance (whole scheme)
- T1 all pass · T2 zero 500s + all PTBs green · T3 ≥ target ops + revert-proofs captured in proof.md + ≥5 SUI reserve intact · T4 all flows pass + 0 console errors + axe clean · T5 real screenshots archived.

## 16. Sequence update (testing interleaved)
- T1/T2 run continuously as each lib/API piece lands (not a separate phase).
- T4/T5 run once the two-action UI is up (§5).
- T3 on-chain campaign runs AFTER the demo position is set (§1) and the engine + API are final — before deploy, so proof.md is populated for the README/demo. Re-runnable as the hackathon progresses (gas-reserve permitting).
- Old §9 (stress 6/7/8 + screenshots) is fully absorbed into T2 (validation), T4 (resilience/error states), T5 (real screenshots).
