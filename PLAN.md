# RefiRail Implementation Plan

**Project:** RefiRail — one-click atomic lending-position refinance on Sui
**Hackathon:** Sui Overflow 2026 — Special–DeepBook ($70k) + DeFi & Payments ($62.5k), multi-track
**Deadline:** 2026-06-20 16:00 UTC (~2.5 build days; Day 3 PM reserved for video + submission)
**Stack:** TypeScript · Next.js 15 · @mysten/sui · @mysten/dapp-kit · @suilend/sdk@3.0.4 · @naviprotocol/lending@1.4.6 · @mysten/deepbook-v3
**Architecture Doc:** `refirail/ARCHITECTURE.md` (THE source of truth for all code) · **Spike:** `refirail/TECHNICAL-SPIKE.md`

---

## How to Use This Plan

1. Read in order. Do not skip phases. Do not reorder tasks.
2. Every phase has a GATE checklist. Verify every item before proceeding.
3. When you see 🔀 (decision point), run the command and follow the branch that matches.
4. Copy code from `ARCHITECTURE.md` — do not improvise. Every constant is source-verified.
5. Commit after every task using the specified commit message.
6. Save the demo address + key to `.env.local` immediately after Task 0.4.
7. If something fails and isn't covered by a decision tree: STOP. Report the error. Do not guess.
8. **VERIFY-MILESTONE tasks are mandatory** (end of Phase 2) and cannot be skipped.
9. **seed-demo.ts** must exist before any demo take. Run it before every recording.
10. **forge snapshot:** N/A — RefiRail has **zero net-new Move**, no contracts to snapshot.
11. **THE DAY-1 GATE (Task 1.9) is the whole project's pivot:** green → build the headline; red by EOD → drop to the FLOOR (Phase 2F).

---

## Mandatory Tasks (injected)

- **Demo seed (Task 1.10):** `scripts/seed-demo.ts` from PRD §6 Demo Prerequisites — idempotent.
- **VERIFY-MILESTONE (Task 2.5):** milestone check after the real refinance proof exists.
- **forge snapshot:** N/A (no Move contracts).

### Forge→Build Winning-Pattern Step Mapping
| PLAN Step | What | Architecture Ref | Pattern |
|---|---|---|---|
| Task 1.8 | Generate `DOMAIN-GUIDE.md` | §15 | #18 |
| Task 1.10 | `scripts/seed-demo.ts` | PRD §6 / §14 | #19 |
| Task 1.x, 3.x | test file alongside source (dryrun script = test harness) | §20 | #20 |
| Task 2.2 | run refine-execute, capture digest | PRD §7.6 / §14 | #21 |
| Task 3.7 | `/proof` README section from `submission/proof.md` | PRD §7.6 | #22 |
| Task 1.9 | dryRun harness = test directory | §20 | #23 |

---

## Phase Overview

| Phase | Purpose | Est. Time | Depends On |
|:---:|---------|-----------|-----------|
| 0 | Scaffold, install, fund wallet, verify constants | 0.25 day | — |
| 1 | **Day-1 gate** — Suilend leg isolated + full refinance dryRun GREEN | 0.75 day | 0 |
| 2 | Real mainnet refinance + exact-amount + revert proof | 0.75 day | 1 |
| 2F | FLOOR (only if Phase 1 gate fails) — Navi-only deleverage | (replaces Phase 2, 0.75) | 1 gate fail |
| 3 | Frontend + API + deploy | 0.5 day | 2 |
| 4 | Demo video + README/proof + submit | 0.25 day | 3 |

**Total committed estimate: 2.5 build days** (Phase 2F replaces Phase 2 if the gate fails — not additive).

---

## Phase 0: Scaffold & Setup

**Purpose:** Project skeleton, dependencies, funded demo wallet, verified constants.
**Estimated time:** 0.25 day

### Task 0.1: Scaffold Next.js + install deps

**Files:**
- Create: `package.json` (from ARCHITECTURE.md §19)
- Create: `tsconfig.json` (from ARCHITECTURE.md §19)
- Create: `next.config.mjs` (from ARCHITECTURE.md §19)

**Steps:**
1. Scaffold:
   ```bash
   npx create-next-app@latest refirail --ts --app --no-tailwind --no-src-dir --no-eslint --use-npm
   cd refirail
   ```
2. Overwrite `package.json`, `tsconfig.json`, `next.config.mjs` with the ARCHITECTURE.md §19 versions.
3. Install:
   ```bash
   npm install
   ```
   Expected:
   ```
   added NNN packages
   ```

**Commit:**
```bash
git add package.json tsconfig.json next.config.mjs
git commit -m "chore: scaffold Next.js 15 + pin Sui DeFi SDKs"
```

#### 🔀 Decision Point: SDK install resolves (RISK 12)
Run: `ls node_modules/@suilend/sdk/package.json && cat node_modules/@suilend/sdk/package.json | grep '"version"'`
Expected: `"version": "3.0.4"`

✅ **If 3.0.4:** continue.

🔀 **If a different version installed:**
1. `npm install @suilend/sdk@3.0.4 --save-exact`
2. Re-check the version.
3. If 3.0.4 is unpublished/yanked: `npm view @suilend/sdk versions` → pick the closest 3.0.x and update `TECHNICAL-SPIKE.md` + `lib/config.ts` if the exported `LENDING_MARKET_ID` changed (`node -e "console.log(require('@suilend/sdk').LENDING_MARKET_ID)"`).

⛔ **If @suilend/sdk won't install at all:**
1. Proceed with Phase 1 building the DeepBook + Navi legs first (they don't need Suilend).
2. Treat Suilend as the Day-1 gate's pass/fail — if unusable, go straight to the FLOOR (Phase 2F).

### Task 0.2: Create config + types

**Files:**
- Create: `lib/config.ts` (from ARCHITECTURE.md §3)
- Create: `lib/types.ts` (from ARCHITECTURE.md §3)

**Steps:**
1. Copy both files verbatim from ARCHITECTURE.md §3.
2. Type-check:
   ```bash
   npx tsc --noEmit
   ```
   Expected: no errors.

**Commit:**
```bash
git add lib/config.ts lib/types.ts
git commit -m "feat(config): source-verified mainnet ids, coins, Pyth feeds + shared types"
```

#### 🔀 Decision Point: DeepBook constants match installed SDK (RISK 12)
Run:
```bash
node -e "const c=require('@mysten/deepbook-v3/dist/cjs/utils/constants.js'); console.log(JSON.stringify(c).slice(0,400))" 2>/dev/null || echo "path differs"
```
Expected: output contains `0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748`.

✅ **If the package id matches `DEEPBOOK.PACKAGE_ID`:** continue.

🔀 **If the package id differs (SDK rotated on upgrade):**
1. Grep the installed constants: `grep -rE '0x[0-9a-f]{64}' node_modules/@mysten/deepbook-v3/dist | grep -i pool | head`
2. Update `DEEPBOOK.PACKAGE_ID` and `DEEPBOOK.SUI_USDC_POOL` in `lib/config.ts` to the installed values.
3. We pass `POOL_KEY: "SUI_USDC"` to the SDK (which resolves `pool.address` itself), so the pool object id in config is documentation — the package id is the one that must match.

⛔ **If the constants file path can't be found:** the SDK still resolves ids internally from `network: "mainnet"` — proceed; the pool object id in config is reference-only.

### Task 0.3: Verify Navi asset ids live

**Files:** (none — verification only, against ARCHITECTURE.md §23)

**Steps:**
1. Confirm native USDC = assetId 10:
   ```bash
   curl -s https://open-api.naviprotocol.io/api/navi/config | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(JSON.stringify(j).match(/usdc/gi)?'usdc present':'no usdc');})"
   ```
   Expected: response parses; USDC present.

**Commit:** (no file change — note result in BUILD-REPORT.md)
```bash
echo "Navi config reachable; USDC assetId=10 (native)" >> BUILD-REPORT.md
git add BUILD-REPORT.md && git commit -m "docs: record Navi config verification"
```

### Task 0.4: Fund demo wallet + write .env.local

**Files:**
- Create: `.env.example` (from ARCHITECTURE.md §19)
- Create: `.env.local` (gitignored — real values)

**Steps:**
1. Copy `.env.example` from ARCHITECTURE.md §19.
2. Generate a fresh keypair:
   ```bash
   node -e "const {Ed25519Keypair}=require('@mysten/sui/keypairs/ed25519');const k=new Ed25519Keypair();console.log('addr',k.getPublicKey().toSuiAddress());console.log('key',k.getSecretKey());"
   ```
3. Buy ~$5 SUI on a low-fee CEX (Bitget/OKX) and withdraw **native SUI** to the printed address (no bridge).
4. Write `.env.local`:
   ```bash
   cp .env.example .env.local
   # then edit: DEMO_PRIVATE_KEY=suiprivkey1..., NEXT_PUBLIC_DEMO_ADDRESS=0x...
   ```
5. Verify balance:
   ```bash
   node -e "const {SuiClient,getFullnodeUrl}=require('@mysten/sui/client');new SuiClient({url:getFullnodeUrl('mainnet')}).getBalance({owner:process.env.NEXT_PUBLIC_DEMO_ADDRESS}).then(b=>console.log(b))"
   ```
   Expected: `totalBalance` ≥ ~4e9 (≈$3+ SUI).

**Commit:**
```bash
git add .env.example .gitignore
git commit -m "chore: env manifest + demo wallet funded (native SUI)"
```

#### 🔀 Decision Point: Wallet funded (RISK 3 — mainnet logistics)
Run the balance check above.
✅ **If balance ≥ ~4e9 mist:** continue to Phase 1.
🔀 **If 0 after 30 min:** CEX withdrawal pending — verify the network is "Sui" (not an EVM/aptos lookalike) and the address has no typo; re-check.
⛔ **If the CEX won't withdraw native SUI:** use a second CEX (OKX/Bitget/Gate); never bridge wrapped SUI (it won't be `0x2::sui::SUI`).

### Phase 0 Gate
- [ ] `npm install` clean; `@suilend/sdk@3.0.4` present
- [ ] `npx tsc --noEmit` passes for `lib/config.ts` + `lib/types.ts`
- [ ] DeepBook `PACKAGE_ID` matches installed SDK (or config updated)
- [ ] Demo wallet holds ≥ ~$3 native SUI
- [ ] `.env.local` has `DEMO_PRIVATE_KEY` + `NEXT_PUBLIC_DEMO_ADDRESS`
- [ ] All Phase 0 commits made

**If any check fails: DO NOT proceed.**

---

## Phase 1: Day-1 Gate — Prove the Atomic PTB Headless

**Purpose:** Get the Suilend leg dry-running green in isolation, then the full refinance dry-running green — the single biggest unknown, front-loaded. No UI.
**Estimated time:** 0.75 day

### Task 1.1: Clients + amounts

**Files:**
- Create: `lib/clients.ts` (from ARCHITECTURE.md §4)
- Create: `lib/amounts.ts` (from ARCHITECTURE.md §4)

**Steps:**
1. Copy both files verbatim.
2. `npx tsc --noEmit` → no errors.

**Commit:**
```bash
git add lib/clients.ts lib/amounts.ts
git commit -m "feat(core): Sui/gRPC client factories + amount math"
```

#### 🔀 Decision Point: SuiGrpcClient constructor (RISK 2)
Run:
```bash
node -e "const {SuiGrpcClient}=require('@mysten/sui/grpc');const c=new SuiGrpcClient({baseUrl:'https://fullnode.mainnet.sui.io:443'});console.log('ok',!!c)"
```
Expected: `ok true`.

✅ **If it constructs:** continue.

🔀 **If `baseUrl` is not a valid option (TypeError / undefined transport):**
1. Try `new SuiGrpcClient({ network: "mainnet" })`.
2. Try `new SuiGrpcClient({ url: RPC.grpc })`.
3. Inspect: `node -e "console.log(Object.getOwnPropertyNames(require('@mysten/sui/grpc')))"` and read `node_modules/@mysten/sui/dist/cjs/grpc/` for the constructor shape.
4. Update `makeSuiGrpcClient()` in `lib/clients.ts` with the working option.

⛔ **If `@mysten/sui/grpc` doesn't exist in the installed version:**
1. The installed `@mysten/sui` predates gRPC — `npm install @mysten/sui@latest`.
2. If Suilend 3.0.4 still demands a client this version can't provide, this is the gate-fail signal → FLOOR (Phase 2F).

### Task 1.2: Suilend adapter

**Files:**
- Create: `lib/protocols/suilend.ts` (from ARCHITECTURE.md §7)

**Steps:**
1. Copy verbatim.
2. Smoke-test init:
   ```bash
   npx tsx -e "import('./lib/protocols/suilend').then(m=>m.initSuilend()).then(c=>console.log('init ok', !!c)).catch(e=>{console.error(e);process.exit(1)})"
   ```
   Expected: `init ok true`.

**Commit:**
```bash
git add lib/protocols/suilend.ts
git commit -m "feat(suilend): obligation create/deposit/refreshAll/borrow adapter"
```

#### 🔀 Decision Point: Suilend init resolves the market (RISK 1, RISK 2)
Run the smoke-test above.
✅ **If `init ok true`:** continue.
🔀 **If `LendingMarket.fetch` throws / wrong type:**
1. Confirm `LENDING_MARKET_ID` + `LENDING_MARKET_TYPE` against the installed SDK: `node -e "const s=require('@suilend/sdk');console.log(s.LENDING_MARKET_ID, s.LENDING_MARKET_TYPE)"` and update `lib/config.ts` if they differ.
2. Re-run. If the type tag mismatches, use the SDK's exported constants directly in `config.ts`.
⛔ **If init can't be made to work in ~1h:** FLOOR (Phase 2F).

### Task 1.3: Isolated Suilend dry-run (THE critical sub-gate)

**Files:**
- Create: `scripts/suilend-leg-dryrun.ts` (mirror of `refine-dryrun.ts`, ARCHITECTURE.md §14, but composing ONLY createObligation→deposit(a self-split SUI coin)→refreshAll→borrow→transfer cap)

**Steps:**
1. Write a script that, with the demo wallet as sender, splits a small SUI coin from gas, runs `appendSuilendDepositBorrow`, transfers the cap, and `dryRun`s.
2. Run:
   ```bash
   npx tsx scripts/suilend-leg-dryrun.ts
   ```
   Expected: `dryRun ok: true` and balanceChanges showing a USDC inflow.

**Commit:**
```bash
git add scripts/suilend-leg-dryrun.ts
git commit -m "test(suilend): isolated create+deposit+refresh+borrow dry-runs green"
```

#### 🔀 Decision Point: Suilend borrow leg green in isolation (RISK 1 — THE #1 unknown)
Run the script above.
✅ **If `dryRun ok: true`:** the hardest unknown is dead. Continue — the cross-protocol story is on.
🔀 **If it aborts with a price/oracle error (e.g. `EPriceStale`, `reserve` abort):**
1. Confirm `refreshAll(tx, undefined, [SUI, USDC])` passes BOTH coin types (not just one).
2. Confirm `borrow(..., addRefreshCalls=false)` — `false` is mandatory; `true` does an RPC `getObligation` that returns null on a fresh same-PTB obligation.
3. If still stale, manually append per-reserve refresh: resolve indices via `client.findReserveArrayIndex(SUI)`/`(USDC)` and call `refreshReservePrices` for each before borrow.
🔀 **If it aborts with `obligation not found` / null:**
1. Ensure `obligationId = ""` is passed (the empty string is intentional with `addRefreshCalls=false`).
2. Ensure the cap from `createObligation` is the SAME handle passed to `deposit` and `borrow`.
⛔ **If not green by ~14:00 Day 1:** invoke the FLOOR (Phase 2F). Do not burn the afternoon here.

### Task 1.4: DeepBook adapter

**Files:**
- Create: `lib/protocols/deepbook.ts` (from ARCHITECTURE.md §5)

**Steps:**
1. Copy verbatim (flash borrow/return + the floor swap helper).
2. `npx tsc --noEmit`.

**Commit:**
```bash
git add lib/protocols/deepbook.ts
git commit -m "feat(deepbook): fee-free USDC flash borrow/return adapter"
```

### Task 1.5: Navi adapter

**Files:**
- Create: `lib/protocols/navi.ts` (from ARCHITECTURE.md §6)

**Steps:**
1. Copy verbatim.
2. `npx tsc --noEmit`.

**Commit:**
```bash
git add lib/protocols/navi.ts
git commit -m "feat(navi): repay + withdraw + flashloan adapter"
```

#### 🔀 Decision Point: Navi PTB helper names (RISK 8)
Run:
```bash
node -e "const n=require('@naviprotocol/lending');console.log(['repayCoinPTB','withdrawCoinPTB','flashloanPTB','repayFlashLoanPTB','depositCoinPTB','borrowCoinPTB'].filter(k=>typeof n[k]==='function'))"
```
Expected: all six listed.

✅ **If all present:** continue.
🔀 **If a name differs:** print all exports `node -e "console.log(Object.keys(require('@naviprotocol/lending')))"`, map to the closest helper (e.g. `repay`/`withdraw`), and update `lib/protocols/navi.ts` + `scripts/open-position.ts` imports.
⛔ **If the package ships no PTB helpers:** read `node_modules/@naviprotocol/lending/dist` for the `tx.moveCall` targets and call them directly (still pure TS, still one PTB).

### Task 1.6: Open the real demo position

**Files:**
- Create: `scripts/open-position.ts` (from ARCHITECTURE.md §14)

**Steps:**
1. Copy verbatim.
2. Run:
   ```bash
   npm run open-position
   ```
   Expected: a success digest; printed env hints.
3. Verify on Suiscan that the demo wallet has a Navi deposit + USDC borrow.

**Commit:**
```bash
git add scripts/open-position.ts
git commit -m "feat(scripts): open the tiny real Navi demo position"
```

#### 🔀 Decision Point: Position opened (RISK 3 — coin type)
Run: check the borrowed coin type on Suiscan.
✅ **If borrowed coin type == `0xdba3...::usdc::USDC`:** continue.
🔀 **If it's the wormhole type `0x5d4b...::coin::COIN`:** you used the wrong asset id — confirm `NAVI.USDC_ASSET_ID = 10` (NOT 1). Repay/close and re-open with assetId 10.
⛔ **If Navi deposit/borrow reverts:** check SUI balance covers collateral + gas; reduce collateral to ~2 SUI; retry.

### Task 1.7: Refinance composer + simulate

**Files:**
- Create: `lib/refinance.ts` (from ARCHITECTURE.md §8)
- Create: `lib/simulate.ts` (from ARCHITECTURE.md §10)

**Steps:**
1. Copy both verbatim.
2. `npx tsc --noEmit`.

**Commit:**
```bash
git add lib/refinance.ts lib/simulate.ts
git commit -m "feat(core): atomic refinance PTB composer + dryRun simulator"
```

### Task 1.8: Generate DOMAIN-GUIDE.md (#18)

**Files:**
- Create: `DOMAIN-GUIDE.md` (from ARCHITECTURE.md §15 spec)

**Steps:**
1. Generate the domain guide from ARCHITECTURE.md §15: the 20 concepts, rules/invariants, glossary, source mapping.
2. Verify it names the 5 invariants and the `addRefreshCalls=false` rule.

**Commit:**
```bash
git add DOMAIN-GUIDE.md
git commit -m "docs(domain): generate DOMAIN-GUIDE from architecture spec"
```

### Task 1.9: 🔁 THE DAY-1 GATE — full refinance dry-run

**Files:**
- Create: `scripts/refine-dryrun.ts` (from ARCHITECTURE.md §14)

**Steps:**
1. Copy verbatim.
2. Run:
   ```bash
   npm run dryrun
   ```
   Expected:
   ```
   dryRun ok: true
   balanceChanges: [ ... SUI net ~ -gas, USDC net ~ 0 ... ]
   ```

**Commit:**
```bash
git add scripts/refine-dryrun.ts
git commit -m "test(refinance): full Navi->Suilend refinance dry-runs green on mainnet"
```

#### 🔀 Decision Point: FULL REFINANCE GREEN (RISK 1, RISK 4 — the pivot)
Run `npm run dryrun`.
✅ **If `dryRun ok: true`:** **THE PROJECT IS DE-RISKED.** Proceed to Phase 2 (real execution). This is the milestone that proves the thesis.
🔀 **If it aborts on the flash-repay (`borrow_quantity` mismatch):**
1. The Suilend borrow amount must equal the flash amount exactly — both use `flashAtomic`. Confirm `computeFlashAmounts` returns the same value passed to `borrowQuoteAsset` (human) and `borrow` (atomic).
2. See Task 2.1 exact-amount decision tree.
🔀 **If it aborts on the Navi withdraw (`debt remaining`):**
1. The flash/repay didn't fully clear Navi debt. Increase `bufferBps` (e.g. 30 → 80) so `flashAtomic` > accrued debt.
2. Re-run.
🔀 **If it aborts on object/handle threading (RISK 4):**
1. Bisect: comment out legs after the Suilend borrow and re-dryRun to find the first failing leg.
2. Confirm each coin handle is consumed exactly once and the cap is transferred.
⛔ **If not green by EOD Day 1 (~18:00):** STOP the headline. Execute the FLOOR (Phase 2F). The floor still ships a real one-tx demo.

### Task 1.10: Seed script (#19)

**Files:**
- Create: `scripts/seed-demo.ts` (from ARCHITECTURE.md §14)

**Steps:**
1. Copy verbatim.
2. Run:
   ```bash
   npm run seed
   ```
   Expected: `demo position already present — no-op.` (since Task 1.6 opened it).

**Gate:** idempotent — safe to run repeatedly.

**Commit:**
```bash
git add scripts/seed-demo.ts
git commit -m "seed(demo): idempotent demo-state guard from PRD §6"
```

### Phase 1 Gate
- [ ] `npx tsc --noEmit` passes for all `lib/` + `scripts/`
- [ ] Suilend leg dry-runs green in isolation (Task 1.3)
- [ ] **Full refinance dry-runs green (Task 1.9) — OR the FLOOR decision is taken**
- [ ] Real Navi demo position open with NATIVE USDC
- [ ] `DOMAIN-GUIDE.md` + `seed-demo.ts` exist
- [ ] All Phase 1 commits made

**If the Day-1 gate (1.9) is red and cannot be fixed by EOD: switch to Phase 2F (FLOOR).**

---

## Phase 2: Real Mainnet Refinance + Proof

**Purpose:** Execute one real refinance, capture the Suiscan digest, tune exact amounts, and prove atomic revert.
**Estimated time:** 0.75 day

### Task 2.1: Exact-amount tuning

**Files:**
- Modify: `lib/amounts.ts` (`computeFlashAmounts` buffer) (ARCHITECTURE.md §4)

**Steps:**
1. From the Task 1.9 dryRun `balanceChanges`, read the residual USDC delta.
2. Tune `bufferBps` so the net USDC change ≈ 0 (within a cent) and Navi debt fully clears.
3. Re-run `npm run dryrun` until clean.

**Commit:**
```bash
git add lib/amounts.ts
git commit -m "fix(amounts): tune flash buffer from dryRun balance deltas"
```

#### 🔀 Decision Point: Exact-amount reconciliation (RISK 5)
Run `npm run dryrun` and inspect `balanceChanges`.
✅ **If net USDC ≈ 0 and SUI change ≈ −gas only:** amounts balanced. Continue.
🔀 **If USDC net is negative (short to repay flash):** raise `bufferBps`; the Suilend borrow == flash, so the shortfall is Navi over-repay excess — confirm Navi refunds excess to sender (it should appear as a positive USDC delta).
🔀 **If USDC net is positive (leftover):** lower `bufferBps`; ensure the remainder sweep (`tx.transferObjects([remainder], sender)`) is present.
⛔ **If it won't balance:** repay Navi with the exact current debt read just-in-time (`debtAtomic` from a fresh position read in `refine-execute.ts`) rather than a buffered flash; borrow that exact amount from Suilend.

### Task 2.2: Execute the real refinance (#21)

**Files:**
- Create: `scripts/refine-execute.ts` (from ARCHITECTURE.md §14)

**Steps:**
1. Copy verbatim.
2. Run:
   ```bash
   npm run execute
   ```
   Expected: a Suiscan URL printed; `status: success`; `submission/proof.md` written.
3. Open the Suiscan link — confirm the single tx shows DeepBook + Navi + Suilend calls.

**Commit:**
```bash
git add scripts/refine-execute.ts submission/proof.md
git commit -m "feat(scripts): execute real refinance + capture Suiscan proof"
```

#### 🔀 Decision Point: Real execution succeeds (RISK 3, RISK 9)
Run `npm run execute`.
✅ **If `status: success` with a digest:** the headline is REAL. Continue.
🔀 **If RPC rate-limits / times out (RISK 9):** set `SUI_RPC_URL` to a key'd endpoint in `.env.local`; retry.
🔀 **If it reverts on-chain (passed dryRun but failed live):** mainnet state moved between build and execute (price/debt drift) — re-read the position, rebuild, re-execute immediately (within seconds).
⛔ **If it repeatedly reverts live:** widen `bufferBps`; if still failing, the FLOOR (Phase 2F) is the demo.

### Task 2.3: Prove atomic revert

**Files:**
- Modify: `scripts/refine-execute.ts` (add an `--unhealthy` flag that requests a borrow exceeding safe LTV) (ARCHITECTURE.md §8, §18)

**Steps:**
1. Add a variant that borrows far more than the collateral supports.
2. Run:
   ```bash
   npx tsx scripts/refine-execute.ts --unhealthy
   ```
   Expected: the PTB aborts atomically; capture the failed digest; position unchanged.
3. Append the revert digest to `submission/proof.md`.

**Commit:**
```bash
git add scripts/refine-execute.ts submission/proof.md
git commit -m "test(safety): atomic unhealthy-revert proof captured"
```

#### 🔀 Decision Point: Revert is atomic (RISK 1 safety invariant)
Run the unhealthy variant.
✅ **If it aborts and the position is unchanged:** the safety invariant is proven on-chain. Continue.
🔀 **If it partially executes:** the borrow guard didn't fire — verify the Suilend borrow is INSIDE the same PTB (not a separate tx) and no leg auto-transfers before the guard.
⛔ **If you can't trigger a clean revert:** document the borrow-guard behavior from a dryRun (`ok:false`) as the safety evidence instead of a live failed tx.

### Task 2.4: Floor backstop build (parallel insurance)

**Files:**
- Create: `lib/deleverage.ts` (from ARCHITECTURE.md §9)

**Steps:**
1. Copy verbatim.
2. Dry-run a deleverage:
   ```bash
   npx tsx -e "import('./lib/deleverage').then(async m=>{const {makeSuiClient}=await import('./lib/clients');const c=makeSuiClient();const {usdcAtomic,suiAtomic}=await import('./lib/amounts');const tx=await m.buildDeleveragePTB({sender:process.env.NEXT_PUBLIC_DEMO_ADDRESS,suiClient:c,repayAtomic:usdcAtomic(0.5),collateralAtomic:suiAtomic(1)});const {simulateRefinance}=await import('./lib/simulate');console.log(await simulateRefinance(c,tx,process.env.NEXT_PUBLIC_DEMO_ADDRESS))})"
   ```
   Expected: a dryRun result (ok or a known swap-shape error to fix).

**Commit:**
```bash
git add lib/deleverage.ts
git commit -m "feat(floor): Navi-only deleverage PTB as backstop"
```

#### 🔀 Decision Point: DeepBook swap shape (floor) (RISK 10)
Run the deleverage dryRun.
✅ **If ok or only an amount error:** floor is viable; fix amounts and move on.
🔀 **If `swapExactBaseForQuote` is the wrong method/shape:**
1. Inspect: `node -e "const {DeepBookClient}=require('@mysten/deepbook-v3');console.log(Object.keys(new DeepBookClient({network:'mainnet',address:'0x0'}).deepBook||{}))"`
2. Use the correct swap method (e.g. `swap_exact_base_for_quote` target via `tx.moveCall`).
⛔ **If DeepBook swap is unworkable:** degrade the floor to L0 proof-of-magic (DeepBook flash borrow→trivial→repay) + the working refinance preview. Still a real one-tx demo.

### Task 2.5: VERIFY-MILESTONE Checkpoint — Core Refinance

**Purpose:** Mid-build quality gate. Build cannot advance to the UI until the real refinance is proven.

**Steps:**
1. Confirm `submission/proof.md` contains a real success digest.
2. Confirm the revert proof (or dryRun `ok:false`) is captured.
3. Re-read `FEATURE-OBSERVABLES.md` and check each P0 observable.

**Gate (MANDATORY — cannot be skipped):**
- [ ] A real refinance digest exists on Suiscan (Kill Zone 1 — demo flow — clear)
- [ ] ≤ 1 integration blocked (DeepBook + Navi + Suilend all executed in one tx)
- [ ] The HERO FLOW (or the FLOOR) produced a real on-chain transaction

**If gate fails:** STOP. Log to BUILD-REPORT.md. The FLOOR must at minimum pass this gate.

**Commit:**
```bash
echo "VERIFY-MILESTONE passed: real refinance digest captured" >> BUILD-REPORT.md
git add BUILD-REPORT.md && git commit -m "docs: VERIFY-MILESTONE core refinance passed"
```

### Phase 2 Gate
- [ ] Real refinance success digest in `submission/proof.md`
- [ ] Atomic revert proven (live or dryRun)
- [ ] Amounts balanced (net USDC ≈ 0)
- [ ] Floor backstop builds + dry-runs (or L0 fallback documented)
- [ ] VERIFY-MILESTONE passed
- [ ] All Phase 2 commits made

---

## Phase 2F: FLOOR (only if the Day-1 gate fails)

**Purpose:** Guaranteed-shippable Navi-only deleverage demo. Replaces Phase 2 if Task 1.9 is red.
**Estimated time:** 0.75 day (replaces, not adds)

### Task 2F.1: Build + execute the floor
**Files:** `lib/deleverage.ts` (ARCHITECTURE.md §9) — already specced.
**Steps:**
1. Build per ARCHITECTURE.md §9; dry-run; tune the swap min-out + fee buffer.
2. Execute one real deleverage on mainnet; capture the digest to `submission/proof.md`.
**Commit:** `git commit -m "feat(floor): real Navi-only deleverage executed + proof"`

#### 🔀 Decision Point: Floor executes
✅ Real deleverage digest → this is the demo; rebrand the UI button "Deleverage." 
⛔ If even the floor's swap fails → ship L0 (DeepBook flash borrow→repay) as the on-chain proof + the cross-protocol dryRun preview as the headline narrative.

### Phase 2F Gate
- [ ] A real on-chain digest exists (deleverage or L0)
- [ ] UI copy reflects the shipped scope

---

## Phase 3: Frontend + Deploy

**Purpose:** The one-screen UI, API routes, and live deployment.
**Estimated time:** 0.5 day

### Task 3.1: Position reader + API

**Files:**
- Create: `lib/position.ts` (from ARCHITECTURE.md §11)
- Create: `app/api/position/route.ts` (from ARCHITECTURE.md §12)

**Steps:**
1. Copy both verbatim.
2. Run dev + test:
   ```bash
   npm run dev &
   sleep 6
   curl -s "http://localhost:3000/api/position?address=$NEXT_PUBLIC_DEMO_ADDRESS"
   ```
   Expected: JSON with `hasPosition:true`, `naviAprPct`, `suilendAprPct`.

**Commit:**
```bash
git add lib/position.ts app/api/position/route.ts
git commit -m "feat(api): position reader + GET /api/position"
```

#### 🔀 Decision Point: APR parse shape (RISK 8, position reader [UNVERIFIED])
Run the curl above.
✅ **If APRs are non-null numbers:** continue.
🔀 **If `naviAprPct` is null:** log the raw config `curl -s https://open-api.naviprotocol.io/api/navi/config | head -c 2000` and fix the field path (`borrowRate`/`borrowApr`/`borrow_interest_rate`) in `lib/position.ts`.
🔀 **If `suilendAprPct` is null:** log the parsed reserve shape from the SuilendClient and fix the field accessor.
⛔ **If APRs are unreachable:** hardcode the demo-time observed rates as display fallback (clearly the dryRun preview shows real deltas regardless).

### Task 3.2: Preview API

**Files:**
- Create: `app/api/preview/route.ts` (from ARCHITECTURE.md §12)

**Steps:**
1. Copy verbatim.
2. Test:
   ```bash
   curl -s -XPOST http://localhost:3000/api/preview -H 'content-type: application/json' \
     -d "{\"address\":\"$NEXT_PUBLIC_DEMO_ADDRESS\",\"debtAtomic\":\"1000000\",\"collateralAtomic\":\"3000000000\"}"
   ```
   Expected: `{ "ok": true, "balanceChanges": [...], "txB64": "..." }`.

**Commit:**
```bash
git add app/api/preview/route.ts
git commit -m "feat(api): POST /api/preview builds + dryRuns + returns signable bytes"
```

### Task 3.3: Providers + layout + styles

**Files:**
- Create: `app/providers.tsx` (ARCHITECTURE.md §13)
- Create: `app/layout.tsx` (ARCHITECTURE.md §13)
- Create: `app/globals.css` (ARCHITECTURE.md §13)

**Steps:**
1. Copy all three verbatim.
2. `npm run dev` → page loads without console errors.

**Commit:**
```bash
git add app/providers.tsx app/layout.tsx app/globals.css
git commit -m "feat(ui): dapp-kit providers + layout + styles"
```

### Task 3.4: Components

**Files:**
- Create: `app/components/TxLink.tsx` (ARCHITECTURE.md §13)
- Create: `app/components/PositionCard.tsx` (ARCHITECTURE.md §13)
- Create: `app/components/BeforeAfterPanel.tsx` (ARCHITECTURE.md §13)
- Create: `app/components/PreviewPanel.tsx` (ARCHITECTURE.md §13)
- Create: `app/components/RefinanceButton.tsx` (ARCHITECTURE.md §13)

**Steps:**
1. Copy all five verbatim.
2. <!-- [CRITIQUE E-1] DeepBook depth: in PreviewPanel, render a "DeepBook flash loan — fee $0" row derived from the F-005 observable (the SUI_USDC pool's net USDC balanceChange across borrow+return == 0). Pull the pool delta from the `/api/preview` balanceChanges. This makes the $70k-track integration visible and quantified, not just narrated. Add a one-line caption: "fee-free vs ~0.05–0.09% typical flash fees elsewhere." -->
3. <!-- [CRITIQUE E-3] Problem-solution fit: in BeforeAfterPanel, alongside the APR delta, render annualized savings = (aprDeltaPct/100) × debt.usd → "Save 2.9% APR ≈ $X/year on this position." Compute client-side from the `/api/position` fields already returned (aprDeltaPct, debt.usd). -->
4. `npx tsc --noEmit`.

**Commit:**
```bash
git add app/components
git commit -m "feat(ui): position card, before/after, preview, refinance button, tx link"
```

### Task 3.5: Page wiring

**Files:**
- Create: `app/page.tsx` (ARCHITECTURE.md §13)

**Steps:**
1. Copy verbatim.
2. End-to-end local test:
   - Load `http://localhost:3000` → position card shows demo data (no wallet).
   - Click **Preview Refinance** → preview panel populates.
   - Connect wallet (demo) → click **Refinance to Suilend** → wallet signs → Suiscan link appears.

**Commit:**
```bash
git add app/page.tsx
git commit -m "feat(ui): single-screen refinance flow wired end-to-end"
```

#### 🔀 Decision Point: Client signs server-built bytes (RISK 4)
Click Refinance with the demo wallet.
✅ **If the wallet prompts and returns a digest:** done.
🔀 **If `Transaction.from(bytes)` + sign fails (gas/owner):** ensure `/api/preview` set the sender (`tx.setSender`) and built with `{ client }`; confirm the wallet account == sender; let dapp-kit resolve gas (don't pre-set gas).
⛔ **If signing the prebuilt bytes is rejected by the wallet:** fall back to building the PTB client-side from a returned params object (re-call adapters in the browser) — accept the larger bundle.

### Task 3.6: Deploy to Vercel

**Files:** (none — deploy)

**Steps:**
1. `vercel --prod` (set the 6 env vars from §19 in the Vercel dashboard first).
2. Health check:
   ```bash
   curl -s "$VERCEL_URL/api/position?address=$NEXT_PUBLIC_DEMO_ADDRESS"
   ```
   Expected: 200 with `hasPosition:true`.

**Commit:**
```bash
git commit --allow-empty -m "chore(deploy): live on Vercel"
```

#### 🔀 Decision Point: Server SDKs run on Vercel
Hit the live `/api/preview`.
✅ **If it returns `ok:true` + `txB64`:** live demo works.
🔀 **If gRPC fails in the serverless runtime:** set the route to Node runtime (`export const runtime = "nodejs"`), increase function timeout, or set `SUI_GRPC_URL` to a gRPC-web-compatible endpoint.
⛔ **If serverless can't run the SDKs:** demo against `npm run dev` locally (recorded) + keep the live URL for the read-only position view.

### Task 3.7: README + /proof section (#22)

**Files:**
- Create: `README.md` (from `submission/proof.md` + PRD §1)

**Steps:**
1. Write README: opener, live URL, how-it-works (the 6-leg PTB), tech stack, an "On-Chain Proof" section linking the refinance + revert digests, multi-track mapping (DeepBook + DeFi).
2. <!-- [CRITIQUE E-4] Narrative hook: the README opener AND demo Scene 1 must LEAD with the shocking number — "$450M+ in lending TVL across Navi, Suilend & Scallop, and zero tools to move a position between them" — plus the Sui-native line "this atomic flash-refinance is impossible as a single transaction on account-model chains." Currently buried in the closing scene; move it to the open. -->
3. <!-- [CRITIQUE E-2] DeepBook depth: the "On-Chain Proof"/track-mapping section must state RefiRail uses TWO DeepBook primitives — fee-free flash loan (hero) + spot swap `swapExactBaseForQuote` (floor/deleverage) — and link the SUI_USDC pool id. This (and submission/sponsor-tracks.md in the package phase) is the $70k-track evidence; surface the fee-free flash leg prominently. -->
4. Confirm the SUI-native depth + the fee-free flash framing both appear before Tech Stack.

**Commit:**
```bash
git add README.md
git commit -m "docs: README with live link + on-chain proof + track mapping"
```

### Phase 3 Gate
- [ ] All 12 frontend/API files created; `npx tsc --noEmit` clean
- [ ] Local E2E: preview + real execute both work
- [ ] Live Vercel URL renders first-paint position; `/api/preview` returns `ok:true`
- [ ] README with proof links + track mapping
- [ ] All Phase 3 commits made

---

## Phase 4: Demo + Submission

**Purpose:** Record the demo, finalize submission artifacts, submit on DeepSurge before 16:00 UTC.
**Estimated time:** 0.25 day

### Task 4.1: Record demo
**Steps:**
1. Run `npm run seed` to guarantee demo state.
2. Record per PRD §6 (5 scenes, ~3 min): problem → $0 preview → one-click execute → Suiscan proof → safety/close.
   <!-- [CRITIQUE E-4] Scene 1 opens on the $450M+/zero-rails number. [CRITIQUE E-1] Scene 2 explicitly calls out the "DeepBook flash fee: $0" row in the preview panel. -->
3. Record a backup take of the real execute.
**Commit:** `git add submission/video/links.md && git commit -m "docs(demo): demo video link"`

### Task 4.2: Finalize submission
**Steps:**
1. Fill `submission/links.md` (live URL, repo, video), `submission/sponsor-tracks.md` (DeepBook flash leg + DeFi evidence), confirm `submission/proof.md`.
2. **Confirm demo-video length + submission fields** from the participant handbook (PULSE Downstream Item) before uploading.
3. Submit on DeepSurge.
**Commit:** `git add submission && git commit -m "docs(submission): finalize package"`

#### 🔀 Decision Point: Submission deadline (RISK — time)
Run: check current UTC vs 2026-06-20 16:00.
✅ **If > 3h remain:** finalize calmly.
⛔ **If < 1h remains:** submit the live URL + repo + proof + whatever demo take exists — a real Suiscan digest beats a polished video. Do not miss the cutoff.

### Phase 4 Gate
- [ ] Demo video uploaded + linked
- [ ] Submission complete on DeepSurge
- [ ] `submission/` has proof.md, links.md, sponsor-tracks.md, video/links.md
- [ ] Submitted before 2026-06-20 16:00 UTC

---

## Appendix: Quick Reference

### All Commands
| Phase | Task | Command | Purpose |
|:---:|:---:|---------|---------|
| 0 | 0.1 | `npm install` | deps |
| 1 | 1.3 | `npx tsx scripts/suilend-leg-dryrun.ts` | isolate Suilend leg |
| 1 | 1.6 | `npm run open-position` | open demo position |
| 1 | 1.9 | `npm run dryrun` | **Day-1 gate** |
| 2 | 2.2 | `npm run execute` | real refinance |
| 3 | 3.6 | `vercel --prod` | deploy |

### Troubleshooting
| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `getObligation` null on borrow | `addRefreshCalls` not false | pass `false` (Task 1.3) |
| `borrow_quantity` mismatch | flash ≠ Suilend borrow | align via `computeFlashAmounts` (Task 2.1) |
| Navi withdraw `debt remaining` | flash < accrued debt | raise `bufferBps` |
| wrong USDC type | assetId 1 not 10 | use native USDC assetId 10 |
| SuiGrpcClient ctor error | wrong option | try `network`/`url` (Task 1.1) |
| RPC rate-limit | public node throttle | set `SUI_RPC_URL` |

### Risk → Decision-Tree Index
R1 (Suilend Pyth) → Task 1.3, 1.9 · R2 (gRPC) → Task 1.1 · R3 (mainnet/coin) → Task 0.4, 1.6 · R4 (threading) → Task 1.9, 3.5 · R5 (exact amount) → Task 2.1 · R8 (Navi ids/APR) → Task 1.5, 3.1 · R10 (gate fail/floor) → Task 1.9, 2.4, Phase 2F.
