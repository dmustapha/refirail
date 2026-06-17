# RefiRail — On-chain Proof (F-001)

One atomic cross-protocol refinance on **Sui mainnet** — DeepBook flash loan + Navi repay/withdraw
+ Suilend deposit/borrow, all in **one programmable transaction block (PTB)**. If any leg fails,
the entire transaction reverts. This single tx is the project's credibility anchor.

## The refinance transaction
- **Digest:** `BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK`
- **Suiscan:** [BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK](https://suiscan.xyz/mainnet/tx/BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK)
- **Status:** `success`
- **Demo wallet (sender):** `0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3`
- **Live Navi debt cleared:** 0.300903 USDC (300903 atomic)
- **Flash / Suilend borrow:** 0.301805 USDC (301805 atomic), bufferBps=30
- **Collateral moved:** 1 SUI (1000000000 atomic) Navi → Suilend

## What moved: Navi → Suilend
Before: 1.0 SUI collateral + ~0.300903 USDC native borrow on **Navi**.
After: the 1.0 SUI collateral now backs a USDC borrow on **Suilend** (Main Pool); the Navi position
is fully repaid and the freed collateral withdrawn. All in the single tx above.

## Three protocols, one PTB — object ids
- **DeepBook v3** (flash-loan leg): package `0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748`, SUI_USDC pool `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407`, registry `0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d`
- **Navi** (repay + withdraw): SUI assetId 0, native-USDC assetId 10
- **Suilend** (deposit + borrow): Main Pool lending market `0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1`, type `0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL`
- **Native USDC:** `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`

## Verified on-chain command sequence (18 commands, all in ONE tx)
Read back from the chain via `sui_getTransactionBlock` (showInput) on the success digest:

| # | Package | Call | Protocol |
|---|---------|------|----------|
| 0 | `0x0e735f8c93…` | `pool::borrow_flashloan_quote` | **DeepBook** (open flash loan) |
| 1–2 | `0x203728f46e…` | `oracle_pro::update_single_price_v2` | **Navi** oracle refresh (SUI + USDC) |
| 3 | `0x1e4a13a049…` | `incentive_v3::entry_repay` | **Navi** (repay USDC debt) |
| 4 | `0x1e4a13a049…` | `incentive_v3::withdraw_v2` | **Navi** (withdraw SUI collateral) |
| 5 | `0x2…` | `coin::from_balance` | wrap |
| 6 | `0xe53906c2c0…` | `lending_market::create_obligation` | **Suilend** |
| 7 | `0xe53906c2c0…` | `lending_market::deposit_liquidity_and_mint_ctokens` | **Suilend** |
| 8 | `0xe53906c2c0…` | `lending_market::deposit_ctokens_into_obligation` | **Suilend** (deposit SUI) |
| 9 | `0xe53906c2c0…` | `lending_market::rebalance_staker` | **Suilend** |
| 10–11 | `0xe53906c2c0…` | `lending_market::refresh_reserve_price` | **Suilend** |
| 12 | `0xe53906c2c0…` | `lending_market::borrow_request` | **Suilend** (borrow USDC) |
| 13 | `0xe53906c2c0…` | `lending_market::fulfill_liquidity_request` | **Suilend** |
| 14 | — | `SplitCoins` | exact flash repayment |
| 15 | `0x0e735f8c93…` | `pool::return_flashloan_quote` | **DeepBook** (close flash loan) |
| 16–17 | — | `TransferObjects` | obligation cap + USDC dust to sender |

The DeepBook flash loan opens at cmd 0 and closes at cmd 15 (hot-potato honored). DeepBook + Navi +
Suilend MoveCalls are all present in this single atomic PTB; any leg failing reverts the whole tx.

## Post-state (read back from chain)
- **Navi residual borrow: 0** — the original Navi USDC debt is fully cleared.
- The **1.0 SUI collateral + USDC borrow now live on Suilend** (held in the new obligation; the
  `ObligationOwnerCap` was transferred to the demo wallet in cmd 16).
- Demo wallet after: ~0.852 SUI (1.0 SUI moved into the Suilend obligation; the rest is gas + dust)
  and ~0.301 USDC (the swept buffer dust).
- Net cost of the refinance: ~0.038 SUI gas. No principal lost.

## Verify it yourself
Open the Suiscan link above. The transaction's MoveCalls match the table — DeepBook (flash loan),
Navi (oracle refresh + repay + withdraw), and Suilend (create/deposit/borrow) inside one atomic tx.

---

## Atomic Revert Proof (INVARIANT 2 / F-003)

The success digest above proves the **happy path**. This section proves the **safety invariant**:
if the end-state would be unhealthy, the entire PTB reverts atomically and **nothing moves**.

This is the on-chain safety guarantee behind RefiRail: a refinance can never leave you in a worse
position than you started, because an unhealthy borrow makes the protocol's own borrow guard abort
the whole transaction — repay, withdraw, deposit, borrow all roll back together.

### How it was proven (fund-free, real mainnet dryRun)
We built the Suilend leg exactly as in the live refinance (`createObligation → deposit →
refreshAll([SUI,USDC]) → borrow → transfer cap`), but requested a deliberately **unhealthy** borrow:

| Field | Value |
|---|---|
| Collateral deposited | **0.5 SUI** (~$0.37) |
| Borrow attempted | **10 USDC** (far beyond any safe LTV) |
| Sender | `0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3` |
| Script | `scripts/revert-proof.ts` |

A 10 USDC borrow against ~$0.37 of SUI collateral is grossly over-leveraged, so Suilend's
`obligation::borrow` health guard rejects it and **aborts the entire PTB**.

### Result — actual output (`npx tsx scripts/revert-proof.ts`)
```
dryRun ok: false
abortReason: MoveAbort in 8th command, abort code: 1, in '0xe53906c2c058d1e369763114418f3c144d1b74960d29b2785718a782fec09b61::obligation::borrow' (instruction 172)
balanceChanges: []
balanceChanges count: 0 (empty => zero balance moved => position provably unchanged)

REVERT-PROVEN: Suilend borrow guard aborted the whole PTB atomically.
```

- **`dryRun ok: false`** — the transaction does not succeed.
- **`abortReason`** — a `MoveAbort` raised by Suilend's `obligation::borrow` (package
  `0xe53906c2c058…`), abort code `1`: the requested borrow exceeds what the collateral supports.
  Because this abort happens *inside the one PTB*, every prior command (deposit, refresh, the would-be
  withdraw/repay legs in the full refinance) reverts with it. Move PTBs are all-or-nothing.
- **`balanceChanges: []`** — empty. **Zero balance moved.** A reverted transaction has no effects, so
  the wallet's SUI and USDC are exactly as before.

### Position provably unchanged
A `dryRun` mutates nothing on-chain by definition — it never even broadcasts. On top of that, the
aborted result carries **no balance changes at all**, so there is no path by which the position could
have moved. The safety invariant holds: an unhealthy refinance reverts atomically and leaves the
starting position untouched.

> The healthy refinance digest (`BiMBPK7sLPc1F4DNv4GRseCoLVWPb2oxNdR33Ep8wdsK`) above is the success
> proof; this aborted dryRun is the safety-guard proof. Together they show RefiRail moves the position
> only when the end-state is healthy, and reverts cleanly when it is not.
