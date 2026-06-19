# RefiRail → DeepBook-core widening + fix list — full scope

> Decision (locked 2026-06-19): **DeepBook track, Option 1 ("two ops, one engine").** Spike GREEN
> (fee-free SUI→DEEP→USDC two-hop, composes atomically alongside the flash loan). The proven
> refinance PTB (digest `BiMBPK7…`) is NOT touched. Deleverage becomes the DeepBook-powered sibling.
> Deadline 2026-06-22 01:00 UTC.

## 0. The honest reason for the trade
Pure refinance needs NO swap (same SUI collateral, same USDC debt — only the lender changes).
A trade is only genuine where the **asset itself must change**. That operation is **deleverage**:
to pay down USDC debt using SUI collateral, you MUST convert SUI→USDC. The DeepBook trade is the
only mechanism — not a bolt-on. So the story widens minimally: "move your loan" → "manage your
loan in one click (move it, or de-risk it)." Refinance = DeepBook as lender. Deleverage = DeepBook
as lender **and** execution venue (the order book does real work).

## 1. What the product becomes
One screen, one position read, two one-click atomic operations sharing one engine:
- **Refinance** (HERO, unchanged, proven on-chain): move Navi→Suilend for a cheaper rate. DeepBook flash loan.
- **Deleverage** (NEW, mostly-existing code, fixed): pay down X% of debt by selling a slice of
  collateral through DeepBook, atomically, reverts if it would leave you unhealthy. DeepBook flash + order-book swap.
- **Live DeepBook panel** (NEW): real mid-price, the SUI→DEEP→USDC route, order-book depth, "0 DEEP fee"
  badge. Fills the desktop void AND proves DeepBook is central, not a name-drop.

Same soul throughout: one transaction, zero upfront capital, all-or-nothing, real on-chain data.

## 2. How deleverage works — the user's journey
1. Connect wallet (or view the live demo position read-only).
2. See position: e.g. "1.0 SUI deposited · 0.30 USDC borrowed · health 1.98."
3. Choose **Reduce my risk** → pick how much debt to pay down: **25% / 50% / 75%** presets (+ optional slider).
4. Preview (live dryRun): "Sell ~X SUI on DeepBook → repay Y USDC. Debt 0.30→0.15 · Health 1.98→3.2 (safer) ·
   DeepBook fee $0 · route SUI→DEEP→USDC." Reverts-if-unhealthy guarantee shown.
5. One click → one transaction → done. Success card + Suiscan link.

### Under the hood (one atomic PTB)
DeepBook flash-borrow USDC (fee-free) → Navi oracle refresh (DEV-016) → repay Navi debt slice →
withdraw SUI slice → **DeepBook two-hop swap SUI→DEEP→USDC (fee-free, spike-proven)** → return
DeepBook flash exactly → sweep dust to user. Net: debt ↓, collateral ↓, **health ↑**, no cash in.

### Why the trade is unavoidable (and why DeepBook is central)
The backend literally cannot size the transaction without DeepBook's live price: it quotes
`getQuantityOut` to compute how much SUI to sell to yield the needed USDC. No DeepBook quote → no tx.

## 3. The "can users set %?" decision
- **Deleverage: YES — user sets the %.** The PTB already accepts arbitrary debt/collateral slices.
  Flow: user picks X% → `repayAtomic = debt × X%` → backend quotes DeepBook → sizes `collateralAtomic`
  (SUI to sell) = needed USDC ÷ live route price × (1 + slippage buffer). Honest sizing from real data.
  Presets 25/50/75 for demo robustness; 100% = "close position" (out of scope; that's unwind).
- **Refinance: NO — stays all-or-nothing.** Partial refinance means editing the PROVEN PTB =
  re-risking the on-chain core. Keep refinance frozen; put the % control only on deleverage (new code).

## 4. What we build, by layer

### On-chain logic (lib/) — the engine
- **NEW** `appendSwapSuiToUsdcTwoHop` in `lib/protocols/deepbook.ts`: SUI→DEEP→USDC via DEEP_SUI +
  DEEP_USDC (whitelisted, fee-free). Returns USDC + sweeps DEEP/SUI remainders. Spike-proven shape.
- **FIX** the false `DEV-018` comment + `appendSwapSuiToUsdc` (claims SUI_USDC is whitelisted/fee-free —
  the spike proves it is NOT). Either repoint it to the two-hop or delete it; correct the comment.
- **REWRITE** `lib/deleverage.ts` to: (a) use DeepBook flash (not Navi flash) for max DeepBook
  centrality + fee-free, (b) add the DEV-016 Navi oracle refresh before withdraw, (c) use the two-hop swap.
- **NEW** `lib/deleverageQuote.ts` (or extend amounts.ts): size `collateralAtomic` from a live DeepBook quote.
- **VERIFY**: dryRun the full deleverage PTB on mainnet before any live claim (non-negotiable). Then ONE
  real on-chain deleverage tx to prove it (like the refinance digest) — costs a little real SUI.

### Backend (app/api/) — the simulator
- **NEW** `POST /api/deleverage`: mirror `/api/preview` — validate (reuse the 400/u64 guards),
  build deleverage PTB, dryRun, return `{ ok, txB64, balanceChanges, healthAfter, abortReason }`.
- **NEW** `GET /api/deepbook` (read-only): live `midPrice`, the two-hop route + per-size `getQuantityOut`,
  depth (`getLevel2TicksFromMid`), `deepRequired` (proves 0 fee). Feeds the live panel.
- **WARM**: pre-warm the Suilend gRPC client + a DeepBook read on server boot (Issue 7).

### Frontend (app/) — the screen
- **Mode toggle / two actions**: "Move to cheaper rate" (refinance) | "Reduce my risk" (deleverage).
- **NEW** `DeleveragePanel`: % presets (25/50/75) + optional slider; preview wired to `/api/deleverage`.
- **NEW** `DeepBookPanel`: live mid, route SUI→DEEP→USDC, depth bars, "0 DEEP fee" badge (desktop-void filler).
- **Reuse** BeforeAfterPanel for deleverage: Debt ↓, Collateral ↓, **Health ↑** (the headline metric).
- Honest empty state + guided demo mode (Issue 8). Progress UX during the ~12s cold dryRun (Issue 7).

## 5. The flagged fixes (§5) — folded in
| # | Fix | Where | Effort |
|---|-----|-------|--------|
| 2 | Reframe hero to **atomicity = risk elimination**; demote "save X%" (kills the "$0.01/yr" look) | copy / hero / DESIGN | strategy |
| 3 | Frame "the Navi→Suilend rail" = proven first route, mechanism generalizes (don't claim multi-route) | copy / README | strategy |
| 4 | APR same-definition: Navi → `currentBorrowRate` (raw borrow APR) so it's borrow-cost vs borrow-cost | `lib/position.ts` | ~20m |
| 5 | Compute + show `healthAfter` from the dryRun result (central to deleverage's "safer" claim) | preview/deleverage + BeforeAfterPanel | 1–2h |
| 6 | Fabrication audit: confirm collateral/debt/health all real-sourced (DEV-011 near-miss) | `lib/position.ts` | ~30m |
| 7 | Latency: server-warm gRPC on boot + 3-logo "Simulating across DeepBook·Navi·Suilend" progress | backend + frontend | partial |
| 8 | Guided empty state: "No position? View the live demo position" read-only | frontend | small |
| void | Desktop 540px void → the live DeepBook panel fills it (depth + proof in one) | frontend | (part of §4) |
| exec | Actually RUN stress Phases 6/7/8 (localStorage corruption, throttle/offline, crash-recovery) | stress | medium |
| exec | Re-capture hover/focus screenshots (prior ones were byte-identical = fake evidence) | screenshots | small |

## 6. Demo-position note
Demo debt is tiny (0.30 USDC), so absolute $ amounts read small. Two-hop slippage is also higher at
dust size (6.5% at 0.3 SUI vs 0.25% at 3 SUI). Mitigations: (a) lead with **% / health**, which read
great at any size; (b) optionally open a slightly larger demo position (wallet ~1.94 SUI) so amounts +
slippage read better. Keep all numbers REAL — never fabricate (INVARIANT 3 / TASTE U7).

## 7. What stays untouched (non-negotiables)
- `lib/refinance.ts` legs/amounts + DEV-016 oracle refresh — FROZEN. Refinance demo path unchanged.
- Integrity: real on-chain data, honest empty/"—" states, no fabricated numbers.
- The 4 critique elevations (E-1 fee-$0, E-2/E-4 README, E-3 $/yr) stay honest.
- Verify EVERY PTB change with dryRun before live; never stage .env.local; commit progressively; append PULSE.

## 8. Rough sequence (to 06-22 01:00 UTC)
1. Engine: two-hop swap helper + fix false comment → rewrite deleverage.ts → quote sizing. dryRun green.
2. One real on-chain deleverage proof tx (digest for the README/demo).
3. Backend: /api/deleverage + /api/deepbook + warm.
4. Frontend: mode toggle + DeleveragePanel + DeepBookPanel + healthAfter + empty state + progress.
5. Narrative fixes (2,3,4,6) + integrity audit.
6. Real stress 6/7/8 + screenshot re-capture.
7. Deploy (Vercel + SUI_RPC_URL + pre-warm) → demo video (≤5min YouTube) → LICENSE + logo + Package ID → DeepSurge submit.
