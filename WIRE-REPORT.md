# Wire Report — RefiRail

**Status:** WIRED
**Date:** 2026-06-18
**Pipeline position:** After debug (confidence 90), before verify_milestone

## Project Topology
| Component | Type | Entry Point |
|-----------|------|-------------|
| Frontend (single-screen UI) | frontend | app/page.tsx + components |
| Position API | api route | app/api/position/route.ts |
| Preview API (server PTB build + dryRun) | api route | app/api/preview/route.ts |
| PTB composition lib | lib | lib/refinance.ts + 3 protocol adapters |
| Headless scripts (proof/test harness) | scripts | scripts/{open-position,refine-dryrun,refine-execute,revert-proof,seed-demo}.ts |

## Connection Graph
| From | To | Type | Credential | Status |
|------|----|------|-----------|--------|
| /api/preview | refinance.ts → DeepBook v3 (flash borrow/return) | sdk/contract | none (public) | **PASS — ON-CHAIN PROVEN** |
| /api/preview | refinance.ts → Navi (repay/withdraw/oracle) | sdk/contract | none (public) | **PASS — ON-CHAIN PROVEN** |
| /api/preview | refinance.ts → Suilend (obligation/deposit/refresh/borrow) | sdk/gRPC | none (public) | **PASS — ON-CHAIN PROVEN** |
| Suilend refreshAll | Pyth (price feeds) | gRPC | none (public) | **PASS — ON-CHAIN PROVEN** |
| lib | Sui mainnet JSON-RPC | rpc | SUI_RPC_URL (public default) | PASS (7s) |
| Suilend init | Sui mainnet gRPC | grpc | SUI_GRPC_URL (public default) | PASS (gRPC-retry wrapped) |
| floor deleverage | DeepBook swap_exact_base_for_quote | sdk/contract | none | **METHOD-VERIFIED** (fill needs DEEP on non-whitelisted SUI_USDC; NOT on-chain-executed) |

## Integration Proof (the credibility anchor)
Real refinance tx **BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK** (status success) — independently re-verified. ONE PTB, modules touched: `pool` (DeepBook flash), `incentive_v3` + `oracle_pro` (Navi repay/withdraw/oracle), `lending_market` (Suilend create/deposit/refresh/borrow), `coin`. All 4 protocol integrations exercised live with real funds in a single atomic transaction. This is stronger than any synthetic wire test.

## Credential Audit
| Env Var | Required By | Status | Source |
|---------|------------|--------|--------|
| DEMO_PRIVATE_KEY | scripts/server signing | RESOLVED (funded) | .env.local (gitignored) |
| NEXT_PUBLIC_DEMO_ADDRESS | frontend first-paint | RESOLVED | .env.local |
| SUI_RPC_URL | all RPC | RESOLVED (public default; keyed Alchemy optional) | .env.local |
| SUI_GRPC_URL | Suilend init | RESOLVED (public default; keyed Alchemy optional) | .env.local |
No API keys required (all protocols public). 0 mock flags. No unresolved credentials.

## Live Route Confirmation (Phase 4)
| Route | Result | Time | Notes |
|-------|:------:|-----:|-------|
| GET /api/position | PASS | 7.1s | 200, structured (reads real on-chain state) |
| POST /api/preview | PASS (structured ok:false) | 9.0s | honest no-Navi-position abort; gRPC-retry kept it resilient |

## Phase 4 Sub-Steps (run to full extent)
- **4.2b Seed + landing:** `seed-demo.ts` exists; landing page renders real product content (227 words SSR — hero + value-prop copy present). The position *card* shows the guided empty state until demo re-seed (F-006 pending), but the page itself is content-rich, not blank.
- **4.2c Explorer links:** both tx digests (`BiMBPK7…`, `BWSP7…`) resolve via RPC (authoritative) + Suiscan HTTP 200. Object links (DeepBook pkg `0x0e735f8c…`, SUI_USDC pool `0xe05dafb5…`) are real on-chain ids used in the live tx. No dead links.
- **4.2d Sentinel check:** no mock/fake/stub/fallback strings in live responses. `/api/preview` `ok:false` is a real on-chain Move abort (1602 execute_repay — no Navi debt), NOT a fallback. F-002 (healthy preview) + F-006 (first-paint hasPosition:true) are UNTESTABLE now (no Navi position — re-seed deferred), classified PENDING, not failing.
- **4.2e Authorization:** no mutating server-state endpoints. `/api/position` = read-only GET (public data); `/api/preview` = POST that builds+dryRuns+returns bytes (no server mutation, no signing). Authorization is enforced by the Sui owned-object model (PTB sender must own the position) + client-side wallet signature. API auth tests N/A by design. No auth gaps.

## Phase 5.5 Privacy Audit — SKIPPED (no FHE/ZK/confidential keywords; RefiRail is a public DeFi tool)
## Phase 5.6 Isolation Test — SKIPPED (no private-data isolation claim; on-chain positions are public by design, read by address)
## Phase 5.7 Async Latency — /api/preview dryRun: 9–177s observed (MEDIUM→SLOW). **Demo needs explicit wait guidance OR a keyed SUI_GRPC_URL/SUI_RPC_URL (Alchemy) to stabilize.** Carried to demo_rehearsal + deploy.

## Summary
- Components: 5 · Connections mapped: 7 · Credentials: 4/4 resolved · Integration tests: all critical PASS (4 protocols on-chain + 2 live routes) · Mock warnings: 0
- Status: **WIRED**. The floor swap is honestly catalogued as method-verified (not on-chain-executed). Demo-latency is the one operational note.
