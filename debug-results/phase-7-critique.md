# Phase 7 — Senior Critique (demo-visible only)

Scope: a 3-minute live demo. MUST-FIX = anything that crashes, breaks, or causes dead-air during
the demo. Reviewed `app/page.tsx` + the 5 components (PositionCard, PreviewPanel, BeforeAfterPanel,
RefinanceButton, TxLink), providers, layout.

## MUST-FIX — applied (2)

### MF-1: `doPreview` had no `catch` → unhandled promise rejection on a network blip
`page.tsx` wrapped the preview fetch in `try { … } finally { setLoading(false) }` with **no catch**.
A thrown fetch (network drop, server down) became an unhandled rejection and left the UI silently
stuck — `loading` cleared but `preview` never set, so nothing changed on screen. **Fix:** added a
`catch` that sets a synthetic `{ok:false, abortReason:"Could not reach the simulator — try again."}`
so a failed preview shows a clean revert-style message instead of dead air. Also `setPreview(null)`
at the start so a re-preview doesn't briefly show the previous result.

### MF-2: position fetch had no loading/error state → blank page during the live fetch
On mount, `/api/position` runs against live mainnet (observed multi-second latency). Until it
resolved, the page showed only the header + a disabled button — no feedback. The error path was
`.catch(() => {})`, swallowing failures so the page stayed blank **forever** on a fetch error.
**Fix:** added `posLoading` / `posError` state with a "Loading your position…" muted card and a
"Couldn't load your position…" error card. The PositionCard now renders only on success.

Both fixes verified: `tsc` clean, `next build` exit 0, page renders HTTP 200 with content.

## Already-clean (no fix needed)
- **Preview revert surfacing**: `/api/preview` returning `ok:false` + `abortReason` is rendered by
  `PreviewPanel` as "Would revert: … Your position stays safe." — clean, on-brand, no break. This is
  the demo wallet's actual current state (Navi abort 1602, position already on Suilend). Confirmed
  end-to-end against the live route.
- **RefinanceButton**: already has its own try/catch + `err` state + `isPending` disabled/spinner.
- **PositionCard empty state**: already renders `p.note` muted card when `!hasPosition` (TASTE U7).
- **Providers/layout**: `"use client"` correct on providers; no `Date.now()`/`Math.random()` in
  render, no hydration-mismatch risk; `WalletProvider autoConnect` is fine.

## SHOULD-FIX — listed, not applied
- **SF-1**: `PreviewPanel` lists raw `balanceChanges` as `<code>{symbol}</code>: {atomic-amount}`.
  The amounts are unformatted signed atomic strings (e.g. `-301000`). Functional, but a judge sees
  raw atomic integers rather than human USDC/SUI. Formatting to human units would read better.
- **SF-2**: `BeforeAfterPanel` `afterHealth` comes from `preview.healthAfter`, which the
  `/api/preview` route never populates (always `undefined` → renders "—"). Either compute it server-side
  or drop the After-health cell to avoid a permanent em-dash next to a populated Before-health.
- **SF-3**: `doPreview` recomputes `debtAtomic` from `pos.debt.amountHuman * 1e6` (float → round).
  Fine for display, but the scripts read live debt just-in-time atomically; the UI path could drift a
  few atomic units from true debt on a borderline position. Low risk given the 30bps flash buffer.

## NOTE — listed, not fixed
- **N-1**: The live demo wallet currently has **no Navi position** (it moved to Suilend via the real
  refinance, digest BiMBPK7…). So out of the box the UI shows the empty-state card and the Preview
  button is disabled. This is the honest truth, not a bug — but the demo NARRATIVE needs a funded
  Navi position. The demo operator must run `scripts/seed-demo.ts` (or use a wallet with a live Navi
  SUI/USDC borrow) before recording. Pure demo-script concern, no code change.
- **N-2**: Wrong-HTTP-method requests (e.g. GET /api/preview) return Next's default 405 with an empty
  body. Acceptable for a hackathon demo.
