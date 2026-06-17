# Build Report — RefiRail
Generated: 2026-06-17
Builder: hackathon-build skill (in-session orchestrator; pipeline run in order, critique + url_preverify completed first)

## Summary
| Phase | Steps | Status | Notes |
|-------|-------|--------|-------|
| 0 Scaffold & Setup | 0.1–0.4 | complete (3230fa3) | manual scaffold; sui pinned to v2 for suilend peer; wallet funded ~1.94 SUI |
| 1 Day-1 Gate | 1.1–1.9 | **complete — GATE GREEN (a40f4ab + gate)** | Suilend init live; isolated leg GREEN; real Navi position opened (BWSP7...); **full refinance dryRun GREEN → HEADLINE, not floor**. 1.10 seed pending. |
| 3 Frontend+API (ahead) | 3.1–3.5,3.7 | complete (54a1ce5) | built ahead of funds; tsc clean; /api/position reads real position; deploy 3.6 deferred to pipeline deploy phase |
| 2 Real refinance + proof | 2.1–2.2 | **2.2 SUCCESS — F-001 PROVEN ON-CHAIN** | real refinance digest BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK; DeepBook+Navi+Suilend in ONE tx; Navi cleared→Suilend. 2.3/2.4/2.5 next. |

### 🔗 F-001 ON-CHAIN PROOF (Task 2.2)
Digest `BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK` (status success) — verified independently via sui_getTransactionBlock. ONE atomic tx, 15 MoveCalls across 3 protocols: DeepBook `borrow_flashloan_quote`/`return_flashloan_quote`; Navi `entry_repay`/`withdraw_v2`/`oracle update_single_price_v2`; Suilend `create_obligation`/`deposit`/`refresh_reserve_price`/`borrow_request`/`fulfill_liquidity_request`. SUI net −0.038 (gas), USDC net +0.0009. submission/proof.md written. Position now on Suilend; Navi debt = 0.
**First real tx (HCudT2PcTJmLxrLYtatEmD8tW4SdPsQeNoQevXLHoHiG) REVERTED** (Navi withdraw_v2 abort 1502 — oracle-staleness race, ~0.011 SUI gas) → root-caused (DEV-016) not blind-retried → 2nd tx success.

### 🎯 DAY-1 GATE RESULT (Task 1.9): GREEN
Full cross-protocol atomic refinance dry-runs green on live mainnet. SUI net = −gas only (collateral atomically Navi→Suilend), USDC net = +0.0009 (buffer remainder swept). ObligationOwnerCap threads + transfers (RISK 4 sound). **Decision: build the headline. FLOOR (Phase 2F) not needed.**

## Deviations from Architecture
| ID | Component | ARCHITECTURE Said | ACTUAL | Reason | Class | Downstream Impact |
|----|-----------|-------------------|--------|--------|-------|-------------------|
| DEV-001 | scaffold method | scaffold via create-next-app | wrote package.json/tsconfig/next.config/.gitignore/.env.example manually, then npm install in place | create-next-app refuses to overlay a dir holding planning .md docs | COSMETIC | none — identical config; app/ from ARCHITECTURE §13 later |
| DEV-002 | package.json @mysten/sui pin | `^1.30.0` | `^2.18.0` (resolved 2.18.0) | @suilend/sdk@3.0.4 (load-bearing) peers on sui v2; deepbook-v3@1.5.0 peers `^2.18.0`; `^1.30.0` ERESOLVE-fails | DEGRADED | **Task 1.1 SuiGrpcClient ctor tree must run vs sui 2.18.0**; dapp-kit resolved 0.16.16 (sui-v1 era) → Phase 3 may need dapp-kit 1.x bump |
| DEV-003 | npm install peer resolution | clean install | required `--legacy-peer-deps` | suilend 3.0.4 pins EXACT peers (sui 2.17.0, pyth 2.2.0); installed coherent latest (sui 2.18.0, pyth 3.0.0) | DEGRADED | if Phase 1 suilend init / Phase 2 Pyth throws type/runtime mismatch → downpin sui@2.17.0 and/or pyth@2.2.0; lockfile committed |
| DEV-004 | Task 0.3 Navi assetId verify | confirm USDC=assetId 10 via /api/navi/config | endpoint LIVE 200 but exposes only protocol object ids, not the assetId→coin table | that endpoint's shape lacks the mapping; assetId=10 is spike-provenanced, resolved live by SDK | COSMETIC | assetId=10 not yet observed live; **Phase 1 navi.ts position read is the first real exercise** — fix NAVI.USDC_ASSET_ID there if SDK maps differently |
| DEV-005 | @mysten/sui v2 API restructure (clients.ts + 3 importers) | ARCH used `SuiClient` from `@mysten/sui/client` | v2.18.0 renamed `SuiClient→SuiJsonRpcClient` (subpath `@mysten/sui/jsonRpc`); gRPC+JSON-RPC ctors need `network`; clients.ts re-exports a `SuiClient` type alias threaded into deepbook/refinance/simulate | sui pinned to v2 (DEV-002) for suilend peer | DEGRADED (adapted) | real v2 clients fully typed; orchestrator-verified gRPC ctor + suilend init both live-OK |
| DEV-006 | navi.ts PTB-helper call boundaries | direct typed `tx` passing | added 7 `tx as never` (+coin/receipt) casts | @naviprotocol/lending@1.4.6 bundles nested @mysten/sui@1.45.2 — its `Transaction` is a nominally-distinct private brand vs root 2.18.0 | COSMETIC (type-only; runtime PTB object identical) | **known risk for debug: 7 cast sites bypass TS checking — funded dryRun is the real proof** |
| DEV-007 | dependency tree (@suilend/sui-fe) | implied present | installed `@suilend/sui-fe@^3.0.7` (--legacy-peer-deps) | @suilend/sdk@3.0.4 client.js requires it; absent from Phase 0 install | DEGRADED (install fix, real dep) | funded dryRun scripts rely on it; lockfile committed |
| DEV-008 | app/providers.tsx (dapp-kit) | dapp-kit 0.16.16 + `getFullnodeUrl` from `@mysten/sui/client` | bumped @mysten/dapp-kit 0.16.16→**1.1.1** + @tanstack/react-query 5.101; `getJsonRpcFullnodeUrl` from `@mysten/sui/jsonRpc`; createNetworkConfig needs `{network,url}` | dapp-kit 0.16.16 (sui-v1 era) rejected v2 `Transaction` in useSignAndExecuteTransaction; 1.x matches sui v2 | DEGRADED→fixed | resolves the DEV-002 dapp-kit skew; tsc clean; signing path still untested w/o funds |
| DEV-009 | next.config.mjs (@suilend/sdk) | `serverExternalPackages` | moved `@suilend/sdk` → `transpilePackages` | sdk ships ESM with bare directory specifiers; native Node ESM 500'd on the directory import; webpack resolves it | DEGRADED→fixed | other 2 SDKs stay externalized |
| DEV-010 | lib/position.ts APR accessors | `/api/navi/config` borrowRate; suilend `borrowAprPercent` | Navi `/api/navi/pools[id=10].borrowIncentiveApyInfo.vaultApr`=8.76%; Suilend interpolates on-chain rate-curve `config.element.{interestRateUtils,interestRateAprs}` at live util=6.52% | documented field paths don't exist; PLAN Task 3.1 tree authorized the fix | UNVERIFIED→VERIFIED | both APRs now real numbers |
| DEV-011 | lib/position.ts on-chain read (INTEGRITY) | env DEMO_COLLATERAL_SUI/DEMO_DEBT_USDC fallback (3/1) + hardcoded SUI price 0.74 + hasPosition:true always | real `getLendingPositions(address)` read of SUI supply + USDC borrow legs (real amount + valueUSD); empty → hasPosition:false; real `getHealthFactor` | orchestrator caught fabricated 3/1 position on unfunded wallet — violated Thesis INVARIANT 3 / TASTE U7 (no mocked lending) | DEGRADED→fixed | honest empty state verified (0 positions → hasPosition:false); validated against real opened position (1.0 SUI/0.3009 USDC) |
| DEV-012/013 | scripts (Suilend leg dryRun) | borrowHuman arg; dotenv default | borrowAtomic via usdcAtomic; `config({path:'.env.local'})` | adapter takes atomic; .env.local not .env | COSMETIC | none |
| DEV-014 | open-position gas source | classic owned Coin<SUI> for splitCoins(tx.gas) | v2 draws gas + split source from address-balance accumulator (wallet has 0 discrete Coin<SUI>) | Sui v2 address-balance model; dryRun-proven before spend | DEGRADED→adapted | none — proven on the real open tx |
| DEV-015 | refine-dryrun amounts | §14 hardcoded usdcAtomic(1)/suiAtomic(3) | JIT live Navi debt read + real 1.0 SUI collateral + 3x gRPC retry | REAL-ONLY + accruing debt; sketch amounts don't match real position | COSMETIC (script input only) | none |
| DEV-016 | lib/refinance.ts + navi.ts (oracle) | repay/withdraw without explicit Navi oracle refresh | added `appendNaviOracleRefresh` (updateOraclePriceBeforeUserOperationPTB SUI+USDC) as step 1b before Navi repay/withdraw | Navi `withdraw_v2` reverted live (abort 1502 calculate_value oracle-staleness race) despite green dryRun; 2/3 repeat dryRuns also failed | UNTESTED→FIXED | **PTB now 18-cmd; live-proven (real tx success); /api/preview + refine-dryrun now build this more-robust PTB** |
| DEV-017 | scripts/revert-proof.ts (Task 2.3) | §10 sketch returns `ok:false` via `simulateRefinance` for an aborting PTB | catch the build-time `SimulationError` and surface the SAME structured `ok:false` + `abortReason` + empty `balanceChanges` | the @mysten/sui core resolver EAGERLY dry-runs the PTB during `tx.build()` (gas-budget step), so an aborting PTB throws from inside `simulateRefinance`'s build step BEFORE the explicit `dryRunTransactionBlock` runs | COSMETIC (revert-proof script only; lib/simulate.ts unchanged) | INVARIANT 2 / F-003 still proven: unhealthy borrow (0.5 SUI collateral / 10 USDC borrow) → Suilend `obligation::borrow` MoveAbort code 1 → whole PTB reverts, `balanceChanges:[]` (zero moved) |

## Failed Attempts & Resolutions
| Step | Error | Attempts | Resolution |
|------|-------|----------|------------|
| 0.1 | npm install ERESOLVE (sui ^1.30 vs suilend v2 peer) | 1 | moved sui→^2.18.0 (DEV-002) + `--legacy-peer-deps` (DEV-003) |

## Verification Results
| Phase | Command | Expected | Actual | Pass? |
|-------|---------|----------|--------|-------|
| 0 | npm install | added NNN packages | added 296 packages, audited 297 (8 vulns) | ✅ |
| 0 | @suilend/sdk version | 3.0.4 | 3.0.4 (exact) | ✅ |
| 0 | deepbook constants PACKAGE_ID vs config.ts | 0x0e735f8c…f748 | matched (file moved cjs→mjs in 1.5.0; ids unchanged) | ✅ |
| 0 | npx tsc --noEmit (orchestrator re-run) | no errors | exit 0 | ✅ |
| 0 | native USDC binding | dba3…::usdc::USDC active; wormhole labeled DO_NOT_USE | confirmed; NAVI.USDC_ASSET_ID=10 | ✅ |
| 0 | compliance: key handling | .env.local ignored, key not tracked, addr valid | all 4 PASS | ✅ |
| 1 | npx tsc --noEmit (orchestrator re-run, all lib/) | exit 0 | TSC_EXIT=0 | ✅ |
| 1 | SuiGrpcClient ctor (RISK 2) | constructs | `{network,baseUrl}` → grpc ok true | ✅ |
| 1 | suilend init smoke (RISK 1 — #1 unknown) | init ok true | SUILEND_INIT_OK true (orchestrator probe-file re-run) | ✅ |
| 1 | navi helper names (RISK 8) | all 6 present | 6/6 | ✅ |
| 1 | DOMAIN-GUIDE invariants | 5 invariants + addRefreshCalls=false | present (27 keyword hits) | ✅ |

## Known Risks (for debug)
- DeepBook v3 SDK floated to 1.5.0 (url_preverify); Task 0.2 confirmed installed constants PACKAGE_ID still matches config.ts (RESOLVED — ids unchanged, only file path moved cjs→mjs).
- @mysten/sui resolved to 2.18.0; SuiGrpcClient ctor confirmed live with `{network,baseUrl}` (RESOLVED).
- **DEV-006: navi.ts has 7 `tx as never` casts** (cross-version Transaction brand: navi bundles sui@1.45.2 vs root 2.18.0). Type-safe-bypassed call sites — the funded dryRun (Task 1.9) is the real proof these PTB legs thread correctly. Highest-priority debug watch.
- DEV-007/003 peer mismatch: suilend wants sui@2.17.0/pyth@2.2.0, installed 2.18.0/3.0.0. If funded dryRun throws a Pyth/refresh type/runtime mismatch → downpin. Lockfile committed for reproducibility.
- Suilend init proven live pre-funding; the remaining #1 unknown is the in-PTB Pyth refresh + borrow guard on a FRESH same-PTB obligation (Task 1.3 isolated dryRun) — needs funds.
- Minor: inline `tsx -e` dynamic-import smoke tests are flaky for namespace exports; use a probe file (orchestrator did).
- **HIGH (demo reliability): Suilend gRPC init intermittently throws** `RpcError: fetch failed` / `Cannot read properties of undefined (reading 'package')` (Pyth getPackageId). The dryRun SCRIPT has a 3x retry wrapper, but **`lib/refinance.ts`/`/api/preview` do NOT** — the live demo preview can fail intermittently. **Wire/polish action: move the retry wrapper into the shared lib path (initSuilend / buildRefinancePTB) so `/api/preview` is resilient.**
- **DEMO SEQUENCING + BUDGET: Task 2.2 real execute MOVES the position Navi→Suilend, consuming the demo "before" state.** After execute, ~0.86 SUI free + 1 SUI locked in Suilend. The Phase 4 demo needs a Navi position to show the live move → either top up ~1 SUI, or withdraw the Suilend collateral and re-open on Navi (seed-demo). Flagged for demo phase.

## Contract Addresses
(N/A — zero net-new Move; no contracts deployed)

## Environment Variables Added
| Key | Source Step | Value/Description |
|-----|-----------|-------------------|
| DEMO_PRIVATE_KEY | 0.4 | suiprivkey1… in .env.local (gitignored, never logged) |
| NEXT_PUBLIC_DEMO_ADDRESS | 0.4 | 0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3 — **NOT YET FUNDED** (awaiting ~$5 native SUI) |
