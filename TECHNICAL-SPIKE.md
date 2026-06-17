# RefiRail — Technical Spike Results
**Date:** 2026-06-17 | **Method:** 3 parallel research agents reading published npm tarballs (`@suilend/sdk@3.0.4`, `@mysten/deepbook-v3`, `@naviprotocol/lending@1.4.6`), on-chain Move source, Circle/Pyth/Navi official endpoints. Every constant below is the literal value to copy into code, or an explicit "resolve at runtime" instruction where hardcoding is unsafe.

> Tagging: `[VERIFIED]` = source URL + code/constant confirmed. `[UNVERIFIED]` = found but not runtime-tested. `[ASSUMED]` = no static source; resolve at runtime or re-confirm Day 1.

---

## 1. Verified Patterns (copy into ARCHITECTURE.md)

### Suilend — `@suilend/sdk@3.0.4`
Source of truth: `npm pack @suilend/sdk@3.0.4` → `package/client.d.ts` / `client.js`; coin types from `@suilend/sui-fe@3.0.7`. (Public GitHub repos are now 404/private — npm tarball is authoritative.)

| Item | Value | Tag |
|---|---|---|
| `LENDING_MARKET_ID` (Main Pool) | `0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1` | [VERIFIED] client.js:46 |
| `LENDING_MARKET_TYPE` | `0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL` | [VERIFIED] client.js:47 |
| `LENDING_MARKET_REGISTRY_ID` | `0x64faff8d91a56c4f55debbb44767b009ee744a70bc2cc8e3bbd2718c92f85931` | [VERIFIED] client.js:40 |
| Suilend UpgradeCap (→ pkg id) | `0x3d4ef1859c3ee9fc72858f588b56a09da5466e64f8cc4e90a7b3b909fba8a7ae` | [VERIFIED] client.js:36 |
| Pyth State (used by Suilend) | `0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8` | [VERIFIED] |

**Signatures (exact):**
- `static SuilendClient.initialize(lendingMarketId, lendingMarketType, suiGrpcClient: SuiGrpcClient, logPackageId?): Promise<SuilendClient>` — ⚠️ **BREAKING 3.0.x: 4th arg is `SuiGrpcClient` (`@mysten/sui/grpc`), NOT `SuiClient`.** Construct `new SuiGrpcClient({...})` for SDK init; keep a separate `SuiClient` for signing/execution.
- `createObligation(tx): TransactionResult` → returns the **ObligationOwnerCap** as in-PTB handle. Does NOT auto-transfer; you MUST `tx.transferObjects([cap], sender)` before the PTB ends (non-droppable).
- `deposit(sendCoin: TransactionObjectInput, coinType, obligationOwnerCap, tx): void` → use this when depositing a **coin you already hold in-PTB** (e.g. SUI withdrawn from Navi). (`depositIntoObligation(ownerId, coinType, value:string, tx, cap)` pulls from owner balance — used only for the standalone tiny-position setup.)
- `refreshAll(tx, obligation?: undefined, coinTypes?: string[]): Promise<void>` → **for a fresh obligation call `refreshAll(tx, undefined, [SUI_TYPE, USDC_TYPE])`** — internally collects price ids, fetches Hermes data, appends `pythClient.updatePriceFeeds(...)` + per-reserve `refreshReservePrices(...)` for BOTH reserves, in correct order. The client ships `client.pythClient` + `client.pythConnection` already wired — do NOT construct your own Pyth client for the Suilend leg.
- `borrow(obligationOwnerCap, obligationId: string, coinType, value:string, tx, addRefreshCalls?=true): Promise<TransactionResult>` → returns the **borrowed Coin** handle. **For fresh same-PTB obligation: pass `obligationId = ""` and `addRefreshCalls = false`** (false skips the internal `getObligation()` that returns null on a not-yet-on-chain obligation → would throw). `false` is MANDATORY here.
- `findReserveArrayIndex(coinType): bigint` → runtime resolver for reserve index (used only if doing manual `refreshReservePrices`).

### DeepBook V3 — `@mysten/deepbook-v3`
Source: `MystenLabs/ts-sdks/packages/deepbook-v3/src/{transactions/flashLoans.ts, utils/constants.ts, client.ts}`; Move `MystenLabs/deepbookv3/.../pool.move`, `vault.move`.

| Item | Value | Tag |
|---|---|---|
| `DEEPBOOK_PACKAGE_ID` | `0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748` | [VERIFIED] constants.ts |
| `REGISTRY_ID` | `0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d` | [VERIFIED] constants.ts |
| Pool `SUI_USDC` objectId | `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407` (base SUI, **quote USDC**) | [VERIFIED] constants.ts |
| USDC scalar | `1000000` (10^6) | [VERIFIED] |

**Flash loan = FEE-FREE (0 bps)** — Move `return_flashloan_quote` asserts `coin.value() == borrow_quantity` (repay exactly, no premium). `FlashLoan` struct has **no abilities** (true hot-potato) → PTB aborts unless returned in the same block. USDC is the **QUOTE** asset in every mainnet USDC pool → use the **Quote** functions.

**Construction + signatures (exact):**
```ts
const db = new DeepBookClient({ client: suiClient, address: sender, network: 'mainnet' }); // option is `network`, NOT `env`
// borrow: human units (NOT atomic) — $1 USDC => borrowAmount = 1
const [usdcCoin, flashLoan] = tx.add(db.flashLoans.borrowQuoteAsset('SUI_USDC', amountHuman)); // returns [Coin, FlashLoan]
// ...use usdcCoin...
tx.add(db.flashLoans.returnQuoteAsset('SUI_USDC', amountHuman, usdcCoin, flashLoan)); // self-splits the repayment, returns remainder coin
```
All flashLoans methods are **curried** — must wrap in `tx.add(...)`.

### Navi — `@naviprotocol/lending@1.4.6`
Source: `naviprotocol/naviprotocol-monorepo/packages/lending/src/{pool.ts, flashloan.ts, types.ts}`; config endpoint `https://open-api.naviprotocol.io/api/navi/config`.

| Item | Value | Tag |
|---|---|---|
| SUI assetId | `0` | [VERIFIED] navi config |
| Native USDC assetId | `10` (⚠️ assetId `1` = bridged/wormhole — DO NOT USE) | [VERIFIED] navi config |
| SUI poolId | `0x2cab9b151ca1721624b09b421cc57d0bb26a1feb5da1f821492204b098ec35c9` | [ASSUMED] re-confirm via SDK `getPools()` |
| USDC poolId | `0xe120611435395f144b4bcc4466a00b6b26d7a27318f96e148648852a9dd6b31c` | [ASSUMED] re-confirm via SDK `getPools()` |

**Signatures (exact) — all APPEND to caller `tx` (param 1):**
- `repayCoinPTB(tx, identifier: AssetIdentifier, coinObject, options?:{amount?, accountCap?}): Promise<Transaction|TransactionResult>` — `coinObject` is **positional param 3**; `amount`/`accountCap` live in `options`. Without `accountCap` → global-storage `incentive_v3::entry_repay`, returns `tx`.
- `withdrawCoinPTB(tx, identifier, amount: number|TransactionResult, options?): Promise<TransactionResult>` — **returns a chainable withdrawn Coin** (`coin::from_balance`). ⚠️ `amount` is **positional param 3** here (differs from repay).
- `flashloanPTB(tx, identifier, amount, options?) → [balance, receipt]` and `repayFlashLoanPTB(tx, identifier, receipt, coinObject, options?) → [balance]` — for the FLOOR fallback only.
- `AssetIdentifier = string | Pool | number` → pass `assetId` (`0` SUI / `10` USDC). Global-storage model: `accountCap` optional, omit it.

### Coin types (Sui mainnet)
| Coin | Type | Decimals | Tag |
|---|---|:---:|---|
| SUI | `0x2::sui::SUI` | 9 | [VERIFIED] |
| **Native Circle USDC** | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` | 6 | [VERIFIED ×4 — Suilend, Circle, Navi, DeepBook] |
| Wormhole USDC (**AVOID**) | `0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN` | 6 | [VERIFIED] do NOT use |

### Pyth (Sui mainnet) — only needed for manual refresh / floor; Suilend's `refreshAll` handles it internally
| Item | Value | Tag |
|---|---|---|
| SUI/USD feed id | `0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744` | [VERIFIED] hermes |
| USDC/USD feed id | `0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a` | [VERIFIED] hermes |
| Pyth State | `0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8` | [VERIFIED] pyth docs |
| Wormhole State | `0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c` | [VERIFIED] pyth docs |
- `new SuiPythClient(provider, pythStateId, wormholeStateId)`; `updatePriceFeeds(tx, updates:Buffer[], feedIds): Promise<ObjectId[]>`; `connection.getPriceFeedsUpdateData(priceIds): Promise<Buffer[]>`.
- ⚠️ Pyth Sui contracts scheduled for a DAO auto-upgrade **2026-07-31** — after demo, irrelevant for this hackathon.

---

## 2. THE HERO PTB — exact composed sequence (~10 commands, all TS, zero net-new Move)
Full Navi→Suilend refinance (SUI collateral / native USDC debt):
1. `const [flashUsdc, flashLoan] = tx.add(db.flashLoans.borrowQuoteAsset('SUI_USDC', debtHuman))`  — flash-borrow USDC (free).
2. `await navi.repayCoinPTB(tx, 10, flashUsdc, { amount: debtAtomic })`  — repay full Navi USDC debt.
3. `const suiColl = await navi.withdrawCoinPTB(tx, 0, collateralAtomic)`  — withdraw freed SUI collateral (returns Coin).
4. `const cap = suilend.createObligation(tx)`  — new Suilend obligation (in-PTB cap).
5. `suilend.deposit(suiColl, SUI_TYPE, cap, tx)`  — deposit the withdrawn SUI into Suilend.
6. `await suilend.refreshAll(tx, undefined, [SUI_TYPE, USDC_TYPE])`  — Pyth update + refresh BOTH reserves.
7. `const [borrowedUsdc] = await suilend.borrow(cap, "", USDC_TYPE, debtHuman?, tx, false)`  — borrow USDC from Suilend (`""` + `false` mandatory).
8. `tx.add(db.flashLoans.returnQuoteAsset('SUI_USDC', debtHuman, borrowedUsdc, flashLoan))`  — repay the flash loan exactly.
9. `tx.transferObjects([cap], sender)`  — transfer non-droppable ObligationOwnerCap to user.
10. `tx.transferObjects([<remainder coins>], sender)`  — sweep any dust/remainder to user.

**Atomicity is a language guarantee, not our code:** DeepBook FlashLoan hot-potato forces step 8; Suilend borrow-guard aborts (whole PTB reverts) on unhealthy end-state; Suilend cap non-drop forces step 9.

---

## 3. Unverified / Assumed (decision-tree these in PLAN.md — test Day 1)
| Item | Status | Resolution |
|---|---|---|
| Suilend reserve indices (SUI/USDC) | [ASSUMED] positional + mutable | Resolve at runtime: `client.findReserveArrayIndex(coinType)`. NEVER hardcode. `refreshAll` avoids needing them. |
| Suilend literal package id | [ASSUMED] runtime-derived | `initialize(..., logPackageId=true)` once, or resolve UpgradeCap `0x3d4ef185...`. |
| Pyth PriceInfoObject ids (SUI/USDC) | [ASSUMED] | Resolved internally by `refreshAll` via `pythClient.getPriceFeedObjectId(reserve.priceIdentifier)`. |
| Navi SUI/USDC poolIds | [ASSUMED] | Re-confirm Day 1 via SDK `getPools()` / full config JSON. Global-storage path resolves pool from `assetId` — poolId likely not passed directly. |
| DeepBook constants pinned to HEAD | [UNVERIFIED] | Verify installed `node_modules/@mysten/deepbook-v3` `constants.js` `DEEPBOOK_PACKAGE_ID` matches before pasting (package upgrades rotate ids). |
| Exact-amount reconciliation (flash = Navi debt + accrued interest; Suilend borrow = flash repay) | [ASSUMED] | Day 2 dust/exact-fee math via `dryRun` `balanceChanges`. Flash slightly > debt; sweep remainder. |

## 4. Precedent (de-risk — pattern ships in production)
Current "Multiply" (one-tx atomic looping, mainnet), Navi 1-click LST Leverage, SuiFlash (multi-protocol flash in 1 PTB, devnet). Nobody ships a cross-protocol *refinance* → novel wedge. Mechanism proven; product doesn't exist.

## 5. DAY-1 GATE (carry to PLAN.md)
Get steps 4-7 (Suilend `createObligation`→`deposit`→`refreshAll`→`borrow(...,false)`) to `devInspectTransactionBlock` GREEN in isolation BEFORE wiring the flash loan. If not green by EOD Day 1 → drop to the FLOOR (Navi-only deleverage, Navi flash loan, swap via Cetus).
