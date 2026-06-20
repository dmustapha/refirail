# RefiRail — On-chain Proof: Navi -> AlphaLend (multi-lender)

One atomic cross-protocol refinance on **Sui mainnet** routing the loan to a SECOND destination money
market, **AlphaLend**, chosen by live borrow APR. DeepBook flash loan + Navi repay/withdraw + AlphaLend
add_collateral/borrow (Pyth-refreshed in-PTB), all in **one programmable transaction block**. If any leg
fails the whole transaction reverts. This proves RefiRail is a real best-rate router, not a single hardcoded pair.

## The refinance transaction
- **Digest:** `3UgVGY2ydYTRsQFAV7MFpxFe9frnFgJVFPhxbyFKuvL6`
- **Suiscan:** [3UgVGY2ydYTRsQFAV7MFpxFe9frnFgJVFPhxbyFKuvL6](https://suiscan.xyz/mainnet/tx/3UgVGY2ydYTRsQFAV7MFpxFe9frnFgJVFPhxbyFKuvL6)
- **Status:** `success`
- **Demo wallet (sender):** `0xc98eeaca815f354aaf65df4250d928bfc2fc089507dc005d5ad26ed36ed393b3`
- **Live Navi debt cleared:** 4.513503 USDC (4513503 atomic)
- **Flash / AlphaLend borrow:** 4.527043 USDC (4527043 atomic), bufferBps=30
- **Collateral moved:** 15.000002758 SUI (15000002758 atomic) Navi -> AlphaLend

## What moved: Navi -> AlphaLend
Before: SUI collateral + USDC native borrow on **Navi**.
After: the SUI collateral now backs a USDC borrow on **AlphaLend**; the Navi position is fully repaid and
the freed collateral withdrawn. All in the single tx above.

## Three protocols, one PTB
- **DeepBook v3** (flash-loan leg): package `0x0e735f8c93a95722efd73521aca7a7652c0bb71ed1daf41b26dfd7d1ff71f748`, SUI_USDC pool `0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407`
- **Navi** (repay + withdraw): SUI assetId 0, native-USDC assetId 10
- **AlphaLend** (create position + add collateral + borrow, Pyth-refreshed in-PTB)
- **Native USDC:** `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`

## Verify it yourself
Open the Suiscan link. The MoveCalls show DeepBook (flash), Navi (repay/withdraw), and AlphaLend
(alpha_lending add_collateral / borrow / fulfill_promise) packages invoked inside the same atomic tx.
