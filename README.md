# RefiRail

**$450M+ in lending TVL sits across Navi, Suilend, and Scallop — and there is zero tooling to move a position between them.** A borrower stuck at a higher rate on one protocol cannot simply slide their loan to a cheaper one. The unwind (repay debt → free collateral → re-deposit → re-borrow) requires capital you do not have while your collateral is still locked, and on an account-model chain it is several risky, separately-signed transactions where a failure midway can leave you under-collateralized.

RefiRail makes it **one click, one atomic transaction** — and it is only expressible this way *because* Sui is object-model with Programmable Transaction Blocks. The same flow is impossible to express as a single atomic transaction on account-model chains: you would need a custom flash-loan-aware smart contract to chain the legs, whereas on Sui the entire 6-protocol-call sequence composes at the transaction layer and reverts as a unit if it would ever leave you worse off.

> **Live demo:** _(deploy in a later pipeline phase — URL placeholder)_

---

## How It Works — the 6-leg atomic PTB

RefiRail composes a single Programmable Transaction Block that the user signs once. Every leg is real mainnet protocol calls; if any leg fails (or the end-state would be unhealthy), the whole transaction reverts and the user's original position is untouched.

1. **Flash-borrow USDC** from the DeepBook `SUI_USDC` pool — *fee-free* (DeepBook's flash-loan primitive charges no fee).
2. **Repay the Navi USDC debt** in full with the flash proceeds (any excess refunds to the user).
3. **Withdraw the freed SUI collateral** from Navi now that the debt is cleared.
4. **Open a Suilend obligation, deposit the SUI**, refresh both reserve prices (Pyth), and **borrow USDC** equal to the flash amount.
5. **Repay the DeepBook flash loan** exactly with the freshly-borrowed USDC.
6. **Transfer the Suilend obligation cap + sweep any dust** back to the user.

The user never needs upfront capital: the flash loan bridges the gap between "debt still owed on Navi" and "new debt available on Suilend." Preview (server-side `dryRun` against live mainnet) shows the exact balance changes and the projected health factor before any signature — $0 and no wallet prompt.

---

## Tech Stack

- **Next.js 15** (App Router) — frontend + API route handlers (`/api/position`, `/api/preview`).
- **@mysten/sui v2** — PTB construction, JSON-RPC client, `dryRunTransactionBlock` simulation.
- **@mysten/dapp-kit** — wallet connect + sign-and-execute of the server-built bytes.
- **@mysten/deepbook-v3** — fee-free flash loan + spot swap primitives.
- **@suilend/sdk** — obligation creation, deposit, Pyth price refresh, borrow.
- **@naviprotocol/lending** — repay + collateral withdraw.
- **Pyth** — on-chain price refresh for both reserves inside the PTB.

The server builds and dry-runs the PTB, then returns signable bytes only when the simulation succeeds — the client never receives a transaction that would abort.

---

## On-Chain Proof

RefiRail uses **two distinct DeepBook v3 primitives**, which is the core of its multi-track story:

1. **Fee-free flash loan (the hero).** Legs 1 + 5 borrow and return USDC from the DeepBook `SUI_USDC` pool. The net USDC balance change attributable to the borrow+return is **exactly zero** — DeepBook charges no fee on its flash primitive. This is what makes the whole refinance capital-free and is shown in the Preview panel as **"DeepBook flash loan — fee $0,"** captioned against the ~0.05–0.09% typical flash fees on other venues.
2. **Spot swap `swapExactBaseForQuote` (the floor).** The deleverage path uses DeepBook's spot swap to convert collateral, exercising a second, independent DeepBook surface.

- DeepBook `SUI_USDC` pool: [`0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407`](https://suiscan.xyz/mainnet/object/0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407)
- DeepBook package: [`0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748`](https://suiscan.xyz/mainnet/object/0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748)

**Refinance execution digest:** _(pending Phase 2 execution against the funded demo wallet)_
**Open-position digest:** _(pending Phase 2 execution)_

> The Preview pipeline (`POST /api/preview`) is already proven against live Sui mainnet: it composes the full 6-leg PTB and runs `dryRunTransactionBlock`, returning real on-chain balance deltas (or a precise abort reason) with no signature and no cost.

---

## Multi-Track Mapping

- **DeepBook track.** Two primitives, deeply integrated, not decorative: the fee-free flash loan is the load-bearing mechanism that makes capital-free refinance possible (legs 1 & 5), and `swapExactBaseForQuote` is exercised on the deleverage floor. The flash loan is the hero — without it, refinance requires upfront capital the borrower does not have.
- **DeFi track.** RefiRail is pure DeFi infrastructure: it composes Navi (lending), Suilend (lending), DeepBook (liquidity), and Pyth (oracle) into a single atomic user action that does not exist anywhere on Sui today — cross-protocol loan portability.

---

## Live APR comparison (verified Day-0, mainnet)

| Protocol | USDC borrow APR | Source |
|---|---|---|
| Navi | ~8.76% | `open-api.naviprotocol.io/api/navi/pools` (id 10, `borrowIncentiveApyInfo.vaultApr`) |
| Suilend | ~6.52% | on-chain reserve interest-rate curve, interpolated at live utilization |

Rates move with utilization; the Preview panel always shows the authoritative on-chain numbers at refinance time.

---

## Running locally

```bash
npm install
npm run dev   # http://localhost:3000
```

The page renders the demo position on first paint via `NEXT_PUBLIC_DEMO_ADDRESS` even with no wallet connected. **Preview** works with no wallet (server-side simulation); only **Refinance** (sign + execute) is wallet-gated.

```bash
# Read a position
curl "http://localhost:3000/api/position?address=$NEXT_PUBLIC_DEMO_ADDRESS"

# Preview the refinance (server builds + dry-runs the PTB)
curl -XPOST http://localhost:3000/api/preview -H 'content-type: application/json' \
  -d "{\"address\":\"$NEXT_PUBLIC_DEMO_ADDRESS\",\"debtAtomic\":\"1000000\",\"collateralAtomic\":\"3000000000\"}"
```
