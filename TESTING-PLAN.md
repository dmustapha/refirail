# Testing Plan — RefiRail (livetest V2)
**Target:** https://refirail.vercel.app (Sui mainnet, Web Mode / full-stack)
**Source files read:** lib/{deleverageQuote,deleverageEconomics,position,deepbookView,refinance,simulate}.ts + app/api/**/route.ts + app/page.tsx + components
**Tests:** V1=10 domains | V2 exact-value cases=6 | Total channels=2 (Browser UI + REST)

## 0A. Interface Inventory
| Channel | Endpoint | Auth | Priority |
|---------|----------|------|----------|
| Browser UI | https://refirail.vercel.app | none (read) / wallet (sign) | high |
| REST GET | /api/position?address= | none | high |
| REST POST | /api/preview | none | high |
| REST POST | /api/deleverage | none | high |
| REST GET | /api/deepbook | none | high |

## 0B. Service Map
| Service | Method | Logic Type | Notes |
|---------|--------|-----------|-------|
| position | getPositionView | stateful (live read) | Navi collateral/debt + Navi/Suilend APR; hasPosition needs supply+borrow |
| deleverageQuote | sizeDeleverage | formulaic | repay=floor(debt×f); suiToSell=(repay×1.05/usdcPerSui)×1.02, clamp≥0.35 |
| deleverageEconomics | computeDeleverageEconomics | formulaic | liqThr=health×debt/collat; health'=collat'×liqThr/debt' |
| deepbookView | getDeepBookView / pickBestRoute | conditional | best=twoHop unless fee-free direct yields more |
| refinance | buildRefinancePTB | stateful | FROZEN; 6-leg PTB; proven on-chain |

## 0C. V2 Precision cases (expected from SOURCE math, not observation)
- **TC-V2-DLV-01** /api/deleverage f=0.5 on live position (collat ~6.5 SUI/$X, debt ~2 USDC, health ~1.85).
  Derivation: repay=0.5×debt; liqThr=health×debt/collat; collat'=collat−(suiToSell×price); debt'=debt−repay; health'=collat'×liqThr/debt'. **Expected: ok:true, healthAfter > healthBefore, route="SUI → DEEP → USDC", feeUsd=0.**
- **TC-V2-DLV-02..03** f=0.25 and f=0.75 → ok:true, healthAfter>healthBefore each (monotonic: bigger paydown ⇒ bigger health rise). Expected health(0.75) > health(0.5) > health(0.25).
- **TC-V2-PRV-01** /api/preview valid → ok:true, txB64 length>4000 (built+dry-run-passed bytes).
- **TC-V2-DBK-01** /api/deepbook → midSuiUsdc>0, twoHop.deepFee=0, best="twoHop", depth has bids+asks.
- **TC-V2-POS-01** /api/position?address=DEMO → hasPosition:true, collateral.type=SUI, debt.type=USDC, naviAprPct>0, suilendAprPct>0, aprDeltaPct=navi−suilend.

## 0D. Critical Review Findings
| # | Test ID | Issue | Action Taken |
|---|---------|-------|-------------|
| 1 | TC-V2-DLV-* | healthAfter formula re-derived from deleverageEconomics.ts:30-36 — matches on-chain proof tx (1.89→2.92) within 0.05 | verified, no change |
| 2 | sign flow | live signing is wallet-extension (not automatable) | CODE-REVIEW-ONLY → covered by on-chain proof digests 4S5bhsgZ (deleverage) + BiMBPK7 (refinance) |
| 3 | DESIGN CONSTRAINT | Navi indexer can transiently return [] → honest empty state, not a crash | covered by resilience 6.2/8.2 (already PASS); expected behavior |

Runability: 6 LIVE (APIs + browser), 1 CODE-REVIEW-ONLY (on-chain signing), design constraint documented.
